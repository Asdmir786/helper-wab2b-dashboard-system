/**
 * Types for the GitHub-based update system
 */

/**
 * Update settings configuration
 */
export interface UpdateSettings {
  /** Whether to automatically check for updates on application start */
  autoCheck: boolean;
  /** GitHub repository owner */
  githubOwner: string;
  /** GitHub repository name */
  githubRepo: string;
}

/**
 * Current state of the update process
 */
export interface UpdateState {
  /** Current status of the update process */
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'installing' | 'error';
  /** Current application version */
  currentVersion: string;
  /** Latest available version (if any) */
  latestVersion?: string;
  /** Release notes for the latest version */
  releaseNotes?: string;
  /** Download progress (0-100) */
  downloadProgress?: number;
  /** Error message if status is 'error' */
  error?: string;
  /** Path to the downloaded update file (when status is 'ready') */
  downloadedFilePath?: string;
}

/**
 * Information about a GitHub release
 */
export interface ReleaseInfo {
  /** Version string (e.g., "1.0.0") */
  version: string;
  /** Release notes in markdown format */
  releaseNotes: string;
  /** List of assets available for download */
  assets: Asset[];
  /** Publication date of the release */
  publishedAt: string;
}

/**
 * Information about a release asset
 */
export interface Asset {
  /** Asset name */
  name: string;
  /** Download URL */
  downloadUrl: string;
  /** File size in bytes */
  size: number;
  /** SHA256 hash of the asset */
  sha256: string;
}

/**
 * Download progress information
 */
export interface DownloadProgress {
  /** Number of bytes downloaded */
  downloaded: number;
  /** Total size in bytes */
  total: number;
  /** Path to the downloaded file */
  filePath: string;
}