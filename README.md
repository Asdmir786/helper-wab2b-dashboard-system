# wab2b-helper: Custom Protocol Handler for Attachments

## Technical Specification Document

### Overview

The wab2b-helper application is a desktop utility designed to handle custom URL protocol requests for downloading and managing various types of attachments. When users encounter a link with the `wab2b-helper:` protocol prefix, the application intercepts this request, fetches the referenced content, and provides options for previewing, copying, or saving the file.

### Latest Technology Stack (2024-2025)

Based on the most recent industry standards and best practices, our application will use:

- **Backend**:

  - Tauri v2.6.2
  - Rust 1.76+

- **Frontend**:

  - React v18.3.1
  - TypeScript 5.6.2
  - Tailwind CSS v4.1.11
  - Anime.js v4.0.2

- **Development Environment**:
  - Node.js v22.17 LTS (fixed requirement)
  - npm v10.x+
  - Vite v6.0.3

### Versioning Schema

Our application will follow Semantic Versioning (SemVer) principles with the format `MAJOR.MINOR.PATCH` and appropriate pre-release identifiers:

- **Alpha Releases** (`0.1.0-alpha.1`, `0.1.0-alpha.2`, etc.)
  - Initial development phase
  - Internal testing only
  - Incomplete features and known bugs
  - Used for early feedback from the development team
  - May have significant changes between releases

- **Beta Releases** (`0.1.0-beta.1`, `0.1.0-beta.2`, etc.)
  - Feature complete but may have known issues
  - External testing with selected users
  - More stable than alpha but not production-ready
  - Used for gathering user feedback and real-world testing
  - API and functionality mostly stabilized

- **Release Candidates** (`0.1.0-rc.1`, `0.1.0-rc.2`, etc.)
  - Final testing phase before production release
  - Feature and API freeze
  - Only critical bug fixes allowed
  - Near production quality
  - Final verification with real-world usage

- **Production Releases** (`0.1.0`, `0.2.0`, `1.0.0`, etc.)
  - Stable, production-ready software
  - Public release
  - Following SemVer:
    - MAJOR: Incompatible API changes
    - MINOR: New features (backwards compatible)
    - PATCH: Bug fixes (backwards compatible)

The application will start at version `0.1.0-alpha.1` during initial development, progressing through beta and RC stages before reaching the first stable release.

### Key Features

1. **Custom Protocol Handler**
   - Registers and handles the `wab2b-helper:` protocol
   - Accepts URLs in format: `wab2b-helper:https://example.com/file.pdf`
   - Supports various content types (images, videos, documents, etc.)

2. **File Management**
   - Securely downloads files to temporary storage
   - Implements proper cleanup of temporary files
   - Handles various file types with appropriate preview capabilities

3. **User Interface**
   - Clean, modern interface with responsive design
   - Preview mode for supported file types (images, videos, PDFs, etc.)
   - "Copy" and "Save & Download" action buttons
   - Click-to-preview functionality

4. **Theming**
   - Light and dark theme support
   - System preference detection
   - User preference saving

### Security Considerations

1. **File Handling**
   - Content validation before download
   - Secure temporary file storage with proper permissions
   - Sanitization of filenames and paths

2. **Network Security**
   - Validation of remote URLs
   - HTTPS enforcement
   - Timeout and size limitations for downloads

3. **Application Security**
   - CSP (Content Security Policy) implementation
   - Input validation for all user-provided data
   - Regular security updates

### Implementation Guidelines

1. **Protocol Handler Registration**
   - Follow OS-specific guidelines for protocol registration
   - Implement proper URL parsing and validation

2. **File Operations**
   - Use Tauri's file system API for secure file operations
   - Implement proper error handling for network and file operations
   - Add safeguards against overwriting existing files

3. **UI Development**
   - Follow responsive design principles
   - Ensure accessibility compliance
   - Implement smooth transitions and animations

4. **Testing Requirements**
   - Unit tests for core functionality
   - Integration tests for protocol handling
   - UI tests for different file types and themes

### Development Workflow

1. Project setup with latest dependencies
2. Implementation of core protocol handling
3. Development of file management system
4. UI implementation with theming support
5. Testing and security auditing
6. Packaging and distribution

### Maintenance and Updates

- Regular dependency updates
- Security patches as needed
- Feature enhancements based on user feedback

---

*Note: This specification is subject to evolution as development progresses. All implementation should adhere to the latest standards and best practices available at the time of development, regardless of what's specified in this document.*
