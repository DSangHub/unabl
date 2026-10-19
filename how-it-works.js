const sidebar=document.getElementById('eventTitle')?.parentElement;
const faq=document.getElementById('faq');
if(sidebar&&faq){
 const style=document.createElement('style');style.textContent=`
 .unabl-help-nav{border:1px solid #ddd2ed;border-radius:14px;background:linear-gradient(135deg,#faf7ff,#fffaf0);padding:18px;margin-top:22px}.unabl-help-nav h3{font-size:18px;font-weight:800;color:#39294e;margin-bottom:6px}.unabl-help-nav p{font-size:13px;color:#62576d;margin-bottom:12px}.unabl-help-nav a{display:block;padding:10px 0;color:#865016;font-weight:700;text-decoration:underline;text-underline-offset:3px}.unabl-help-nav a:focus-visible{outline:3px solid #b47b24;outline-offset:3px;border-radius:5px}.unabl-howto{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin:24px 0}.unabl-howto article{border:1px solid #e3d7bd;border-radius:14px;padding:22px;background:#fffdf8;scroll-margin-top:110px}.unabl-howto h3{font-size:22px;font-weight:800;color:#382c45;line-height:1.3;margin-bottom:15px}.unabl-howto ol{list-style:decimal;padding-left:22px;color:#514957;line-height:1.65}.unabl-howto li{padding-left:3px;margin:12px 0}.unabl-howto strong{color:#302438}.unabl-howto p{font-size:13px;color:#6a5f6a;margin-top:15px}.unabl-howto a{color:#865016;text-decoration:underline}@media(max-width:640px){.unabl-howto{grid-template-columns:1fr}.unabl-howto article{padding:18px}}
 `;document.head.append(style);
 const nav=document.createElement('nav');nav.className='unabl-help-nav';nav.setAttribute('aria-label','Event FAQs and instructions');
 nav.innerHTML='<h3>FAQs</h3><p>New to Unabl? Start with the steps for you.</p><a href="#host-steps-to-follow">Host Steps to Follow ↓</a><a href="#guest-how-it-works">Guest: How It Works ↓</a><a href="#faq-title">More questions & answers ↓</a>';
 sidebar.append(nav);
 const steps=document.createElement('div');steps.className='unabl-howto';
 steps.innerHTML=`<article id="host-steps-to-follow" aria-labelledby="host-steps-title"><h3 id="host-steps-title" tabindex="-1">Host Steps to Follow</h3><ol>
 <li><strong>Create your host account.</strong> Choose Sign up, select Event creator, confirm your email, then sign in.</li>
 <li><strong>Publish your event.</strong> Open Host / Create Event, add your details and a unique hashtag, then publish. Share the event link or hashtag with your guests.</li>
 <li><strong>Set up invited guests.</strong> In My account, open your saved event’s Manage invited guests. Add each guest’s sign-in email, generate an access code, and share the code privately. Invitations are not emailed automatically.</li>
 <li><strong>Choose how to receive gifts.</strong> Save your Venmo username or Cash App $Cashtag under Manage invited guests. Confirm your recipient details. No Stripe account is needed.</li>
 <li><strong>Preview a video album.</strong> Save and preview a Classic or Gold cover. New album purchases are paused; existing activated albums remain available.</li>
 </ol><p>Direct gifts go through Venmo or Cash App. Unabl does not hold or verify the transfer.</p><a href="#account">Go to My account ↑</a></article>
 <article id="guest-how-it-works" aria-labelledby="guest-steps-title"><h3 id="guest-steps-title" tabindex="-1">Guest: How It Works</h3><ol>
 <li><strong>Find your invitation.</strong> Enter the host’s event hashtag and select Find. Rotating sample celebrations are previews. No host event? Use <a href="#send-directly">Send directly to someone</a> to download a card and add a short video to your own email.</li>
 <li><strong>Sign in and respond.</strong> Confirm your email, sign in, select your RSVP, and write your message. Save RSVP & message does not charge you.</li>
 <li><strong>Choose your card and optional gift.</strong> Select a card, enter your message, then choose a gift amount or Other. To open gift options, use the email your host invited and enter their access code.</li>
 <li><strong>Send directly with Venmo or Cash App.</strong> Pay the separate $1.75 Unabl click fee to @UnablPay through Venmo, return to the gift portal, then send the gift to the confirmed host in your chosen app. No percentage fee or Unabl processing surcharge applies. Provider fees may apply.</li>
 <li><strong>Leave a video greeting.</strong> If the host has activated an album, open the event album, add your name/message, and upload a video with permission from everyone shown. The host reviews it before adding it. Guest uploads are free; limits are two videos per guest, 25 MB each, and 20 pages per album.</li>
 </ol><p>Venmo fee links and return buttons do not verify payments. Confirm recipients in the wallet and keep your receipts. Only the payment provider can confirm the actual transfer.</p><a href="#searchHashtag">Find an event ↑</a></article>`;
 const intro=faq.querySelector('h2')?.nextElementSibling;intro?.after(steps);
 for(const link of nav.querySelectorAll('a'))link.addEventListener('click',()=>{const target=document.getElementById(link.hash.slice(1));requestAnimationFrame(()=>{const heading=target?.querySelector('h3')||target;if(heading){if(!heading.hasAttribute('tabindex'))heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}});});
 const destination=document.getElementById(location.hash.slice(1));if(destination&&steps.contains(destination))destination.scrollIntoView();
}
