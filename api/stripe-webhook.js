import {route,config as settings,check,fail} from '../lib/payment.js';
import {processEvent} from '../lib/webhooks.js';
export const config={api:{bodyParser:false}};
// Vercel requires untouched bytes for Stripe signature verification.
export default route(async(req,res)=>{
 const {stripe,db}=settings();let length=0,chunks=[];
 for await(const chunk of req){length+=chunk.length;if(length>1024*1024)fail('Request too large',413);chunks.push(chunk);}
 let event;for(const secret of [process.env.STRIPE_WEBHOOK_SECRET,process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(Boolean)){try{event=stripe.webhooks.constructEvent(Buffer.concat(chunks),req.headers['stripe-signature'],secret);break;}catch{}}if(!event)fail('Invalid Stripe signature',400);
 const balance=await stripe.balance.retrieve();if(balance.livemode!==event.livemode)fail('Stripe environment mismatch',400);
 const previous=check(await db.from('stripe_webhook_events').select('id').eq('id',event.id).maybeSingle());if(previous)return res.json({received:true});
 await processEvent(event,stripe,db);
 const result=await db.from('stripe_webhook_events').insert({id:event.id,type:event.type});if(result.error&&result.error.code!=='23505')check(result);
 res.json({received:true});
});
