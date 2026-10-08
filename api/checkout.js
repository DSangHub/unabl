import {randomUUID} from 'node:crypto';
import {route,config,enabled,authenticate,check,fail,fees,uuid,accountStatus} from '../lib/payment.js';
export default route(async(req,res)=>{
 enabled();const {stripe,db,origin}=config(),user=await authenticate(req,db,origin),body=req.body||{};
 if(!uuid(body.request_id)||!uuid(body.event_id))fail('Choose a published event and try again.');
 const amount=Number(body.amount_cents),quote=fees(amount);
 const event=check(await db.from('events').select('id,creator_id,title,published').eq('id',body.event_id).eq('published',true).maybeSingle());if(!event)fail('Event not found.',404);if(event.creator_id===user.id)fail('You cannot send a gift to yourself.');
 const readiness=await accountStatus(stripe,db,event.creator_id);if(!readiness.ready)fail('This creator must finish Stripe onboarding before receiving gifts.',409);
 const prior=check(await db.from('checkout_orders').select('*').eq('request_id',body.request_id).maybeSingle());
 let order=prior;
 if(prior&&(prior.donor_id!==user.id||prior.event_id!==event.id||prior.gift_cents!==amount))fail('Payment request does not match.',409);
 if(!order){const row={id:randomUUID(),request_id:body.request_id,donor_id:user.id,event_id:event.id,creator_id:event.creator_id,gift_cents:amount,total_cents:quote.total,message:String(body.message||'').trim().slice(0,2000)};
 const result=await db.from('checkout_orders').insert(row).select().single();
 if(result.error?.code==='23505')order=check(await db.from('checkout_orders').select('*').eq('request_id',body.request_id).single());else order=check(result);
 if(order.donor_id!==user.id||order.event_id!==event.id||order.gift_cents!==amount)fail('Payment request does not match.',409);
 }
 if(order.status==='paid')fail('This gift has already been paid.',409);
 const line=(name,cents)=>({price_data:{currency:'usd',unit_amount:cents,product_data:{name}},quantity:1});
 const session=await stripe.checkout.sessions.create({mode:'payment',client_reference_id:order.id,customer_email:user.email,integration_identifier:'unabl_gifts_hqmvkzra',line_items:[line('Gift: '+event.title,quote.gift),line('Unabl platform fee (2%)',quote.platform),line('Payment handling fee',quote.processing)],metadata:{order_id:order.id},payment_intent_data:{metadata:{order_id:order.id},transfer_group:'gift_'+order.id},success_url:origin+'/?payment=return&session_id={CHECKOUT_SESSION_ID}',cancel_url:origin+'/?payment=cancelled'}, {idempotencyKey:'checkout_'+order.id});
 check(await db.from('checkout_orders').update({stripe_session_id:session.id}).eq('id',order.id));res.json({url:session.url});
});
