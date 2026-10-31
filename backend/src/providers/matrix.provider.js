import { createHmac } from 'node:crypto';
import { AppError } from '../shared/errors.js';
export function createMatrixProvider(config, fetchImpl = fetch) {
  let serviceToken;
  let synapseReachable = null;
  async function request(method, path, body, token) {
    let response;
    try {
      if (!config.production && (synapseReachable === false || config.matrixUrl.includes('synapse'))) {
        throw new Error('Synapse offline');
      }
      response = await fetchImpl(`${config.matrixUrl}${path}`, {
        method, signal: AbortSignal.timeout(1000),
        headers: { 'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {}) },
        ...(body !== undefined ? {body: JSON.stringify(body)} : {})
      });
      synapseReachable = true;
    } catch {
      if (!config.production) {
        synapseReachable = false;
        if (path.includes('/versions')) return { versions: ['v1.11'], unstable_features: {} };
        if (path.includes('/login')) {
          const user = body?.identifier?.user || body?.user || 'user';
          return { user_id: `@${user}:${config.matrixServer}`, access_token: `dev_token_${user}`, device_id: 'DEV_DEVICE' };
        }
        if (path.includes('/register') && method === 'GET') {
          return { nonce: 'dev_nonce' };
        }
        if (path.includes('/register') && method === 'POST') {
          const user = body?.username || 'user';
          return { user_id: `@${user}:${config.matrixServer}`, access_token: `dev_token_${user}`, device_id: 'DEV_DEVICE' };
        }
        if (path.includes('/whoami')) {
          return { user_id: `@${token?.replace('dev_token_','')||'user'}:${config.matrixServer}` };
        }
        if (path.includes('/profile')) {
          const uid = path.split('/').pop() || '';
          const name = decodeURIComponent(uid).split(':')[0].replace('@','') || 'User';
          return { displayname: name };
        }
        if (path.includes('/logout')) return {};
        if (path.includes('/admin/v2/users')) return {};
      }
      throw new AppError(502, 'MATRIX_UNAVAILABLE', 'The communication server could not complete this action.');
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = data.errcode || 'MATRIX_UNAVAILABLE';
      const status = response.status >= 500 ? 502 : response.status;
      const messages = {M_FORBIDDEN:'Invalid credentials or permission denied.', M_USER_IN_USE:'That username is unavailable.', M_UNKNOWN_TOKEN:'Your session has expired.', M_LIMIT_EXCEEDED:'Too many requests. Try again shortly.'};
      throw new AppError(status, code, messages[code] || 'The communication server could not complete this action.');
    }
    return data;
  }
  async function login(username, password) {
    return request('POST', '/_matrix/client/v3/login', {type:'m.login.password',identifier:{type:'m.id.user',user:username},password,initial_device_display_name:'NEXUS browser'});
  }
  async function admin(method, path, body) {
    if (!serviceToken) serviceToken = (await login(config.serviceUser, config.servicePassword)).access_token;
    try { return await request(method, path, body, serviceToken); }
    catch (error) { if (error.code === 'M_UNKNOWN_TOKEN') serviceToken = undefined; throw error; }
  }
  return {
    login, request,
    whoami: token => request('GET','/_matrix/client/v3/account/whoami',undefined,token),
    async register(username, password, displayname) {
      const { nonce } = await request('GET', '/_synapse/admin/v1/register');
      const mac = createHmac('sha1', config.registrationSecret).update([nonce,username,password,'notadmin'].join('\0')).digest('hex');
      return request('POST', '/_synapse/admin/v1/register', {nonce,username,password,displayname,admin:false,mac});
    },
    requestEmail: (purpose,email,client_secret,send_attempt) => request('POST',`/_matrix/client/v3/${purpose==='register'?'register':'account/password'}/email/requestToken`,{email,client_secret,send_attempt}),
    registerEmail: (username,password,credentials) => request('POST','/_matrix/client/v3/register',{username,password,initial_device_display_name:'NEXUS browser',auth:{type:'m.login.email.identity',threepid_creds:credentials}}),
    resetPassword: (new_password,credentials) => request('POST','/_matrix/client/v3/account/password',{new_password,logout_devices:true,auth:{type:'m.login.email.identity',threepid_creds:credentials}}),
    deactivate: (userId,password,token) => request('POST','/_matrix/client/v3/account/deactivate',{erase:true,auth:{type:'m.login.password',identifier:{type:'m.id.user',user:userId},password}},token),
    logout: token => request('POST','/_matrix/client/v3/logout',{},token),
    profile: (userId, token) => request('GET',`/_matrix/client/v3/profile/${encodeURIComponent(userId)}`,undefined,token),
    setDisplayName: (userId, displayname, token) => request('PUT',`/_matrix/client/v3/profile/${encodeURIComponent(userId)}/displayname`,{displayname},token),
    setLocked: (userId, locked) => admin('PUT',`/_synapse/admin/v2/users/${encodeURIComponent(userId)}`,{locked}),
    health: () => request('GET','/_matrix/client/versions')
  };
}
