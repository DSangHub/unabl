export const GREETING_PRICE_CENTS=495;
export const GREETING_MAX_CHARS=600;
export function greetingText(value){
 if(typeof value!=='string'||!value.trim()||value.trim().length>GREETING_MAX_CHARS)throw Object.assign(new Error('Write a greeting of 1–600 characters.'),{status:400});
 return value.trim();
}
export function greetingResponse(data){return (data.output||[]).flatMap(item=>item.content||[]).filter(item=>item.type==='output_text').map(item=>item.text).join('\n').trim();}
