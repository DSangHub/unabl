import test from 'node:test';
import assert from 'node:assert/strict';
import {initDirectGift} from '../direct-gift.js';

test('incomplete guest code is explained beside the gift button; a complete code reveals wallet choices',async()=>{
 const node=()=>({style:{},setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]},replaceChildren(){this.childElementCount=0},append(){this.childElementCount=(this.childElementCount||0)+1},addEventListener(){},scrollIntoView(){this.scrolled=true}});
 const checkout=node(),code=node(),status=node(),options=node();
 checkout.after=feedback=>{checkout.feedback=feedback;feedback.querySelector=s=>s==='[data-status]'?status:options;};
 globalThis.document={createElement:node,getElementById:id=>({'gift-checkout':checkout,'gift-access-code':code,customGift:{value:'100'}}[id])};
 globalThis.window={addEventListener(){}};
 let calls=0;
 initDirectGift({getEvent:()=>({id:'test'}),request:async()=>{calls++;return {unabl_fee_cents:175,fee_username:'UnablPay',fee_url:'https://venmo.com/UnablPay',contacts:{venmo:'synthetic'}}}});
 code.value='AAAA-BBBB-CCCC-DDDD-EEEE';
 await checkout.onclick();
 assert.match(status.textContent,/six groups/);
 assert.equal(code['aria-invalid'],'true');
 assert.equal(calls,0);
 assert.equal(checkout.feedback.hidden,false);
 assert.equal(checkout.feedback.scrolled,true);
 code.value+='-FFFF';
 await checkout.onclick();
 assert.equal(calls,1);
 assert.equal(options.childElementCount,1);
 assert.match(status.textContent,/Choose your gift method/);
});
