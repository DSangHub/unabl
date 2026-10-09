import Stripe from 'stripe';
import {createClient} from '@supabase/supabase-js';
import {timingSafeEqual} from 'node:crypto';
export const API_VERSION='2026-08-26.dahlia';
export const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function fail(message,status=400){throw Object.assign(new Error(message),{status});}
export function check(result){if(result.error)throw new Error('Database operation failed');return result.data;}
export function config(){
 const required=['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','SUPABASE_SECRET_KEY','APP_URL'];
 if(required.some(key=>!process.env[key]))fail('Payment setup is incomplete. Please try again later.',503);
 const origin=new URL(process.env.APP_URL).origin;
 return {origin,stripe:new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:API_VERSION,maxNetworkRetries:2}),db:createClient(process.env.SUPABASE_URL||'https://jbcxodpudujoscdafovx.supabase.co',process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}})};
}
export function enabled(){if(process.env.PAYMENTS_ENABLED!=='true')fail('Payments are being configured. No charge has been made.',503);}
export async function authenticate(req,db,origin){
 if(req.headers.origin&&req.headers.origin!==origin)fail('Invalid origin',403);
 const token=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];if(!token)fail('Sign in first.',401);
 const {data,error}=await db.auth.getUser(token);if(error||!data.user?.email_confirmed_at)fail('Confirm your email and sign in.',401);return data.user;
}
export function route(handler,methods=['POST']){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(!methods.includes(req.method))return res.status(405).json({error:'Method not allowed'});
 try{await handler(req,res);}catch(e){if(!e.status)console.error('Payment operation failed',e.type||e.code||'internal');const stripeSetupError=['StripeInvalidRequestError','StripePermissionError'].includes(e.type);const message=stripeSetupError?'Stripe setup: '+String(e.message).replace(/(?:sk|rk|pk)_(?:test|live)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|sb_secret_[A-Za-z0-9_-]+/g,'[redacted]'):e.status?e.message:'Unable to complete this operation. Please try again.';res.status(e.status||(stripeSetupError?409:503)).json({error:message});}
};}
export function fees(amount){if(!Number.isInteger(amount)||amount<1000||amount>100000)fail('Gift must be $10 to $1,000.');const platform=Math.round(amount*.02),processing=Math.round(amount*.029)+30;return {gift:amount,platform,processing,total:amount+platform+processing};}
export function active(account){return account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status==='active';}
const scopeCache=new WeakMap();
export async function stripeScope(stripe){
 if(!scopeCache.has(stripe))scopeCache.set(stripe,Promise.all([stripe.balance.retrieve(),stripe.accounts.retrieve()]).then(([balance,account])=>{
  if(process.env.STRIPE_PLATFORM_ACCOUNT_ID&&account.id!==process.env.STRIPE_PLATFORM_ACCOUNT_ID)fail('Stripe key does not match the configured Unabl account.',503);
  return {livemode:balance.livemode,platform:account.id};
 }));return scopeCache.get(stripe);
}
export function inScope(query,scope){return query.eq('stripe_platform_id',scope.platform).eq('livemode',scope.livemode);}
export async function accountStatus(stripe,db,creator){
 const scope=await stripeScope(stripe);const row=check(await inScope(db.from('creator_stripe_accounts').select('*').eq('creator_id',creator),scope).maybeSingle());if(!row)return {ready:false,scope};
 const account=await stripe.v2.core.accounts.retrieve(row.stripe_account_id,{include:['configuration.recipient','requirements']});
 if(typeof account.livemode==='boolean'&&account.livemode!==scope.livemode)fail('Stripe recipient environment mismatch',409);
 const ready=active(account);check(await inScope(db.from('creator_stripe_accounts').update({transfers_active:ready,checked_at:new Date().toISOString()}).eq('creator_id',creator),scope));
 // Capability readiness is not an identity approval or a fraud-review decision.
 const verification=check(await db.from('creator_verifications').select('creator_id').eq('creator_id',creator).maybeSingle());
 if(verification)check(await db.from('creator_verifications').update({stripe_verified:ready&&scope.livemode}).eq('creator_id',creator));
 else{const result=await db.from('creator_verifications').insert({creator_id:creator,stripe_verified:ready&&scope.livemode});if(result.error?.code==='23505')check(await db.from('creator_verifications').update({stripe_verified:ready&&scope.livemode}).eq('creator_id',creator));else check(result);}
 return {ready,account,row,scope};
}
export function cronAuthorized(header){const expected=process.env.CRON_SECRET;if(!expected)return false;const a=Buffer.from(header||''),b=Buffer.from('Bearer '+expected);return a.length===b.length&&timingSafeEqual(a,b);}
