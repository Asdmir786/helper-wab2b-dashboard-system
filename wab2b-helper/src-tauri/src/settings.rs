use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri::Manager;
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub auto_update: bool,
    pub beta_mode: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            auto_update: true,
            beta_mode: false,
        }
    }
}

pub fn get_settings_path(app_handle: &AppHandle) -> PathBuf {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");
    
    // Create the directory if it doesn't exist
    fs::create_dir_all(&app_dir).expect("Failed to create app data directory");
    
    app_dir.join("settings.json")
}

pub fn load_settings(app_handle: &AppHandle) -> Result<AppSettings> {
    let settings_path = get_settings_path(app_handle);
    
    // If the settings file doesn't exist, create it with default settings
    if !settings_path.exists() {
        let default_settings = AppSettings::default();
        save_settings_to_path(&default_settings, &settings_path)?;
        return Ok(default_settings);
    }
    
    // Read and parse the settings file
    let settings_json = fs::read_to_string(settings_path)?;
    let settings: AppSettings = serde_json::from_str(&settings_json)?;
    
    Ok(settings)
}

pub fn save_settings(app_handle: &AppHandle, settings: &AppSettings) -> Result<()> {
    let settings_path = get_settings_path(app_handle);
    save_settings_to_path(settings, &settings_path)
}

fn save_settings_to_path(settings: &AppSettings, path: &PathBuf) -> Result<()> {
    let settings_json = serde_json::to_string_pretty(settings)?;
    fs::write(path, settings_json)?;
    Ok(())
}

// Tauri command to get settings
#[tauri::command]
pub fn get_settings(app_handle: AppHandle) -> Result<AppSettings, String> {
    load_settings(&app_handle).map_err(|e| e.to_string())
}

// Tauri command to save settings
#[tauri::command]
pub fn update_settings(app_handle: AppHandle, settings: AppSettings) -> Result<(), String> {
    save_settings(&app_handle, &settings).map_err(|e| e.to_string())
}