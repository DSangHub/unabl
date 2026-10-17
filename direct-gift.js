export function initDirectGift({request,getEvent}){
 const panel=document.createElement('section');panel.className='mt-5 p-5 rounded-xl border border-slate-300';
 panel.innerHTML=`<h3 class="font-bold text-xl">Send directly to your host</h3><p class="my-2"><strong>$0 Unabl fee.</strong> No money passes through Unabl or Stripe. Provider fees and limits may apply.</p>
 <p class="text-sm">Use Apple Cash in Messages/Wallet or Samsung Wallet’s Online transfer. Google Pay does not offer US person-to-person sending. Samsung can transfer to eligible Apple/Google wallets in person; remote Samsung transfers require both people to use Samsung Wallet.</p>
 <p class="text-sm my-2">Sign in with your invited email and enter the host’s gift access code above to see their payment contact. Confirm the recipient independently before sending.</p>
 <button data-reveal type="button" class="btn-primary">Show host’s direct-gift options</button><p data-status role="status" class="my-2"></p><div data-options></div>
 <p class="text-sm mt-3">Direct gifts are outside Unabl’s five-day hold and are not verified paid vouches. Unabl cannot confirm, cancel, release, or refund these transfers. Keep your wallet receipt. Send your card separately using the card editor.</p>`;
 document.getElementById('known-gift').after(panel);
 let contextVersion=0;
 const status=panel.querySelector('[data-status]'),options=panel.querySelector('[data-options]'),button=panel.querySelector('[data-reveal]');
 button.onclick=async()=>{button.disabled=true;options.replaceChildren();try{
  const version=contextVersion;const event=getEvent();if(!event)throw Error('Find a published event first.');
  const data=await request('/api/direct-gift',{event_id:event.id,access_code:document.getElementById('gift-access-code').value});
  if(contextVersion!==version||getEvent()?.id!==event.id)return;
  for(const [key,label,url] of [['apple_cash','Apple Cash','https://support.apple.com/en-us/105013'],['samsung_wallet','Samsung Wallet','https://www.samsung.com/us/support/answer/ANS10005050/']]){
   const contact=data.contacts[key];if(!contact)continue;
   const row=document.createElement('div'),heading=document.createElement('h4'),recipient=document.createElement('p'),copy=document.createElement('button'),help=document.createElement('a');
   heading.textContent=label;heading.className='font-bold mt-3';recipient.textContent='Host-provided contact: '+contact;recipient.style.overflowWrap='anywhere';
   copy.textContent='Copy recipient';copy.type='button';copy.className='underline mr-4';copy.onclick=async()=>{try{await navigator.clipboard.writeText(contact);status.textContent='Contact copied. Confirm it with the host before transferring in your wallet app.';}catch{status.textContent='Select and copy the host-provided contact above.';}};
   help.textContent='How to send in '+label;help.href=url;help.target='_blank';help.rel='noopener noreferrer';help.className='underline';row.append(heading,recipient,copy,help);options.append(row);
  }
  status.textContent=options.childElementCount?'Complete your transfer in the wallet app. Unabl fee: $0. No transfer has been made here.':'The host has not enabled direct gifts yet. Ask them to save their wallet contact under My account → Manage invited guests.';
 }catch(e){status.textContent=e.message;}finally{button.disabled=false;}};
 // Contacts must not remain visible when the account or selected event changes.
 window.addEventListener('unabl-account-change',()=>{contextVersion++;options.replaceChildren();status.textContent='';});
 window.addEventListener('unabl-event-change',()=>{contextVersion++;options.replaceChildren();status.textContent='';});
}
