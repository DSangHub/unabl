import test from 'node:test';
import assert from 'node:assert/strict';
import {clickFeeCents} from '../gift-fees.js';
import {fees} from '../lib/payment.js';
import {bankFees} from '../lib/bank-checkout.js';
test('Venmo click fee boundaries include $100 in low tier and $500 in middle tier',()=>{
 for(const [amount,fee] of [[1000,175],[9999,175],[10000,175],[10001,295],[49999,295],[50000,295],[50001,495],[100000,495]]){
  assert.equal(clickFeeCents(amount),fee);assert.equal(fees(amount).click,fee);assert.equal(bankFees(amount).click,fee);
  assert.equal(fees(amount).platform,0);assert.equal(fees(amount).total,amount+Math.round(amount*.029)+30);assert.equal(bankFees(amount).total,amount);
 }
 for(const amount of [999,100001,NaN,Infinity,'10000',1000.5])assert.throws(()=>clickFeeCents(amount),e=>e.status===400);
});
