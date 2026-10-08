import {check,accountStatus} from './payment.js';
import {reverse} from './webhooks.js';
export async function releaseJob(job,stripe,db){
 const gift=check(await db.from('gift_payments').select('*').eq('id',job.gift_id).single());
 const existing=await stripe.transfers.list({transfer_group:'gift_'+gift.order_id,limit:100});
 let transfer=existing.data.find(t=>t.metadata?.attempt_id===job.id);
 let eligible=check(await db.rpc('gift_release_eligible',{gift:gift.id}));
 const status=await accountStatus(stripe,db,gift.creator_id);eligible=eligible&&status.ready;
 if(!eligible){if(transfer)await reverse(stripe,transfer.id);check(await db.from('gift_release_jobs').update({status:'reversed'}).eq('id',job.id));return 'blocked';}
 if(!transfer)transfer=await stripe.transfers.create({amount:gift.amount_cents,currency:gift.currency,destination:status.row.stripe_account_id,source_transaction:gift.stripe_charge_id,transfer_group:'gift_'+gift.order_id,metadata:{gift_id:gift.id,attempt_id:job.id}},{idempotencyKey:'release_'+job.id});
 // Record the transfer before finalization so retries and refund handlers can find it.
 check(await db.from('gift_release_jobs').update({stripe_transfer_id:transfer.id}).eq('id',job.id));
 try{check(await db.rpc('finalize_gift_release',{job_key:job.id,transfer_key:transfer.id}));}
 catch(e){
 // If finalization committed but its response was lost, do not reverse a valid release.
 const current=check(await db.from('gift_payments').select('state,stripe_transfer_id').eq('id',gift.id).single());
 if(current.state==='released'&&current.stripe_transfer_id===transfer.id)return 'released';
 await reverse(stripe,transfer.id);check(await db.from('gift_release_jobs').update({status:'reversed'}).eq('id',job.id));throw e;
 }
 return 'released';
}
