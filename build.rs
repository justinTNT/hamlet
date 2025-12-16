use std::fs;
use std::path::Path;

fn main() {
    println!("cargo:rerun-if-changed=src/models/");
    
    // Check for forbidden mod.rs files and fail build if found
    check_no_mod_files().expect("Build failed: forbidden mod.rs files detected");
}

fn check_no_mod_files() -> Result<(), Box<dyn std::error::Error>> {
    let models_dir = Path::new("src/models");
    if !models_dir.exists() {
        return Ok(());
    }
    
    let mut forbidden_files = Vec::new();
    
    // Recursively check for mod.rs files
    fn scan_dir(dir: &Path, forbidden: &mut Vec<String>) -> std::io::Result<()> {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() && path.file_name() == Some(std::ffi::OsStr::new("mod.rs")) {
                forbidden.push(path.to_string_lossy().to_string());
            } else if path.is_dir() {
                scan_dir(&path, forbidden)?;
            }
        }
        Ok(())
    }
    
    scan_dir(models_dir, &mut forbidden_files)?;
    
    if !forbidden_files.is_empty() {
        eprintln!("❌ Build failed: Found forbidden mod.rs files!");
        eprintln!("The auto-discovery system makes these files unnecessary and harmful.");
        eprintln!("Please remove the following files:");
        for file in &forbidden_files {
            eprintln!("  - {}", file);
        }
        eprintln!();
        eprintln!("These files are auto-generated artifacts that pollute the clean");
        eprintln!("naked struct experience for Elm developers.");
        
        return Err(format!("Found {} forbidden mod.rs files", forbidden_files.len()).into());
    }
    
    println!("✅ No forbidden mod.rs files found - models directory is clean!");
    Ok(())
}