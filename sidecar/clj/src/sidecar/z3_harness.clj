(ns sidecar.z3-harness
  (:require [clojure.edn :as edn]))

;; Stub function: does NOT invoke Z3.
;; Agents will replace the internals when needed.

(defn run-case [case]
  (println "[Z3] Stub harness ran for case:" (:id case))
  {:id (:id case)
   :status :not-implemented
   :message "Z3 harness not yet implemented."})

(defn run-all []
  (let [cases-file "sidecar/clj/cases/z3.edn"
        cases      (if (.exists (java.io.File. cases-file))
                     (:cases (edn/read-string (slurp cases-file)))
                     [])]
    (println "[Z3] Running stub harness across" (count cases) "cases.")
    {:status :ok
     :results (map run-case cases)}))

