# SOP: P0/P1 Incident Response and Remediation Procedure

> **Owner:** Site Reliability Engineering Lead  
> **Version:** 1.2.0  
> **Effective Date:** 2026-09-30  
> **Schema Definition:** [incident-management.json](./incident-management.json)

---

## 1. Purpose & Scope
This Standard Operating Procedure establishes the mandatory protocol for managing and resolving high-severity production incidents (P0/P1) across all infrastructure.

---

## 2. Step-by-Step Execution Protocol

### Step 1: Acknowledge and Declare Incident
- **Owner**: On-Call Primary SRE
- **Action**: Acknowledge alert in PagerDuty within 5 minutes. Spin up `#incident-war-room-[date]` in Slack.
- **Verification**: Incident Commander (IC) designated and announced.

### Step 2: Establish Stakeholder Communication
- **Owner**: Communications Lead
- **Action**: Post initial status to Statuspage within 15 minutes.
- **Verification**: Public notification published; executive leadership pinged.

### Step 3: Mitigate and Isolate Root Cause
- **Owner**: Incident Commander & Tech Leads
- **Action**: Apply automated rollbacks or traffic rerouting. Priority is immediate restoration of customer service over in-place debugging.
- **Verification**: API error rates normalize below 0.1% for 10 minutes.

### Step 4: Post-Mortem & Knowledge Retention
- **Owner**: Incident Commander
- **Action**: Hold blameless post-mortem within 48 hours. File remediations in `product/specs/` or update this SOP.
- **Verification**: Post-mortem signed off and committed to repository.
