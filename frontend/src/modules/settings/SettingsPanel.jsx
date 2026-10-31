import {useEffect,useState} from 'react';
import {ShieldCheck,ShieldBan,Bell,KeyRound,Users,Trash2} from 'lucide-react';
import {api} from '../../shared/api';
import {registerPushNotifications} from '../../shared/push';
import {Avatar} from '../../shared/components';

export function SettingsPanel({client,user,onUpdated,onDeleted,notify}) {
 const [name,setName]=useState(user.displayName);
 const [readReceipts,setRead]=useState(user.preferences?.readReceipts!==false);
 const [presencePolicy,setPresencePolicy]=useState(user.preferences?.presencePolicy||(user.preferences?.presence?'all':'off'));
 const [contactPolicy,setContactPolicy]=useState(user.preferences?.contactPolicy||'anyone');
 const [devices,setDevices]=useState([]);
 const [blocked,setBlocked]=useState([]);
 const [busy,setBusy]=useState(false);
 const [pushEnabled,setPushEnabled]=useState(false);

 useEffect(()=>{
  client.getDevices().then(r=>setDevices(r.devices)).catch(e=>notify(e.message));
  api('/contacts/blocked').then(setBlocked).catch(()=>{});
  if('Notification' in window&&Notification.permission==='granted'){
   setPushEnabled(true);
  }
 },[]);

 async function save(e){
  e.preventDefault();
  setBusy(true);
  try{
   const presence=presencePolicy!=='off';
   const changed=await api('/users/me',{
    method:'PATCH',
    body:{
     displayName:name,
     preferences:{readReceipts,presence,presencePolicy,contactPolicy}
    }
   });
   onUpdated(changed);
   client.setSyncPresence(presence?'online':'offline');
   await client.setPresence({presence:presence?'online':'offline'}).catch(()=>{});
   notify('Settings saved.');
  }catch(e){
   notify(e.message);
  }finally{
   setBusy(false);
  }
 }

 async function unblock(userId){
  try{
   await api(`/contacts/block/${encodeURIComponent(userId)}`,{method:'DELETE'});
   setBlocked(blocked.filter(b=>b.id!==userId));
   notify('User unblocked.');
  }catch(e){
   notify(e.message);
  }
 }

 async function enablePush(){
  try{
   await registerPushNotifications();
   setPushEnabled(true);
   notify('Push notifications enabled.');
  }catch(e){
   notify(e.message||'Push notification setup failed.');
  }
 }

 async function revoke(deviceId){
  const password=window.prompt('Enter your account password to revoke this device.');
  if(!password)return;
  try{
   await client.deleteDevice(deviceId,{
    type:'m.login.password',
    identifier:{type:'m.id.user',user:client.getUserId()},
    password
   });
   setDevices(devices.filter(d=>d.device_id!==deviceId));
   notify('Device revoked.');
  }catch(e){
   notify(e.message);
  }
 }

 async function removeAccount(){
  if(!window.confirm('Permanently deactivate this account and remove its NEXUS profile? Copies held by other participants are not erased.'))return;
  const password=window.prompt('Enter your password to confirm account deletion.');
  if(!password)return;
  try{
   await api('/users/me',{method:'DELETE',body:{password}});
   onDeleted();
  }catch(e){
   notify(e.message);
  }
 }

 return (
  <div className="stack">
   <form className="stack" onSubmit={save}>
    <label>
     Display name
     <input value={name} onChange={e=>setName(e.target.value)} required maxLength={80}/>
    </label>

    <div className="settings-section">
     <h4>Privacy & Visibility</h4>
     <label className="toggle-row">
      <span>Send read receipts<small>Let people know when you have read their message.</small></span>
      <input type="checkbox" checked={readReceipts} onChange={e=>setRead(e.target.checked)}/>
     </label>

     <label className="select-row">
      <span>Online presence<small>Choose who can see when you are active.</small></span>
      <select value={presencePolicy} onChange={e=>setPresencePolicy(e.target.value)}>
       <option value="all">Share with everyone</option>
       <option value="contacts_only">Share with saved contacts only</option>
       <option value="off">Do not share presence</option>
      </select>
     </label>

     <label className="select-row">
      <span>Who can start conversations<small>Control who can discover and initiate chats with you.</small></span>
      <select value={contactPolicy} onChange={e=>setContactPolicy(e.target.value)}>
       <option value="anyone">Anyone on this server</option>
       <option value="contacts_only">Only my saved contacts</option>
      </select>
     </label>
    </div>

    <button className="primary" disabled={busy}>Save preferences</button>
   </form>

   <hr/>

   <div className="settings-section">
    <h4><ShieldBan size={16}/> Server-Blocked Accounts</h4>
    <p className="fineprint">Blocked accounts cannot find you in search, message you, or add you to contacts.</p>
    {blocked.length===0?<p className="muted">No blocked users.</p>:
     <div className="blocked-list">
      {blocked.map(b=>(
       <div key={b.id} className="blocked-item">
        <Avatar name={b.displayName||b.username}/>
        <span><strong>{b.displayName||b.username}</strong><small>{b.id}</small></span>
        <button className="text-button" onClick={()=>unblock(b.id)}>Unblock</button>
       </div>
      ))}
     </div>
    }
   </div>

   <hr/>

   <div className="settings-section">
    <h4><Bell size={16}/> Offline Notifications</h4>
    <p className="fineprint">Receive Web Push notifications on your device even when the browser or tab is closed.</p>
    <button className="secondary" onClick={enablePush}>
     <Bell size={14}/> {pushEnabled?'Notifications Active · Re-sync':'Enable Push Notifications'}
    </button>
   </div>

   <hr/>

   <h3>Device sessions</h3>
   {devices.map(d=>(
    <div className="device-card" key={d.device_id}>
     <strong>{d.display_name||'Browser session'}</strong>
     <small>{d.device_id}{d.device_id===client.getDeviceId()?' · This device':''}</small>
     {d.device_id!==client.getDeviceId()&&<button className="text-button danger" onClick={()=>revoke(d.device_id)}>Revoke device</button>}
    </div>
   ))}
   <p className="fineprint">Revoking a device prevents future access. It cannot erase content that the device already decrypted.</p>

   <hr/>
   <button className="danger-button" onClick={removeAccount}><Trash2 size={15}/> Delete my account</button>
  </div>
 );
}
