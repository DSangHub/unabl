import {route,config,authenticate,check,fail,accountStatus,stripeScope,inScope} from '../lib/payment.js';
export default route(async(req,res)=>{
 const {stripe,db,origin}=config(),user=await authenticate(req,db,origin);
 const creator=check(await db.from('event_creators').select('organizer_name').eq('user_id',user.id).maybeSingle());if(!creator)fail('Create an event creator account first.',403);
 const scope=await stripeScope(stripe);let row=check(await inScope(db.from('creator_stripe_accounts').select('*').eq('creator_id',user.id),scope).maybeSingle());
 if(req.body?.action==='status'&&!row)return res.json({ready:false,livemode:scope.livemode,message:'Connect your bank with Stripe to start live onboarding. Existing sandbox bank connections do not carry over.'});
 if(!row){const account=await stripe.v2.core.accounts.create({display_name:creator.organizer_name,contact_email:user.email,dashboard:'express',identity:{country:'US'},defaults:{responsibilities:{fees_collector:'application',losses_collector:'application'}},configuration:{recipient:{capabilities:{stripe_balance:{stripe_transfers:{requested:true}}}}},metadata:{creator_id:user.id}},{idempotencyKey:'creator_'+scope.platform+'_'+user.id});
 check(await db.from('creator_stripe_accounts').upsert({creator_id:user.id,stripe_account_id:account.id,livemode:scope.livemode,stripe_platform_id:scope.platform},{onConflict:'creator_id,stripe_platform_id'}));row={stripe_account_id:account.id};}
 if(req.body?.action==='status'){const result=await accountStatus(stripe,db,user.id);return res.json({ready:result.ready,livemode:scope.livemode,message:result.ready?'Stripe onboarding complete. Identity review and three donor vouches are still required.':'Complete the outstanding Stripe requirements.'});}
 const link=await stripe.v2.core.accountLinks.create({account:row.stripe_account_id,use_case:{type:'account_onboarding',account_onboarding:{configurations:['recipient'],refresh_url:origin+'/?onboarding=refresh#account',return_url:origin+'/?onboarding=return#account'}}});res.json({url:link.url,livemode:scope.livemode});
});
