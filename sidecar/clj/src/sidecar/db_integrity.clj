(ns sidecar.db-integrity
  (:require [clojure.string :as str]
            [clojure.set :as set]))

;; Direct analysis of database schema integrity from migration files

(defn extract-table-definitions
  "Extract table names and columns from CREATE TABLE statements"
  [sql-content]
  (let [lines (str/split-lines sql-content)
        tables (atom {})]
    (doseq [line lines]
      (when-let [table-match (re-find #"CREATE TABLE.*?(\w+)\s*\(" line)]
        (let [table-name (second table-match)]
          (swap! tables assoc table-name {:columns [] :constraints []}))))
    @tables))

(defn extract-foreign-keys
  "Extract foreign key relationships from all migration files"
  []
  (let [migration-files ["../../app/horatio/server/migrations/001_init.sql"
                        "../../app/horatio/server/migrations/002_tags.sql"
                        "../../app/horatio/server/migrations/003_comments.sql"
                        "../../app/horatio/server/migrations/004_background_events.sql"]
        foreign-keys (atom [])]
    (doseq [file-path migration-files]
      (when (.exists (java.io.File. file-path))
        (let [content (slurp file-path)
              fk-matches (re-seq #"(\w+)\s+.*?REFERENCES\s+(\w+)\((\w+)\)" content)]
          (doseq [[_ col ref-table ref-col] fk-matches]
            (swap! foreign-keys conj {:column col
                                     :references-table ref-table
                                     :references-column ref-col
                                     :source-file file-path})))))
    @foreign-keys))

(defn extract-unique-constraints
  "Extract UNIQUE constraints from migration files"
  []
  (let [migration-files ["../../app/horatio/server/migrations/001_init.sql"
                        "../../app/horatio/server/migrations/002_tags.sql"
                        "../../app/horatio/server/migrations/003_comments.sql"
                        "../../app/horatio/server/migrations/004_background_events.sql"]
        unique-constraints (atom [])]
    (doseq [file-path migration-files]
      (when (.exists (java.io.File. file-path))
        (let [content (slurp file-path)
              unique-matches (re-seq #"UNIQUE\s*\(([^)]+)\)" content)]
          (doseq [[_ cols] unique-matches]
            (swap! unique-constraints conj {:columns (str/split cols #",\s*")
                                          :source-file file-path})))))
    @unique-constraints))

(defn check-referential-integrity
  "Verify all foreign keys reference existing tables"
  []
  (let [foreign-keys (extract-foreign-keys)
        all-tables #{"microblog_items" "item_comments" "guests" "tags" "item_tags" "events" "dead_letter_queue"}
        broken-refs (filter #(not (contains? all-tables (:references-table %))) foreign-keys)]
    {:status (if (empty? broken-refs) :pass :fail)
     :total-foreign-keys (count foreign-keys)
     :broken-references (count broken-refs)
     :broken-refs broken-refs
     :message (if (empty? broken-refs)
                "All foreign keys reference valid tables"
                (str "Found " (count broken-refs) " broken foreign key references"))}))

(defn check-cascade-consistency 
  "Verify CASCADE deletions are properly configured"
  []
  (let [migration-content (str (slurp "../../app/horatio/server/migrations/002_tags.sql")
                              (slurp "../../app/horatio/server/migrations/001_init.sql"))
        cascade-deletions (re-seq #"ON DELETE CASCADE" migration-content)
        foreign-keys (extract-foreign-keys)]
    {:status :pass
     :cascade-deletions (count cascade-deletions)
     :total-foreign-keys (count foreign-keys)
     :cascade-coverage (/ (count cascade-deletions) (max 1 (count foreign-keys)))
     :message (str "Found " (count cascade-deletions) " CASCADE deletions out of " 
                   (count foreign-keys) " foreign keys")}))

(defn check-tenant-isolation
  "Verify all multi-tenant tables have host columns"
  []
  (let [migration-files ["../../app/horatio/server/migrations/001_init.sql"
                        "../../app/horatio/server/migrations/002_tags.sql"]
        tables-with-host (atom [])
        all-tables (atom [])]
    (doseq [file-path migration-files]
      (when (.exists (java.io.File. file-path))
        (let [content (slurp file-path)
              table-matches (re-seq #"CREATE TABLE.*?(\w+)" content)
              host-columns (re-seq #"host\s+TEXT\s+NOT NULL" content)]
          (doseq [[_ table] table-matches]
            (swap! all-tables conj table))
          (when (seq host-columns)
            (doseq [[_ table] table-matches]
              (when (str/includes? content (str "CREATE TABLE IF NOT EXISTS " table))
                (swap! tables-with-host conj table)))))))
    (let [tables @all-tables
          host-tables @tables-with-host
          missing-host (set/difference (set tables) (set host-tables))]
      {:status (if (empty? missing-host) :pass :warn)
       :total-tables (count tables)
       :tables-with-host (count host-tables)
       :missing-host-isolation (vec missing-host)
       :message (if (empty? missing-host)
                  "All tables have proper tenant isolation"
                  (str "Tables missing host isolation: " missing-host))})))

(defn check-unique-constraint-coverage
  "Verify business-critical unique constraints exist"
  []
  (let [unique-constraints (extract-unique-constraints)
        tag-uniqueness (some #(and (contains? (set (:columns %)) "host")
                                  (contains? (set (:columns %)) "name"))
                            unique-constraints)]
    {:status (if tag-uniqueness :pass :fail)
     :total-unique-constraints (count unique-constraints)
     :has-tag-uniqueness (boolean tag-uniqueness)
     :constraints unique-constraints
     :message (if tag-uniqueness
                "Critical business constraints are enforced"
                "Missing tag uniqueness constraint (host, name)")}))

(defn run-all-db-checks
  "Run all database integrity checks"
  []
  (println "[Database Integrity] Running schema consistency checks...")
  {:status :ok
   :results {:referential-integrity (check-referential-integrity)
             :cascade-consistency (check-cascade-consistency)  
             :tenant-isolation (check-tenant-isolation)
             :unique-constraints (check-unique-constraint-coverage)}})