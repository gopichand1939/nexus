import {assert} from '../../shared/errors.js';
import {matrixId} from '../../shared/validation.js';
export function createContactsService(model,config) {return {
 list:owner=>model.list(owner),
 async add(owner,input) {
  const target=matrixId(input.userId,config.matrixServer);
  assert(target!==owner,400,'SELF_CONTACT','Choose another user.');
  if(model.isBlocked){
   const blocked=await model.isBlocked(owner,target);
   assert(!blocked,403,'BLOCKED_USER','Cannot add a blocked user as a contact.');
  }
  await model.add(owner,target);
 },
 remove:(owner,target)=>model.remove(owner,matrixId(target,config.matrixServer)),
 async block(owner,input) {
  const target=matrixId(input.userId,config.matrixServer);
  assert(target!==owner,400,'SELF_BLOCK','Cannot block yourself.');
  await model.block(owner,target);
  await model.remove(owner,target);
 },
 unblock:(owner,target)=>model.unblock(owner,matrixId(target,config.matrixServer)),
 listBlocked:owner=>model.listBlocked(owner)
};}

