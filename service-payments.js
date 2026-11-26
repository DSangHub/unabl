const requestKeys=new Map();
export async function payForService(sku,button,status){
 button.disabled=true;status.textContent='Opening secure Stripe checkout…';
 try{
  if(!requestKeys.has(sku))requestKeys.set(sku,crypto.randomUUID());
  const response=await fetch('/api/service-checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sku,request_id:requestKeys.get(sku)})});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to open Stripe checkout.');
  const target=new URL(result.url);if(target.protocol!=='https:'||target.hostname!=='checkout.stripe.com')throw Error('Invalid Stripe checkout address.');
  location.assign(target.href);
 }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
}
// Event delegation also supports payment panels inside dialogs created later.
document.addEventListener('click',event=>{
 const button=event.target.closest?.('[data-stripe-service]');if(!button)return;
 const panel=button.closest('[data-service-panel]'),status=panel?.querySelector('[data-service-status]');
 if(status)payForService(button.dataset.stripeService,button,status);
});
const query=new URLSearchParams(location.search);
if(query.has('service_session_id')||query.has('service_payment')){
 const section=document.createElement('section');section.id='service-payment-result';section.setAttribute('role','status');section.style.cssText='padding:24px;margin:20px auto;max-width:800px;border:2px solid #65427e;border-radius:12px;background:#fff8ed;color:#301b39';
 document.body.prepend(section);
 if(query.has('service_payment'))section.textContent='Stripe checkout cancelled. No completed payment has been confirmed. Your host gift is separate.';
 else {
  section.textContent='Checking your service payment with Stripe…';
  fetch('/api/service-payment-status?session_id='+encodeURIComponent(query.get('service_session_id'))).then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to check payment.');section.textContent=(data.status==='paid'?'Stripe confirms payment received: ':data.status==='pending'?'Payment pending: ':'Payment status: '+data.status+' · ')+data.name+' · $'+(data.amount_cents/100).toFixed(2)+(data.livemode?'':' · TEST PAYMENT')+'. This is a service payment only. No cash gift has been sent to a host. Return to your saved card/video to share it.';}).catch(error=>section.textContent=error.message);
 }
}
