import './direct-send.js';
import './how-it-works.js';
const form=document.getElementById('faq-form');
if(form){
 form.addEventListener('submit',async event=>{
  event.preventDefault();const input=document.getElementById('faq-question'),answer=document.getElementById('faq-answer'),button=form.querySelector('button');
  if(!input.value.trim())return;
  button.disabled=true;answer.textContent='Finding an answer…';answer.setAttribute('aria-busy','true');
  try{
   const response=await fetch('/api/faq',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:input.value.trim()}),signal:AbortSignal.timeout(30000)});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Please try again.');answer.textContent=data.answer;
  }catch(error){answer.textContent=error.name==='TimeoutError'?'Please try again shortly.':error.message;}
  finally{button.disabled=false;answer.setAttribute('aria-busy','false');}
 });
}
