const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
const username=value=>/^[A-Za-z0-9_-]{5,30}$/.test(value.trim().replace(/^@/,''));
const $=id=>document.getElementById(id);
function cardDialog(data){
 let dialog=$('known-card-dialog');if(dialog)dialog.remove();
 dialog=document.createElement('dialog');dialog.id='known-card-dialog';
 dialog.innerHTML='<button type="button" class="known-close" aria-label="Close card">×</button><button type="button" class="known-cover"><span aria-hidden="true">✨ 🎉 ✨</span><strong>A little celebration,<br>just for you</strong><span>Tap to open your card</span></button><article class="known-inside" hidden><span aria-hidden="true">🎊 🎁 🎊</span><h2></h2><p class="known-message"></p><p class="known-from"></p><button type="button" class="known-button">Close card</button></article>';
 dialog.querySelector('h2').textContent=data.title;
 dialog.querySelector('.known-message').textContent=data.message;
 dialog.querySelector('.known-from').textContent='With love, '+data.from;
 const cover=dialog.querySelector('.known-cover'),inside=dialog.querySelector('article');
 cover.onclick=()=>{cover.hidden=true;inside.hidden=false;inside.querySelector('button').focus();};
 inside.querySelector('button').onclick=()=>{inside.hidden=true;cover.hidden=false;cover.focus();};
 dialog.querySelector('.known-close').onclick=()=>dialog.close();document.body.append(dialog);dialog.showModal();
}
function encodeCard(data){return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(data)))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
function decodeCard(value){
 if(value.length>10000)throw Error('Card link is too long.');
 const raw=value.replaceAll('-','+').replaceAll('_','/');const data=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(raw),c=>c.charCodeAt(0))));
 if(!data||typeof data.title!=='string'||data.title.length>140||typeof data.message!=='string'||data.message.length>1200||typeof data.from!=='string'||data.from.length>60)throw Error('Invalid card link.');
 return data;
}
export function initKnownGift({db,getUser,getEvent}){
 const style=document.createElement('style');style.textContent=`
 .known-panel{border:1px solid #b9d8ed;border-radius:16px;background:linear-gradient(135deg,#eff8ff,#fff9ed);padding:20px;margin:20px 0;color:#243348}
 .known-panel h3{font-weight:800;font-size:1.2rem}.known-panel p{margin:8px 0}.known-panel label{display:block;margin:12px 0}.known-panel input:not([type=checkbox]){width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:white}.known-panel small{display:block;color:#526174}
 .known-actions{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}.known-button{display:inline-block;background:#0877bd;color:white;padding:10px 15px;border-radius:9px;font-weight:700;border:0;cursor:pointer}.known-button:disabled{opacity:.5;cursor:not-allowed}.known-outline{background:white;color:#0877bd;border:1px solid #0877bd}.known-panel a{color:#06689f;text-decoration:underline}.known-step{background:white;border-radius:12px;padding:14px;margin:12px 0;border:1px solid #d5e3ed}
 #known-card-dialog{width:min(440px,92vw);padding:24px;border:4px solid #d4a72d;border-radius:20px;box-shadow:0 20px 80px #0005;color:#4d2947;background:#fffdf6}#known-card-dialog::backdrop{background:#14243e99}.known-close{position:absolute;right:10px;top:5px;font-size:26px}.known-cover{width:100%;min-height:370px;background:radial-gradient(circle at 20% 20%,#ffe888 0 8%,transparent 9%),radial-gradient(circle at 85% 80%,#ffe888 0 10%,transparent 11%),linear-gradient(145deg,#f875ac,#a65edc,#5b8ee4);border-radius:10px;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;padding:25px;cursor:pointer}.known-cover strong{font-family:Georgia,serif;font-size:30px}.known-cover span:first-child,.known-inside>span{font-size:36px}.known-inside{text-align:center;padding:25px 5px;min-height:350px}.known-inside h2{font-family:Georgia,serif;font-size:25px;margin:20px 0}.known-message{white-space:pre-wrap;overflow-wrap:anywhere;font-size:18px;line-height:1.6}.known-from{margin:24px 0}.known-cover[hidden],.known-inside[hidden]{display:none}@media(prefers-reduced-motion:no-preference){.known-inside{animation:known-open .35s ease-out}@keyframes known-open{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}}
 `;document.head.append(style);
 if(location.hash.startsWith('#known-card=')){try{cardDialog(decodeCard(location.hash.slice(12)));}catch{const p=document.createElement('p');p.textContent='This card link cannot be opened. Ask the sender for a new link.';document.body.prepend(p);}}

}
