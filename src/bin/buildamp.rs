use proto_rust::framework::core::cli::*;

fn main() {
    let matches = create_cli_app().get_matches();

    let result = match matches.subcommand() {
        Some(("build", sub_m)) => {
            let target = sub_m.get_one::<String>("target").unwrap();
            let crate_dir = sub_m.get_one::<String>("crate-dir").unwrap();
            handle_build_command(target, crate_dir)
        }
        Some(("validate", sub_m)) => {
            let crate_dir = sub_m.get_one::<String>("crate-dir").unwrap();
            handle_validate_command(crate_dir)
        }
        Some(("init", sub_m)) => {
            let name = sub_m.get_one::<String>("name").unwrap();
            handle_init_command(name)
        }
        _ => {
            println!("No subcommand provided. Use --help for usage information.");
            Ok(())
        }
    };

    if let Err(e) = result {
        eprintln!("Error: {}", e);
        std::process::exit(1);
    }
}

fn handle_init_command(name: &str) -> Result<(), String> {
    println!("Initializing BuildAmp project: {}", name);
    // TODO: Implement project initialization
    println!("Project initialization not yet implemented.");
    Ok(())
}