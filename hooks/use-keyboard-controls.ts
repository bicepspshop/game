"use client"

import { useEffect } from "react"
import { create } from "zustand"

type KeyboardControlsState = {
  leftInput: number
  rightInput: number
  leftVerticalInput: number
  rightVerticalInput: number
  setLeftInput: (value: number) => void
  setRightInput: (value: number) => void
  setLeftVerticalInput: (value: number) => void
  setRightVerticalInput: (value: number) => void
}

export const useKeyboardControls = create<KeyboardControlsState>((set) => ({
  leftInput: 0,
  rightInput: 0,
  leftVerticalInput: 0,
  rightVerticalInput: 0,
  setLeftInput: (value) => set({ leftInput: value }),
  setRightInput: (value) => set({ rightInput: value }),
  setLeftVerticalInput: (value) => set({ leftVerticalInput: value }),
  setRightVerticalInput: (value) => set({ rightVerticalInput: value }),
}))

export function useSetupKeyboardControls() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        // Left controls - tilt left/right
        case "a":
        case "ArrowLeft":
          useKeyboardControls.getState().setLeftInput(1.0)
          break
        case "d":
        case "ArrowRight":
          useKeyboardControls.getState().setLeftInput(-1.0)
          break

        // Left controls - move up/down
        case "w":
          useKeyboardControls.getState().setLeftVerticalInput(1.0)
          break
        case "s":
          useKeyboardControls.getState().setLeftVerticalInput(-1.0)
          break

        // Right controls - tilt left/right
        case "j":
          useKeyboardControls.getState().setRightInput(-1.0)
          break
        case "l":
        case "ArrowUp":
          useKeyboardControls.getState().setRightInput(1.0)
          break

        // Right controls - move up/down
        case "i":
          useKeyboardControls.getState().setRightVerticalInput(1.0)
          break
        case "k":
          useKeyboardControls.getState().setRightVerticalInput(-1.0)
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        // Left controls - tilt
        case "a":
        case "ArrowLeft":
          if (useKeyboardControls.getState().leftInput === 1.0) {
            useKeyboardControls.getState().setLeftInput(0)
          }
          break
        case "d":
        case "ArrowRight":
          if (useKeyboardControls.getState().leftInput === -1.0) {
            useKeyboardControls.getState().setLeftInput(0)
          }
          break

        // Left controls - vertical
        case "w":
          if (useKeyboardControls.getState().leftVerticalInput === 1.0) {
            useKeyboardControls.getState().setLeftVerticalInput(0)
          }
          break
        case "s":
          if (useKeyboardControls.getState().leftVerticalInput === -1.0) {
            useKeyboardControls.getState().setLeftVerticalInput(0)
          }
          break

        // Right controls - tilt
        case "j":
          if (useKeyboardControls.getState().rightInput === -1.0) {
            useKeyboardControls.getState().setRightInput(0)
          }
          break
        case "l":
        case "ArrowUp":
          if (useKeyboardControls.getState().rightInput === 1.0) {
            useKeyboardControls.getState().setRightInput(0)
          }
          break

        // Right controls - vertical
        case "i":
          if (useKeyboardControls.getState().rightVerticalInput === 1.0) {
            useKeyboardControls.getState().setRightVerticalInput(0)
          }
          break
        case "k":
          if (useKeyboardControls.getState().rightVerticalInput === -1.0) {
            useKeyboardControls.getState().setRightVerticalInput(0)
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  return null
}
