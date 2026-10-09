import {check,fail,accountStatus,stripeScope,inScope} from './payment.js';
export async function fulfill(session,eventTime,stripe,db){
 if(session.payment_status!=='paid')return;
 const order=check(await db.from('checkout_orders').select('*').eq('id',session.metadata?.order_id||'00000000-0000-4000-8000-000000000000').maybeSingle());
 if(!order)return;
 const scope=await stripeScope(stripe);if(order.livemode!==scope.livemode||order.stripe_platform_id!==scope.platform||session.livemode!==scope.livemode)fail('Payment environment mismatch',409); // Ignore payments from other integrations on this account.
 if(session.client_reference_id!==order.id||session.amount_total!==order.total_cents||session.currency!=='usd')fail('Payment details do not match order',409);
 const intent=await stripe.paymentIntents.retrieve(typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent.id,{expand:['latest_charge']});
 if(intent.status!=='succeeded'||intent.amount_received!==order.total_cents||intent.currency!=='usd')fail('Payment has not succeeded',409);
 const charge=intent.latest_charge;if(!charge||typeof charge==='string')throw new Error('Charge unavailable');
 const state=charge.disputed?'disputed':charge.amount_refunded>0?'refunded':'held';
 check(await db.rpc('fulfill_gift_order',{order_key:order.id,session_key:session.id,payment_key:intent.id,charge_key:charge.id,paid_time:new Date(eventTime*1000).toISOString(),gift_state:state}));
}
export async function blockGift(chargeId,state,stripe,db){
 const gifts=check(await db.from('gift_payments').select('id,stripe_transfer_id').eq('stripe_charge_id',chargeId));
 // Mark blocked before attempting reversal. A reversal failure must cause webhook retry.
 check(await db.from('gift_payments').update({state}).eq('stripe_charge_id',chargeId));
 for(const gift of gifts){if(gift.stripe_transfer_id)await reverse(stripe,gift.stripe_transfer_id);}
}
export async function reverse(stripe,id){const transfer=await stripe.transfers.retrieve(id);const remainder=transfer.amount-transfer.amount_reversed;if(remainder>0)await stripe.transfers.createReversal(id,{amount:remainder},{idempotencyKey:'reverse_'+id});}
export async function processEvent(event,stripe,db){
 const obj=event.data.object;const scope=await stripeScope(stripe);
 if(event.type==='account.updated'||event.type.startsWith('account.external_account.')){const accountId=event.account||obj.id;const row=check(await inScope(db.from('creator_stripe_accounts').select('creator_id').eq('stripe_account_id',accountId),scope).maybeSingle());if(row)await accountStatus(stripe,db,row.creator_id);}
 if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))await fulfill(obj,event.created,stripe,db);
 if(event.type==='checkout.session.async_payment_failed')check(await db.from('checkout_orders').update({status:'failed'}).eq('stripe_session_id',obj.id).neq('status','paid'));
 if(event.type==='charge.refunded')await blockGift(obj.id,'refunded',stripe,db);
 if(event.type==='charge.dispute.created')await blockGift(typeof obj.charge==='string'?obj.charge:obj.charge.id,'disputed',stripe,db);
}
