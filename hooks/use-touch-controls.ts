"use client"

import { create } from "zustand"

type TouchControlsState = {
  leftTouchInput: number
  rightTouchInput: number
  leftTouchVerticalInput: number
  rightTouchVerticalInput: number
}

export const useTouchControls = create<TouchControlsState>(() => ({
  leftTouchInput: 0,
  rightTouchInput: 0,
  leftTouchVerticalInput: 0,
  rightTouchVerticalInput: 0,
}))
