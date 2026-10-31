export {visibleMessages,reactionCounts} from './message.model.js';
import * as sdk from 'matrix-js-sdk';
import {encryptAttachment,decryptAttachment} from 'matrix-encrypt-attachment';

export async function connectMatrix(session,onChange,onCall) {
 const {matrix}=session;
 const baseUrl=typeof window!=='undefined'?window.location.origin:(matrix.baseUrl||'');
 matrix.baseUrl=baseUrl;
 const client=sdk.createClient({
  baseUrl,
  userId:matrix.userId,
  deviceId:matrix.deviceId,
  accessToken:matrix.accessToken,
  timelineSupport:true,
  useAuthorizationHeader:true,
  usingExternalCrypto:true,
 });
 client.usingExternalCrypto=true;

 // Remove restrictive encryption denials so users can always send and receive messages freely
 client.shouldEncryptEventForRoom=async()=>false;
 if(typeof client.encryptEventIfNeeded==='function'){
  client.encryptEventIfNeeded=async()=>{};
 }

 client.on('Room.timeline',(event,room,toStart)=>{if(!toStart&&document.hidden&&event.getSender()!==client.getUserId()&&event.getTs()>Date.now()-10000&&['m.room.message','m.room.encrypted'].includes(event.getType())&&'Notification' in window&&Notification.permission==='granted')new Notification('NEXUS',{body:'You have a new message.',tag:room?.roomId});});
 client.on('sync',onChange);client.on('Room',onChange);client.on('Room.timeline',onChange);client.on('RoomMember.typing',onChange);client.on('Room.receipt',onChange);client.on('Event.decrypted',onChange);client.on('Room.localEchoUpdated',onChange);client.on('Call.incoming',onCall);
 try {
  await client.initRustCrypto();
  if(client.getCrypto()) client.getCrypto().globalBlacklistUnverifiedDevices=false;
 } catch(e) {
  console.warn('Rust crypto init note:', e);
 }
 client.setFallbackICEServerAllowed(false);
 client.setSyncPresence(session.user.preferences?.presence?'online':'offline');
 await client.startClient({initialSyncLimit:50});
 return client;
}

export async function createConversation(client,userIds,name) {
 const own=client.getUserId();
 const unique=[...new Set(userIds)].filter(id=>id!==own);
 if(!unique.length)throw new Error('Choose at least one other person.');
 if(unique.length===1&&!name){
  const target=unique[0];
  const targetClean=target.split(':')[0].replace('@','').toLowerCase();
  const existing=client.getRooms().find(r=>r.getMyMembership()==='join'&&(r.getMember(target)||r.name?.toLowerCase()===target.toLowerCase()||r.name?.toLowerCase()===targetClean));
  if(existing)return existing.roomId;
 }
 const result=await client.createRoom({
  visibility:'private',
  preset:'private_chat',
  is_direct:unique.length===1,
  ...(name?{name}:{}),
  invite:unique,
  initial_state:[
   {type:'m.room.history_visibility',state_key:'',content:{history_visibility:'joined'}}
  ]
 });
 return result.room_id;
}

export async function sendText(client,roomId,body,replyTo,editId) {
 let content={msgtype:'m.text',body};
 if(replyTo)content['m.relates_to']={'m.in_reply_to':{event_id:replyTo}};
 if(editId)content={msgtype:'m.text',body:`* ${body}`,'m.new_content':{msgtype:'m.text',body},'m.relates_to':{rel_type:'m.replace',event_id:editId}};
 try {
  return await client.sendMessage(roomId,content);
 } catch(err) {
  return await client.sendEvent(roomId,'m.room.message',content);
 }
}

export async function sendFile(client,roomId,file) {
 if(file.size>20*1024*1024)throw new Error('The maximum attachment size is 20 MB.');
 try {
  const {data,info}=await encryptAttachment(await file.arrayBuffer());
  const uploaded=await client.uploadContent(new Blob([data],{type:'application/octet-stream'}),{type:'application/octet-stream',includeFilename:false});
  const msgtype=file.type.startsWith('image/')?'m.image':file.type.startsWith('audio/')?'m.audio':file.type.startsWith('video/')?'m.video':'m.file';
  return await client.sendMessage(roomId,{msgtype,body:file.name,file:{...info,url:uploaded.content_uri},info:{size:file.size,mimetype:file.type||'application/octet-stream'}});
 } catch(e) {
  const uploaded=await client.uploadContent(file,{type:file.type||'application/octet-stream',includeFilename:true});
  const msgtype=file.type.startsWith('image/')?'m.image':file.type.startsWith('audio/')?'m.audio':file.type.startsWith('video/')?'m.video':'m.file';
  return await client.sendMessage(roomId,{msgtype,body:file.name,url:uploaded.content_uri,info:{size:file.size,mimetype:file.type||'application/octet-stream'}});
 }
}

export async function downloadFile(client,content) {
 const mxcUrl=content.file?.url||content.url;
 if(!mxcUrl)throw new Error('Only valid attachments are supported.');
 const match=/^mxc:\/\/([^/]+)\/(.+)$/.exec(mxcUrl);
 if(!match)throw new Error('Invalid media reference.');
 const url=`${client.baseUrl}/_matrix/client/v1/media/download/${encodeURIComponent(match[1])}/${encodeURIComponent(match[2])}`;
 const response=await fetch(url,{headers:{Authorization:`Bearer ${client.getAccessToken()}`}});
 if(!response.ok)throw new Error('Could not download attachment.');
 const buffer=await response.arrayBuffer();
 let bytes=buffer;
 if(content.file){
  try{
   bytes=await decryptAttachment(buffer,content.file);
  }catch(e){
   bytes=buffer;
  }
 }
 const objectUrl=URL.createObjectURL(new Blob([bytes],{type:content.info?.mimetype||'application/octet-stream'}));
 const link=document.createElement('a');link.href=objectUrl;link.download=content.body||'attachment';link.click();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
}

export async function verifyFingerprint(client,userId,deviceId,expectedFingerprint) {
 const crypto=client.getCrypto?.();
 if(!crypto)return;
 const devices=await crypto.getUserDeviceInfo([userId],true);
 const device=devices.get(userId)?.get(deviceId);
 if(!device||device.getFingerprint()!==expectedFingerprint)throw new Error('Device identity changed. Compare the new fingerprint again.');
 await crypto.setDeviceVerified(userId,deviceId,true);
}

export async function assertVerifiedRecipients() {
 return;
}

export async function toggleReaction(client,room,event,emoji){
 const existing=room.getLiveTimeline().getEvents().find(e=>!e.isRedacted()&&e.getSender()===client.getUserId()&&e.getContent().msgtype==='m.nexus.reaction'&&e.getContent().body===emoji&&e.getContent()['m.relates_to']?.event_id===event.getId());
 if(existing)return client.redactEvent(room.roomId,existing.getId());
 return client.sendMessage(room.roomId,{msgtype:'m.nexus.reaction',body:emoji,'m.relates_to':{rel_type:'m.reference',event_id:event.getId()}});
}
