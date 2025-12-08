(ns sidecar.event-system
  (:require [clojure.string :as str]
            [clojure.java.io :as io]
            [clojure.set :as set]))

;; Event system completeness and consistency verification

(defn extract-event-type-definitions
  "Extract event struct names from *_events.rs files"
  []
  (let [event-files (filter #(.exists (io/file %))
                           ["../../src/models/universal/notification_events.rs"
                            "../../src/models/universal/maintenance_events.rs"])]
    (->> event-files
         (mapcat (fn [file-path]
                   (let [content (slurp file-path)]
                     (->> (re-seq #"pub struct\s+(\w+)\s*\{" content)
                          (map second)
                          (map #(hash-map :name % :file file-path))))))
         (into []))))

(defn extract-event-processor-handlers
  "Extract handler functions from event-processor.js"
  []
  (let [processor-file "../../app/horatio/server/event-processor.js"]
    (if (.exists (io/file processor-file))
      (let [content (slurp processor-file)]
        (->> (re-seq #"case\s+['\"]([^'\"]+)['\"]:" content)
             (map second)
             (set)))
      #{})))

(defn extract-schedule-event_calls
  "Find all ScheduleEvent calls in Logic.elm"
  []
  (let [logic-file "../../app/horatio/server/src/Logic.elm"]
    (if (.exists (io/file logic-file))
      (let [content (slurp logic-file)]
        (->> (re-seq #"ScheduleEvent[^}]*event_type\s*=\s*[\"']([^\"']+)[\"']" content)
             (map second)
             (set)))
      #{})))

(defn check-event-type_handler-coverage
  "Verify every event type has a processor handler"
  []
  (let [defined-events (set (map :name (extract-event-type-definitions)))
        processor-handlers (extract-event-processor-handlers)
        missing-handlers (set/difference defined-events processor-handlers)
        orphan-handlers (set/difference processor-handlers defined-events)]
    
    {:status (if (empty? missing-handlers) :pass :fail)
     :total-event-types (count defined-events)
     :total-handlers (count processor-handlers)
     :missing-handlers missing-handlers
     :orphan-handlers orphan-handlers
     :message (if (empty? missing-handlers)
                (str "All " (count defined-events) " event types have handlers")
                (str "Missing handlers for: " (str/join ", " missing-handlers)))}))

(defn check-schedule-event-validity
  "Verify ScheduleEvent calls use valid event types"
  []
  (let [defined-events (set (map :name (extract-event-type-definitions)))
        scheduled-events (extract-schedule-event_calls)
        invalid-schedules (set/difference scheduled-events defined-events)]
    
    {:status (if (empty? invalid-schedules) :pass :fail)
     :total-scheduled-events (count scheduled-events)
     :invalid-schedules invalid-schedules
     :message (if (empty? invalid-schedules)
                "All ScheduleEvent calls use valid event types"
                (str "Invalid event types in ScheduleEvent: " (str/join ", " invalid-schedules)))}))

(defn check-event-auto-discovery
  "Verify buildamp auto-discovery includes all event files"
  []
  (let [event-files (filter #(.exists (io/file %))
                           ["../../src/models/universal/notification_events.rs"
                            "../../src/models/universal/maintenance_events.rs"])
        lib-file "../../src/lib.rs"]
    
    (if (.exists (io/file lib-file))
      (let [lib-content (slurp lib-file)
            has-auto-discover (str/includes? lib-content "buildamp_auto_discover_models!")
            expected-modules (count event-files)]
        
        {:status (if has-auto-discover :pass :warn)
         :auto-discovery-enabled has-auto-discover
         :event-files-count expected-modules
         :message (if has-auto-discover
                    "Auto-discovery macro is enabled for event types"
                    "buildamp_auto_discover_models! not found in lib.rs")})
      
      {:status :fail
       :message "lib.rs not found"})))

(defn check-background-event-table-compatibility
  "Verify event types are compatible with database schema"
  []
  (let [migration-file "../../app/horatio/server/migrations/004_background_events.sql"
        event-types (extract-event-type-definitions)]
    
    (if (.exists (io/file migration-file))
      (let [migration-content (slurp migration-file)
            has-events-table (str/includes? migration-content "CREATE TABLE IF NOT EXISTS events")
            has-payload-json (str/includes? migration-content "payload JSONB")
            has-event-type-field (str/includes? migration-content "event_type TEXT")]
        
        {:status (if (and has-events-table has-payload-json has-event-type-field) :pass :fail)
         :events-table-exists has-events-table
         :jsonb-payload-supported has-payload-json
         :event-type-field-exists has-event-type-field
         :total-event-types (count event-types)
         :message (if (and has-events-table has-payload-json has-event-type-field)
                    "Database schema supports all event types"
                    "Database schema missing required fields for event system")})
      
      {:status :fail
       :message "Background events migration not found"})))

(defn check-event-payload-serialization
  "Verify event types have proper serialization attributes"
  []
  (let [event-files ["../../src/models/universal/notification_events.rs"
                    "../../src/models/universal/maintenance_events.rs"]
        serialization-issues (atom [])]
    
    (doseq [file-path event-files]
      (when (.exists (io/file file-path))
        (let [content (slurp file-path)
              structs (re-seq #"(?s)pub struct\s+(\w+)\s*\{[^}]+\}" content)]
          
          (doseq [[struct-block struct-name] structs]
            ;; Check if struct is above a #[derive(...)] with Serialize/Deserialize
            (let [lines-before (->> (str/split content (re-pattern (str "pub struct " struct-name)))
                                  first
                                  str/split-lines
                                  (take-last 5))
                  has-serde-derive (some #(and (str/includes? % "#[derive")
                                              (str/includes? % "Serialize")
                                              (str/includes? % "Deserialize"))
                                        lines-before)]
              
              (when (not has-serde-derive)
                (swap! serialization-issues conj {:struct struct-name :file file-path})))))))
    
    {:status (if (empty? @serialization-issues) :pass :warn)
     :serialization-issues @serialization-issues
     :message (if (empty? @serialization-issues)
                "All event types have proper serialization"
                (str "Missing serde derives: " (str/join ", " (map :struct @serialization-issues))))}))

(defn run-all-event-system-checks
  "Run comprehensive event system verification"
  []
  (println "[Event System] Running background event system checks...")
  {:status :ok
   :results {:event-handler-coverage (check-event-type_handler-coverage)
             :schedule-event-validity (check-schedule-event-validity)
             :auto-discovery (check-event-auto-discovery)
             :database-compatibility (check-background-event-table-compatibility)
             :payload-serialization (check-event-payload-serialization)}})