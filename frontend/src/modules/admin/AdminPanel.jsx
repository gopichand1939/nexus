import {useEffect,useState} from 'react';
import {ShieldCheck,Users,Activity,ArrowLeft,RefreshCw,HardDrive,Trash2} from 'lucide-react';
import {api} from '../../shared/api';
import {Spinner} from '../../shared/components';

export function AdminPanel({onClose,notify}) {
 const [locked,setLocked]=useState(true),[busy,setBusy]=useState(false),[data,setData]=useState(null),[storageData,setStorageData]=useState(null),[tab,setTab]=useState('users'),[offset,setOffset]=useState(0),[retentionDays,setRetentionDays]=useState(30);

 async function load(page=offset){
  try{
   const [counts,health,users,reports,logs,storage]=await Promise.all([
    api('/admin/dashboard'),
    api('/admin/health'),
    api(`/admin/users?offset=${page}`),
    api(`/admin/reports?offset=${page}`),
    api(`/admin/audit?offset=${page}`),
    api('/admin/storage').catch(()=>null)
   ]);
   setData({counts,health,users,reports,logs});
   setStorageData(storage);
   setLocked(false);
  }catch(e){
   if(e.code==='MFA_REQUIRED')setLocked(true);
   else notify(e.message);
  }
 }

 useEffect(()=>{load();},[offset]);
 useEffect(()=>{if(locked)return;const timer=setInterval(()=>load(),60000);return()=>clearInterval(timer);},[locked,offset]);

 async function unlock(e){
  e.preventDefault();
  const code=new FormData(e.currentTarget).get('code');
  setBusy(true);
  try{
   await api('/admin/unlock',{method:'POST',body:{code}});
   await load();
  }catch(e){
   notify(e.message);
  }finally{
   setBusy(false);
  }
 }

 async function status(user){
  const reason=window.prompt(`Reason to ${user.status==='ACTIVE'?'suspend':'restore'} ${user.username}:`);
  if(!reason)return;
  try{
   await api(`/admin/users/${encodeURIComponent(user.id)}/status`,{method:'PATCH',body:{status:user.status==='ACTIVE'?'SUSPENDED':'ACTIVE',reason}});
   await load();
  }catch(e){
   notify(e.message);
  }
 }

 async function resolve(report){
  const resolution=window.prompt('Describe how this report was resolved:');
  if(!resolution)return;
  try{
   await api(`/admin/reports/${report.id}`,{method:'PATCH',body:{resolution}});
   await load();
  }catch(e){
   notify(e.message);
  }
 }

 async function runPurge(){
  if(!window.confirm(`Purge expired sessions, audit logs, and call logs older than ${retentionDays} days?`))return;
  setBusy(true);
  try{
   const res=await api('/admin/storage/purge',{method:'POST',body:{retentionDays}});
   notify(`Cleanup complete: purged ${res.purgedSessions} sessions, ${res.purgedAuditLogs} audit records, ${res.purgedCallLogs} call logs.`);
   await load();
  }catch(e){
   notify(e.message||'Purge failed.');
  }finally{
   setBusy(false);
  }
 }

 return (
  <main className="admin-page">
   <div className="section-line">
    <button className="text-button" onClick={onClose}><ArrowLeft size={18}/> Back to conversations</button>
    <span className="status"><ShieldCheck size={14}/> OWNER CONSOLE</span>
   </div>
   <h1>Community overview</h1>
   <p className="muted">Manage your community and server storage retention. Respect every conversation.</p>

   {locked?<form className="unlock-card stack" onSubmit={unlock}>
    <ShieldCheck size={32}/>
    <h2>Verify it’s you</h2>
    <p>Enter the six-digit code from your configured authenticator. Access unlocks for ten minutes.</p>
    <label>Authenticator code<input name="code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" required maxLength={6}/></label>
    <button className="primary" disabled={busy}>{busy?<Spinner/>:'Unlock administration'}</button>
   </form>:data&&<>
    <div className="stats">
     <article><Users/><small>Registered accounts</small><strong>{data.counts.total}</strong></article>
     <article><Activity/><small>Active accounts</small><strong>{data.counts.active}</strong></article>
     <article><ShieldCheck/><small>Suspended accounts</small><strong>{data.counts.suspended}</strong></article>
    </div>

    <div className="health-strip">
     <span>Database: <b>{data.health.database}</b></span>
     <span>Messaging: <b>{data.health.messaging}</b></span>
     <button className="text-button" onClick={()=>load()}><RefreshCw size={14}/> Refresh</button>
    </div>

    <div className="tabs">
     {['users','reports','audit','storage'].map(t=>(
      <button key={t} className={tab===t?'selected':''} onClick={()=>{setTab(t);setOffset(0);}}>{t.toUpperCase()}</button>
     ))}
    </div>

    {tab==='users'&&<div className="table-wrap">
     <table>
      <thead><tr><th>Account</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>
       {data.users.map(u=>(
        <tr key={u.id}>
         <td><strong>{u.displayName}</strong><small>{u.id}</small></td>
         <td>{u.role}</td>
         <td><span className="status">{u.status}</span></td>
         <td>{u.role!=='ADMIN'&&<button className="secondary" onClick={()=>status(u)}>{u.status==='ACTIVE'?'Suspend':'Restore'}</button>}</td>
        </tr>
       ))}
      </tbody>
     </table>
    </div>}

    {tab==='reports'&&<div className="stack">
     {!data.reports.length&&<p className="muted">No submitted reports.</p>}
     {data.reports.map(r=>(
      <article className="report-card" key={r.id}>
       <div className="section-line"><h3>{r.category}</h3><span className="status">{r.status}</span></div>
       <small>From {r.reporter_id} · About {r.reported_id}</small>
       <p className="evidence">{r.evidence}</p>
       {r.resolution&&<p>Resolution: {r.resolution}</p>}
       {r.status==='OPEN'&&<button className="secondary" onClick={()=>resolve(r)}>Resolve report</button>}
      </article>
     ))}
    </div>}

    {tab==='audit'&&<div className="table-wrap">
     <table>
      <thead><tr><th>Time</th><th>Action</th><th>Actor / target</th><th>Result</th></tr></thead>
      <tbody>
       {data.logs.map(l=>(
        <tr key={l.id}>
         <td>{new Date(l.created_at).toLocaleString()}</td>
         <td>{l.action}<small>{l.reason}</small></td>
         <td>{l.actor_id}<small>{l.target_id}</small></td>
         <td>{l.outcome}</td>
        </tr>
       ))}
      </tbody>
     </table>
    </div>}

    {tab==='storage'&&<div className="stack">
     <h3><HardDrive size={18}/> Storage & Retention Management</h3>
     <p className="muted">Monitor database table counts and execute scheduled data retention policies.</p>
     {storageData&&<div className="stats">
      <article><small>Accounts</small><strong>{storageData.accounts}</strong></article>
      <article><small>Sessions</small><strong>{storageData.sessions}</strong></article>
      <article><small>Audit logs</small><strong>{storageData.auditLogs}</strong></article>
      <article><small>Call logs</small><strong>{storageData.callLogs}</strong></article>
      <article><small>Blocks</small><strong>{storageData.blocks}</strong></article>
      <article><small>Push Subs</small><strong>{storageData.pushSubscriptions}</strong></article>
     </div>}
     <div className="backup-card">
      <h4>Retention Cleanup Policy</h4>
      <p className="fineprint">Purge expired sessions, along with audit and call logs older than the selected retention window.</p>
      <div className="section-line">
       <label className="select-row">
        <span>Retention window:</span>
        <select value={retentionDays} onChange={e=>setRetentionDays(Number(e.target.value))}>
         <option value="7">7 Days</option>
         <option value="30">30 Days</option>
         <option value="60">60 Days</option>
         <option value="90">90 Days</option>
        </select>
       </label>
       <button className="danger-button" disabled={busy} onClick={runPurge}>
        <Trash2 size={15}/> Execute Retention Purge
       </button>
      </div>
     </div>
    </div>}

    {tab!=='storage'&&<div className="section-line pagination">
     <button className="secondary" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-50))}>Previous</button>
     <small>Page {offset/50+1}</small>
     <button className="secondary" disabled={(tab==='users'?data.users:tab==='reports'?data.reports:data.logs).length<50} onClick={()=>setOffset(offset+50)}>Next</button>
    </div>}

    <p className="fineprint">The dashboard contains metadata and voluntarily submitted report evidence. There is no access to private conversation contents or device encryption keys.</p>
   </>}
  </main>
 );
}
