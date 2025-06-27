import type React from "react"

interface ProjectDetailPageProps {
  page: {
    fileName: string
    imageUrl?: string
  }
}

const ProjectDetailView: React.FC<ProjectDetailPageProps> = ({ page }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-full max-w-4xl p-4 border rounded-lg shadow-md bg-white">
        <h2 className="text-2xl font-semibold mb-4">Scan of {page.fileName}</h2>
        <div className="relative h-96 w-full flex items-center justify-center">
          {page.imageUrl ? (
            <img
              src={page.imageUrl || "/placeholder.svg"}
              alt={`Scan of ${page.fileName}`}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <p>No image available.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectDetailView
