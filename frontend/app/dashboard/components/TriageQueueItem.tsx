import { QueueEntry } from "@/app/lib/types"

interface TriageQueueItemProps {
  entry: QueueEntry
}

const MTS_LABELS: Record<number, string> = {
  1: "Immediate",
  2: "Very Urgent",
  3: "Urgent",
  4: "Less Urgent",
  5: "Non-urgent",
}

const MTS_COLORS: Record<number, string> = {
  1: "bg-destructive text-destructive-foreground",
  2: "bg-destructive text-destructive-foreground",
  3: "bg-warning text-warning-foreground",
  4: "bg-success text-success-foreground",
  5: "bg-success text-success-foreground",
}

export default function TriageQueueItem({ entry }: TriageQueueItemProps) {
  const badgeClass = MTS_COLORS[entry.mts_level] ?? "bg-gray-500 text-white"
  const label = MTS_LABELS[entry.mts_level] ?? `Level ${entry.mts_level}`
  const rowClass = entry.mts_level <= 2 ? "bg-destructive/10" : "bg-card"
  const patientId = entry.patient_id.slice(0, 8)

  const parsedDate = new Date(entry.timestamp)
  const formattedTime = Number.isNaN(parsedDate.getTime())
    ? "Invalid time"
    : parsedDate.toLocaleTimeString("en-GB")

  return (
    <tr className={rowClass}>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
        {formattedTime}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
        {patientId}...
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-2 inline-flex text-sm leading-5 font-semibold rounded-full ${badgeClass}`}
          aria-label={`Danger level ${label}`}
        >
          {label}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
        {entry.specialty}
      </td>
    </tr>
  )
}
