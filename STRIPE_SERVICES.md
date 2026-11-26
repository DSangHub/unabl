# Unabl Stripe services and wallet gifts

Prepared for platform account `acct_1Ug6fQDjEB53tfn0`. Not live until account access, Vercel credentials, and payment checks below are complete.

## Funds flow

Unabl sells its own downloadable cards, recorded-video service and hosted albums through platform Stripe Checkout. These purchases do not need Connect transfers. Never include a host cash gift in a service price or mislabel it as a sale. Personal gifts between friends remain external Venmo/Cash App transfers; Stripe says it does not support personal or peer-to-peer money transmission (https://support.stripe.com/questions/requirements-for-accepting-tips-or-donations).

Existing Connect onboarding and gift-charge routes remain disconnected. Implement Connect for an eligible third-party sale only after its actual business model, recipient onboarding, fee collection, dispute responsibility and Stripe eligibility are confirmed. Merely activating Connect or changing API keys does not approve personal gifts.

## Services

- Blue standard card: $2.99; gold frame: $4.95.
- Standalone downloadable card: $4.95; recorded/uploaded video up to 30 seconds: $9.95.
- Host Classic album: $7.95; Gold album: $14.95.
- Server catalog also defines $1.75/$2.95/$4.95 direct-gift service fees, but wallet gift flow is unchanged and does not automatically collect these through Stripe.
- AI video generation and unpublished promotions are not purchasable.

Prices are server-owned. The card cart's monetary gift is excluded from Stripe checkout. A service session uses idempotency keys and no destination or transfer parameters. Cash App Pay, Apple Pay, Google Pay and other methods are presented by Stripe only when configured and eligible; Venmo @UnablPay and Cash App $unablpay are manual alternatives outside Stripe. Cash App Pay is US/USD only and is a different integration from opening a Cash App profile.

## Configuration and activation

1. Authorize the intended Stripe account in the Stripe connector. In Vercel for the real Unabl project, set server-only STRIPE_SECRET_KEY for that same account, STRIPE_PLATFORM_ACCOUNT_ID, APP_URL, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SECRET_KEY. Do not paste keys into chat or source control. `.env.example` has no real credentials.
2. Configure payment methods in the Stripe Dashboard. This code uses Checkout's dynamic payment methods rather than forcing an ineligible wallet. Verify Cash App Pay eligibility separately.
3. Configure `/api/stripe-webhook` for Checkout completion, async success/failure, charge refund/failure/dispute events. Keep the signing secret in Vercel. This endpoint still handles legacy gift events; do not discard historical event handling.
4. Confirm the existing album tables, storage bucket, and webhook-event table exist in the intended Supabase project. No new schema is needed. An album's existing open order on another Stripe account/environment intentionally blocks a new purchase; reconcile it before retrying.
5. Enable STRIPE_SERVICE_PAYMENTS_ENABLED=true in a separate test deployment with test credentials. Exercise completed, cancelled, declined, delayed, refunded and disputed payments; confirm album activation, duplicate checkout reuse and rejected non-host purchases. Production and test orders must use separate albums/environments.
6. Once verified, use the authorized live account credentials and enable the flag for production; redeploy. Never enable the legacy gift checkout route to accept personal transfers.

## Confirmation and delivery

`/api/service-payment-status` retrieves the Stripe Session and expanded PaymentIntent/charge, verifies product, amount, currency and environment, and exposes only service name, price, status and test/live mode. A return URL is never proof of payment. Refunds and disputes supersede paid status. Service webhook handling does not create a gift or album entitlement.

Cards and recorded videos remain local files; the sender saves them before leaving for Stripe and shares them manually. There is no uploaded-file delivery, paid-download entitlement, or AI rendering. Album activation uses the existing verified webhook fulfillment with ownership checks and private video storage.

Manual wallet links cannot verify payment. Do not treat clicking a link, returning to Unabl, downloading a card or self-reporting payment as a receipt.
