import {route,dataConfig,authenticate,uuid,fail} from '../lib/payment.js';
import {directGiftContacts} from '../lib/direct-gift.js';
export default route(async(req,res)=>{
 const {db,origin}=dataConfig(),user=await authenticate(req,db,origin),body=req.body||{};
 if(!uuid(body.event_id))fail('Find a published event first.');
 res.json(await directGiftContacts(db,user,body));
});
