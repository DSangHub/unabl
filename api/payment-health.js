import {route,config,cronAuthorized,fail} from '../lib/payment.js';
export default route(async(req,res)=>{
 if(!cronAuthorized(req.headers.authorization))fail('Unauthorized',401);
 const missing=['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','SUPABASE_SECRET_KEY'].filter(k=>!process.env[k]);if(missing.length)return res.status(503).json({ready:false,missing});
 const {stripe,db}=config();const [balance,account,result]=await Promise.all([stripe.balance.retrieve(),stripe.accounts.retrieve(),db.from('checkout_orders').select('id').limit(1)]);
 res.json({ready:!result.error,livemode:balance.livemode,stripe_account:account.id,database:result.error?'unavailable':'connected'});
},['GET']);
