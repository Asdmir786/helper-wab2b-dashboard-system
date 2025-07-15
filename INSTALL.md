# wab2b-helper Installation Guide

This guide will walk you through the process of setting up and running the wab2b-helper application for development.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js**: v22.17 LTS or later
- **Rust**: 1.76 or later (required for Tauri)
- **Git**: For version control

### Platform-specific dependencies

#### Windows

- Microsoft Visual Studio C++ Build Tools
- WebView2 component

#### macOS

- Xcode Command Line Tools

#### Linux

- Various development packages (see [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites))

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/wab2b-helper.git
cd wab2b-helper
```

### 2. Install Dependencies

```bash
# Install npm dependencies
npm install
```

### 3. Configure Tailwind CSS

The project uses Tailwind CSS v4.1.11. The configuration is already set up in the project, but if you need to modify it:

- `tailwind.config.js`: Contains theme customization
- `postcss.config.js`: Contains PostCSS configuration for Tailwind

### 4. Development Workflow

#### Start the Development Server

```bash
# Start the development server with hot-reload
npm run tauri dev
```

This will launch the application in development mode with hot-reloading enabled.

#### Build for Production

```bash
# Build the application for production
npm run tauri build
```

This will create platform-specific binaries in the `src-tauri/target/release` directory.

## Project Structure

```text
wab2b-helper/
├── src/                  # Frontend React code
│   ├── components/       # React components
│   ├── App.tsx           # Main React component
│   └── main.tsx          # React entry point
├── src-tauri/            # Rust backend code
│   ├── src/              # Rust source code
│   │   ├── lib.rs        # Main Rust library
│   │   └── main.rs       # Rust entry point
│   ├── Cargo.toml        # Rust dependencies
│   └── tauri.conf.json   # Tauri configuration
├── public/               # Static assets
├── package.json          # npm dependencies
├── tailwind.config.js    # Tailwind CSS configuration
└── postcss.config.js     # PostCSS configuration
```

## Custom Protocol Handler

The application registers a custom protocol handler for `wab2b-helper:` URLs. To test this functionality:

1. Build and install the application
2. Create a link with the format: `wab2b-helper:https://example.com/file.jpg`
3. Click the link, and the application should launch and download the file

## Troubleshooting

### Common Issues

1. **Build Errors**:
   - Ensure you have the latest Rust toolchain installed
   - Check that all dependencies are installed correctly

2. **Protocol Handler Not Working**:
   - Make sure the application is properly registered in your system
   - Verify the URL format is correct: `wab2b-helper:https://example.com/file.jpg`

3. **File Download Issues**:
   - Check your network connection
   - Verify the URL is accessible and the file exists

### Getting Help

If you encounter any issues not covered here, please:

1. Check the [GitHub Issues](https://github.com/yourusername/wab2b-helper/issues) for similar problems
2. Create a new issue with detailed information about your problem

## Updating Dependencies

To update the project dependencies to their latest versions:

```bash
# Update npm dependencies
npm update

# Update Rust dependencies
cd src-tauri
cargo update
```

---

*Note: This installation guide is subject to change as the project evolves. Always refer to the latest documentation for the most up-to-date information.*
