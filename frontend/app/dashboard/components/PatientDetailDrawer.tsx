"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/app/lib/lang-context";
import { TriageHistoryEntry } from "@/app/lib/types";

interface PatientDetailDrawerProps {
  patientId: string | null;
  onClose: () => void;
}

export default function PatientDetailDrawer({
  patientId,
  onClose,
}: PatientDetailDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<TriageHistoryEntry[]>([]);
  const { t } = useLang();

  useEffect(() => {
    if (!patientId) {
      setHistory([]);
      return;
    }

    setLoading(true);
    fetch(`/api/v1/history/${patientId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch history");
        return res.json();
      })
      .then((data) => {
        setHistory(data.entries || []);
      })
      .catch((err) => {
        console.error("Error fetching patient history", err);
      })
      .finally(() => setLoading(false));
  }, [patientId]);

  if (!patientId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card shadow-2xl border-l border-border transform transition-transform duration-300 ease-in-out flex flex-col h-full translate-x-0 overflow-y-auto`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50">
          <div>
            <h2 id="drawer-title" className="text-xl font-semibold text-foreground">
              {"Patient Details"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              ID: {patientId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={"close"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 flex-1">
          <h3 className="text-lg font-medium text-foreground mb-4">
            {"Triage History"}
          </h3>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="bg-muted p-4 rounded-lg flex flex-col gap-3">
                  <div className="h-4 bg-border rounded w-1/3"></div>
                  <div className="h-4 bg-border rounded w-full"></div>
                  <div className="h-4 bg-border rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent history found for this patient.
            </div>
          ) : (
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {history.map((entry) => (
                <div key={entry.id} className="relative flex items-start justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-muted text-muted-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
                    </svg>
                  </div>
                  
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded bg-muted/50 border border-border hover:bg-muted transition-colors">
                    <div className="flex items-center justify-between mb-2">
                       <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          entry.mts_level <= 2 ? "bg-destructive text-destructive-foreground" :
                          entry.mts_level === 3 ? "bg-warning text-warning-foreground" :
                          "bg-success text-success-foreground"
                        }`}>
                          Level {entry.mts_level}
                        </span>
                      <time className="text-xs text-muted-foreground font-medium">
                        {new Date(entry.created_at).toLocaleString("el-GR", {
                          dateStyle: "short",
                          timeStyle: "short"
                        })}
                      </time>
                    </div>
                    <div className="space-y-2 mt-3">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase">{"Symptoms"}</span>
                        <p className="text-sm text-foreground my-1 pb-1">{entry.symptoms}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                         <div>
                           <span className="block text-muted-foreground opacity-75">{"Specialty"}</span>
                           <span className="font-medium">{entry.specialty}</span>
                         </div>
                         <div>
                           <span className="block text-muted-foreground opacity-75">{"Doctor"}</span>
                           <span className="font-medium">{entry.doctor_name || "Any"}</span>
                         </div>
                      </div>
                      {entry.reasoning && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <span className="text-xs font-medium text-muted-foreground uppercase">{"Reasoning"}</span>
                          <p className="text-xs italic mt-1 text-muted-foreground line-clamp-3 hover:line-clamp-none transition-all">{entry.reasoning}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}