import {fail,fees} from './payment.js';
export function bankFees(amount){const quote=fees(amount);return {...quote,processing:0,total:quote.gift+quote.platform};}
export function validateBankConfiguration(config,scope){
 if(!config?.active||config.livemode!==scope.livemode||!config.us_bank_account?.available||config.us_bank_account.display_preference?.value!=='on')fail('Knows bank checkout is not available yet. The Unabl Stripe account needs an active ACH-only payment configuration.',503);
 for(const [name,value] of Object.entries(config))if(name!=='us_bank_account'&&value&&typeof value==='object'&&value.display_preference?.value==='on')fail('Knows bank checkout is blocked because another payment method is enabled. No charge has been made.',503);
}
export async function bankConfiguration(stripe,scope){
 const id=process.env.STRIPE_BANK_PAYMENT_CONFIGURATION;
 if(!id||!/^pmc_[A-Za-z0-9]+$/.test(id))fail('Knows bank checkout is being configured. No charge has been made.',503);
 const config=await stripe.paymentMethodConfigurations.retrieve(id);validateBankConfiguration(config,scope);return id;
}
export const onlyBankMethods=methods=>Array.isArray(methods)&&methods.length===1&&methods[0]==='us_bank_account';
