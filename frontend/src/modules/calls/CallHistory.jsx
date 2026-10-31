import {useEffect,useState} from 'react';
import {Phone,PhoneIncoming,PhoneOutgoing,PhoneMissed,Video,Users,Trash2,RotateCw} from 'lucide-react';
import {api} from '../../shared/api';
import {Avatar,IconButton,Empty,Spinner} from '../../shared/components';

export function CallHistory({client,onStartCall,notify}) {
 const [logs,setLogs]=useState([]),[loading,setLoading]=useState(true),[filter,setFilter]=useState('all');

 const loadLogs=()=>{
  setLoading(true);
  api('/calls')
   .then(setLogs)
   .catch(e=>notify(e.message||'Failed to load call history.'))
   .finally(()=>setLoading(false));
 };

 useEffect(()=>{loadLogs();},[]);

 const clearHistory=async()=>{
  if(!window.confirm('Clear your entire call history?'))return;
  try{
   await api('/calls',{method:'DELETE'});
   setLogs([]);
   notify('Call history cleared.');
  }catch(e){
   notify(e.message||'Failed to clear history.');
  }
 };

 const filtered=logs.filter(l=>{
  if(filter==='missed')return l.status==='missed'||l.status==='rejected';
  return true;
 });

 const formatDuration=sec=>{
  if(!sec)return '0s';
  const m=Math.floor(sec/60),s=sec%60;
  return m>0?`${m}m ${s}s`:`${s}s`;
 };

 const formatTime=iso=>{
  if(!iso)return '';
  const d=new Date(iso);
  const today=new Date();
  const isToday=d.toDateString()===today.toDateString();
  return isToday?d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString([],{month:'short',day:'numeric'});
 };

 return (
  <div className="call-history-container">
   <div className="call-history-header">
    <div className="filter-pills">
     <button className={`pill ${filter==='all'?'active':''}`} onClick={()=>setFilter('all')}>All calls</button>
     <button className={`pill ${filter==='missed'?'active':''}`} onClick={()=>setFilter('missed')}>Missed</button>
    </div>
    <div className="header-actions">
     <IconButton label="Refresh" onClick={loadLogs}><RotateCw size={17}/></IconButton>
     {logs.length>0&&<IconButton label="Clear history" onClick={clearHistory}><Trash2 size={17}/></IconButton>}
    </div>
   </div>

   {loading?<div className="history-loading"><Spinner/><p>Loading call history…</p></div>:
    filtered.length===0?<div className="history-empty">
     <Phone size={36}/>
     <p>{filter==='missed'?'No missed calls.':'No call history yet.'}</p>
     <small>Your voice, video, and group calls will appear here.</small>
    </div>:
    <div className="call-log-list">
     {filtered.map(l=>{
      const isMissed=l.status==='missed'||l.status==='rejected';
      const isIncoming=l.direction==='incoming';
      const CallIcon=isMissed?PhoneMissed:isIncoming?PhoneIncoming:PhoneOutgoing;
      const typeIcon=l.callType==='video'?<Video size={14}/>:l.callType==='group'?<Users size={14}/>:<Phone size={14}/>;

      return (
       <div key={l.id} className={`call-log-item ${isMissed?'missed':''}`}>
        <Avatar name={l.peerName||l.peerId}/>
        <div className="call-log-info">
         <div className="call-log-title">
          <strong>{l.peerName||l.peerId}</strong>
          <span className="call-type-badge">{typeIcon} {l.callType}</span>
         </div>
         <div className="call-log-meta">
          <span className={`direction-icon ${isMissed?'missed':isIncoming?'incoming':'outgoing'}`}>
           <CallIcon size={14}/>
          </span>
          <span>{isMissed?'Missed':isIncoming?'Incoming':'Outgoing'}</span>
          <span>·</span>
          <span>{formatDuration(l.durationSeconds)}</span>
         </div>
        </div>
        <div className="call-log-actions">
         <time>{formatTime(l.createdAt)}</time>
         {onStartCall&&<button className="icon-button call-action-btn" title="Call back" onClick={()=>onStartCall(l.peerId,l.callType==='video')}>
          {l.callType==='video'?<Video size={17}/>:<Phone size={17}/>}
         </button>}
        </div>
       </div>
      );
     })}
    </div>
   }
  </div>
 );
}
