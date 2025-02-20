import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { Toaster } from "@/components/ui/toaster"

import "./globals.css"

export const metadata: Metadata = {
  title: "Learning LangChain Book Chatbot Demo",
  description: "A chatbot demo based on Learning LangChain (O'Reilly)",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={GeistSans.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}



import './globals.css'