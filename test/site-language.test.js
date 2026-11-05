import test from 'node:test';
import assert from 'node:assert/strict';
import {protect,translatePart} from '../lib/site-translation.js';
import {locales,direction,localeLabel} from '../site-locales.js';
import {parts} from '../site-catalog.js';

test('language options include native labels and right-to-left scripts',()=>{
 assert.ok(locales.size>=185);
 assert.equal(direction('pa-Arab'),'rtl');
 assert.equal(direction('pa'),'ltr');
 assert.equal(direction('he'),'rtl');
 assert.match(localeLabel('ja'),/日本語/);
});

test('translation preserves prices and wallet IDs and rejects corrupted placeholders',async()=>{
 const original='Pay $9.95 to @UnablPay or $unablpay';
 const {input,restore}=protect(original);
 assert.equal(input,'Pay ⟦0⟧ to ⟦1⟧ or ⟦2⟧');
 assert.throws(()=>restore('Paga ⟦0⟧ a ⟦2⟧'));
 const stub=async(_url,options)=>{
  const body=JSON.parse(options.body);
  assert.equal(body.store,false);
  assert.deepEqual(JSON.parse(body.input),[input]);
  return {ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({translations:['Paga ⟦0⟧ a ⟦1⟧ o ⟦2⟧']})}]}]})};
 };
 assert.deepEqual(await translatePart([original],'Spanish','test-key',stub),['Paga $9.95 a @UnablPay o $unablpay']);
});

test('catalog includes copy from dynamic dialogs and the embedded card editor',()=>{
 const strings=parts.flat();
 for(const label of ['Guest','Host','Create an AI greeting','Pay Unabl by Venmo or Cash App','Close card','Copy link'])assert.ok(strings.includes(label),label);
});
