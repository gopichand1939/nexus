import {assert} from '../../shared/errors.js';
import {text,matrixId,page} from '../../shared/validation.js';
import {verifyTotp} from '../../shared/totp.js';
export function createAdminService({model,matrix,config}) {return {
 async unlock(session,input) {
  const account=await model.account(session.user_id);
  const step=verifyTotp(config.adminTotp,input.code,Date.now(),account.last_mfa_step);
  assert(step!==null,403,'MFA_INVALID','Invalid or already-used authenticator code.');
  assert(await model.unlock(session.user_id,session.token_hash,step),403,'MFA_INVALID','This code has already been used.');
  await model.audit(session.user_id,session.user_id,'ADMIN_UNLOCK','Authenticator verified','SUCCEEDED');return {unlocked:true,expiresInSeconds:600};
 },
 dashboard:()=>model.counts(), users:offset=>model.users(page(offset)), logs:offset=>model.auditLog(page(offset)),
 async reports(session,offset){await model.audit(session.user_id,null,'REPORTS_READ','Review submitted evidence','SUCCEEDED');return model.reports(page(offset));},
 async status(session,id,input) {
  matrixId(id,config.matrixServer);
  assert(['ACTIVE','SUSPENDED'].includes(input.status),400,'INVALID_STATUS','Choose ACTIVE or SUSPENDED.');
  const account=await model.account(id);assert(account,404,'NOT_FOUND','Account not found.');
  assert(account.role!=='ADMIN'&&id!==session.user_id,403,'PROTECTED_ACCOUNT','The owner account cannot be suspended here.');
  const reason=text(input.reason,'Reason',5,500);
  await model.audit(session.user_id,id,'ACCOUNT_STATUS',reason,'STARTED');
  try {await matrix.setLocked(id,input.status==='SUSPENDED');await model.setStatus(id,input.status);await model.audit(session.user_id,id,'ACCOUNT_STATUS',reason,'SUCCEEDED');}
  catch(e){await model.audit(session.user_id,id,'ACCOUNT_STATUS',reason,'FAILED');throw e;}
  return {id,status:input.status};
 },
 async resolve(session,id,input) {
  assert(/^[a-f0-9-]{36}$/i.test(id),400,'INVALID_ID','Invalid report ID.');
  const resolution=text(input.resolution,'Resolution',5,1000);
  const result=await model.resolve(id,resolution);assert(result,404,'NOT_FOUND','Report not found.');
  await model.audit(session.user_id,id,'REPORT_RESOLVED',resolution,'SUCCEEDED');return result;
 },
 async health() {const results=await Promise.allSettled([model.health(),matrix.health()]);return {database:results[0].status==='fulfilled'?'healthy':'unavailable',messaging:results[1].status==='fulfilled'?'healthy':'unavailable',checkedAt:new Date().toISOString()};},
 storage:()=>model.storageStats(),
 async purge(session,retentionDays) {
  await model.audit(session.user_id,null,'STORAGE_PURGE',`Purge data older than ${retentionDays||30} days`,'STARTED');
  try {
   const res=await model.purgeData(retentionDays);
   await model.audit(session.user_id,null,'STORAGE_PURGE',`Purged ${res.purgedSessions} sessions, ${res.purgedAuditLogs} audit, ${res.purgedCallLogs} calls`,'SUCCEEDED');
   return res;
  } catch(e) {
   await model.audit(session.user_id,null,'STORAGE_PURGE','Purge failed','FAILED');
   throw e;
  }
 }
};}
