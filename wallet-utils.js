export function cashTag(value){const name=String(value||'').trim().replace(/^\$/,'');if(!/^(?=.*[A-Za-z])[A-Za-z0-9]{1,20}$/.test(name))throw Error('Enter the exact Cash App $Cashtag (1–20 letters/numbers, including a letter).');return name;}
export function cashProfile(value){return 'https://cash.app/$'+encodeURIComponent(cashTag(value));}
