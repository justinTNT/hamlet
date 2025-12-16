use std::fs;
use std::path::Path;

fn main() {
    println!("cargo:rerun-if-changed=src/models/");
    
    // Check for forbidden mod.rs files and fail build if found
    check_no_mod_files().expect("Build failed: forbidden mod.rs files detected");
    
    // Check for invalid framework type usage and fail build if found
    check_framework_types_usage().expect("Build failed: invalid framework type usage detected");
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

fn check_framework_types_usage() -> Result<(), Box<dyn std::error::Error>> {
    let mut invalid_usages = Vec::new();
    
    // Define framework types and their allowed directories
    let framework_rules = vec![
        // Event framework types - only allowed in src/models/events/
        ("CorrelationId<", "src/models/events", "event models"),
        ("ExecuteAt<", "src/models/events", "event models"),
        
        // Database framework types - only allowed in src/models/db/ 
        ("Generated<", "src/models/db", "database models"),
        ("DefaultValue<", "src/models/db", "database models"),
        
        // Storage framework types - only allowed in src/models/storage/
        ("SessionOnly<", "src/models/storage", "storage models"),
        ("Expiring<", "src/models/storage", "storage models"),
        ("CrossTab<", "src/models/storage", "storage models"),
        ("Cached<", "src/models/storage", "storage models"),
    ];
    
    // Check each model directory
    let model_dirs = ["src/models/events", "src/models/db", "src/models/storage", "src/models/api", "src/models/sse", "src/models/kv", "src/models/hooks"];
    
    for model_dir in &model_dirs {
        let dir_path = Path::new(model_dir);
        if !dir_path.exists() {
            continue;
        }
        
        for entry in fs::read_dir(dir_path)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() && path.extension() == Some(std::ffi::OsStr::new("rs")) {
                let file_name = path.file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("");
                
                let content = fs::read_to_string(&path)?;
                
                // Check each framework rule
                for (framework_type, allowed_dir, _description) in &framework_rules {
                    let current_dir = model_dir;
                    
                    // Find all struct definitions in the file
                    for line in content.lines() {
                        let line = line.trim();
                        if line.starts_with("pub struct ") {
                            if let Some(struct_name) = extract_struct_name(line) {
                                // Check if this struct uses this framework type
                                if struct_uses_framework_type(&content, &struct_name, framework_type) {
                                    // Check 1: Is this framework type allowed in this directory?
                                    if current_dir != allowed_dir {
                                        invalid_usages.push(format!(
                                            "{}::{} uses {} but is in wrong directory (expected {})",
                                            path.display(),
                                            struct_name,
                                            framework_type.trim_end_matches('<'),
                                            allowed_dir
                                        ));
                                        continue;
                                    }
                                    
                                    // Check 2: Is this the main model for this file?
                                    let expected_filename = camel_to_snake_case(&struct_name);
                                    if expected_filename != file_name {
                                        invalid_usages.push(format!(
                                            "{}::{} uses {} but is not the main model for this file (expected {} in {}.rs)",
                                            path.display(),
                                            struct_name,
                                            framework_type.trim_end_matches('<'),
                                            struct_name,
                                            expected_filename
                                        ));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    if !invalid_usages.is_empty() {
        eprintln!("❌ Build failed: Invalid BuildAmp framework type usage detected!");
        eprintln!("Framework types should only be used in their intended directories and only in main models.");
        eprintln!("");
        eprintln!("Framework type rules:");
        eprintln!("  📅 Event types (CorrelationId<T>, ExecuteAt<T>) → src/models/events/ main models only");
        eprintln!("  🗃️  Database types (Generated<T>, DefaultValue<T>) → src/models/db/ main models only");
        eprintln!("  💾 Storage types (SessionOnly<T>, Expiring<T>, CrossTab<T>, Cached<T>) → src/models/storage/ main models only");
        eprintln!("");
        eprintln!("Invalid usages found:");
        for usage in &invalid_usages {
            eprintln!("  - {}", usage);
        }
        eprintln!("");
        eprintln!("To fix:");
        eprintln!("  1. Move framework types to their correct directories");
        eprintln!("  2. Only use framework types in main models (struct name matches filename)");
        eprintln!("  3. Remove framework types from helper structs");
        eprintln!("  4. Use regular Rust types for helper structs and cross-directory models");
        
        return Err(format!("Found {} invalid framework type usages", invalid_usages.len()).into());
    }
    
    println!("✅ BuildAmp framework types validation passed!");
    Ok(())
}

fn extract_struct_name(line: &str) -> Option<String> {
    // Extract struct name from "pub struct StructName {" or "pub struct StructName<T> {"
    let line = line.trim_start_matches("pub struct ");
    if let Some(pos) = line.find(|c: char| c == ' ' || c == '{' || c == '<') {
        Some(line[..pos].to_string())
    } else {
        None
    }
}

fn struct_uses_framework_type(content: &str, struct_name: &str, framework_type: &str) -> bool {
    // Look for the struct definition and check if it uses the framework type
    let mut in_struct = false;
    let mut brace_count = 0;
    
    for line in content.lines() {
        let line = line.trim();
        
        if line.starts_with(&format!("pub struct {}", struct_name)) {
            in_struct = true;
            if line.contains('{') {
                brace_count += 1;
            }
            continue;
        }
        
        if in_struct {
            if line.contains('{') {
                brace_count += 1;
            }
            if line.contains('}') {
                brace_count -= 1;
                if brace_count == 0 {
                    break;
                }
            }
            
            // Check if this line uses the framework type
            if line.contains(framework_type) {
                return true;
            }
        }
    }
    
    false
}

fn camel_to_snake_case(s: &str) -> String {
    let mut result = String::new();
    let mut chars = s.chars().peekable();
    
    while let Some(c) = chars.next() {
        if c.is_uppercase() && !result.is_empty() {
            result.push('_');
        }
        result.push(c.to_lowercase().to_string().chars().next().unwrap());
    }
    
    result
}