# System Assumptions & Design Decision Rationales

## Customer Loyalty Rewards System (EcoRewards™)

This document details the key business, operational, and architectural assumptions made during the design and implementation of the Customer Loyalty Rewards System, along with the concrete justifications for why chosen strategies were favored over competing alternatives.

---

## 1. Proof of Purchase & Code Issuance

### Chosen Approach:
Single-use, cryptographically random 12-character box codes formatted as `BOX-XXXX-XXXX` (using `crypto.randomBytes` to generate uppercase hex tokens) printed directly on stickers or cardboard inserts placed **inside** the physical product packaging. Accompanied by a dynamic QR code that deep-links directly to the claim page (`https://domain.com/?code=BOX-XXXX-XXXX`).

### Design Gaps Filled:
- Factory manufacturing lines cannot support expensive microchips or per-box RFID tags.
- Physical stores sell boxes on open retail shelves, meaning any exterior barcode or visible serial code could be scanned or photographed by store visitors without buying the product.

### Evaluated Alternatives & Why They Were Rejected:
1. **Receipt Upload & OCR Scanning**:
   - *Why Rejected*: High error rates in OCR scanning, crumpled thermal receipts, differing store point-of-sale formats, and significant operational cost for manual receipt auditing. Buyers often throw away retail store receipts immediately.
2. **Outer Packaging Barcodes**:
   - *Why Rejected*: Store shoppers could scan or take photos of box barcodes while walking down retail aisles without purchasing, exhausting the reward points before genuine buyers open the box.
3. **Hardware NFC / RFID Tags**:
   - *Why Rejected*: Prohibitively expensive per-unit cost ($0.15–$0.40 per tag) for consumer goods packaging, and requires specialized NFC reader compatibility on buyer smartphones.
4. **Sequential Serial Numbers (e.g., `BOX-0001`, `BOX-0002`)**:
   - *Why Rejected*: Attackers could guess the next valid numbers through brute force. Cryptographic random generation provides $16^8 \approx 4.29 \times 10^9$ possibilities per batch, rendering brute-force guessing statistically impossible.

---

## 2. Fraud, Reuse & Concurrency Prevention

### Chosen Approach:
Multi-layered defense combining atomic conditional database operations, sliding-window rate limiting, administrative code revocation, and exhaustive security logging:
1. **Atomic Conditional Lock**: Instead of a vulnerable "read-then-write" pattern (`findUnique` then `update`), redemptions execute:
   ```ts
   prisma.boxCode.updateMany({
     where: { code: normalizedCode, status: "UNCLAIMED" },
     data: { status: "REDEEMED", redeemedAt: new Date() }
   })
   ```
   inside a Prisma `$transaction`. If two concurrent requests arrive for the same code simultaneously, exactly one row updates (`count === 1`), while the other gets `count === 0` and is safely directed to fraud logging.
2. **Contact-Based Rate Limiting**: If a phone or email records $\ge 5$ failed attempts in `FraudLog` within the preceding 10 minutes, all subsequent requests are blocked with `HTTP 429` and logged as `RATE_LIMITED`.
3. **Factory Admin Code Revocation**: Compromised or damaged lots can be revoked (`status: "REVOKED"`), immediately rejecting any claim attempts with `REVOKED_CODE`.
4. **Audit Trail (`FraudLog`)**: Full persistence of `attemptedCode`, `contact`, `reason`, and `createdAt` for security oversight.

### Design Gaps Filled:
- Automated bot attacks or rapid double-clicking by malicious users attempting race conditions to redeem the same code twice on different devices.
- Brute-force dictionary attacks against code formats.

### Evaluated Alternatives & Why They Were Rejected:
1. **Application-Level Mutex / In-Memory Lock**:
   - *Why Rejected*: Fails in serverless architectures (such as Vercel) where API routes run across ephemeral, distributed execution containers with independent memory heaps.
2. **IP-Address-Based Rate Limiting**:
   - *Why Rejected*: Mobile buyers frequently share Carrier-Grade NAT (CGNAT) gateway IPs with thousands of mobile users. Blocking by IP would penalize innocent buyers connected to the same cellular cell tower.
3. **CAPTCHA on Every Code Entry**:
   - *Why Rejected*: High friction for legitimate mobile users opening physical packages. Instead, frictionless rate limiting is used, preserving a fast 5-second claim experience.

---

## 3. Customer Identity & Frictionless Onboarding

### Chosen Approach:
Identifier-first check-in using a normalized `contact` string (email or telephone number) as the primary unique key (`Customer.contact`). Users provide their name and contact information during their first box claim, and the system automatically upserts their wallet profile. Returning users can look up their wallet balance and claim history at any time simply by providing their contact identifier.

### Design Gaps Filled:
- Traditional e-commerce registration requires setting passwords, email confirmation links, SMS OTP verification, and complex profile setup—which creates severe drop-off for buyers unboxing physical products.

### Evaluated Alternatives & Why They Were Rejected:
1. **Mandatory Password & Account Registration**:
   - *Why Rejected*: Users who just opened a physical product want instant gratification. Forcing password creation causes high abandonment rates on mobile devices.
2. **OAuth-Only Social Login (Google / Apple)**:
   - *Why Rejected*: Excludes buyers without connected social accounts, requires redirect flows that can interrupt webview QR scanners, and introduces external third-party identity dependencies.
3. **Anonymous Browser-Cookie Only Wallet**:
   - *Why Rejected*: If the buyer switches from their mobile browser (where they scanned the QR code) to their desktop laptop or clears their browser cache, all accumulated loyalty points would be permanently lost.

---

## 4. Factory Owner Administration & Access Control

### Chosen Approach:
A dedicated `/admin` dashboard protected by a lightweight, high-security passcode gate (`ADMIN_PASSCODE` environment variable). The authenticated passcode is stored in client `sessionStorage` and sent via an `x-admin-passcode` HTTP header with all administrative API calls.

### Capabilities Provided:
- **Production Batch Generation**: Rapid issuance of batches from 1 to 500 codes with customizable points per box.
- **Production Line Export**: Instant CSV download for manufacturing packaging lines and a print-ready QR label grid designed for sticker sheet printers.
- **Code Revocation & Restoration**: Ability to inspect codes by batch and revoke suspicious or damaged stock in real-time.
- **Live Security Monitoring Feed**: Direct visibility into blocked fraud attempts, duplicate reuses, and rate-limited attackers.

### Design Gaps Filled:
- Single factory owner need for full administrative oversight without configuring complex multi-tenant enterprise IAM software or third-party identity providers.

### Evaluated Alternatives & Why They Were Rejected:
1. **Multi-Role RBAC (Role-Based Access Control) with Database Users**:
   - *Why Rejected*: Over-engineered for a factory operations dashboard with a single operational tier, adding unnecessary database tables, password hashing, and token refresh complexity.
2. **Basic HTTP Auth**:
   - *Why Rejected*: Poor user experience on mobile browsers (clunky browser native modal) with inability to offer custom logout or formatted error messaging.
3. **Static Pre-Generated Database Seeds Only**:
   - *Why Rejected*: The factory owner needs dynamic on-demand code generation whenever a new production line or packaging run commences.
