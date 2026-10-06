# Unabl creator verification

Implemented database and UI gates; live payments and Stripe identity onboarding are not enabled.

- Three distinct authenticated paid donors must vouch. A creator cannot vouch for themselves. Each donor counts once per creator, across events. Refunded, disputed or failed gifts do not count. Donors can withdraw a vouch.
- Trusted review must approve identity, confirm Stripe verification and clear the risk block. Client roles cannot write these fields. Public stars are computed from the current gate, not editable profile metadata. No star guarantees an event is legitimate.
- A signed-in user can report a published event. An unresolved report suppresses verification and blocks releases until trusted review resolves it. Reports and reviewer records remain private.
- Each gift is eligible no earlier than 120 hours after successful payment. Five days is a minimum; unresolved checks delay it. Dates, recipient, donor and payment identity cannot be altered to shorten the hold. The SQL trigger blocks premature released states.

## Required before taking live payments

Connect platform approval, live restricted credentials, secure connected-account onboarding and trusted admin review are still required. Use separate charges and transfers for delayed recipient transfers. Confirm the platform's fee, refund/dispute liability and payout configuration with its operator before activation.

Implement a signed Stripe webhook and record gifts only after confirmed successful payment (never from a browser or success redirect). Source donor/event/creator/amount from server-created Checkout metadata, validate currency/amount, and deduplicate Stripe payment IDs. Process refunds, disputes and account verification changes so they immediately block affected gifts. Verified star readiness must be refreshed from Stripe, not inferred from a completed onboarding redirect.

A server-only worker must lock each held gift, check release eligibility, Stripe available funds and current account capabilities, and recheck immediately before transfer. Use a stable Stripe idempotency key per gift. Record the confirmed transfer ID and reconcile webhook/retry failures; never replay money movement blindly. A SQL eligibility query alone does not hold money or execute transfers. No payout worker is deployed.

Provide a restricted, authenticated admin review flow with audit records; never give creators service-role credentials. Set identity approval only after evidence review and clear risk blocks only through review. No ID documents are collected by this static frontend.

## Verification

Transactional database fixtures checked three-donor qualification, no self approval, two-vouch rejection, unreviewed/reported/refunded gates, premature release rejection, and client write restrictions. Fixtures rolled back. Supabase security advisors returned no lints.
