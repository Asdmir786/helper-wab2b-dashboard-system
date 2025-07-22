/**
 * Update Manager for the GitHub-based update system
 * Handles the frontend update workflow and UI coordination
 */

import { getVersion } from '@tauri-apps/api/app';
import { checkForUpdates, downloadAsset, verifyFileHash, installUpdate } from './tauriBridge';
import { UpdateSettings, UpdateState, Asset } from './types';
import { appDataDir } from '@tauri-apps/api/path';
import { join } from '@tauri-apps/api/path';

/**
 * Default update settings
 */
const DEFAULT_SETTINGS: UpdateSettings = {
  autoCheck: true,
  githubOwner: 'Asdmir786',
  githubRepo: 'helper-wab2b-dashboard-system'
};

/**
 * Storage key for persisting update settings
 */
const SETTINGS_STORAGE_KEY = 'wab2b-helper-update-settings';

/**
 * Manages the update process for the application
 */
export class UpdateManager {
  private settings: UpdateSettings;
  private state: UpdateState;
  private stateChangeListeners: ((state: UpdateState) => void)[] = [];

  /**
   * Create a new UpdateManager instance
   * @param settings Optional custom settings
   */
  constructor(settings?: Partial<UpdateSettings>) {
    // Load saved settings from localStorage if available
    const savedSettings = this.loadSettings();
    
    // Merge default settings with saved settings and provided settings
    this.settings = { 
      ...DEFAULT_SETTINGS, 
      ...savedSettings, 
      ...settings 
    };
    
    this.state = {
      status: 'idle',
      currentVersion: '0.0.0' // Will be updated when checkForUpdates is called
    };
    
    // Save the merged settings
    this.saveSettings();
  }
  
  /**
   * Load settings from localStorage
   * @returns Saved settings or empty object if none found
   */
  private loadSettings(): Partial<UpdateSettings> {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return savedSettings ? JSON.parse(savedSettings) : {};
    } catch (error) {
      console.error('Failed to load update settings:', error);
      return {};
    }
  }
  
  /**
   * Save current settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save update settings:', error);
    }
  }

  /**
   * Add a listener for state changes
   * @param listener Function to call when state changes
   * @returns Function to remove the listener
   */
  public onStateChange(listener: (state: UpdateState) => void): () => void {
    this.stateChangeListeners.push(listener);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== listener);
    };
  }

  /**
   * Update the current state and notify listeners
   * @param newState Partial state to merge with current state
   */
  private setState(newState: Partial<UpdateState>): void {
    this.state = { ...this.state, ...newState };
    this.stateChangeListeners.forEach(listener => listener(this.state));
  }

  /**
   * Check for updates from GitHub
   * @param manual Whether this is a manual check
   * @returns Promise with boolean indicating if an update is available
   */
  public async checkForUpdates(_manual: boolean = false): Promise<boolean> {
    try {
      this.setState({ status: 'checking' });
      
      // Get current version
      const currentVersion = await getVersion();
      this.setState({ currentVersion });
      
      // Check for updates
      const releaseInfo = await checkForUpdates(
        this.settings.githubOwner,
        this.settings.githubRepo
      );
      
      // Compare versions
      const hasUpdate = this.compareVersions(releaseInfo.version, currentVersion) > 0;
      
      if (hasUpdate) {
        this.setState({
          status: 'available',
          latestVersion: releaseInfo.version,
          releaseNotes: releaseInfo.releaseNotes
        });
        return true;
      } else {
        this.setState({ status: 'idle' });
        return false;
      }
    } catch (error) {
      this.setState({
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Compare two semantic version strings
   * @param v1 First version
   * @param v2 Second version
   * @returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  private compareVersions(v1: string, v2: string): number {
    // Handle pre-release versions (e.g., 1.0.0-beta.1)
    const [v1Base, v1PreRelease] = v1.split('-');
    const [v2Base, v2PreRelease] = v2.split('-');
    
    // Compare base versions first
    const parts1 = v1Base.split('.').map(Number);
    const parts2 = v2Base.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    
    // If base versions are equal, compare pre-release versions
    // Pre-release versions are lower priority than regular versions
    if (!v1PreRelease && v2PreRelease) return 1;
    if (v1PreRelease && !v2PreRelease) return -1;
    if (!v1PreRelease && !v2PreRelease) return 0;
    
    // Compare pre-release versions
    // For simplicity, we'll just compare them lexicographically
    // In a real implementation, you might want to parse them more carefully
    if (v1PreRelease! > v2PreRelease!) return 1;
    if (v1PreRelease! < v2PreRelease!) return -1;
    
    return 0;
  }

  /**
   * Download the latest update
   * @returns Promise with boolean indicating if download was successful
   */
  public async downloadUpdate(): Promise<boolean> {
    try {
      if (this.state.status !== 'available') {
        throw new Error('No update available to download');
      }

      this.setState({ status: 'downloading', downloadProgress: 0 });

      // Get the appropriate asset for the current platform
      const releaseInfo = await checkForUpdates(
        this.settings.githubOwner,
        this.settings.githubRepo
      );

      // Find the appropriate asset for the current platform
      const asset = this.selectPlatformAsset(releaseInfo.assets);
      if (!asset) {
        throw new Error('No compatible update found for your platform');
      }

      // Create a destination path in the app data directory
      const appData = await appDataDir();
      const downloadPath = await join(appData, `update-${releaseInfo.version}.bin`);

      // Download the asset with progress tracking
      const onProgress = (downloaded: number, total: number) => {
        const progress = Math.round((downloaded / total) * 100);
        this.setState({ downloadProgress: progress });
      };

      // Download the asset
      const filePath = await downloadAsset(asset.downloadUrl, downloadPath, onProgress);

      // Verify the downloaded file
      const isValid = await verifyFileHash(filePath, asset.sha256);
      if (!isValid) {
        throw new Error('Update verification failed. The downloaded file may be corrupted.');
      }

      // Update state to ready for installation
      this.setState({
        status: 'ready',
        downloadedFilePath: filePath
      });

      return true;
    } catch (error) {
      this.setState({
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Install the downloaded update
   * @returns Promise that resolves when installation begins
   */
  public async installUpdate(): Promise<void> {
    try {
      if (this.state.status !== 'ready' || !this.state.downloadedFilePath) {
        throw new Error('No update ready to install');
      }

      this.setState({ status: 'installing' });

      // Install the update
      await installUpdate(this.state.downloadedFilePath);

      // Note: The app will restart after installation, so we don't need to update the state
    } catch (error) {
      this.setState({
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Select the appropriate asset for the current platform
   * @param assets List of available assets
   * @returns The selected asset or undefined if none found
   */
  private selectPlatformAsset(assets: Asset[]): Asset | undefined {
    // Get platform information
    const platform = navigator.platform.toLowerCase();
    const isWindows = platform.includes('win');
    const isMac = platform.includes('mac');
    const isLinux = platform.includes('linux');
    
    // Find the appropriate asset based on platform
    return assets.find(asset => {
      const name = asset.name.toLowerCase();
      
      if (isWindows && (name.includes('windows') || name.includes('win') || name.endsWith('.msi') || name.endsWith('.exe'))) {
        return true;
      }
      
      if (isMac && (name.includes('mac') || name.includes('darwin') || name.endsWith('.dmg') || name.endsWith('.pkg'))) {
        return true;
      }
      
      if (isLinux && (name.includes('linux') || name.endsWith('.AppImage') || name.endsWith('.deb') || name.endsWith('.rpm'))) {
        return true;
      }
      
      return false;
    });
  }

  /**
   * Get the current update state
   * @returns Current update state
   */
  public getUpdateState(): UpdateState {
    return this.state;
  }

  /**
   * Configure update settings
   * @param settings New settings to apply
   */
  public configure(settings: Partial<UpdateSettings>): void {
    this.settings = { ...this.settings, ...settings };
    
    // Save the updated settings
    this.saveSettings();
  }
  
  /**
   * Reset settings to defaults
   */
  public resetSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
  }
  
  /**
   * Check if automatic updates are enabled
   * @returns True if automatic updates are enabled
   */
  public isAutoUpdateEnabled(): boolean {
    return this.settings.autoCheck;
  }
  
  /**
   * Enable or disable automatic updates
   * @param enabled Whether automatic updates should be enabled
   */
  public setAutoUpdateEnabled(enabled: boolean): void {
    this.settings.autoCheck = enabled;
    this.saveSettings();
  }
}