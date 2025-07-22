/**
 * Update installation logic for the update system
 */

use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::AppHandle;
use std::env;
use std::time::{SystemTime, UNIX_EPOCH};

/// Install an update and restart the application
pub fn install_update(app: &AppHandle, update_path: &str) -> Result<bool, String> {
    // Get the path to the current executable
    let current_exe = env::current_exe()
        .map_err(|e| format!("Failed to get current executable path: {}", e))?;
    
    // Create a backup of the current version
    let backup_path = backup_current_version(&current_exe)?;
    
    // Get the update path as a Path
    let update_path = Path::new(update_path);
    
    // Replace the current application with the update
    match replace_application(&current_exe, update_path) {
        Ok(_) => {
            // Restart the application
            restart_application(app)?;
            Ok(true)
        },
        Err(e) => {
            // If replacement fails, try to restore from backup
            if let Err(restore_err) = fs::copy(&backup_path, &current_exe) {
                return Err(format!(
                    "Update failed and backup restoration also failed: {} (Backup error: {})",
                    e, restore_err
                ));
            }
            
            Err(format!("Update failed, restored from backup: {}", e))
        }
    }
}

/// Create a backup of the current application
fn backup_current_version(app_path: &Path) -> Result<String, String> {
    // Generate a timestamp for the backup file
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("Failed to generate timestamp: {}", e))?
        .as_secs();
    
    // Create the backup path
    let backup_dir = app_path.parent()
        .ok_or_else(|| "Failed to get parent directory".to_string())?
        .join("backups");
    
    // Create the backup directory if it doesn't exist
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Failed to create backup directory: {}", e))?;
    
    // Generate the backup file name
    let file_name = app_path.file_name()
        .ok_or_else(|| "Failed to get file name".to_string())?;
    
    let backup_path = backup_dir.join(format!(
        "{}.{}.bak",
        file_name.to_string_lossy(),
        timestamp
    ));
    
    // Copy the current executable to the backup path
    fs::copy(app_path, &backup_path)
        .map_err(|e| format!("Failed to create backup: {}", e))?;
    
    Ok(backup_path.to_string_lossy().to_string())
}

/// Replace the current application with the update
fn replace_application(app_path: &Path, update_path: &Path) -> Result<(), String> {
    // On Windows, we can't replace a running executable directly
    // So we'll create a batch script to do it after the application exits
    #[cfg(target_os = "windows")]
    {
        // Create a temporary batch file to replace the executable
        let batch_path = app_path.parent()
            .ok_or_else(|| "Failed to get parent directory".to_string())?
            .join("update.bat");
        
        // Write the batch file content
        // This will wait for the process to exit, then replace the executable
        let batch_content = format!(
            "@echo off\n\
             :wait\n\
             timeout /t 1 /nobreak > nul\n\
             tasklist /fi \"imagename eq {}\" | find /i \"{}\" > nul\n\
             if not errorlevel 1 goto wait\n\
             copy /y \"{}\" \"{}\"\n\
             start \"\" \"{}\"\n\
             del \"%~f0\"\n",
            app_path.file_name().unwrap().to_string_lossy(),
            app_path.file_name().unwrap().to_string_lossy(),
            update_path.to_string_lossy(),
            app_path.to_string_lossy(),
            app_path.to_string_lossy()
        );
        
        fs::write(&batch_path, batch_content)
            .map_err(|e| format!("Failed to write update script: {}", e))?;
        
        // Start the batch file
        Command::new("cmd")
            .args(&["/C", batch_path.to_string_lossy().as_ref()])
            .spawn()
            .map_err(|e| format!("Failed to start update script: {}", e))?;
        
        Ok(())
    }
    
    // On Unix systems, we can replace the executable directly
    #[cfg(not(target_os = "windows"))]
    {
        fs::copy(update_path, app_path)
            .map_err(|e| format!("Failed to replace application: {}", e))?;
        
        // Make the new executable executable
        let mut permissions = fs::metadata(app_path)
            .map_err(|e| format!("Failed to get file permissions: {}", e))?
            .permissions();
        
        permissions.set_mode(0o755); // rwxr-xr-x
        
        fs::set_permissions(app_path, permissions)
            .map_err(|e| format!("Failed to set file permissions: {}", e))?;
        
        Ok(())
    }
}

/// Restart the application
fn restart_application(app: &AppHandle) -> Result<(), String> {
    // Get the path to the current executable
    let _current_exe = env::current_exe()
        .map_err(|e| format!("Failed to get current executable path: {}", e))?;
    
    // On Windows, we don't need to restart the application here
    // The batch script will handle it
    #[cfg(target_os = "windows")]
    {
        // Just exit the application
        app.exit(0);
        Ok(())
    }
    
    // On Unix systems, we need to restart the application
    #[cfg(not(target_os = "windows"))]
    {
        // Start a new instance of the application
        let _current_exe = env::current_exe()
            .map_err(|e| format!("Failed to get current executable path: {}", e))?;
        
        // Start a new instance of the application
        Command::new(_current_exe)
            .spawn()
            .map_err(|e| format!("Failed to restart application: {}", e))?;
        
        // Exit the current instance
        app.exit(0);
        Ok(())
    }
}