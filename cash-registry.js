import {MAX_REGISTRY_FUNDS,dollarsToCents,registryFunds} from './cash-registry-values.js';

const money=cents=>new Intl.NumberFormat(document.documentElement.lang||'en',{style:'currency',currency:'USD'}).format(cents/100);
function el(tag,text='',className=''){
 const element=document.createElement(tag);
 element.textContent=text;element.className=className;return element;
}
function statusLine(){
 const p=el('p','','text-sm mt-2');p.setAttribute('role','status');return p;
}
function button(text,classes='host-save-button'){
 const b=el('button',text,classes);b.type='button';return b;
}
async function loadFunds(db,id){
 const {data,error}=await db.from('event_cash_registries').select('funds').eq('event_id',id).maybeSingle();
 if(error)throw Error('The cash gift registry could not load. Try again.');
 return registryFunds(data?.funds||[]);
}

export function mountHostRegistry(container,event,db,request){
 const panel=el('details','','mt-4 rounded-xl border p-3');
 const summary=el('summary','Create / manage cash gift registry','font-bold cursor-pointer');
 const intro=el('p','Add funds such as a honeymoon, new home, or celebration. Your registry is shown on your published event page. Guests send gifts directly to your wallet.','text-sm my-2');
 const form=el('form'),fieldset=el('fieldset'),rows=el('div','','space-y-3');
 const add=button('Add a fund'),save=button('Save cash gift registry');
 save.type='submit';
 const status=statusLine(),retry=button('Reload registry');
 retry.hidden=true;
 fieldset.disabled=true;
 form.append(fieldset);
 fieldset.append(rows,add,document.createTextNode(' '),save);
 panel.append(summary,intro,form,status,retry);container.append(panel);
 let loaded=false,loading=false;
 function input(label,value,attributes){
  const wrap=el('label',label,'block text-sm font-semibold mt-2');
  const field=el(attributes.multiline?'textarea':'input','','block w-full border rounded-lg p-2 font-normal');
  const {multiline,...attrs}=attributes;
  Object.assign(field,attrs);field.value=value??'';wrap.append(field);return {wrap,field};
 }
 function addFund(fund={}){
  if(rows.children.length>=MAX_REGISTRY_FUNDS)return;
  const row=el('div','','border rounded-lg p-3 bg-white');
  const name=input('Fund name',fund.name,{maxLength:60,required:true,placeholder:'Honeymoon fund'});
  const description=input('Description (optional)',fund.description,{multiline:true,maxLength:240,rows:2});
  const suggested=input('Suggested gift (USD)',(fund.suggested_cents??5000)/100,{type:'number',step:'0.01',min:'10',max:'1000',required:true});
  const goal=input('Fund goal in USD (optional)',fund.goal_cents==null?'':fund.goal_cents/100,{type:'number',step:'0.01',min:'10',max:'1000000'});
  const remove=button('Remove fund','text-sm underline mt-2');
  remove.onclick=()=>{row.remove();add.disabled=false;};
  row.append(name.wrap,description.wrap,suggested.wrap,goal.wrap,remove);
  row.readFund=()=>({name:name.field.value,description:description.field.value,suggested_cents:dollarsToCents(suggested.field.value),goal_cents:goal.field.value?(dollarsToCents(goal.field.value)??NaN):null});
  rows.append(row);add.disabled=rows.children.length>=MAX_REGISTRY_FUNDS;
 }
 async function load(){
  if(loading||loaded)return;
  loading=true;retry.hidden=true;status.textContent='Loading cash gift registry…';
  try{
   const funds=await loadFunds(db,event.id);
   funds.forEach(addFund);loaded=true;fieldset.disabled=false;
   status.textContent=funds.length?'':'No funds yet. Add a fund to start your registry.';
  }catch(error){status.textContent=error.message;retry.hidden=false;}
  finally{loading=false;}
 }
 add.onclick=()=>addFund();
 retry.onclick=load;
 panel.addEventListener('toggle',()=>{if(panel.open)load();});
 form.onsubmit=async e=>{
  e.preventDefault();if(!loaded||fieldset.disabled)return;
  try{
   const funds=registryFunds(Array.from(rows.children,row=>row.readFund()));
   fieldset.disabled=true;status.textContent='Saving cash gift registry…';
   await request('/api/event-guests',{action:'save_registry',event_id:event.id,funds});
   status.textContent=funds.length?'Registry saved. Guests can see it on your published event page.':'Registry cleared from your event page.';
   window.dispatchEvent(new Event('unabl-registry-updated'));
  }catch(error){status.textContent=error.message;}finally{fieldset.disabled=false;}
 };
}

export function initGuestRegistry({db,getEvent}){
 const panel=el('section','','rounded-xl border border-amber-200 bg-amber-50 p-3');
 const title=el('h3','Cash gift registry','font-bold');
 const list=el('div','','space-y-2 mt-2'),status=statusLine();
 panel.hidden=true;panel.append(title,list,status);
 document.getElementById('gift-range-label').parentElement.after(panel);
 let selected=null,version=0;
 async function load(){
  const at=++version,event=getEvent();
  selected=null;panel.hidden=true;list.replaceChildren();status.textContent='';
  if(!event)return;
  let funds;
  try{funds=await loadFunds(db,event.id);}catch{return;}
  if(at!==version||!funds.length)return;
  const choices=[];
  for(const fund of funds){
   const item=el('div','','rounded-lg border border-amber-200 bg-white p-3');
   const name=el('p',fund.name,'font-semibold break-words');name.setAttribute('translate','no');
   item.append(name);
   if(fund.description){const description=el('p',fund.description,'text-sm break-words');description.setAttribute('translate','no');item.append(description);}
   const suggested=el('p','','text-sm');
   suggested.append(el('span','Suggested gift:'),document.createTextNode(' '+money(fund.suggested_cents)));
   item.append(suggested);
   if(fund.goal_cents){const goal=el('p','','text-sm');goal.append(el('span','Fund goal:'),document.createTextNode(' '+money(fund.goal_cents)));item.append(goal);}
   const use=button('Choose this fund','rounded-lg bg-amber-800 text-white px-3 py-2 mt-2 text-sm font-semibold');
   use.setAttribute('aria-pressed','false');
   use.setAttribute('aria-label','Choose this fund: '+fund.name);
   choices.push(use);
   use.onclick=()=>{
    if((window.unablCurrency||'USD')!=='USD'){status.textContent='Select USD to use the suggested gift amount.';return;}
    selected=fund.name;
    for(const choice of choices){choice.setAttribute('aria-pressed',String(choice===use));choice.classList.toggle('ring-2',choice===use);choice.classList.toggle('ring-amber-500',choice===use);}
    window.setGiftAmount(fund.suggested_cents/100);
    window.dispatchEvent(new Event('unabl-gift-fund-change'));
    const fundLabel=el('strong',fund.name);fundLabel.setAttribute('translate','no');
    status.replaceChildren(el('span','Selected fund:'),document.createTextNode(' '),fundLabel,el('span',' You can change the amount below.'));
   };
   item.append(use);list.append(item);
  }
  const general=button('Send a gift without choosing a fund','text-sm underline mt-2');
  general.onclick=()=>{
   selected=null;
   for(const choice of choices){choice.setAttribute('aria-pressed','false');choice.classList.remove('ring-2','ring-amber-500');}
   status.textContent='No registry fund selected.';
   window.dispatchEvent(new Event('unabl-gift-fund-change'));
  };
  list.append(general);panel.hidden=false;
 }
 window.addEventListener('unabl-event-change',load);
 window.addEventListener('unabl-registry-updated',()=>{window.dispatchEvent(new Event('unabl-gift-fund-change'));load();});
 load();
 return ()=>selected;
}
