import {randomUUID} from 'node:crypto';
import {route,dataConfig,authenticate,uuid,check,fail} from '../lib/payment.js';
import {albumAccess,albumPlan} from '../lib/album.js';
import {serviceConfig,verifyServiceAccount} from '../lib/service-checkout.js';
export default route(async(req,res)=>{
 const scope=serviceConfig();
 if(!process.env.STRIPE_WEBHOOK_SECRET)fail('Album payment notifications are not configured.',503);
 const {db,origin}=dataConfig(),user=await authenticate(req,db,origin),body=req.body||{};
 if(!uuid(body.event_id))fail('Choose your saved event.');
 const {event,album,host}=await albumAccess(db,user,body.event_id);
 if(!host)fail('Only the event host can purchase an album.',403);
 if(!album)fail('Save your album cover before purchasing.');
 const plan=albumPlan(album.tier);await verifyServiceAccount(scope);
 const open=check(await db.from('album_orders').select('*').eq('album_id',album.id).in('status',['pending','paid']).maybeSingle());
 let order=open;
 if(order){
  if(order.stripe_platform_id!==scope.platform||order.livemode!==scope.livemode)fail('This album has an order on another Stripe account or environment. Contact Unabl before paying again.',409);
  if(order.status==='paid')return res.json({paid:true});
  if(order.stripe_session_id){
   const session=await scope.stripe.checkout.sessions.retrieve(order.stripe_session_id);
   if(session.status==='open')return res.json({url:session.url});
   if(session.status==='complete')return res.json({pending:true});
   check(await db.from('album_orders').update({status:'failed'}).eq('id',order.id).eq('status','pending'));order=null;
  }
 }
 if(!order){
  const result=await db.from('album_orders').insert({id:randomUUID(),album_id:album.id,host_id:user.id,tier:album.tier,amount_cents:plan.price,status:'pending',livemode:scope.livemode,stripe_platform_id:scope.platform}).select().single();
  if(result.error?.code==='23505')fail('An album checkout is already being prepared. Select purchase again to resume it.',409);
  order=check(result);
 }
 const metadata={flow:'album',album_order_id:order.id};
 const session=await scope.stripe.checkout.sessions.create({mode:'payment',client_reference_id:order.id,customer_email:user.email,line_items:[{quantity:1,price_data:{currency:'usd',unit_amount:plan.price,product_data:{name:plan.name}}}],metadata,payment_intent_data:{metadata},success_url:origin+'/?event='+encodeURIComponent(event.hashtag||'')+'&album_payment=processing#account',cancel_url:origin+'/#account'},{idempotencyKey:'unabl_album_'+order.id});
 check(await db.from('album_orders').update({stripe_session_id:session.id}).eq('id',order.id).eq('status','pending'));
 res.json({url:session.url});
});
