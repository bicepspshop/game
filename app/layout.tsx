import type React from "react"
import "./globals.css"
import { KeyboardControlsSetup } from "@/components/keyboard-controls-setup"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <KeyboardControlsSetup />
        {children}
      </body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.dev'
    };
