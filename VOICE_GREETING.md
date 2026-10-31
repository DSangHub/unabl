# Personalized 30-second video greeting — $9.95

The guest draft builder is mounted alongside gift checkout. It supports a local photo preview, up to 30 seconds of microphone recording, a typed script, and authenticated AI writing help through Unabl's existing OPENAI_API_KEY.

The local preview plays the ORIGINAL recording. It does not synthesize the script or animate the photo. Photos and microphone recordings are not uploaded or persisted by this release. Closing the editor stops the microphone. Clear removes the local media previews; leaving the page discards the draft.

Purchase and delivery are intentionally unavailable. No Stripe checkout, price, order, or charge is created for this feature in this release.

## Remaining activation requirements

- Choose and connect a talking-photo API with commercial rights and per-customer consent support. D-ID documents photo animation and voice cloning on selected paid plans; a separate provider credential is required. Never use a browser-exposed secret.
- If OpenAI is used to clone guests' voices, obtain custom-voice access first. OpenAI requires separate exact-phrase consent and reference recordings and currently documents a 20 recorded-voice limit per organization. An ordinary OpenAI key is not proof of eligibility or a scalable public voice-enrollment entitlement.
- Add private storage, retention/deletion controls, provider consent verification, ownership checks, moderation, and authenticated asynchronous generation with retry-safe job limits.
- Add the separate $9.95 service checkout only after successful generation is available. Signed webhooks must verify amount, currency, account, owner, and job ID before publishing a recipient card link. Handle failed generation, refunds, and disputes. Do not treat this service charge as a monetary gift to a host.
- Test the full consenting-guest → generated video → paid service → recipient card flow in a sandbox before enabling purchases.

Provider docs: https://docs.d-id.com/reference/clonevoice and https://docs.d-id.com/reference/createtalk
OpenAI docs: https://developers.openai.com/api/docs/guides/custom-voices

## Camera alternative (2026-10-30)

The event greeting panel and standalone composer offer Record / upload a video. Camera + microphone capture is local, uses MP4 if supported or WebM, and stops at 30 seconds. Consent is required. Closing the composer, leaving the page or cancelling permission stops any acquired tracks. Oversize and overlong clips are not shareable. The AI button opens the draft editor; it does not pretend generation is connected.

The listed card price is $4.95 and video price $9.95. Paid media checkout is not connected. The UI explicitly states local previews, recordings and downloads are currently available at no charge; no paid entitlement is asserted. Stripe remains disconnected.

## Manual media fees (2026-10-31)

Replaces the temporary no-charge media copy above: the composer and event video panel now offer manual service fee profile links to Venmo @UnablPay and Cash App $unablpay. E-card $4.95; recorded/uploaded video up to 30 seconds $9.95. Amounts are entered by the payer in the wallet. There is no automated payment verification, paid entitlement, payment receipt or unlock; local downloads do not assert payment. Return is manual. Keep the provider receipt. AI generation is still disconnected: the UI explicitly says not to pay for an AI video and that payment will not enable rendering. No payment was made during implementation or verification. Host gifts and their $1.75 click fee remain separate.
