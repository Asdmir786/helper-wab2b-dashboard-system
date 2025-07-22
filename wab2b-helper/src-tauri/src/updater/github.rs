/**
 * GitHub API integration for the update system
 */

use crate::updater::{ReleaseInfo, Asset, DownloadProgress};
use serde_json::Value;
use reqwest::Client;
use std::path::Path;
use regex::Regex;
use std::env::consts::{OS, ARCH};
use tokio::io::AsyncWriteExt;
use futures_util::StreamExt;
use tauri::Emitter;

/// Check for the latest release on GitHub
pub async fn check_latest_release(owner: &str, repo: &str) -> Result<ReleaseInfo, String> {
    // Create a new HTTP client
    let client = Client::new();
    
    // Build the GitHub API URL for the latest release
    let url = format!(
        "https://api.github.com/repos/{}/{}/releases/latest",
        owner, repo
    );
    
    // Send the request with appropriate headers
    let response = client
        .get(&url)
        .header("User-Agent", "WAB2B-Helper-Update-System")
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;
    
    // Check if the request was successful
    if !response.status().is_success() {
        return Err(format!(
            "GitHub API request failed with status: {}",
            response.status()
        ));
    }
    
    // Parse the response as JSON
    let release_data = response
        .json::<Value>()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    // Parse the release information
    let mut release_info = parse_release_info(release_data)?;

    // Populate SHA-256 hashes from a checksums.txt asset if one exists
    if let Some(checksum_asset) = release_info
        .assets
        .iter()
        .find(|a| a.name.to_lowercase().ends_with("checksums.txt"))
        .cloned()
    {
        // Download the checksums file
        let checksum_text = client
            .get(&checksum_asset.download_url)
            .header("User-Agent", "WAB2B-Helper-Update-System")
            .send()
            .await
            .map_err(|e| format!("Failed to download checksums file: {}", e))?
            .text()
            .await
            .map_err(|e| format!("Failed to read checksums file: {}", e))?;

        use std::collections::HashMap;
        use std::path::Path;

        // Build filename -> hash map
        let mut hash_map: HashMap<String, String> = HashMap::new();
        for line in checksum_text.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                let hash = parts[0].to_string();
                let file_path_part = parts[1];
                let file_name = Path::new(file_path_part)
                    .file_name()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_else(|| file_path_part.to_string());
                hash_map.insert(file_name, hash);
            }
        }

        // Attach hashes to assets
        for asset in &mut release_info.assets {
            if let Some(hash) = hash_map.get(&asset.name) {
                asset.sha256 = hash.clone();
            }
        }
    }

    Ok(release_info)
}

/// Download an asset from GitHub
pub async fn download_asset(
    url: &str, 
    destination: &str,
    app_handle: Option<&tauri::AppHandle>
) -> Result<String, String> {
    // Create a new HTTP client
    let client = Client::new();
    
    // Create the destination directory if it doesn't exist
    if let Some(parent) = Path::new(destination).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    // Send the request to download the asset
    let response = client
        .get(url)
        .header("User-Agent", "WAB2B-Helper-Update-System")
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;
    
    // Check if the request was successful
    if !response.status().is_success() {
        return Err(format!(
            "Download request failed with status: {}",
            response.status()
        ));
    }
    
    // Get the content length if available
    let total_size = response
        .content_length()
        .unwrap_or(0);
    
    // Create the destination file
    let mut file = tokio::fs::File::create(destination)
        .await
        .map_err(|e| format!("Failed to create file: {}", e))?;
    
    // Stream the response body to the file
    let mut stream = response.bytes_stream();
    let mut downloaded = 0;
    
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Error while downloading: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Failed to write to file: {}", e))?;
        
        downloaded += chunk.len() as u64;
        
        // Emit progress event if app_handle is provided
        if let Some(app) = app_handle {
            if total_size > 0 {
                let progress = DownloadProgress {
                    downloaded,
                    total: total_size,
                    file_path: destination.to_string(),
                };
                
                // Emit the progress event
                let _ = app.emit("download-progress", progress);
            }
        }
    }
    
    // Return the path to the downloaded file
    Ok(destination.to_string())
}

/// Parse GitHub release information from API response
fn parse_release_info(release_data: Value) -> Result<ReleaseInfo, String> {
    // Extract the version from the tag name
    let tag_name = release_data["tag_name"]
        .as_str()
        .ok_or_else(|| "Missing tag_name in release data".to_string())?;
    
    // Remove 'v' prefix if present
    let version = tag_name.trim_start_matches('v').to_string();
    
    // Extract the release notes
    let release_notes = release_data["body"]
        .as_str()
        .unwrap_or("")
        .to_string();
    
    // Extract the published date
    let published_at = release_data["published_at"]
        .as_str()
        .unwrap_or("")
        .to_string();
    
    // Extract the assets
    let assets_json = release_data["assets"]
        .as_array()
        .ok_or_else(|| "Missing assets in release data".to_string())?;
    
    let mut assets = Vec::new();
    
    for asset_json in assets_json {
        let name = asset_json["name"]
            .as_str()
            .ok_or_else(|| "Missing asset name".to_string())?
            .to_string();
        
        let download_url = asset_json["browser_download_url"]
            .as_str()
            .ok_or_else(|| "Missing asset download URL".to_string())?
            .to_string();
        
        let size = asset_json["size"]
            .as_u64()
            .ok_or_else(|| "Missing asset size".to_string())?;
        
        // Hash will be filled later from checksums.txt (if available)
        let sha256 = String::new();
        
        assets.push(Asset {
            name,
            download_url,
            size,
            sha256,
        });
    }
    
    // Create the release info
    let release_info = ReleaseInfo {
        version,
        release_notes,
        assets,
        published_at,
    };
    
    Ok(release_info)
}

/// Select the appropriate asset for the current platform
pub fn select_platform_asset(assets: &[Asset]) -> Option<Asset> {
    // Get the current platform and architecture
    let platform = OS;
    let arch = ARCH;
    
    // Define patterns for each platform
    let asset = match platform {
        "windows" => {
            // Look for Windows-specific assets
            assets.iter().find(|a| {
                let name = a.name.to_lowercase();
                (name.contains("windows") || name.contains("win")) &&
                (
                    (arch == "x86_64" && (name.contains("x64") || name.contains("amd64") || !name.contains("x86"))) ||
                    (arch == "x86" && (name.contains("x86") || name.contains("i686"))) ||
                    (arch == "aarch64" && (name.contains("arm64") || name.contains("aarch64")))
                ) &&
                (name.ends_with(".exe") || name.ends_with(".msi") || name.ends_with(".zip"))
            })
        },
        "macos" => {
            // Look for macOS-specific assets
            assets.iter().find(|a| {
                let name = a.name.to_lowercase();
                (name.contains("macos") || name.contains("mac") || name.contains("darwin")) &&
                (
                    (arch == "x86_64" && (name.contains("x64") || name.contains("amd64") || !name.contains("arm"))) ||
                    (arch == "aarch64" && (name.contains("arm64") || name.contains("aarch64") || name.contains("m1")))
                ) &&
                (name.ends_with(".dmg") || name.ends_with(".pkg") || name.ends_with(".zip"))
            })
        },
        "linux" => {
            // Look for Linux-specific assets
            assets.iter().find(|a| {
                let name = a.name.to_lowercase();
                name.contains("linux") &&
                (
                    (arch == "x86_64" && (name.contains("x64") || name.contains("amd64") || name.contains("x86_64"))) ||
                    (arch == "x86" && (name.contains("x86") || name.contains("i686"))) ||
                    (arch == "aarch64" && (name.contains("arm64") || name.contains("aarch64")))
                ) &&
                (name.ends_with(".AppImage") || name.ends_with(".deb") || name.ends_with(".rpm") || name.ends_with(".tar.gz"))
            })
        },
        _ => None,
    };
    
    // If we found a matching asset, clone it and return
    asset.cloned()
}

/// Parse SHA256 hash from release notes or checksums file
fn parse_sha256_hash(release_notes: &str, asset_name: &str) -> Option<String> {
    // Look for SHA256 hash in the release notes
    // Format: SHA256: <hash> <asset_name> or <asset_name>: <hash>
    
    // Try the format: SHA256: <hash> <asset_name>
    let pattern1 = format!(r"SHA256:\s*([a-fA-F0-9]{{64}})\s*{}", regex::escape(asset_name));
    let re1 = Regex::new(&pattern1).ok()?;
    if let Some(captures) = re1.captures(release_notes) {
        if let Some(hash) = captures.get(1) {
            return Some(hash.as_str().to_string());
        }
    }
    
    // Try the format: <asset_name>: <hash>
    let pattern2 = format!(r"{}\s*:\s*([a-fA-F0-9]{{64}})", regex::escape(asset_name));
    let re2 = Regex::new(&pattern2).ok()?;
    if let Some(captures) = re2.captures(release_notes) {
        if let Some(hash) = captures.get(1) {
            return Some(hash.as_str().to_string());
        }
    }
    
    // Try to find a checksums.txt file in the assets
    // This would be handled in a real implementation
    
    None
}