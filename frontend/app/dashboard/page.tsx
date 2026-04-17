import TriageQueue from "@/app/dashboard/components/TriageQueue"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4">
          Πίνακας Ελέγχου Νοσηλευτών
        </h1>
        <TriageQueue />
      </div>
    </div>
  )
}
