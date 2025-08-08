"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, Languages } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useApprovedTexts } from "@/contexts/approved-texts-context"
import { ProjectManager } from "@/components/project-manager"
import Link from "next/link"
import { StandaloneOCRDialog } from "@/components/standalone-ocr-dialog"
import type { Project } from "@/types/project"
import { DemoBanner } from "@/components/demo-banner"

export default function HomePage() {
  const { toast } = useToast()
  const { approvedTexts } = useApprovedTexts()
  const [isOCRDialogOpen, setIsOCRDialogOpen] = useState(false)

  const handleProjectSelect = (project: Project) => {
    toast({
      title: "Project Selected",
      description: `Selected project: ${project.title}`,
    })
    // You can add navigation or other logic here
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">OCR Scanner & Project Manager</h1>
            <p className="text-muted-foreground">
              Manage multilingual OCR projects with linked pages and translations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Translation Button - only show if there are approved texts */}
            {approvedTexts.length > 0 && (
              <Link href="/translate">
                <Button variant="outline" className="gap-2">
                  <Languages className="w-4 h-4" />
                  Translate Texts
                </Button>
              </Link>
            )}
            {/* Standalone OCR Scanner Button */}
            <Button onClick={() => setIsOCRDialogOpen(true)} className="gap-2">
              <Upload className="w-4 h-4" />
              OCR Scanner
            </Button>
          </div>
        </div>
      </div>

      {/* Demo Banner */}
      <DemoBanner />

      {/* Project Manager */}
      <ProjectManager onProjectSelect={handleProjectSelect} />

      {/* Standalone OCR Dialog */}
      <StandaloneOCRDialog isOpen={isOCRDialogOpen} onClose={() => setIsOCRDialogOpen(false)} />
    </div>
  )
}
