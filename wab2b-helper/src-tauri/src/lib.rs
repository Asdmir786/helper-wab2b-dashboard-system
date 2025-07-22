use std::path::PathBuf;
use std::sync::Mutex;
use std::collections::HashMap;
use tauri::{Manager, AppHandle};
use tauri::Emitter;
use serde::{Deserialize, Serialize};
use tempfile::TempDir;
use url::Url;
use anyhow::Result;
use tokio::io::AsyncWriteExt;
use futures_util::StreamExt;
use std::fs;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri_plugin_single_instance as single_instance;
use mime_guess::from_path;
use std::env;
use tauri_plugin_dialog;
use tauri_plugin_fs;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_dialog::DialogExt;

// Import the updater module
pub mod updater;

// Global state to store downloaded files
struct AppState {
    temp_dir: TempDir,
    current_file: Option<FileInfo>,
    downloaded_files: HashMap<String, FileInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    id: String,
    original_url: String,
    file_path: String,
    file_name: String,
    mime_type: String,
    size: u64,
}

// Error types
#[derive(Debug, thiserror::Error)]
enum Error {
    #[error("Failed to download file: {0}")]
    DownloadError(String),
    
    #[error("Invalid URL: {0}")]
    InvalidUrl(String),
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    
    #[error("Request error: {0}")]
    RequestError(#[from] reqwest::Error),
    
    #[error("File not found: {0}")]
    FileNotFound(String),
}

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

// Initialize the app state
fn init_app_state() -> Result<AppState> {
    let temp_dir = tempfile::Builder::new()
        .prefix("wab2b-helper-")
        .tempdir()?;
    
    Ok(AppState {
        temp_dir,
        current_file: None,
        downloaded_files: HashMap::new(),
    })
}

// Command to download a file from a URL
#[tauri::command]
async fn download_file(
    app_handle: AppHandle,
    url: String,
) -> Result<FileInfo, Error> {
    // Parse the URL
    let parsed_url = Url::parse(&url).map_err(|_| Error::InvalidUrl(url.clone()))?;
    
    // Extract the file name from the URL
    let file_name = parsed_url
        .path_segments()
        .and_then(|segments| segments.last())
        .unwrap_or("downloaded_file")
        .to_string();
    
    // Generate a unique ID for this file
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let id = format!("file_{}", timestamp);
    
    // Get the app state
    let state = app_handle.state::<Arc<Mutex<AppState>>>();
    
    // Create the temp file path - avoid MutexGuard across await points
    let file_path = {
        let app_state = state.lock().unwrap();
        app_state.temp_dir.path().join(&file_name)
    };
    
    // Create the file
    let mut file = tokio::fs::File::create(&file_path).await?;
    
    // Download the file
    let client = reqwest::Client::new();
    let res = client.get(&url).send().await?;
    
    if !res.status().is_success() {
        return Err(Error::DownloadError(format!(
            "Failed to download file: HTTP status {}",
            res.status()
        )));
    }
    
    // Get the content length if available
    let content_length = res.content_length().unwrap_or(0);
    
    // Stream the response body to the file
    let mut stream = res.bytes_stream();
    let mut downloaded_size = 0;
    
    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        file.write_all(&chunk).await?;
        downloaded_size += chunk.len() as u64;
        
        // Emit progress event
        if content_length > 0 {
            let progress = (downloaded_size as f64 / content_length as f64) * 100.0;
            app_handle.emit("download-progress", progress).unwrap();
        }
    }
    
    // Get the MIME type
    let mime_type = from_path(&file_path)
        .first_or_octet_stream()
        .to_string();
    
    // Create the file info
    let file_info = FileInfo {
        id: id.clone(),
        original_url: url,
        file_path: file_path.to_string_lossy().to_string(),
        file_name,
        mime_type,
        size: downloaded_size,
    };
    
    // Update the app state
    let mut app_state = state.lock().unwrap();
    app_state.current_file = Some(file_info.clone());
    app_state.downloaded_files.insert(id, file_info.clone());
    
    Ok(file_info)
}

// Command to get the current file info
#[tauri::command]
fn get_current_file(app_handle: AppHandle) -> Option<FileInfo> {
    let state = app_handle.state::<Arc<Mutex<AppState>>>();
    let app_state = state.lock().unwrap();
    app_state.current_file.clone()
}

// Command to get a file by ID
#[tauri::command]
fn get_file_by_id(app_handle: AppHandle, id: String) -> Result<FileInfo, Error> {
    let state = app_handle.state::<Arc<Mutex<AppState>>>();
    let app_state = state.lock().unwrap();
    
    app_state.downloaded_files
        .get(&id)
        .cloned()
        .ok_or_else(|| Error::FileNotFound(id))
}

// Command to save file to a specific location
#[tauri::command]
async fn save_file(
    app_handle: AppHandle,
    id: String,
    save_path: Option<String>,
) -> Result<String, Error> {
    let state = app_handle.state::<Arc<Mutex<AppState>>>();
    
    // Get the file info - avoid MutexGuard across await points
    let file_info = {
        let app_state = state.lock().unwrap();
        app_state.downloaded_files
            .get(&id)
            .cloned()
            .ok_or_else(|| Error::FileNotFound(id.clone()))?
    };
    
    // 1️⃣ If the path was supplied we're done.  
    // 2️⃣ Otherwise open a blocking save dialog natively and keep going.
    let destination = if let Some(path) = save_path {
        PathBuf::from(path)
    } else {
        let file_path_result = app_handle
            .dialog()
            .file()
            .add_filter("Any", &["*"])
            .set_file_name(&file_info.file_name)
            .blocking_save_file();
            
        match file_path_result {
            Some(file_path) => PathBuf::from(file_path.to_string()),
            None => return Err(Error::IoError(std::io::Error::new(
                std::io::ErrorKind::Other,
                "Save cancelled by user",
            ))),
        }
    };
    
    // Copy the file to the destination
    fs::copy(&file_info.file_path, &destination)?;
    
    Ok(destination.to_string_lossy().to_string())
}

// Command to handle the save file dialog result
#[tauri::command]
async fn handle_save_dialog_result(
    app_handle: AppHandle,
    id: String,
    save_path: String,
) -> Result<String, Error> {
    let state = app_handle.state::<Arc<Mutex<AppState>>>();
    
    // Get the file info - avoid MutexGuard across await points
    let file_info = {
        let app_state = state.lock().unwrap();
        app_state.downloaded_files.get(&id).cloned().ok_or_else(|| Error::FileNotFound(id.clone()))?
    };
    
    // Copy the file to the destination
    fs::copy(&file_info.file_path, &save_path)?;
    
    Ok(save_path)
}

#[tauri::command(async)]
async fn copy_file_to_clipboard(app: AppHandle, path: String) -> Result<(), String> {
    let shell = app.shell();
    let output = shell
        .sidecar("fct")
        .map_err(|e| e.to_string())?
        .args(["--file", &path, "--copy"])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("fct.exe failed: {}", stderr));
    }

    Ok(())
}

#[tauri::command]
fn set_theme(app_handle: AppHandle, theme: String) -> Result<(), Error> {
  let window = app_handle.get_webview_window("main").unwrap();
  window.emit("theme-changed", theme).unwrap();
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = init_app_state().expect("Failed to initialize app state");

    tauri::Builder::default()
        .manage(Arc::new(Mutex::new(state)))
        // ensure only one app instance; forward protocol URL to existing window
        .plugin(single_instance::init(|app, argv, _| {
            if let Some(link) = argv.get(1) {
                app.emit("deep-link-received", link).unwrap();
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        // removed plugin-clipboard-manager; using native clipboard instead
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                let args: Vec<String> = env::args().collect();
                if args.len() > 1 {
                    app.emit("deep-link-received", &args[1]).unwrap();
                }
            }
            
            // Initialize the updater module
            if let Err(err) = updater::init(app) {
                eprintln!("Failed to initialize updater: {}", err);
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            download_file,
            get_current_file,
            get_file_by_id,
            copy_file_to_clipboard,
            save_file,
            handle_save_dialog_result,
            set_theme,
            // GitHub update system commands
            updater::check_for_updates,
            updater::download_asset,
            updater::verify_file_hash,
            updater::install_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}