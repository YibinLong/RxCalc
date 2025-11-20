# RxCalc - Beginner's Guide to the Codebase

## What This App Does

RxCalc is a **pharmacy prescription calculator** that helps pharmacists find the right medication packages and calculate the correct quantity to dispense.

**Example:** A doctor prescribes "Lisinopril 10mg, take 1 tablet twice daily for 30 days". The pharmacist needs to know:
- Which specific medication package (NDC code) to use
- How many tablets to dispense (60 tablets in this case)
- Which bottle size is optimal (e.g., one 60-count bottle vs two 30-count bottles)

This app automates that entire process.

---

## Tech Stack (What Everything Is)

### Frontend & Backend: **SvelteKit**
- **What it is:** A framework for building web applications with Svelte
- **Why it's here:** Handles both the user interface (what you see) AND the server logic (API calls) in one unified codebase
- **Key concept:** Instead of separate frontend and backend projects, SvelteKit does both

### Language: **TypeScript**
- **What it is:** JavaScript with type checking
- **Why it's here:** Catches errors before you run the code
- **Example:** `let age: number = 25` ensures `age` is always a number

### External APIs (Data Sources)
1. **RxNorm API** - Standardizes drug names (e.g., "Lisinopril" → RxCUI code)
2. **FDA NDC Directory API** - Provides valid medication package codes and sizes
3. **OpenAI API** (optional) - Helps parse complex prescription instructions

---

## Project Structure (Where Everything Lives)

```
RxCalc/
├── src/                           # Main source code
│   ├── routes/                    # Pages and API endpoints
│   │   ├── +page.svelte          # Main calculator page (the UI)
│   │   └── api/                   # Backend API routes
│   │       └── ai/sig/+server.ts # AI-powered SIG parsing endpoint
│   │
│   ├── lib/                       # Reusable code
│   │   ├── components/            # UI components
│   │   │   ├── NDCResults.svelte # Table showing medication options
│   │   │   ├── Toast.svelte      # Popup notifications
│   │   │   └── DebugPanel.svelte # Developer debugging tools
│   │   │
│   │   ├── services/              # Business logic (the "brain")
│   │   │   ├── rxnorm.ts         # Talks to RxNorm API
│   │   │   ├── ndc.ts            # Talks to FDA NDC API
│   │   │   ├── quantity.ts       # Calculates dispense quantities
│   │   │   ├── logger.ts         # Records events for debugging
│   │   │   └── errorHandling.ts  # Handles errors gracefully
│   │   │
│   │   └── stores/                # Shared state management
│   │       └── toast.ts          # Manages notification popups
│   │
│   └── app.html                   # HTML template wrapper
│
├── tests/                         # Automated tests
├── build/                         # Compiled production code (auto-generated)
├── package.json                   # Dependencies and scripts
└── docs/                          # Documentation (you are here!)
```

---

## How It Works (The Flow)

### 1. **User Input** (`+page.svelte`)
The user enters:
- Drug name (e.g., "Lisinopril 10mg")
- SIG/Instructions (e.g., "Take 1 tablet twice daily")
- Days supply (e.g., "30 days")

### 2. **Drug Normalization** (`rxnorm.ts`)
- **Problem:** Drug names vary (Lisinopril, lisinopril, LISINOPRIL)
- **Solution:** Call RxNorm API to get a standardized RxCUI code
- **Output:** `RxCUI: 314076` for "Lisinopril 10mg"

### 3. **NDC Retrieval** (`ndc.ts`)
- **Problem:** Need to find actual medication packages
- **Solution:** Use RxCUI to query FDA NDC Directory API
- **Output:** List of NDC codes with package sizes (e.g., 30-count, 60-count, 90-count bottles)

### 4. **Quantity Calculation** (`quantity.ts`)
- **Problem:** How many tablets to dispense?
- **Solution:** Parse the SIG → Calculate daily dose → Multiply by days supply
- **Example:** 1 tablet × 2 times/day × 30 days = 60 tablets

### 5. **Package Optimization** (`quantity.ts`)
- **Problem:** Which bottle size(s) should we use?
- **Solution:** Find the combination that minimizes waste and bottles
- **Example:** Dispense one 60-count bottle (perfect match) instead of two 30-count bottles

### 6. **Display Results** (`NDCResults.svelte`)
Shows a table with:
- Active/inactive medications (color-coded)
- Package sizes
- Match percentage (how close to the ideal quantity)
- Overfill/underfill indicators

---

## Key Files Explained

### `src/routes/+page.svelte`
**Purpose:** The main calculator page
**What it does:**
- Displays the input form
- Validates user input
- Orchestrates the entire calculation flow
- Manages state (loading, errors, results)

**Beginner tip:** This is the "control center" - start here to understand the app

### `src/lib/services/rxnorm.ts`
**Purpose:** Standardizes drug names
**What it does:**
- Takes free-text drug name
- Calls RxNorm API
- Returns standardized RxCUI code

**Why it matters:** Without this, "Lisinopril" and "lisinopril 10mg" would be treated as different drugs

### `src/lib/services/ndc.ts`
**Purpose:** Fetches available medication packages
**What it does:**
- Takes RxCUI code
- Queries FDA NDC Directory
- Returns list of valid NDCs with package info

**Why it matters:** This is where we learn what medication packages actually exist in the market

### `src/lib/services/quantity.ts`
**Purpose:** The calculation engine
**What it does:**
- Parses SIG instructions ("1 tablet twice daily")
- Calculates total quantity needed
- Finds optimal package combination

**Why it matters:** This is the core logic that solves the pharmacy problem

### `src/lib/components/NDCResults.svelte`
**Purpose:** Displays the results table
**What it does:**
- Shows all NDC options
- Highlights active vs inactive medications
- Indicates best match with visual indicators

**Why it matters:** This is what pharmacists see to make their decision

---

## Important Concepts

### What is an NDC?
**NDC = National Drug Code**
- A unique 11-digit identifier for each medication package
- Format: `12345-6789-01` (manufacturer-product-package)
- Example: Two bottles of the same drug but different sizes have different NDCs

### What is RxCUI?
**RxCUI = RxNorm Concept Unique Identifier**
- A standardized code for drug concepts
- Example: All "Lisinopril 10mg tablets" share the same RxCUI regardless of manufacturer

### What is a SIG?
**SIG = Signatura (Latin for "instructions")**
- Prescription directions
- Examples: "Take 1 tablet twice daily", "Apply to affected area once daily"

---

## Running the App

### Development Mode (for testing):
```bash
npm install          # Install dependencies (do this first)
npm run dev          # Start development server
```
Then open: http://localhost:5173

### Production Build:
```bash
npm run build        # Compile for production
npm run preview      # Test production build locally
```

### Running Tests:
```bash
npm test             # Run all tests
npm run test:ui      # Run tests with visual UI
```

---

## Common Tasks

### Adding a New Feature
1. Create/modify service file in `src/lib/services/`
2. Add tests in `tests/`
3. Update UI in `src/routes/+page.svelte` or components
4. Test with `npm run dev`

### Debugging
- Check browser console (F12) for frontend errors
- Check terminal for backend errors
- Use `DebugPanel.svelte` component (appears on page in dev mode)
- Review logs in `logger.ts`

### Understanding Data Flow
1. User input → Validation
2. Drug name → RxNorm → RxCUI
3. RxCUI → NDC API → List of packages
4. SIG + Days → Calculate quantity
5. Quantity + Packages → Optimize selection
6. Results → Display in table

---

## Environment Variables

Create a `.env` file in the root:
```bash
OPENAI_API_KEY=sk-...           # Optional: for AI SIG parsing
DEBUG=true                       # Shows debug info
```

**Note:** RxNorm and FDA APIs are public - no API keys needed!

---

## Performance Testing

This app includes performance testing tools:
```bash
npm run perf:lighthouse          # Test page load speed
npm run perf:load                # Test under heavy traffic
npm run perf:comprehensive       # Run all performance tests
```

---

## Need Help?

1. **Start with:** `src/routes/+page.svelte` (the main page)
2. **Understand services:** Read `src/lib/services/quantity.ts` (core logic)
3. **Check types:** Look at `src/lib/types/*.ts` for data structures
4. **Run tests:** `npm test` to see expected behaviors
5. **Read PRD.md:** Product requirements document with full context

---

## Glossary

| Term | Meaning |
|------|---------|
| **SvelteKit** | Framework for building web apps with Svelte |
| **Component** | Reusable UI element (e.g., button, table) |
| **Service** | Module that handles specific business logic |
| **API Route** | Server endpoint (e.g., `/api/ai/sig`) |
| **Store** | Shared state that multiple components can access |
| **Type** | TypeScript definition of data structure |
| **RxCUI** | Standardized drug identifier from RxNorm |
| **NDC** | National Drug Code (package identifier) |
| **SIG** | Prescription instructions |

---

**Remember:** This app is essentially a smart calculator that:
1. Understands what drug you want (RxNorm)
2. Finds available packages (NDC)
3. Calculates how much to dispense (Quantity)
4. Shows you the best option (Optimization)

Everything else is just making this process reliable, fast, and user-friendly!

