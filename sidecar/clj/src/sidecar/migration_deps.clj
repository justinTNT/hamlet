(ns sidecar.migration-deps
  (:require [clojure.string :as str]
            [clojure.java.io :as io]
            [clojure.set :as set]))

;; Migration dependency and ordering verification

(defn extract-migration-files
  "Get all migration files in order"
  []
  (->> (io/file "../../app/horatio/server/migrations")
       .listFiles
       (filter #(.isFile %))
       (filter #(str/ends-with? (.getName %) ".sql"))
       (sort-by #(.getName %))
       (map #(.getPath %))))

(defn extract-table-operations
  "Extract CREATE TABLE and DROP TABLE operations from migration"
  [migration-content file-name]
  (let [creates (->> (re-seq #"CREATE TABLE (?:IF NOT EXISTS )?\s*(\w+)" migration-content)
                    (map second)
                    (map #(hash-map :operation :create :table % :migration file-name)))
        drops (->> (re-seq #"DROP TABLE (?:IF EXISTS )?\s*(\w+)" migration-content)
                  (map second)
                  (map #(hash-map :operation :drop :table % :migration file-name)))]
    (concat creates drops)))

(defn extract-foreign_key-dependencies
  "Extract foreign key dependencies from migration"
  [migration-content file-name]
  (->> (re-seq #"(\w+)\s+.*?REFERENCES\s+(\w+)\s*\(" migration-content)
       (map (fn [[_ referencing-table referenced-table]]
              {:referencing-table referencing-table
               :referenced-table referenced-table
               :migration file-name
               :type :foreign-key}))))

(defn build-migration-dependency-graph
  "Build dependency graph from all migrations"
  []
  (let [migration-files (extract-migration-files)
        all-operations (atom [])
        all-dependencies (atom [])]
    
    (doseq [file-path migration-files]
      (let [content (slurp file-path)
            file-name (.getName (io/file file-path))
            operations (extract-table-operations content file-name)
            fk-deps (extract-foreign_key-dependencies content file-name)]
        
        (swap! all-operations concat operations)
        (swap! all-dependencies concat fk-deps)))
    
    {:operations @all-operations
     :dependencies @all-dependencies
     :files migration-files}))

(defn check-table-creation-order
  "Verify tables are created before they're referenced"
  []
  (let [graph (build-migration-dependency-graph)
        operations (:operations graph)
        dependencies (:dependencies graph)
        violations (atom [])]
    
    ;; Build table creation timeline
    (let [table-creations (into {} (map (fn [op] 
                                         (when (= (:operation op) :create)
                                           [(:table op) (:migration op)]))
                                       operations))
          migration-order (vec (map #(.getName (io/file %)) (:files graph)))]
      
      ;; Check each foreign key dependency
      (doseq [dep dependencies]
        (let [ref-table (:referenced-table dep)
              dep-migration (:migration dep)
              ref-creation-migration (get table-creations ref-table)]
          
          (when ref-creation-migration
            (let [dep-index (.indexOf migration-order dep-migration)
                  ref-index (.indexOf migration-order ref-creation-migration)]
              
              (when (and (>= dep-index 0) (>= ref-index 0) (< dep-index ref-index))
                (swap! violations conj {:type :forward-reference
                                       :referencing-table (:referencing-table dep)
                                       :referenced-table ref-table
                                       :dependency-migration dep-migration
                                       :creation-migration ref-creation-migration})))))))
    
    {:status (if (empty? @violations) :pass :fail)
     :total-dependencies (count dependencies)
     :violations @violations
     :message (if (empty? @violations)
                "All table dependencies respect creation order"
                (str "Found " (count @violations) " forward reference violations"))}))

(defn check-migration-file-naming
  "Verify migration files follow naming convention"
  []
  (let [migration-files (extract-migration-files)
        naming-issues (atom [])]
    
    (doseq [file-path migration-files]
      (let [file-name (.getName (io/file file-path))]
        ;; Check format: ###_descriptive_name.sql
        (when (not (re-matches #"\d{3}_\w+\.sql" file-name))
          (swap! naming-issues conj {:file file-name
                                    :issue "Should match format: 001_descriptive_name.sql"}))))
    
    ;; Check for sequential numbering
    (let [numbers (->> migration-files
                      (map #(.getName (io/file %)))
                      (map #(re-find #"^(\d{3})_" %))
                      (map second)
                      (map #(Integer/parseInt %))
                      sort)
          expected-sequence (range 1 (inc (count numbers)))
          missing-numbers (set/difference (set expected-sequence) (set numbers))
          duplicate-numbers (->> numbers
                               frequencies
                               (filter #(> (second %) 1))
                               (map first)
                               set)]
      
      (when (seq missing-numbers)
        (swap! naming-issues conj {:issue (str "Missing sequential numbers: " missing-numbers)}))
      
      (when (seq duplicate-numbers)
        (swap! naming-issues conj {:issue (str "Duplicate numbers: " duplicate-numbers)})))
    
    {:status (if (empty? @naming-issues) :pass :warn)
     :total-migrations (count migration-files)
     :naming-issues @naming-issues
     :message (if (empty? @naming-issues)
                "All migration files follow naming convention"
                (str "Found " (count @naming-issues) " naming issues"))}))

(defn check-idempotent-operations
  "Verify migrations use idempotent operations"
  []
  (let [migration-files (extract-migration-files)
        non-idempotent (atom [])]
    
    (doseq [file-path migration-files]
      (let [content (slurp file-path)
            file-name (.getName (io/file file-path))
            
            ;; Check for CREATE TABLE without IF NOT EXISTS
            non-idempotent-creates (re-seq #"CREATE TABLE\s+(?!IF NOT EXISTS)\s*(\w+)" content)
            
            ;; Check for INSERT without ON CONFLICT
            non-idempotent-inserts (->> (re-seq #"INSERT INTO[^;]+(?!.*ON CONFLICT)" content)
                                      (filter #(not (str/includes? (first %) "ON CONFLICT"))))
            
            ;; Check for DROP without IF EXISTS  
            non-idempotent-drops (re-seq #"DROP TABLE\s+(?!IF EXISTS)\s*(\w+)" content)]
        
        (when (seq non-idempotent-creates)
          (swap! non-idempotent conj {:migration file-name
                                     :type :create-table
                                     :suggestion "Use CREATE TABLE IF NOT EXISTS"}))
        
        (when (seq non-idempotent-inserts) 
          (swap! non-idempotent conj {:migration file-name
                                     :type :insert
                                     :suggestion "Use INSERT ... ON CONFLICT DO NOTHING"}))
        
        (when (seq non-idempotent-drops)
          (swap! non-idempotent conj {:migration file-name
                                     :type :drop-table
                                     :suggestion "Use DROP TABLE IF EXISTS"}))))
    
    {:status (if (empty? @non-idempotent) :pass :warn)
     :non-idempotent-operations @non-idempotent
     :message (if (empty? @non-idempotent)
                "All migrations use idempotent operations"
                (str "Found " (count @non-idempotent) " non-idempotent operations"))}))

(defn check-index-creation-strategy
  "Verify indexes are created efficiently"
  []
  (let [migration-files (extract-migration-files)
        index-issues (atom [])]
    
    (doseq [file-path migration-files]
      (let [content (slurp file-path)
            file-name (.getName (io/file file-path))
            
            ;; Find CREATE INDEX without IF NOT EXISTS
            non-idempotent-indexes (re-seq #"CREATE INDEX\s+(?!IF NOT EXISTS)" content)
            
            ;; Find indexes without descriptive names
            generic-index-names (->> (re-seq #"CREATE INDEX (?:IF NOT EXISTS )?\s*(\w+)" content)
                                    (map second)
                                    (filter #(re-matches #"idx\d+" %)))]
        
        (when (seq non-idempotent-indexes)
          (swap! index-issues conj {:migration file-name
                                   :type :non-idempotent-index
                                   :suggestion "Use CREATE INDEX IF NOT EXISTS"}))
        
        (when (seq generic-index-names)
          (swap! index-issues conj {:migration file-name
                                   :type :generic-index-name
                                   :suggestion "Use descriptive index names"}))))
    
    {:status (if (empty? @index-issues) :pass :warn)
     :index-issues @index-issues
     :message (if (empty? @index-issues)
                "Index creation follows best practices"
                (str "Found " (count @index-issues) " index issues"))}))

(defn run-all-migration-checks
  "Run comprehensive migration dependency verification" 
  []
  (println "[Migration Dependencies] Running database migration checks...")
  {:status :ok
   :results {:table-creation-order (check-table-creation-order)
             :migration-file-naming (check-migration-file-naming)
             :idempotent-operations (check-idempotent-operations)
             :index-creation-strategy (check-index-creation-strategy)}})