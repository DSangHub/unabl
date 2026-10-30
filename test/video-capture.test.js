import test from 'node:test';
import assert from 'node:assert/strict';
import {createVideoCapture} from '../video-capture.js';
function fixture(overrides={}){
 let clock=100,timeout,stopped=0,last,ready=[],statuses=[];
 const stream={getTracks:()=>[{stop:()=>stopped++}]};
 class Recorder{
  static isTypeSupported(type){return type==='video/webm';}
  constructor(_stream,options){this.state='inactive';this.mimeType=options.mimeType;last=this;}
  start(){this.state='recording';}
  stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['video'])});this.onstop?.();}
 }
 const capture=createVideoCapture({mediaDevices:{getUserMedia:async()=>stream},Recorder,onPreview:()=>{},onReady:(...result)=>ready.push(result),onStatus:text=>statuses.push(text),now:()=>clock,setTimer:fn=>{timeout=fn;return 1;},clearTimer:()=>{},...overrides});
 return {capture,ready,statuses,stream,advance:ms=>clock+=ms,expire:()=>timeout(),get stopped(){return stopped;},get recorder(){return last;}};
}
test('camera stops at 30 seconds, produces playable MIME and releases tracks',async()=>{
 const f=fixture();await f.capture.start();assert.equal(f.capture.busy,true);f.advance(30000);f.expire();
 assert.equal(f.capture.busy,false);assert.equal(f.ready.length,1);assert.equal(f.ready[0][0].type,'video/webm');assert.equal(f.ready[0][1],30);assert.ok(f.stopped>0);
});
test('closing during permission request immediately stops late camera stream; no recording is exposed',async()=>{
 let resolve,stopped=0;const f=fixture({mediaDevices:{getUserMedia:()=>new Promise(r=>resolve=r)}});
 const pending=f.capture.start();f.capture.cancel();resolve({getTracks:()=>[{stop:()=>stopped++}]});await pending;
 assert.equal(stopped,1);assert.equal(f.ready.length,0);assert.equal(f.capture.busy,false);
});
test('cancelled recordings and oversize or delayed clips never become shareable',async()=>{
 const cancelled=fixture();await cancelled.capture.start();cancelled.capture.cancel();assert.equal(cancelled.ready.length,0);
 const large=fixture();await large.capture.start();large.recorder.ondataavailable({data:{size:26*1024*1024}});assert.equal(large.ready.length,0);assert.match(large.statuses.at(-1),/25 MB/);
 const late=fixture();await late.capture.start();late.advance(35000);late.expire();assert.equal(late.ready.length,0);assert.match(late.statuses.at(-1),/longer than 30/);
});
test('denied camera permission provides upload fallback and clears pending state',async()=>{
 const f=fixture({mediaDevices:{getUserMedia:async()=>{throw Object.assign(new Error(),{name:'NotAllowedError'});}}});
 await assert.rejects(f.capture.start(),/Allow camera and microphone/);assert.equal(f.capture.busy,false);assert.equal(f.ready.length,0);
});
