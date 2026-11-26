import Stripe from 'stripe';
import {API_VERSION,fail} from './payment.js';
export const SERVICES=Object.freeze({
 blue_card:{name:'Unabl standard e-card',amount:299},
 gold_card:{name:'Unabl gold-frame e-card',amount:495},
 direct_card:{name:'Unabl downloadable e-card',amount:495},
 recorded_video:{name:'Unabl recorded video · up to 30 seconds',amount:995},
 click_small:{name:'Unabl direct-gift service fee · gift up to $100',amount:175},
 click_medium:{name:'Unabl direct-gift service fee · gift over $100 through $500',amount:295},
 click_large:{name:'Unabl direct-gift service fee · gift over $500',amount:495}
});
export function serviceProduct(sku){if(!Object.hasOwn(SERVICES,sku))fail('Choose an available Unabl service. AI generation and host cash gifts cannot be purchased here.');return SERVICES[sku];}
export function serviceConfig(){
 if(process.env.STRIPE_SERVICE_PAYMENTS_ENABLED!=='true')fail('Stripe service payments are being configured. No charge has been made. Venmo and Cash App remain available.',503);
 const mode=process.env.STRIPE_SECRET_KEY?.match(/^(?:rk|sk)_(live|test)_/);
 if(!mode||!/^acct_[a-zA-Z0-9]+$/.test(process.env.STRIPE_PLATFORM_ACCOUNT_ID||'')||!process.env.APP_URL)fail('Stripe service account setup is incomplete.',503);
 return {stripe:new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:API_VERSION,maxNetworkRetries:2}),origin:new URL(process.env.APP_URL).origin,platform:process.env.STRIPE_PLATFORM_ACCOUNT_ID,livemode:mode[1]==='live'};
}
export async function verifyServiceAccount({stripe,platform}){
 const account=await stripe.accounts.retrieve();
 if(account.id!==platform)fail('Stripe key does not match the configured Unabl account.',503);
 if(!account.charges_enabled)fail('Unabl must finish its Stripe account setup before taking payments.',503);
}
export function serviceSession({sku,requestId,origin}){
 const product=serviceProduct(sku);
 return {mode:'payment',client_reference_id:requestId,line_items:[{quantity:1,price_data:{currency:'usd',unit_amount:product.amount,product_data:{name:product.name}}}],metadata:{flow:'unabl_service',sku,request_id:requestId},payment_intent_data:{metadata:{flow:'unabl_service',sku,request_id:requestId}},success_url:origin+'/?service_session_id={CHECKOUT_SESSION_ID}#service-payment-result',cancel_url:origin+'/?service_payment=cancelled#service-payment-result',custom_text:{submit:{message:'This payment covers the listed Unabl service only. It does not send a monetary gift, deliver flowers, or generate an AI video. Save your card or recorded video on your device before leaving Unabl.'}}};
}
export function serviceStatus(session,scope){
 const product=serviceProduct(session.metadata?.sku);
 if(session.metadata?.flow!=='unabl_service'||session.livemode!==scope.livemode||session.mode!=='payment'||session.amount_total!==product.amount||session.currency!=='usd')fail('Service payment details do not match.',409);
 let status=session.payment_status==='paid'?'paid':session.status==='expired'?'expired':'pending';
 const pi=session.payment_intent;
 if(status==='paid'){
  if(!pi||typeof pi==='string'||pi.status!=='succeeded'||pi.amount_received!==product.amount||pi.currency!=='usd'||pi.livemode!==scope.livemode||pi.metadata?.flow!=='unabl_service'||pi.metadata?.sku!==session.metadata.sku)fail('Service payment is not confirmed.',409);
  const charge=pi.latest_charge;
  if(!charge||typeof charge==='string'||!charge.paid||charge.livemode!==scope.livemode||charge.currency!=='usd'||charge.amount!==product.amount)fail('Service charge is not confirmed.',409);
  if(charge.disputed)status='disputed';else if(charge.amount_refunded>0)status='refunded';
 }
 return {status,name:product.name,amount_cents:product.amount,currency:'usd',livemode:scope.livemode};
}
