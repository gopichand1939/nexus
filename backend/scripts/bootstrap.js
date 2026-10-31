import {createHmac} from 'node:crypto';
const env=process.env;
async function request(method,path,body){const response=await fetch(env.MATRIX_INTERNAL_URL+path,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok&&data.errcode!=='M_USER_IN_USE')throw new Error(`Bootstrap failed: ${data.errcode||response.status}`);return data;}
for(const [username,password,admin,displayname] of [[env.MATRIX_SERVICE_USERNAME,env.MATRIX_SERVICE_PASSWORD,true,'NEXUS service'],[env.ADMIN_USERNAME,env.ADMIN_PASSWORD,false,'NEXUS Owner']]){
 if(!username||!password)throw new Error('Missing bootstrap configuration');
 const {nonce}=await request('GET','/_synapse/admin/v1/register');
 const mac=createHmac('sha1',env.MATRIX_REGISTRATION_SECRET).update([nonce,username,password,admin?'admin':'notadmin'].join('\0')).digest('hex');
 const result=await request('POST','/_synapse/admin/v1/register',{nonce,username,password,admin,displayname,mac});
 if(result.access_token){await fetch(env.MATRIX_INTERNAL_URL+'/_matrix/client/v3/logout',{method:'POST',headers:{Authorization:`Bearer ${result.access_token}`,'Content-Type':'application/json'},body:'{}'});console.log(`${admin?'Service':'Owner'} account created.`);}else console.log(`${admin?'Service':'Owner'} account already exists; not changed.`);
}
