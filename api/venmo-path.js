import {createClient} from '@supabase/supabase-js';
import {route,authenticate,uuid,check,fail} from '../lib/payment.js';
import {venmoUsername,knownGiftFees,venmoProfile} from '../lib/venmo.js';

export async function prepareVenmoPath(db,user,body,feeUsername){
 if(body?.knows_creator!==true)fail('Confirm that you personally know this event creator.');
 if(!uuid(body.event_id))fail('Find a published event first.');
 const amounts=knownGiftFees(body.amount_cents);
 const event=check(await db.from('events').select('id,creator_id,title,hashtag').eq('id',body.event_id).eq('published',true).maybeSingle());
 if(!event)fail('This event is not published.',404);
 if(event.creator_id===user.id)fail('You cannot send a gift to your own event.');
 const creator=check(await db.from('event_creators').select('user_id').eq('user_id',event.creator_id).maybeSingle());
 if(!creator)fail('Event creator unavailable.',409);
 const {data,error}=await db.auth.admin.getUserById(event.creator_id);
 if(error)fail('Event creator unavailable.',409);
 // Public contact preference, never an authorization or verification claim.
 const recipient=venmoUsername(data.user?.user_metadata?.unabl_venmo_username);
 if(!recipient)fail('This creator has not added a Venmo username. Ask them to add it in My account.',409);
 const fee=venmoUsername(feeUsername);
 if(!fee)fail('Unabl’s Venmo fee account is not configured yet. You can still preview your festive card.',503);
 if(recipient.toLowerCase()===fee.toLowerCase())fail('The creator and Unabl fee accounts must be different.',409);
 return {...amounts,event_title:event.title,hashtag:event.hashtag,recipient_username:recipient,recipient_url:venmoProfile(recipient),fee_username:fee,fee_url:venmoProfile(fee),payment_status:'not_verified'};
}
export default route(async(req,res)=>{
 if(!process.env.SUPABASE_SECRET_KEY||!process.env.APP_URL)fail('Venmo setup is incomplete.',503);
 const db=createClient(process.env.SUPABASE_URL||'https://jbcxodpudujoscdafovx.supabase.co',process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const user=await authenticate(req,db,new URL(process.env.APP_URL).origin);
 res.json(await prepareVenmoPath(db,user,req.body,process.env.VENMO_FEE_USERNAME));
});
