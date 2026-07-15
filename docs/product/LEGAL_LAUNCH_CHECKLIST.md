# Legal and launch checklist

This is an operational checklist, not legal advice. Counsel must approve the license package, privacy terms, consumer terms, and launch jurisdictions.

## Licensing and commercial protection

- [ ] Remove any statement that the project is MIT-licensed unless an MIT license is intentionally restored; MIT permits third-party commercial use.
- [ ] Decide whether the public repository will use PolyForm Noncommercial or another counsel-approved source-available noncommercial license.
- [ ] Publish a separate commercial license for paid hosting, resale, consulting bundles, and internal business use as applicable.
- [ ] Define what counts as personal, noncommercial self-hosting in plain language.
- [ ] Add copyright notices and a license file only after the final text is approved.
- [ ] Adopt a contributor license agreement or developer certificate strategy that preserves the ability to dual-license contributions.
- [ ] Audit dependency licenses and notices for frontend, backend, Android, container images, fonts, icons, and bundled assets.

“Open source” under the OSI definition permits commercial use. If preventing third-party monetization is mandatory, describe the project as **source-available**, not open source, in customer and contributor materials.

## Trademark and brand

- [ ] Clear “Record,” “Bookplate R,” the mark, relevant domains, and App Store names in launch markets.
- [ ] Register core word and design marks where commercially justified.
- [ ] Publish a trademark policy allowing factual repository references while prohibiting confusing hosted services.
- [ ] Reserve names and handles before announcing the brand.

Copyright controls code copying; trademark controls confusing use of the customer brand. Both are needed for the intended model.

## Customer terms and privacy

- [ ] Privacy notice maps every collected field, purpose, processor, retention period, and deletion path.
- [ ] Terms distinguish the managed service from self-host software and define availability, backups, support, and acceptable use.
- [ ] Data-processing agreements and processor contracts cover hosting, email, analytics, errors, AI providers, and payments.
- [ ] GDPR lawful bases, data-subject request handling, export, rectification, deletion, and breach procedures are operational.
- [ ] Account deletion is available in-app and actually schedules deletion across primary data, backups, tokens, and processors.
- [ ] Permission explanations cover Spotify, Health Connect, notifications, contactless-payment detection, and AI access.
- [ ] AI disclosures identify provider routing, retention, training settings, and user controls.
- [ ] Age policy and household consent rules are defined.

## Payments and stores

- [ ] Apple and Google billing requirements reviewed for account creation, subscriptions, external links, and self-host access.
- [ ] VAT, invoicing, refunds, cancellation, grace periods, and chargebacks implemented.
- [ ] Store privacy labels and Android Data Safety form match runtime behavior.
- [ ] Accessibility statement, support URL, privacy URL, terms URL, and account-deletion URL are live.

## Security and operations

- [ ] Threat model covers authentication, MFA recovery, refresh tokens, agent keys, imports, SSRF, file parsing, notification capture, and tenant isolation.
- [ ] Independent production security review completed.
- [ ] Backup restore and account export tested, not merely configured.
- [ ] Incident response, vulnerability reporting, dependency patching, status communication, and support ownership are assigned.
- [ ] Telemetry is minimal, documented, and optional where feasible.

## Release gate

Do not accept paid customers until naming clearance, licensing, terms, privacy, billing, deletion, restore, and incident procedures have named owners and dated approval evidence.
