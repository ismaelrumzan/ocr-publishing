"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit3, Save, X } from "lucide-react"

interface PageTitleEditorProps {
  title: string
  fileName: string
  onSave: (newTitle: string) => void
  isLoading?: boolean
}

export function PageTitleEditor({ title, fileName, onSave, isLoading = false }: PageTitleEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title || fileName)

  const handleSave = () => {
    onSave(editedTitle.trim() || fileName)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedTitle(title || fileName)
    setIsEditing(false)
  }

  const displayTitle = title || fileName

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Label htmlFor="page-title">Page Title</Label>
        <div className="flex gap-2">
          <Input
            id="page-title"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            placeholder="Enter page title"
            disabled={isLoading}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave()
              if (e.key === "Escape") handleCancel()
            }}
            autoFocus
          />
          <Button onClick={handleSave} size="sm" disabled={isLoading} className="gap-1">
            <Save className="w-3 h-3" />
            Save
          </Button>
          <Button onClick={handleCancel} variant="outline" size="sm" disabled={isLoading} className="gap-1">
            <X className="w-3 h-3" />
            Cancel
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Press Enter to save, Escape to cancel</p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <h3 className="text-lg font-semibold flex-1">{displayTitle}</h3>
      <Button onClick={() => setIsEditing(true)} variant="ghost" size="sm" className="gap-1">
        <Edit3 className="w-3 h-3" />
        Edit Title
      </Button>
    </div>
  )
}
