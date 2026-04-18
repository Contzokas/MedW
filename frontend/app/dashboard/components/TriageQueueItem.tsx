import { QueueEntry } from "@/app/lib/types"

interface TriageQueueItemProps {
  entry: QueueEntry
}

const MTS_LABELS: Record<number, string> = {
  1: "Άμεση Αντιμετώπιση",
  2: "Πολύ Επείγον",
  3: "Επείγον",
  4: "Λιγότερο Επείγον",
  5: "Μη Επείγον",
}

const MTS_COLORS: Record<number, string> = {
  1: "bg-red-600 text-white",
  2: "bg-red-600 text-white",
  3: "bg-orange-500 text-white",
  4: "bg-green-600 text-white",
  5: "bg-green-600 text-white",
}

export default function TriageQueueItem({ entry }: TriageQueueItemProps) {
  const badgeClass = MTS_COLORS[entry.mts_level] ?? "bg-gray-500 text-white"
  const label = MTS_LABELS[entry.mts_level] ?? `Επίπεδο ${entry.mts_level}`
  const rowClass = entry.mts_level <= 2 ? "bg-red-50" : "bg-white"
  const patientId = entry.patient_id.slice(0, 8)

  const parsedDate = new Date(entry.timestamp)
  const formattedTime = Number.isNaN(parsedDate.getTime())
    ? "Μη έγκυρη ώρα"
    : parsedDate.toLocaleTimeString("el-GR")

  return (
    <tr className={rowClass}>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formattedTime}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {patientId}...
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-2 inline-flex text-sm leading-5 font-semibold rounded-full ${badgeClass}`}
          aria-label={`Επίπεδο κινδύνου ${label}`}
        >
          {label}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {entry.specialty}
      </td>
    </tr>
  )
}
