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
 panel.innerHTML=`<h3>🎉 Knows — a gift for someone you know</h3><p>Send a festive card and a gift directly through Venmo.</p>
 <label><input id="known-creator" type="checkbox"> I know this event creator personally.</label>
 <p><strong>Gift to creator: <span id="known-gift-amount"></span> · Unabl fee (2%): <span id="known-fee-amount"></span></strong></p>
 <small>Two separate Venmo payments. Confirm the creator’s username with them. Venmo’s own fees may apply. Direct gifts are outside Unabl’s five-day hold and are not verified paid vouches.</small>
 <label>Your name on the card<input id="known-from" maxlength="60" placeholder="Your name" autocomplete="given-name"></label>
 <small>Your message above will appear inside the card. Card links include the message; anyone with the link can open it.</small>
 <div class="known-actions"><button type="button" id="known-preview" class="known-button known-outline">Preview festive card</button><button type="button" id="known-prepare" class="known-button">Continue with Venmo</button></div>
 <p id="known-status" role="status" aria-live="polite"></p><div id="known-payments" hidden>
 <div class="known-step"><strong>1. Send your gift</strong><p id="known-recipient-detail"></p><a id="known-recipient-link" target="_blank" rel="noopener noreferrer">Open creator’s Venmo profile</a><p><button id="known-copy-gift" type="button" class="known-button known-outline">Copy gift note</button></p><label><input type="checkbox" id="known-gift-reported"> I sent the gift in Venmo.</label></div>
 <div class="known-step"><strong>2. Pay Unabl’s 2% service fee</strong><p id="known-fee-detail"></p><a id="known-fee-link" target="_blank" rel="noopener noreferrer">Open Unabl’s Venmo profile</a><p><button id="known-copy-fee" type="button" class="known-button known-outline">Copy fee note</button></p><label><input type="checkbox" id="known-fee-reported"> I paid the Unabl fee in Venmo.</label></div>
 <p>These checkboxes are your report. Unabl cannot confirm either direct Venmo payment.</p><button id="known-share" type="button" class="known-button" disabled>Create card link</button></div>
 <div id="known-share-panel" hidden><label>Festive card link<input id="known-share-link" readonly></label><div class="known-actions"><button id="known-copy-card" type="button" class="known-button">Copy card link</button><button id="known-native-share" type="button" class="known-button known-outline">Share card</button></div><small>Send this link directly to the creator by text or email. No payment confirmation is attached.</small></div>`;
 $('gift-checkout').parentElement.append(panel);
 let prepared=null;
 function reset(){prepared=null;$('known-payments').hidden=true;$('known-share-panel').hidden=true;$('known-gift-reported').checked=false;$('known-fee-reported').checked=false;$('known-share').disabled=true;$('known-status').textContent='';}
 function updateAmounts(){reset();const cents=Math.round(Number($('customGift').value)*100);$('known-gift-amount').textContent=money(cents);$('known-fee-amount').textContent=money(Math.round(cents*.02));}
 $('customGift').addEventListener('input',updateAmounts);$('customGift').addEventListener('change',updateAmounts);
 document.querySelectorAll('.gift-btn').forEach(button=>button.addEventListener('click',updateAmounts));
 $('known-creator').addEventListener('change',reset);$('guestMessage').addEventListener('input',reset);$('known-from').addEventListener('input',reset);
 const originalSearch=window.searchEvent;window.searchEvent=async(...args)=>{reset();return originalSearch(...args);};
 function readCard(){const event=getEvent();if(!event)throw Error('Find a published event by hashtag first.');const message=$('guestMessage').value.trim();if(!message||message.length>1200)throw Error('Write a card message of 1–1,200 characters above.');const from=$('known-from').value.trim();if(!from)throw Error('Enter your name for the card.');return {title:event.title.slice(0,140),message,from:from.slice(0,60)};}
 $('known-preview').onclick=()=>{try{cardDialog(readCard());}catch(e){$('known-status').textContent=e.message;}};
 $('known-prepare').onclick=async()=>{
  const button=$('known-prepare');button.disabled=true;reset();
  try{if(!$('known-creator').checked)throw Error('Confirm that you personally know this creator.');const card=readCard();const event=getEvent(),amount=Math.round(Number($('customGift').value)*100);if(!Number.isFinite(amount)||amount<1000||amount>100000)throw Error('Gift must be $10 to $1,000.');
   const {data:{session}}=await db.auth.getSession();if(!session)throw Error('Sign in and confirm your email first.');
   $('known-status').textContent='Looking up the creator’s Venmo profile…';
   const response=await fetch('/api/venmo-path',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({event_id:event.id,amount_cents:amount,knows_creator:true})});const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to prepare Venmo payments.');
   if(getEvent()?.id!==event.id||Math.round(Number($('customGift').value)*100)!==amount||!$('known-creator').checked||JSON.stringify(readCard())!==JSON.stringify(card))throw Error('Your gift changed. Continue again to refresh payment details.');
   prepared={...result,eventId:event.id,card};$('known-recipient-detail').textContent=`Send ${money(result.gift_cents)} to @${result.recipient_username}. Enter this amount in Venmo.`;$('known-fee-detail').textContent=`Pay ${money(result.fee_cents)} separately to @${result.fee_username} for Unabl’s card and service fee.`;
   $('known-recipient-link').href=result.recipient_url;$('known-fee-link').href=result.fee_url;$('known-payments').hidden=false;$('known-status').textContent='Review both usernames before paying. Opening a profile does not send money.';
  }catch(e){$('known-status').textContent=e.message;}finally{button.disabled=false;}
 };
 async function copy(value){try{await navigator.clipboard.writeText(value);$('known-status').textContent='Copied.';}catch{$('known-status').textContent='Copy this text: '+value;}}
 $('known-copy-gift').onclick=()=>prepared&&copy(`Celebrating ${prepared.event_title}! #${prepared.hashtag} — gift ${money(prepared.gift_cents)}. From ${prepared.card.from}.`);
 $('known-copy-fee').onclick=()=>prepared&&copy(`Unabl card and service fee for #${prepared.hashtag}: ${money(prepared.fee_cents)} (2% of ${money(prepared.gift_cents)}). From ${prepared.card.from}.`);
 for(const id of ['known-gift-reported','known-fee-reported'])$(id).onchange=()=>{$('known-share').disabled=!prepared||!$('known-gift-reported').checked||!$('known-fee-reported').checked;$('known-share-panel').hidden=true;};
 $('known-share').onclick=()=>{if(!prepared||!$('known-gift-reported').checked||!$('known-fee-reported').checked)return;const url=new URL(location.origin+'/');url.hash='known-card='+encodeCard(prepared.card);$('known-share-link').value=url.href;$('known-share-panel').hidden=false;$('known-status').textContent='Your closed card is ready to share. Payments remain self-reported.';};
 $('known-copy-card').onclick=()=>copy($('known-share-link').value);
 $('known-native-share').hidden=!navigator.share;$('known-native-share').onclick=async()=>{try{await navigator.share({title:'A festive card for you',url:$('known-share-link').value});}catch(e){if(e.name!=='AbortError')$('known-status').textContent='Use Copy card link to share.';}};
 const creatorForm=document.createElement('form');creatorForm.className='known-panel';creatorForm.innerHTML='<h3>Your Venmo profile for friends and family</h3><p>Add the username you want shown on your published events for the “I know this creator” path.</p><label>Venmo username<input id="creator-venmo" maxlength="31" placeholder="@your-username" autocomplete="off"></label><small>This username is public contact information, not proof of identity or bank verification.</small><button class="known-button" type="submit">Save Venmo username</button><p id="creator-venmo-status" role="status"></p>';
 $('creator-verification-panel').append(creatorForm);
 creatorForm.addEventListener('focusin',()=>{if(!$('creator-venmo').value)$('creator-venmo').value=getUser()?.user_metadata?.unabl_venmo_username||'';});
 creatorForm.onsubmit=async e=>{e.preventDefault();const button=creatorForm.querySelector('button');button.disabled=true;try{if(!getUser())throw Error('Sign in as the event creator first.');const value=$('creator-venmo').value.trim().replace(/^@/,'');if(value&&!username(value))throw Error('Use 5–30 letters, numbers, hyphens, or underscores.');const {error}=await db.auth.updateUser({data:{unabl_venmo_username:value}});if(error)throw error;$('creator-venmo-status').textContent=value?'Venmo username saved. Friends can see it on your published events.':'Venmo username removed.';reset();}catch(e){$('creator-venmo-status').textContent=e.message;}finally{button.disabled=false;}};
 updateAmounts();
}
