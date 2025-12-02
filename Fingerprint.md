 Plan: High-Entropy Browser Fingerprinting Module

  Goal: 128-bit stable identity from maximum browser diversity

  Phase 1: JavaScript Data Collection

  Implement high-entropy sources in browser:

  // /shared/fingerprint/collector.js
  export async function collectFingerprintData() {
      return {
          canvas: await getCanvasFingerprint(),
          webgl: await getWebGLFingerprint(),
          fonts: await getFontMetrics(),
          audio: await getAudioFingerprint(),
          performance: getPerformanceFingerprint()
      };
  }

  async function getCanvasFingerprint() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Render complex scene to expose hardware differences
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Browser fingerprint 🔒', 2, 2);
      ctx.fillStyle = 'rgba(255,0,0,0.5)';
      ctx.fillRect(0, 0, 100, 50);

      return canvas.toDataURL();
  }

  async function getWebGLFingerprint() {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'no-webgl';

      return {
          renderer: gl.getParameter(gl.RENDERER),
          vendor: gl.getParameter(gl.VENDOR),
          extensions: gl.getSupportedExtensions(),
          params: {
              maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
              maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS)
          }
      };
  }

  async function getFontMetrics() {
      const fonts = ['Arial', 'Times', 'Courier', 'Helvetica', 'Georgia'];
      const metrics = {};

      for (const font of fonts) {
          const span = document.createElement('span');
          span.style.font = `16px ${font}`;
          span.textContent = 'mmmmmmmmmmlli';
          document.body.appendChild(span);

          metrics[font] = {
              width: span.offsetWidth,
              height: span.offsetHeight
          };

          document.body.removeChild(span);
      }

      return metrics;
  }

  async function getAudioFingerprint() {
      if (!window.AudioContext) return 'no-audio';

      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const analyser = audioCtx.createAnalyser();

      oscillator.connect(analyser);
      analyser.connect(audioCtx.destination);
      oscillator.start(0);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      oscillator.stop();
      audioCtx.close();

      return Array.from(dataArray.slice(0, 32));
  }

  function getPerformanceFingerprint() {
      const start = performance.now();
      // CPU-intensive operation to expose hardware differences
      let result = 0;
      for (let i = 0; i < 100000; i++) {
          result += Math.sin(i) * Math.cos(i);
      }
      const duration = performance.now() - start;

      return {
          timing: duration,
          memory: performance.memory ? {
              used: performance.memory.usedJSHeapSize,
              total: performance.memory.totalJSHeapSize
          } : null,
          navigation: performance.navigation.type
      };
  }

  Phase 2: Rust Compression Algorithm

  Add to /shared/proto-rust/src/fingerprint.rs:

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
      let combined = [
          canvas_hash.as_bytes(),
          webgl_hash.as_bytes(),
          fonts_hash.as_bytes(),
          audio_hash.as_bytes(),
          perf_hash.as_bytes()
      ].concat();

      // Final compression to 128 bits (16 bytes)
      let final_hash = blake3::hash(&combined);

      // Return as URL-safe base64 (22 characters)
      base64_url::encode(&final_hash.as_bytes()[..16])
  }

  // Validation function for testing
  #[wasm_bindgen]
  pub fn validate_fingerprint(fingerprint: String) -> bool {
      fingerprint.len() == 22 &&
      base64_url::decode(&fingerprint).is_ok()
  }

  Phase 3: Integration Layer

  Add to /shared/proto-rust/src/lib.rs:

  mod fingerprint;
  pub use fingerprint::*;

  // Export fingerprint functions in WASM
  #[wasm_bindgen]
  pub fn create_session_id(fingerprint_data: String) -> String {
      generate_fingerprint(fingerprint_data)
  }

  Phase 4: Client Auto-Integration

  Modify existing client code to auto-generate session IDs:

  // In /apps/web/src/index.js
  import { collectFingerprintData } from '../../shared/fingerprint/collector.js';
  import init, { create_session_id, encode_request, decode_response } from 'proto-rust';

  async function initializeClient() {
      await init();

      // Generate stable session ID from browser fingerprint
      const fingerprintData = await collectFingerprintData();
      const sessionId = create_session_id(JSON.stringify(fingerprintData));

      console.log('Generated session ID:', sessionId);

      // Store for use in all API calls
      window.HAMLET_SESSION_ID = sessionId;

      return sessionId;
  }

  // Modify RPC calls to include fingerprint-based session ID
  app.ports.rpcRequest.subscribe(async ({ endpoint, body, correlationId }) => {
      const sessionId = window.HAMLET_SESSION_ID;

      fetch('/api', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'X-RPC-Endpoint': endpoint,
              'X-Session-ID': sessionId  // Auto-include fingerprint ID
          },
          body: encode_request(endpoint, JSON.stringify(body))
      })
      // ... rest of implementation
  });

  Phase 5: Dependencies & Build

  Add to /shared/proto-rust/Cargo.toml:

  [dependencies]
  blake3 = "1.5"
  base64-url = "2.0"
  serde_json = "1.0"
  # ... existing deps

  Add fingerprint module to build:

  # Build script to include fingerprint collection
  cd shared/proto-rust
  wasm-pack build --target web --out-dir pkg-web
  wasm-pack build --target nodejs --out-dir pkg-node

  Success Criteria

  - Stability: Same fingerprint across browser restarts (>99% consistency)
  - Uniqueness: <1 in 10M collision rate in testing
  - Performance: <100ms fingerprint generation time
  - Storage: 22-character string (16 bytes + base64 encoding)
  - Integration: Zero-config auto-inclusion in all API requests

  Testing Strategy

  1. Stability testing: Generate fingerprints across multiple sessions
  2. Collision testing: Generate large dataset, measure uniqueness
  3. Performance testing: Measure generation time across devices
  4. Integration testing: Verify automatic session ID inclusion

  This gives you bulletproof persistent identity with minimal developer friction.

