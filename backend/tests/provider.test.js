import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createMatrixProvider} from '../src/providers/matrix.provider.js';
test('registration signs the documented Synapse challenge and cannot create an admin',async()=>{const requests=[];const provider=createMatrixProvider({matrixUrl:'http://internal',registrationSecret:'test-only-secret'},async(url,options)=>{requests.push({url,options});return Response.json(options.method==='GET'?{nonce:'nonce123'}:{user_id:'@alice:nexus.test'});});await provider.register('alice','strong-password','Alice');const body=JSON.parse(requests[1].options.body);assert.equal(body.admin,false);assert.equal(body.mac,createHmac('sha1','test-only-secret').update('nonce123\0alice\0strong-password\0notadmin').digest('hex'));});
test('provider errors do not expose upstream stack traces or credentials',async()=>{const provider=createMatrixProvider({matrixUrl:'http://internal'},async()=>Response.json({errcode:'M_UNKNOWN_TOKEN',error:'SECRET stack trace'},{status:401}));await assert.rejects(()=>provider.health(),e=>e.code==='M_UNKNOWN_TOKEN'&&!e.message.includes('SECRET'));});
