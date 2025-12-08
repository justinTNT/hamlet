(ns sidecar.logic-harness
  (:require [clojure.edn :as edn]))

;; MiniKanren/core.logic is NOT loaded by default.
;; Agents will add the dependency when needed.

(defn run-case [case]
  (println "[Logic] Stub harness ran for case:" (:id case))
  {:id (:id case)
   :status :not-implemented
   :message "Logic harness not yet implemented."})

(defn run-all []
  (let [cases-file "sidecar/clj/cases/logic.edn"
        cases      (if (.exists (java.io.File. cases-file))
                     (:cases (edn/read-string (slurp cases-file)))
                     [])]
    (println "[Logic] Running stub harness across" (count cases) "cases.")
    {:status :ok
     :results (map run-case cases)}))

