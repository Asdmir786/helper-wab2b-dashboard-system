# WAB2B Helper

A lightweight desktop app that helps WhatsApp Business users automatically copy media attachments to the clipboard.

## Features

- 📋 One-click media copying to clipboard
- 🔗 Custom URL scheme for direct integration with web apps
- 🖼️ Support for images, videos, and documents
- 💾 Download and save option for attachments
- 🌓 Light and dark mode support
- 💨 Small footprint (<5MB installer)
- 🖥️ Cross-platform (Windows, macOS, Linux)

## URL Scheme Integration

WAB2B Helper can be triggered directly from your web application using the custom URL scheme:

```
wab2b-helper:https://example.com/path/to/attachment.jpg
```

When this URL is opened:
1. The helper app launches automatically
2. The attachment is copied to the clipboard
3. A notification confirms the action
4. User can paste directly into WhatsApp or choose to download the file

### Integration Example

In your web application, add a button with this JavaScript:

```javascript
function openInHelper(attachmentUrl) {
  window.location.href = `wab2b-helper:${attachmentUrl}`;
}
```

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
- **Clipboard Handling**: tauri-plugin-clipboard-manager

## Project Structure

- `frontend/` - React frontend code
- `backend/` - Rust backend code
- `public/` - Static assets

## How it works

1. Select your media in the WAB2B dashboard
2. Click to copy all media to clipboard (or use the URL scheme)
3. Paste directly into WhatsApp Web or mobile app

## License

MIT
