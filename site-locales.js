// ISO 639-1 languages plus common script and regional variants.
const codes='aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en en-GB eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pa-Arab pi pl ps pt pt-PT qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr sr-Latn ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh-Hans zh-Hant zu fil yue'.split(' ');
const english=new Intl.DisplayNames('en',{type:'language',fallback:'none'});
export const locales=new Map(codes.map(code=>[code,english.of(code)||code]));
export const isEnglish=code=>code==='en'||code==='en-GB';
export function direction(code){
 const locale=new Intl.Locale(code);
 const script=locale.maximize().script;
 return ['Arab','Hebr','Thaa','Nkoo','Adlm','Syrc','Samr','Mand','Rohg'].includes(script)?'rtl':'ltr';
}
export function localeLabel(code){
 if(code==='en')return 'English (US)';
 if(code==='en-GB')return 'English (UK)';
 const label=locales.get(code);
 const native=new Intl.DisplayNames(code,{type:'language',fallback:'none'}).of(code);
 return native&&native!==label?native+' · '+label:label;
}
