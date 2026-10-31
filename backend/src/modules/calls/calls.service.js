import {assert} from '../../shared/errors.js';
export function createCallsService(model) {
 return {
  async log(userId,input) {
   assert(input?.peerId,400,'INVALID_INPUT','Peer ID is required.');
   assert(['audio','video','group'].includes(input.callType),400,'INVALID_INPUT','Invalid call type.');
   assert(['incoming','outgoing'].includes(input.direction),400,'INVALID_INPUT','Invalid call direction.');
   assert(['completed','missed','rejected','failed'].includes(input.status),400,'INVALID_INPUT','Invalid call status.');
   const peerName=String(input.peerName||input.peerId).slice(0,100);
   const duration=Math.max(0,parseInt(input.durationSeconds,10)||0);
   return model.log(userId,{peerId:input.peerId,peerName,callType:input.callType,direction:input.direction,status:input.status,durationSeconds:duration});
  },
  list:(userId,limit)=>model.list(userId,Math.min(100,Math.max(1,parseInt(limit,10)||50))),
  clear:userId=>model.clear(userId)
 };
}
