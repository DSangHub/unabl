import {route,config,cronAuthorized,check,fail,stripeScope} from '../lib/payment.js';
import {releaseJob} from '../lib/releases.js';
export default route(async(req,res)=>{
 if(!cronAuthorized(req.headers.authorization))fail('Unauthorized',401);
 if(process.env.RELEASES_ENABLED!=='true')return res.json({enabled:false});
 const {stripe,db}=config(),scope=await stripeScope(stripe),jobs=check(await db.rpc('claim_gift_releases',{platform_key:scope.platform,live_mode:scope.livemode}));let released=0,blocked=0,failed=0;
 for(const job of jobs){try{const status=await releaseJob(job,stripe,db);if(status==='released')released++;else blocked++;}catch{failed++;console.error('Gift release requires retry',job.id);}}
 res.status(failed?503:200).json({released,blocked,failed});
},['GET']);
