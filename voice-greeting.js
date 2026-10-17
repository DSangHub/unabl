export function initVoiceGreeting({request}){
 const section=document.createElement('section');section.id='voice-greeting';section.className='mt-6 p-5 rounded-2xl border border-amber-300 bg-amber-50';
 section.innerHTML=`<h3 class="text-xl font-bold">Say congratulations in your own voice</h3>
 <p class="mt-2">A personal photo, your voice, and a message from the heart. Add an AI celebration greeting to your card for <strong>$4.95</strong>.</p>
 <p class="mt-2 text-sm font-semibold" role="status">Coming soon: voice cloning and talking-photo delivery are not connected yet. Draft and preview below; no purchase or charge is available.</p>
 <button type="button" class="btn-primary mt-3" data-open>Create a greeting draft</button>`;
 document.getElementById('gift-checkout').parentElement.append(section);
 const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','Personal congratulations greeting draft');
 dialog.style.cssText='width:min(94vw,720px);max-height:90dvh;border-radius:20px;padding:24px;overflow:auto';
 dialog.innerHTML=`<form method="dialog" style="display:flex;justify-content:space-between;gap:16px"><h2 class="text-xl font-bold">Your celebration greeting · $4.95</h2><button aria-label="Close greeting editor">Close ✕</button></form>
 <p class="my-3 text-sm">Prepare a draft. The final version will be labeled “AI-generated greeting” and sent with your card after generation and payment are available.</p>
 <label class="block my-3">Your photo<input data-photo type="file" accept="image/jpeg,image/png,image/webp" class="block mt-2" /></label>
 <img data-image hidden alt="Your greeting photo preview" style="width:180px;height:220px;object-fit:cover;border-radius:12px;margin:12px auto" />
 <label class="block my-3">Your name<input data-name type="text" maxlength="60" autocomplete="name" style="display:block;width:100%;border:1px solid #94a3b8;border-radius:8px;padding:10px" /></label>
 <label class="block my-3">Message to speak<textarea data-script maxlength="600" rows="4" placeholder="Congratulations! We’re so happy for you…" style="display:block;width:100%;border:1px solid #94a3b8;border-radius:8px;padding:10px"></textarea></label>
 <div style="display:flex;gap:12px;flex-wrap:wrap"><button data-improve type="button" class="btn-primary">Help polish my message with AI</button><span data-count>0 / 600</span></div>
 <p class="text-sm mt-2">AI writing help sends only your typed message to OpenAI. Review its wording before using it.</p>
 <label class="block my-4"><input data-consent type="checkbox" /> This is my photo and my own adult voice. I consent to their use to create this AI greeting.</label>
 <h3 class="font-bold">Record a voice sample</h3><p class="text-sm my-2">Speak clearly for 10–30 seconds in a quiet place. This draft recording stays on this device and is not uploaded. A separate spoken consent recording will be required before voice cloning is enabled.</p>
 <div style="display:flex;gap:12px;flex-wrap:wrap"><button data-record type="button" class="btn-primary">Record my voice</button><button data-stop type="button" class="btn-primary" disabled>Stop recording</button></div>
 <audio data-audio controls hidden style="width:100%;margin:12px 0"></audio>
 <button data-preview type="button" class="btn-primary mt-3">Preview photo and recorded voice</button>
 <p data-status role="status" aria-live="polite" class="my-3"></p>
 <p class="text-sm">This preview plays your original recording. It does not synthesize the typed message or animate the photo.</p>
 <button type="button" disabled class="btn-primary mt-4" style="opacity:.55">Add AI greeting · $4.95 — coming soon</button>
 <button data-clear type="button" class="mt-4 underline" style="margin-left:16px">Clear photo and recording</button>`;
 document.body.append(dialog);
 const $=s=>dialog.querySelector(s);let recorder,stream,timer,photoURL,audioURL;
 const status=message=>$('[data-status]').textContent=message;
 function stop(){clearTimeout(timer);if(recorder?.state==='recording')recorder.stop();stream?.getTracks().forEach(track=>track.stop());$('[data-stop]').disabled=true;$('[data-record]').disabled=false;}
 function clear(){stop();for(const url of [photoURL,audioURL])if(url)URL.revokeObjectURL(url);photoURL=audioURL=null;$('[data-image]').removeAttribute('src');$('[data-image]').hidden=true;$('[data-audio]').removeAttribute('src');$('[data-audio]').hidden=true;$('[data-photo]').value='';status('Photo and recording cleared.');}
 section.querySelector('[data-open]').onclick=()=>{if(!dialog.open)dialog.showModal();};
 dialog.addEventListener('close',()=>{stop();$('[data-audio]').pause();});
 $('[data-script]').oninput=()=>{$('[data-count]').textContent=$('[data-script]').value.length+' / 600';};
 $('[data-photo]').onchange=()=>{const file=$('[data-photo]').files[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){$('[data-photo]').value='';return status('Choose a JPG, PNG or WebP photo under 5 MB.');}if(photoURL)URL.revokeObjectURL(photoURL);photoURL=URL.createObjectURL(file);$('[data-image]').src=photoURL;$('[data-image]').hidden=false;status('Photo ready for a local preview.');};
 $('[data-record]').onclick=async()=>{
  if(!$('[data-consent]').checked)return status('Confirm that the photo and adult voice are yours before recording.');
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return status('Voice recording is not supported in this browser. Try a current Safari, Chrome or Edge browser.');
  try{stream=await navigator.mediaDevices.getUserMedia({audio:true});
   if(!dialog.open){stream.getTracks().forEach(t=>t.stop());return;}
   const chunks=[];recorder=new MediaRecorder(stream);const start=Date.now();
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onstop=()=>{if(audioURL)URL.revokeObjectURL(audioURL);const blob=new Blob(chunks,{type:recorder.mimeType});if(blob.size>5*1024*1024){status('Recording was too large. Please record a shorter sample.');return;}audioURL=URL.createObjectURL(blob);$('[data-audio]').src=audioURL;$('[data-audio]').hidden=false;status(Date.now()-start<10000?'Recording saved locally. Aim for 10–30 seconds for a useful voice sample.':'Voice sample saved locally. This is an original recording, not AI speech.');};
   recorder.start();$('[data-record]').disabled=true;$('[data-stop]').disabled=false;timer=setTimeout(stop,30000);status('Recording… automatically stops after 30 seconds.');
  }catch{stop();status('Microphone access was unavailable. Allow microphone access and try again.');}
 };
 $('[data-stop]').onclick=stop;
 $('[data-clear]').onclick=clear;
 $('[data-consent]').onchange=()=>{if(!$('[data-consent]').checked)clear();};
 $('[data-preview]').onclick=async()=>{if(!photoURL||!audioURL||!$('[data-script]').value.trim()||!$('[data-name]').value.trim())return status('Add your photo, name, message, and voice recording first.');if(!$('[data-consent]').checked)return status('Your consent is required.');try{await $('[data-audio]').play();status('Previewing your photo with your original recording. AI speech and photo animation are coming soon.');}catch{status('Use the audio player to play your voice sample.');}};
 $('[data-improve]').onclick=async()=>{const button=$('[data-improve]');button.disabled=true;const original=$('[data-script]').value;try{const result=await request('/api/greeting-script',{message:original});if($('[data-script]').value!==original)return status('Your text changed while AI was working. Kept your current message.');$('[data-script]').value=result.message;$('[data-script]').dispatchEvent(new Event('input'));status('AI draft ready. Review the wording before recording or sending.');}catch(e){status(e.message);}finally{button.disabled=false;}};
 window.addEventListener('pagehide',clear);
}
