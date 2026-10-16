import {route,config,authenticate,check,fail,uuid} from '../lib/payment.js';
import {guestEmail,newGiftCode,codeHash} from '../lib/event-guests.js';
export default route(async(req,res)=>{
 const {db,origin}=config(),user=await authenticate(req,db,origin);
 const body=req.body||{},eventId=req.method==='GET'?req.query?.event_id:body.event_id;
 if(!uuid(eventId))fail('Choose one of your saved events.');
 const event=check(await db.from('events').select('id').eq('id',eventId).eq('creator_id',user.id).maybeSingle());
 if(!event)fail('Event not found or not owned by you.',404);
 if(req.method==='GET'){
  const guests=check(await db.from('event_guests').select('id,email,created_at').eq('event_id',eventId).order('created_at',{ascending:false}));
  return res.json({guests});
 }
 if(body.action==='generate_code'){
  const code=newGiftCode();
  check(await db.from('event_gift_access').upsert({event_id:eventId,code_hash:codeHash(code),created_at:new Date().toISOString()},{onConflict:'event_id'}));
  return res.json({code});
 }else if(body.action==='add'){
  const email=guestEmail(body.email);
  check(await db.from('event_guests').upsert({event_id:eventId,email},{onConflict:'event_id,email',ignoreDuplicates:true}));
 }else if(body.action==='remove'){
  if(!uuid(body.guest_id))fail('Choose a guest to remove.');
  check(await db.from('event_guests').delete().eq('event_id',eventId).eq('id',body.guest_id));
 }else fail('Choose add or remove.');
 res.json({ok:true});
},['GET','POST']);
