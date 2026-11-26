import {route,config as settings,check,fail,stripeScope} from '../lib/payment.js';
import {processAlbumEvent} from '../lib/album.js';
import {serviceStatus,verifyServiceAccount} from '../lib/service-checkout.js';
import {processEvent} from '../lib/webhooks.js';
export const config={api:{bodyParser:false}};
// Vercel requires untouched bytes for Stripe signature verification.
export default route(async(req,res)=>{
 const {stripe,db}=settings();let length=0,chunks=[];
 for await(const chunk of req){length+=chunk.length;if(length>1024*1024)fail('Request too large',413);chunks.push(chunk);}
 let event;for(const secret of [process.env.STRIPE_WEBHOOK_SECRET,process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(Boolean)){try{event=stripe.webhooks.constructEvent(Buffer.concat(chunks),req.headers['stripe-signature'],secret);break;}catch{}}if(!event)fail('Invalid Stripe signature',400);
 // Service receipts stay in Stripe. No local entitlement or gift is granted here.
 if(event.data.object?.metadata?.flow==='unabl_service'){
  const platform=process.env.STRIPE_PLATFORM_ACCOUNT_ID,mode=process.env.STRIPE_SECRET_KEY?.match(/^(?:rk|sk)_(live|test)_/);
  if(!platform||!mode||event.livemode!==(mode[1]==='live')||(event.account&&event.account!==platform))fail('Wrong service payment account or environment.',400);
  await verifyServiceAccount({stripe,platform});
  if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
   const session=await stripe.checkout.sessions.retrieve(event.data.object.id,{expand:['payment_intent.latest_charge']});
   serviceStatus(session,{livemode:event.livemode});
  }
  return res.json({received:true});
 }
 const previous=check(await db.from('stripe_webhook_events').select('id').eq('id',event.id).maybeSingle());if(previous)return res.json({received:true});
 if(event.account&&event.account!==process.env.STRIPE_PLATFORM_ACCOUNT_ID&&event.data.object?.metadata?.flow==='album')fail('Wrong album payment account.',400);
 if(!await processAlbumEvent(event,stripe,db)){const scope=await stripeScope(stripe);if(scope.livemode!==event.livemode)fail('Stripe environment mismatch',400);await processEvent(event,stripe,db);}
 const result=await db.from('stripe_webhook_events').insert({id:event.id,type:event.type});if(result.error&&result.error.code!=='23505')check(result);
 res.json({received:true});
});
