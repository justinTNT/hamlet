(ns sidecar.sse-verification
  (:require [clojure.string :as str]
            [clojure.java.io :as io]
            [clojure.set :as set]))

;; Server-Sent Events pattern verification

(defn extract-sse-event-types
  "Extract SSE event type definitions from Rust files"
  []
  (let [sse-files ["../../src/models/events/sse_events.rs"]]
    (->> sse-files
         (filter #(.exists (io/file %)))
         (mapcat (fn [file-path]
                   (let [content (slurp file-path)]
                     ;; Look for enum variants in SSEEvent
                     (->> (re-seq #"(\w+)\([^)]+\)" content)
                          (map first)
                          (filter #(not (str/includes? % "Debug")))
                          (map #(hash-map :name % :file file-path))))))
         (into []))))

(defn extract-elm-sse-types
  "Extract SSE event types from Elm SSE module"
  []
  (let [elm-sse-file "../../app/horatio/web/src/Api/Events.elm"]
    (if (.exists (io/file elm-sse-file))
      (let [content (slurp elm-sse-file)]
        ;; Look for SSE event constructors
        (->> (re-seq #"SSE(\w+)" content)
             (map second)
             (filter #(not (str/includes? % "Unknown")))
             set))
      #{})))

(defn extract-sse-endpoints
  "Extract SSE endpoints from server.js"
  []
  (let [server-file "../../app/horatio/server/server.js"]
    (if (.exists (io/file server-file))
      (let [content (slurp server-file)]
        (->> (re-seq #"app\.(get|post)\s*\(['\"]([^'\"]*events[^'\"]*)['\"]" content)
             (map (fn [[_ method endpoint]] 
                    {:method method :endpoint endpoint}))))
      [])))

(defn extract-broadcast-calls
  "Extract broadcastSSEEvent calls from server.js"
  []
  (let [server-file "../../app/horatio/server/server.js"]
    (if (.exists (io/file server-file))
      (let [content (slurp server-file)]
        (->> (re-seq #"broadcastSSEEvent\([^,]+,\s*['\"]([^'\"]+)['\"]" content)
             (map second)
             set))
      #{})))

(defn check-sse-type-coverage
  "Verify all Rust SSE events have corresponding Elm types"
  []
  (let [rust-events (set (map :name (extract-sse-event-types)))
        elm-events (extract-elm-sse-types)
        missing-elm-types (set/difference rust-events elm-events)]
    
    {:status (if (empty? missing-elm-types) :pass :warn)
     :total-rust-events (count rust-events)
     :elm-types-count (count elm-events)
     :missing-elm-types missing-elm-types
     :message (if (empty? missing-elm-types)
                "All Rust SSE events have Elm types"
                (str "Missing Elm types for: " (str/join ", " missing-elm-types)))}))

(defn check-sse-api-completeness
  "Verify SSE API endpoints are complete"
  []
  (let [endpoints (extract-sse-endpoints)
        required-patterns #{"/events/stream" "/events/broadcast" "/events/stats"}
        found-patterns (set (map :endpoint endpoints))
        missing-patterns (set/difference required-patterns found-patterns)]
    
    {:status (if (empty? missing-patterns) :pass :fail)
     :total-endpoints (count endpoints)
     :required-patterns (count required-patterns)
     :missing-patterns missing-patterns
     :found-patterns found-patterns
     :message (if (empty? missing-patterns)
                "All required SSE endpoints implemented"
                (str "Missing SSE endpoints: " (str/join ", " missing-patterns)))}))

(defn check-broadcast-integration
  "Verify SSE broadcasting is integrated into relevant endpoints"
  []
  (let [server-file "../../app/horatio/server/server.js"]
    (if (.exists (io/file server-file))
      (let [content (slurp server-file)
            broadcast-calls (extract-broadcast-calls)
            expected-broadcasts #{"new_post" "new_comment"}
            missing-broadcasts (set/difference expected-broadcasts broadcast-calls)]
        
        {:status (if (empty? missing-broadcasts) :pass :warn)
         :total-broadcasts (count broadcast-calls)
         :expected-broadcasts expected-broadcasts
         :found-broadcasts broadcast-calls
         :missing-broadcasts missing-broadcasts
         :message (if (empty? missing-broadcasts)
                    "All expected SSE broadcasts implemented"
                    (str "Missing broadcasts for: " (str/join ", " missing-broadcasts)))})
      {:status :fail
       :message "Cannot find server.js to verify broadcast integration"})))

(defn check-tenant-isolation-in-sse
  "Verify SSE endpoints respect tenant isolation"
  []
  (let [server-file "../../app/horatio/server/server.js"]
    (if (.exists (io/file server-file))
      (let [content (slurp server-file)
            sse-functions (->> (str/split content #"\n")
                             (filter #(str/includes? % "app."))
                             (filter #(str/includes? % "/events/"))
                             (take 10)) ; First few SSE endpoints
            host-checks (->> sse-functions
                           (filter #(str/includes? % "req.get('Host')"))
                           count)]
        
        {:status (if (> host-checks 0) :pass :fail)
         :sse-endpoints-checked (min 10 (count sse-functions))
         :host-isolation-count host-checks
         :message (if (> host-checks 0)
                    "SSE endpoints properly isolated by tenant"
                    "SSE endpoints missing tenant isolation")})
      {:status :fail
       :message "Cannot find server.js to verify tenant isolation"})))

(defn run-all-sse-verification-checks
  "Run all SSE verification checks"
  []
  {:results {
    :sse-type-coverage (check-sse-type-coverage)
    :sse-api-completeness (check-sse-api-completeness)
    :broadcast-integration (check-broadcast-integration)
    :tenant-isolation-sse (check-tenant-isolation-in-sse)
  }})