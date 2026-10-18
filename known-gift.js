import {clickFeeCents} from './gift-fees.js';
import {venmoFeeStep} from './stripe-fee-step.js';
const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
const username=value=>/^[A-Za-z0-9_-]{5,30}$/.test(value.trim().replace(/^@/,''));
const $=id=>document.getElementById(id);
function cardDialog(data){
 let dialog=$('known-card-dialog');if(dialog)dialog.remove();
 dialog=document.createElement('dialog');dialog.id='known-card-dialog';
 dialog.innerHTML='<button type="button" class="known-close" aria-label="Close card">×</button><button type="button" class="known-cover"><span aria-hidden="true">✨ 🎉 ✨</span><strong>A little celebration,<br>just for you</strong><span>Tap to open your card</span></button><article class="known-inside" hidden><span aria-hidden="true">🎊 🎁 🎊</span><h2></h2><p class="known-message"></p><p class="known-from"></p><button type="button" class="known-button">Close card</button></article>';
 dialog.querySelector('h2').textContent=data.title;
 dialog.querySelector('.known-message').textContent=data.message;
 dialog.querySelector('.known-from').textContent='With love, '+data.from;
 const cover=dialog.querySelector('.known-cover'),inside=dialog.querySelector('article');
 cover.onclick=()=>{cover.hidden=true;inside.hidden=false;inside.querySelector('button').focus();};
 inside.querySelector('button').onclick=()=>{inside.hidden=true;cover.hidden=false;cover.focus();};
 dialog.querySelector('.known-close').onclick=()=>dialog.close();document.body.append(dialog);dialog.showModal();
}
function encodeCard(data){return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(data)))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
function decodeCard(value){
 if(value.length>10000)throw Error('Card link is too long.');
 const raw=value.replaceAll('-','+').replaceAll('_','/');const data=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(raw),c=>c.charCodeAt(0))));
 if(!data||typeof data.title!=='string'||data.title.length>140||typeof data.message!=='string'||data.message.length>1200||typeof data.from!=='string'||data.from.length>60)throw Error('Invalid card link.');
 return data;
}
export function initKnownGift({db,getUser,getEvent}){
 const style=document.createElement('style');style.textContent=`
 .known-panel{border:1px solid #b9d8ed;border-radius:16px;background:linear-gradient(135deg,#eff8ff,#fff9ed);padding:20px;margin:20px 0;color:#243348}
 .known-panel h3{font-weight:800;font-size:1.2rem}.known-panel p{margin:8px 0}.known-panel label{display:block;margin:12px 0}.known-panel input:not([type=checkbox]){width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:white}.known-panel small{display:block;color:#526174}
 .known-actions{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}.known-button{display:inline-block;background:#0877bd;color:white;padding:10px 15px;border-radius:9px;font-weight:700;border:0;cursor:pointer}.known-button:disabled{opacity:.5;cursor:not-allowed}.known-outline{background:white;color:#0877bd;border:1px solid #0877bd}.known-panel a{color:#06689f;text-decoration:underline}.known-step{background:white;border-radius:12px;padding:14px;margin:12px 0;border:1px solid #d5e3ed}
 #known-card-dialog{width:min(440px,92vw);padding:24px;border:4px solid #d4a72d;border-radius:20px;box-shadow:0 20px 80px #0005;color:#4d2947;background:#fffdf6}#known-card-dialog::backdrop{background:#14243e99}.known-close{position:absolute;right:10px;top:5px;font-size:26px}.known-cover{width:100%;min-height:370px;background:radial-gradient(circle at 20% 20%,#ffe888 0 8%,transparent 9%),radial-gradient(circle at 85% 80%,#ffe888 0 10%,transparent 11%),linear-gradient(145deg,#f875ac,#a65edc,#5b8ee4);border-radius:10px;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;padding:25px;cursor:pointer}.known-cover strong{font-family:Georgia,serif;font-size:30px}.known-cover span:first-child,.known-inside>span{font-size:36px}.known-inside{text-align:center;padding:25px 5px;min-height:350px}.known-inside h2{font-family:Georgia,serif;font-size:25px;margin:20px 0}.known-message{white-space:pre-wrap;overflow-wrap:anywhere;font-size:18px;line-height:1.6}.known-from{margin:24px 0}.known-cover[hidden],.known-inside[hidden]{display:none}@media(prefers-reduced-motion:no-preference){.known-inside{animation:known-open .35s ease-out}@keyframes known-open{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}}
 `;document.head.append(style);
 if(location.hash.startsWith('#known-card=')){try{cardDialog(decodeCard(location.hash.slice(12)));}catch{const p=document.createElement('p');p.textContent='This card link cannot be opened. Ask the sender for a new link.';document.body.prepend(p);}}

 const panel=document.createElement('section');panel.className='known-panel';panel.id='known-gift';
 panel.innerHTML=`<h3>🎉 Knows — a gift for someone you know</h3><p>Send a festive card with a bank-account gift through Stripe.</p>
 <p style="font-size:1.2rem;font-weight:900;color:#9f1239;border:2px solid #be123c;padding:12px;border-radius:10px">No Credit Cards Accepted</p>
 <small>Knows accepts verified US bank accounts (ACH) only. Debit cards, credit cards, and card-funded wallets are not accepted. This reduces card exposure; bank payments can still fail, be disputed, or be reversed.</small>
 <label><input id="known-creator" type="checkbox"> I know this event creator personally.</label>
 <p><strong>Gift: <span id="known-gift-amount"></span> · Unabl click fee via Venmo (separate): <span id="known-fee-amount"></span> · Stripe checkout total: <span id="known-total"></span></strong></p>
 <small>Pay the tiered click fee separately to @UnablPay through Venmo. It is not included in Stripe’s total and cannot be verified automatically. Bank verification and payment authorization happen on Stripe. Payments can take several business days to confirm. The minimum five-day hold starts after successful payment. Creator verification and release requirements still apply.</small>
 <label>Your name on the card<input id="known-from" maxlength="60" placeholder="Your name" autocomplete="given-name"></label>
 <small>Write your 1–1,200 character message in the guest message box above. Card links contain the message; anyone with the link can read it.</small>
 <div class="known-actions"><button type="button" id="known-preview" class="known-button known-outline">Preview festive card</button><button type="button" id="known-prepare" class="known-button">Pay Venmo click fee & continue with bank account</button><button type="button" id="known-check" class="known-button known-outline" hidden>Check bank payment status</button></div>
 <p id="known-status" role="status" aria-live="polite"></p>
 <div id="known-share-panel" hidden><label>Festive card link<input id="known-share-link" readonly></label><button id="known-copy-card" type="button" class="known-button">Copy card link</button><small>The card link itself is not a payment receipt.</small></div>`;
 $('gift-checkout').parentElement.append(panel);
 let request=null;
 function readCard(){const event=getEvent();if(!event?.id)throw Error('Find a published event by hashtag first.');const message=$('guestMessage').value.trim(),from=$('known-from').value.trim();if(!message||message.length>1200)throw Error('Write a card message of 1–1,200 characters above.');if(!from)throw Error('Add your name on the card.');return {title:event.title,message,from};}
 function updateAmounts(){const cents=Math.round(Number($('customGift').value)*100);$('known-gift-amount').textContent=money(cents);$('known-fee-amount').textContent=money(clickFeeCents(Math.max(1000,Math.min(100000,Number.isFinite(cents)?cents:1000))));$('known-total').textContent=money(cents);}
 $('customGift').addEventListener('input',updateAmounts);$('customGift').addEventListener('change',updateAmounts);document.querySelectorAll('.gift-btn').forEach(button=>button.addEventListener('click',updateAmounts));
 $('known-preview').onclick=()=>{try{cardDialog(readCard());}catch(error){$('known-status').textContent=error.message;}};
 async function api(path,body){const {data:{session}}=await db.auth.getSession();if(!session)throw Error('Sign in and confirm your email first.');const response=await fetch(path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to connect.');return result;}
 $('known-prepare').onclick=async()=>{
  const button=$('known-prepare');button.disabled=true;
  try{if((window.unablCurrency||'USD')!=='USD')throw Error('Bank checkout currently supports USD only.');if(!$('known-creator').checked)throw Error('Confirm that you personally know the event creator.');const card=readCard(),event=getEvent(),amount=Math.round(Number($('customGift').value)*100);if(!Number.isInteger(amount)||amount<1000||amount>100000)throw Error('Gift must be $10 to $1,000.');
   const fingerprint=JSON.stringify({event:event.id,amount,card});if(!request||request.fingerprint!==fingerprint)request={fingerprint,id:crypto.randomUUID()};
   // Save a draft before checkout, so a storage failure cannot leave an orphaned session.
   sessionStorage.setItem('unabl-bank-card',JSON.stringify({card,request_id:request.id}));
   await api('/api/checkout',{action:'quote',flow:'knows_bank',knows_creator:true,event_id:event.id,amount_cents:amount,request_id:request.id,access_code:$('gift-access-code').value});await venmoFeeStep({amount,requestId:request.id});$('known-status').textContent='Preparing bank-only checkout…';const result=await api('/api/checkout',{flow:'knows_bank',knows_creator:true,event_id:event.id,amount_cents:amount,message:card.message,request_id:request.id,access_code:$('gift-access-code').value});
   sessionStorage.setItem('unabl-bank-card',JSON.stringify({card,session_id:result.session_id}));location.assign(result.url);
  }catch(error){$('known-status').textContent=error.message;}finally{button.disabled=false;}
 };
 const params=new URLSearchParams(location.search);
 async function checkPayment(){
  $('known-check').disabled=true;
  try{const id=params.get('session_id');const result=await api('/api/payment-status?session_id='+encodeURIComponent(id||''));if(result.status!=='paid'){$('known-status').textContent=result.status==='failed'?'Bank payment failed. No gift has been confirmed.':'Bank payment is pending. No gift has been confirmed yet. Check again after processing.';return;}
   $('known-status').textContent='Bank payment confirmed. The minimum five-day hold and creator verification requirements apply.';
   const draft=JSON.parse(sessionStorage.getItem('unabl-bank-card')||'null');if(draft?.session_id===id){const url=new URL(location.origin+'/');url.hash='known-card='+encodeCard(draft.card);$('known-share-link').value=url.href;$('known-share-panel').hidden=false;}
  }catch(error){$('known-status').textContent=error.message;}finally{$('known-check').disabled=false;}
 }
 $('known-check').onclick=checkPayment;
 $('known-copy-card').onclick=async()=>{try{await navigator.clipboard.writeText($('known-share-link').value);$('known-status').textContent='Card link copied.';}catch{$('known-status').textContent='Select and copy the card link above.';}};
 if(params.get('knows_bank')==='return'){$('known-check').hidden=false;checkPayment();}
 updateAmounts();
}
