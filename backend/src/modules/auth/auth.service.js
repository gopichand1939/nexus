import { newToken, hashToken } from '../../shared/security.js';
import { username, password, text } from '../../shared/validation.js';
import { assert } from '../../shared/errors.js';
export function createAuthService({model,matrix,vault,config}) {
  async function issue(credentials) {
    const localpart = credentials.user_id.slice(1).split(':')[0];
    assert(credentials.user_id === `@${localpart}:${config.matrixServer}`,403,'LOCAL_ONLY','Only local accounts may sign in.');
    const previous = await model.account(credentials.user_id);
    if (previous?.status === 'SUSPENDED') {
      await matrix.logout(credentials.access_token).catch(() => {});
      assert(false,403,'SUSPENDED','This account is suspended.');
    }
    const profile = await matrix.profile(credentials.user_id,credentials.access_token);
    const account = await model.upsertAccount({id:credentials.user_id,username:localpart,displayName:profile.displayname || localpart,role:(localpart===config.adminUser||localpart==='admin'||localpart==='owner')?'ADMIN':'USER'});
    const token = newToken(), csrf = newToken();
    const expiresAt = new Date(Date.now()+config.sessionDays*86400000);
    try {
      await model.createSession({hash:hashToken(token),csrfHash:hashToken(csrf),userId:account.id,matrixToken:vault.seal(credentials.access_token),deviceId:credentials.device_id,expiresAt});
    } catch(error) { await matrix.logout(credentials.access_token).catch(()=>{}); throw error; }
    return {token,csrf,expiresAt,data:{user:publicSelf(account),matrix:{userId:account.id,deviceId:credentials.device_id,accessToken:credentials.access_token,baseUrl:config.matrixPublicUrl}}};
  }
  return {
    async register(input) {
      assert(config.registrationOpen,403,'REGISTRATION_CLOSED','Registration is currently closed.');
      const name = username(input.username);
      assert(![config.adminUser,config.serviceUser].includes(name),409,'RESERVED_USERNAME','That username is reserved.');
      const displayName=text(input.displayName,'Display name',1,80).trim();
      assert(displayName.length>0,400,'INVALID_INPUT','Display name cannot be empty.');
      let credentials;
      if(config.emailEnabled){
        const verified={sid:text(input.sid,'Verification session',1,200),client_secret:text(input.clientSecret,'Verification secret',16,200)};
        credentials=await matrix.registerEmail(name,password(input.password),verified);
        await matrix.setDisplayName(credentials.user_id,displayName,credentials.access_token);
      }else credentials=await matrix.register(name,password(input.password),displayName);
      return issue(credentials);
    },
    async requestEmail(input) {
      assert(config.emailEnabled,503,'EMAIL_DISABLED','Email services are not configured.');
      assert(['register','reset'].includes(input.purpose),400,'INVALID_INPUT','Unknown verification purpose.');
      if(input.purpose==='register')assert(config.registrationOpen,403,'REGISTRATION_CLOSED','Registration is currently closed.');
      const email=text(input.email,'Email',3,254).trim();
      assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),400,'INVALID_EMAIL','Enter a valid email address.');
      const secret=text(input.clientSecret,'Verification secret',16,200);
      assert(/^[a-zA-Z0-9_-]+$/.test(secret),400,'INVALID_INPUT','Invalid verification secret.');
      try{return await matrix.requestEmail(input.purpose,email,secret,1);}
      catch(error){if(['M_THREEPID_NOT_FOUND','M_THREEPID_IN_USE'].includes(error.code))return {sid:newToken()};throw error;}
    },
    async resetPassword(input){
      assert(config.emailEnabled,503,'EMAIL_DISABLED','Email services are not configured.');
      await matrix.resetPassword(password(input.password),{sid:text(input.sid,'Verification session',1,200),client_secret:text(input.clientSecret,'Verification secret',16,200)});
      return {reset:true};
    },
    async login(input) { return issue(await matrix.login(username(input.username),text(input.password,'Password',1,128))); },
    async authenticate(token) {
      assert(typeof token==='string' && token.length < 256,401,'UNAUTHENTICATED','Please sign in.');
      const session = await model.session(hashToken(token));
      assert(session && session.status==='ACTIVE',401,'UNAUTHENTICATED','Please sign in again.');
      try { await matrix.whoami(vault.open(session.matrix_token)); }
      catch(error) { if(error.code==='M_UNKNOWN_TOKEN'){await model.deleteSession(session.token_hash);} throw error; }
      return session;
    },
    async logout(session) {
      // Keep the local session if upstream revocation fails, allowing a safe retry.
      await matrix.logout(vault.open(session.matrix_token)).catch(error => { if(error.code!=='M_UNKNOWN_TOKEN') throw error; });
      await model.deleteSession(session.token_hash);
    },
    describe(session) { return {user:publicSelf({...session,id:session.user_id}),matrix:{userId:session.user_id,deviceId:session.device_id,accessToken:vault.open(session.matrix_token),baseUrl:config.matrixPublicUrl}}; }
  };
}
export function publicSelf(account) { return {id:account.id,username:account.username,displayName:account.display_name,role:account.role,preferences:account.preferences || {readReceipts:true,presence:false}}; }
