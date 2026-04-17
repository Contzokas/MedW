import { Doctor } from "@/app/lib/types"

interface DoctorCardProps {
  doctor: Doctor
  redirectUrl: string
}

export default function DoctorCard({ doctor, redirectUrl }: DoctorCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-base font-medium text-gray-500">Συνιστώμενος Ιατρός</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{doctor.name}</p>
      <p className="text-base text-gray-600">{doctor.specialty}</p>

      {doctor.fallback_note !== null && (
        <p className="mt-2 text-base text-amber-700">
          ℹ️ {doctor.fallback_note}
        </p>
      )}

      <a
        href={redirectUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-base font-medium text-blue-600 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Βρείτε τον γιατρό στο finddoctors.gov.gr →
      </a>
    </div>
  )
}
