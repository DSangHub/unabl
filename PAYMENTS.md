# Unabl gift payments

Gift checkout uses Stripe-hosted Checkout with prices calculated on the server. The platform collects the gift plus a 2% platform fee and payment handling fee of 2.9% + $0.30. The handling fee is a product price, not a statement of Stripe's actual fees. Standard and gold standalone card carts and promotion drafts remain separate and do not yet collect payment.

## Required Vercel production configuration

- APP_URL=https://www.unabl.app
- SUPABASE_URL=https://jbcxodpudujoscdafovx.supabase.co
- SUPABASE_SECRET_KEY: a Supabase secret (`sb_secret_...`), stored as Sensitive. Never put this key in frontend code or Git.
- STRIPE_SECRET_KEY: a restricted key with the permissions for Checkout, PaymentIntents, balance, connected accounts/account links, transfers and reversals. Use the same Stripe account/mode as the webhook endpoints.
- STRIPE_WEBHOOK_SECRET: platform payment webhook signing secret.
- STRIPE_CONNECT_WEBHOOK_SECRET: connected-account webhook signing secret.
- CRON_SECRET: random Sensitive credential for Vercel Cron and the private health endpoint.
- PAYMENTS_ENABLED=true only after a signed sandbox payment has been verified through the deployed endpoint.
- RELEASES_ENABLED=true after sandbox release/reversal testing and review of Connect readiness. Live release must be enabled explicitly after live credentials/webhooks are verified.

Platform webhook events: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, charge.refunded, charge.dispute.created. Connected-account webhook events: account.updated and account.external_account.created/updated/deleted. Accounts v2 capability state is retrieved server-side in response to the connected-account updates, on the onboarding return, and immediately before transfers. Stripe-hosted onboarding collects identity and bank information; account capability readiness does not prove a bank owner's name independently matches every profile field. The platform's identity and fraud review remains required.

## Verification and release

Only service-side writes can approve creator_verifications. A reviewer must confirm identity, then set identity_status='approved', reviewed_at to the review timestamp and risk_blocked=false. Stripe readiness is tracked separately. The frontend cannot approve creators.

The daily Vercel Cron job at 08:00 UTC releases at most ten gifts per run. Five days is a minimum, not a promise of bank arrival on day five. Successful payment confirmation starts the immutable hold. Transfers require approved identity, active Stripe recipient transfers, no risk block, three distinct paid donor vouches and no unresolved fraud report. Funds must also be available in Stripe. Failed transfers retry on later runs; leased jobs prevent concurrent payout attempts. Increase batch size/frequency as volume grows and plan permits.

Checkout request UUIDs, unique session/payment/charge IDs, locked atomic fulfillment and per-attempt Stripe idempotency keys protect retries. Release finalization rechecks the database gate; if the gate changes after a transfer, the worker reverses that transfer. Unfinished attempts are reconciled by transfer group and attempt metadata. Refund/dispute handlers block the gift first and reverse any confirmed transfer. A failed reversal produces an HTTP error so Stripe retries. Closed disputes do not automatically re-enable payouts; review is required.

## Tests

Run `npm ci --ignore-scripts` and `npm test`. `test/database-gates.sql` runs a transaction that rolls back all fixture users and records, checking duplicate fulfillment, hold duration, finalization retry, report blocking and client restrictions.

GET /api/payment-health requires Authorization: Bearer CRON_SECRET. It reports missing configuration, Stripe account/mode and database connectivity, never secret values. Before activation, verify the account matches the account on which webhooks were registered. Test with Stripe sandbox methods; never run a real charge to test a release.
