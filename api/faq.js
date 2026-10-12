import {FAQ_CONTEXT,validQuestion,responseText} from '../lib/faq.js';
const buckets=new Map();
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const origin=new URL(process.env.APP_URL||'https://www.unabl.app').origin;
 if(req.headers.origin!==origin)return res.status(403).json({error:'Open the FAQ on Unabl to ask a question.'});
 if(!validQuestion(req.body?.question))return res.status(400).json({error:'Ask a question of 1–600 characters.'});
 const question=req.body.question.trim();
 if(/\b\d[\d -]{7,}\d\b|sk-(?:proj-)?[A-Za-z0-9_-]{15,}/.test(question))return res.status(400).json({error:'Please remove account numbers or other private details. Ask a general setup question.'});
 const now=Date.now(),ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
 for(const [key,value] of buckets)if(now-value.start>60000)buckets.delete(key);
 const bucket=buckets.get(ip)||{start:now,count:0};
 if(bucket.count>=6||buckets.size>=5000&&!buckets.has(ip)){res.setHeader('Retry-After','60');return res.status(429).json({error:'Please wait a minute before asking another question.'});}
 bucket.count++;buckets.set(ip,bucket);
 if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'AI help is unavailable. Please use the answers above.'});
 try{
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_FAQ_MODEL||'gpt-5.4-mini',instructions:FAQ_CONTEXT,input:question,max_output_tokens:600,reasoning:{effort:'none'},store:false}),signal:AbortSignal.timeout(25000)});
  if(!response.ok){console.error('FAQ provider status',response.status);return res.status(503).json({error:'AI help is temporarily unavailable. Please use the answers above.'});}
  const answer=responseText(await response.json());
  if(!answer)return res.status(503).json({error:'No answer was returned. Please try again.'});
  return res.json({answer});
 }catch{ return res.status(503).json({error:'AI help timed out. Please use the answers above or try again.'}); }
}
