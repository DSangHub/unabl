import {venmoUsername,venmoProfile} from './venmo.js';
import {check,fail} from './payment.js';
import {requireInvitedGuest,requireGiftCode} from './event-guests.js';
export const DIRECT_CLICK_FEE_CENTS=175;
export const DIRECT_FEE_USERNAME='UnablPay';
export function directVenmoContact(value){if(!String(value||'').trim())return '';const name=venmoUsername(value);if(!name)fail('Enter a valid Venmo username (5–30 letters, numbers, underscores or hyphens).');if(name.toLowerCase()===DIRECT_FEE_USERNAME.toLowerCase())fail('Use the host’s Venmo account, not Unabl’s fee account.');return name;}
export function walletContact(value,phoneOnly=false){
 const contact=String(value||'').trim();if(!contact)return '';
 const phone=/^\+?[0-9 ()-]{7,25}$/.test(contact)&&contact.replace(/\D/g,'').length>=10;
 const email=contact.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
 if(!phone&&(!email||phoneOnly))fail(phoneOnly?'Enter the phone number registered to Samsung Wallet.':'Enter your Apple Cash phone number or email.');
 return contact;
}
export async function directGiftContacts(db,user,body){
 const event=check(await db.from('events').select('id,creator_id,published').eq('id',body.event_id).eq('published',true).maybeSingle());
 if(!event)fail('Published event not found.',404);
 if(event.creator_id===user.id)fail('You cannot send a gift to yourself.');
 await requireInvitedGuest(db,event.id,user);await requireGiftCode(db,event.id,body.access_code);
 const contacts=check(await db.from('event_direct_contacts').select('apple_cash,samsung_wallet,venmo').eq('event_id',event.id).maybeSingle());
 return {contacts:contacts||{apple_cash:'',samsung_wallet:'',venmo:''},unabl_fee_cents:DIRECT_CLICK_FEE_CENTS,fee_username:DIRECT_FEE_USERNAME,fee_url:venmoProfile(DIRECT_FEE_USERNAME),fee_payment_status:'not_verified',payment_verified:false};
}
