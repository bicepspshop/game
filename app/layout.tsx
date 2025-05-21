import type React from "react"
import "./globals.css"
import { KeyboardControlsSetup } from "@/components/keyboard-controls-setup"

export const metadata = {
  title: "Ice Cold Beer - Arcade Game",
  description: "A physics-based game inspired by the classic arcade game 'Ice Cold Beer'",
  generator: 'v0.dev'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0F1A2A" />
      </head>
      <body>
        <KeyboardControlsSetup />
        {children}
      </body>
    </html>
  )
}
