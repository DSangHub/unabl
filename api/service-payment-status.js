import {route,fail} from '../lib/payment.js';
import {serviceConfig,verifyServiceAccount,serviceStatus} from '../lib/service-checkout.js';
export default route(async(req,res)=>{
 const scope=serviceConfig(),id=req.query?.session_id;
 if(typeof id!=='string'||!/^cs_(?:test|live)_[a-zA-Z0-9]{8,200}$/.test(id))fail('Invalid service payment reference.');
 await verifyServiceAccount(scope);
 const session=await scope.stripe.checkout.sessions.retrieve(id,{expand:['payment_intent.latest_charge']});
 res.json(serviceStatus(session,scope));
},['GET']);
