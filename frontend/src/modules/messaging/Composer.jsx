import {useEffect,useRef,useState} from 'react';
import {Paperclip,Send,Smile,Mic,Square,X} from 'lucide-react';
import {IconButton,Spinner} from '../../shared/components';
import {sendText,sendFile} from './matrix.service';
export function Composer({client,room,reply,edit,onClear,notify}) {
 const [draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[recording,setRecording]=useState(false),[emoji,setEmoji]=useState(false);
 const file=useRef(null),input=useRef(null),recorder=useRef(null),lastTyping=useRef(0);
 useEffect(()=>{setDraft(edit?.body||'');input.current?.focus();},[edit,room.roomId]);
 useEffect(()=>()=>{if(recorder.current){recorder.current.onstop=null;recorder.current.stop();recorder.current.stream.getTracks().forEach(t=>t.stop());recorder.current=null;}},[room.roomId]);
 async function submit(e){e.preventDefault();if(!draft.trim()||busy)return;const text=draft;setBusy(true);try{await sendText(client,room.roomId,text,reply?.getId(),edit?.event.getId());setDraft('');onClear();}catch(e){notify(e.message);}finally{setBusy(false);}}
 async function attach(f){if(!f)return;setBusy(true);try{await sendFile(client,room.roomId,f);}catch(e){notify(e.message);}finally{setBusy(false);if(file.current)file.current.value='';}}
 async function record(){if(recording){recorder.current?.stop();return;}try{
  if(!window.MediaRecorder)throw new Error('Voice recording is not available in this browser.');
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});const rec=new MediaRecorder(stream);const chunks=[];recorder.current=rec;
  rec.ondataavailable=e=>chunks.push(e.data);rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());recorder.current=null;setRecording(false);const blob=new Blob(chunks,{type:rec.mimeType});attach(new File([blob],`voice-${Date.now()}.${rec.mimeType.includes('mp4')?'m4a':'webm'}`,{type:rec.mimeType}));};
  rec.start();setRecording(true);
 }catch(e){notify(e.message);}}
 function change(value){setDraft(value);if(Date.now()-lastTyping.current>3000){lastTyping.current=Date.now();client.sendTyping(room.roomId,!!value,5000).catch(()=>{});}}
 return <div className="composer-wrap">{(reply||edit)&&<div className="composer-context"><span>{edit?'Editing message':`Replying to ${reply.getSender()}`}<small>{edit?.body||(typeof reply?.getContent().body==='string'?reply.getContent().body:'Message')}</small></span><IconButton label="Cancel reply or edit" onClick={()=>{onClear();setDraft('');}}><X size={16}/></IconButton></div>}{emoji&&<div className="emoji-picker">{['😊','❤️','👍','🎉','🙏','😂','✨','👋'].map(x=><button key={x} onClick={()=>{setDraft(d=>d+x);setEmoji(false);input.current?.focus();}}>{x}</button>)}</div>}<form className="composer" onSubmit={submit}><input type="file" ref={file} hidden onChange={e=>attach(e.target.files[0])}/><IconButton type="button" label="Attach encrypted file" disabled={busy||recording} onClick={()=>file.current?.click()}><Paperclip size={20}/></IconButton><textarea ref={input} aria-label="Message" rows={1} value={draft} onChange={e=>change(e.target.value)} placeholder={recording?'Recording voice message…':'Write a message…'} maxLength={16000} disabled={recording} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form.requestSubmit();}}}/><IconButton type="button" label="Emoji" onClick={()=>setEmoji(!emoji)}><Smile size={20}/></IconButton><IconButton type="button" label={recording?'Stop recording and send':'Record voice message'} disabled={busy} onClick={record}>{recording?<Square className="danger" size={18}/>:<Mic size={20}/>}</IconButton><button type="submit" className="send-button" aria-label="Send message" disabled={!draft.trim()||busy||recording}>{busy?<Spinner/>:<Send size={19}/>}</button></form><small className="composer-hint">Enter to send · Shift + Enter for a new line · Files up to 20 MB</small></div>;
}
