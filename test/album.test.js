import test from 'node:test';
import assert from 'node:assert/strict';
import {albumPlan,albumDetails,videoDetails,VIDEO_LIMIT,albumAccess,albumPaymentScope,fulfillAlbum,processAlbumEvent} from '../lib/album.js';
import {codeHash} from '../lib/event-guests.js';
test('album prices and limits are server-owned, cover and upload consent are bounded',()=>{
 assert.equal(albumPlan('classic').price,795);assert.equal(albumPlan('gold').price,1495);assert.throws(()=>albumPlan('__proto__'));assert.throws(()=>albumPlan('free'));
 assert.equal(albumDetails({title:'  Our day  ',guest_view:true}).title,'Our day');assert.throws(()=>albumDetails({title:'x'.repeat(101)}));
 const file={mime:'video/mp4',size:VIDEO_LIMIT,sender_name:'Rose',message:'Congratulations',consent:true};assert.equal(videoDetails(file).extension,'mp4');
 for(const change of [{mime:'text/html'},{mime:'__proto__'},{size:VIDEO_LIMIT+1},{size:-1},{consent:false},{sender_name:''}])assert.throws(()=>videoDetails({...file,...change}));
});
test('album guests need both invitation and code; sandbox payments never unlock live upload access',async()=>{
 let invited=true,live=false;const code='1234-5678-90AB-CDEF-1234-5678',calls=[];
 const db={from(table){calls.push(table);return {select(){return this},eq(key,value){if(table==='album_orders'&&key==='livemode')assert.equal(value,true);return this},limit:async()=>({data:live?[{id:'paid'}]:[]}),maybeSingle:async()=>({data:table==='events'?{creator_id:'host',published:true}:table==='event_guests'?(invited?{id:'guest'}:null):table==='event_gift_access'?{code_hash:codeHash(code)}:{id:'album'}})}}};
 const user={id:'guest',email:'guest@example.com',email_confirmed_at:'yes'};
 assert.equal((await albumAccess(db,user,'event',code)).paid,false);live=true;assert.equal((await albumAccess(db,user,'event',code)).paid,true);
 invited=false;calls.length=0;await assert.rejects(albumAccess(db,user,'event',code),e=>e.status===403);assert.ok(!calls.includes('event_albums'));
 invited=true;await assert.rejects(albumAccess(db,user,'event','bad'),e=>e.status===403);
});
function fixture(){
 process.env.STRIPE_PLATFORM_ACCOUNT_ID='acct_unabl';let order={id:'order',amount_cents:795,livemode:true,stripe_platform_id:'acct_unabl',status:'pending',stripe_session_id:'cs_album'},updates=0;
 const db={from(){let changes;return {select(){return this},eq(){return this},maybeSingle:async()=>({data:order}),update(value){changes=value;return this},in:async(key,states)=>{if(states.includes(order.status)){order={...order,...changes};updates++;}return {data:null};}}}};
 const session={id:'cs_album',payment_status:'paid',metadata:{album_order_id:'order',flow:'album'},livemode:true,client_reference_id:'order',amount_total:795,currency:'usd',payment_intent:'pi_album'};
 const intent={id:'pi_album',metadata:{album_order_id:'order'},status:'succeeded',amount_received:795,currency:'usd',livemode:true,latest_charge:{id:'ch_album',amount:795,currency:'usd',livemode:true,paid:true,disputed:false,amount_refunded:0}};
 const stripe={paymentIntents:{retrieve:async()=>intent}};return {db,session,intent,stripe,get order(){return order},setStatus(value){order.status=value},get updates(){return updates}};
}
test('only confirmed matching album payments activate; retries cannot resurrect refunded albums',async()=>{
 const f=fixture();await fulfillAlbum({...f.session,payment_status:'unpaid'},f.stripe,f.db);assert.equal(f.updates,0);
 await assert.rejects(fulfillAlbum({...f.session,amount_total:1},f.stripe,f.db));assert.equal(f.updates,0);
 await assert.rejects(fulfillAlbum({...f.session,livemode:false},f.stripe,f.db));assert.equal(f.updates,0);
 f.intent.status='processing';await assert.rejects(fulfillAlbum(f.session,f.stripe,f.db));f.intent.status='succeeded';
 await fulfillAlbum(f.session,f.stripe,f.db);assert.equal(f.order.status,'paid');f.setStatus('refunded');await fulfillAlbum(f.session,f.stripe,f.db);assert.equal(f.order.status,'refunded');
});
test('refunded or disputed latest charges block album activation; unrelated checkout is ignored',async()=>{
 const f=fixture();f.intent.latest_charge.amount_refunded=1;await fulfillAlbum(f.session,f.stripe,f.db);assert.equal(f.order.status,'refunded');
 const g=fixture();g.intent.latest_charge.disputed=true;await fulfillAlbum(g.session,g.stripe,g.db);assert.equal(g.order.status,'disputed');
 assert.equal(await processAlbumEvent({type:'checkout.session.completed',data:{object:{metadata:{}}}},g.stripe,g.db),false);
});

test('album service checkout verifies the platform without requiring Connect or Balance access',async()=>{
 process.env.STRIPE_PLATFORM_ACCOUNT_ID='acct_unabl';process.env.STRIPE_SECRET_KEY='rk_live_fixture';
 assert.deepEqual(await albumPaymentScope({accounts:{retrieve:async()=>({id:'acct_unabl'})}}),{platform:'acct_unabl',livemode:true});
 await assert.rejects(albumPaymentScope({accounts:{retrieve:async()=>({id:'acct_other'})}}));
 process.env.STRIPE_SECRET_KEY='rk_test_fixture';assert.equal((await albumPaymentScope({accounts:{retrieve:async()=>({id:'acct_unabl'})}})).livemode,false);
});
