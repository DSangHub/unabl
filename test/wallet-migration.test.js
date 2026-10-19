import test from 'node:test';
import assert from 'node:assert/strict';
import {cashTag,cashProfile} from '../wallet-utils.js';
import {directCashContact} from '../lib/direct-gift.js';
import checkout from '../api/checkout.js';
import onboarding from '../api/onboarding.js';
import albumCheckout from '../api/album-checkout.js';
import {dataConfig} from '../lib/payment.js';
test('Cash App identifiers reject URLs, query injection and non-Cashtags',()=>{
 assert.equal(cashTag(' $RoseBloom '),'RoseBloom');assert.equal(cashProfile('$RoseBloom'),'https://cash.app/$RoseBloom');assert.equal(directCashContact(''),'');
 for(const value of ['https://cash.app/$RoseBloom','Rose?amount=50','<script>','123456','a'.repeat(21),'a/b','a_b'])assert.throws(()=>cashTag(value));
});
test('new Stripe routes are disconnected even with payments enabled and no keys',async()=>{
 for(const handler of [checkout,onboarding,albumCheckout]){
  const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;}};
  await handler({method:'POST',body:{}},res);assert.equal(res.code,410);assert.match(res.body.error,/Stripe is disconnected/);
 }
});
test('wallet data configuration has no Stripe credential dependency',()=>{
 const names=['SUPABASE_SECRET_KEY','APP_URL','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET'],prior=Object.fromEntries(names.map(n=>[n,process.env[n]]));
 try{process.env.SUPABASE_SECRET_KEY='test-server-only';process.env.APP_URL='https://www.unabl.app';delete process.env.STRIPE_SECRET_KEY;delete process.env.STRIPE_WEBHOOK_SECRET;const result=dataConfig();assert.equal(result.origin,'https://www.unabl.app');assert.ok(result.db);assert.equal(result.stripe,undefined);}
 finally{for(const n of names)if(prior[n]===undefined)delete process.env[n];else process.env[n]=prior[n];}
});
