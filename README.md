# 💊 RxCalc – NDC Packaging & Quantity Calculator

An AI-accelerated calculator that helps pharmacies accurately match prescriptions to valid National Drug Codes (NDCs) and compute correct dispense quantities—minimizing claim rejections and fulfillment errors.

![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?logo=svelte&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white)

---

## 🎯 What This Does

**Problem:** Pharmacies frequently encounter claim rejections and fulfillment errors due to incorrect NDC matching and quantity miscalculations.

**Solution:** RxCalc takes a drug name (or NDC), prescription instructions (SIG), and days supply—then:

1. **Normalizes** the drug to a standard RxCUI using the RxNorm API
2. **Retrieves** valid NDCs and package sizes from the FDA NDC Directory
3. **Parses** the SIG using AI (OpenAI) to extract dosage information
4. **Calculates** the optimal dispense quantity and best NDC combination
5. **Returns** structured JSON + a clear UI summary

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+ 
- **npm** or **pnpm**
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd RxCalc
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
# Required for AI SIG parsing
OPENAI_API_KEY=sk-your-api-key-here

# Optional - these APIs are public and require no keys
RXNORM_API_URL=https://rxnav.nlm.nih.gov/REST
FDA_NDC_API_URL=https://api.fda.gov/drug/ndc.json

# Enable debug logging (optional)
DEBUG=true
```

> **Note:** The RxNorm and FDA NDC APIs are publicly accessible and don't require API keys.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Try It Out

Click **"Try Example"** to load sample data, or enter:

| Field | Example |
|-------|---------|
| Drug Name or NDC | `Amoxicillin` or `00093-2263-05` |
| SIG (Instructions) | `Take 1 capsule by mouth three times daily` |
| Days Supply | `10` |

Click **Calculate** to see the results!

---

## 📁 Project Structure

```
RxCalc/
├── src/
│   ├── routes/
│   │   ├── +page.svelte          # Main calculator UI
│   │   └── api/
│   │       └── ai/sig/+server.ts # AI SIG parsing endpoint
│   └── lib/
│       ├── services/
│       │   ├── rxnorm.ts         # RxNorm API integration
│       │   ├── ndc.ts            # FDA NDC API integration
│       │   ├── quantity.ts       # Quantity calculation logic
│       │   ├── logger.ts         # Logging utilities
│       │   └── errorHandling.ts  # Error handling
│       ├── components/
│       │   ├── NDCResults.svelte # Results display component
│       │   └── Toast.svelte      # Notification toasts
│       └── types/                # TypeScript type definitions
├── tests/                        # Test files
├── .env                          # Environment variables (create this)
└── package.json
```

---

## 🔧 How It Works

### Input Modes

**AI Mode (Recommended):** Enter natural language SIG like:
- `"Take 1 tablet by mouth twice daily"`
- `"Take 2 capsules PO 3 times daily with food"`
- `"Apply 1 patch topically once daily"`

The OpenAI API extracts: `amount`, `unit`, `frequency`, `timing`, and `route`.

**Manual Mode:** Directly enter:
- Tablets/units per dose
- Times per day

### API Flow

```
User Input → RxNorm API → FDA NDC API → AI SIG Parsing → Quantity Calculation → Results
     ↓            ↓             ↓              ↓                  ↓
  Drug/NDC    Get RxCUI    Get NDCs     Parse dosage      Find optimal
              & drug name  & packages   from SIG text     NDC combination
```

### External APIs Used

| API | Purpose | Auth Required |
|-----|---------|---------------|
| [RxNorm API](https://rxnav.nlm.nih.gov/REST) | Drug normalization (name → RxCUI) | No |
| [FDA NDC Directory](https://api.fda.gov/drug/ndc.json) | NDC lookup & package info | No |
| [OpenAI API](https://api.openai.com) | AI-powered SIG parsing | Yes (API key) |

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests with Vitest |
| `npm run test:ui` | Run tests with Vitest UI |
| `npm run check` | TypeScript type checking |

### Performance Testing

| Command | Description |
|---------|-------------|
| `npm run perf:load` | Run Artillery load tests |
| `npm run perf:lighthouse` | Run Lighthouse audit |
| `npm run perf:autocannon` | Run autocannon benchmarks |
| `npm run perf:comprehensive` | Run all performance tests |

---

## 🌐 Deployment (Google Cloud Run)

### Prerequisites

1. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. Authenticate: `gcloud auth login`

### Deploy

```bash
# Build the application
npm run build

# Deploy to Cloud Run
gcloud run deploy rxcalc \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="OPENAI_API_KEY=your-key-here"
```

Or use the included `cloudbuild.yaml` for CI/CD with Cloud Build.

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI SIG parsing |
| `DEBUG` | No | Set to `true` to enable debug logging |
| `RXNORM_API_URL` | No | Override RxNorm API base URL |
| `FDA_NDC_API_URL` | No | Override FDA NDC API base URL |

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests with watch mode
npm run test -- --watch

# Run with UI
npm run test:ui
```

Test coverage includes:
- Environment variable validation
- Logger functionality
- NDC integration
- Quantity calculations
- RxNorm integration
- SvelteKit initialization
- TypeScript configuration

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Frontend | SvelteKit + TypeScript | Minimal boilerplate, great DX, unified frontend/backend |
| Backend | SvelteKit server routes | SSR + API endpoints in one codebase |
| AI | OpenAI GPT-3.5-turbo | Reliable SIG parsing with structured output |
| Drug Data | RxNorm API | Industry-standard drug normalization |
| NDC Data | FDA NDC Directory | Official source for NDC information |
| Deployment | Google Cloud Run | Simple serverless deployment |

---

## 📝 Example Output

When you calculate for **Amoxicillin**, **"Take 1 capsule three times daily"**, **10 days**:

```json
{
  "normalization": {
    "rxcui": "308191",
    "drugName": "Amoxicillin"
  },
  "quantity": {
    "totalQuantity": 30,
    "unit": "capsule",
    "daysSupply": 10
  },
  "optimization": {
    "totalPackages": 1,
    "waste": 0,
    "optimalCombination": [
      {
        "ndc": "00093-2263-05",
        "packageSize": 30,
        "quantity": 1
      }
    ]
  }
}
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE.md).

---

## 🐛 Troubleshooting

### "AI service not configured"
Make sure `OPENAI_API_KEY` is set in your `.env` file and restart the dev server.

### "Drug not found in RxNorm database"
Try being more specific with the drug name and strength (e.g., "Amoxicillin 500mg" instead of just "Amoxicillin").

### "No NDCs found"
Some drugs may not have active NDCs in the FDA database. Try the generic name or a different strength.

### Manual Mode
If AI parsing fails, switch to **Manual Mode** and enter the dosage amounts directly.

---

<p align="center">
  Built with ❤️ for pharmacy accuracy
</p>

