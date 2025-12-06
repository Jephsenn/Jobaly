# Release Guide

This guide covers how to build and release new versions of JobTracker with automatic updates.

## Prerequisites

1. **GitHub Repository**: Your code must be on GitHub (already set up at `Jephsenn/JobTracker`)
2. **GitHub Personal Access Token**: Required for publishing releases
   - Go to GitHub Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
   - Generate new token with `repo` scope (full control of private repositories)
   - Save the token securely - you'll need it for publishing

## Version Management

The app version is defined in `package.json`:

```json
{
  "version": "0.1.0"
}
```

### Versioning Strategy

Follow semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR** (1.0.0): Breaking changes, major rewrites
- **MINOR** (0.1.0): New features, non-breaking changes
- **PATCH** (0.0.1): Bug fixes, minor improvements

## Building a Release

### 1. Update Version

Update the version in `package.json`:

```powershell
# For a new feature
npm version minor

# For a bug fix
npm version patch

# Or manually edit package.json
```

### 2. Build the App

Build for your platform:

```powershell
# Windows
npm run package:win

# Mac (if on Mac)
npm run package:mac

# Linux (if on Linux)
npm run package:linux

# All platforms (requires proper setup)
npm run package
```

This creates installer files in the `dist/` folder:
- Windows: `JobTracker-Setup-0.1.0.exe`
- Mac: `JobTracker-0.1.0.dmg`
- Linux: `JobTracker-0.1.0.AppImage`

### 3. Test the Build

Install and test the build locally before publishing:
1. Run the installer from `dist/`
2. Verify all features work
3. Check that the app opens without errors

## Publishing a Release

### Option 1: Manual Release (Recommended for First Time)

1. **Create GitHub Release**:
   - Go to your repository on GitHub
   - Click "Releases" → "Create a new release"
   - Tag version: `v0.1.0` (must match package.json with `v` prefix)
   - Release title: `v0.1.0` or `Version 0.1.0`
   - Description: List changes and new features
   - Upload files: Drag installer files from `dist/` folder
     - `JobTracker-Setup-0.1.0.exe`
     - `latest.yml` (IMPORTANT - needed for auto-updates)
   - Click "Publish release"

2. **Verify Files**:
   - Make sure both the `.exe` and `latest.yml` files are uploaded
   - The `latest.yml` file tells existing installations about the new version

### Option 2: Automated Publishing (Advanced)

Set the GitHub token as an environment variable:

```powershell
# Windows PowerShell
$env:GH_TOKEN="your_github_personal_access_token"

# Then build and publish
npm run package:win
```

With the token set, electron-builder will automatically create the GitHub Release and upload files.

## Auto-Update Flow

Once your app is published with auto-updates:

1. **User Opens App**: App checks for updates 3 seconds after startup
2. **Update Found**: Dialog asks user to download
3. **User Accepts**: Update downloads in background with progress bar
4. **Download Complete**: Dialog asks user to restart
5. **User Restarts**: New version installs automatically

### Update Check Locations

- **Automatic**: On app startup (after 3-second delay)
- **Manual**: Help menu → "Check for Updates"

## Testing Auto-Updates

To test the update mechanism:

1. **Build and Install v0.1.0**:
   ```powershell
   # Edit package.json: "version": "0.1.0"
   npm run package:win
   # Install the generated installer
   ```

2. **Publish v0.1.0 to GitHub**:
   - Create release with tag `v0.1.0`
   - Upload `.exe` and `latest.yml`

3. **Build v0.2.0**:
   ```powershell
   # Edit package.json: "version": "0.2.0"
   # Make a small visible change (e.g., update About dialog)
   npm run package:win
   ```

4. **Publish v0.2.0 to GitHub**:
   - Create release with tag `v0.2.0`
   - Upload `.exe` and `latest.yml`

5. **Test Update**:
   - Open the installed v0.1.0 app
   - Wait a few seconds for auto-check, or use Help → Check for Updates
   - Accept the update download
   - Verify update installs correctly

## Troubleshooting

### "No updates available" when you know there's a new version

- Verify the `latest.yml` file is uploaded to GitHub Release
- Check that the version in GitHub Release tag matches `latest.yml`
- Ensure the release is marked as "Latest release" (not pre-release)
- Check app logs for update check errors

### Update downloads but doesn't install

- On Windows, the installer might need administrator privileges
- Check that `autoInstallOnAppQuit` is set to `true` in AutoUpdater.ts
- Verify the downloaded file isn't being blocked by antivirus

### Build fails

```
Error: GitHub token not found
```
- Set the `GH_TOKEN` environment variable
- Or use manual publishing instead

```
Error: Cannot find module 'electron-builder'
```
- Run `npm install` to install dependencies

### Users can't download/install

- Verify GitHub Release is public (not draft)
- Check that installer file uploaded correctly
- Test download link yourself

## Distribution to Your Girlfriend

1. **Build the app**: `npm run package:win`
2. **Create GitHub Release**: Upload installer and `latest.yml`
3. **Share installer link**:
   - Go to Releases page
   - Right-click installer → Copy link
   - Send link to her
4. **Installation**:
   - She downloads and runs the installer
   - App installs to `C:\Users\[Username]\AppData\Local\Programs\JobTracker`
   - Desktop shortcut created automatically
   - Future updates happen automatically!

## Security Notes

- **Code Signing**: For production, you should code-sign your app to avoid Windows SmartScreen warnings
  - Requires a code signing certificate ($100-400/year)
  - Without it, users see "Unknown Publisher" warning
  - Can be bypassed with "More Info" → "Run Anyway"

- **GitHub Token**: Never commit your `GH_TOKEN` to git
  - Keep it in environment variables only
  - Rotate it periodically for security

## Next Steps

- Consider setting up GitHub Actions for automated builds
- Look into code signing for production releases
- Create a changelog/release notes template
- Set up beta testing channel with pre-releases
