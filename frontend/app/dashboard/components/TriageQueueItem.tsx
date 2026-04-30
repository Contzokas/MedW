import { QueueEntry } from "@/app/lib/types"

interface TriageQueueItemProps {
  entry: QueueEntry
  onRowClick?: (patientId: string) => void
}

const MTS_LABELS: Record<number, string> = {
  1: "Άμεση Αντιμετώπιση",
  2: "Πολύ Επείγον",
  3: "Επείγον",
  4: "Λιγότερο Επείγον",
  5: "Μη Επείγον",
}

const MTS_COLORS: Record<number, string> = {
  1: "bg-destructive text-destructive-foreground",
  2: "bg-destructive text-destructive-foreground",
  3: "bg-warning text-warning-foreground",
  4: "bg-success text-success-foreground",
  5: "bg-success text-success-foreground",
}

export default function TriageQueueItem({ entry, onRowClick }: TriageQueueItemProps) {
  const badgeClass = MTS_COLORS[entry.mts_level] ?? "bg-gray-500 text-white"
  const label = MTS_LABELS[entry.mts_level] ?? `Επίπεδο ${entry.mts_level}`
  const rowClass = entry.mts_level <= 2 ? "bg-destructive/10" : "bg-card"
  const patientId = entry.patient_id

  const parsedDate = new Date(entry.timestamp)
  const formattedTime = Number.isNaN(parsedDate.getTime())
    ? "Μη έγκυρη ώρα"
    : parsedDate.toLocaleTimeString("el-GR")

  return (
    <tr 
      className={`${rowClass} cursor-pointer hover:bg-accent/50 transition-colors`}
      onClick={() => onRowClick?.(entry.patient_id)}
    >
      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
        {formattedTime}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-mono">
        {patientId}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-2 inline-flex text-sm leading-5 font-semibold rounded-full ${badgeClass}`}
          aria-label={`Επίπεδο κινδύνου ${label}`}
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
