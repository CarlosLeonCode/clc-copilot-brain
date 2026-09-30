# Vendor Management & SLA Directory

| Vendor Name | Service Provided | Primary Contact | Contract SLA | Renewal Date | Criticality |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Amazon Web Services (AWS)** | Cloud Compute, Storage, VPC | enterprise-support@aws.com | 99.99% Availability | Annual (Auto-renew) | Tier 0 (Mission Critical) |
| **Cloudflare** | Edge CDN, DDoS mitigation | enterprise@cloudflare.com | 100% Edge SLA | 2027-04-15 | Tier 0 (Mission Critical) |
| **Twilio / Sendgrid** | Transactional SMS & Email | support@sendgrid.com | 99.95% Delivery | 2027-01-30 | Tier 1 (High) |
| **Stripe** | Payment Gateway & Billing | account-rep@stripe.com | 99.999% Processing | Ongoing MSA | Tier 0 (Mission Critical) |

---

## Vendor Escalation Protocol
If a Tier 0 vendor experiences a degraded status lasting >15 minutes:
1. SRE immediately initiates fallback or degraded mode as defined in [incident-management.md](../sops/incident-management.md).
2. Communications lead alerts customers regarding upstream dependency latency.
