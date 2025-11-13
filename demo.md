# NDC Calculator Demo Script

## Quick Demo Plan (5 minutes)

This demo showcases the core functionality of your NDC Packaging & Quantity Calculator.

### Test Cases to Run:

#### 1. **Common Drug Name Input** (Lipitor)
- **Drug**: Lipitor 20mg
- **SIG**: 1 tablet daily
- **Days Supply**: 30 days
- **Expected**: Should find RxCUI, retrieve multiple NDC packages, calculate 30 tablets needed

#### 2. **NDC Code Input** (Tylenol)
- **NDC**: 50580-050-02 (Tylenol 500mg)
- **SIG**: 2 tablets every 6 hours
- **Days Supply**: 10 days
- **Expected**: Direct NDC lookup, find 20 tablets needed (2 tabs × 4 doses × 10 days)

#### 3. **Edge Case - Invalid Drug**
- **Drug**: FakeDrug 999mg
- **Expected**: Should show "Drug not found" error gracefully

#### 4. **Complex Dosage** (Metformin)
- **Drug**: Metformin 500mg
- **SIG**: 2 tablets twice daily
- **Days Supply**: 90 days
- **Expected**: 240 tablets needed, show optimal package combinations

### Demo Instructions:

1. **Start the app**:
```bash
npm run dev
```
2. **Open browser** to `http://localhost:5173`

### Step-by-Step Demo:

#### Demo 1: Well-known drug (Lipitor)
1. Enter "Lipitor 20mg" in drug field
2. SIG: "1 tablet daily"
3. Days Supply: "30"
4. Click "Calculate"
5. **Highlight**:
   - RxCUI normalization works
   - Multiple NDC packages returned
   - Active/inactive status shown
   - 30 tablets calculated
   - Optimal package selection

#### Demo 2: Direct NDC lookup (Tylenol)
1. Enter "50580-050-02" in drug field
2. SIG: "2 tablets every 6 hours"
3. Days Supply: "10"
4. Click "Calculate"
5. **Highlight**:
   - NDC format validation works
   - Direct FDA NDC API lookup
   - Complex SIG parsing (20 tablets total)
   - Package optimization

#### Demo 3: Error handling
1. Enter "InvalidDrugName 999mg"
2. SIG: "1 tablet daily"
3. Days Supply: "30"
4. Click "Calculate"
5. **Highlight**: Graceful error handling with helpful message

#### Demo 4: Large quantity (Metformin)
1. Enter "Metformin 500mg"
2. SIG: "2 tablets twice daily"
3. Days Supply: "90"
4. Click "Calculate"
5. **Highlight**:
   - Complex SIG parsing (240 tablets)
   - Multi-package optimization
   - Cost-effective package selection

### Key Features to Point Out:

✅ **RxNorm Integration**: "See how it normalizes drug names to RxCUIs"
✅ **FDA NDC API**: "Real-time data from FDA NDC Directory"
✅ **Smart Parsing**: "Understands medical SIG abbreviations"
✅ **Package Optimization**: "Finds minimal waste combinations"
✅ **Active/Inactive Status**: "Flags inactive NDCs for safety"
✅ **Error Handling**: "Graceful failures with clear messages"

### Performance Notes:
- Each call takes 2-3 seconds (API dependent)
- Caching speeds up repeat searches
- Progress indicators show each step

### Backup Demo Drugs if needed:
- **Atorvastatin** (generic Lipitor)
- **Ibuprofen** 800mg
- **Amoxicillin** 500mg
- **Amlodipine** 10mg

This demo covers all major features and edge cases in about 5 minutes!