import {locales,isEnglish} from '../site-locales.js';
import {parts,version} from '../site-catalog.js';
import {translatePart} from '../lib/site-translation.js';

const cache=new Map(), pending=new Map(), rates=new Map();
let windowStart=0,used=0;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const {lang,part,v}=req.query||{};
 if(!locales.has(lang)||isEnglish(lang)||v!==version||typeof part!=='string'||!/^(0|[1-9]\d?)$/.test(part)||!parts[Number(part)]||Object.keys(req.query).length!==3)return res.status(400).json({error:'Invalid language request'});
 if(req.headers['sec-fetch-site']==='cross-site')return res.status(403).json({error:'Open Unabl to translate'});
 if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'Translations unavailable'});
 const id=lang+':'+part;
 try{
  let values=cache.get(id);
  if(!values){
   if(!pending.has(id)){
    const now=Date.now();
    if(now-windowStart>60000){windowStart=now;used=0;rates.clear();}
    const ip=String(req.headers['x-vercel-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
    const count=rates.get(ip)||0;
    if(used>=90||count>=24||pending.size>=16)return res.status(429).json({error:'Translations busy'});
    used++;rates.set(ip,count+1);
    const promise=translatePart(parts[Number(part)],locales.get(lang),process.env.OPENAI_API_KEY).then(result=>{
     if(cache.size>=200)cache.delete(cache.keys().next().value);
     cache.set(id,result);return result;
    }).finally(()=>pending.delete(id));
    pending.set(id,promise);
   }
   values=await pending.get(id);
  }
  res.setHeader('Cache-Control','public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
  return res.json({values});
 }catch(error){
  console.error('Site translation failed',error.message.slice(0,120));
  return res.status(503).json({error:'Translations unavailable'});
 }
}
