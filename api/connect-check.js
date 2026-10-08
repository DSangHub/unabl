import {route,config,cronAuthorized,fail} from '../lib/payment.js';
// Private sandbox diagnostic. Never creates an account in live mode.
export default route(async(req,res)=>{
 if(!cronAuthorized(req.headers.authorization))fail('Unauthorized',401);
 const {stripe,origin}=config();const balance=await stripe.balance.retrieve();if(balance.livemode)fail('This diagnostic is sandbox only.',403);
 const account=await stripe.v2.core.accounts.create({display_name:'Unabl sandbox onboarding check',contact_email:'unabl-test@example.com',dashboard:'express',identity:{country:'US'},defaults:{responsibilities:{fees_collector:'application',losses_collector:'application'}},configuration:{recipient:{capabilities:{stripe_balance:{stripe_transfers:{requested:true}}}}},metadata:{purpose:'integration_check'}},{idempotencyKey:'unabl_connect_diagnostic_20261008'});
 const link=await stripe.v2.core.accountLinks.create({account:account.id,use_case:{type:'account_onboarding',account_onboarding:{configurations:['recipient'],refresh_url:origin+'/?onboarding=refresh#account',return_url:origin+'/?onboarding=return#account'}}});
 res.json({ready:!!link.url,livemode:false,account_id:account.id});
});
