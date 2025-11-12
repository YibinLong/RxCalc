# **Product Requirements Document (PRD.md)**

## **Project: Foundation Health – NDC Packaging & Quantity Calculator**

---

### **1. Project Summary**

Build an **AI-accelerated NDC Packaging & Quantity Calculator** to improve the accuracy of prescription fulfillment in pharmacy systems. It matches prescriptions to valid National Drug Codes (NDCs) and computes correct dispense quantities, minimizing claim rejections and fulfillment errors.
**MVP scope:**

* Input drug name/NDC + SIG + days’ supply
* Normalize to RxCUI (RxNorm API)
* Retrieve valid NDCs + package sizes (FDA NDC Directory API)
* Compute optimal dispense quantity
* Return structured JSON + clear UI summary

---

### **2. Core Goals**

* Users can input a drug name or NDC and get accurate dispense quantity recommendations.
* Users can view active/inactive NDCs and see optimal matches by package size.
* Users can detect mismatches, overfills, and underfills instantly.
* Users can export structured output (JSON or UI summary) for integration.
* Users can process each query in <2 seconds.

---

### **3. Non-Goals**

* No integration with full pharmacy management systems in MVP.
* No analytics dashboards or reporting modules.
* No real-time claim submission or EHR integration.
* No handling of non-prescription (OTC) data.

---

### **4. Tech Stack (Solo-AI Friendly)**

| Layer         | Tech                                      | Rationale                                                           |
| ------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| Frontend      | **SvelteKit (TypeScript)**                | Simple routing, minimal boilerplate, great DX for AI-authored code. |
| Backend       | **SvelteKit server routes**               | Unified codebase; easy SSR + API endpoints.                         |
| Language      | **TypeScript**                            | Strong typing + AI familiarity.                                     |
| AI API        | **OpenAI API**                            | Easiest for LLM-based normalization / suggestion logic.             |
| External APIs | **RxNorm API**, **FDA NDC Directory API** | Reliable drug and NDC data.                                         |
| Cloud         | **Google Cloud Run + GCP Storage**        | Simple serverless deploy path.                                      |
| Database      | **None (MVP)**                            | Results computed on-demand.                                         |
| Auth          | **None (MVP)**                            | Optional in future if multiple users.                               |

---

### **5. Feature Breakdown — Vertical Slices**

#### **Feature 1: Drug Input & Normalization**

**User Story:**
As a pharmacist, I want to input a drug name or NDC and have it normalized to a standard RxCUI.
**Acceptance Criteria:**

* [ ] Accepts free-text drug names or NDCs.
* [ ] Calls RxNorm API and returns standardized RxCUI.
* [ ] Displays normalized name to user.
  **Data Model Notes:** `{ input_text, rxcui, normalized_name }`
  **Edge Cases:** invalid drug name, no RxCUI match, API timeout → show retry + error banner.

#### **Feature 2: NDC Retrieval & Validation**

**User Story:**
As a pharmacy technician, I want valid NDCs and their package sizes for a given RxCUI.
**Acceptance Criteria:**

* [ ] Fetch from FDA NDC Directory API.
* [ ] Flag inactive NDCs.
* [ ] Show package sizes + units.
  **Data Model Notes:** `{ ndc_code, package_size, is_active, strength_unit }`
  **Edge Cases:** no NDCs returned; handle 404s gracefully.

#### **Feature 3: Quantity Calculation**

**User Story:**
As a pharmacist, I want the system to compute correct dispense quantity based on SIG and days’ supply.
**Acceptance Criteria:**

* [ ] Parse SIG (e.g., “1 tab twice daily”).
* [ ] Multiply by days’ supply to get total units.
* [ ] Select best NDC combination (fewest bottles/packs).
  **Data Model Notes:** `{ dosage_per_day, days_supply, total_qty, ndc_selected[] }`
  **Edge Cases:** fractional doses, liquids, inhalers, multi-packs.

#### **Feature 4: Output & Display**

**User Story:**
As a user, I want to see the optimal NDC(s) and quantity with clear status indicators.
**Acceptance Criteria:**

* [ ] Show table of candidate NDCs (active/inactive, match %, over/underfill).
* [ ] Display optimal recommendation highlighted.
* [ ] Provide “Copy JSON” option.
  **Edge Cases:** network fail → “Retry” button.

#### **Feature 5: Error & Notification Handling**

**User Story:**
As a technician, I want alerts for invalid or inactive NDCs.
**Acceptance Criteria:**

* [ ] Highlight inactive rows red.
* [ ] Add toast notification for warnings.
* [ ] Allow user to continue anyway.

---

### **8. .env Setup**

Example `.env`:

```bash
# OpenAI
OPENAI_API_KEY=sk-...
# RxNorm API Base
RXNORM_API_URL=https://rxnav.nlm.nih.gov/REST
# FDA NDC Directory
FDA_NDC_API_URL=https://api.fda.gov/drug/ndc.json
# GCP
GCP_PROJECT_ID=foundation-health-ndc
# Debug flag
DEBUG=true
```

**Manual Setup Notification:**

1. Get an OpenAI API key ([https://platform.openai.com](https://platform.openai.com)). Add to `.env`. Enables AI normalization logic.
2. Ensure access to RxNorm and FDA APIs (public, no key).
3. If deploying, create GCP project + enable Cloud Run API.

---

### **9. .gitignore**

```gitignore
# Node
node_modules
dist
.env
*.log
# SvelteKit
.svelte-kit
.vercel
# IDE
.vscode
.DS_Store
```

---

### **10. Debugging & Logging**

* Use `console.log` + SvelteKit `error()` for structured messages.
* Conditional logging:

```ts
if (process.env.DEBUG === 'true') console.debug('Debug info:', data);
```

* Log API response times.
* Add error boundary UI for failed fetches.

---

### **11. External Setup Instructions (Manual)**

**GCP Deployment:**

1. Install GCP SDK → `brew install --cask google-cloud-sdk`
2. Authenticate → `gcloud auth login`
3. Create project → `gcloud projects create foundation-health-ndc`
4. Enable Cloud Run → `gcloud services enable run.googleapis.com`
5. Deploy →

```bash
npm run build
gcloud run deploy ndc-calc --source . --region=us-central1 --allow-unauthenticated
```

---

### **12. Deployment Plan**

**Local:**

```bash
npm install
npm run dev
# open http://localhost:5173
```

**Build:**

```bash
npm run build
npm run preview
```

**Prod (GCP):** see step 11.

---

### **🧱 TASK_LIST.md STRUCTURE**

#### **PHASE 1 – MVP**

**Epic 1.1: Input + Normalization**

* Task 1.1.1: Build input form (drug/NDC/SIG/days).
* Task 1.1.2: Integrate RxNorm API.

**Epic 1.2: NDC Retrieval**

* Task 1.2.1: FDA NDC API call + parsing.
* Task 1.2.2: Active/inactive flagging.

**Epic 1.3: Quantity Calculation**

* Task 1.3.1: Parse SIG.
* Task 1.3.2: Compute total qty.
* Task 1.3.3: Select optimal package.

**Epic 1.4: Output + UI**

* Task 1.4.1: Render results table.
* Task 1.4.2: Add JSON copy/export.

**Epic 1.5: Deploy**

* Task 1.5.1: Add `.env`.
* Task 1.5.2: Deploy to GCP Run.

---

### **🧩 SOLO-DEV GUARDRAILS**

* Keep one repo: `/ndc-calculator`.
* Store secrets only in `.env`.
* Use strict TypeScript + ESLint.
* Implement features end-to-end per vertical slice.
* Avoid over-engineering—ship MVP first.