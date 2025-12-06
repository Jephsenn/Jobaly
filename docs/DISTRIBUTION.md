# Distribution Guide - Job Search Assistant

## 🚀 How to Build & Share the App

### Option 1: Quick Share (Recommended)

**Best for:** Sharing with your girlfriend quickly

1. **Install electron-builder:**
   ```bash
   npm install --save-dev electron-builder
   ```

2. **Build the app:**
   ```bash
   # For Windows
   npm run package:win
   
   # For Mac
   npm run package:mac
   
   # For Linux
   npm run package:linux
   ```

3. **Find the installer:**
   - Location: `dist-electron/` folder
   - Windows: `Job Search Assistant Setup 0.1.0.exe`
   - Mac: `Job Search Assistant-0.1.0.dmg`
   - Linux: `Job Search Assistant-0.1.0.AppImage`

4. **Share the installer:**
   - Upload to Google Drive, Dropbox, or OneDrive
   - Send the link to your girlfriend
   - She downloads and installs it

### Browser Extension Setup

After installing the app, she'll need to install the Chrome extension:

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Navigate to the `extension/` folder in the app installation directory
5. The extension is now active!

---

## 📊 Distribution Options Comparison

### ✅ **Option 1: Executable (Current Setup)**
- **Pros:** 
  - No hosting costs
  - Works offline
  - Full features (database, file system, extension)
  - Easy to set up
- **Cons:** 
  - Must reinstall for updates
  - Separate install per computer
- **Best for:** Personal use, small team (2-5 people)

### 🔄 **Option 2: Auto-Update with GitHub Releases**
- **Pros:** 
  - Automatic updates
  - Version management
  - Still works offline
- **Cons:** 
  - Requires GitHub setup
  - More complex build process
- **Best for:** Growing user base, frequent updates

### 🌐 **Option 3: Web App (Future)**
- **Pros:** 
  - No installation
  - Access from anywhere
  - Automatic updates
- **Cons:** 
  - Requires server ($5-20/month)
  - Extension needs Chrome Web Store ($5 one-time)
  - Major refactoring needed
  - Requires internet connection
- **Best for:** Public release, many users

---

## 🔧 Current Build Commands

```bash
# Development
npm run dev                # Run in development mode

# Build for production
npm run build             # Build React + TypeScript

# Package for distribution
npm run package           # Package for current OS
npm run package:win       # Package for Windows
npm run package:mac       # Package for Mac
npm run package:linux     # Package for Linux
```

---

## 📝 Version Updates

To release a new version:

1. Update version in `package.json`:
   ```json
   "version": "0.2.0"
   ```

2. Rebuild:
   ```bash
   npm run package:win
   ```

3. Share the new installer

---

## 🎯 Next Steps for Scaling

When you're ready to share with more users:

1. **Set up GitHub Releases**
   - Automatic updates
   - Version tracking
   - Free hosting

2. **Add Auto-Updater**
   - Users get updates automatically
   - No manual reinstalls

3. **Eventually: Web App**
   - Host backend on Vercel/Railway
   - Host frontend on Vercel/Netlify
   - Publish extension to Chrome Web Store

---

## 💡 Tips

- **Windows Defender:** Users might see "Windows protected your PC" - this is normal for unsigned apps. Click "More info" → "Run anyway"
- **Mac Gatekeeper:** Users need to right-click → Open the first time
- **Updates:** For now, users need to reinstall manually for updates
- **Data:** All data is stored locally on each computer (not synced)

---

## 🐛 Troubleshooting Build Issues

**Issue:** Build fails with "icon not found"
**Solution:** Make sure `extension/icons/icon.svg` exists or update the `icon` path in `package.json`

**Issue:** App won't start after building
**Solution:** Check that all dependencies are bundled correctly in the `files` array

**Issue:** Extension doesn't work
**Solution:** Extension must be loaded separately in Chrome - it's not bundled with the app

---

## 📧 Support

If your girlfriend encounters issues:
1. Check the app logs (File → View → Toggle Developer Tools)
2. Verify the extension is loaded in Chrome
3. Ensure she's using Chrome (not Edge, Firefox, etc.)
4. Try restarting the app
