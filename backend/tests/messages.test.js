import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleMessages,reactionCounts} from '../../frontend/src/modules/messaging/message.model.js';
const event=(id,sender,content,redacted=false)=>({getId:()=>id,getSender:()=>sender,getContent:()=>content,getType:()=> 'm.room.message',isRedacted:()=>redacted});
const room=events=>({getLiveTimeline:()=>({getEvents:()=>events})});
test('a different sender cannot replace another person’s message in the UI',()=>{
 const original=event('a','alice',{msgtype:'m.text',body:'Original'});
 const forged=event('b','mallory',{'m.relates_to':{rel_type:'m.replace',event_id:'a'},'m.new_content':{body:'Forged'}});
 const result=visibleMessages(room([original,forged]));assert.equal(result.length,1);assert.equal(result[0].content.body,'Original');
});
test('valid edits replace the displayed body; redacted messages are absent',()=>{
 const a=event('a','alice',{body:'Before'}),b=event('b','alice',{'m.relates_to':{rel_type:'m.replace',event_id:'a'},'m.new_content':{body:'After'}}),c=event('c','bob',{body:'Deleted'},true);
 const result=visibleMessages(room([a,b,c]));assert.equal(result.length,1);assert.equal(result[0].content.body,'After');assert.equal(result[0].edited,true);
});
test('encrypted application reactions count at most once per sender and exclude redactions',()=>{
 const reaction=()=>({msgtype:'m.nexus.reaction',body:'👍','m.relates_to':{event_id:'a'}});
 const r=room([event('1','alice',reaction()),event('2','alice',reaction()),event('3','bob',reaction()),event('4','charlie',reaction(),true)]);
 assert.deepEqual(reactionCounts(r,'a'),{'👍':2});assert.equal(visibleMessages(r).length,0);
});

test('malformed encrypted message bodies cannot inject React objects into the view',()=>{const r=visibleMessages(room([event('a','alice',{body:{malicious:'object'}})]));assert.equal(r[0].content.body,'[Unsupported message]');});
