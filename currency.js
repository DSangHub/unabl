(()=>{
 const select=document.getElementById('currencySelect');
 const allowed=['USD','GBP','EUR'];
 window.unablCurrency='USD';
 window.formatUnablMoney=(amount,digits=2)=>new Intl.NumberFormat(window.unablCurrency==='GBP'?'en-GB':window.unablCurrency==='EUR'?'en-IE':'en-US',{style:'currency',currency:window.unablCurrency,minimumFractionDigits:digits,maximumFractionDigits:digits}).format(amount);
 // Save original price text on the card and promotion previews only.
 const templates=[];
 document.querySelectorAll('.ecard-choice,#promotion-form').forEach(root=>{
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  while(walker.nextNode())if(/\$\d/.test(walker.currentNode.nodeValue))templates.push([walker.currentNode,walker.currentNode.nodeValue]);
 });
 const promoPrice=document.querySelector('#promotion-form')?.parentElement.querySelector('.font-extrabold.text-xl');
 if(promoPrice){const node=[...promoPrice.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&/\$/.test(node.nodeValue));if(node)templates.push([node,node.nodeValue]);}
 window.setUnablCurrency=currency=>{
  if(!allowed.includes(currency))return;
  window.unablCurrency=currency;select.value=currency;
  try{localStorage.setItem('unabl-currency',currency);}catch{}
  const symbol=new Intl.NumberFormat('en-GB',{style:'currency',currency}).formatToParts(0).find(part=>part.type==='currency').value;
  document.getElementById('gift-currency-symbol').textContent=symbol;
  document.getElementById('gift-range-label').textContent=`3. Send Monetary Gift (${window.formatUnablMoney(10,0)} - ${window.formatUnablMoney(1000,0)})`;
  document.getElementById('handling-fee-label').textContent=`${currency==='USD'?'Payment handling fee':'Illustrative handling fee'} (2.9% + ${window.formatUnablMoney(.30)}):`;
  document.querySelectorAll('.gift-btn[onclick]').forEach(button=>{const amount=Number(button.getAttribute('onclick').match(/\d+/)?.[0]);if(amount)button.textContent=window.formatUnablMoney(amount,0);});
  for(const [node,text] of templates)node.nodeValue=text.replace(/\$(\d+(?:\.\d+)?)/g,(_,amount)=>window.formatUnablMoney(Number(amount)));
  const input=document.getElementById('customGift');input.setAttribute('aria-label','Other monetary gift amount in '+currency);
  const notice=document.getElementById('currency-notice');notice.hidden=currency==='USD';notice.textContent=`${currency} price preview only. Numbers are not exchange-rate conversions. Checkout and direct Venmo payments currently use USD; select USD before paying. UK/Euro onboarding and actual processing fees still need configuration.`;
  document.getElementById('gift-checkout').setAttribute('aria-disabled',String(currency!=='USD'));
  window.calculateFees(input.value);
  window.dispatchEvent(new CustomEvent('unabl-currency-change',{detail:{currency}}));
 };
 select.addEventListener('change',()=>window.setUnablCurrency(select.value));
 let saved;try{saved=localStorage.getItem('unabl-currency');}catch{}
 window.setUnablCurrency(allowed.includes(saved)?saved:'USD');
})();
