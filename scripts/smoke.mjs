import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const base=(process.env.BASE_URL||'http://localhost:8080').replace(/\/$/,'');
const origin=new URL(base).origin;
const suffix=Date.now().toString(36),password=randomBytes(24).toString('base64url');
function agent(){const cookies=new Map();return async(path,method='GET',body,expected=200)=>{
 const response=await fetch(`${base}/api${path}`,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),'X-CSRF-Token':cookies.get('nexus_csrf')||''},...(body?{body:JSON.stringify(body)}:{})});
 for(const cookie of response.headers.getSetCookie()){const part=cookie.split(';')[0],i=part.indexOf('=');cookies.set(part.slice(0,i),part.slice(i+1));}
 const result=response.status===204?null:await response.json();assert.equal(response.status,expected,`${method} ${path}: expected ${expected}, received ${response.status}`);return result?.data;
};}
const a=agent(),b=agent(),names=[`smoke_a_${suffix}`,`smoke_b_${suffix}`];
const config=await a('/config');assert.ok(config.registrationOpen,'Run in an isolated test deployment with registration enabled.');assert.ok(!config.emailEnabled,'This smoke test needs a development deployment with email verification disabled.');
let alice,bob;
try{
 alice=await a('/auth/register','POST',{username:names[0],displayName:'Smoke Alice',password},201);
 bob=await b('/auth/register','POST',{username:names[1],displayName:'Smoke Bob',password},201);
 assert.notEqual(alice.user.id,bob.user.id);
 const found=await a(`/users/search?username=${names[1]}`);assert.equal(found.id,bob.user.id);assert.ok(!('email' in found));
 await a('/admin/dashboard','GET',undefined,403);
 await a('/contacts','POST',{userId:bob.user.id},201);
 assert.equal((await a('/contacts'))[0].id,bob.user.id);
 await a('/contacts','POST',{userId:alice.user.id},400);
 await a('/reports','POST',{userId:bob.user.id,category:'Test',evidence:'No consent'},400);
 await a('/auth/logout','POST',{},204);
 await a('/auth/me','GET',undefined,401);
 await a('/auth/login','POST',{username:names[0],password});
 console.log('Live API smoke checks passed. No message encryption or WebRTC assertions were made.');
}finally{
 if(alice)await a('/users/me','DELETE',{password},204);
 if(bob)await b('/users/me','DELETE',{password},204);
}
