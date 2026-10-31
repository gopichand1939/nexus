import {useEffect,useRef,useState} from 'react';
import {PhoneOff,Mic,MicOff,Video,VideoOff,Phone,Maximize,PictureInPicture2,SwitchCamera,Monitor,Users} from 'lucide-react';
import {assertVerifiedRecipients} from '../messaging/matrix.service';
import {Avatar} from '../../shared/components';
import {api} from '../../shared/api';

export function CallOverlay({client,call,isGroup=false,groupRoom=null,onClose,notify}) {
 const [,render]=useState(0),[muted,setMuted]=useState(false),[cameraOff,setCamera]=useState(false),[seconds,setSeconds]=useState(0);
 const [isScreenSharing,setIsScreenSharing]=useState(false);
 const [cameras,setCameras]=useState([]);
 const [cameraIndex,setCameraIndex]=useState(0);
 const local=useRef(null),remote=useRef(null),panel=useRef(null);
 const startTimeRef=useRef(Date.now());
 const loggedRef=useRef(false);

 useEffect(()=>{
  if(navigator.mediaDevices?.enumerateDevices){
   navigator.mediaDevices.enumerateDevices().then(devs=>{
    const cams=devs.filter(d=>d.kind==='videoinput');
    setCameras(cams);
   }).catch(()=>{});
  }
 },[]);

 const logCall=async(statusOverride)=>{
  if(loggedRef.current)return;
  loggedRef.current=true;
  const elapsed=Math.round((Date.now()-startTimeRef.current)/1000);
  const peer=call?.getOpponentMember();
  const peerId=peer?.userId||groupRoom?.roomId||call?.roomId||'unknown';
  const peerName=peer?.name||groupRoom?.name||'NEXUS Call';
  const callType=isGroup?'group':call?.type==='video'?'video':'audio';
  const direction=call?.direction==='inbound'?'incoming':'outgoing';
  let status=statusOverride;
  if(!status){
   if(call?.state==='connected')status='completed';
   else if(call?.state==='ringing'&&direction==='incoming')status='missed';
   else status='rejected';
  }
  try{
   await api('/calls',{
    method:'POST',
    body:{peerId,peerName,callType,direction,status,durationSeconds:status==='completed'?elapsed:0}
   });
  }catch{
   // Silently catch logging error
  }
 };

 useEffect(()=>{
  const update=()=>render(n=>n+1);
  const end=()=>{logCall('completed');onClose();};
  const error=e=>{logCall('failed');notify(e.message||'Call failed.');};
  call.on('state',update);
  call.on('feeds_changed',update);
  call.on('hangup',end);
  call.on('error',error);

  const timer=setInterval(()=>{
   if(call.state==='connected')setSeconds(n=>n+1);
  },1000);

  return()=>{
   clearInterval(timer);
   call.off('state',update);
   call.off('feeds_changed',update);
   call.off('hangup',end);
   call.off('error',error);
  };
 },[call]);

 useEffect(()=>{
  if(local.current)local.current.srcObject=call.localUsermediaStream||null;
  if(remote.current)remote.current.srcObject=call.remoteUsermediaStream||null;
 });

 const run=async action=>{try{await action();}catch(e){notify(e.message||'Call action failed.');}};

 const switchCamera=async()=>{
  if(cameras.length<2)return notify('Only one camera is available on this device.');
  const nextIdx=(cameraIndex+1)%cameras.length;
  setCameraIndex(nextIdx);
  const nextCam=cameras[nextIdx];
  try{
   const newStream=await navigator.mediaDevices.getUserMedia({video:{deviceId:{exact:nextCam.deviceId}}});
   const newTrack=newStream.getVideoTracks()[0];
   const sender=call.peerConn?.getSenders()?.find(s=>s.track?.kind==='video');
   if(sender)await sender.replaceTrack(newTrack);
   if(local.current)local.current.srcObject=newStream;
   notify(`Switched to: ${nextCam.label||`Camera ${nextIdx+1}`}`);
  }catch(e){
   notify(e.message||'Could not switch camera.');
  }
 };

 const togglePiP=async()=>{
  try{
   if(document.pictureInPictureElement)await document.exitPictureInPicture();
   else if(remote.current)await remote.current.requestPictureInPicture();
  }catch(e){
   notify(e.message||'Picture-in-picture failed.');
  }
 };

 const toggleScreenShare=async()=>{
  try{
   if(!isScreenSharing){
    const stream=await navigator.mediaDevices.getDisplayMedia({video:true});
    const screenTrack=stream.getVideoTracks()[0];
    const sender=call.peerConn?.getSenders()?.find(s=>s.track?.kind==='video');
    if(sender)await sender.replaceTrack(screenTrack);
    screenTrack.onended=()=>{toggleScreenShare();};
    setIsScreenSharing(true);
    notify('Screen sharing started.');
   }else{
    const camStream=await navigator.mediaDevices.getUserMedia({video:true});
    const camTrack=camStream.getVideoTracks()[0];
    const sender=call.peerConn?.getSenders()?.find(s=>s.track?.kind==='video');
    if(sender)await sender.replaceTrack(camTrack);
    setIsScreenSharing(false);
    notify('Returned to camera.');
   }
  }catch(e){
   notify(e.message||'Screen share toggle failed.');
  }
 };

 const opponent=call.getOpponentMember();
 const opponentName=isGroup?(groupRoom?.name||'Group call'):(opponent?.name||'NEXUS call');
 const members=isGroup?groupRoom?.getJoinedMembers()||[]:[];

 return (
  <div className="call-backdrop">
   <section className="call-panel" ref={panel} role="dialog" aria-modal="true" aria-label="Active call">
    <div className="section-line">
     <span className="eyebrow">{isGroup?'NEXUS GROUP CALL':'NEXUS CALL'}</span>
     <div className="call-top-actions">
      {document.pictureInPictureEnabled&&call.type==='video'&&<button className="icon-button" aria-label="Picture in picture" onClick={togglePiP}><PictureInPicture2 size={18}/></button>}
      <button className="icon-button" aria-label="Full screen" onClick={()=>run(()=>panel.current.requestFullscreen())}><Maximize size={18}/></button>
     </div>
    </div>

    {isGroup?<div className="group-call-grid">
     <div className="group-members-list">
      {members.map(m=>(
       <div key={m.userId} className="group-member-tile">
        <Avatar name={m.name} size="large"/>
        <span>{m.name}</span>
        {m.userId===client.getUserId()&&<small>(You)</small>}
       </div>
      ))}
     </div>
    </div>:
    <div className="remote-media">
     <video ref={remote} autoPlay playsInline/>
     <div className="call-label">
      <Avatar name={opponentName} size="large"/>
      <h2>{opponentName}</h2>
      <p>{call.state==='connected'?`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`:call.state.replaceAll('_',' ')}</p>
     </div>
     <video className="local-video" ref={local} autoPlay playsInline muted/>
    </div>
    }

    <div className="call-controls">
     {call.state==='ringing'&&<button className="primary" onClick={()=>run(async()=>{await call.answer();})}><Phone size={20}/> Accept</button>}
     <button className="secondary" aria-label={muted?'Unmute':'Mute'} onClick={()=>run(async()=>{await call.setMicrophoneMuted(!muted);setMuted(!muted);})}>{muted?<MicOff/>:<Mic/>}</button>
     {call.type==='video'&&<button className="secondary" aria-label={cameraOff?'Enable camera':'Disable camera'} onClick={()=>run(async()=>{await call.setLocalVideoMuted(!cameraOff);setCamera(!cameraOff);})}>{cameraOff?<VideoOff/>:<Video/>}</button>}
     {call.type==='video'&&cameras.length>1&&<button className="secondary" aria-label="Switch camera" onClick={switchCamera}><SwitchCamera/></button>}
     {navigator.mediaDevices?.getDisplayMedia&&<button className={`secondary ${isScreenSharing?'active':''}`} aria-label="Share screen" onClick={toggleScreenShare}><Monitor/></button>}
     <button className="danger-button" onClick={()=>{
      if(call.state==='ringing'){logCall('rejected');call.reject();}
      else{logCall('completed');call.hangup('user_hangup',false);}
      onClose();
     }}>
      <PhoneOff size={20}/> {call.state==='ringing'?'Reject':'End'}
     </button>
    </div>
    <p className="fineprint">{isGroup?'Multi-participant group call':'One-to-one WebRTC call'} · Network connectivity depends on your TURN configuration.</p>
   </section>
  </div>
 );
}
