"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/app/lib/lang-context";

interface AnalyticsData {
  total_triages: number;
  mts_distribution: { mts_level: number; count: number }[];
  specialty_distribution: { specialty: string; count: number }[];
}

export default function AnalyticsPanel({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLang();

  useEffect(() => {
    fetch("/api/v1/analytics/")
      .then((res) => res.json())
      .then((val) => {
        setData(val);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch analytics", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-md bg-white dark:bg-zinc-900 shadow-xl border-l dark:border-zinc-800 transition-transform flex flex-col h-full overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="analytics-panel-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-zinc-800">
          <h2 id="analytics-panel-title" className="text-xl font-semibold">
            Analytics
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label={"close"}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 flex-1 space-y-8">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4"></div>
              <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
              <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3"></div>
              <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
            </div>
          ) : data ? (
            <>
              <div>
                <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                  Total Triages
                </h3>
                <p className="text-4xl font-bold text-primary">
                  {data.total_triages}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
                  MTS Distribution
                </h3>
                <div className="space-y-3">
                  {data.mts_distribution.map((item) => {
                    const percentage = Math.max(
                      (item.count / data.total_triages) * 100,
                      0
                    );
                    return (
                      <div key={item.mts_level} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Level {item.mts_level}</span>
                          <span className="font-medium">{item.count}</span>
                        </div>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5">
                          <div
                            className="bg-primary h-2.5 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
                  Top Specialties
                </h3>
                <div className="space-y-3">
                  {data.specialty_distribution.slice(0, 5).map((item) => (
                    <div
                      key={item.specialty}
                      className="flex justify-between items-center py-2 border-b dark:border-zinc-800 last:border-0"
                    >
                      <span className="text-sm truncate pr-4">
                        {item.specialty}
                      </span>
                      <span className="font-medium text-sm bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-zinc-500 dark:text-zinc-400">
              No analytics data available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}