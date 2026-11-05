import {locales,localeLabel,isEnglish,direction} from './site-locales.js';
import {parts,version} from './site-catalog.js';

const index=new Map(parts.flatMap((strings,part)=>strings.map((s,i)=>[s,[part,i]])));
const languageKey='unabl-site-language';
const attributes=['aria-label','placeholder','title','alt'];
const excluded='script,style,code,svg,textarea,[contenteditable],[translate="no"],[data-no-translate],#langSelect,#card-language,#card-message,#card-to,#card-from,#eventTitle,#promo-preview-name';
const documents=new Map(), frames=new WeakSet(), translations=new Map(), requests=new Map(), failures=new Map();
const normalize=s=>s.trim().replace(/\s+/g,' ');
let lang='en',scheduled=false,active=0;
try{const saved=localStorage.getItem(languageKey);if(locales.has(saved))lang=saved;}catch{}
const options=[...locales.keys()].sort((a,b)=>locales.get(a).localeCompare(locales.get(b),'en'));
function setupSelect(select){
 if(select.dataset.siteLanguage)return;
 select.dataset.siteLanguage='true';select.setAttribute('translate','no');
 select.removeAttribute('onchange');
 select.replaceChildren(...options.map(code=>new Option(localeLabel(code),code)));
 select.value=lang;
 select.addEventListener('change',()=>selectLanguage(select.value));
}
function makeSelect(host){
 if(!host||host.querySelector('[data-site-language]'))return;
 const select=host.ownerDocument.createElement('select');
 select.setAttribute('aria-label','Language');
 select.style.cssText='display:block;max-width:100%;margin:8px auto;padding:8px;border:1px solid #aaa;border-radius:8px;background:white;color:#222';
 host.prepend(select);setupSelect(select);
}
function selectLanguage(code){
 if(!locales.has(code))return;
 for(const key of failures.keys())if(key.startsWith(code+':'))failures.delete(key);
 lang=code;
 try{localStorage.setItem(languageKey,lang);}catch{}
 if(isEnglish(code))window.setUnablCurrency?.(code==='en-GB'?'GBP':'USD');
 schedule();
}
function attach(doc){
 if(!doc?.body||documents.has(doc))return;
 const observer=new MutationObserver(schedule);
 observer.observe(doc.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:[...attributes,'class','open','hidden']});
 documents.set(doc,{observer,text:new WeakMap(),attrs:new WeakMap()});
}
function schedule(){
 if(scheduled)return;scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;update();});
}
function update(){
 setupSelect(document.getElementById('langSelect')||document.querySelector('[data-site-language]')||makeStandalone());
 makeSelect(document.getElementById('unabl-welcome'));
 makeSelect(document.querySelector('#ecardDialog .ecard-dialog-head'));
 const frame=document.getElementById('ecardEditor');
 if(frame&&!frames.has(frame)){
  frames.add(frame);
  frame.addEventListener('load',()=>{try{attach(frame.contentDocument);schedule();}catch{}});
 }
 try{if(frame?.contentDocument)attach(frame.contentDocument);}catch{}
 const needed=new Set();
 for(const [doc,state] of documents){
  if(doc!==document&&frame?.contentDocument!==doc){state.observer.disconnect();documents.delete(doc);continue;}
  if(doc.documentElement.lang!==lang)doc.documentElement.lang=lang;
  if(doc.documentElement.dir!==direction(lang))doc.documentElement.dir=direction(lang);
  doc.querySelectorAll('[data-site-language]').forEach(select=>{if(select.value!==lang)select.value=lang;});
  doc.body.classList.toggle('rtl-layout',direction(lang)==='rtl');
  const inactive='[hidden],dialog:not([open]),.tab-content:not(.active)';
  const walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
   const node=walker.currentNode, parent=node.parentElement;
   if(!parent||parent.closest(excluded))continue;
   if(parent.closest(inactive)&&!state.text.has(node))continue;
   if(parent.tagName==='OPTION'&&!parent.hasAttribute('value'))parent.value=parent.value;
   replace(node,node.data,state.text,value=>{node.data=value;},needed);
  }
  const title=doc.querySelector('title')?.firstChild;
  if(title)replace(title,title.data,state.text,value=>{title.data=value;},needed);
  doc.querySelectorAll(attributes.map(attr=>'['+attr+']').join(',')).forEach(el=>{
   if(el.closest(excluded)||el.closest(inactive)&&!state.attrs.has(el))return;
   let map=state.attrs.get(el);
   if(!map){map=new Map();state.attrs.set(el,map);}
   for(const attr of attributes)if(el.hasAttribute(attr))replace(attr,el.getAttribute(attr),map,value=>el.setAttribute(attr,value),needed);
  });
 }
 const current=lang;
 const status=document.querySelector('#site-language-status');
 const welcome=document.querySelector('#unabl-welcome');
 const statusHost=welcome?.open?welcome:document.querySelector('#langSelect')?.parentElement||document.body;
 if(status&&status.parentElement!==statusHost)statusHost.append(status);
 if(status){
  const message=isEnglish(lang)?'':needed.size?'Translating…':[...failures.keys()].some(k=>k.startsWith(lang+':'))?'Some translations are temporarily unavailable. English is shown where needed.':'';
  if(status.textContent!==message)status.textContent=message;
 }
 for(const part of needed){
  if(active>=4)break;
  const key=current+':'+part;
  if(requests.has(key)||failures.has(key))continue;
  active++;
  const url='/api/site-language?'+new URLSearchParams({lang:current,part:String(part),v:version});
  const request=fetch(url,{signal:AbortSignal.timeout(38000)}).then(async res=>{
   if(!res.ok)throw Error('Unavailable');
   const {values}=await res.json();
   if(!Array.isArray(values)||values.length!==parts[part].length||values.some(v=>typeof v!=='string'))throw Error('Invalid translation');
   if(translations.size>=90)translations.delete(translations.keys().next().value);
   translations.set(key,values);
  }).catch(()=>failures.set(key,true)).finally(()=>{active--;requests.delete(key);schedule();});
  requests.set(key,request);
 }
}
function replace(key,current,map,write,needed){
 if(!current?.trim())return;
 let record=map.get(key);
 if(!record||current!==record.last){record={source:current,last:current};map.set(key,record);}
 const original=record.source, hit=index.get(normalize(original));
 let value=original;
 if(hit&&!isEnglish(lang)){
  const [part,i]=hit,key=lang+':'+part, group=translations.get(key);
  if(group)value=original.replace(original.trim(),()=>group[i]);
  else if(!failures.has(key))needed.add(part);
 }
 if(value!==current){record.last=value;write(value);}
}
function makeStandalone(){
 makeSelect(document.body);return document.querySelector('[data-site-language]');
}
const status=document.createElement('span');status.id='site-language-status';status.setAttribute('role','status');status.setAttribute('translate','no');status.style.cssText='display:block;text-align:center;font-size:.85rem';
(document.querySelector('#langSelect')?.parentElement||document.body).append(status);
attach(document);update();
