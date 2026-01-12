fn main() {
    println\!("Files in app/horatio/models/api:");
    for entry in std::fs::read_dir("app/horatio/models/api").unwrap() {
        let entry = entry.unwrap();
        println\!(" - {}", entry.file_name().to_string_lossy());
    }
}
