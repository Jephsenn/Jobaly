# 🎨 Replace Logo Files - Quick Guide

## Current Status
✅ Placeholder logos created - App won't break
📝 Ready for your custom Jobaly logos

## Replace These Files

Navigate to: `C:\Users\heatw\Desktop\Code Projects\JobTracker\public\`

### Required Files (replace placeholders):

1. **icon.svg** - Square icon version (the one with magnifying glass on resume)
   - Current: Placeholder
   - Replace with: Your first uploaded image

2. **logo.svg** - Full logo with "Jobaly" text
   - Current: Placeholder  
   - Replace with: Your second uploaded image

### Optional Files (recommended):

3. **favicon.ico** - Browser tab icon
   - Generate from your icon.svg at: https://favicon.io/favicon-converter/
   - Drag icon.svg → Download → Save as `favicon.ico`

4. **PNG versions** for better compatibility:
   ```
   logo-192.png  (192x192)
   logo-512.png  (512x512)
   apple-touch-icon.png (180x180)
   ```
   - Generate at: https://www.iloveimg.com/resize-image/resize-svg
   - Upload your icon.svg → Resize to sizes above

## How to Replace

### Method 1: Direct Replace
1. Open File Explorer
2. Navigate to `public` folder
3. Delete placeholder files
4. Drag your logo files into the folder
5. Rename them to match (icon.svg, logo.svg)

### Method 2: Rename Your Files
1. Save your uploaded images
2. Rename them:
   - First image (icon) → `icon.svg`
   - Second image (full logo) → `logo.svg`
3. Copy to `public` folder
4. Overwrite existing files

## What Happens After Replacement

The app will automatically use your logos in:
- ✅ Browser tab (favicon)
- ✅ Sidebar header
- ✅ Page title
- ✅ PWA manifest
- ✅ Apple touch icon

## Test Your Logos

1. Replace the files
2. Refresh browser (Ctrl+R or F5)
3. Check:
   - Sidebar shows your logo
   - Browser tab shows favicon
   - Clear and sharp on all screen sizes

## File Locations Reference

```
public/
  ├── icon.svg              ← Replace with icon image
  ├── logo.svg              ← Replace with full logo
  ├── favicon.ico           ← Generate from icon
  ├── manifest.json         ← Already configured ✅
  ├── logo-192.png          ← Optional (for PWA)
  ├── logo-512.png          ← Optional (for PWA)
  └── apple-touch-icon.png  ← Optional (for iOS)
```

## Quick Command to Open Folder

Run in PowerShell:
```powershell
explorer "C:\Users\heatw\Desktop\Code Projects\JobTracker\public"
```

Or click the address bar in VS Code file explorer and type: `public`

## Need Help?

If logos don't show up after replacement:
1. Hard refresh: Ctrl+Shift+R
2. Clear browser cache
3. Restart dev server: Stop (Ctrl+C) and `npm run dev`
4. Check file names match exactly (case-sensitive)
