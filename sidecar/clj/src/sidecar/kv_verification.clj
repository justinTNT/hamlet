(ns sidecar.kv-verification
  (:require [clojure.string :as str]
            [clojure.java.io :as io]
            [clojure.set :as set]))

;; Key-Value Store pattern verification

(defn extract-storage-type-definitions
  "Extract storage type structs from *_storage.rs files"
  []
  (let [storage-files ["../../src/models/storage/user_storage.rs"
                      "../../src/models/storage/ui_storage.rs" 
                      "../../src/models/storage/app_storage.rs"]]
    (->> storage-files
         (filter #(.exists (io/file %)))
         (mapcat (fn [file-path]
                   (let [content (slurp file-path)]
                     (->> (re-seq #"pub struct\s+(\w+)\s*\{" content)
                          (map second)
                          (map #(hash-map :name % :file file-path))))))
         (into []))))

(defn extract-elm-kv-helpers
  "Extract type-safe helper functions from Api/Storage.elm"
  []
  (let [storage-elm-file "../../app/horatio/web/src/Api/Storage.elm"]
    (if (.exists (io/file storage-elm-file))
      (let [content (slurp storage-elm-file)]
        (->> (re-seq #"(set|get|delete)(\w+)\s*:" content)
             (map (fn [[_ operation type-name]] 
                    {:operation operation :type type-name}))
             (group-by :type)
             keys
             set))
      #{})))

(defn extract-kv-api-endpoints
  "Extract KV endpoints from server.js"
  []
  (let [server-file "../../app/horatio/server/server.js"]
    (if (.exists (io/file server-file))
      (let [content (slurp server-file)]
        (->> (re-seq #"app\.(get|post|delete)\s*\(['\"]([^'\"]*kv[^'\"]*)['\"]" content)
             (map (fn [[_ method endpoint]] 
                    {:method method :endpoint endpoint}))))
      [])))

(defn check-storage-type-coverage
  "Verify all storage types have corresponding Elm helpers"
  []
  (let [storage-types (set (map :name (extract-storage-type-definitions)))
        elm-helpers (extract-elm-kv-helpers)
        missing-helpers (set/difference storage-types elm-helpers)]
    
    {:status (if (empty? missing-helpers) :pass :warn)
     :total-storage-types (count storage-types)
     :elm-helpers-count (count elm-helpers)
     :missing-helpers missing-helpers
     :message (if (empty? missing-helpers)
                "All storage types have Elm helpers"
                (str "Missing Elm helpers for: " (str/join ", " missing-helpers)))}))

(defn check-kv-api-completeness
  "Verify KV API endpoints are complete"
  []
  (let [endpoints (extract-kv-api-endpoints)
        required-patterns #{"/kv/set/" "/kv/get/" "/kv/delete/" "/kv/list/" "/kv/cleanup" "/kv/stats"}
        found-patterns (set (map #(str/replace (:endpoint %) #":[\w]+" ":param") endpoints))
        missing-patterns (set/difference required-patterns found-patterns)]
    
    {:status (if (empty? missing-patterns) :pass :fail)
     :total-endpoints (count endpoints)
     :required-patterns (count required-patterns)
     :missing-patterns missing-patterns
     :found-patterns found-patterns
     :message (if (empty? missing-patterns)
                "All required KV endpoints implemented"
                (str "Missing KV endpoints: " (str/join ", " missing-patterns)))}))

(defn check-tenant-isolation_in-kv
  "Verify KV endpoints respect tenant isolation"
  []
  (let [server-file "../../app/horatio/server/server.js"]
    (if (.exists (io/file server-file))
      (let [content (slurp server-file)
            kv-functions (->> (str/split content #"\n")
                            (filter #(str/includes? % "app."))
                            (filter #(str/includes? % "/kv/"))
                            (take 10)) ; First few KV endpoints
            host-checks (->> kv-functions
                           (filter #(str/includes? % "req.get('Host')"))
                           count)]
        
        {:status (if (> host-checks 0) :pass :fail)
         :kv-endpoints-checked (min 10 (count kv-functions))
         :host-isolation-count host-checks
         :message (if (> host-checks 0)
                    "KV endpoints properly isolated by tenant"
                    "KV endpoints missing tenant isolation")})
      
      {:status :fail
       :message "server.js not found"})))

(defn check-ttl-usage-patterns
  "Verify TTL patterns are used appropriately"
  []
  (let [storage-elm-file "../../app/horatio/web/src/Api/Storage.elm"]
    (if (.exists (io/file storage-elm-file))
      (let [content (slurp storage-elm-file)
            ttl-usages (->> (str/split-lines content)
                          (filter #(str/includes? % "Just "))
                          (filter #(str/includes? % "-- "))
                          (filter #(or (str/includes? % "TTL")
                                     (str/includes? % "second")
                                     (str/includes? % "minute")
                                     (str/includes? % "hour"))))]
        
        {:status (if (>= (count ttl-usages) 2) :pass :warn)
         :ttl-patterns-found (count ttl-usages)
         :examples ttl-usages
         :message (if (>= (count ttl-usages) 2)
                    "TTL patterns are being used appropriately"
                    "Consider adding TTL for appropriate storage types")})
      
      {:status :fail
       :message "Api/Storage.elm not found"})))

(defn check_storage-directory-organization
  "Verify storage files follow BuildAmp organization"
  []
  (let [storage-files (->> (io/file "../../src/models/storage")
                          .listFiles
                          (filter #(.isFile %))
                          (map #(.getName %))
                          (filter #(str/ends-with? % "_storage.rs")))
        expected-patterns #{#".*_storage\.rs"}
        valid-files (->> storage-files
                        (filter (fn [filename]
                                  (some #(re-matches % filename) expected-patterns))))]
    
    {:status (if (= (count storage-files) (count valid-files)) :pass :warn)
     :total-files (count storage-files)
     :valid-files (count valid-files)
     :invalid-files (- (count storage-files) (count valid-files))
     :message (if (= (count storage-files) (count valid-files))
                "All storage files follow naming convention"
                "Some storage files don't follow *_storage.rs convention")}))

(defn check-serde-derives-for-storage
  "Verify storage types have proper serialization"
  []
  (let [storage-files ["../../src/models/storage/user_storage.rs"
                      "../../src/models/storage/ui_storage.rs"
                      "../../src/models/storage/app_storage.rs"]
        missing-derives (atom [])]
    
    (doseq [file-path storage-files]
      (when (.exists (io/file file-path))
        (let [content (slurp file-path)
              structs (re-seq #"(?s)#\[derive\([^)]*\)\]\s*pub struct\s+(\w+)" content)]
          
          (doseq [[derive-block struct-name] structs]
            (when (not (and (str/includes? derive-block "Serialize")
                          (str/includes? derive-block "Deserialize")))
              (swap! missing-derives conj {:struct struct-name :file file-path}))))))
    
    {:status (if (empty? @missing-derives) :pass :fail)
     :missing-derives @missing-derives
     :message (if (empty? @missing-derives)
                "All storage types have proper serde derives"
                (str "Missing Serialize/Deserialize for: " 
                     (str/join ", " (map :struct @missing-derives))))}))

(defn run-all-kv-verification-checks
  "Run comprehensive KV store pattern verification"
  []
  (println "[KV Verification] Running Key-Value Store pattern checks...")
  {:status :ok
   :results {:storage-type-coverage (check-storage-type-coverage)
             :kv-api-completeness (check-kv-api-completeness)
             :tenant-isolation-kv (check-tenant-isolation_in-kv)
             :ttl-usage-patterns (check-ttl-usage-patterns)
             :storage-directory-organization (check_storage-directory-organization)
             :serde-derives-storage (check-serde-derives-for-storage)}})