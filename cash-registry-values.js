export const MAX_REGISTRY_FUNDS=8;

export function dollarsToCents(value){
 const text=String(value??'').trim();
 if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(text))return null;
 return Math.round(Number(text)*100);
}

export function registryFunds(input){
 if(!Array.isArray(input)||input.length>MAX_REGISTRY_FUNDS)throw Error('Add up to eight cash gift funds.');
 const names=new Set();
 return input.map(fund=>{
  const name=typeof fund?.name==='string'?fund.name.trim():'';
  const description=typeof fund?.description==='string'?fund.description.trim():'';
  if(!name||name.length>60||description.length>240)throw Error('Enter a fund name up to 60 characters and a description up to 240 characters.');
  const key=name.toLowerCase();
  if(names.has(key))throw Error('Give each cash gift fund a different name.');
  names.add(key);
  const suggested_cents=fund.suggested_cents,goal_cents=fund.goal_cents??null;
  if(!Number.isInteger(suggested_cents)||suggested_cents<1000||suggested_cents>100000)throw Error('Set a suggested gift between $10 and $1,000.');
  if(goal_cents!==null&&(!Number.isInteger(goal_cents)||goal_cents<suggested_cents||goal_cents>100000000))throw Error('Set an optional goal at least as large as the suggested gift, up to $1,000,000.');
  return {name,description,suggested_cents,goal_cents};
 });
}
