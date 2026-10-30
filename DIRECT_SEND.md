# Send directly to someone

The event search now has a standalone card/video composer for people without a published host event. No account, invitation, code or backend record is required. This is a local export and email-composition flow, not an email delivery service.

Sender supplies recipient name/email, sender name, title, message and one of three card styles. Canvas renders a downloadable PNG with bounded text and Unicode-aware line wrapping; no external fonts/images or personal data are fetched. Optional video is recorded with the camera and microphone or selected from the sender's device, previewed with a local blob URL, and validated for MP4/WebM/MOV, 25 MB maximum, 30-second maximum (small metadata tolerance). Sharing requires a permission checkbox. Files are not uploaded, transcoded, animated or permanently stored by Unabl.

Sender downloads the PNG and optional original video, opens an addressed mailto draft, attaches the saved files and presses Send in their email application. Neither the mailto URL nor the email body embeds card/video bytes. The UI states attachments are not automatic and Unabl has not sent an email. Supported browsers can alternatively open a native file share sheet; Unabl cannot confirm delivery. Closing the composer revokes local blob URLs and discards the unsaved draft. Guest should keep the page open until exports are saved.

Recipient Venmo username must be obtained/confirmed directly. The Ask button only opens an email draft asking for it. There is no email-to-Venmo lookup. Username validation prevents URLs and UnablPay as a host recipient. Optional gifting uses the existing direct-wallet flat $1.75 click fee: open @UnablPay manually, pay the fee, return and open the confirmed recipient profile to enter/send the separate gift amount. No payment API, prefilled transfer, callback or paid status is implemented. These gifts are outside Unabl's Stripe hold/vouch flow. Stripe checkout remains disconnected and new album purchases remain paused.

Tests cover single-email validation/header injection, safe draft query encoding, Venmo recipient validation, card limits and video type/size/duration limits. Live UI verification should check preview/export and a non-personal synthetic short video without actually sending email or paying a fee.

Listed pricing: $4.95 per card and $9.95 per 30-second video. Paid checkout is not connected, so local preview/export is explicitly no-charge for now. An AI greeting button opens the separate photo/voice/script draft editor, not a working rendering or cloning service.

Camera lifecycle tests cover automatic stop, late permission after cancellation, size/duration rejection, and denied permissions. Camera streams and media stay local; capture does not require auth or a paid order while checkout is unavailable.
