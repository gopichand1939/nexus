import {useCallback,useEffect,useRef,useState} from 'react';
import {MessageSquare,Users,Archive,Settings,LogOut,Plus,Search,Phone,Video,ShieldCheck,Info,ArrowLeft,Sun,Moon,Flag,ShieldBan,UserPlus,X,PanelLeftClose,PhoneCall} from 'lucide-react';
import {api} from './shared/api';
import {Brand,Avatar,IconButton,Modal,Empty,Spinner} from './shared/components';
import {AuthView} from './modules/auth/AuthView';
import {connectMatrix,createConversation,sendText,assertVerifiedRecipients} from './modules/messaging/matrix.service';
import {MessageList} from './modules/messaging/MessageList';
import {Composer} from './modules/messaging/Composer';
import {ConversationInfo} from './modules/messaging/ConversationInfo';
import {NewConversation} from './modules/contacts/NewConversation';
import {SecurityPanel} from './modules/security/SecurityPanel';
import {SettingsPanel} from './modules/settings/SettingsPanel';
import {ReportForm} from './modules/reports/ReportForm';
import {CallOverlay} from './modules/calls/CallOverlay';
import {CallHistory} from './modules/calls/CallHistory';
import {AdminPanel} from './modules/admin/AdminPanel';

export default function App(){
 const [config,setConfig]=useState(null),[session,setSession]=useState(null),[loading,setLoading]=useState(true),[client,setClient]=useState(null),[revision,setRevision]=useState(0),[connectionError,setConnectionError]=useState('');
 const [selected,setSelected]=useState(null),[section,setSection]=useState('chats'),[query,setQuery]=useState(''),[searchResults,setSearchResults]=useState([]),[searchMessages,setSearchMessages]=useState(false),[messageQuery,setMessageQuery]=useState(''),[modal,setModal]=useState(null),[toast,setToast]=useState(''),[reply,setReply]=useState(null),[edit,setEdit]=useState(null),[call,setCall]=useState(null),[callGroupInfo,setCallGroupInfo]=useState(null),[contacts,setContacts]=useState([]),[theme,setTheme]=useState(()=>localStorage.getItem('nexus.theme')||'light');
 const toastTimer=useRef(null),callRef=useRef(null),clientRef=useRef(null);
 const notify=useCallback(message=>{setToast(message);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),6500);},[]);

 useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('nexus.theme',theme);},[theme]);
 useEffect(()=>{Promise.all([api('/config').then(setConfig),api('/auth/me').then(s=>{if(s?.matrix)s.matrix.baseUrl=import.meta.env.VITE_BACKEND_URL||import.meta.env.VITE_API_URL||window.location.origin;setSession(s);}).catch(e=>{if(e.status!==401)notify(e.message);})]).catch(e=>notify(e.message)).finally(()=>setLoading(false));},[]);

 useEffect(()=>{
  if(!query.trim()){setSearchResults([]);return;}
  const timer=setTimeout(()=>{
   api(`/users/search-all?q=${encodeURIComponent(query.trim())}`).then(setSearchResults).catch(()=>setSearchResults([]));
  },200);
  return ()=>clearTimeout(timer);
 },[query]);

 useEffect(()=>{
  if(!session)return;let canceled=false,connected=null,release;
  async function start(){try{
   const c=await connectMatrix(session,()=>setRevision(n=>n+1),incoming=>{
    if(callRef.current||clientRef.current?.getIgnoredUsers?.()?.includes(incoming.getOpponentMember()?.userId)){incoming.reject();return;}
    callRef.current=incoming;setCall(incoming);
   });connected=c;
   if(canceled){c.stopClient();return;}
   clientRef.current=c;setClient(c);
   await c.setPresence({presence:session.user.preferences?.presence?'online':'offline'}).catch(()=>{});
  }catch(e){if(!canceled)setConnectionError(e.message||'Unable to start encrypted messaging.');}}
  if(navigator.locks){navigator.locks.request('nexus-crypto-client',{ifAvailable:true},async lock=>{if(!lock){setConnectionError('NEXUS is already open in another tab. Close that tab and reload this one.');return;}await start();if(!canceled)await new Promise(resolve=>{release=resolve;});}).catch(e=>setConnectionError(e.message));}else start();
  return()=>{canceled=true;connected?.stopClient();clientRef.current=null;release?.();};
 },[session?.matrix.deviceId]);

 useEffect(()=>{callRef.current=call;},[call]);
 useEffect(()=>{if(session&&section==='contacts')api('/contacts').then(setContacts).catch(e=>notify(e.message));},[section,session?.user.id]);
 const room=client?.getRoom(selected),rooms=client?.getRooms()||[];
 useEffect(()=>{setReply(null);setEdit(null);setMessageQuery('');},[selected]);
 useEffect(()=>{if(!client||!room||session?.user.preferences?.readReceipts===false)return;const last=room.getLiveTimeline().getEvents().at(-1);if(last&&room.getMyMembership()==='join')client.sendReadReceipt(last).catch(()=>{});},[selected,revision]);

 async function run(fn){try{return await fn();}catch(e){notify(e.message||'Action failed.');}}
 async function logout(){if(!window.confirm('Sign out? Keep this browser’s site data if you need its encryption keys. A new login creates a new device and may not restore old history.'))return;await run(async()=>{await api('/auth/logout',{method:'POST'});if(typeof localStorage!=='undefined'){localStorage.removeItem('nexus_session_token');localStorage.removeItem('nexus_csrf_token');}call?.hangup('user_hangup',false);setCall(null);client?.stopClient();setClient(null);setSession(null);setSelected(null);setConnectionError('');});}

 async function startCall(video,targetRoom=room){
  const activeRoom=targetRoom||room;
  if(!activeRoom)return notify('Select a conversation to start a call.');
  if(call)return notify('End the current call first.');
  await run(async()=>{
   const joinedCount=activeRoom.getJoinedMemberCount?.()||1;
   const isGroup=joinedCount>2;
   const c=client.createCall(activeRoom.roomId);
   if(!c)throw new Error('Calling is unavailable in this browser.');
   c.on('error',e=>notify(e.message||'Call failed.'));
   setCall(c);
   callRef.current=c;
   setCallGroupInfo({isGroup,groupRoom:activeRoom});
   try{
    if(video)await c.placeVideoCall();
    else await c.placeVoiceCall();
   }catch(e){
    c.hangup('user_hangup',false);
    setCall(null);
    setCallGroupInfo(null);
    throw e;
   }
  });
 }

 async function handleCallFromHistory(peerId,video){
  await run(async()=>{
   let r=client.getRooms().find(rm=>rm.getMyMembership()==='join'&&rm.getMember(peerId)?.membership==='join');
   if(!r){
    const newRoomId=await createConversation(client,[peerId]);
    setSelected(newRoomId);
    r=client.getRoom(newRoomId);
   }else{
    setSelected(r.roomId);
   }
   setSection('chats');
   if(r)setTimeout(()=>startCall(video,r),600);
  });
 }

 const other=room?.getJoinedMembers().find(m=>m.userId!==client?.getUserId());
 async function archive(){await run(async()=>{if(room.tags['org.nexus.archived'])await client.deleteRoomTag(room.roomId,'org.nexus.archived');else await client.setRoomTag(room.roomId,'org.nexus.archived',{});setRevision(n=>n+1);setSelected(null);});}
 async function block(){
  if(!other)return;
  await run(async()=>{
   const ignored=client.getIgnoredUsers();
   const blocked=ignored.includes(other.userId);
   if(blocked){
    await api(`/contacts/block/${encodeURIComponent(other.userId)}`,{method:'DELETE'});
    await client.setIgnoredUsers(ignored.filter(x=>x!==other.userId));
    notify('User unblocked.');
   }else{
    await api('/contacts/block',{method:'POST',body:{userId:other.userId}});
    await client.setIgnoredUsers([...ignored,other.userId]);
    notify('User blocked on server. Future messages and searches are blocked.');
   }
   setRevision(n=>n+1);
  });
 }

 const filtered=rooms.filter(r=>['join','invite'].includes(r.getMyMembership())).filter(r=>section==='archive'?!!r.tags['org.nexus.archived']:!r.tags['org.nexus.archived']).filter(r=>section!=='groups'||r.getJoinedMemberCount()+r.getInvitedMemberCount()>2).filter(r=>r.name.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>(b.getLastActiveTimestamp()||0)-(a.getLastActiveTimestamp()||0));
  const visibleContacts=contacts.filter(p=>!query.trim()||p.displayName?.toLowerCase().includes(query.toLowerCase())||p.id?.toLowerCase().includes(query.toLowerCase()));

 if(loading)return <div className="loading-screen"><Brand/><Spinner/><p>Opening your space…</p></div>;
 if(!session)return <><AuthView config={config} onLogin={s=>{if(s?.matrix)s.matrix.baseUrl=import.meta.env.VITE_BACKEND_URL||import.meta.env.VITE_API_URL||window.location.origin;setSession(s);}}/>{toast&&<div className="toast" role="alert">{toast}</div>}</>;
 if(section==='admin')return <><AdminPanel onClose={()=>setSection('chats')} notify={notify}/>{toast&&<div className="toast" role="status">{toast}</div>}</>;

 return (
  <div className={`app-shell ${selected?'has-selection':''}`}>
   <nav className="rail" aria-label="Main navigation">
    <span className="brand-mark">N</span>
    <div className="rail-main">
     {[
      ['chats',MessageSquare,'Conversations'],
      ['contacts',Users,'Contacts'],
      ['calls',Phone,'Calls'],
      ['groups',Users,'Groups'],
      ['archive',Archive,'Archived']
     ].map(([id,Icon,label])=>(
      <IconButton key={id} label={label} className={`rail-button ${section===id?'active':''}`} onClick={()=>{setSection(id);if(id!=='chats')setSelected(null);}}>
       <Icon size={22}/>
      </IconButton>
     ))}
    </div>
    <div className="rail-bottom">
     {session.user.role==='ADMIN'&&<IconButton label="Administration" onClick={()=>setSection('admin')}><ShieldCheck size={21}/></IconButton>}
     <IconButton label="Switch theme" onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?<Moon size={20}/>:<Sun size={20}/>}</IconButton>
     <IconButton label="Settings" disabled={!client} onClick={()=>setModal({type:'settings'})}><Settings size={21}/></IconButton>
     <IconButton label="Sign out" onClick={logout}><LogOut size={20}/></IconButton>
     <Avatar name={session.user.displayName}/>
    </div>
   </nav>

   {section==='calls'?<main className="conversation-main full-width">
    <header className="conversation-header">
     <Avatar name="Calls"/>
     <div className="conversation-title">
      <h2>Call history</h2>
      <span className="eyebrow">Audio, Video & Group calls</span>
     </div>
    </header>
    <CallHistory client={client} onStartCall={handleCallFromHistory} notify={notify}/>
   </main>:
   <>
    <aside className="conversation-sidebar">
     <div className="sidebar-heading">
      <div>
       <span className="eyebrow">YOUR SPACE</span>
       <h1>{section==='chats'?'Conversations':section==='contacts'?'Contacts':section==='archive'?'Archived':'Groups'}</h1>
      </div>
      <IconButton label="New conversation" disabled={!client} onClick={()=>setModal({type:'new'})}><Plus size={23}/></IconButton>
     </div>
     <div className="search-input">
      <Search size={17}/>
      <input aria-label="Search conversations" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search chats, contacts, or User ID…"/>
     </div>
     {query.trim()&&searchResults.length>0&&(
       <>
        <div className="sidebar-label">
         <span>DISCOVER PEOPLE</span>
         <small>{searchResults.length}</small>
        </div>
        <div className="room-list-search">
         {searchResults.map(u=>(
          <div className="contact-list-item" key={u.id}>
           <button type="button" className="room-item" onClick={()=>run(async()=>{setSelected(await createConversation(client,[u.id]));setSection('chats');setQuery('');})}>
            <Avatar name={u.displayName}/>
            <span><strong>{u.displayName}</strong><small>{u.id}</small></span>
           </button>
           <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <button type="button" className="primary-sm" onClick={()=>run(async()=>{setSelected(await createConversation(client,[u.id]));setSection('chats');setQuery('');})}>Chat</button>
            {!contacts.some(item=>item.id===u.id)&&u.id!==client?.getUserId()&&(
             <button type="button" className="text-button" onClick={()=>run(async()=>{await api('/contacts',{method:'POST',body:{userId:u.id}});setContacts([...contacts,u]);notify('Contact saved.');})}>Save</button>
            )}
           </div>
          </div>
         ))}
        </div>
       </>
      )}

      <div className="sidebar-label">
       <span>{section==='contacts'?'SAVED PEOPLE':'RECENT'}</span>
       <small>{section==='contacts'?visibleContacts.length:filtered.length}</small>
      </div>
      <div className="room-list">
       {section==='contacts'?visibleContacts.map(p=>(
        <div className="contact-list-item" key={p.id}>
         <button className="room-item" onClick={()=>run(async()=>{setSelected(await createConversation(client,[p.id]));setSection('chats');})}>
          <Avatar name={p.displayName}/>
          <span><strong>{p.displayName}</strong><small>{p.id}</small></span>
         </button>
         <button className="text-button" onClick={()=>run(async()=>{await api(`/contacts/${encodeURIComponent(p.id)}`,{method:'DELETE'});setContacts(contacts.filter(c=>c.id!==p.id));})}>Remove</button>
        </div>
       )):filtered.map(r=>{
        const unread=r.getUnreadNotificationCount();
        return (
         <button key={r.roomId} className={`room-item ${selected===r.roomId?'selected':''}`} onClick={()=>setSelected(r.roomId)}>
          <Avatar name={r.name}/>
          <span className="room-info">
           <strong>{r.name}</strong>
           <small>{r.getMyMembership()==='invite'?'Invitation received':'Encrypted conversation'}</small>
          </span>
          <span className="room-meta">
           <time>{r.getLastActiveTimestamp()?new Date(r.getLastActiveTimestamp()).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''}</time>
           {unread>0&&<b>{unread}</b>}
          </span>
         </button>
        );
       })}
       {!(section==='contacts'?visibleContacts.length:filtered.length)&&!searchResults.length&&(
        <div className="sidebar-empty">
         <MessageSquare size={28}/>
         <p>{section==='contacts'?'Save a contact from a conversation.':'A quieter corner of the internet.'}</p>
         <small>{section==='contacts'?'Your saved people will appear here.':'Start a conversation or search a User ID above.'}</small>
        </div>
       )}
      </div>
     <div className="sidebar-footer">
      <span className={`connection-dot ${client?.getSyncState()==='PREPARED'||client?.getSyncState()==='SYNCING'?'online':''}`}/>
      <span>{connectionError?'Connection needs attention':client?client.getSyncState()==='ERROR'?'Reconnecting…':'Connected to your server':'Connecting…'}</span>
     </div>
    </aside>

    <main className="conversation-main">
     {connectionError?<Empty title="Messaging could not start">{connectionError}<br/><button className="primary" onClick={()=>location.reload()}>Try again</button></Empty>:
      !client?<Empty title="Preparing your private space"><Spinner/> Loading encryption and syncing conversations…</Empty>:
      !room?<Empty title={`Welcome back, ${session.user.displayName.split(' ')[0]}.`}>Good conversations start with a hello.<br/>Choose a chat, or create a new one.<br/><button className="primary" onClick={()=>setModal({type:'new'})}><Plus size={17}/> New conversation</button></Empty>:
      <>
       <header className="conversation-header">
        <IconButton label="Back to conversations" className="icon-button mobile-back" onClick={()=>setSelected(null)}><ArrowLeft size={20}/></IconButton>
        <Avatar name={room.name}/>
        <div className="conversation-title">
         <h2>{room.name}</h2>
         <button className="encryption-label" onClick={()=>setModal({type:'security'})}><ShieldCheck size={12}/>{client.isRoomEncrypted(room.roomId)?'Encrypted · verify devices':'Unencrypted room'}</button>
        </div>
        <div className="header-actions">
         <IconButton label="Search loaded messages" onClick={()=>setSearchMessages(!searchMessages)}><Search size={19}/></IconButton>
         <IconButton label="Voice call" onClick={()=>startCall(false)}><Phone size={19}/></IconButton>
         <IconButton label="Video call" onClick={()=>startCall(true)}><Video size={20}/></IconButton>
         <IconButton label="Conversation details" onClick={()=>setModal({type:'info'})}><Info size={20}/></IconButton>
        </div>
       </header>

       {searchMessages&&<div className="conversation-tools"><input aria-label="Search loaded messages" value={messageQuery} onChange={e=>setMessageQuery(e.target.value)} placeholder="Search messages loaded on this device…"/></div>}

       <div className="conversation-toolbar">
        <button onClick={()=>setModal({type:'security'})}><ShieldCheck size={14}/> Verify devices</button>
        {other&&<>
         <button onClick={()=>run(async()=>{await api('/contacts',{method:'POST',body:{userId:other.userId}});notify('Contact saved.');})}><UserPlus size={14}/> Save contact</button>
         <button onClick={block}><ShieldBan size={14}/>{client.getIgnoredUsers().includes(other.userId)?'Unblock':'Block user'}</button>
        </>}
        <button onClick={archive}><Archive size={14}/>{room.tags['org.nexus.archived']?'Unarchive':'Archive'}</button>
       </div>

       {room.getMyMembership()==='invite'?<Empty title="You’re invited"><p>Join this conversation to connect. Verify participant devices before sending.</p><button className="primary" onClick={()=>run(()=>client.joinRoom(room.roomId))}>Accept invitation</button><button className="secondary" onClick={()=>run(()=>client.leave(room.roomId))}>Decline</button></Empty>:
        <>
         <MessageList client={client} room={room} query={messageQuery} revision={revision} onReply={e=>{setReply(e);setEdit(null);}} onEdit={(event,body)=>{setEdit({event,body});setReply(null);}} onReport={(userId,evidence)=>setModal({type:'report',userId,evidence})} onForward={body=>setModal({type:'forward',body})} notify={notify}/>
         <div className="typing-line">{room.getJoinedMembers().filter(m=>m.typing&&m.userId!==client.getUserId()).map(m=>m.name).join(', ')}{room.getJoinedMembers().some(m=>m.typing&&m.userId!==client.getUserId())?' is typing…':''}</div>
         <Composer key={room.roomId} client={client} room={room} reply={reply} edit={edit} onClear={()=>{setReply(null);setEdit(null);}} notify={notify}/>
        </>
       }
      </>
     }
    </main>
   </>}

   {modal&&client&&<Modal title={{new:'A new conversation',settings:'Your preferences',security:'Device verification',report:'Report a concern',info:'Conversation details',forward:'Forward message'}[modal.type]} onClose={()=>setModal(null)}>
    {modal.type==='new'&&<NewConversation client={client} notify={notify} onCreated={id=>{setSelected(id);setSection('chats');setModal(null);}}/>}
    {modal.type==='settings'&&<SettingsPanel client={client} user={session.user} onUpdated={user=>setSession({...session,user})} onDeleted={()=>{if(typeof localStorage!=='undefined'){localStorage.removeItem('nexus_session_token');localStorage.removeItem('nexus_csrf_token');}call?.hangup('user_hangup',false);setCall(null);client.stopClient();setClient(null);setSession(null);setModal(null);setSelected(null);}} notify={notify}/>}
    {modal.type==='security'&&<SecurityPanel client={client} room={room} notify={notify}/>}
    {modal.type==='report'&&<ReportForm userId={modal.userId} initialEvidence={modal.evidence} onDone={()=>setModal(null)} notify={notify}/>}
    {modal.type==='info'&&<ConversationInfo client={client} room={room} notify={notify} onClose={()=>{setModal(null);setSelected(null);}}/>}
    {modal.type==='forward'&&<div className="stack"><p className="muted">Send a copy to another conversation.</p>{rooms.filter(r=>r.roomId!==selected&&r.getMyMembership()==='join').map(r=><button key={r.roomId} className="secondary" onClick={()=>run(async()=>{await sendText(client,r.roomId,`Forwarded message:\n${modal.body}`);setModal(null);notify('Message forwarded.');})}>{r.name}</button>)}</div>}
   </Modal>}

   {call&&<CallOverlay client={client} call={call} isGroup={callGroupInfo?.isGroup} groupRoom={callGroupInfo?.groupRoom} notify={notify} onClose={()=>{setCall(null);callRef.current=null;setCallGroupInfo(null);}}/>}
   {toast&&<div className="toast" role="status"><span>{toast}</span><IconButton label="Dismiss notification" onClick={()=>setToast('')}><X size={16}/></IconButton></div>}
  </div>
 );
}
