export function guestEmails(value){
 const raw=Array.isArray(value)?value:String(value||'').split(/[\s,;]+/);
 if(raw.length>1000)throw Error('Save up to 100 guest email addresses at a time.');
 const emails=[...new Set(raw.map(v=>{if(typeof v!=='string')throw Error('Enter valid guest email addresses.');return v.trim().toLowerCase();}).filter(Boolean))];
 if(!emails.length||emails.length>100)throw Error('Enter 1–100 guest email addresses.');
 if(emails.some(v=>v.length>254||!/^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(v)))throw Error('One or more email addresses are invalid. Check the list; nothing was saved.');
 return emails;
}
