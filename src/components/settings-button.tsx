import { Settings } from "lucide-react"
import { Button } from "./ui/button"
import { useConfigStore } from "../stores/configStore"

export function SettingsButton() {
  const { setShowPreferences } = useConfigStore()

  const handleOpenSettings = () => {
    setShowPreferences(true)
  }

  return (
    <Button variant="outline" size="icon" onClick={handleOpenSettings}>
      <Settings className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">打开设置</span>
    </Button>
  )
}