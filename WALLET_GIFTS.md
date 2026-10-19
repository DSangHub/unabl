# Direct wallet gifts

Stripe new gift checkout, album checkout and onboarding routes return 410. No Stripe API is called by these routes. The frontend offers Venmo and Cash App, never collects bank information, and no longer mounts bank-only Knows. Legacy webhook reconciliation and payment-status endpoints remain to handle past transactions; keys, accounts and historical records are not revoked/deleted. The automated release cron is removed. Already-open external Stripe sessions are not cancelled by this change.

Hosts save validated Venmo usernames and Cash App Cashtags in Manage invited guests. Cash App column is private/server-only with existing table RLS and grants. Confirmed invited email plus current access code is required to reveal event contacts. Previously revealed contacts cannot be recalled by removing a guest. No event editor supports the same two wallets with recipient-entered profiles.

Existing flat $1.75 manual Venmo fee to @UnablPay is retained for direct handoffs. No 2% fee or Unabl processing surcharge. No invented Cash App account for Unabl. Gifts go directly to the host, separately from fee. Links do not submit or verify payment, prefill gift amount, enforce funding source or provide refunds. Bank-only promises removed.

Database-only APIs use dataConfig and require no Stripe credentials. New album purchases paused, cover previews and existing paid albums remain usable. No manual fee confirmation unlocks albums. Card downloads/email drafts remain available.
