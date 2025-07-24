/**
 * Tauri bridge for the GitHub-based update system
 * Provides communication between the frontend and Rust backend
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { ReleaseInfo, DownloadProgress } from './types';

/**
 * Check for updates from GitHub
 * @param owner GitHub repository owner
 * @param repo GitHub repository name
  * @param includeBeta Whether to include beta releases
 * @returns Promise with release information
 */
export async function checkForUpdates(
  owner: string,
  repo: string,
  includeBeta?: boolean
): Promise<ReleaseInfo> {
  try {
    // Ensure includeBeta is explicitly true or false
    const betaParam = includeBeta === undefined ? false : includeBeta;
    return await invoke<ReleaseInfo>('check_for_updates', { owner, repo, includeBeta: betaParam });
  } catch (error) {
    throw new Error(`Failed to check for updates: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Download an asset with progress tracking
 * @param url Asset download URL
 * @param destination Path to save the downloaded file
 * @param onProgress Optional callback for download progress
 * @returns Promise with the path to the downloaded file
 */
export async function downloadAsset(
  url: string,
  destination: string,
  onProgress?: (downloaded: number, total: number) => void
): Promise<string> {
  let unlisten: (() => void) | undefined;
  
  try {
    // Set up progress listener if callback provided
    if (onProgress) {
      const unlistenPromise = await listen<DownloadProgress>('download-progress', (event) => {
        const { downloaded, total } = event.payload;
        onProgress(downloaded, total);
      });
      unlisten = unlistenPromise;
    }
    
    // Invoke the Rust function to download the asset
    const result = await invoke<string>('download_asset', { 
      url, 
      destination 
    });
    
    return result;
  } catch (error) {
    // Re-throw the error with additional context
    throw new Error(`Failed to download asset: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    // Clean up the event listener
    if (unlisten) {
      unlisten();
    }
  }
}

/**
 * Verify the integrity of a downloaded file using SHA256 hash
 * @param filePath Path to the downloaded file
 * @param expectedHash Expected SHA256 hash
 * @returns Promise with boolean indicating if verification passed
 */
export async function verifyFileHash(
  filePath: string,
  expectedHash: string
): Promise<boolean> {
  try {
    return await invoke<boolean>('verify_file_hash', { filePath, expectedHash });
  } catch (error) {
    throw new Error(`Failed to verify file hash: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Install an update and restart the application
 * @param updatePath Path to the update file
 * @returns Promise that resolves when installation begins
 */
export async function installUpdate(updatePath: string): Promise<boolean> {
  try {
    return await invoke<boolean>('install_update', { updatePath });
  } catch (error) {
    throw new Error(`Failed to install update: ${error instanceof Error ? error.message : String(error)}`);
  }
}