import {randomUUID} from 'node:crypto';
import {route,config,enabled,authenticate,uuid,check,fail} from '../lib/payment.js';
import {albumAccess,albumPlan,albumPaymentScope} from '../lib/album.js';
export default route(async(req,res)=>{
 enabled();const {db,stripe,origin}=config(),user=await authenticate(req,db,origin),b=req.body||{};
 if(!uuid(b.event_id))fail('Choose a saved event.');
 const {album,host,paid}=await albumAccess(db,user,b.event_id,b.access_code);
 if(!host)fail('Only the event host can purchase this album.',403);if(!album)fail('Save your album cover first.');if(paid)fail('This album is already active.',409);
 const plan=albumPlan(album.tier),scope=await albumPaymentScope(stripe);
 if(!process.env.STRIPE_PLATFORM_ACCOUNT_ID||scope.platform!==process.env.STRIPE_PLATFORM_ACCOUNT_ID)fail('Album payment account is not configured.',503);
 let order=check(await db.from('album_orders').select('*').eq('album_id',album.id).in('status',['pending','paid']).maybeSingle());
 if(order?.status==='paid')fail('This album already has a payment. Contact support before purchasing again.',409);
 if(order&&(order.livemode!==scope.livemode||order.stripe_platform_id!==scope.platform))fail('An album payment is pending in another environment. Contact support.',409);
 if(order?.stripe_session_id){const old=await stripe.checkout.sessions.retrieve(order.stripe_session_id);
  if(old.status==='open'&&old.url)return res.json({url:old.url});
  if(old.status==='complete')fail('Payment is processing. Refresh the album after confirmation.',409);
  check(await db.from('album_orders').update({status:'failed'}).eq('id',order.id).eq('status','pending'));order=null;
 }
 if(!order){const inserted=await db.from('album_orders').insert({id:randomUUID(),album_id:album.id,host_id:user.id,tier:album.tier,amount_cents:plan.price,livemode:scope.livemode,stripe_platform_id:scope.platform}).select().single();
  if(inserted.error?.code==='23505')order=check(await db.from('album_orders').select('*').eq('album_id',album.id).eq('status','pending').single());else order=check(inserted);
 }
 if(order.host_id!==user.id||order.tier!==album.tier||order.amount_cents!==plan.price||order.livemode!==scope.livemode||order.stripe_platform_id!==scope.platform)fail('Album purchase details changed. Please try again.',409);
 const session=await stripe.checkout.sessions.create({mode:'payment',client_reference_id:order.id,customer_email:user.email,integration_identifier:'unabl_albums_xrnjqwpt',line_items:[{price_data:{currency:'usd',unit_amount:plan.price,product_data:{name:plan.name,description:'One event album · up to 20 video greetings (25 MB each) · '+(album.tier==='gold'?'Gold cover, automatic page turns and original music':'Custom cover and manual page turns')}},quantity:1}],metadata:{flow:'album',album_order_id:order.id},payment_intent_data:{metadata:{flow:'album',album_order_id:order.id}},success_url:origin+'/?album=return#account',cancel_url:origin+'/?album=cancelled#account'},{idempotencyKey:'album_checkout_'+order.id});
 check(await db.from('album_orders').update({stripe_session_id:session.id}).eq('id',order.id));res.json({url:session.url});
});
