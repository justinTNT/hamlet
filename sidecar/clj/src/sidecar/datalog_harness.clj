(ns sidecar.datalog-harness
  (:require [clojure.edn :as edn]))

;; Stub harness: prints what it *would* check.
;; Agents will fill in logic using datahike/datascript/etc.

(defn run-case [case]
  (println "[Datalog] Stub harness ran for case:" (:id case))
  {:id (:id case)
   :status :not-implemented
   :message "Datalog harness not yet implemented."})

(defn run-all []
  (let [cases-file "sidecar/clj/cases/datalog.edn"
        cases      (if (.exists (java.io.File. cases-file))
                     (:cases (edn/read-string (slurp cases-file)))
                     [])]
    (println "[Datalog] Running stub harness across" (count cases) "cases.")
    {:status :ok
     :results (map run-case cases)}))

