import test from 'node:test';
import assert from 'node:assert/strict';
import {registryFunds,dollarsToCents} from '../cash-registry-values.js';

const fund={name:' New home ',description:' A new start ',suggested_cents:2550,goal_cents:50000};

test('registry accepts whole-cent prices and returns only public fund fields',()=>{
 assert.equal(dollarsToCents('25.50'),2550);
 assert.equal(dollarsToCents('25.501'),null);
 assert.equal(dollarsToCents('1e2'),null);
 assert.deepEqual(registryFunds([{...fund,wallet:'ignored',paid_cents:100}]),[
  {name:'New home',description:'A new start',suggested_cents:2550,goal_cents:50000}
 ]);
 assert.deepEqual(registryFunds([]),[]);
});
test('registry rejects duplicate, oversize and out-of-range funds',()=>{
 for(const data of [
  Array.from({length:9},(_,i)=>({...fund,name:String(i)})),
  [fund,{...fund,name:'new HOME'}],
  [{...fund,name:' '}],
  [{...fund,suggested_cents:999}],
  [{...fund,suggested_cents:100001}],
  [{...fund,goal_cents:2500}],
  [{...fund,goal_cents:100000001}],
 ])assert.throws(()=>registryFunds(data));
});
