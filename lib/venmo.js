export function venmoUsername(value){
 const name=typeof value==='string'?value.trim().replace(/^@/,''):'';
 return /^[A-Za-z0-9_-]{5,30}$/.test(name)?name:null;
}
export function knownGiftFees(cents){
 if(!Number.isInteger(cents)||cents<1000||cents>100000)throw Object.assign(new Error('Gift must be $10 to $1,000.'),{status:400});
 return {gift_cents:cents,fee_cents:Math.round(cents*.02)};
}
export const venmoProfile=name=>'https://venmo.com/'+encodeURIComponent(name);
