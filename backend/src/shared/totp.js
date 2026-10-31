import {createHmac} from 'node:crypto';
import {safeEqual} from './security.js';
export function decodeBase32(value) {
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';
 for (const c of value.toUpperCase().replace(/=+$/,'')) {
  const i=alphabet.indexOf(c);if(i<0) throw new Error('Invalid TOTP secret');bits+=i.toString(2).padStart(5,'0');
 }
 return Buffer.from((bits.match(/.{8}/g)||[]).map(s=>Number.parseInt(s,2)));
}
export function hotp(secret,counter,digits=6) {
 const input=Buffer.alloc(8);input.writeBigUInt64BE(BigInt(counter));
 const digest=createHmac('sha1',decodeBase32(secret)).update(input).digest();
 const offset=digest[digest.length-1]&15;
 return ((digest.readUInt32BE(offset)&0x7fffffff)%10**digits).toString().padStart(digits,'0');
}
export function verifyTotp(secret,code,now=Date.now(),lastStep=-1) {
 if(typeof code!=='string'||!/^\d{6}$/.test(code))return null;
 const step=Math.floor(now/30000);
 for(const candidate of [step,step-1,step+1]) if(candidate>Number(lastStep)&&safeEqual(hotp(secret,candidate),code))return candidate;
 return null;
}
