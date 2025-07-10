# WAB2B Helper

A lightweight desktop app that helps WhatsApp Business users automatically copy media attachments to the clipboard.

## Features

- 📋 One-click media copying to clipboard
- 🖼️ Support for images, videos, and documents
- 🌓 Light and dark mode support
- 💨 Small footprint (<5MB installer)
- 🖥️ Cross-platform (Windows, macOS, Linux)

## Development

### Prerequisites

- Node.js 18 or higher
- Rust and Cargo (for Tauri)

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run tauri dev

# Build for production
npm run tauri build
```

## Technology Stack

- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS
- **Desktop Framework**: Tauri
- **Clipboard Handling**: tauri-plugin-clipboard

## Project Structure

- `src/` - React frontend code
- `src-tauri/` - Rust backend code
- `public/` - Static assets

## How it works

1. Select your media in the WAB2B dashboard
2. Click to copy all media to clipboard
3. Paste directly into WhatsApp Web or mobile app

## License

MIT
