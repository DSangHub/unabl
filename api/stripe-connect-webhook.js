import {route,config as settings,check,fail,stripeScope,inScope,accountStatus} from '../lib/payment.js';
export const config={api:{bodyParser:false}};
export default route(async(req,res)=>{
 const {stripe,db}=settings();let length=0,chunks=[];
 for await(const chunk of req){length+=chunk.length;if(length>1024*1024)fail('Request too large',413);chunks.push(chunk);}
 const secret=process.env.STRIPE_CONNECT_V2_WEBHOOK_SECRET;if(!secret)fail('Connect webhook setup incomplete',503);
 let event;try{event=stripe.parseEventNotification(Buffer.concat(chunks),req.headers['stripe-signature'],secret);}catch{fail('Invalid Stripe signature',400);}
 const scope=await stripeScope(stripe);if(event.livemode!==scope.livemode)fail('Stripe environment mismatch',400);
 const previous=check(await db.from('stripe_webhook_events').select('id').eq('id',event.id).maybeSingle());if(previous)return res.json({received:true});
 if(['v2.core.account[requirements].updated','v2.core.account[configuration.recipient].capability_status_updated'].includes(event.type)){
  const accountId=event.related_object?.id;if(!accountId)fail('Missing account reference',400);
  const row=check(await inScope(db.from('creator_stripe_accounts').select('creator_id').eq('stripe_account_id',accountId),scope).maybeSingle());
  if(row)await accountStatus(stripe,db,row.creator_id);
 }
 const result=await db.from('stripe_webhook_events').insert({id:event.id,type:event.type});if(result.error&&result.error.code!=='23505')check(result);
 res.json({received:true});
});
