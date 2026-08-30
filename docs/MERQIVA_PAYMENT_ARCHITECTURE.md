# Merqiva Payment Architecture

## Purpose
Provider-agnostic payment center for international B2B invoices.

## Current strategy
- Primary candidate: YekPay WebGate / PayLink, subject to account approval and current limits.
- Secondary: verified B2B collection / bank-transfer route after written eligibility confirmation.
- Crypto: backup only after compliance and wallet-screening decisions.
- Long-term: legitimate foreign entity + business bank + eligible PSP/MoR, subject to ownership/KYC/legal review.

## Flow
Proposal -> Invoice -> Payment Center -> Provider -> Payment Verification -> CRM -> Service Activation -> Guarantee -> Outcome -> Renewal.

## Runtime configuration
- PAYMENT_PRIMARY_PROVIDER
- YEKPAY_PAYMENT_BASE_URL
- PAYMENT_BANK_INSTRUCTIONS_URL

No provider secrets are committed to the repository.

## Invoice states
PENDING -> PAID -> VERIFIED -> ACTIVATED
Terminal states: FAILED, REFUNDED, PARTIALLY_REFUNDED, CANCELLED.

## Current YekPay constraint
YekPay's public PayLink page states that withdrawals can take 8–25 working days and that IRR conversion/settlement becomes available after a stated approval/waiting period. Treat this as a small-ticket limitation until the current commercial terms are confirmed in writing.

## Compliance
Never represent a payment provider as approved for an Iran-based operator until the provider has approved the actual business/ownership configuration. Do not use false identity, residence, ownership or bank information.
