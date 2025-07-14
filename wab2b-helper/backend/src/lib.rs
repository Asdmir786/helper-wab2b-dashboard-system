use tauri::Manager;
// ClipboardExt is no longer needed; removed.
use tauri_plugin_deep_link::DeepLinkExt;
use tauri::Emitter;
use tauri_plugin_updater::UpdaterExt;
use clipboard_win::raw;
use url::Url;
use std::env;
use std::fs;
use std::path::Path;
use sha2::{Digest, Sha256};
use tokio::io::AsyncWriteExt;
use serde::Deserialize;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Deserialize)]
struct Asset {
    name: String,
    browser_download_url: String,
}

#[derive(Deserialize)]
struct Release {
    tag_name: String,
    assets: Vec<Asset>,
}

const GITHUB_OWNER: &str = "Asdmir786";
const GITHUB_REPO: &str = "helper-wab2b-dashboard-system";
const CURRENT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[tauri::command]
async fn check_update_manual() -> Result<bool, String> {
    let client = reqwest::Client::new();
    let url = format!("https://api.github.com/repos/{}/{}/releases/latest", GITHUB_OWNER, GITHUB_REPO);
    let rel: Release = client
        .get(url)
        .header("User-Agent", "wab2b-helper-updater")
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    if rel.tag_name.as_str() <= CURRENT_VERSION {
        return Ok(false); // already up-to-date
    }

    // find MSI and SHA assets
    let msi_asset = rel
        .assets
        .iter()
        .find(|a| a.name.ends_with(".msi"))
        .ok_or("MSI asset not found")?;
    let sha_asset = rel
        .assets
        .iter()
        .find(|a| a.name.ends_with(".sha256"))
        .ok_or("SHA asset not found")?;

    let tmp_dir = std::env::temp_dir();
    let msi_path = tmp_dir.join(&msi_asset.name);
    let sha_path = tmp_dir.join(&sha_asset.name);

    download_to(&client, &msi_asset.browser_download_url, &msi_path).await?;
    download_to(&client, &sha_asset.browser_download_url, &sha_path).await?;

    verify_sha(&msi_path, &sha_path)?;

    // launch installer
    std::process::Command::new("msiexec")
        .args(["/i", msi_path.to_str().unwrap(), "/passive"])
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(true)
}

async fn download_to(client: &reqwest::Client, url: &str, path: &Path) -> Result<(), String> {
    let data = client
        .get(url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .bytes()
        .await
        .map_err(|e| e.to_string())?;
    let mut file = tokio::fs::File::create(path)
        .await
        .map_err(|e| e.to_string())?;
    file.write_all(&data).await.map_err(|e| e.to_string())?;
    Ok(())
}

fn verify_sha(file_path: &Path, sha_path: &Path) -> Result<(), String> {
    let expected = std::fs::read_to_string(sha_path)
        .map_err(|e| e.to_string())?
        .split_whitespace()
        .next()
        .ok_or("Invalid SHA file")?
        .to_string();

    let mut file = std::fs::File::open(file_path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    std::io::copy(&mut file, &mut hasher).map_err(|e| e.to_string())?;
    let actual = format!("{:x}", hasher.finalize());

    if actual == expected {
        Ok(())
    } else {
        Err("SHA256 mismatch".into())
    }
}

#[tauri::command]
async fn download_file(url: &str, file_path: &str) -> Result<bool, String> {
    // In a real implementation, you would:
    // 1. Create a proper HTTP client
    // 2. Handle different error cases
    // 3. Implement progress reporting
    
    match reqwest::get(url).await {
        Ok(response) => {
            if let Ok(bytes) = response.bytes().await {
                if let Ok(mut file) = std::fs::File::create(file_path) {
                    if let Err(e) = std::io::copy(&mut bytes.as_ref(), &mut file) {
                        return Err(format!("Failed to write file: {}", e));
                    }
                    Ok(true)
                } else {
                    Err("Failed to create file".into())
                }
            } else {
                Err("Failed to read response bytes".into())
            }
        },
        Err(e) => Err(format!("Failed to download file: {}", e))
    }
}

#[tauri::command]
fn parse_url_scheme(url: &str) -> Result<String, String> {
    // Extract the actual URL from the custom scheme URL
    // Format: wab2b-helper:https://example.com/path
    
    if let Some(stripped_url) = url.strip_prefix("wab2b-helper:") {
        Ok(stripped_url.to_string())
    } else {
        Err("Invalid URL format".into())
    }
}

#[tauri::command]
async fn check_update(app_handle: tauri::AppHandle) -> Result<bool, String> {
    // Convert possible updater construction error to String
    let updater = app_handle
        .updater()
        .map_err(|e| e.to_string())?;

    match updater.check().await.map_err(|e| e.to_string())? {
        Some(update) => {
            // Send event to frontend that an update is available
            if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.emit("update-available", update.version.clone());
            }
            Ok(true)
        }
        None => Ok(false), // no update
    }
}

#[tauri::command]
async fn download_and_install_update(app_handle: tauri::AppHandle) -> Result<(), String> {
    let updater = app_handle
        .updater()
        .map_err(|e| e.to_string())?;

    let maybe_update = updater.check().await.map_err(|e| e.to_string())?;

    let Some(update) = maybe_update else {
        return Err("No update is available".into());
    };

    // Clone handle for move into closures
    let window_handle = app_handle.get_webview_window("main");

    // Download + install with progress callback
    update
        .download_and_install(
            move |chunk_len, content_len| {
                if let (Some(total), Some(window)) = (content_len, window_handle.as_ref()) {
                    let percentage = (chunk_len as f64 / total as f64 * 100.0) as u32;
                    let _ = window.emit("update-download-progress", percentage);
                }
            },
            || {}, // finished callback – frontend already receives "update-install-finished" elsewhere if needed
        )
        .await
        .map_err(|e| format!("Failed to install update: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[tauri::command]
async fn copy_attachment(url_str: String) -> Result<(), String> {
    // 1. Parse the URL and get the filename
    let url = Url::parse(&url_str).map_err(|e| e.to_string())?;
    let file_name = url.path_segments().and_then(|s| s.last()).unwrap_or("downloaded_file");

    // 2. Create a temporary path for the file
    let temp_dir = env::temp_dir();
    let temp_file_path = temp_dir.join(file_name);

    // 3. Download the file
    let response = reqwest::get(url).await.map_err(|e| e.to_string())?;
    let content = response.bytes().await.map_err(|e| e.to_string())?;

    // 4. Save the file to the temporary path
    fs::write(&temp_file_path, &content).map_err(|e| e.to_string())?;

    // 5. Copy the file to the clipboard as a file drop (attachment)
    let file_str = temp_file_path.to_string_lossy().into_owned();
    raw::set_file_list(&[file_str.as_str()]).map_err(|e| e.to_string())?;

    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Deep link handler using official plugin
            #[cfg(desktop)]
            {
                let app_handle = app.handle();
                // Register the handler using the owned `AppHandle` so no borrowed
                // reference escapes this setup closure.
                let handler_handle = app_handle.clone();
                app_handle.deep_link().on_open_url(move |event| {
                    if let Some(first_url) = event.urls().first() {
                        // Remove the custom scheme prefix if present
                        let stripped = first_url.as_str().trim_start_matches("wab2b-helper:").to_string();
                        if let Some(window) = handler_handle.get_webview_window("main") {
                            let _ = window.emit("attachment-url", stripped);
                        }
                    }
                });
                
                // Schedule update check when app starts
                let update_handle = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    // Wait a few seconds to let the app fully initialize
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    
                    if let Ok(updater) = update_handle.updater() {
                        match updater.check().await {
                            Ok(Some(update)) => {
                                if let Some(window) = update_handle.get_webview_window("main") {
                                    let _ = window.emit("update-available", update.version.clone());
                                }
                            }
                            Ok(None) => { /* no update */ }
                            Err(e) => eprintln!("Error checking for updates: {}", e),
                        }
                    } else {
                        eprintln!("Failed to build updater instance");
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            copy_attachment,
            greet, 
            download_file, 
            parse_url_scheme,
            check_update,
            download_and_install_update,
            check_update_manual
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
