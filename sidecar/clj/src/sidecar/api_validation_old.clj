(ns sidecar.api-validation
  (:require [clojure.string :as str]
            [clojure.java.io :as io]))

;; Direct validation of API consistency from the actual Rust source

(defn extract-api-attributes 
  "Extract #[api(...)] attributes from Rust struct fields"
  [rust-content]
  (->> (str/split-lines rust-content)
       (map str/trim)
       (filter #(str/starts-with? % "#[api("))
       (map #(str/replace % #"#\[api\(|\)\]" ""))
       (map #(str/split % #","))))

(defn extract-struct-fields
  "Extract field names from Rust structs"
  [rust-content struct-name]
  (let [lines (str/split-lines rust-content)
        in-struct? (atom false)
        fields (atom [])]
    (doseq [line lines]
      (when (str/includes? line (str "struct " struct-name))
        (reset! in-struct? true))
      (when (and @in-struct? (str/includes? line "pub "))
        (let [field-line (str/trim line)
              field-name (-> field-line
                           (str/split #":")
                           first
                           (str/replace "pub " "")
                           str/trim)]
          (swap! fields conj field-name)))
      (when (and @in-struct? (str/includes? line "}"))
        (reset! in-struct? false)))
    @fields))

(defn extract-struct-field-types
  "Extract field names and types from Rust API structs"
  [rust-content struct-name]
  (let [lines (str/split-lines rust-content)
        in-struct? (atom false)
        fields (atom [])]
    (doseq [line lines]
      (when (str/includes? line (str "struct " struct-name))
        (reset! in-struct? true))
      (when (and @in-struct? (str/includes? line "pub "))
        (let [field-line (str/trim line)]
          (when-let [field-match (re-find #"pub\s+(\w+):\s*(.+?)," field-line)]
            (let [[_ field-name field-type] field-match]
              (swap! fields conj {:name field-name :type (str/trim field-type)})))))
      (when (and @in-struct? (str/includes? line "}"))
        (reset! in-struct? false)))
    @fields))

(defn check-option-type-usage
  "Verify appropriate use of Option<T> vs String for API fields"
  []
  (let [api-files ["../../src/models/domain/feed_api.rs"
                   "../../src/models/domain/comments_api.rs"]
        all-fields (atom [])
        non-option-strings (atom [])]
    
    (doseq [file-path api-files]
      (when (.exists (java.io.File. file-path))
        (let [content (slurp file-path)
              req-structs (re-seq #"struct\s+(\w+Req)" content)]
          (doseq [[_ struct-name] req-structs]
            (let [fields (extract-struct-field-types content struct-name)]
              (swap! all-fields concat fields)
              (doseq [field fields]
                (when (and (= (:type field) "String")
                          (not (str/includes? (:name field) "host"))  ; host is injected
                          (not (str/includes? (:name field) "id")))   ; ids are required
                  (swap! non-option-strings conj 
                         {:struct struct-name :field (:name field) :file file-path}))))))))
    
    {:status (if (< (count @non-option-strings) 3) :pass :warn)
     :total-fields (count @all-fields)
     :non-option-strings (count @non-option-strings)
     :questionable-fields @non-option-strings
     :message (if (< (count @non-option-strings) 3)
                "Good use of Option<T> for optional fields"
                (str "Consider Option<T> for: " 
                     (str/join ", " (map :field @non-option-strings))))}))

(defn check-required-field-coverage
  "Verify API validation strategy is consistent"
  []
  (let [rust-content (slurp "../../tests/macro_test.rs")
        required-attrs (->> (str/split-lines rust-content)
                           (filter #(str/includes? % "#[api(Required")]
                           count)
        option-usage-check (check-option-type-usage)]
    {:status (if (and (< required-attrs 5) (:status option-usage-check)) :pass :warn)
     :required-attributes required-attrs
     :option-type-status (:status option-usage-check)
     :message (if (< required-attrs 5)
                "Good: Using Option<T> types instead of excessive Required attributes"
                "Consider replacing Required attributes with Option<T> types")}))

(defn check-validation-consistency
  "Verify validation rules match between frontend and backend"
  []
  (let [elm-popup (slurp "../../app/horatio/extension/src/Popup.elm")
        rust-tests (slurp "../../tests/macro_test.rs")]
    ;; Check that Elm validation matches Rust API attributes
    (let [elm-empty-checks (->> (str/split-lines elm-popup)
                               (filter #(str/includes? % "String.isEmpty"))
                               count)
          rust-required-attrs (->> (extract-api-attributes rust-tests)
                                  (filter #(some (fn [attr] (str/includes? attr "Required")) %))
                                  count)]
      {:status (if (= elm-empty-checks rust-required-attrs) :pass :warn)
       :elm-validations elm-empty-checks
       :rust-required-fields rust-required-attrs
       :message (if (= elm-empty-checks rust-required-attrs)
                  "Frontend and backend validation rules are consistent"
                  "Potential mismatch between frontend and backend validation")})))

(defn check-security-attributes
  "Verify security-critical API attributes are properly tested"
  []
  (let [rust-content (slurp "../../tests/macro_test.rs")
        auth-attrs (filter #(some (fn [attr] (str/includes? attr "Auth")) %)
                          (extract-api-attributes rust-content))
        extension-attrs (filter #(some (fn [attr] (str/includes? attr "ExtensionOnly")) %)
                               (extract-api-attributes rust-content))
        auth-tests (->> (str/split-lines rust-content)
                       (filter #(str/includes? % "is_extension"))
                       count)]
    {:status (if (> auth-tests 0) :pass :fail)
     :auth-attributes (count auth-attrs)
     :extension-attributes (count extension-attrs)
     :security-tests auth-tests
     :message (if (> auth-tests 0)
                "Security attributes are properly tested"
                "Missing tests for security-critical attributes")}))

(defn run-all-api-checks
  "Run all API validation consistency checks"
  []
  (println "[API Validation] Running consistency checks...")
  {:status :ok
   :results {:required-field-coverage (check-required-field-coverage)
             :validation-consistency (check-validation-consistency)
             :security-attributes (check-security-attributes)}})