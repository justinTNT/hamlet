(ns sidecar.repl
  (:require [nrepl.server :as nrepl]
            [sidecar.core :as core]
            [sidecar.api-validation :as api]
            [sidecar.db-integrity :as db]
            [sidecar.business-rules :as biz]
            [sidecar.type-sync :as sync]
            [sidecar.event-system :as events]
            [sidecar.migration-deps :as migrations]
            [sidecar.host-isolation :as isolation]
            [sidecar.kv-verification :as kv]
            [clojure.pprint :refer [pprint]])
  (:gen-class))

;; Sidecar REPL with persistent verification functions

(def server (atom nil))

(defn start-server! 
  "Start nREPL server on port 7888"
  []
  (when-not @server
    (println "[Sidecar REPL] Starting nREPL server on port 7888...")
    (reset! server (nrepl/start-server :port 7888 :bind "127.0.0.1"))
    (spit ".nrepl-port" "7888")
    (println "[Sidecar REPL] Server started. Connect with your editor or:")
    (println "  lein repl :connect 7888")
    (println "  clj -M:nrepl")))

(defn stop-server!
  "Stop nREPL server"
  []
  (when @server
    (nrepl/stop-server @server)
    (reset! server nil)
    (println "[Sidecar REPL] Server stopped.")))

;; Convenience functions for interactive use

(defn check
  "Run all verification checks with pretty output"
  []
  (println "\n" (str (java.time.LocalDateTime/now)))
  (core/run-all))

(defn check-api
  "Run only API validation checks"
  []
  (println "\n🔍 API Validation only:")
  (let [results (api/run-all-api-checks)]
    (doseq [[check-name result] (:results results)]
      (core/print-check-summary (name check-name) result))
    results))

(defn check-db 
  "Run only database integrity checks"
  []
  (println "\n🗄️ Database Integrity only:")
  (let [results (db/run-all-db-checks)]
    (doseq [[check-name result] (:results results)]
      (core/print-check-summary (name check-name) result))
    results))

(defn check-biz
  "Run only business rules checks" 
  []
  (println "\n🏢 Business Rules only:")
  (let [results (biz/run-all-business-checks)]
    (doseq [[check-name result] (:results results)]
      (core/print-check-summary (name check-name) result))
    results))

(defn check-sync
  "Run only type synchronization checks"
  []
  (println "\n🔄 Type Synchronization only:")
  (let [results (sync/run-all-type-sync-checks)]
    (doseq [[check-name result] (:results results)]
      (core/print-check-summary (name check-name) result))
    results))

(defn check-events
  "Run only event system checks"
  []
  (println "\n⚡ Event System only:")
  (let [results (events/run-all-event-system-checks)]
    (doseq [[check-name result] (:results results)]
      (core/print-check-summary (name check-name) result))
    results))

(defn check-migrations
  "Run only migration dependency checks"
  []
  (println "\n📦 Migration Dependencies only:")
  (let [results (migrations/run-all-migration-checks)]
    (doseq [[check-name result] (:results results)]
      (core/print-check-summary (name check-name) result))
    results))

(defn check-isolation
  "Run only host isolation checks"
  []
  (println "\n🏠 Host Isolation only:")
  (let [results (isolation/run-all-host-isolation-checks)]
    (doseq [[check-name result] (:results results)]
      (core/print-check-summary (name check-name) result))
    results))

(defn check-kv
  "Run only key-value store checks"
  []
  (println "\n🔑 Key-Value Store only:")
  (let [results (kv/run-all-kv-verification-checks)]
    (doseq [[check-name result] (:results results)]
      (core/print-check-summary (name check-name) result))
    results))

(defn watch-files
  "Watch source files and re-run checks on changes (basic polling)"
  [& {:keys [interval-ms] :or {interval-ms 2000}}]
  (println "[Watch] Monitoring files for changes...")
  (println "[Watch] Press Ctrl+C to stop")
  (let [last-modified (atom 0)]
    (try
      (loop []
        (let [current-modified (->> ["../../tests/macro_test.rs"
                                    "../../app/horatio/server/src/Logic.elm"
                                    "../../app/horatio/server/migrations/002_tags.sql"]
                                   (filter #(.exists (java.io.File. %)))
                                   (map #(.lastModified (java.io.File. %)))
                                   (apply max))]
          (when (> current-modified @last-modified)
            (reset! last-modified current-modified)
            (println "\n[Watch] File change detected, running checks...")
            (check))
          (Thread/sleep interval-ms)
          (recur)))
      (catch InterruptedException _
        (println "\n[Watch] Stopped monitoring.")))))

(defn help
  "Show available sidecar commands"
  []
  (println "
🔧 Hamlet Sidecar REPL Commands:

Verification:
  (check)      - Run all consistency checks  
  (check-api)  - API validation only
  (check-db)   - Database integrity only  
  (check-biz)  - Business rules only
  (check-sync) - Type synchronization only
  (check-events) - Event system only
  (check-migrations) - Migration dependencies only
  (check-isolation) - Host isolation only
  (check-kv) - Key-value store only

Interactive:
  (watch-files) - Auto-run checks when files change
  (help)        - Show this help

Direct access:
  sidecar.api-validation/*   - API validation functions
  sidecar.db-integrity/*     - Database checking functions  
  sidecar.business-rules/*   - Business logic functions

Example workflow:
  user=> (check)              ; Run full verification
  user=> (check-api)          ; Focus on API issues
  user=> (watch-files)        ; Monitor for changes

Server control:
  (start-server!)  - Start nREPL server
  (stop-server!)   - Stop nREPL server
"))

(defn -main [& args]
  (println "
╔══════════════════════════════════════════════════════╗
║                Hamlet Sidecar REPL                  ║
║              Verification & Analysis                 ║
╚══════════════════════════════════════════════════════╝
")
  (start-server!)
  (println "\n💡 Available commands: (help)")
  (println "🚀 Quick start: (check)")
  
  ;; Keep the main thread alive
  (try
    (loop []
      (Thread/sleep 1000)
      (recur))
    (catch InterruptedException _
      (stop-server!)
      (println "\n[Sidecar] Goodbye!"))))