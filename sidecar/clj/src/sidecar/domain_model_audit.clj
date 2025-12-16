(ns sidecar.domain-model-audit
  (:require [clojure.java.shell :as shell]
            [clojure.string :as str]))

;; Domain models extracted from Rust code
(def domain-models
  #{"MicroblogItem" "UserPreferences" "AuthState" "FileProcessingStatus" 
    "ProcessingStep" "ViewportState" "GetFeedReq" "SubmitItemReq" 
    "SubmitItemData" "GetFeedRes" "SubmitItemRes"})

(defn find-js-files-with-domain-models [project-root]
  "Find JavaScript files containing domain model references"
  (let [result (shell/sh "find" project-root "-name" "*.js" "-type" "f" 
                         "-exec" "grep" "-l" 
                         (str/join "\\|" domain-models) "{}" ";")]
    (when (= 0 (:exit result))
      (str/split-lines (:out result)))))

(defn analyze-js-file [file-path]
  "Analyze a JavaScript file for domain model references"
  (let [result (shell/sh "grep" "-n" 
                         (str/join "\\|" domain-models) 
                         file-path)]
    (when (= 0 (:exit result))
      (let [lines (str/split-lines (:out result))]
        {:file file-path
         :matches lines
         :count (count lines)}))))

(defn classify-reference [file-path line]
  "Classify a domain model reference as legitimate or business logic violation"
  (let [file-type (cond
                    (str/includes? file-path "/generated/") :generated
                    (str/includes? file-path "/demo-") :demo
                    (str/includes? file-path "/test") :test
                    (str/includes? file-path "/.buildamp/") :generation
                    (str/includes? file-path "/middleware/") :middleware
                    :else :unknown)]
    
    (cond
      ;; Generated files - should be mechanical
      (= file-type :generated)
      (if (or (str/includes? line "function insert") 
              (str/includes? line "function get")
              (str/includes? line "Storage.save")
              (str/includes? line "class ") 
              (str/includes? line "export {"))
        {:classification :legitimate :reason "Generated mechanical functions"}
        {:classification :suspicious :reason "Non-mechanical code in generated file"})
      
      ;; Generation machinery - should be generic
      (= file-type :generation)
      (if (or (str/includes? line "struct_name")
              (str/includes? line "functionName")
              (str/includes? line "console.log"))
        {:classification :legitimate :reason "Generic generation machinery"}
        {:classification :suspicious :reason "Domain-specific logic in generator"})
      
      ;; Middleware - should be generic
      (= file-type :middleware)
      (if (or (str/includes? line "@deprecated")
              (str/includes? line "function like insert"))
        {:classification :legitimate :reason "Generic framework code"}
        {:classification :violation :reason "Business logic in framework middleware"})
      
      ;; Demo/test files
      (or (= file-type :demo) (= file-type :test))
      {:classification :acceptable :reason "Demo/test usage"}
      
      :else
      {:classification :unknown :reason "Unclassified file type"})))

(defn audit-domain-model-references [project-root]
  "Perform complete audit of domain model references in JavaScript"
  (println "\n🔍 DOMAIN MODEL AUDIT")
  (println "=====================")
  (println "Checking for business logic violations in JavaScript files...")
  
  (let [js-files (find-js-files-with-domain-models project-root)
        analyses (keep analyze-js-file js-files)
        classifications (for [analysis analyses
                              line (:matches analysis)]
                          (let [classification (classify-reference (:file analysis) line)]
                            (assoc classification 
                                   :file (:file analysis)
                                   :line line)))
        
        grouped (group-by :classification classifications)
        violations (get grouped :violation [])
        suspicious (get grouped :suspicious [])
        legitimate (get grouped :legitimate [])]
    
    (println (str "\n📊 AUDIT RESULTS:"))
    (println (str "Total JS files with domain models: " (count js-files)))
    (println (str "Total domain model references: " (reduce + (map :count analyses))))
    
    (println (str "\n✅ LEGITIMATE REFERENCES: " (count legitimate)))
    (doseq [ref legitimate]
      (println (str "  " (:file ref) " - " (:reason ref))))
    
    (println (str "\n⚠️  SUSPICIOUS REFERENCES: " (count suspicious)))
    (doseq [ref suspicious]
      (println (str "  " (:file ref) " - " (:reason ref)))
      (println (str "    " (:line ref))))
    
    (println (str "\n🚨 BUSINESS LOGIC VIOLATIONS: " (count violations)))
    (doseq [ref violations]
      (println (str "  " (:file ref) " - " (:reason ref)))
      (println (str "    " (:line ref))))
    
    (let [status (cond
                   (> (count violations) 0) :fail
                   (> (count suspicious) 0) :warn  
                   :else :pass)]
      {:status status
       :violations violations
       :suspicious suspicious
       :legitimate legitimate
       :summary (str (count legitimate) " legitimate, " 
                     (count suspicious) " suspicious, "
                     (count violations) " violations")})))