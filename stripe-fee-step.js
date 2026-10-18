import {clickFeeCents} from './gift-fees.js';
const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
const returned=new Set();let cancelCurrent=null;
window.addEventListener('unabl-account-change',()=>{returned.clear();cancelCurrent?.();});
window.addEventListener('unabl-event-change',()=>cancelCurrent?.());
export function venmoFeeStep({amount,requestId}){
 const fee=clickFeeCents(amount);if(returned.has(requestId))return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const dialog=document.createElement('dialog');dialog.className='known-panel';dialog.style.cssText='width:min(520px,94vw);padding:24px;border:2px solid #bfa36a;border-radius:16px;box-shadow:0 20px 90px #0008';
  dialog.innerHTML='<h3>Unabl click fee · paid separately</h3><p data-amount></p><p>Pay the fee to <strong>@UnablPay through Venmo</strong>, then switch back to this tab to continue to Stripe. The host gift and any displayed payment handling fee are charged separately by Stripe.</p><p><strong>Up to $100: $1.75 · over $100 through $500: $2.95 · over $500: $4.95.</strong></p><p>Venmo profile links do not prefill or submit a payment. Enter the amount yourself and confirm @UnablPay. Provider fees may apply.</p><a data-venmo href="https://venmo.com/UnablPay" target="_blank" rel="noopener noreferrer" class="known-button">Open @UnablPay in Venmo</a><p data-status role="status">No payment has been made here.</p><p>Venmo cannot automatically confirm this fee to Unabl. Returning is navigation only; it does not verify payment. If Stripe setup fails, retry the same gift without paying the click fee again.</p><div class="known-actions"><button data-return type="button" class="known-button" hidden>Return to Gift Portal & continue to Stripe</button><button data-cancel type="button" class="known-button known-outline">Cancel</button></div>';
  dialog.querySelector('[data-amount]').textContent='Gift: '+money(amount)+' · Separate Unabl click fee: '+money(fee)+'. No 2% Unabl fee.';
  let finished=false;const finish=ok=>{if(finished)return;finished=true;cancelCurrent=null;if(ok)returned.add(requestId);dialog.close();dialog.remove();ok?resolve():reject(Error('Checkout cancelled. No Stripe charge has been made.'));};
  dialog.querySelector('[data-venmo]').onclick=()=>{dialog.querySelector('[data-return]').hidden=false;dialog.querySelector('[data-status]').textContent='In Venmo, pay '+money(fee)+' to @UnablPay with note “Unabl click fee”. Then return to this tab. Fee status: unverified.';};
  dialog.querySelector('[data-return]').onclick=()=>finish(true);dialog.querySelector('[data-cancel]').onclick=()=>finish(false);dialog.oncancel=e=>{e.preventDefault();finish(false);};cancelCurrent=()=>finish(false);document.body.append(dialog);dialog.showModal();
 });
}
export function initStripeFeeQuote(){
 const label=document.getElementById('breakdownUnabl').previousElementSibling;label.textContent='Unabl click fee · separate Venmo payment:';
 document.getElementById('breakdownTotal').previousElementSibling.textContent='Stripe checkout total (excludes Venmo fee):';
 const help=document.createElement('p');help.className='text-xs text-slate-600 mt-2';help.textContent='Unabl click fee goes separately to @UnablPay via Venmo: up to $100 $1.75; over $100 through $500 $2.95; over $500 $4.95. No 2% Unabl fee. Venmo fee payments are unverified.';document.getElementById('breakdownTotal').parentElement.parentElement.after(help);
 window.calculateFees=value=>{let amount=Number(value);if(!Number.isFinite(amount))amount=10;const cents=Math.round(Math.max(10,Math.min(1000,amount))*100),click=clickFeeCents(cents),handling=Math.round(cents*.029)+30,total=cents+handling;const format=n=>window.formatUnablMoney?window.formatUnablMoney(n/100):money(n);
  for(const [id,n] of [['breakdownGift',cents],['breakdownUnabl',click],['breakdownStripe',handling],['breakdownTotal',total],['btnPayTotal',total]])document.getElementById(id).textContent=format(n);
 };
 document.getElementById('gift-checkout').firstChild.textContent='Pay Venmo click fee & continue to Stripe · ';
 window.calculateFees(document.getElementById('customGift').value);
}
