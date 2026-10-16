import {check,fail} from './payment.js';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
export const codeHash=code=>createHash('sha256').update(String(code||'').trim().replace(/-/g,'').toUpperCase()).digest('hex');
export function newGiftCode(){const raw=randomBytes(12).toString('hex').toUpperCase();return raw.match(/.{4}/g).join('-');}
export async function requireGiftCode(db,eventId,code){
 if(typeof code!=='string'||!/^([a-f0-9]{4}-){5}[a-f0-9]{4}$|^[a-f0-9]{24}$/i.test(code.trim()))fail('Enter the gift access code supplied by the host.',403);
 const row=check(await db.from('event_gift_access').select('code_hash').eq('event_id',eventId).maybeSingle());
 if(!row||!timingSafeEqual(Buffer.from(row.code_hash,'hex'),Buffer.from(codeHash(code),'hex')))fail('Invalid gift access code. Ask the host for the current code.',403);
}
export function guestEmail(value){
 const email=String(value||'').trim().toLowerCase();
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Enter a valid guest email address.');
 return email;
}
export async function requireInvitedGuest(db,eventId,user){
 if(!user?.email_confirmed_at||!user.email)fail('Confirm your email and sign in.',401);
 const email=guestEmail(user.email);
 const guest=check(await db.from('event_guests').select('id').eq('event_id',eventId).eq('email',email).maybeSingle());
 if(!guest)fail('Only invited guests can send gifts. Ask the host to add your sign-in email to this event’s guest list.',403);
 return guest;
}
