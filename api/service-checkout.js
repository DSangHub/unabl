import {route,fail,uuid} from '../lib/payment.js';
import {serviceConfig,serviceProduct,serviceSession,verifyServiceAccount} from '../lib/service-checkout.js';
export default route(async(req,res)=>{
 const scope=serviceConfig();
 if(req.headers.origin!==scope.origin)fail('Invalid origin',403);
 const {sku,request_id}=req.body||{};serviceProduct(sku);
 if(!uuid(request_id))fail('Reload the payment page and try again.');
 await verifyServiceAccount(scope);
 const session=await scope.stripe.checkout.sessions.create(serviceSession({sku,requestId:request_id,origin:scope.origin}),{idempotencyKey:'unabl_service_'+sku+'_'+request_id});
 res.json({url:session.url});
});
