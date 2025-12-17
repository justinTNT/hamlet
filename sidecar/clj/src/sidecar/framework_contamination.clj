(ns sidecar.framework-contamination
  (:require [clojure.string :as str]
            [clojure.java.io :as io]
            [clojure.set :as set]))

;; Verify business logic doesn't leak into framework code

(defn extract-business-model-names
  "Extract business model names from application code"
  []
  (let [model-dirs ["../../app/horatio/models/api/"
                   "../../app/horatio/models/db/"
                   "../../app/horatio/models/events/"
                   "../../app/horatio/models/sse/"
                   "../../app/horatio/models/storage/"
                   "../../app/horatio/models/kv/"
                   "../../app/horatio/models/services/"
                   "../../app/horatio/models/webhooks/"]
        business-models (atom #{})]
    
    (doseq [dir model-dirs]
      (let [dir-file (io/file dir)]
        (when (.exists dir-file)
          (doseq [file (.listFiles dir-file)]
            (when (str/ends-with? (.getName file) ".rs")
              (let [content (slurp file)]
                ;; Extract struct names
                (->> (re-seq #"pub struct\s+(\w+)" content)
                     (map second)
                     (run! #(swap! business-models conj %)))
                ;; Extract enum names  
                (->> (re-seq #"pub enum\s+(\w+)" content)
                     (map second)
                     (run! #(swap! business-models conj %)))
                ;; Extract table/field names from comments/strings
                (->> (re-seq #"[\"'](\w+_\w+)[\"']|//.*?(\w+_\w+)" content)
                     (mapcat (fn [[_ quoted commented]] [quoted commented]))
                     (filter identity)
                     (filter #(str/includes? % "_"))
                     (run! #(swap! business-models conj %))))))))
    @business-models))

(defn scan-framework-files-for-business-logic
  "Scan framework directory for business model references"
  []
  (let [framework-dir "../../src/framework/"
        business-models (extract-business-model-names)
        violations (atom [])]
    
    (when (.exists (io/file framework-dir))
      (doseq [file (.listFiles (io/file framework-dir))]
        (when (str/ends-with? (.getName file) ".rs")
          (let [file-path (.getPath file)
                content (slurp file)
                file-name (.getName file)]
            
            ;; Check for hardcoded business model names
            (doseq [model-name business-models]
              (when (and (str/includes? content model-name)
                        ;; Exclude generic references
                        (not (str/includes? content (str "// Example: " model-name)))
                        (not (str/includes? content (str "e.g. " model-name))))
                (let [line-numbers (->> (str/split-lines content)
                                      (map-indexed vector)
                                      (filter #(str/includes? (second %) model-name))
                                      (map first)
                                      (map inc))]
                  (swap! violations conj {:file file-name
                                         :file-path file-path
                                         :business-model model-name
                                         :lines line-numbers}))))
            
            ;; Check for hardcoded table names (snake_case with app-specific words)
            (let [suspicious-tables (->> (re-seq #"[\"']([a-z]+_[a-z_]+)[\"']" content)
                                       (map second)
                                       (filter #(and (not (str/starts-with? % "buildamp_"))
                                                    (not (= % "created_at"))
                                                    (not (= % "updated_at"))
                                                    (not (= % "gen_random_uuid"))
                                                    (not (str/includes? % "table"))
                                                    (not (str/includes? % "column")))))]
              (doseq [table suspicious-tables]
                (swap! violations conj {:file file-name
                                       :file-path file-path  
                                       :business-model table
                                       :type :hardcoded-table-name}))))))
    @violations))

(defn check-framework-business-logic-isolation
  "Verify framework code contains no business logic references"
  []
  (let [violations (scan-framework-files-for-business-logic)]
    {:status (if (empty? violations) :pass :fail)
     :violations violations
     :total-violations (count violations)
     :message (if (empty? violations)
                "Framework code is clean of business logic references"
                (str "Found " (count violations) " business logic references in framework code"))}))

(defn check-auto-discovery-usage
  "Verify framework uses auto-discovery instead of hardcoded model lists"
  []
  (let [framework-files (->> (io/file "../../src/framework/")
                           .listFiles
                           (filter #(str/ends-with? (.getName %) ".rs")))
        hardcoded-model-lists (atom [])]
    
    (doseq [file framework-files]
      (let [content (slurp file)]
        ;; Look for manual model enumeration patterns
        (when (re-find #"HashMap::new\(\)|vec!\[.*struct|tables\.insert" content)
          (swap! hardcoded-model-lists conj {:file (.getName file)
                                            :reason "Contains manual model enumeration"}))
        
        ;; Look for TODO comments about auto-discovery
        (when (str/includes? content "TODO: Use proc macro to auto-discover")
          (swap! hardcoded-model-lists conj {:file (.getName file) 
                                            :reason "Has TODO for auto-discovery implementation"}))))
    
    {:status (if (empty? @hardcoded-model-lists) :pass :warn)
     :hardcoded-patterns @hardcoded-model-lists
     :message (if (empty? @hardcoded-model-lists)
                "Framework properly uses auto-discovery patterns"
                "Framework contains hardcoded model references that should use auto-discovery")}))

(defn run-all-framework-contamination-checks
  "Run comprehensive framework contamination verification"
  []
  (println "[Framework Contamination] Checking business logic isolation...")
  {:status :ok
   :results {:business-logic-isolation (check-framework-business-logic-isolation)
             :auto-discovery-usage (check-auto-discovery-usage)}})