import test from 'node:test';
import assert from 'node:assert/strict';
import {greetingText,greetingResponse,GREETING_PRICE_CENTS} from '../lib/greeting.js';
test('greeting price is separate $9.95 video service and text is bounded',()=>{
 assert.equal(GREETING_PRICE_CENTS,995);assert.equal(greetingText(' Congratulations! '),'Congratulations!');
 for(const value of ['',null,{},' '.repeat(20),'x'.repeat(601)])assert.throws(()=>greetingText(value));
});
test('AI draft extraction accepts only response text blocks',()=>{
 assert.equal(greetingResponse({output:[{content:[{type:'output_text',text:'Congratulations!'},{type:'tool_call',text:'ignore'}]}]}),'Congratulations!');
});
