# Internal Tooling Catalog & Access Protocols

| Tool Name | Primary Purpose | Internal Owner | License Type | Access Grant Procedure | Security MFA Mandate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GitHub Enterprise** | Version control & CI/CD | Head of Eng | Seat-based | Automated via Okta SSO | Mandatory FIDO2 / Passkey |
| **AWS Cloud Infrastructure** | Production hosting | Lead Architect | Usage-based | PR-based Terraform role | Mandatory Hardware Token |
| **Datadog** | APM & observability | SRE Lead | Host/Log metrics | Okta group `eng-monitoring`| Mandatory SSO |
| **1Password Teams** | Credential management | SecOps Lead | Per user | Manager approval in Slack | Mandatory SSO + Master Key |
| **Slack Enterprise Grid**| Synchronous collaboration | IT Ops | Per user | Automatic on email creation | Mandatory SSO |

---

## Tool Deprecation & Review Policy
- Tools with zero active logins in 45 days are flagged for de-provisioning.
- Annual spend audits occur in Q4 to eliminate duplicate SaaS licenses.
