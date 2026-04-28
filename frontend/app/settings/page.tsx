import type { Metadata } from "next"
import SettingsPanel from "@/app/components/SettingsPanel"

export const metadata: Metadata = {
  title: "Settings - MEDΩ",
}

export default function SettingsPage() {
  return <SettingsPanel />
}
