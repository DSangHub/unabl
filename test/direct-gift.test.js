import test from 'node:test';
import assert from 'node:assert/strict';
import {walletContact,directGiftContacts} from '../lib/direct-gift.js';
import {codeHash} from '../lib/event-guests.js';
test('direct wallet identifiers allow phone/email and reject payment links',()=>{
 assert.equal(walletContact(' host@example.com '),'host@example.com');assert.equal(walletContact('+1 (555) 123-4567',true),'+1 (555) 123-4567');assert.equal(walletContact(''),'');
 for(const v of ['https://pay.example/host','<script>','1234'])assert.throws(()=>walletContact(v));
 assert.throws(()=>walletContact('host@example.com',true));
});
test('direct contact disclosure requires invitation and current code, never verifies payment',async()=>{
 let invited=true;const code='1234-5678-90AB-CDEF-1234-5678',calls=[];
 const db={from(table){calls.push(table);return {select(){return this},eq(){return this},maybeSingle:async()=>({data:table==='events'?{id:'event',creator_id:'host'}:table==='event_guests'?(invited?{id:'guest'}:null):table==='event_gift_access'?{code_hash:codeHash(code)}:{apple_cash:'host@example.com',samsung_wallet:''}})}}};
 const user={id:'guest',email:'guest@example.com',email_confirmed_at:'now'};
 assert.equal((await directGiftContacts(db,user,{event_id:'event',access_code:code})).unabl_fee_cents,0);
 assert.equal((await directGiftContacts(db,user,{event_id:'event',access_code:code})).payment_verified,false);
 invited=false;calls.length=0;await assert.rejects(directGiftContacts(db,user,{event_id:'event',access_code:code}),e=>e.status===403);assert.ok(!calls.includes('event_direct_contacts'));
 invited=true;calls.length=0;await assert.rejects(directGiftContacts(db,user,{event_id:'event',access_code:'bad'}),e=>e.status===403);assert.ok(!calls.includes('event_direct_contacts'));
});
