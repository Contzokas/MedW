import { TriageResponse } from "@/app/lib/types"

interface TriageResultProps {
  result: TriageResponse
}

export default function TriageResult({ result: _result }: TriageResultProps) {
  return (
    <div className="text-gray-500 text-center py-8">
      Αποτέλεσμα φορτώνεται...
    </div>
  )
}
