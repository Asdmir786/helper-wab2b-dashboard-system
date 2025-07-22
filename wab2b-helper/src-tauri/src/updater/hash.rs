/**
 * Hash verification utilities for the update system
 */

use std::fs::File;
use std::io::Read;
use sha2::{Sha256, Digest};

/// Calculate SHA256 hash of a file
pub fn calculate_sha256(file_path: &str) -> Result<String, String> {
    // Open the file
    let mut file = File::open(file_path)
        .map_err(|e| format!("Failed to open file: {}", e))?;
    
    // Create a SHA256 hasher
    let mut hasher = Sha256::new();
    
    // Read the file in chunks and update the hasher
    let mut buffer = [0; 1024 * 1024]; // 1MB buffer
    loop {
        let bytes_read = file.read(&mut buffer)
            .map_err(|e| format!("Failed to read file: {}", e))?;
        
        if bytes_read == 0 {
            break; // End of file
        }
        
        hasher.update(&buffer[..bytes_read]);
    }
    
    // Finalize the hash and convert to hex string
    let hash = hasher.finalize();
    let hash_hex = hash.iter()
        .map(|b| format!("{:02x}", b))
        .collect::<String>();
    
    Ok(hash_hex)
}

/// Verify that a file matches an expected SHA256 hash
pub fn verify_file_hash(file_path: &str, expected_hash: &str) -> Result<bool, String> {
    // Calculate the hash of the file
    let actual_hash = calculate_sha256(file_path)?;
    
    // Compare the hashes (case-insensitive)
    let matches = actual_hash.to_lowercase() == expected_hash.to_lowercase();
    
    Ok(matches)
}