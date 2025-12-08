(ns sidecar.type-sync
  (:require [clojure.string :as str]
            [clojure.java.io :as io]
            [clojure.set :as set]))

;; Type synchronization verification between Rust and generated Elm

(defn extract-rust-struct-fields
  "Extract struct name and field definitions from Rust code"
  [rust-content]
  (let [structs (atom {})]
    (->> (str/split rust-content #"(?=pub struct)")
         (filter #(str/includes? % "pub struct"))
         (map (fn [struct-block]
                (when-let [struct-match (re-find #"pub struct\s+(\w+)\s*\{([^}]+)\}" struct-block)]
                  (let [[_ struct-name fields-block] struct-match
                        fields (->> (str/split fields-block #"\n")
                                  (map str/trim)
                                  (filter #(str/starts-with? % "pub "))
                                  (map (fn [field-line]
                                         (when-let [field-match (re-find #"pub\s+(\w+):\s*(.+?)," field-line)]
                                           (let [[_ field-name field-type] field-match]
                                             {:name field-name 
                                              :type (str/trim field-type)
                                              :optional (str/includes? field-type "Option<")}))))
                                  (filter identity))]
                    (swap! structs assoc struct-name fields))))))
    @structs))

(defn extract-elm-type-definitions
  "Extract type definitions from generated Elm files"
  [elm-content]
  (let [types (atom {})]
    (->> (str/split-lines elm-content)
         (filter #(or (str/starts-with? % "type alias ")
                     (str/starts-with? % "type ")))
         (map (fn [type-line]
                (when-let [type-match (re-find #"type (?:alias\s+)?(\w+)\s*=?\s*\{([^}]+)\}" type-line)]
                  (let [[_ type-name fields-block] type-match
                        fields (->> (str/split fields-block #",")
                                  (map str/trim)
                                  (map (fn [field-spec]
                                         (when-let [field-match (re-find #"(\w+)\s*:\s*(.+)" field-spec)]
                                           (let [[_ field-name field-type] field-match]
                                             {:name field-name
                                              :type (str/trim field-type)
                                              :optional (or (str/includes? field-type "Maybe ")
                                                           (str/includes? field-type "Maybe("))}))))
                                  (filter identity))]
                    (swap! types assoc type-name fields))))))
    @types))

(defn rust-to-elm-type-mapping
  "Map Rust types to their Elm equivalents"
  [rust-type]
  (cond
    (str/includes? rust-type "String") "String"
    (str/includes? rust-type "i32") "Int" 
    (str/includes? rust-type "i64") "Int"
    (str/includes? rust-type "u32") "Int"
    (str/includes? rust-type "u64") "Int" 
    (str/includes? rust-type "bool") "Bool"
    (str/includes? rust-type "Vec<String>") "List String"
    (str/includes? rust-type "Option<String>") "Maybe String"
    (str/includes? rust-type "Option<") (str "Maybe " (rust-to-elm-type-mapping (str/replace rust-type #"Option<(.+)>" "$1")))
    :else rust-type))

(defn check-struct-field-correspondence
  "Verify Rust struct fields match generated Elm types"
  []
  (let [rust-files ["../../src/models/domain/feed_api.rs"
                   "../../src/models/domain/comments_api.rs"
                   "../../src/models/domain/tags_api.rs"]
        elm-schema-file "../../app/horatio/web/src/Api/Schema.elm"
        mismatches (atom [])]
    
    ;; Extract all Rust structs
    (let [all-rust-structs (atom {})]
      (doseq [file-path rust-files]
        (when (.exists (io/file file-path))
          (let [content (slurp file-path)
                structs (extract-rust-struct-fields content)]
            (swap! all-rust-structs merge structs))))
      
      ;; Extract Elm types if file exists
      (let [elm-types (if (.exists (io/file elm-schema-file))
                       (extract-elm-type-definitions (slurp elm-schema-file))
                       {})]
        
        ;; Check each Rust struct against Elm types
        (doseq [[struct-name rust-fields] @all-rust-structs]
          (if-let [elm-fields (get elm-types struct-name)]
            ;; Compare field by field
            (let [rust-field-names (set (map :name rust-fields))
                  elm-field-names (set (map :name elm-fields))
                  missing-in-elm (set/difference rust-field-names elm-field-names)
                  missing-in-rust (set/difference elm-field-names rust-field-names)]
              
              (when (seq missing-in-elm)
                (swap! mismatches conj {:type :missing-elm-fields
                                       :struct struct-name
                                       :fields missing-in-elm}))
              
              (when (seq missing-in-rust)
                (swap! mismatches conj {:type :extra-elm-fields
                                       :struct struct-name
                                       :fields missing-in-rust}))
              
              ;; Check field type compatibility
              (doseq [rust-field rust-fields]
                (when-let [elm-field (first (filter #(= (:name %) (:name rust-field)) elm-fields))]
                  (let [expected-elm-type (rust-to-elm-type-mapping (:type rust-field))
                        actual-elm-type (:type elm-field)]
                    (when (not= expected-elm-type actual-elm-type)
                      (swap! mismatches conj {:type :type-mismatch
                                             :struct struct-name
                                             :field (:name rust-field)
                                             :expected expected-elm-type
                                             :actual actual-elm-type}))))))
            
            ;; Rust struct has no corresponding Elm type
            (swap! mismatches conj {:type :missing-elm-type
                                   :struct struct-name})))
        
        {:status (if (empty? @mismatches) :pass :fail)
         :total-rust-structs (count @all-rust-structs)
         :total-elm-types (count elm-types)
         :mismatches @mismatches
         :message (if (empty? @mismatches)
                    (str "All " (count @all-rust-structs) " Rust structs properly synchronized with Elm")
                    (str "Found " (count @mismatches) " type synchronization issues"))}))))

(defn check-endpoint-handler-coverage
  "Verify every #[buildamp_api] endpoint has a Logic.elm handler"
  []
  (let [rust-files ["../../src/models/domain/feed_api.rs"
                   "../../src/models/domain/comments_api.rs" 
                   "../../src/models/domain/tags_api.rs"]
        logic-file "../../app/horatio/server/src/Logic.elm"
        missing-handlers (atom [])]
    
    ;; Extract buildamp_api endpoints
    (let [api-endpoints (atom #{})]
      (doseq [file-path rust-files]
        (when (.exists (io/file file-path))
          (let [content (slurp file-path)
                endpoints (->> (re-seq #"#\[buildamp_api\([^)]*path\s*=\s*\"([^\"]+)\"" content)
                              (map second))]
            (swap! api-endpoints set/union (set endpoints)))))
      
      ;; Check Logic.elm for handlers (look for case patterns in processRequest)
      (when (.exists (io/file logic-file))
        (let [logic-content (slurp logic-file)
              handled-endpoints (->> (re-seq #"case\s+(\w+)\s+of|(\w+)\s*->|Api\.(\w+)" logic-content)
                                   (mapcat (fn [[full-match group1 group2 group3]]
                                            [group1 group2 group3]))
                                   (filter identity)
                                   (set))]
          
          (doseq [endpoint @api-endpoints]
            (when (not (contains? handled-endpoints endpoint))
              (swap! missing-handlers conj endpoint)))))
      
      {:status (if (empty? @missing-handlers) :pass :fail)
       :total-endpoints (count @api-endpoints)
       :missing-handlers @missing-handlers
       :message (if (empty? @missing-handlers)
                  (str "All " (count @api-endpoints) " API endpoints have Logic.elm handlers")
                  (str "Missing handlers for: " (str/join ", " @missing-handlers)))})))

(defn check-buildamp-convention-adherence
  "Verify consistent usage of BuildAmp patterns"
  []
  (let [rust-files ["../../src/models/domain/feed_api.rs"
                   "../../src/models/domain/comments_api.rs"
                   "../../src/models/domain/tags_api.rs"]
        violations (atom [])]
    
    (doseq [file-path rust-files]
      (when (.exists (io/file file-path))
        (let [content (slurp file-path)
              lines (str/split-lines content)]
          
          ;; Check Req/Res naming convention
          (doseq [line lines]
            (when-let [struct-match (re-find #"pub struct\s+(\w+)" line)]
              (let [struct-name (second struct-match)]
                (when (and (not (str/ends-with? struct-name "Req"))
                          (not (str/ends-with? struct-name "Res"))
                          (not (str/ends-with? struct-name "Data"))
                          (not (str/includes? line "buildamp_domain")))
                  (swap! violations conj {:type :naming-convention
                                         :struct struct-name
                                         :file file-path
                                         :issue "Should end with Req, Res, or Data"})))))
          
          ;; Check buildamp_api has path attribute
          (doseq [line lines]
            (when (str/includes? line "#[buildamp_api")
              (when (not (str/includes? line "path ="))
                (swap! violations conj {:type :missing-path
                                       :file file-path
                                       :issue "buildamp_api macro missing path attribute"})))))))
    
    {:status (if (empty? @violations) :pass :warn)
     :violations @violations
     :message (if (empty? @violations)
                "All BuildAmp conventions properly followed"
                (str "Found " (count @violations) " convention violations"))}))

(defn run-all-type-sync-checks
  "Run comprehensive type synchronization verification"
  []
  (println "[Type Sync] Running Rust↔Elm synchronization checks...")
  {:status :ok
   :results {:struct-field-correspondence (check-struct-field-correspondence)
             :endpoint-handler-coverage (check-endpoint-handler-coverage)
             :buildamp-conventions (check-buildamp-convention-adherence)}})