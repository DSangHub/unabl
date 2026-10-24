import {route,dataConfig,authenticate,check,fail,uuid} from '../lib/payment.js';
import {guestEmail,newGiftCode,codeHash,saveGuestEmails} from '../lib/event-guests.js';
import {directCashContact,directVenmoContact} from '../lib/direct-gift.js';
export default route(async(req,res)=>{
 const {db,origin}=dataConfig(),user=await authenticate(req,db,origin);
 const body=req.body||{},eventId=req.method==='GET'?req.query?.event_id:body.event_id;
 if(!uuid(eventId))fail('Choose one of your saved events.');
 const event=check(await db.from('events').select('id').eq('id',eventId).eq('creator_id',user.id).maybeSingle());
 if(!event)fail('Event not found or not owned by you.',404);
 if(req.method==='GET'){
  const guests=check(await db.from('event_guests').select('id,email,created_at').eq('event_id',eventId).order('created_at',{ascending:false}));
  const contacts=check(await db.from('event_direct_contacts').select('venmo,cash_app').eq('event_id',eventId).maybeSingle());
  return res.json({guests,contacts});
 }
 if(body.action==='save_contacts'){
  if(body.share_with_guests!==true)fail('Confirm you want to share these wallet contacts with invited guests.');
  check(await db.from('event_direct_contacts').upsert({event_id:eventId,cash_app:directCashContact(body.cash_app),venmo:directVenmoContact(body.venmo)},{onConflict:'event_id'}));
  return res.json({ok:true});
 }else if(body.action==='generate_code'){
  const code=newGiftCode();
  check(await db.from('event_gift_access').upsert({event_id:eventId,code_hash:codeHash(code),created_at:new Date().toISOString()},{onConflict:'event_id'}));
  return res.json({code});
 }else if(body.action==='add_many'){
  await saveGuestEmails(db,eventId,body.emails);
 }else if(body.action==='add'){
  const email=guestEmail(body.email);
  check(await db.from('event_guests').upsert({event_id:eventId,email},{onConflict:'event_id,email',ignoreDuplicates:true}));
 }else if(body.action==='remove'){
  if(!uuid(body.guest_id))fail('Choose a guest to remove.');
  check(await db.from('event_guests').delete().eq('event_id',eventId).eq('id',body.guest_id));
 }else fail('Choose add or remove.');
 res.json({ok:true});
},['GET','POST']);
