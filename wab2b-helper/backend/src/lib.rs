use tauri::{Manager, AppHandle, WindowEvent};
use tauri_plugin_clipboard_manager::ClipboardExt;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            // Listen for deep link
            #[cfg(desktop)]
            app.listen_global("tauri://protocol-request", move |event| {
                let url = match event.payload() {
                    Some(payload) => {
                        // Format: {"path":"wab2b-helper:https://example.com/path"}
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(payload) {
                            if let Some(path) = json.get("path").and_then(|p| p.as_str()) {
                                Some(path.to_string())
                            } else {
                                None
                            }
                        } else {
                            None
                        }
                    },
                    None => None
                };

                if let Some(url_str) = url {
                    // Extract the actual attachment URL
                    if let Ok(attachment_url) = parse_url_scheme(&url_str) {
                        // Send the URL to the frontend
                        let main_window = app.get_window("main").unwrap();
                        main_window.emit("attachment-url", attachment_url).unwrap();
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet, 
            copy_to_clipboard, 
            download_file, 
            parse_url_scheme
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
