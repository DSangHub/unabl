import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';
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
async function sync(session){user=session?.user||null;$('account-form').hidden=!!user;$('account-modes').hidden=!!user;$('header-signin').textContent=user?'My account':'Sign in';$('header-signup').hidden=!!user;$('account-signed-in').hidden=!user;if(user){$('account-user').textContent='Signed in as '+user.email;try{await profile();await myEvents();await refreshCreatorPanel();status('Your account is connected.');}catch(e){status(e.message);}}else{$('creator-verification-panel').hidden=true;$('my-events').replaceChildren();status('Sign in to save your profile, RSVP, or event.');}}
let accountMode='signin';
function setAccountMode(mode){
 accountMode=mode;const signup=mode==='signup';
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
 const credentials={email:$('account-email').value.trim(),password:$('account-password').value};
 const {data,error}=signup?await db.auth.signUp({...credentials,options:{emailRedirectTo:'https://www.unabl.app/',data:{display_name:$('account-name').value.trim(),account_kind:$('account-kind').value}}}):await db.auth.signInWithPassword(credentials);
 if(error)throw error;$('account-password').value='';
 if(data.session)await sync(data.session);else status('Check your email to confirm your account, then sign in here.');
 }catch(error){status(error.message||'Unable to connect. Please try again.');}finally{button.disabled=false;}
});
$('account-signout').addEventListener('click',async()=>{const {error}=await db.auth.signOut();if(error)status(error.message);else await sync(null);});
const oldRSVP=window.setRSVP;window.setRSVP=type=>{attendance=type;oldRSVP(type);};
window.saveEvent=async()=>{if(!user){status('Sign in or create an event creator account first.');$('account-email').focus();return;}const title=$('event-title-input').value.trim(),hashtag=$('newHashtagInput').value.trim().replace(/^#/,'').toLowerCase(),venue=$('event-venue').value.trim(),start=$('event-starts').value;if(!title||!venue||!start||!(/^[a-z0-9_]{3,60}$/).test(hashtag)){status('Enter an event title, venue, date/time, and a hashtag with 3–60 letters, numbers, or underscores.');return;}const button=$('event-save');button.disabled=true;try{const {data:creator,error:ce}=await db.from('event_creators').select('user_id').eq('user_id',user.id).maybeSingle();if(ce)throw ce;if(!creator)throw Error('This account is a guest account. Create an event creator account to publish events.');const {error}=await db.from('events').insert({creator_id:user.id,title,category:$('eventCatInput').value,hashtag,starts_at:new Date(start).toISOString(),venue,published:true});if(error)throw error;status('Event published. Share the hashtag #'+hashtag+'.');await myEvents();}catch(e){status(e.code==='23505'?'That hashtag is already in use. Choose another.':e.message);}finally{button.disabled=false;}};
window.searchEvent=async()=>{const tag=$('searchHashtag').value.trim().replace(/^#/,'').toLowerCase();if(!tag)return;const {data,error}=await db.from('events').select('id,creator_id,title,hashtag,category,starts_at,venue').eq('hashtag',tag).eq('published',true).maybeSingle();if(error){$('event-status').textContent=error.message;return;}if(!data){selectedEvent=null;$('creator-badge').textContent='No event selected';$('creator-trust-detail').textContent='Find a published event first.';$('event-status').textContent='No published event found with that hashtag.';return;}selectedEvent=data;$('eventTitle').textContent=data.title;$('displayHashtag').textContent='#'+data.hashtag;$('eventCategory').textContent=data.category;$('event-status').textContent=new Date(data.starts_at).toLocaleString()+' · '+data.venue;await refreshTrust();};
$('rsvp-save').addEventListener('click',async()=>{if(!user){$('event-status').textContent='Sign in to save your RSVP.';return;}if(!selectedEvent){$('event-status').textContent='Find a published event by hashtag first.';return;}const {error}=await db.from('event_responses').upsert({event_id:selectedEvent.id,user_id:user.id,attendance,message:$('guestMessage').value.trim()},{onConflict:'event_id,user_id'});$('event-status').textContent=error?error.message:'Your RSVP and message were saved. No payment has been collected.';});
db.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>sync(session),0);});
const {data,error}=await db.auth.getSession();if(error)status(error.message);else await sync(data.session);

$('request-verification').addEventListener('click',async()=>{
 if(!user){status('Sign in as an event creator first.');return;}
 $('request-verification').disabled=true;
 try{const {error}=await db.from('creator_verification_requests').insert({creator_id:user.id});if(error&&error.code!=='23505')throw error;await refreshCreatorPanel();status('Verification review requested. Payment and secure identity onboarding are not live yet.');}catch(e){status(e.message);$('request-verification').disabled=false;}
});
const trustStatus=text=>{$('trust-action-status').textContent=text;};
$('vouch-creator').addEventListener('click',async()=>{
 if(!user||!selectedEvent){trustStatus('Sign in and find a published event first.');return;}
 if(user.id===selectedEvent.creator_id){trustStatus('You cannot vouch for your own event.');return;}
 const button=$('vouch-creator');button.disabled=true;
 try{const {data:gifts,error}=await db.from('gift_payments').select('id').eq('donor_id',user.id).eq('creator_id',selectedEvent.creator_id).in('state',['held','released']).order('paid_at',{ascending:false}).limit(1);if(error)throw error;if(!gifts.length){trustStatus('You must have a successful gift payment to this creator before vouching. Payments are not live yet.');return;}
 const {error:ve}=await db.from('creator_vouches').insert({creator_id:selectedEvent.creator_id,donor_id:user.id,gift_id:gifts[0].id});if(ve&&ve.code!=='23505')throw ve;trustStatus(ve?'You already vouched for this creator.':'Your vouch was saved.');await refreshTrust();}catch(e){trustStatus(e.message);}finally{button.disabled=false;}
});
$('withdraw-vouch').addEventListener('click',async()=>{if(!user||!selectedEvent){trustStatus('Sign in and find a published event first.');return;}const {error}=await db.from('creator_vouches').delete().eq('creator_id',selectedEvent.creator_id).eq('donor_id',user.id);trustStatus(error?error.message:'Your vouch has been withdrawn.');if(!error)await refreshTrust();});
$('fraud-report-form').addEventListener('submit',async e=>{e.preventDefault();if(!user||!selectedEvent){trustStatus('Sign in and find a published event before reporting it.');return;}const {error}=await db.from('event_fraud_reports').insert({event_id:selectedEvent.id,reporter_id:user.id,reason:$('fraud-reason').value.trim()});trustStatus(error?error.message:'Report saved for review. Unresolved reports block gift release.');if(!error){$('fraud-reason').value='';await refreshTrust();}});
