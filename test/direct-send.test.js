import test from 'node:test';
import assert from 'node:assert/strict';
import {recipientEmail,recipientVenmo,emailDraft,greetingDetails,shortVideo} from '../direct-send-utils.js';
test('standalone recipient validates a single email and safely encodes draft content',()=>{
 assert.equal(recipientEmail(' rose@example.com '),'rose@example.com');
 for(const email of ['rose@example.com?bcc=other@example.com','a@example.com\r\nBcc:b@example.com','a@example.com,b@example.com','bad','a@example.com;other@example.com'])assert.throws(()=>recipientEmail(email));
 const url=emailDraft('rose@example.com','Congratulations & love','Hello\n&bcc=attacker@example.com');const params=new URLSearchParams(url.split('?')[1]);assert.equal(params.get('subject'),'Congratulations & love');assert.equal(params.get('body'),'Hello\n&bcc=attacker@example.com');assert.equal(params.has('bcc'),false);
});
test('standalone Venmo recipient cannot redirect to a URL or the fee account',()=>{
 assert.equal(recipientVenmo('@Rose-Gifts'),'Rose-Gifts');for(const v of ['UnablPay','unablpay','https://evil.example','Rose?amount=5','abcd'])assert.throws(()=>recipientVenmo(v));
});
test('card names, titles and messages are bounded; videos are short and size limited',()=>{
 assert.equal(greetingDetails({to:'Rose',from:'Dan',title:'Congrats!',message:'Well done!'}).to,'Rose');assert.throws(()=>greetingDetails({to:'Rose',from:'Dan',title:'Congrats!',message:'x'.repeat(801)}));
 assert.equal(shortVideo({type:'video/mp4',size:1024},30),true);
 for(const [file,duration] of [[{type:'text/html',size:1024},2],[{type:'video/mp4',size:26*1024*1024},2],[{type:'video/mp4',size:1024},31],[{type:'video/mp4',size:1024},Infinity]])assert.throws(()=>shortVideo(file,duration));
});
