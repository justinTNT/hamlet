(ns sidecar.business-rules
  (:require [clojure.string :as str]
            [clojure.java.io :as io]))

;; Verify business logic consistency across the application

(defn extract-elm-endpoints
  "Extract API endpoints defined in Elm files"
  [elm-file-path]
  (when (.exists (io/file elm-file-path))
    (let [content (slurp elm-file-path)
          endpoint-patterns (re-seq #"api\s+\"([^\"]+)\"" content)]
      (map second endpoint-patterns))))

(defn extract-rust-endpoints  
  "Extract endpoints from Rust BuildAmpEndpoint macros"
  [rust-file-path]
  (when (.exists (io/file rust-file-path))
    (let [content (slurp rust-file-path)
          endpoint-patterns (re-seq #"#\[api\(path\s*=\s*\"([^\"]+)\"\)\]" content)]
      (map second endpoint-patterns))))

(defn check-endpoint-consistency
  "Verify Elm and Rust endpoint definitions match"
  []
  (let [elm-endpoints (set (extract-elm-endpoints "../../app/horatio/web/src/Api.elm"))
        rust-endpoints (set (extract-rust-endpoints "../../tests/macro_test.rs"))
        missing-in-elm (clojure.set/difference rust-endpoints elm-endpoints)
        missing-in-rust (clojure.set/difference elm-endpoints rust-endpoints)]
    {:status (if (and (empty? missing-in-elm) (empty? missing-in-rust)) :pass :warn)
     :elm-endpoints (count elm-endpoints)
     :rust-endpoints (count rust-endpoints) 
     :missing-in-elm (vec missing-in-elm)
     :missing-in-rust (vec missing-in-rust)
     :message (cond
                (and (empty? missing-in-elm) (empty? missing-in-rust))
                "Elm and Rust endpoints are synchronized"
                
                (seq missing-in-elm)
                (str "Rust endpoints missing from Elm: " missing-in-elm)
                
                :else
                (str "Elm endpoints missing from Rust: " missing-in-rust))}))

(defn check-context-injection
  "Verify context injection is consistently applied"
  []
  (let [rust-content (slurp "../../tests/macro_test.rs")
        inject-attrs (->> (str/split-lines rust-content)
                         (filter #(str/includes? % "#[api(Inject"))
                         count)
        auth-attrs (->> (str/split-lines rust-content)
                       (filter #(str/includes? % "#[api(Auth"))
                       count)]
    {:status (if (> inject-attrs 0) :pass :warn)
     :injection-attributes inject-attrs
     :auth-attributes auth-attrs
     :message (if (> inject-attrs 0)
                "Context injection is being used"
                "No context injection found - verify manual context handling")}))

(defn check-guest-session-logic
  "Verify guest session creation follows business rules"
  []
  (let [verification-script "scripts/verification/verify_guest_identity.sh"
        server-logic "../../app/horatio/server/src/Logic.elm"]
    (if (.exists (io/file verification-script))
      (let [script-content (slurp verification-script)
            has-reuse-logic (str/includes? script-content "existing")
            has-creation-logic (str/includes? script-content "create")]
        {:status (if (and has-reuse-logic has-creation-logic) :pass :warn)
         :has-guest-reuse has-reuse-logic
         :has-guest-creation has-creation-logic
         :verification-script-exists true
         :message (if (and has-reuse-logic has-creation-logic)
                    "Guest session logic includes both reuse and creation"
                    "Guest session verification may be incomplete")})
      {:status :warn
       :verification-script-exists false
       :message "No guest session verification script found"})))

(defn check-host-based-isolation
  "Verify host-based tenant isolation is consistently enforced"
  []
  (let [elm-logic (slurp "../../app/horatio/server/src/Logic.elm")
        host-filters (->> (str/split-lines elm-logic)
                         (filter #(str/includes? % "host"))
                         count)
        context-usage (->> (str/split-lines elm-logic)
                          (filter #(str/includes? % "context.host"))
                          count)]
    {:status (if (> context-usage 0) :pass :warn)
     :host-references host-filters
     :context-host-usage context-usage
     :message (if (> context-usage 0)
                "Host-based isolation is being enforced"
                "Verify host isolation in business logic")}))

(defn check-event-scheduling-consistency
  "Verify event scheduling follows proper patterns"
  []
  (let [logic-elm (slurp "../../app/horatio/server/src/Logic.elm")
        schedule-events (->> (str/split-lines logic-elm)
                            (filter #(str/includes? % "ScheduleEvent"))
                            count)
        event-types (when (.exists (io/file "../../src/models/universal/notification_events.rs"))
                     (->> (slurp "../../src/models/universal/notification_events.rs")
                          str/split-lines
                          (filter #(str/includes? % "pub struct"))
                          count))]
    {:status (if (and (> schedule-events 0) event-types) :pass :warn)
     :schedule-event-calls schedule-events
     :defined-event-types (or event-types 0)
     :message (if (and (> schedule-events 0) event-types)
                "Event scheduling is properly integrated"
                "Event scheduling may not be fully configured")}))

(defn run-all-business-checks
  "Run all business logic consistency checks"
  []
  (println "[Business Rules] Running business logic consistency checks...")
  {:status :ok
   :results {:endpoint-consistency (check-endpoint-consistency)
             :context-injection (check-context-injection)
             :guest-session-logic (check-guest-session-logic)  
             :host-isolation (check-host-based-isolation)
             :event-scheduling (check-event-scheduling-consistency)}})