# Personalized congratulations greeting — $4.95

The guest draft builder is mounted alongside gift checkout. It supports a local photo preview, up to 30 seconds of microphone recording, a typed script, and authenticated AI writing help through Unabl's existing OPENAI_API_KEY.

The local preview plays the ORIGINAL recording. It does not synthesize the script or animate the photo. Photos and microphone recordings are not uploaded or persisted by this release. Closing the editor stops the microphone. Clear removes the local media previews; leaving the page discards the draft.

Purchase and delivery are intentionally unavailable. No Stripe checkout, price, order, or charge is created for this feature in this release.

## Remaining activation requirements

- Choose and connect a talking-photo API with commercial rights and per-customer consent support. D-ID documents photo animation and voice cloning on selected paid plans; a separate provider credential is required. Never use a browser-exposed secret.
- If OpenAI is used to clone guests' voices, obtain custom-voice access first. OpenAI requires separate exact-phrase consent and reference recordings and currently documents a 20 recorded-voice limit per organization. An ordinary OpenAI key is not proof of eligibility or a scalable public voice-enrollment entitlement.
- Add private storage, retention/deletion controls, provider consent verification, ownership checks, moderation, and authenticated asynchronous generation with retry-safe job limits.
- Add the separate $4.95 service checkout only after successful generation is available. Signed webhooks must verify amount, currency, account, owner, and job ID before publishing a recipient card link. Handle failed generation, refunds, and disputes. Do not treat this service charge as a monetary gift to a host.
- Test the full consenting-guest → generated video → paid service → recipient card flow in a sandbox before enabling purchases.

Provider docs: https://docs.d-id.com/reference/clonevoice and https://docs.d-id.com/reference/createtalk
OpenAI docs: https://developers.openai.com/api/docs/guides/custom-voices
