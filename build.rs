use std::fs;
use std::path::Path;

fn main() {
    println!("cargo:rerun-if-changed=src/models/");
    
    let models_dir = Path::new("src/models");
    if models_dir.exists() {
        generate_mod_files(models_dir).expect("Failed to generate mod files");
    }
}

fn generate_mod_files(dir: &Path) -> std::io::Result<()> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        
        if path.is_dir() {
            let mod_file_path = path.join("mod.rs");
            
            // Find *_domain.rs and *_api.rs files
            let mut modules = Vec::new();
            for file_entry in fs::read_dir(&path)? {
                let file_entry = file_entry?;
                let file_path = file_entry.path();
                
                if let Some(file_name) = file_path.file_stem() {
                    if let Some(name_str) = file_name.to_str() {
                        if name_str.ends_with("_domain") || name_str.ends_with("_api") {
                            modules.push(name_str.to_string());
                        }
                    }
                }
            }
            
            // Generate mod.rs content
            if !modules.is_empty() {
                let mod_content = generate_mod_content(&modules);
                fs::write(&mod_file_path, mod_content)?;
            }
        }
    }
    Ok(())
}

fn generate_mod_content(modules: &[String]) -> String {
    let mut content = String::new();
    
    // Add module declarations
    for module in modules {
        content.push_str(&format!("pub mod {};\n", module));
    }
    
    content.push('\n');
    
    // Add re-exports
    for module in modules {
        content.push_str(&format!("pub use {}::*;\n", module));
    }
    
    content
}