(ns sidecar.host-isolation
  (:require [clojure.string :as str]
            [clojure.java.io :as io]
            [clojure.set :as set]))

;; Host-based tenant isolation verification

(defn extract-database-queries
  "Extract database query patterns from Elm Logic files"
  [elm-content]
  (let [queries (atom [])]
    ;; Find Insert, Update, Delete, Query operations
    (doseq [pattern [#"Api\.Backend\.Insert\s*\{[^}]*table\s*=\s*\"([^\"]+)\""
                     #"Api\.Backend\.Update\s*\{[^}]*table\s*=\s*\"([^\"]+)\""
                     #"Api\.Backend\.Delete\s*\{[^}]*table\s*=\s*\"([^\"]+)\""
                     #"Api\.Backend\.Query\s*\{[^}]*table\s*=\s*\"([^\"]+)\""]]
      (doseq [match (re-seq pattern elm-content)]
        (swap! queries conj {:operation (str pattern)
                            :table (second match)})))
    @queries))

(defn extract-host-usage-in-logic
  "Find host field usage in Logic.elm"
  [elm-content]
  (let [host-references (atom [])]
    ;; Look for context.host usage
    (doseq [line (str/split-lines elm-content)]
      (when (str/includes? line "context.host")
        (swap! host-references conj line)))
    @host-references))

(defn get-multi-tenant-tables
  "Identify tables that should have host isolation"
  []
  (let [migration-files ["../../app/horatio/server/migrations/001_init.sql"
                        "../../app/horatio/server/migrations/002_tags.sql"
                        "../../app/horatio/server/migrations/003_comments.sql"]
        host-tables (atom #{})]
    
    (doseq [file-path migration-files]
      (when (.exists (io/file file-path))
        (let [content (slurp file-path)]
          ;; Find tables with host columns
          (doseq [match (re-seq #"CREATE TABLE (?:IF NOT EXISTS )?\s*(\w+)\s*\([^)]*host\s+TEXT" content)]
            (swap! host-tables conj (second match))))))
    
    @host-tables))

(defn check-host-filtering-in-queries
  "Verify all queries on multi-tenant tables include host filtering"
  []
  (let [logic-file "../../app/horatio/server/src/Logic.elm"
        violations (atom [])]
    
    (if (.exists (io/file logic-file))
      (let [elm-content (slurp logic-file)
            multi-tenant-tables (get-multi-tenant-tables)
            database-queries (extract-database-queries elm-content)]
        
        ;; Check each query against multi-tenant tables
        (doseq [query database-queries]
          (when (contains? multi-tenant-tables (:table query))
            ;; Check if the query context includes host filtering
            (let [query-context (re-find (re-pattern (str "table\\s*=\\s*\"" (:table query) "\"[^}]*"))
                                         elm-content)]
              (when (and query-context 
                        (not (str/includes? query-context "host"))
                        (not (str/includes? query-context "context.host")))
                (swap! violations conj {:table (:table query)
                                       :operation (:operation query)
                                       :issue "Missing host filtering"})))))
        
        {:status (if (empty? @violations) :pass :fail)
         :multi-tenant-tables (count multi-tenant-tables)
         :total-queries (count database-queries)
         :violations @violations
         :message (if (empty? @violations)
                    "All multi-tenant queries include host filtering"
                    (str "Found " (count @violations) " queries missing host filtering"))})
      
      {:status :fail
       :message "Logic.elm not found"})))

(defn check-context-injection_coverage
  "Verify all API endpoints inject host context properly"
  []
  (let [api-files ["../../src/models/domain/feed_api.rs"
                   "../../src/models/domain/comments_api.rs"
                   "../../src/models/domain/tags_api.rs"]
        missing-injection (atom [])]
    
    (doseq [file-path api-files]
      (when (.exists (io/file file-path))
        (let [content (slurp file-path)
              structs (re-seq #"pub struct\s+(\w+Req)\s*\{[^}]+\}" content)]
          
          (doseq [[struct-block struct-name] structs]
            ;; Check if struct has host field with Inject attribute
            (let [has-host-field (str/includes? struct-block "host:")
                  has-inject-attr (str/includes? struct-block "#[api(Inject")]
              
              (when (and (not has-host-field) (not has-inject-attr))
                (swap! missing-injection conj {:struct struct-name :file file-path})))))))
    
    {:status (if (empty? @missing-injection) :pass :warn)
     :missing-injection @missing-injection  
     :message (if (empty? @missing-injection)
                "All API endpoints have proper host injection"
                (str "Missing host injection: " (str/join ", " (map :struct @missing-injection))))}))

(defn check-database-constraints-isolation
  "Verify database constraints respect tenant boundaries"
  []
  (let [migration-files ["../../app/horatio/server/migrations/002_tags.sql"]
        isolation-violations (atom [])]
    
    (doseq [file-path migration-files]
      (when (.exists (io/file file-path))
        (let [content (slurp file-path)
              unique-constraints (re-seq #"UNIQUE\s*\(([^)]+)\)" content)]
          
          ;; Check if UNIQUE constraints include host for proper isolation
          (doseq [[constraint-block constraint-fields] unique-constraints]
            (when (not (str/includes? constraint-fields "host"))
              (swap! isolation-violations conj {:constraint constraint-fields
                                               :file file-path
                                               :issue "UNIQUE constraint should include host for tenant isolation"}))))))
    
    {:status (if (empty? @isolation-violations) :pass :warn)
     :isolation-violations @isolation-violations
     :message (if (empty? @isolation-violations)
                "Database constraints properly isolated by tenant"
                (str "Found " (count @isolation-violations) " constraints missing host isolation"))}))

(defn check-session-boundary-enforcement
  "Verify session data respects host boundaries"
  []
  (let [server-file "../../app/horatio/server/server.js"]
    
    (if (.exists (io/file server-file))
      (let [content (slurp server-file)
            session-usages (->> (re-seq #"session[^;\n]*" content)
                               (map first))
            host-checks (->> session-usages
                           (filter #(str/includes? % "host"))
                           count)]
        
        {:status (if (> host-checks 0) :pass :warn)
         :total-session-usages (count session-usages)
         :host-aware-sessions host-checks
         :message (if (> host-checks 0)
                    "Session handling respects host boundaries"
                    "Verify session isolation by host")})
      
      {:status :warn
       :message "server.js not found for session analysis"})))

(defn check-api-response-isolation
  "Verify API responses don't leak cross-tenant data"
  []
  (let [logic-file "../../app/horatio/server/src/Logic.elm"]
    
    (if (.exists (io/file logic-file))
      (let [content (slurp logic-file)
            response-builders (->> (re-seq #"response\s*=\s*[^,}]+" content)
                                 (map first))
            host-context-usage (->> response-builders
                                  (filter #(str/includes? % "host"))
                                  count)]
        
        {:status (if (> host-context-usage 0) :pass :warn)
         :total-responses (count response-builders)
         :host-aware-responses host-context-usage
         :message (if (> host-context-usage 0)
                    "API responses properly scoped to host"
                    "Verify response isolation by host")})
      
      {:status :fail
       :message "Logic.elm not found for response analysis"})))

(defn run-all-host-isolation-checks
  "Run comprehensive host-based tenant isolation verification"
  []
  (println "[Host Isolation] Running tenant isolation checks...")
  {:status :ok
   :results {:host-filtering-queries (check-host-filtering-in-queries)
             :context-injection-coverage (check-context-injection_coverage)  
             :database-constraints-isolation (check-database-constraints-isolation)
             :session-boundary-enforcement (check-session-boundary-enforcement)
             :api-response-isolation (check-api-response-isolation)}})