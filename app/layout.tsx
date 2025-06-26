import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Noto_Sans_Arabic } from "next/font/google"
import "./globals.css"
import { ApprovedTextsProvider } from "@/contexts/approved-texts-context"

const inter = Inter({ subsets: ["latin"] })
const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
})

export const metadata: Metadata = {
  title: "OCR Scanner & Project Manager",
  description: "Multilingual OCR processing with project management and translation workflows",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${notoSansArabic.variable}`}>
        <ApprovedTextsProvider>{children}</ApprovedTextsProvider>
      </body>
    </html>
  )
}
