"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Dashboard() {
  const [queue, setQueue] = useState<any[]>([]);

  const fetchQueue = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/triage/queue`);
      if (res.ok) {
        const data = await res.json();
        setQueue(data);
      }
    } catch (err) {
      console.error("Failed to fetch queue", err);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Poll every 3 seconds
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4">
          Πίνακας Ελέγχου Νοσηλευτών (Triage Queue)
        </h2>
        
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ώρα (Τοπική)
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Επίπεδο MTS
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ειδικότητα
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    Η ουρά είναι άδεια. Δεν υπάρχουν νέα περιστατικά.
                  </td>
                </tr>
              ) : (
                queue.map((entry, idx) => (
                  <tr key={idx} className={entry.mts_level <= 2 ? "bg-red-50" : "bg-white"}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(entry.timestamp).toLocaleTimeString("el-GR")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.patient_id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        entry.mts_level === 1 ? 'bg-red-800 text-white' :
                        entry.mts_level === 2 ? 'bg-red-200 text-red-800' :
                        entry.mts_level === 3 ? 'bg-yellow-100 text-yellow-800' :
                        entry.mts_level === 4 ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        Επίπεδο {entry.mts_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.specialty}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
