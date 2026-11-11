import {cashProfile} from './wallet-utils.js';
export function initDirectGift({request,getEvent,getFund=()=>null}){
 const panel=document.createElement('section');panel.id='direct-gift-portal';panel.className='known-panel';
 panel.innerHTML=`<h3 class="font-bold text-xl">Send directly to your host</h3>
 <p><strong>$1.75 Unabl click fee per gift handoff — no percentage fee.</strong> Pay the fee separately to <strong>@UnablPay through Venmo</strong>, then return here to send the host’s gift. The gift goes directly to the host in your chosen wallet. Provider fees and limits may apply.</p>
 <p class="text-sm">Choose Venmo or Cash App. Stripe onboarding is no longer needed. Unabl does not control the funding source in these apps, so bank-only or no-credit-card restrictions cannot be enforced here.</p>
 <p class="text-sm">Sign in with your invited email and enter the host’s gift access code above. Confirm all recipient details independently before paying.</p>
 <p class="text-sm">The $1.75 fee and host gift are separate manual payments. Opening a Venmo profile does not prefill or submit a payment. Unabl cannot automatically confirm either payment. Unabl does not hold direct gifts or count them as verified paid vouches. Unabl cannot cancel or refund the host’s transfer. Send your card separately using the card editor.</p>`;
 const button=document.getElementById('gift-checkout'),code=document.getElementById('gift-access-code');
 const feedback=document.createElement('section');feedback.className='known-panel';feedback.hidden=true;feedback.style.scrollMarginBlock='9rem 1rem';
 feedback.innerHTML='<p data-status role="status" aria-live="polite"></p><div data-options></div>';
 button.after(feedback,panel);
 let contextVersion=0;
 const status=feedback.querySelector('[data-status]'),options=feedback.querySelector('[data-options]');
 const link=(label,url)=>{const a=document.createElement('a');a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.className='known-button';return a;};
 const clear=()=>{contextVersion++;options.replaceChildren();status.textContent='';feedback.hidden=true;code.removeAttribute('aria-invalid');};
 function showHost(key,label,contact){
  options.replaceChildren();const heading=document.createElement('h4'),recipient=document.createElement('p'),copy=document.createElement('button'),notice=document.createElement('p');
  heading.textContent=label+' gift portal';heading.className='font-bold';recipient.textContent='Host-provided recipient: '+(key==='venmo'?'@':'$')+contact;recipient.style.overflowWrap='anywhere';
  copy.textContent='Copy host recipient';copy.type='button';copy.className='known-button known-outline';copy.onclick=async()=>{try{await navigator.clipboard.writeText(contact);status.textContent='Recipient copied. Confirm it with your host before sending.';}catch{status.textContent='Select and copy the host recipient above.';}};
  notice.textContent='Fee status: unverified. Your return does not confirm payment. Send only the gift amount to the host; the $1.75 Unabl fee is separate. No 2% Unabl fee applies to this direct gift.';
  const url=key==='venmo'?'https://venmo.com/'+encodeURIComponent(contact):cashProfile(contact);
  options.append(heading,notice,recipient);
  const fund=getFund();
  if(fund){
   const note=document.createElement('p'),name=document.createElement('strong');
   name.textContent=fund;name.setAttribute('translate','no');
   const prompt=document.createElement('span');prompt.textContent='Include this fund in your gift payment note:';
   note.append(prompt,document.createTextNode(' '),name);options.append(note);
  }
  options.append(copy,document.createTextNode(' '),link('Open host’s '+label+' profile',url));
  status.textContent='You’re back in the Gift Portal. Complete the host’s gift in your wallet app and keep both receipts.';
 }
 function showFee(key,label,contact,data){
  options.replaceChildren();const heading=document.createElement('h4'),instructions=document.createElement('p'),back=document.createElement('button'),fee=link('Open @UnablPay — pay $1.75 fee',data.fee_url),reminder=document.createElement('p');
  heading.textContent='1. Pay Unabl’s $1.75 click fee';heading.className='font-bold';instructions.textContent='In Venmo, verify @UnablPay, enter $1.75, and add “Unabl click fee”. After completing the fee payment, switch back to this browser tab. Your host’s gift will be sent separately through '+label+'.';
  reminder.textContent='Venmo cannot automatically return or confirm this payment here. The return button is a manual navigation step, not proof of payment.';
  back.textContent='2. Return to Gift Portal';back.type='button';back.className='known-button known-outline';back.hidden=true;
  fee.onclick=()=>{back.hidden=false;status.textContent='After paying the $1.75 fee in Venmo, return to this tab and select Return to Gift Portal. No payment is verified here.';};
  back.onclick=()=>showHost(key,label,contact);
  options.append(heading,instructions,fee,reminder,back);status.textContent='Chosen gift method: '+label+'. Unabl click fee: $1.75.';
 }
 button.onclick=async()=>{if(button.disabled)return;const version=++contextVersion;button.disabled=true;button.setAttribute('aria-busy','true');feedback.hidden=false;code.removeAttribute('aria-invalid');options.replaceChildren();status.textContent='Checking gift access…';feedback.scrollIntoView({block:'nearest'});try{
  if((window.unablCurrency||'USD')!=='USD')throw Error('Select USD for direct gifts. Currency previews are not conversions.');const amount=Number(document.getElementById('customGift').value);if(!Number.isFinite(amount)||amount<10||amount>1000)throw Error('Enter a gift amount from $10 to $1,000.');
  const event=getEvent();if(!event)throw Error('Find a published event first.');
  const accessCode=code.value.trim();
  if(!/^([a-f0-9]{4}-){5}[a-f0-9]{4}$|^[a-f0-9]{24}$/i.test(accessCode)){
   code.setAttribute('aria-invalid','true');
   throw Error('Enter the full gift access code: six groups of four characters. Ask your host to resend it if it is incomplete.');
  }
  const data=await request('/api/direct-gift',{event_id:event.id,access_code:accessCode});
  if(contextVersion!==version||getEvent()?.id!==event.id)return;
  if(data.unabl_fee_cents!==175||data.fee_username!=='UnablPay'||data.fee_url!=='https://venmo.com/UnablPay')throw Error('Fee setup changed. Refresh and try again.');
  for(const [key,label] of [['venmo','Venmo'],['cash_app','Cash App']]){
   const contact=data.contacts[key];if(!contact)continue;const choice=document.createElement('button');choice.type='button';choice.className='known-button mr-2';choice.textContent=label+' · $1.75 Unabl fee';choice.onclick=()=>showFee(key,label,contact,data);options.append(choice);
  }
  status.textContent=options.childElementCount?'Choose your gift method. The $1.75 fee goes to @UnablPay; the gift goes separately to your host.':'The host has not enabled direct gifts yet. Ask them to save a wallet contact under My account → Manage invited guests.';
 }catch(e){if(contextVersion===version){status.textContent=e.message;feedback.scrollIntoView({block:'nearest'});}}finally{button.disabled=false;button.removeAttribute('aria-busy');}};
 code.addEventListener('input',clear);
 window.addEventListener('unabl-gift-fund-change',clear);
 window.addEventListener('unabl-account-change',clear);window.addEventListener('unabl-event-change',clear);
}
