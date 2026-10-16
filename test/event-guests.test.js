import test from 'node:test';
import assert from 'node:assert/strict';
import {guestEmail,requireInvitedGuest,newGiftCode,codeHash,requireGiftCode} from '../lib/event-guests.js';
test('email matching normalizes case and whitespace without alias rewriting',()=>{
 assert.equal(guestEmail(' Guest+party@Example.COM '),'guest+party@example.com');
 for(const email of ['', 'bad', 'a b@example.com', 'a@b', 'a'.repeat(255)+'@x.com'])assert.throws(()=>guestEmail(email));
});
test('host codes are random and only the matching current code passes',async()=>{
 const code=newGiftCode();assert.match(code,/^([A-F0-9]{4}-){5}[A-F0-9]{4}$/);assert.notEqual(newGiftCode(),code);
 const db={from(table){
  assert.equal(table,'event_gift_access');
  return {
   select(){return this},
   eq(key,value){assert.equal(key,'event_id');assert.equal(value,'event');return this},
   maybeSingle:async()=>({data:{code_hash:codeHash(code)}})
  };
 }};
 await requireGiftCode(db,'event',code.toLowerCase());
 await requireGiftCode(db,'event',code.replaceAll('-',''));
 await assert.rejects(requireGiftCode(db,'event',newGiftCode()),e=>e.status===403);
 await assert.rejects(requireGiftCode(db,'event',''),e=>e.status===403);
});
function database(result){const filters=[];return {filters,from(table){assert.equal(table,'event_guests');return {select(){return this},eq(key,value){filters.push([key,value]);return this},async maybeSingle(){return result}}}};}
const user={email:'Guest@Example.com',email_confirmed_at:'2026-10-15'};
test('invitation is scoped to selected event and confirmed authenticated email',async()=>{
 const db=database({data:{id:'invite'}});assert.deepEqual(await requireInvitedGuest(db,'event-1',user),{id:'invite'});
 assert.deepEqual(db.filters,[['event_id','event-1'],['email','guest@example.com']]);
});
test('uninvited and unconfirmed senders cannot open checkout; database failures fail closed',async()=>{
 await assert.rejects(requireInvitedGuest(database({data:null}),'event',user),e=>e.status===403);
 await assert.rejects(requireInvitedGuest(database({data:{id:'invite'}}),'event',{...user,email_confirmed_at:null}),e=>e.status===401);
 await assert.rejects(requireInvitedGuest(database({error:{message:'unavailable'}}),'event',user),/Database operation failed/);
});
