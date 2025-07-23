# Release 0.2.0-beta

This beta release introduces the new GitHub-based update system for WAB2B Helper, allowing users to easily check for, download, and install updates directly from GitHub releases.

## 🚀 New Features

- **GitHub-based Update System**: Automatic version checking against GitHub releases
- **Secure Update Downloads**: All downloads verified with SHA256 hash verification
- **Platform-Specific Updates**: Intelligent detection of appropriate packages for Windows, macOS, and Linux
- **Progress Visualization**: Animated download progress indicators with percentage completion
- **Automatic Application Restart**: Seamless transition to the new version after update
- **Update Notifications**: Non-intrusive notifications when updates are available
- **Manual Update Checks**: Option to manually check for updates at any time
- **Update Settings**: User control over automatic update checks
- **Release Notes Display**: View detailed release notes before updating
- **Backup System**: Automatic backup of current version before updating

## 🐛 Bug Fixes

- Fixed file dialog handling in the save file functionality
- Resolved issue with FilePath handling in Tauri dialog API
- Fixed path resolution issues on Windows systems
- Improved error handling for network operations
- Addressed potential memory leaks during file downloads
- Fixed progress reporting for large file downloads
- Resolved issues with file path handling on different platforms
- Fixed potential race conditions during update installation

## 🔧 Improvements

- **Streamlined Build Process**: Single-run build command with optimized steps
- **Automatic Checksum Generation**: Built-in system for generating SHA256 hashes
- **Enhanced User Interface**: Modern, animated components for better user experience
- **Improved Cross-Platform Compatibility**: Better support across Windows, macOS, and Linux
- **Reduced Dependencies**: Minimized external dependencies for better stability
- **Optimized File Handling**: More efficient file operations during updates
- **Better Error Messages**: More descriptive error messages for troubleshooting
- **Code Documentation**: Comprehensive documentation of the update system
- **Consistent File Naming**: Standardized naming convention for release assets

## 📦 Assets

The following files are available for download:

### Windows

- `wab2b-helper_0.2.0-beta_windows-x86_64.msi` - Windows installer (MSI)
- `wab2b-helper_0.2.0-beta_windows-x86_64.exe` - Windows installer (NSIS)

## 🔐 Security Verification

All release assets are accompanied by a `checksums.txt` file containing SHA256 hashes for verification. The update system will automatically verify these hashes before installation.

## 📋 Installation Instructions

### Windows

1. Download the appropriate installer for your system (.msi or .exe)
2. Run the installer and follow the on-screen instructions
3. The application will start automatically after installation

## 🔄 Update Instructions

If you're updating from a previous version, the application will automatically detect and install updates. You can also check for updates manually from the Help menu.

## 🧪 Technical Details

This release implements a custom GitHub-based update system with the following components:

- **GitHub API Integration**: Fetches release information from GitHub releases
- **Platform Detection**: Automatically selects the appropriate update package
- **Download Manager**: Handles secure downloading with progress tracking
- **Hash Verification**: Ensures update integrity with SHA256 verification
- **Update Installer**: Platform-specific installation methods
- **Backup System**: Creates backups before applying updates
- **Error Recovery**: Restores from backup if update fails

## ⚠️ Beta Release Notice

This is a beta release intended for testing purposes. It may contain bugs or incomplete features. Please report any issues you encounter.

## 🔮 Coming Soon

Features planned for upcoming releases:

- Delta updates for smaller download sizes
- Background update downloads
- Update scheduling options
- More granular update settings
- Support for pre-release update channels

## 🙏 Acknowledgements

Special thanks to:
- The Tauri team for the excellent cross-platform framework
- Contributors who helped test the update system
- Users who provided valuable feedback during development