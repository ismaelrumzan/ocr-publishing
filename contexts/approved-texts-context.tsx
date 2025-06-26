"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface ApprovedText {
  id: string
  fileName: string
  text: string
  language: string
  approvedAt: Date
}

interface ApprovedTextsContextType {
  approvedTexts: ApprovedText[]
  addApprovedText: (text: ApprovedText) => void
  removeApprovedText: (id: string) => void
  clearApprovedTexts: () => void
}

const ApprovedTextsContext = createContext<ApprovedTextsContextType | undefined>(undefined)

export function ApprovedTextsProvider({ children }: { children: ReactNode }) {
  const [approvedTexts, setApprovedTexts] = useState<ApprovedText[]>([])

  const addApprovedText = (text: ApprovedText) => {
    setApprovedTexts((prev) => [...prev, text])
  }

  const removeApprovedText = (id: string) => {
    setApprovedTexts((prev) => prev.filter((text) => text.id !== id))
  }

  const clearApprovedTexts = () => {
    setApprovedTexts([])
  }

  return (
    <ApprovedTextsContext.Provider
      value={{
        approvedTexts,
        addApprovedText,
        removeApprovedText,
        clearApprovedTexts,
      }}
    >
      {children}
    </ApprovedTextsContext.Provider>
  )
}

export function useApprovedTexts() {
  const context = useContext(ApprovedTextsContext)
  if (context === undefined) {
    throw new Error("useApprovedTexts must be used within an ApprovedTextsProvider")
  }
  return context
}
