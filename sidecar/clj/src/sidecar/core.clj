(ns sidecar.core
  (:require [sidecar.api-validation :as api]
            [sidecar.db-integrity :as db]
            [sidecar.business-rules :as biz]
            [sidecar.type-sync :as sync]
            [sidecar.event-system :as events]
            [sidecar.migration-deps :as migrations]
            [sidecar.host-isolation :as isolation]
            [sidecar.kv-verification :as kv]
            [sidecar.sse-verification :as sse]
            [sidecar.framework-contamination :as contamination]
            [sidecar.stub-honesty :as stubs]))

;; This is the general sidecar entrypoint.
;; Agents may call (sidecar.core/run-all) to run any regression harnesses.

(defn print-check-summary [check-name result]
  (let [status (:status result)]
    (println (str "[" check-name "] " 
                 (case status
                   :pass "✓ PASS"
                   :warn "⚠ WARN"  
                   :fail "✗ FAIL"
                   "? UNKNOWN")
                 " - " (:message result)))))

(defn run-all []
  (println "\n[Sidecar] Running Hamlet project consistency checks...")
  (println "=========================================================")
  
  ;; API Validation Checks
  (let [api-results (api/run-all-api-checks)]
    (println "\n🔍 API Validation:")
    (doseq [[check-name result] (:results api-results)]
      (print-check-summary (name check-name) result)))
  
  ;; Database Integrity Checks  
  (let [db-results (db/run-all-db-checks)]
    (println "\n🗄️ Database Integrity:")
    (doseq [[check-name result] (:results db-results)]
      (print-check-summary (name check-name) result)))
  
  ;; Business Logic Checks
  (let [biz-results (biz/run-all-business-checks)]
    (println "\n🏢 Business Rules:")
    (doseq [[check-name result] (:results biz-results)]
      (print-check-summary (name check-name) result)))
  
  ;; Type Synchronization Checks
  (let [sync-results (sync/run-all-type-sync-checks)]
    (println "\n🔄 Type Synchronization:")
    (doseq [[check-name result] (:results sync-results)]
      (print-check-summary (name check-name) result)))
  
  ;; Event System Checks  
  (let [event-results (events/run-all-event-system-checks)]
    (println "\n⚡ Event System:")
    (doseq [[check-name result] (:results event-results)]
      (print-check-summary (name check-name) result)))
  
  ;; Migration Dependency Checks
  (let [migration-results (migrations/run-all-migration-checks)]
    (println "\n📦 Migration Dependencies:")
    (doseq [[check-name result] (:results migration-results)]
      (print-check-summary (name check-name) result)))
  
  ;; Host Isolation Checks
  (let [isolation-results (isolation/run-all-host-isolation-checks)]
    (println "\n🏠 Host Isolation:")
    (doseq [[check-name result] (:results isolation-results)]
      (print-check-summary (name check-name) result)))
  
  ;; Key-Value Store Checks
  (let [kv-results (kv/run-all-kv-verification-checks)]
    (println "\n🔑 Key-Value Store:")
    (doseq [[check-name result] (:results kv-results)]
      (print-check-summary (name check-name) result)))
  
  ;; Server-Sent Events Checks
  (let [sse-results (sse/run-all-sse-verification-checks)]
    (println "\n📡 Server-Sent Events:")
    (doseq [[check-name result] (:results sse-results)]
      (print-check-summary (name check-name) result)))
  
  ;; Framework Contamination Checks
  (let [contamination-results (contamination/run-all-framework-contamination-checks)]
    (println "\n🚫 Framework Contamination:")
    (doseq [[check-name result] (:results contamination-results)]
      (print-check-summary (name check-name) result)))
  
  ;; Stub Honesty Checks
  (let [stub-results (stubs/run-all-stub-honesty-checks)]
    (println "\n🎭 Stub Honesty:")
    (doseq [[check-name result] (:results stub-results)]
      (print-check-summary (name check-name) result)))
  
  (println "\n=========================================================")
  (println "[Sidecar] All consistency checks completed.")
  {:status :ok :message "Hamlet project consistency verification complete"})

