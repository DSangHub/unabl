import {route,config,authenticate,uuid,fail} from '../lib/payment.js';
import {directGiftContacts} from '../lib/direct-gift.js';
export default route(async(req,res)=>{
 const {db,origin}=config(),user=await authenticate(req,db,origin),body=req.body||{};
 if(!uuid(body.event_id))fail('Find a published event first.');
 res.json(await directGiftContacts(db,user,body));
});
