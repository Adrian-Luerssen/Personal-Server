# Commercial model

Status: pricing and cost hypotheses for validation, not public commitments.

## Product split

The source repository remains available for personal self-hosting. The commercial product is the managed **Personal Record** service: provisioning, updates, backups, monitoring, mobile connectivity, and support without requiring the customer to operate a server.

Preventing third parties from monetizing the code is incompatible with an OSI-approved open-source license. The intended model is therefore **source-available**: noncommercial self-hosting under a noncommercial license plus a separate paid commercial license. Legal text must be approved before release.

## Initial offers

| Offer | Customer | Included | Pricing hypothesis |
|---|---|---|---|
| Managed Individual | normal consumer | hosted account, web and mobile apps, backups, updates, standard integrations | €7/month |
| Managed Individual Annual | committed consumer | same service, annual billing | €70/year |
| Personal Self-host | technical individual | source and deployment instructions; community support | no hosting fee; noncommercial use only |
| Commercial Self-host | company, consultant, reseller, or paid hosted deployment | negotiated usage and distribution rights | contract, minimum annual fee |

Do not launch a free hosted tier until storage, support, background jobs, Spotify API limits, notification traffic, and App Store billing economics are measured. A 14-day trial is easier to bound than an indefinite free plan.

## Later expansion

- Household plan after private-versus-shared records and consent are explicit.
- Guided migration service for Cashew, FitNotes, MyAnimeList, Spotify history, and HabitShare exports.
- Premium retention reports and longer history only if the underlying source rows remain exportable.
- Partner integrations only when they reduce manual work without selling customer data.

## Non-negotiables

- No advertising against personal records.
- No sale of behavioral or financial data.
- No feature paywall that prevents export or account deletion.
- AI usage and cost must be visible; bring-your-own-provider remains a viable option.
- Hosted and self-hosted data formats remain compatible.

## Unit economics to validate

Measure per active account: database and object storage, backup retention, Redis and job load, AI tokens, notification delivery, Spotify refresh traffic, support minutes, payment processing, VAT, App Store commission, and failed-payment recovery. Revisit price after a 30–50 customer beta rather than optimizing from assumptions.

## Acquisition and retention

Lead with migrations from tools customers already trust and the relief of one maintained service. The strongest acquisition loops are import previews, honest comparison pages, self-host documentation, and shareable release notes—not referral access to private data.

Retention should come from fast daily logging, trustworthy correction, weekly review, and painless exports. Track activation by first useful record in two instruments, not by number of permissions granted.

## Billing gate

Review Apple and Google rules for digital services and account creation before shipping native subscription entry points. Finalize VAT handling, refunds, trial language, cancellation, grace periods, and entitlement synchronization before accepting payment.
