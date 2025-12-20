use std::path::Path;
use std::process::Command;

pub struct BuildConfig {
    pub crate_dir: String,
    pub wasm_out_dir_web: String,
    pub wasm_out_dir_node: String,
    pub watch_pattern: String,
}

impl Default for BuildConfig {
    fn default() -> Self {
        Self {
            crate_dir: ".".to_string(),
            wasm_out_dir_web: "pkg-web".to_string(),
            wasm_out_dir_node: "pkg-node".to_string(),
            watch_pattern: "src/**/*.rs".to_string(),
        }
    }
}

pub struct BuildAmpCore {
    config: BuildConfig,
}

impl BuildAmpCore {
    pub fn new(config: BuildConfig) -> Self {
        Self { config }
    }

    pub fn build_wasm_for_target(&self, target: &str) -> Result<(), String> {
        let out_dir = match target {
            "web" => &self.config.wasm_out_dir_web,
            "nodejs" => &self.config.wasm_out_dir_node,
            _ => return Err(format!("Unknown target: {}", target)),
        };

        println!("[BuildAmp Core] Building WASM for {}...", target);

        let output = Command::new("wasm-pack")
            .args(&["build", "--target", target, "--out-dir", out_dir])
            .current_dir(&self.config.crate_dir)
            .output()
            .map_err(|e| format!("Failed to execute wasm-pack: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("wasm-pack build failed: {}", stderr));
        }

        println!("[BuildAmp Core] WASM build for {} complete.", target);
        Ok(())
    }

    pub fn build_all_wasm_targets(&self) -> Result<(), String> {
        // Build sequentially to avoid lock contention
        self.build_wasm_for_target("nodejs")?;
        self.build_wasm_for_target("web")?;
        Ok(())
    }

    pub fn validate_environment(&self) -> Result<(), String> {
        // Check if wasm-pack is installed
        if !Path::new(&self.config.crate_dir).exists() {
            return Err(format!("Crate directory not found: {}", self.config.crate_dir));
        }

        Command::new("wasm-pack")
            .arg("--version")
            .output()
            .map_err(|_| "wasm-pack not found. Please install with: cargo install wasm-pack".to_string())?;

        Ok(())
    }

    pub fn get_watch_pattern(&self) -> &str {
        &self.config.watch_pattern
    }

    pub fn get_crate_dir(&self) -> &str {
        &self.config.crate_dir
    }
}

// CLI-specific functionality
#[cfg(feature = "cli")]
pub mod cli {
    use super::*;
    use clap::{Arg, Command};

    pub fn create_cli_app() -> Command {
        Command::new("buildamp")
            .version("0.1.0")
            .about("BuildAmp: Rust data modeling for Elm apps")
            .subcommand(
                Command::new("build")
                    .about("Build WASM targets")
                    .arg(
                        Arg::new("target")
                            .short('t')
                            .long("target")
                            .value_name("TARGET")
                            .help("Build target (web, nodejs, or all)")
                            .default_value("all")
                    )
                    .arg(
                        Arg::new("crate-dir")
                            .short('d')
                            .long("crate-dir")
                            .value_name("DIR")
                            .help("Rust crate directory")
                            .default_value(".")
                    )
            )
            .subcommand(
                Command::new("validate")
                    .about("Validate BuildAmp environment and manifests")
                    .arg(
                        Arg::new("crate-dir")
                            .short('d')
                            .long("crate-dir")
                            .value_name("DIR")
                            .help("Rust crate directory")
                            .default_value(".")
                    )
            )
            .subcommand(
                Command::new("init")
                    .about("Initialize a new BuildAmp project")
                    .arg(
                        Arg::new("name")
                            .help("Project name")
                            .required(true)
                            .index(1)
                    )
            )
    }

    pub fn handle_build_command(target: &str, crate_dir: &str) -> Result<(), String> {
        let config = BuildConfig {
            crate_dir: crate_dir.to_string(),
            ..Default::default()
        };
        
        let core = BuildAmpCore::new(config);
        core.validate_environment()?;

        match target {
            "web" => core.build_wasm_for_target("web"),
            "nodejs" => core.build_wasm_for_target("nodejs"),
            "all" => core.build_all_wasm_targets(),
            _ => Err(format!("Unknown target: {}", target)),
        }
    }

    pub fn handle_validate_command(crate_dir: &str) -> Result<(), String> {
        let config = BuildConfig {
            crate_dir: crate_dir.to_string(),
            ..Default::default()
        };
        
        let core = BuildAmpCore::new(config);
        core.validate_environment()?;

        // TODO: Add manifest validation calls here
        println!("Environment validation passed!");
        Ok(())
    }
}