import {check,fail} from './payment.js';
import {requireInvitedGuest,requireGiftCode} from './event-guests.js';
export const ALBUM_PLANS={classic:{price:795,name:'Classic Video Greeting Album',automatic:false},gold:{price:1495,name:'Gold Embossed Video Greeting Album',automatic:true}};
export const ALBUM_BUCKET='event-greetings',VIDEO_LIMIT=25*1024*1024;
export function albumPlan(tier){if(!Object.hasOwn(ALBUM_PLANS,tier))fail('Choose Classic or Gold.');return ALBUM_PLANS[tier];}
export function albumDetails(body){const title=String(body.title||'').trim(),subtitle=String(body.subtitle||'').trim(),dedication=String(body.dedication||'').trim();if(!title||title.length>100||subtitle.length>160||dedication.length>600)fail('Add a cover title (100 characters), subtitle (160), and dedication (600 maximum).');return {title,subtitle,dedication,guest_view:body.guest_view===true};}
export function videoDetails(body){const extensions={'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'};if(!Object.hasOwn(extensions,body.mime)||!Number.isInteger(body.size)||body.size<1||body.size>VIDEO_LIMIT)fail('Choose an MP4, WebM, or MOV video up to 25 MB.');const name=String(body.sender_name||'').trim(),message=String(body.message||'').trim();if(!name||name.length>60||message.length>600)fail('Add your name (60 characters) and a message (600 maximum).');if(body.consent!==true)fail('Confirm you have permission to share this video and everyone shown in it.');return {sender_name:name,message,extension:extensions[body.mime]};}
export async function albumAccess(db,user,eventId,code){
 const event=check(await db.from('events').select('id,creator_id,title,published').eq('id',eventId).maybeSingle());if(!event)fail('Event not found.',404);
 const host=event.creator_id===user.id;
 if(!host){if(!event.published)fail('Published event not found.',404);await requireInvitedGuest(db,eventId,user);await requireGiftCode(db,eventId,code);}
 const album=check(await db.from('event_albums').select('*').eq('event_id',eventId).maybeSingle());
 let paid=false;if(album){const orders=check(await db.from('album_orders').select('id').eq('album_id',album.id).eq('status','paid').eq('livemode',true).limit(1));paid=orders.length>0;}
 return {event,album,host,paid};
}
export async function albumPaymentScope(stripe){const account=await stripe.accounts.retrieve();if(!process.env.STRIPE_PLATFORM_ACCOUNT_ID||account.id!==process.env.STRIPE_PLATFORM_ACCOUNT_ID)fail('Album payment account is not configured.',503);const mode=process.env.STRIPE_SECRET_KEY?.match(/^(?:rk|sk)_(live|test)_/);if(!mode)fail('Album payment environment is not configured.',503);return {platform:account.id,livemode:mode[1]==='live'};}
export async function fulfillAlbum(session,stripe,db){
 if(session.payment_status!=='paid')return;
 const order=check(await db.from('album_orders').select('*').eq('id',session.metadata?.album_order_id).maybeSingle());if(!order)return;
 if(order.stripe_platform_id!==process.env.STRIPE_PLATFORM_ACCOUNT_ID||order.livemode!==session.livemode||session.client_reference_id!==order.id||session.amount_total!==order.amount_cents||session.currency!=='usd'||(order.stripe_session_id&&order.stripe_session_id!==session.id))fail('Album payment details do not match.',409);
 const pi=await stripe.paymentIntents.retrieve(typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id,{expand:['latest_charge']});
 if(pi.status!=='succeeded'||pi.amount_received!==order.amount_cents||pi.currency!=='usd'||pi.livemode!==order.livemode||pi.metadata?.album_order_id!==order.id)fail('Album payment is not confirmed.',409);
 const charge=pi.latest_charge;if(!charge||typeof charge==='string')fail('Album charge is unavailable.',409);
 if(charge.amount!==order.amount_cents||charge.currency!=='usd'||charge.livemode!==order.livemode||charge.paid!==true)fail('Album charge does not match.',409);
 const state=charge.disputed?'disputed':charge.amount_refunded>0?'refunded':'paid';
 check(await db.from('album_orders').update({status:state,stripe_session_id:session.id,payment_intent_id:pi.id,charge_id:charge.id}).eq('id',order.id).in('status',['pending','paid']));
}
export async function processAlbumEvent(event,stripe,db){
 const obj=event.data.object;
 if(obj.metadata?.flow==='album'&&event.type.startsWith('checkout.session.')){
  if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))await fulfillAlbum(obj,stripe,db);
  if(event.type==='checkout.session.async_payment_failed')check(await db.from('album_orders').update({status:'failed'}).eq('id',obj.metadata.album_order_id).eq('status','pending'));
  return true;
 }
 if(['charge.failed','charge.refunded','charge.dispute.created'].includes(event.type)){
  const charge=event.type==='charge.dispute.created'?await stripe.charges.retrieve(typeof obj.charge==='string'?obj.charge:obj.charge.id):obj;
  if(charge.metadata?.flow!=='album')return false;
  const state=event.type==='charge.refunded'?'refunded':event.type==='charge.dispute.created'?'disputed':'failed';
  check(await db.from('album_orders').update({status:state}).eq('id',charge.metadata.album_order_id).eq('livemode',event.livemode).eq('stripe_platform_id',process.env.STRIPE_PLATFORM_ACCOUNT_ID));return true;
 }
 return false;
}
