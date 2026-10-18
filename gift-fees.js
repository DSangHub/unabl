// USD cents. $100 belongs to the first tier; $500 belongs to the second.
export function clickFeeCents(amount){
 if(!Number.isInteger(amount)||amount<1000||amount>100000)throw Object.assign(Error('Gift must be $10 to $1,000.'),{status:400});
 return amount<=10000?175:amount<=50000?295:495;
}
