import test from 'node:test';
import assert from 'node:assert/strict';
import {bankFees,validateBankConfiguration,bankConfiguration,onlyBankMethods} from '../lib/bank-checkout.js';
import {fulfill} from '../lib/webhooks.js';
const method=value=>({available:true,display_preference:{value}});
const config=()=>({id:'pmc_bank',active:true,livemode:true,us_bank_account:method('on'),card:method('off'),link:method('off'),apple_pay:method('off')});
test('Knows quote keeps the Venmo click fee outside the bank charge',()=>{assert.deepEqual(bankFees(1000),{gift:1000,platform:0,click:175,processing:0,total:1000});assert.throws(()=>bankFees(999));});
test('bank config rejects cards, wallets, other rails, missing ACH and wrong environment',()=>{validateBankConfiguration(config(),{livemode:true});for(const key of ['card','link','apple_pay','google_pay','klarna','sepa_debit'])assert.throws(()=>validateBankConfiguration({...config(),[key]:method('on')},{livemode:true}));assert.throws(()=>validateBankConfiguration(config(),{livemode:false}));assert.throws(()=>validateBankConfiguration({...config(),us_bank_account:method('off')},{livemode:true}));});
test('missing bank configuration fails closed without Stripe calls',async()=>{delete process.env.STRIPE_BANK_PAYMENT_CONFIGURATION;await assert.rejects(bankConfiguration({}, {livemode:true}),/being configured/);});
test('session must expose only US bank accounts',()=>{assert.equal(onlyBankMethods(['us_bank_account']),true);for(const methods of [[],['card'],['us_bank_account','card'],undefined])assert.equal(onlyBankMethods(methods),false);});
test('bank fulfillment rejects card payment and requires succeeded ACH',async()=>{
 let writes=0;const order={id:'order',total_cents:1020,livemode:true,stripe_platform_id:'acct_unabl'};
 const db={from(){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:order})}},rpc:async()=>{writes++;return {data:null}}};
 let type='card';const stripe={balance:{retrieve:async()=>({livemode:true})},accounts:{retrieve:async()=>({id:'acct_unabl'})},paymentIntents:{retrieve:async()=>({id:'pi',status:'succeeded',amount_received:1020,currency:'usd',payment_method_types:[type],latest_charge:{id:'ch',payment_method_details:{type}}})}};
 const session={id:'cs',payment_status:'paid',livemode:true,metadata:{order_id:'order',flow:'knows_bank'},client_reference_id:'order',amount_total:1020,currency:'usd',payment_intent:'pi',payment_method_types:['us_bank_account']};
 await assert.rejects(fulfill(session,1700000000,stripe,db),/bank-account/);assert.equal(writes,0);
 type='us_bank_account';await fulfill(session,1700000000,stripe,db);assert.equal(writes,1);
 await fulfill({...session,payment_status:'unpaid'},1700000000,stripe,db);assert.equal(writes,1);
});
