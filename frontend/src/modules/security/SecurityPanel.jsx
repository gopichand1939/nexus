import {useEffect,useRef,useState} from 'react';
import {ShieldCheck,Monitor,Copy,RefreshCw,KeyRound,Download,Upload,CheckCircle2} from 'lucide-react';
import {verifyFingerprint} from '../messaging/matrix.service';

export function SecurityPanel({client,room,notify}) {
 const [own,setOwn]=useState(null),[devices,setDevices]=useState([]),[busy,setBusy]=useState(false);
 const [backupPass,setBackupPass]=useState(''),[restorePass,setRestorePass]=useState('');
 const [showBackup,setShowBackup]=useState(false),[showRestore,setShowRestore]=useState(false);
 const [backupSuccess,setBackupSuccess]=useState(false),[restoreSuccess,setRestoreSuccess]=useState(false);
 const fileInputRef=useRef(null);

 async function refresh(){
  setBusy(true);
  try{
   const crypto=client.getCrypto?.();
   if(!crypto){
    setDevices([]);
    return;
   }
   setOwn(await crypto.getOwnDeviceKeys?.());
   const users=room?room.getJoinedMembers().map(m=>m.userId):[client.getUserId()];
   const data=await crypto.getUserDeviceInfo?.(users,true)||new Map();
   const list=[];
   for(const [userId,map] of data)for(const [deviceId,device] of map){
    const status=await crypto.getDeviceVerificationStatus?.(userId,deviceId);
    list.push({userId,deviceId,fingerprint:device?.getFingerprint?.()||'Active Device',verified:status?.isVerified?.()||deviceId===client.getDeviceId(),name:device?.displayName||deviceId});
   }
   setDevices(list);
  }catch(e){/* non-fatal */}finally{setBusy(false);}
 }

 useEffect(()=>{refresh();},[]);

 async function verify(d){
  const entered=window.prompt(`Compare this fingerprint with ${d.userId} through a separate trusted channel, then enter their FULL fingerprint here. Do not copy it from this screen.`,'');
  if(!entered)return;
  try{
   await verifyFingerprint(client,d.userId,d.deviceId,entered.replace(/\s/g,''));
   await refresh();
   notify('Device verified.');
  }catch(e){notify(e.message);}
 }

 async function handleExportKeys(e){
  e.preventDefault();
  if(!backupPass||backupPass.length<8)return notify('Please choose a backup password with at least 8 characters.');
  setBusy(true);
  try{
   let keys;
   if(typeof client.exportRoomKeys==='function'){
    keys=await client.exportRoomKeys(backupPass);
   }else if(typeof client.getCrypto()?.exportRoomKeys==='function'){
    keys=await client.getCrypto().exportRoomKeys(backupPass);
   }else{
    throw new Error('Key export is not supported in this client build.');
   }
   const blob=new Blob([typeof keys==='string'?keys:JSON.stringify(keys)],{type:'application/json'});
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');
   a.href=url;
   a.download=`nexus-keys-${client.getUserId()}-${Date.now()}.nexus-keys`;
   a.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
   setBackupSuccess(true);
   setBackupPass('');
   notify('Encryption keys exported and downloaded.');
  }catch(e){
   notify(e.message||'Key export failed.');
  }finally{
   setBusy(false);
  }
 }

 async function handleImportKeys(e){
  const file=e.target.files?.[0];
  if(!file)return;
  if(!restorePass)return notify('Enter your key backup passphrase first.');
  setBusy(true);
  try{
   const text=await file.text();
   let keys;
   try{keys=JSON.parse(text);}catch{keys=text;}
   if(typeof client.importRoomKeys==='function'){
    await client.importRoomKeys(keys,restorePass);
   }else if(typeof client.getCrypto()?.importRoomKeys==='function'){
    await client.getCrypto().importRoomKeys(keys,restorePass);
   }else{
    throw new Error('Key import is not supported in this client build.');
   }
   setRestoreSuccess(true);
   setRestorePass('');
   if(fileInputRef.current)fileInputRef.current.value='';
   notify('Encryption keys restored. Past conversations are now unlocked!');
  }catch(e){
   notify(e.message||'Failed to import keys. Check passphrase.');
  }finally{
   setBusy(false);
  }
 }

 return (
  <div className="stack">
   <div className="notice">
    <ShieldCheck size={22}/>
    <div>
     <strong>Verify the person, not just the connection.</strong>
     <p>Compare fingerprints in person or through a trusted channel. Sending to unverified devices is blocked. New devices must be checked again.</p>
    </div>
   </div>

   <h3>This device</h3>
   <div className="key-card">
    <small>{client.getDeviceId()}</small>
    <code>{own?.ed25519||'Loading fingerprint…'}</code>
    <button className="text-button" onClick={()=>navigator.clipboard.writeText(own?.ed25519||'').then(()=>notify('Fingerprint copied.')).catch(()=>notify('Clipboard unavailable. Select and copy the fingerprint.'))}>
     <Copy size={14}/> Copy fingerprint
    </button>
   </div>

   <div className="backup-card">
    <div className="section-line">
     <div>
      <strong><KeyRound size={16}/> Encrypted Key Backup & Recovery</strong>
      <p className="fineprint">Backup your encryption keys to restore message history on new or other devices.</p>
     </div>
    </div>
    <div className="backup-buttons">
     <button className="secondary" onClick={()=>setShowBackup(!showBackup)}>
      <Download size={14}/> {showBackup?'Hide Export':'Export Keys'}
     </button>
     <button className="secondary" onClick={()=>setShowRestore(!showRestore)}>
      <Upload size={14}/> {showRestore?'Hide Import':'Import Keys'}
     </button>
    </div>

    {showBackup&&<form onSubmit={handleExportKeys} className="backup-form">
     <label>
      Set a backup password (min 8 chars)
      <input type="password" value={backupPass} onChange={e=>setBackupPass(e.target.value)} required minLength={8} placeholder="Enter a secure passphrase"/>
     </label>
     <button className="primary" type="submit" disabled={busy}><Download size={14}/> Download Encrypted Keys</button>
     {backupSuccess&&<p className="success-tag"><CheckCircle2 size={14}/> Key backup file saved securely.</p>}
    </form>}

    {showRestore&&<div className="backup-form">
     <label>
      Enter backup passphrase
      <input type="password" value={restorePass} onChange={e=>setRestorePass(e.target.value)} placeholder="Passphrase used when exported"/>
     </label>
     <label className="file-input-label">
      Select `.nexus-keys` backup file
      <input ref={fileInputRef} type="file" accept=".nexus-keys,.json" onChange={handleImportKeys} disabled={!restorePass||busy}/>
     </label>
     {restoreSuccess&&<p className="success-tag"><CheckCircle2 size={14}/> Keys restored! Refreshing history.</p>}
    </div>}
   </div>

   <div className="section-line">
    <h3>{room?'Conversation devices':'Your devices'}</h3>
    <button className="text-button" onClick={refresh} disabled={busy}><RefreshCw size={14}/> Refresh</button>
   </div>
   {devices.map(d=>(
    <div className="device-card" key={d.userId+d.deviceId}>
     <div className="section-line">
      <strong><Monitor size={16}/> {d.name||d.deviceId}</strong>
      <span className={d.verified?'status verified':'status'}>{d.verified?'Verified':'Unverified'}</span>
     </div>
     <small>{d.userId}</small>
     <code>{d.fingerprint}</code>
     {!d.verified&&<button className="secondary" onClick={()=>verify(d)}>Compare & verify</button>}
    </div>
   ))}
   <p className="fineprint">Encryption keys are stored securely in this browser. Keep an encrypted backup so you can recover your conversations if you switch devices.</p>
  </div>
 );
}
