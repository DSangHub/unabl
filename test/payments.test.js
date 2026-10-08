import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import {fees,active,cronAuthorized,authenticate} from '../lib/payment.js';
import {fulfill,processEvent} from '../lib/webhooks.js';
import webhook from '../api/stripe-webhook.js';
import {Readable} from 'node:stream';
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(body){this.body=body;return this}};}
test('gift limits and server fee calculation',()=>{assert.deepEqual(fees(10000),{gift:10000,platform:200,processing:320,total:10520});for(const v of [999,100001,1000.1,NaN])assert.throws(()=>fees(v));});
test('v2 recipient capability only',()=>{assert.equal(active({payouts_enabled:true}),false);assert.equal(active({configuration:{recipient:{capabilities:{stripe_balance:{stripe_transfers:{status:'active'}}}}}}),true);});
test('cron rejects missing or incorrect credentials',()=>{process.env.CRON_SECRET='test-cron';assert.equal(cronAuthorized('Bearer wrong'),false);assert.equal(cronAuthorized('Bearer test-cron'),true);});
test('auth rejects absent token, other origin and unconfirmed users',async()=>{const db={auth:{getUser:async()=>({data:{user:{email_confirmed_at:null}}})}};await assert.rejects(authenticate({headers:{}},db,'https://www.unabl.app'));await assert.rejects(authenticate({headers:{origin:'https://evil.example'}},db,'https://www.unabl.app'));await assert.rejects(authenticate({headers:{authorization:'Bearer token'}},db,'https://www.unabl.app'));});
test('unsigned webhook is rejected before any database write',async()=>{
 Object.assign(process.env,{STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture',SUPABASE_SECRET_KEY:'sb_secret_fixture',APP_URL:'https://www.unabl.app'});
 const req=Readable.from([Buffer.from('{"id":"evt_fake"}')]);req.method='POST';req.headers={};const res=response();await webhook(req,res);assert.equal(res.code,400);assert.deepEqual(res.body,{error:'Invalid Stripe signature'});
});
test('Stripe signature detects tampering',()=>{const stripe=new Stripe('sk_test_fixture');const payload=JSON.stringify({id:'evt_fixture'}),secret='whsec_fixture';const signature=stripe.webhooks.generateTestHeaderString({payload,secret});assert.equal(stripe.webhooks.constructEvent(payload,signature,secret).id,'evt_fixture');assert.throws(()=>stripe.webhooks.constructEvent(payload+' ',signature,secret));});
test('unpaid delayed checkout does not fulfill',async()=>{let writes=0;await fulfill({payment_status:'unpaid'},1,{}, {rpc(){writes++}});assert.equal(writes,0);});
function dbFor(order){return {from(){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:order})}},calls:[],async rpc(name,args){this.calls.push({name,args});return {data:null}}};}
test('signed paid checkout requires matching amount and confirmed intent',async()=>{const order={id:'order',total_cents:10520};const session={id:'cs_test',payment_status:'paid',metadata:{order_id:'order'},client_reference_id:'order',amount_total:10520,currency:'usd',payment_intent:'pi_test'};const db=dbFor(order);const stripe={paymentIntents:{retrieve:async()=>({id:'pi_test',status:'succeeded',amount_received:10520,currency:'usd',latest_charge:{id:'ch_test',disputed:false,amount_refunded:0}})}};
 await fulfill(session,1700000000,stripe,db);assert.equal(db.calls[0].args.gift_state,'held');assert.equal(db.calls[0].args.paid_time,'2023-11-14T22:13:20.000Z');
 await assert.rejects(fulfill({...session,amount_total:1},1700000000,stripe,db));assert.equal(db.calls.length,1);
});
test('out-of-order refund observed during fulfillment never creates held gift',async()=>{const db=dbFor({id:'order',total_cents:1000});await fulfill({id:'cs',payment_status:'paid',metadata:{order_id:'order'},client_reference_id:'order',amount_total:1000,currency:'usd',payment_intent:'pi'},1700000000,{paymentIntents:{retrieve:async()=>({id:'pi',status:'succeeded',amount_received:1000,currency:'usd',latest_charge:{id:'ch',disputed:false,amount_refunded:100}})}},db);assert.equal(db.calls[0].args.gift_state,'refunded');});
import {releaseJob} from '../lib/releases.js';
function releaseDB(eligible=true,finalizeError=false){
 const gift={id:'gift',order_id:'order',creator_id:'creator',amount_cents:10000,currency:'usd',stripe_charge_id:'ch'};
 let state='held';const writes=[];
 return {writes,from(table){let action='select',data;const builder={select(){return this},eq(){return this},update(v){action='update';data=v;writes.push({table,data});return this},upsert(v){writes.push({table,data:v});return this},single:async()=>({data:gift}),maybeSingle:async()=>({data:table==='creator_stripe_accounts'?{stripe_account_id:'acct'}:{state}}),then(resolve){resolve({data:null})}};return builder},async rpc(name){if(name==='gift_release_eligible')return {data:eligible};if(finalizeError)return {error:{message:'gate changed'}};state='released';return {data:null}}};
}
function releaseStripe(existing){const calls={created:0,reversed:0};return {calls,v2:{core:{accounts:{retrieve:async()=>({configuration:{recipient:{capabilities:{stripe_balance:{stripe_transfers:{status:'active'}}}}}})}}},transfers:{list:async()=>({data:existing?[{id:'tr',metadata:{attempt_id:'job'}}]:[]}),create:async()=>{calls.created++;return {id:'tr'}},retrieve:async()=>({amount:10000,amount_reversed:0}),createReversal:async()=>{calls.reversed++;return {id:'rev'}}}};}
test('release retry reuses transfer instead of paying twice',async()=>{const stripe=releaseStripe(true);assert.equal(await releaseJob({id:'job',gift_id:'gift'},stripe,releaseDB()),'released');assert.equal(stripe.calls.created,0);});
test('blocked gift never initiates a transfer',async()=>{const stripe=releaseStripe(false);assert.equal(await releaseJob({id:'job',gift_id:'gift'},stripe,releaseDB(false)),'blocked');assert.equal(stripe.calls.created,0);});
test('gate changing after transfer causes compensating reversal',async()=>{const stripe=releaseStripe(false);await assert.rejects(releaseJob({id:'job',gift_id:'gift'},stripe,releaseDB(true,true)));assert.equal(stripe.calls.created,1);assert.equal(stripe.calls.reversed,1);});
