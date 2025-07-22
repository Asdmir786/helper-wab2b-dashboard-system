# GitHub Release Format

This document shows the recommended format for creating GitHub releases for the WAB2B Helper application.

## Release Tag Format

Use semantic versioning with a `v` prefix:
- `v1.0.0` - Major release
- `v1.1.0` - Minor release  
- `v1.0.1` - Patch release
- `v1.0.0-beta.1` - Pre-release

## Release Title Format

```code
Version 1.0.0
```

## Release Description Template

```markdown
# Release 1.0.0

Brief description of what's new in this release.

## 🚀 New Features
- Feature 1 description
- Feature 2 description

## 🐛 Bug Fixes
- Bug fix 1 description
- Bug fix 2 description

## 🔧 Improvements
- Improvement 1 description
- Improvement 2 description

## 📦 Assets

The following files are available for download:

### Windows
- `wab2b-helper_1.0.0_x64_en-US.msi` - Windows installer (MSI)
- `wab2b-helper_1.0.0_x64-setup.exe` - Windows installer (NSIS)

### macOS
- `wab2b-helper_1.0.0_x64.dmg` - macOS disk image
- `wab2b-helper_1.0.0_aarch64.dmg` - macOS disk image (Apple Silicon)

### Linux
- `wab2b-helper_1.0.0_amd64.deb` - Debian package
- `wab2b-helper_1.0.0_amd64.AppImage` - AppImage

## 🔐 SHA256 Checksums

```
a1b2c3d4e5f6... wab2b-helper_1.0.0_x64_en-US.msi
b2c3d4e5f6a7... wab2b-helper_1.0.0_x64-setup.exe
c3d4e5f6a7b8... wab2b-helper_1.0.0_x64.dmg
d4e5f6a7b8c9... wab2b-helper_1.0.0_aarch64.dmg
e5f6a7b8c9d0... wab2b-helper_1.0.0_amd64.deb
f6a7b8c9d0e1... wab2b-helper_1.0.0_amd64.AppImage
```

**Note:** The actual checksums will be generated automatically by the build process and can be found in the `checksums.txt` file.
```

## How to Create a Release

1. **Build the application with checksums:**
   ```bash
   pnpm tauri build
   ```
   This will automatically generate checksums for all build artifacts.

2. **Create a new release on GitHub:**
   - Go to your repository's releases page
   - Click "Create a new release"
   - Use the tag format above (e.g., `v1.0.0`)
   - Use the release title format above
   - Copy and adapt the release description template

3. **Upload assets:**
   - Upload all build artifacts from `src-tauri/target/release/bundle/`
   - Upload the generated `checksums.txt` file
   - Copy the checksums from `checksums.txt` into the release description

4. **Publish the release**

The update system will automatically detect new releases and notify users.