import test from 'node:test';
import assert from 'node:assert/strict';
import {guestEmails} from '../guest-emails.js';
import {saveGuestEmails} from '../lib/event-guests.js';
test('bulk guest emails normalize and deduplicate pasted lists, bounded to 100',()=>{
 assert.deepEqual(guestEmails(' Alice@example.com, bob@example.com;\nALICE@example.com '),['alice@example.com','bob@example.com']);
 for(const input of ['', 'ok@example.com, invalid', ['x@example.com',42], Array.from({length:101},(_,n)=>'guest'+n+'@example.com')])assert.throws(()=>guestEmails(input));
});
test('bulk save validates the whole list before any write; errors never report success',async()=>{
 let writes=0;const db={from(table){assert.equal(table,'event_guests');return{async upsert(rows,opts){writes++;assert.deepEqual(rows,[{event_id:'owned-event',email:'alice@example.com'},{event_id:'owned-event',email:'bob@example.com'}]);assert.equal(opts.ignoreDuplicates,true);return {data:null,error:null};}}}};
 assert.equal(await saveGuestEmails(db,'owned-event',['Alice@example.com','bob@example.com']),2);assert.equal(writes,1);
 await assert.rejects(saveGuestEmails(db,'owned-event',['ok@example.com','invalid']),e=>e.status===400);assert.equal(writes,1);
 await assert.rejects(saveGuestEmails({from(){return{upsert:async()=>({error:{message:'failed'}})}}},'owned-event',['ok@example.com']),/Database operation failed/);
});
