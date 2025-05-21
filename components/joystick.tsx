"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"

interface JoystickProps {
  size: number
  baseColor: string
  stickColor: string
  onMove: (x: number, y: number) => void
  onEnd: () => void
}

export default function Joystick({ size, baseColor, stickColor, onMove, onEnd }: JoystickProps) {
  const joystickRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const maxDistance = size / 3 // Maximum distance the stick can move from center

  // Handle mouse/touch events
  const handleStart = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return
    setDragging(true)

    const rect = joystickRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    updatePosition(clientX, clientY, centerX, centerY)
  }

  const handleMove = (clientX: number, clientY: number) => {
    if (!dragging || !joystickRef.current) return

    const rect = joystickRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    updatePosition(clientX, clientY, centerX, centerY)
  }

  const handleEnd = () => {
    setDragging(false)
    setPosition({ x: 0, y: 0 })
    onEnd()
  }

  const updatePosition = (clientX: number, clientY: number, centerX: number, centerY: number) => {
    // Calculate distance from center
    let dx = clientX - centerX
    let dy = clientY - centerY

    // Calculate distance
    const distance = Math.sqrt(dx * dx + dy * dy)

    // If distance is greater than maxDistance, normalize
    if (distance > maxDistance) {
      dx = (dx / distance) * maxDistance
      dy = (dy / distance) * maxDistance
    }

    // Update position
    setPosition({ x: dx, y: dy })

    // Calculate normalized values (-1 to 1)
    const normalizedX = dx / maxDistance
    const normalizedY = dy / maxDistance

    // Call onMove with normalized values
    onMove(normalizedX, normalizedY)
  }

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY)
  }

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX, e.clientY)
  }

  const handleMouseUp = () => {
    handleEnd()
  }

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleStart(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  const handleTouchEnd = () => {
    handleEnd()
  }

  // Add and remove event listeners
  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
      window.addEventListener("touchmove", handleTouchMove)
      window.addEventListener("touchend", handleTouchEnd)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleTouchEnd)
    }
  }, [dragging])

  return (
    <div
      ref={joystickRef}
      className="relative rounded-full touch-none select-none joystick-base"
      style={{
        width: size,
        height: size,
        backgroundColor: baseColor,
        boxShadow: "0 0 15px rgba(77, 238, 234, 0.3), inset 0 0 8px rgba(77, 238, 234, 0.2)",
        border: "1px solid rgba(77, 238, 234, 0.5)"
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div
        className="absolute rounded-full joystick-stick"
        style={{
          width: size / 2,
          height: size / 2,
          backgroundColor: stickColor,
          left: `calc(50% - ${size / 4}px + ${position.x}px)`,
          top: `calc(50% - ${size / 4}px + ${position.y}px)`,
          transition: dragging ? "none" : "all 0.2s ease-out",
          boxShadow: dragging 
            ? "0 0 20px rgba(240, 0, 255, 0.6), inset 0 0 10px rgba(240, 0, 255, 0.4)"
            : "0 0 10px rgba(77, 238, 234, 0.4), inset 0 0 5px rgba(77, 238, 234, 0.3)",
          border: dragging 
            ? "1px solid rgba(240, 0, 255, 0.7)"
            : "1px solid rgba(77, 238, 234, 0.6)"
        }}
      />
    </div>
  )
}
