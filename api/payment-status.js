import {route,config,authenticate,check,fail,stripeScope,inScope} from '../lib/payment.js';
export default route(async(req,res)=>{
 const {stripe,db,origin}=config(),user=await authenticate(req,db,origin),id=req.query.session_id;
 if(typeof id!=='string'||!/^cs_[a-zA-Z0-9_]+$/.test(id))fail('Invalid payment reference');
 const scope=await stripeScope(stripe);const order=check(await inScope(db.from('checkout_orders').select('status,gift_cents').eq('stripe_session_id',id).eq('donor_id',user.id),scope).maybeSingle());if(!order)fail('Payment not found.',404);res.json(order);
},['GET']);
