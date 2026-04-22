import TriageQueue from "@/app/dashboard/components/TriageQueue"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-muted flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <h1 className="text-3xl font-bold text-foreground mb-8 border-b border-border pb-4">
          Nurse Dashboard
        </h1>
        <TriageQueue />
      </div>
    </div>
  )
}
