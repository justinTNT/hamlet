use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct FingerprintData {
    pub canvas: String,
    pub webgl: serde_json::Value,
    pub fonts: serde_json::Value,
    pub audio: Vec<u8>,
    pub performance: serde_json::Value,
}

#[wasm_bindgen]
pub fn generate_fingerprint(data_json: String) -> String {
    let data: FingerprintData = serde_json::from_str(&data_json)
        .expect("Invalid fingerprint data");

    // Hash each component separately to extract maximum entropy
    let canvas_hash = blake3::hash(data.canvas.as_bytes());
    let webgl_hash = blake3::hash(&serde_json::to_vec(&data.webgl).unwrap());
    let fonts_hash = blake3::hash(&serde_json::to_vec(&data.fonts).unwrap());
    let audio_hash = blake3::hash(&data.audio);
    let perf_hash = blake3::hash(&serde_json::to_vec(&data.performance).unwrap());

    // Combine all hashes into single high-entropy input
    let mut combined = Vec::new();
    combined.extend_from_slice(canvas_hash.as_bytes());
    combined.extend_from_slice(webgl_hash.as_bytes());
    combined.extend_from_slice(fonts_hash.as_bytes());
    combined.extend_from_slice(audio_hash.as_bytes());
    combined.extend_from_slice(perf_hash.as_bytes());

    // Final compression to 128 bits (16 bytes)
    let final_hash = blake3::hash(&combined);

    // Return as URL-safe base64 (22 characters)
    base64_url::encode(&final_hash.as_bytes()[..16])
}
