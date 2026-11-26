import test from 'node:test';
import assert from 'node:assert/strict';
import {SERVICES,serviceProduct,serviceSession,serviceStatus,verifyServiceAccount,serviceConfig} from '../lib/service-checkout.js';
import checkout from '../api/service-checkout.js';
import albumCheckout from '../api/album-checkout.js';
const origin='https://www.unabl.app';
function paid(){return {mode:'payment',metadata:{flow:'unabl_service',sku:'blue_card'},livemode:false,amount_total:299,currency:'usd',payment_status:'paid',payment_intent:{status:'succeeded',amount_received:299,currency:'usd',livemode:false,metadata:{flow:'unabl_service',sku:'blue_card'},latest_charge:{paid:true,livemode:false,currency:'usd',amount:299,disputed:false,amount_refunded:0}}};}
test('server catalog has fixed card and video prices and cannot charge a host gift or AI product',()=>{
 assert.equal(SERVICES.blue_card.amount,299);assert.equal(SERVICES.gold_card.amount,495);assert.equal(SERVICES.recorded_video.amount,995);
 for(const sku of ['__proto__','constructor','host_gift','ai_video',undefined])assert.throws(()=>serviceProduct(sku));
 const session=serviceSession({sku:'blue_card',requestId:'request',origin});assert.equal(session.line_items[0].price_data.unit_amount,299);assert.equal(session.payment_intent_data.transfer_data,undefined);assert.equal(session.payment_method_types,undefined);assert.ok(session.success_url.startsWith(origin));
});
test('service receipts require paid intent, matching amount, environment and charge, and expose no customer details',()=>{
 assert.equal(serviceStatus(paid(),{livemode:false}).status,'paid');
 for(const mutate of [s=>s.amount_total=1,s=>s.livemode=true,s=>s.metadata.flow='gift',s=>s.payment_intent.status='processing',s=>s.payment_intent.latest_charge.amount=1,s=>s.payment_intent.metadata.sku='gold_card']){const s=paid();mutate(s);assert.throws(()=>serviceStatus(s,{livemode:false}));}
 const pending=paid();pending.payment_status='unpaid';pending.payment_intent=null;assert.equal(serviceStatus(pending,{livemode:false}).status,'pending');
 const refund=paid();refund.payment_intent.latest_charge.amount_refunded=1;assert.equal(serviceStatus(refund,{livemode:false}).status,'refunded');
 const dispute=paid();dispute.payment_intent.latest_charge.disputed=true;assert.equal(serviceStatus(dispute,{livemode:false}).status,'disputed');
});
test('wrong platform and incomplete Stripe accounts never open checkout',async()=>{
 await assert.rejects(verifyServiceAccount({platform:'acct_unabl',stripe:{accounts:{retrieve:async()=>({id:'acct_other',charges_enabled:true})}}}),/does not match/);
 await assert.rejects(verifyServiceAccount({platform:'acct_unabl',stripe:{accounts:{retrieve:async()=>({id:'acct_unabl',charges_enabled:false})}}}),/finish/);
});
test('service routes fail closed until explicitly enabled',async()=>{
 const prior=process.env.STRIPE_SERVICE_PAYMENTS_ENABLED;delete process.env.STRIPE_SERVICE_PAYMENTS_ENABLED;
 try{assert.throws(serviceConfig,/being configured/);const res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;}};for(const handler of [checkout,albumCheckout]){await handler({method:'POST',headers:{origin},body:{sku:'blue_card',amount:1}},res);assert.equal(res.code,503);assert.match(res.body.error,/No charge/);}}finally{if(prior!==undefined)process.env.STRIPE_SERVICE_PAYMENTS_ENABLED=prior;}
});

test('service checkout rejects an external origin before Stripe is contacted',async()=>{
 const keys=['STRIPE_SERVICE_PAYMENTS_ENABLED','STRIPE_SECRET_KEY','STRIPE_PLATFORM_ACCOUNT_ID','APP_URL'];const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{Object.assign(process.env,{STRIPE_SERVICE_PAYMENTS_ENABLED:'true',STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_PLATFORM_ACCOUNT_ID:'acct_unabl',APP_URL:origin});const res={setHeader(){},status(n){this.code=n;return this;},json(b){this.body=b;}};await checkout({method:'POST',headers:{origin:'https://evil.example'},body:{sku:'blue_card',request_id:'12345678-1234-4234-8234-123456789abc'}},res);assert.equal(res.code,403);assert.match(res.body.error,/origin/);}finally{for(const key of keys)if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key];}
});
