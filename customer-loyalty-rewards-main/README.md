# EcoRewards™ — Customer Loyalty Rewards System

live link :- https://customer-loyalty-rewards.vercel.app/

A full-stack, fraud-safe Customer Loyalty Rewards System built for factories selling physical products in boxes. Features single-use cryptographic box codes, atomic anti-concurrency claims, sliding-window rate limiting, a live rewards redemption catalog, and a factory owner administrative dashboard with printable QR box-insert cards.

---

## Live Vercel Deployment

- **Live Production URL**: `https://customer-loyalty-rewards.vercel.app` *(or your custom Vercel domain)*
- **Admin Dashboard**: `https://customer-loyalty-rewards.vercel.app/admin`
- **Default Factory Admin Passcode**: `factory2026`

---

## Core Capabilities

### 1. Customer Loyalty Portal (`/`)
- **Frictionless Wallet Check**: Enter Phone or Email in the top lookup bar to view active points balance, lifetime earnings, and transaction history.
- **Hero Points Wallet**: Visual card showing real-time balance, lifetime total, and total boxes claimed.
- **Box Code Claim Engine**:
  - Auto-formatting 12-character input (`BOX-XXXX-XXXX`).
  - Deep-link support via `?code=...` query parameter for instant QR scan redemptions.
  - Real-time feedback with green points earned toast or distinct fraud warning banners (`ALREADY_REDEEMED`, `INVALID_CODE`, `REVOKED_CODE`, `RATE_LIMITED`).
- **Rewards Catalog**:
  - Active physical rewards grid with points cost badges, stock meters, and animated progress bars toward goals.
  - Atomic one-click **"Redeem Now"** action with instant balance and stock updates.
- **Activity Ledger**:
  - Tabular view of claimed box codes (with product and batch details) and previous reward redemptions.

### 2. Factory Owner Admin Dashboard (`/admin`)
- **Passcode Gate**: Secured by `ADMIN_PASSCODE` (stored in `sessionStorage` and transmitted via `x-admin-passcode` headers).
- **KPI Summary Row**: Real-time cards for Total Codes Issued, Redemption Rate (%), Active Customers, and Blocked Fraud Attempts.
- **Batch & QR Generator**:
  - Issue production batches (1 to 500 codes) with custom points per box.
  - **CSV Export**: Download production line spreadsheets with codes and scan URLs.
  - **Printable QR Labels**: Render and print high-resolution sticker sheets or box-insert cards directly from the browser (`window.print()`).
- **Batches & Code Inspector**:
  - Expand any batch to view claimed vs. unclaimed progress ratios.
  - Search and filter codes by status (`UNCLAIMED`, `REDEEMED`, `REVOKED`).
  - **Inline Code Revocation**: Revoke suspicious codes or restore mistakenly revoked codes in one click (`PATCH /api/admin/codes/[id]`).
- **Live Security & Fraud Feed**:
  - Real-time audit trail of all rejected attempts with reason badges, attempted codes, contact information, and timestamps.

---

## Tech Stack

- **Framework**: Next.js 16+ (App Router with Turbopack)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS v4 + `@tailwindcss/postcss` (Crisp White & Forest Green Eco-Packaging Theme)
- **Database & ORM**: PostgreSQL (Neon Serverless) + Prisma ORM 6.x
- **Icons**: `lucide-react`
- **QR Generation**: `qrcode`
- **Testing**: `tsx` + custom dual-mode E2E test harness

---

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Configure `.env`:
   ```env
   # PostgreSQL connection string for Prisma (Neon, Supabase, Vercel Postgres, etc.)
   DATABASE_URL="postgresql://neondb_owner:password@ep-aged-art-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

   # Admin API authorization passcode
   ADMIN_PASSCODE="factory2026"
   ```

---

## Local Development & Running

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Sync Database Schema**:
   ```bash
   npx prisma db push
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) for the Customer Portal or [http://localhost:3000/admin](http://localhost:3000/admin) for the Factory Admin Dashboard.

4. **Production Build**:
   ```bash
   npm run build
   ```

---

## Running Automated Test Suite

The project includes an end-to-end verification suite testing all 10 core security, fraud prevention, and atomic redemption scenarios against live PostgreSQL or an in-memory simulation:

```bash
npx tsx scripts/test-loyalty.ts
```
*(or run `npm run test:loyalty`)*

### Test Scenarios Verified:
1. `POST /api/admin/batches`: Batch creation and cryptographic unique code generation
2. `POST /api/codes/claim`: Valid code claim and atomic customer balance increment
3. `POST /api/codes/claim`: Duplicate code claim rejection (`HTTP 409`, `ALREADY_REDEEMED` in `FraudLog`)
4. `POST /api/codes/claim`: Non-existent code claim rejection (`HTTP 400`, `INVALID_CODE` in `FraudLog`)
5. `PATCH /api/admin/codes/[id]` + `POST /api/codes/claim`: Revoked code rejection (`HTTP 400`, `REVOKED_CODE`)
6. `POST /api/codes/claim`: Rate limiting enforcement ($\ge 5$ failed attempts in 10 min $\to$ `HTTP 429`, `RATE_LIMITED`)
7. `GET /api/customer?contact=...`: Customer profile and transaction history retrieval
8. `POST /api/rewards/redeem`: Atomic points balance deduction and reward stock decrement
9. `POST /api/rewards/redeem`: Insufficient points balance rejection (`HTTP 400`)
10. `GET /api/admin/overview`: System-wide KPI calculation and metrics aggregation

---

## Documentation Index

- [ARCHITECTURE.md](file:///c:/Users/ASUS/Desktop/ass2/ARCHITECTURE.md): System architecture, complete Prisma entity models, API contracts, and Mermaid sequence/flowchart diagrams.
- [ASSUMPTIONS.md](file:///c:/Users/ASUS/Desktop/ass2/ASSUMPTIONS.md): Design decisions, rejected alternatives, and operational rationales.
- [AI_LOG.md](file:///c:/Users/ASUS/Desktop/ass2/AI_LOG.md): Prompts log and 3 in-depth failure & recovery case studies.
- [TEST_PLAN.md](file:///c:/Users/ASUS/Desktop/ass2/TEST_PLAN.md): Complete automated and manual test plan matrix.
