// Local-only camera capture. No media leaves the browser.
export function createVideoCapture({mediaDevices,Recorder,onPreview,onReady,onStatus,isOpen=()=>true,now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout}){
 let generation=0,stream=null,recorder=null,timer=null,started=0,ended=0,busy=false;
 const tracks=()=>{stream?.getTracks().forEach(track=>track.stop());stream=null;};
 function cancel(){generation++;busy=false;clearTimer(timer);timer=null;const previous=recorder;recorder=null;if(previous&&previous.state!=='inactive')previous.stop();tracks();onPreview(null);}
 function stop(){clearTimer(timer);timer=null;if(recorder?.state==='recording'){ended=now();recorder.stop();tracks();onPreview(null);}}
 async function start(){
  if(busy)return;cancel();busy=true;const at=generation;
  if(!mediaDevices?.getUserMedia||!Recorder){busy=false;throw Error('Camera recording is unavailable here. Upload a video recorded on your phone instead.');}
  try{
   onStatus('Requesting camera and microphone access…');
   const acquired=await mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:true});
   if(at!==generation||!isOpen()){acquired.getTracks().forEach(track=>track.stop());return;}
   stream=acquired;const mime=['video/mp4','video/webm;codecs=vp8,opus','video/webm'].find(type=>Recorder.isTypeSupported?.(type));
   const current=new Recorder(stream,{...(mime?{mimeType:mime}:{}),videoBitsPerSecond:1500000,audioBitsPerSecond:96000});recorder=current;
   let chunks=[],bytes=0,tooLarge=false,elapsed=0;
   current.ondataavailable=event=>{if(at!==generation||!event.data.size)return;bytes+=event.data.size;if(bytes>25*1024*1024){tooLarge=true;chunks=[];stop();return;}if(!tooLarge)chunks.push(event.data);};
   current.onerror=()=>{if(at===generation){cancel();onStatus('Recording failed. Try again or upload a video from your device.');}};
   current.onstop=()=>{if(at!==generation)return;elapsed=((ended||now())-started)/1000;busy=false;recorder=null;clearTimer(timer);tracks();onPreview(null);
    if(tooLarge||!chunks.length||elapsed>30.1){onStatus(tooLarge?'Recording exceeded 25 MB. Please record a shorter clip.':elapsed>30.1?'Recording ran longer than 30 seconds. Please record again and stop before the limit.':'No video was recorded. Please try again.');return;}
    const type=current.mimeType?.startsWith('video/mp4')?'video/mp4':'video/webm';
    onReady(new Blob(chunks,{type}),Math.max(.01,elapsed));
   };
   current.start(250);started=now();ended=0;onPreview(stream);onStatus('Recording… stops automatically at 30 seconds.');timer=setTimer(stop,30000);
  }catch(error){if(at!==generation)return;cancel();throw Error(error.name==='NotAllowedError'?'Allow camera and microphone access, then try again. You can also upload an existing video.':'Camera or microphone unavailable. Close other camera apps or upload a video.');}
 }
 return {start,stop,cancel,get busy(){return busy;}};
}
