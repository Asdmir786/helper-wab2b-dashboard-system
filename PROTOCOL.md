# wab2b-helper Custom Protocol Handler

This document explains how to use the custom `wab2b-helper:` protocol handler to download and manage various types of attachments.

## Protocol Format

The wab2b-helper protocol follows this format:

```text
wab2b-helper:<URL>
```

Where `<URL>` is a valid URL to a file you want to download and manage.

## Examples

### Images

```text
wab2b-helper:https://example.com/image.jpg
wab2b-helper:https://example.com/image.png
wab2b-helper:https://example.com/image.gif
```

### Videos

```text
wab2b-helper:https://example.com/video.mp4
wab2b-helper:https://example.com/video.webm
```

### Documents

```text
wab2b-helper:https://example.com/document.pdf
wab2b-helper:https://example.com/document.docx
wab2b-helper:https://example.com/spreadsheet.xlsx
wab2b-helper:https://example.com/presentation.pptx
```

### Other File Types

```text
wab2b-helper:https://example.com/archive.zip
wab2b-helper:https://example.com/data.csv
wab2b-helper:https://example.com/file.txt
```

## How It Works

1. When you click a link with the `wab2b-helper:` protocol, your operating system will launch the wab2b-helper application
2. The application will extract the URL from the protocol string
3. It will download the file to a temporary location
4. The file will be displayed in the application with preview capabilities
5. You can then choose to:
   - Copy the file to the clipboard
   - Save the file to a permanent location
   - Preview the file using the default application for that file type

## Integration Examples

### HTML Link

```html
<a href="wab2b-helper:https://example.com/file.pdf">Download with wab2b-helper</a>
```

### JavaScript

```javascript
// Open a file with wab2b-helper
function openWithWab2bHelper(url) {
  window.location.href = `wab2b-helper:${url}`;
}

// Example usage
document.getElementById('download-button').addEventListener('click', () => {
  openWithWab2bHelper('https://example.com/file.pdf');
});
```

### Markdown

```markdown
[Download with wab2b-helper](wab2b-helper:https://example.com/file.pdf)
```

## Security Considerations

- The application only downloads files from the URL specified in the protocol
- Files are stored in a temporary location and are automatically cleaned up
- The application validates URLs before downloading to prevent malicious requests
- Only specific file types are supported to prevent security issues

## Troubleshooting

If the protocol handler is not working:

1. Make sure the wab2b-helper application is installed correctly
2. Verify that the application is registered as a protocol handler in your operating system
3. Check that the URL format is correct and the file is accessible
4. Ensure your network connection is working properly

---

*Note: This protocol handler documentation is subject to change as the application evolves. Always refer to the latest documentation for the most up-to-date information.*
