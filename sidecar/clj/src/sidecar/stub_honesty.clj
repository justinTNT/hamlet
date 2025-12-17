(ns sidecar.stub-honesty
  (:require [clojure.string :as str]
            [clojure.java.io :as io]
            [clojure.set :as set]))

;; Verify stubs are clearly marked and don't masquerade as working code

(defn scan-for-dishonest-stubs
  "Scan codebase for stubs that pretend to work"
  []
  (let [code-dirs ["../../app/horatio/server/"
                   "../../packages/hamlet-server/middleware/"
                   "../../app/horatio/models/"]
        violations (atom [])]
    
    (doseq [dir code-dirs]
      (let [dir-file (io/file dir)]
        (when (.exists dir-file)
          (doseq [file (file-seq dir-file)]
            (when (and (.isFile file)
                       (or (str/ends-with? (.getName file) ".js")
                           (str/ends-with? (.getName file) ".rs")))
              (let [content (slurp file)
                    file-path (.getPath file)]
                
                ;; Check for dishonest success messages
                (check-dishonest-success-messages content file-path violations)
                
                ;; Check for fake return values with TODOs
                (check-fake-return-values content file-path violations)
                
                ;; Check for working-looking code with hidden TODOs
                (check-hidden-todos content file-path violations)))))))
    @violations))

(defn check-dishonest-success-messages
  "Find success messages that are lies"
  [content file-path violations]
  (let [lines (str/split-lines content)]
    (doseq [[line-no line] (map-indexed vector lines)]
      (let [line-clean (str/trim line)]
        ;; Success messages followed by TODO or stub comments
        (when (and (or (str/includes? line-clean "✅")
                       (str/includes? line-clean "Success")
                       (str/includes? line-clean "sent successfully")
                       (str/includes? line-clean "completed successfully"))
                   (or (str/includes? line-clean "TODO")
                       (str/includes? line-clean "STUB")
                       (str/includes? line-clean "not implemented")))
          (swap! violations conj {:file file-path
                                 :line (inc line-no)
                                 :type :dishonest-success-message
                                 :content line-clean
                                 :reason "Success message claims work that isn't done"}))
        
        ;; Check for success messages near TODO lines
        (when (and (< (inc line-no) (count lines))
                   (or (str/includes? line-clean "✅")
                       (str/includes? line-clean "Success")
                       (str/includes? line-clean "sent")
                       (str/includes? line-clean "scheduled"))
                   (let [next-line (str/trim (nth lines (inc line-no) ""))]
                     (or (str/includes? next-line "TODO")
                         (str/includes? next-line "not implemented")
                         (str/includes? next-line "STUB"))))
          (swap! violations conj {:file file-path
                                 :line (inc line-no)
                                 :type :success-followed-by-todo
                                 :content line-clean
                                 :reason "Success message immediately followed by TODO/stub"}))))))

(defn check-fake-return-values
  "Find functions that return success but are stubs"
  [content file-path violations]
  (let [lines (str/split-lines content)]
    (doseq [[line-no line] (map-indexed vector lines)]
      (let [line-clean (str/trim line)]
        ;; Return success: true with TODO nearby
        (when (and (str/includes? line-clean "success: true")
                   (some #(or (str/includes? % "TODO")
                              (str/includes? % "not implemented")
                              (str/includes? % "STUB"))
                         (take 5 (drop (max 0 (- line-no 3)) lines))))
          (swap! violations conj {:file file-path
                                 :line (inc line-no)
                                 :type :fake-success-return
                                 :content line-clean
                                 :reason "Returns success: true but function is stubbed"}))
        
        ;; Return OK/success with console.log instead of real work
        (when (and (or (str/includes? line-clean "return { success: true")
                       (str/includes? line-clean "return true")
                       (str/includes? line-clean "{ success: true }"))
                   (some #(str/includes? % "console.log")
                         (take 10 (drop (max 0 (- line-no 5)) lines))))
          (swap! violations conj {:file file-path
                                 :line (inc line-no)
                                 :type :console-log-success
                                 :content line-clean
                                 :reason "Returns success but only does console.log"}))))))

(defn check-hidden-todos
  "Find TODOs buried in seemingly working code"
  [content file-path violations]
  (let [lines (str/split-lines content)]
    (doseq [[line-no line] (map-indexed vector lines)]
      (let [line-clean (str/trim line)]
        ;; TODO in middle of function that looks complete
        (when (and (str/includes? line-clean "TODO")
                   (not (str/starts-with? line-clean "//"))
                   (not (str/starts-with? line-clean "*"))
                   (not (str/starts-with? line-clean "console.warn")))
          (swap! violations conj {:file file-path
                                 :line (inc line-no)
                                 :type :buried-todo
                                 :content line-clean
                                 :reason "TODO buried in seemingly working code"}))
        
        ;; Comments that downplay missing functionality
        (when (or (str/includes? line-clean "For now,")
                  (str/includes? line-clean "temporarily")
                  (str/includes? line-clean "just log")
                  (str/includes? line-clean "simulate"))
          (swap! violations conj {:file file-path
                                 :line (inc line-no)
                                 :type :downplayed-stub
                                 :content line-clean
                                 :reason "Downplays missing functionality instead of being explicit"}))))))

(defn check-stub-honesty
  "Verify stubs are clearly marked and don't masquerade as working code"
  []
  (let [violations (scan-for-dishonest-stubs)]
    {:status (if (empty? violations) :pass :fail)
     :violations violations
     :total-violations (count violations)
     :message (if (empty? violations)
                "All stubs are honestly marked"
                (str "Found " (count violations) " dishonest stubs that masquerade as working code"))}))

(defn check-explicit-stub-markers
  "Verify stubs use explicit markers like STUB: or TODO_IMPLEMENT:"
  []
  (let [violations (atom [])
        code-dirs ["../../app/horatio/server/"
                   "../../packages/hamlet-server/middleware/"]]
    
    (doseq [dir code-dirs]
      (let [dir-file (io/file dir)]
        (when (.exists dir-file)
          (doseq [file (file-seq dir-file)]
            (when (and (.isFile file)
                       (str/ends-with? (.getName file) ".js"))
              (let [content (slurp file)
                    file-path (.getPath file)
                    lines (str/split-lines content)]
                
                (doseq [[line-no line] (map-indexed vector lines)]
                  (let [line-clean (str/trim line)]
                    ;; TODO without explicit stub marker
                    (when (and (str/includes? line-clean "TODO")
                               (not (str/includes? line-clean "STUB:"))
                               (not (str/includes? line-clean "NOT_IMPLEMENTED:"))
                               (not (str/includes? line-clean "TODO_IMPLEMENT:"))
                               (not (str/starts-with? line-clean "//")))
                      (swap! violations conj {:file file-path
                                             :line (inc line-no)
                                             :type :unclear-stub-marker
                                             :content line-clean
                                             :reason "TODO should use explicit stub marker like STUB: or NOT_IMPLEMENTED:"})))))))))
    
    {:status (if (empty? @violations) :pass :warn)
     :violations @violations
     :message (if (empty? @violations)
                "All stubs use explicit markers"
                "Found TODOs that should use explicit stub markers")}))

(defn run-all-stub-honesty-checks
  "Run comprehensive stub honesty verification"
  []
  (println "[Stub Honesty] Checking for dishonest stubs and misleading code...")
  {:status :ok
   :results {:stub-honesty (check-stub-honesty)
             :explicit-markers (check-explicit-stub-markers)}})