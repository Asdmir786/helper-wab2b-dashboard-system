use tauri::Manager;
// ClipboardExt is no longer needed; removed.
use tauri_plugin_deep_link::DeepLinkExt;
use tauri::Emitter;
use tauri_plugin_updater::UpdaterExt;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn copy_to_clipboard(url: &str) -> Result<bool, String> {
    // This is a simplified implementation. For production, you would:
    // 1. Fetch the content from the URL
    // 2. Check the content type
    // 3. Use the appropriate clipboard method

    // For text/url copy
    if let Err(e) = std::process::Command::new("clip")
        .arg(url)
        .spawn() {
        return Err(format!("Failed to copy to clipboard: {}", e));
    }
    
    Ok(true)
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
            greet, 
            copy_to_clipboard, 
            download_file, 
            parse_url_scheme,
            check_update,
            download_and_install_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
