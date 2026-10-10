import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';
import {initKnownGift} from './known-gift.js';
let recovering=new URLSearchParams(location.hash.slice(1)).get('type')==='recovery';
const db = createClient('https://jbcxodpudujoscdafovx.supabase.co', "sb_publishable_ZZvmnAgd81ui0_PkzopkaQ_-hGz88v_");
const $ = id => document.getElementById(id);
let user=null,selectedEvent=null,attendance='attending';
async function refreshTrust(){
 if(!selectedEvent)return;
 const {data,error}=await db.rpc('get_creator_trust',{target:selectedEvent.creator_id});
 $('creator-badge').textContent=error?'Verification unavailable':data?.verified?'★ Verified creator':'Creator not verified';
 $('creator-badge').className='inline-block mt-2 text-sm font-semibold '+(data?.verified?'text-amber-700':'text-slate-500');
 $('creator-trust-detail').textContent=error?'Please try again later.':`${data?.vouches||0} of 3 gift givers have vouched. Identity review is also required. A star is not a guarantee against fraud.`;
}
async function refreshCreatorPanel(){
 $('creator-verification-panel').hidden=true;if(!user)return;
 const {data:creator}=await db.from('event_creators').select('user_id').eq('user_id',user.id).maybeSingle();if(!creator)return;
 $('creator-verification-panel').hidden=false;
 const [{data:trust},{data:request}]=await Promise.all([db.rpc('get_creator_trust',{target:user.id}),db.from('creator_verification_requests').select('requested_at').eq('creator_id',user.id).maybeSingle()]);
 $('verification-progress').textContent=trust?.verified?'★ Verified creator':`${trust?.vouches||0}/3 paid gift givers have vouched. ${request?'Verification requested — review pending.':'Request your identity review.'}`;
 $('request-verification').disabled=!!request;$('request-verification').textContent=request?'Review requested':'Request verification';
}
const status = text => { $('account-status').textContent=text; };
async function profile(){
 const display=user.user_metadata?.display_name||user.email.split('@')[0];
 const {error}=await db.from('profiles').upsert({id:user.id,display_name:display}); if(error)throw error;
 if(user.user_metadata?.account_kind==='creator') {const {error}=await db.from('event_creators').upsert({user_id:user.id,organizer_name:display});if(error)throw error;}
}
async function myEvents(){
 $('my-events').replaceChildren();if(!user)return;
 const {data,error}=await db.from('events').select('id,title,hashtag,starts_at').eq('creator_id',user.id).order('created_at',{ascending:false});if(error)throw error;
 if(data.length){const heading=document.createElement('h3');heading.textContent='Your saved events';heading.className='font-bold';$('my-events').append(heading);}
 for(const event of data){const row=document.createElement('p');row.textContent=event.title+' — #'+event.hashtag+' — '+new Date(event.starts_at).toLocaleString();$('my-events').append(row);}
}
async function sync(session){user=session?.user||null;$('account-form').hidden=!!user&&!recovering;$('account-modes').hidden=!!user||recovering;$('header-signin').textContent=user?'My account':'Sign in';$('header-signup').hidden=!!user;$('account-signed-in').hidden=!user;if(user){$('account-user').textContent='Signed in as '+user.email;try{await profile();await myEvents();await refreshCreatorPanel();status('Your account is connected.');}catch(e){status(e.message);}}else{$('creator-verification-panel').hidden=true;$('my-events').replaceChildren();status('Sign in to save your profile, RSVP, or event.');}}
const passwordInput=$('account-password');
const passwordWrap=document.createElement('div');passwordWrap.style.position='relative';
passwordInput.replaceWith(passwordWrap);passwordWrap.append(passwordInput);passwordInput.style.paddingRight='3rem';
const eye=document.createElement('button');eye.type='button';eye.setAttribute('aria-label','Show password');eye.setAttribute('aria-pressed','false');eye.title='Show password';
eye.style.cssText='position:absolute;right:10px;top:50%;transform:translateY(-50%);padding:6px;color:#475569';
eye.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
eye.addEventListener('click',()=>{const visible=passwordInput.type==='password';passwordInput.type=visible?'text':'password';eye.setAttribute('aria-pressed',String(visible));eye.setAttribute('aria-label',visible?'Hide password':'Show password');eye.title=visible?'Hide password':'Show password';});passwordWrap.append(eye);
const forgot=document.createElement('button');forgot.type='button';forgot.textContent='Forgot password?';forgot.className='text-sm text-orange-700 underline mt-3';$('account-submit').after(forgot);
forgot.addEventListener('click',()=>setAccountMode('reset'));
let accountMode='signin';
function setAccountMode(mode){
 accountMode=mode;const signup=mode==='signup',reset=mode==='reset',update=mode==='update';
 $('account-email').closest('label').hidden=update;$('account-email').required=!update;
 passwordWrap.parentElement.hidden=reset;passwordInput.required=!reset;forgot.hidden=mode!=='signin';
 passwordInput.type='password';eye.setAttribute('aria-pressed','false');eye.setAttribute('aria-label','Show password');
 if(reset||update){
 $('account-form').hidden=false;$('account-modes').hidden=update;$('account-signed-in').hidden=true;
 $('account-title').textContent=update?'Choose a new password':'Reset your password';
 $('account-description').textContent=update?'Enter a new password with at least 8 characters.':'Enter your email and we will send a password reset link.';
 $('account-name-field').hidden=true;$('account-kind-field').hidden=true;$('account-name').required=false;
 $('account-password-help').hidden=reset;passwordInput.minLength=8;passwordInput.autocomplete='new-password';
 $('account-submit').textContent=update?'Save new password':'Send reset email';status('');return;
 }
 $('account-title').textContent=signup?'Sign up for Unabl':'Sign in to Unabl';
 $('account-description').textContent=signup?'Create your account to send cards, RSVP, or host events.':'Welcome back. Sign in to save your RSVP, cards, and events.';
 $('account-name-field').hidden=!signup;$('account-kind-field').hidden=!signup;$('account-password-help').hidden=!signup;
 $('account-name').required=signup;$('account-password').minLength=signup?8:1;
 $('account-password').autocomplete=signup?'new-password':'current-password';
 $('account-submit').textContent=signup?'Create account':'Sign in';
 $('account-mode-signin').setAttribute('aria-pressed',String(!signup));$('account-signup').setAttribute('aria-pressed',String(signup));
 status(signup?'Choose User / guest or Event creator.':'Enter your email and password.');
}
$('account-mode-signin').addEventListener('click',()=>setAccountMode('signin'));
$('account-signup').addEventListener('click',()=>setAccountMode('signup'));
$('header-signin').addEventListener('click',()=>setAccountMode('signin'));
$('header-signup').addEventListener('click',()=>setAccountMode('signup'));
$('account-form').addEventListener('submit',async e=>{
 e.preventDefault();const button=$('account-submit');button.disabled=true;
 const signup=accountMode==='signup';status(signup?'Creating account…':'Signing in…');
 try{
 if(accountMode==='reset'){
 const {error}=await db.auth.resetPasswordForEmail($('account-email').value.trim(),{redirectTo:'https://www.unabl.app/'});if(error)throw error;
 status('If an account exists for this email, you will receive a password reset link. Check your inbox and spam folder.');return;
 }
 if(accountMode==='update'){
 const {error}=await db.auth.updateUser({password:passwordInput.value});if(error)throw error;
 passwordInput.value='';recovering=false;setAccountMode('signin');const {data}=await db.auth.getSession();await sync(data.session);status('Your password has been updated.');return;
 }
 const credentials={email:$('account-email').value.trim(),password:$('account-password').value};
 const {data,error}=signup?await db.auth.signUp({...credentials,options:{emailRedirectTo:'https://www.unabl.app/',data:{display_name:$('account-name').value.trim(),account_kind:$('account-kind').value}}}):await db.auth.signInWithPassword(credentials);
 if(error)throw error;$('account-password').value='';
 if(data.session)await sync(data.session);else status('Check your email to confirm your account, then sign in here.');
 }catch(error){status(error.message||'Unable to connect. Please try again.');}finally{button.disabled=false;}
});
$('account-signout').addEventListener('click',async()=>{const {error}=await db.auth.signOut();if(error)status(error.message);else await sync(null);});
const oldRSVP=window.setRSVP;window.setRSVP=type=>{attendance=type;oldRSVP(type);};
window.saveEvent=async()=>{
 const output=$('event-publish-status'),button=$('event-save');$('event-invitation').hidden=true;
 if(!user){output.textContent='Sign in to your confirmed Event creator account before publishing.';setAccountMode('signin');$('account-email').scrollIntoView({behavior:'smooth',block:'center'});$('account-email').focus();return;}
 const title=$('event-title-input').value.trim(),hashtag=$('newHashtagInput').value.trim().replace(/^#/,'').toLowerCase(),venue=$('event-venue').value.trim(),start=$('event-starts').value;
 if(!title||!venue||!start||!(/^[a-z0-9_]{3,60}$/).test(hashtag)){output.textContent='Enter a title, venue, date/time, and a hashtag with 3–60 letters, numbers, or underscores.';return;}
 button.disabled=true;output.textContent='Publishing your event…';
 try{
 await profile();
 const {data:creator,error:ce}=await db.from('event_creators').select('user_id').eq('user_id',user.id).maybeSingle();if(ce)throw ce;if(!creator)throw Error('This is a guest account. An Event creator account is required to publish.');
 const {error}=await db.from('events').insert({creator_id:user.id,title,category:$('eventCatInput').value,hashtag,starts_at:new Date(start).toISOString(),venue,published:true});if(error)throw error;
 output.textContent='Event published. Share your invitation link with friends and family.';
 const link=new URL(location.origin+'/');link.searchParams.set('event',hashtag);$('event-invitation-link').value=link.href;$('event-invitation-preview').href=link.href;$('event-invitation').hidden=false;
 await myEvents();await refreshCreatorPanel();
 }catch(e){output.textContent=e.code==='23505'?'That hashtag is already in use. Choose another.':e.message;}finally{button.disabled=false;}
};
$('event-invitation-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('event-invitation-link').value);$('event-publish-status').textContent='Invitation link copied. Paste it into your email or text message.';}catch{$('event-invitation-link').focus();$('event-invitation-link').select();$('event-publish-status').textContent='Select and copy your invitation link.';}});
window.searchEvent=async()=>{const tag=$('searchHashtag').value.trim().replace(/^#/,'').toLowerCase();if(!tag)return;const {data,error}=await db.from('events').select('id,creator_id,title,hashtag,category,starts_at,venue').eq('hashtag',tag).eq('published',true).maybeSingle();if(error){$('event-status').textContent=error.message;return;}if(!data){selectedEvent=null;$('creator-badge').textContent='No event selected';$('creator-trust-detail').textContent='Find a published event first.';$('event-status').textContent='No published event found with that hashtag.';return;}selectedEvent=data;$('eventDate').textContent=new Date(data.starts_at).toLocaleString();$('eventLocation').textContent=data.venue;$('hostName').textContent='Event creator';$('eventHostNote').textContent='';$('eventTitle').textContent=data.title;$('displayHashtag').textContent='#'+data.hashtag;$('eventCategory').textContent=data.category;$('event-status').textContent=new Date(data.starts_at).toLocaleString()+' · '+data.venue;await refreshTrust();};
$('rsvp-save').addEventListener('click',async()=>{if(!user){$('event-status').textContent='Sign in to save your RSVP.';return;}if(!selectedEvent){$('event-status').textContent='Find a published event by hashtag first.';return;}const {error}=await db.from('event_responses').upsert({event_id:selectedEvent.id,user_id:user.id,attendance,message:$('guestMessage').value.trim()},{onConflict:'event_id,user_id'});$('event-status').textContent=error?error.message:'Your RSVP and message were saved. No payment has been collected.';});
db.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY')recovering=true;setTimeout(async()=>{await sync(session);if(recovering){setAccountMode('update');$('account').scrollIntoView({block:'start'});passwordInput.focus();}},0);});
const {data,error}=await db.auth.getSession();if(error)status(error.message);else await sync(data.session);if(recovering)setAccountMode('update');

$('request-verification').addEventListener('click',async()=>{
 if(!user){status('Sign in as an event creator first.');return;}
 $('request-verification').disabled=true;
 try{const {error}=await db.from('creator_verification_requests').insert({creator_id:user.id});if(error&&error.code!=='23505')throw error;await refreshCreatorPanel();status('Verification review requested. Complete Stripe onboarding too. Identity approval requires review.');}catch(e){status(e.message);$('request-verification').disabled=false;}
});
const trustStatus=text=>{$('trust-action-status').textContent=text;};
$('vouch-creator').addEventListener('click',async()=>{
 if(!user||!selectedEvent){trustStatus('Sign in and find a published event first.');return;}
 if(user.id===selectedEvent.creator_id){trustStatus('You cannot vouch for your own event.');return;}
 const button=$('vouch-creator');button.disabled=true;
 try{const {data:gifts,error}=await db.from('gift_payments').select('id').eq('donor_id',user.id).eq('creator_id',selectedEvent.creator_id).in('state',['held','released']).order('paid_at',{ascending:false}).limit(1);if(error)throw error;if(!gifts.length){trustStatus('You must have a successful gift payment to this creator before vouching.');return;}
 const {error:ve}=await db.from('creator_vouches').insert({creator_id:selectedEvent.creator_id,donor_id:user.id,gift_id:gifts[0].id});if(ve&&ve.code!=='23505')throw ve;trustStatus(ve?'You already vouched for this creator.':'Your vouch was saved.');await refreshTrust();}catch(e){trustStatus(e.message);}finally{button.disabled=false;}
});
$('withdraw-vouch').addEventListener('click',async()=>{if(!user||!selectedEvent){trustStatus('Sign in and find a published event first.');return;}const {error}=await db.from('creator_vouches').delete().eq('creator_id',selectedEvent.creator_id).eq('donor_id',user.id);trustStatus(error?error.message:'Your vouch has been withdrawn.');if(!error)await refreshTrust();});
$('fraud-report-form').addEventListener('submit',async e=>{e.preventDefault();if(!user||!selectedEvent){trustStatus('Sign in and find a published event before reporting it.');return;}const {error}=await db.from('event_fraud_reports').insert({event_id:selectedEvent.id,reporter_id:user.id,reason:$('fraud-reason').value.trim()});trustStatus(error?error.message:'Report saved for review. Unresolved reports block gift release.');if(!error){$('fraud-reason').value='';await refreshTrust();}});

$('promotion-form').addEventListener('submit',async e=>{
 e.preventDefault();const message=$('promotion-status');
 if(!user){message.textContent='Sign up or sign in to save your promotion draft.';return;}
 const button=e.currentTarget.querySelector('button[type="submit"]');button.disabled=true;
 try{const {error}=await db.from('event_promotion_drafts').insert({user_id:user.id,display_name:$('promo-name').value.trim(),event_type:$('promo-type').value,event_date:$('promo-date').value,chosen_location:$('promo-location').value.trim()});if(error)throw error;message.textContent='Draft saved. Price: $29.95 for seven days. No payment collected; your promotion is not published yet.';}catch(error){message.textContent=error.message||'Unable to save. Please try again.';}finally{button.disabled=false;}
});

async function paymentRequest(path,body,method='POST'){
 const {data:{session}}=await db.auth.getSession();if(!session)throw Error('Sign in and confirm your email first.');
 const response=await fetch(path,{method,headers:{'Authorization':'Bearer '+session.access_token,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to connect.');return data;
}
let giftRequest=null;
$('gift-checkout').addEventListener('click',async()=>{
 const button=$('gift-checkout');button.disabled=true;
 try{if(!selectedEvent)throw Error('Find a published event by hashtag first. Sample celebrations cannot receive payments.');
 const cents=Math.round(Number($('customGift').value)*100);const fingerprint=selectedEvent.id+':'+cents+':'+$('guestMessage').value;
 if(!giftRequest||giftRequest.fingerprint!==fingerprint)giftRequest={fingerprint,id:crypto.randomUUID()};
 const data=await paymentRequest('/api/checkout',{event_id:selectedEvent.id,amount_cents:cents,message:$('guestMessage').value,request_id:giftRequest.id});
 window.location.assign(data.url);
 }catch(e){$('event-status').textContent=e.message;}finally{button.disabled=false;}
});
let onboardingPending=false;
async function onboarding(action,output=$('stripe-onboarding-status'),button=$('stripe-onboarding')){
 if(onboardingPending)return;onboardingPending=true;button.disabled=true;
 try{
 if(!user){output.textContent='Sign up or sign in as an Event creator to connect your bank with Stripe.';setAccountMode('signup');$('account-kind').value='creator';$('account-email').scrollIntoView({behavior:'smooth',block:'center'});$('account-email').focus();return;}
 output.textContent='Connecting to Stripe…';const data=await paymentRequest('/api/onboarding',{action});
 if(data.url)window.location.assign(data.url);else{output.textContent=data.message;await refreshCreatorPanel();}
 }catch(e){output.textContent=e.message;}finally{onboardingPending=false;button.disabled=false;}
}
$('event-stripe-onboarding').addEventListener('click',()=>onboarding('start',$('event-stripe-status'),$('event-stripe-onboarding')));
$('stripe-onboarding').addEventListener('click',()=>onboarding('start'));
$('stripe-status').addEventListener('click',()=>onboarding('status'));
const returnParams=new URLSearchParams(location.search);
if(returnParams.get('payment')==='cancelled')status('Checkout cancelled. No gift confirmation has been received.');
if(returnParams.get('payment')==='return'){
 if(user){try{const data=await paymentRequest('/api/payment-status?session_id='+encodeURIComponent(returnParams.get('session_id')) ,null,'GET');status(data.status==='paid'?'Gift payment confirmed. The five-day minimum hold has started.':data.status==='failed'?'Payment failed.':'Payment confirmation is pending. Check your account again shortly.');}catch(e){status(e.message);}}
 else status('Sign in to check the payment confirmation.');
}
if(returnParams.get('onboarding')==='return'&&user){await onboarding('status');$('account').scrollIntoView({block:'start'});}
if(returnParams.get('onboarding')==='refresh'&&user)await onboarding('start');

const invitationTag=new URLSearchParams(location.search).get('event');
if(invitationTag){window.stopCelebrationSamples?.();window.switchTab('guest');$('searchHashtag').value=invitationTag;await window.searchEvent();}

// Open the guest response and monetary gift view on every screen size.
const giftResponse=$('rsvp-attending').closest('.md\\:col-span-7');
giftResponse.id='gift-response';
giftResponse.style.scrollMarginTop='90px';
const openingStyle=document.createElement('style');
openingStyle.textContent='@media(max-width:767px){#eventCard > :first-child{order:2}#gift-response{order:1}}';
document.head.append(openingStyle);
if(!recovering&&(!location.hash||location.hash==='#gift-response')){
 window.switchTab('guest');
 requestAnimationFrame(()=>giftResponse.scrollIntoView({block:'start',behavior:'instant'}));
}

const customGift=$('customGift');
customGift.step='0.01';
customGift.setAttribute('aria-label','Other monetary gift amount in dollars');
customGift.placeholder='Enter amount, e.g. 10, 15, or 20';
const giftOptions=document.querySelector('.gift-btn').parentElement;
giftOptions.classList.replace('grid-cols-4','grid-cols-5');
const otherGift=document.createElement('button');
otherGift.type='button';otherGift.textContent='Other';otherGift.className=document.querySelector('.gift-btn').className;
otherGift.setAttribute('aria-controls','customGift');
otherGift.addEventListener('click',()=>{customGift.focus();customGift.select();});
giftOptions.append(otherGift);
initKnownGift({db,getUser:()=>user,getEvent:()=>selectedEvent});
