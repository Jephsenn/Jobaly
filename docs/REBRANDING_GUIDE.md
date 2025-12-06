# Rebranding to Jobaly - Logo & Favicon Setup

## Files to Add

### 1. Save Your Logo Files

Save the uploaded logo images to the `public` folder:

```
public/
  ├── favicon.ico          # 16x16, 32x32, 48x48 favicon
  ├── logo.svg             # Full logo with text (for header)
  ├── icon.svg             # Icon only (square version)
  ├── logo-192.png         # 192x192 for PWA
  ├── logo-512.png         # 512x512 for PWA
  └── apple-touch-icon.png # 180x180 for iOS
```

### 2. Naming Convention

From your uploaded images:
- **First image** (icon only): Save as `icon.svg` and `favicon.ico`
- **Second image** (full logo with text): Save as `logo.svg`

## Image Conversion Steps

### Create Favicon.ico
1. Use online tool: https://favicon.io/favicon-converter/
2. Upload your first icon image (square one)
3. Download the generated `favicon.ico`
4. Place in `public/favicon.ico`

### Create PNG Versions
1. Use online tool: https://www.iloveimg.com/resize-image/resize-svg
2. Resize to:
   - 192x192 → `logo-192.png`
   - 512x512 → `logo-512.png`
   - 180x180 → `apple-touch-icon.png`

### Save SVG Files
1. **Icon only** (first image): Save as `public/icon.svg`
2. **Full logo** (second image): Save as `public/logo.svg`

## Quick Setup (Manual Steps)

1. **Download both uploaded images**
2. **Rename them:**
   - First (icon) → `icon.svg`
   - Second (logo with text) → `logo.svg`
3. **Place in:** `C:\Users\heatw\Desktop\Code Projects\JobTracker\public\`
4. **Generate favicon.ico** using online tool
5. **Generate PNG versions** (optional but recommended)

## What Will Be Updated Automatically

Once you save the files, the following will be updated via code:
- ✅ HTML title and favicon
- ✅ Header logo
- ✅ Browser tab icon
- ✅ Extension icons
- ✅ PWA manifest

## After Adding Files

Run this command to verify:
```bash
dir public
```

You should see:
- favicon.ico
- logo.svg
- icon.svg
- (Optional) PNG versions
