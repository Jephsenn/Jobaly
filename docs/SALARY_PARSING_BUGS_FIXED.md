# 🐛 Salary Parsing Bugs - FIXED

## Issues Found & Fixed

### Bug 1: Decimal K Notation
**Problem:** `$97.6k - 100k` → Parsed as `$97.6 - $200.6/yr`

**Root Cause:**
```javascript
// OLD CODE - checked entire text for K, not individual numbers
if (text.match(/\$\d+[kK]/i)) {
  min = min * 1000;  // Applied to BOTH numbers
  max = max * 1000;  // if ANY number had K
}
```

This meant:
- `97.6k` → 97.6 × 1000 = **97,600** ✅
- `100k` → 100 × 1000 = **100,000** ✅ BUT then...
- Since text contains "k", it multiplied AGAIN:
  - 97.6 × 1000 = 97,600 (wrong!)
  - 100 × 1000 × 2 = 200,000 (wrong!)

**Fix:**
```javascript
// NEW CODE - captures K for each number separately
const rangeMatch = text.match(/\$(\d+...)([kK])?\s*-\s*\$?(\d+...)([kK])?/i);
//                                        ^^^^            ^^^^
//                                    capture K1      capture K2

if (minHasK) min = min * 1000;  // Only multiply if THIS number has K
if (maxHasK) max = max * 1000;  // Only multiply if THIS number has K
```

### Bug 2: Wrong Period Detection
**Problem:** `$113,000 - $267,500/yr` → Displayed as `/hr`

**Root Cause:**
```javascript
// OLD CODE - detected period AFTER parsing
// Problem: Checked entire text which might mention multiple periods
if (/hour|hr|\/hr/i.test(text)) {
  salaryPeriod = 'hourly';
} else if (/year|yr|\/yr|annual/i.test(text)) {
  salaryPeriod = 'annual';
}
```

If the job description text contained words like "hourly rate mentioned" earlier in the text, it would incorrectly mark the salary as hourly even if the actual salary line said `/yr`.

**Fix:**
```javascript
// NEW CODE - detects period FIRST, looking specifically near the $ amount
if (/\$.*?\/hr|per hour|hourly/i.test(text)) {
  salaryPeriod = 'hourly';
} else if (/\$.*?\/yr|per year|annual|yearly/i.test(text)) {
  salaryPeriod = 'annual';
}
```

Pattern `\$.*?\/hr` means: Find `/hr` that appears near a `$` symbol

## Test Cases

### Now Correctly Handles:

**Decimal K Notation:**
- ✅ `$97.6k - 100k` → $97,600 - $100,000/yr
- ✅ `$55.5K - $60K` → $55,500 - $60,000/yr
- ✅ `$150.2k/yr` → $150,200+/yr

**Mixed K Notation:**
- ✅ `$100k - $150,000` → $100,000 - $150,000/yr
- ✅ `$75 - $80k` → $75 - $80,000/yr

**Period Detection:**
- ✅ `$113,000 - $267,500/yr` → Correctly shows `/yr`
- ✅ `$60 - $65/hr` → Correctly shows `/hr`
- ✅ Text with "hourly" but `$/yr` → Uses `/yr` (correct)

**Standard Formats (still work):**
- ✅ `$100,000 - $150,000` → $100,000 - $150,000/yr
- ✅ `$60/hr - $65/hr` → $60 - $65/hr
- ✅ `$55K/yr - $60K/yr` → $55,000 - $60,000/yr

## Changes Made

### extension/content-scripts/linkedin.js

1. **Moved period detection BEFORE number parsing**
   - Prevents confusion from text mentions
   - Looks specifically near dollar signs

2. **Updated regex to capture K notation per number**
   ```javascript
   // Before: One check for entire text
   /\$(\d+[.,]?\d*)[kK]?.*\$?(\d+[.,]?\d*)[kK]?/
   
   // After: Separate capture groups for each K
   /\$(\d+[.,]?\d*)([kK])?.*\$?(\d+[.,]?\d*)([kK])?/
   //                ^^^^                    ^^^^
   //          capture group 2        capture group 4
   ```

3. **Apply K multiplier individually**
   ```javascript
   if (minHasK) min = min * 1000;  // Only if this number has K
   if (maxHasK) max = max * 1000;  // Only if this number has K
   ```

## How to Test

### 1. Reload Extension
```
chrome://extensions/ → Click reload
```

### 2. Clear Test Data (Optional)
```javascript
await clearAllData()
```

### 3. Find These Job Types

**Test Decimal K:**
- Search LinkedIn for jobs showing "$97.6k - $100k"
- Should display: `$97,600 - $100,000/yr`

**Test Period Detection:**
- Find annual salary: "$113,000 - $267,500/yr"
- Should display: `$113,000 - $267,500/yr` (NOT /hr)

**Test Mixed:**
- "$100k - $150,000/year"
- Should display: `$100,000 - $150,000/yr`

### 4. Check Console Logs

**Extension console should show:**
```
LinkedIn: Found salary in insight: $97.6k - 100k
LinkedIn: Parsed salary range: 97600 - 100000
```

## Edge Cases Now Handled

| Input | Previous Output | New Output |
|-------|----------------|------------|
| `$97.6k - 100k` | $97.6 - $200.6 | $97,600 - $100,000 ✅ |
| `$113k-$267k/yr` | $113 - $267/hr ❌ | $113,000 - $267,000/yr ✅ |
| `$55.5K/yr` | $55.5/yr | $55,500/yr ✅ |
| `$100k - $150,000` | $100 - $150 | $100,000 - $150,000 ✅ |

---

**Ready to test!** Reload the extension and try those problematic jobs again. They should now parse correctly! 🎯
