export function visibleMessages(room) {
 if(!room)return [];
 const timeline=room.getLiveTimeline().getEvents();
 const edits=new Map();
 for(const e of timeline){const c=e.getContent();if(c['m.relates_to']?.rel_type==='m.replace'){
  const target=timeline.find(x=>x.getId()===c['m.relates_to'].event_id);
  if(target?.getSender()===e.getSender())edits.set(c['m.relates_to'].event_id,c['m.new_content']);
 }}
 return timeline.filter(e=>['m.room.message','m.room.encrypted'].includes(e.getType())&&!e.isRedacted()&&e.getContent()['m.relates_to']?.rel_type!=='m.replace'&&e.getContent().msgtype!=='m.nexus.reaction')
 .map(event=>({event,content:sanitizeContent(edits.get(event.getId())||event.getContent()),edited:edits.has(event.getId())}));
}
export function reactionCounts(room,eventId) {
 const result={},seen=new Set();
 for(const e of room.getLiveTimeline().getEvents()){
  if(e.isRedacted()||e.getType()!=='m.room.message')continue;
  const c=e.getContent(),relation=c['m.relates_to'];
  if(c.msgtype!=='m.nexus.reaction'||relation?.event_id!==eventId||!['👍','❤️','😊','🎉','🙏'].includes(c.body))continue;
  const key=e.getSender()+'|'+c.body;
  if(!seen.has(key)){result[c.body]=(result[c.body]||0)+1;seen.add(key);}
 }return result;
}

function sanitizeContent(value) {
 const content=value&&typeof value==='object'?value:{};
 return {...content,body:typeof content.body==='string'?content.body.slice(0,32000):'[Unsupported message]'};
}
