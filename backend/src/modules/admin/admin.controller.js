export const createAdminController=s=>({
 unlock:async(q,r)=>r.json({data:await s.unlock(q.session,q.body)}),
 dashboard:async(q,r)=>r.json({data:await s.dashboard()}),
 users:async(q,r)=>r.json({data:await s.users(q.query.offset)}),
 logs:async(q,r)=>r.json({data:await s.logs(q.query.offset)}),
 reports:async(q,r)=>r.json({data:await s.reports(q.session,q.query.offset)}),
 status:async(q,r)=>r.json({data:await s.status(q.session,q.params.id,q.body)}),
 resolve:async(q,r)=>r.json({data:await s.resolve(q.session,q.params.id,q.body)}),
 health:async(q,r)=>r.json({data:await s.health()}),
 storage:async(q,r)=>r.json({data:await s.storage()}),
 purge:async(q,r)=>r.json({data:await s.purge(q.session,q.body?.retentionDays)})
});
