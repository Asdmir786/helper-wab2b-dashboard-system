/**
 * GitHub-based update system for WAB2B Helper
 * Rust backend implementation
 */

use serde::{Deserialize, Serialize};
use tauri::command;

mod github;
mod hash;
mod installer;

/// Information about a GitHub release
#[derive(Debug, Serialize, Deserialize)]
pub struct ReleaseInfo {
    /// Version string (e.g., "1.0.0")
    pub version: String,
    /// Release notes in markdown format
    pub release_notes: String,
    /// List of assets available for download
    pub assets: Vec<Asset>,
    /// Publication date of the release
    pub published_at: String,
}

/// Information about a release asset
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Asset {
    /// Asset name
    pub name: String,
    /// Download URL
    pub download_url: String,
    /// File size in bytes
    pub size: u64,
    /// SHA256 hash of the asset
    pub sha256: String,
}

/// Download progress information
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadProgress {
    /// Number of bytes downloaded
    pub downloaded: u64,
    /// Total size in bytes
    pub total: u64,
    /// Path to the downloaded file
    pub file_path: String,
}

/// Check for updates from GitHub
#[command]
pub async fn check_for_updates(owner: &str, repo: &str) -> Result<ReleaseInfo, String> {
    // Call the GitHub API to check for the latest release
    let mut release_info = github::check_latest_release(owner, repo).await?;
    
    // Check if there's a suitable asset for the current platform
    if !release_info.assets.is_empty() {
        let platform_asset = github::select_platform_asset(&release_info.assets);
        
        // If no suitable asset is found, add a warning to the release notes
        if platform_asset.is_none() {
            let warning = "\n\n**Warning:** No compatible update package was found for your platform. Please download the update manually from the GitHub releases page.";
            release_info.release_notes.push_str(warning);
        }
    } else {
        // If there are no assets at all, add a warning to the release notes
        let warning = "\n\n**Warning:** No update packages were found for this release. Please check the GitHub releases page.";
        release_info.release_notes.push_str(warning);
    }
    
    // Return the release information
    Ok(release_info)
}

/// Download a release asset
#[command]
pub async fn download_asset(
    url: &str, 
    destination: &str,
    app_handle: tauri::AppHandle
) -> Result<String, String> {
    // Call the GitHub API to download the asset
    let file_path = github::download_asset(url, destination, Some(&app_handle)).await?;
    
    // Return the path to the downloaded file
    Ok(file_path)
}

/// Verify the integrity of a downloaded file using SHA256 hash
#[command]
pub fn verify_file_hash(file_path: &str, expected_hash: &str) -> Result<bool, String> {
    // Call the hash verification function
    hash::verify_file_hash(file_path, expected_hash)
}

/// Install an update and restart the application
#[command]
pub fn install_update(update_path: &str, app_handle: tauri::AppHandle) -> Result<bool, String> {
    // Call the installer function
    installer::install_update(&app_handle, update_path)
}

/// Register all update-related commands with Tauri
pub fn init(_app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // Log that the updater module is being initialized
    println!("Initializing GitHub update system");
    
    // You could add additional initialization here if needed
    // For example, checking for updates on startup if enabled in settings
    
    Ok(())
}