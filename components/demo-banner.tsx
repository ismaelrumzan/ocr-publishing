import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from 'lucide-react'

export function DemoBanner() {
  return (
    <Alert className="mb-6">
      <Info className="h-4 w-4" />
      <AlertDescription>
        This is a demo OCR publishing application. Upload images to extract text and manage multilingual translation projects.
      </AlertDescription>
    </Alert>
  )
}
