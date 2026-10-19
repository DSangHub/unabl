// Host controls live beside each saved event. Never render guest data as HTML.
export function mountGuestList(container,event,request){
 const panel=document.createElement('details'),summary=document.createElement('summary');
 summary.textContent='Manage invited guests';summary.style.cursor='pointer';panel.append(summary);
 panel.style.cssText='margin:12px 0;padding:12px;border:1px solid #e2e8f0;border-radius:10px';
 const help=document.createElement('p');help.textContent='Only guests on this private list can open gift options. Add the email they will use to sign in and confirm. Invitations are not emailed automatically.';
 help.className='text-sm text-slate-600';panel.append(help);
 const form=document.createElement('form'),label=document.createElement('label'),email=document.createElement('input'),add=document.createElement('button');
 label.textContent='Guest email ';email.type='email';email.required=true;email.maxLength=254;email.autocomplete='off';email.style.cssText='width:100%;padding:10px;border:1px solid #94a3b8;border-radius:6px';
 label.append(email);add.textContent='Add invited guest';add.type='submit';add.className='btn-primary mt-2';
 form.append(label,add);panel.append(form);
 const status=document.createElement('p'),list=document.createElement('ul');status.setAttribute('role','status');panel.append(status,list);container.append(panel);
 let loaded=false,busy=false;
 const walletForm=document.createElement('form');
 walletForm.innerHTML='<h4 class="font-bold mt-4">Direct gifts · $1.75 Unabl click fee</h4><p class="text-sm">Optional: share your wallet contact. Guests pay a separate $1.75 fee to @UnablPay through Venmo before returning to the gift portal. Unabl cannot automatically verify that fee. No bank or card numbers. Guests complete the transfer in their own app; provider fees and limits may apply.</p><label class="block mt-2">Host Venmo username<input data-venmo maxlength="31" placeholder="@YourVenmoName" style="display:block;width:100%;padding:8px;border:1px solid #94a3b8;border-radius:6px"></label><label class="block mt-2">Host Cash App $Cashtag<input data-cash maxlength="21" placeholder="$YourCashtag" style="display:block;width:100%;padding:8px;border:1px solid #94a3b8;border-radius:6px"></label><label class="block my-2"><input data-share type="checkbox" required> Share these contacts with confirmed invited guests who enter my gift code.</label><button type="submit" class="btn-primary">Save direct-gift contacts</button>';
 panel.append(walletForm);
 walletForm.onsubmit=async e=>{e.preventDefault();const button=walletForm.querySelector('button');button.disabled=true;try{await request('/api/event-guests',{event_id:event.id,action:'save_contacts',cash_app:walletForm.querySelector('[data-cash]').value,venmo:walletForm.querySelector('[data-venmo]').value,share_with_guests:walletForm.querySelector('[data-share]').checked});status.textContent='Direct-gift contacts saved. Leave a field empty to disable that option.';}catch(e){status.textContent=e.message;}finally{button.disabled=false;}};
 const generate=document.createElement('button'),code=document.createElement('input'),codeHelp=document.createElement('p');
 generate.type='button';generate.textContent='Generate / replace gift access code';generate.className='btn-primary mt-3';code.readOnly=true;code.hidden=true;code.setAttribute('aria-label','New gift access code');code.style.cssText='width:100%;padding:10px;font-family:monospace';
 codeHelp.textContent='Generate a code and share it privately with invited guests. A replacement blocks the old code on new gift access requests. Previously revealed wallet details cannot be recalled. The code is shown only when generated.';
 codeHelp.className='text-sm';panel.append(generate,code,codeHelp);
 generate.addEventListener('click',async()=>{if(busy)return;if(!confirm('Generate a new code? Any previous code will stop working for new gift access requests.'))return;busy=true;generate.disabled=true;try{const result=await request('/api/event-guests',{event_id:event.id,action:'generate_code'});code.value=result.code;code.hidden=false;code.select();status.textContent='New code generated. Copy it and share it privately with your invited guests.';}catch(e){status.textContent=e.message;}finally{busy=false;generate.disabled=false;}});
 async function load(){
  const data=await request('/api/event-guests?event_id='+encodeURIComponent(event.id),null,'GET');
  walletForm.querySelector('[data-cash]').value=data.contacts?.cash_app||'';
  walletForm.querySelector('[data-venmo]').value=data.contacts?.venmo||'';
  list.replaceChildren();
  for(const guest of data.guests){
   const row=document.createElement('li'),name=document.createElement('span'),remove=document.createElement('button');
   row.style.cssText='display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:10px';
   name.textContent=guest.email;name.style.overflowWrap='anywhere';remove.textContent='Remove';remove.type='button';remove.className='text-orange-700 underline';remove.setAttribute('aria-label','Remove '+guest.email);
   remove.addEventListener('click',async()=>{if(busy)return;busy=true;remove.disabled=true;try{await request('/api/event-guests',{event_id:event.id,action:'remove',guest_id:guest.id});await load();status.textContent='Guest removed. New gift access requests are blocked. Previously revealed wallet details cannot be recalled.';}catch(e){status.textContent=e.message;}finally{busy=false;remove.disabled=false;}});
   row.append(name,remove);list.append(row);
  }
  if(!data.guests.length)list.textContent='No invited guests yet. Gift checkout is blocked until you add guests.';
  loaded=true;
 }
 panel.addEventListener('toggle',async()=>{if(panel.open&&!loaded)try{await load();}catch(e){status.textContent=e.message;}});
 form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;add.disabled=true;try{await request('/api/event-guests',{event_id:event.id,action:'add',email:email.value});email.value='';await load();status.textContent='Guest saved. Share your event invitation link with them.';}catch(e){status.textContent=e.message;}finally{busy=false;add.disabled=false;}});
}
