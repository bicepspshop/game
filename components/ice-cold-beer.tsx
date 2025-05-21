"use client"

import { useEffect, useRef, useState } from "react"
import { useKeyboardControls } from "@/hooks/use-keyboard-controls"
import { useTouchControls } from "@/hooks/use-touch-controls"
import { GameManager } from "@/lib/game-manager"
import Joystick from "@/components/joystick"
import GameMenu from "@/components/game-menu"
import { HomeIcon, RefreshCwIcon as RefreshIcon, ArrowUpIcon } from "lucide-react"

export default function IceColdBeer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<GameManager | null>(null)
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [meters, setMeters] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [showMenu, setShowMenu] = useState(true)
  const [highScore, setHighScore] = useState(0)
  const [endlessHighScore, setEndlessHighScore] = useState(0)
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1])
  const [gameInitialized, setGameInitialized] = useState(false)
  const [restartTrigger, setRestartTrigger] = useState(0)
  const [isEndlessMode, setIsEndlessMode] = useState(false)

  const { leftInput, rightInput, leftVerticalInput, rightVerticalInput } = useKeyboardControls()
  const { leftTouchInput, rightTouchInput, leftTouchVerticalInput, rightTouchVerticalInput } = useTouchControls()

  // Combine keyboard and touch inputs
  const combinedLeftInput = leftInput + leftTouchInput
  const combinedRightInput = rightInput + rightTouchInput
  const combinedLeftVerticalInput = leftVerticalInput + leftTouchVerticalInput
  const combinedRightVerticalInput = rightVerticalInput + rightTouchVerticalInput

  // Load high score and unlocked levels from localStorage
  useEffect(() => {
    const savedHighScore = localStorage.getItem("highScore")
    if (savedHighScore) {
      setHighScore(Number.parseInt(savedHighScore, 10))
    }

    const savedEndlessHighScore = localStorage.getItem("endlessHighScore")
    if (savedEndlessHighScore) {
      setEndlessHighScore(Number.parseInt(savedEndlessHighScore, 10))
    }

    const savedUnlockedLevels = localStorage.getItem("unlockedLevels")
    if (savedUnlockedLevels) {
      try {
        const parsed = JSON.parse(savedUnlockedLevels)
        if (Array.isArray(parsed)) {
          setUnlockedLevels(parsed)
        }
      } catch (e) {
        console.error("Error parsing unlocked levels:", e)
      }
    }
  }, [])

  // Update high score when score changes
  useEffect(() => {
    if (!isEndlessMode && score > highScore) {
      setHighScore(score)
      localStorage.setItem("highScore", score.toString())
    }
  }, [score, highScore, isEndlessMode])

  // Update endless high score when meters changes
  useEffect(() => {
    if (isEndlessMode && meters > endlessHighScore) {
      setEndlessHighScore(meters)
      localStorage.setItem("endlessHighScore", meters.toString())
    }
  }, [meters, endlessHighScore, isEndlessMode])

  // Update unlocked levels when level changes
  useEffect(() => {
    if (level > 1 && !unlockedLevels.includes(level)) {
      const newUnlockedLevels = [...unlockedLevels, level]
      setUnlockedLevels(newUnlockedLevels)
      localStorage.setItem("unlockedLevels", JSON.stringify(newUnlockedLevels))
    }
  }, [level, unlockedLevels])

  // Полностью пересоздаем игру при перезапуске
  useEffect(() => {
    if (restartTrigger > 0 && !showMenu && canvasRef.current) {
      console.log("Reinitializing game after restart...")

      // Уничтожаем текущую игру
      if (gameRef.current) {
        gameRef.current.destroy()
        gameRef.current = null
      }

      // Сбрасываем состояние игры
      setGameInitialized(false)

      // Небольшая задержка перед пересозданием игры
      setTimeout(() => {
        try {
          // Инициализируем игру заново
          const canvas = canvasRef.current
          if (canvas) {
            const game = new GameManager(
              canvas,
              {
                onScoreChange: (newScore) => {
                  console.log(`Score updated: ${newScore}`)
                  setScore(newScore)
                },
                onLevelChange: (newLevel) => {
                  console.log(`Level updated: ${newLevel}`)
                  setLevel(newLevel)
                },
                onMetersChange: (newMeters) => {
                  console.log(`Meters updated: ${newMeters}`)
                  setMeters(newMeters)
                },
                onGameOver: () => {
                  console.log("Game over triggered")
                  setGameOver(true)
                },
              },
              1, // Всегда начинаем с первого уровня при перезапуске
              isEndlessMode,
            )

            gameRef.current = game
            game.start()
            setGameInitialized(true)
            console.log("Game reinitialized successfully")
          }
        } catch (error) {
          console.error("Error reinitializing game:", error)
        }
      }, 100)
    }
  }, [restartTrigger, showMenu, isEndlessMode])

  // Initialize game when canvas is available and showMenu is false
  useEffect(() => {
    // Только инициализируем, если не показываем меню, canvas доступен и это не перезапуск
    if (!showMenu && canvasRef.current && !gameInitialized && restartTrigger === 0) {
      console.log("Initializing game for the first time...")

      // Reset inputs
      useKeyboardControls.setState({
        leftInput: 0,
        rightInput: 0,
        leftVerticalInput: 0,
        rightVerticalInput: 0,
      })
      useTouchControls.setState({
        leftTouchInput: 0,
        rightTouchInput: 0,
        leftTouchVerticalInput: 0,
        rightTouchVerticalInput: 0,
      })

      // Clean up any existing game
      if (gameRef.current) {
        gameRef.current.destroy()
        gameRef.current = null
      }

      try {
        // Initialize the game
        const canvas = canvasRef.current
        const game = new GameManager(
          canvas,
          {
            onScoreChange: (newScore) => {
              console.log(`Score updated: ${newScore}`)
              setScore(newScore)
            },
            onLevelChange: (newLevel) => {
              console.log(`Level updated: ${newLevel}`)
              setLevel(newLevel)
            },
            onMetersChange: (newMeters) => {
              console.log(`Meters updated: ${newMeters}`)
              setMeters(newMeters)
            },
            onGameOver: () => {
              console.log("Game over triggered")
              setGameOver(true)
            },
          },
          level,
          isEndlessMode,
        )

        gameRef.current = game
        game.start()
        setGameInitialized(true)
        console.log("Game initialized successfully")
      } catch (error) {
        console.error("Error initializing game:", error)
      }
    }

    // Clean up when component unmounts or when returning to menu
    return () => {
      if (gameRef.current && showMenu) {
        console.log("Destroying game...")
        gameRef.current.destroy()
        gameRef.current = null
        setGameInitialized(false)
      }
    }
  }, [showMenu, level, gameInitialized, restartTrigger, isEndlessMode])

  // Update game inputs when they change
  useEffect(() => {
    if (!showMenu && gameRef.current && gameInitialized) {
      gameRef.current.setInputs(
        combinedLeftInput,
        combinedRightInput,
        combinedLeftVerticalInput,
        combinedRightVerticalInput,
      )
    }
  }, [
    combinedLeftInput,
    combinedRightInput,
    combinedLeftVerticalInput,
    combinedRightVerticalInput,
    showMenu,
    gameInitialized,
  ])

  const startGame = (startLevel = 1) => {
    console.log("Starting game at level:", startLevel)
    setLevel(startLevel)
    setScore(0)
    setMeters(0)
    setGameOver(false)
    setIsEndlessMode(false)
    setShowMenu(false)
  }

  const startEndlessMode = () => {
    console.log("Starting endless mode")
    setLevel(1)
    setScore(0)
    setMeters(0)
    setGameOver(false)
    setIsEndlessMode(true)
    setShowMenu(false)
  }

  const handleRestart = () => {
    console.log("Restarting game...")
    setScore(0)
    setLevel(1)
    setMeters(0)
    setGameOver(false)

    // Используем триггер для полного пересоздания игры
    setRestartTrigger((prev) => prev + 1)
  }

  const handleBackToMenu = () => {
    console.log("Going back to menu...")
    if (gameRef.current) {
      gameRef.current.destroy()
      gameRef.current = null
      setGameInitialized(false)
    }
    setShowMenu(true)
  }

  const handleLeftJoystickMove = (x: number, y: number) => {
    useTouchControls.setState({
      leftTouchInput: -x, // Invert x for intuitive control
      leftTouchVerticalInput: -y, // Invert y for intuitive control
    })
  }

  const handleRightJoystickMove = (x: number, y: number) => {
    useTouchControls.setState({
      rightTouchInput: -x, // Invert x for intuitive control
      rightTouchVerticalInput: -y, // Invert y for intuitive control
    })
  }

  const handleJoystickEnd = () => {
    useTouchControls.setState({
      leftTouchInput: 0,
      rightTouchInput: 0,
      leftTouchVerticalInput: 0,
      rightTouchVerticalInput: 0,
    })
  }

  if (showMenu) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900">
        <GameMenu
          onStartGame={startGame}
          onStartEndlessMode={startEndlessMode}
          highScore={highScore}
          endlessHighScore={endlessHighScore}
          unlockedLevels={unlockedLevels}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-between w-full max-w-md mb-2">
        {isEndlessMode ? (
          <>
            <div className="text-white flex items-center gap-1">
              <ArrowUpIcon size={16} className="text-blue-400" />
              <span>Высота: {meters}м</span>
            </div>
            <div className="text-white">Рекорд: {endlessHighScore}м</div>
          </>
        ) : (
          <>
            <div className="text-white">Score: {score}</div>
            <div className="text-white">Level: {level}</div>
          </>
        )}
      </div>

      <div className="relative">
        <canvas ref={canvasRef} width={400} height={600} className="border border-gray-700 bg-gray-800 rounded-lg" />

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 rounded-lg">
            <h2 className="text-2xl font-bold text-white mb-4">Game Over</h2>
            {isEndlessMode ? (
              <p className="text-white mb-4">Достигнутая высота: {meters}м</p>
            ) : (
              <p className="text-white mb-4">Final Score: {score}</p>
            )}
            <div className="flex gap-4">
              <button
                onClick={handleRestart}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
              >
                <RefreshIcon size={20} />
                Play Again
              </button>
              <button
                onClick={handleBackToMenu}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              >
                <HomeIcon size={20} />
                Main Menu
              </button>
            </div>
          </div>
        )}

        {!gameOver && (
          <button
            onClick={handleBackToMenu}
            className="absolute top-2 left-2 p-2 bg-gray-700 bg-opacity-70 rounded-full hover:bg-gray-600 transition-colors"
          >
            <HomeIcon size={20} className="text-white" />
          </button>
        )}
      </div>

      {!gameOver && (
        <div className="mt-4 flex justify-between w-full max-w-md">
          <div className="flex flex-col items-center">
            <div className="text-white mb-2">Левый джойстик</div>
            <Joystick
              onMove={handleLeftJoystickMove}
              onEnd={handleJoystickEnd}
              size={100}
              baseColor="#374151"
              stickColor="#6B7280"
            />
          </div>

          <div className="flex flex-col items-center">
            <div className="text-white mb-2">Правый джойстик</div>
            <Joystick
              onMove={handleRightJoystickMove}
              onEnd={handleJoystickEnd}
              size={100}
              baseColor="#374151"
              stickColor="#6B7280"
            />
          </div>
        </div>
      )}

      {!gameOver && (
        <div className="mt-6 text-gray-400 text-sm">
          <p>Управление клавиатурой:</p>
          <p>Левая сторона: A/D для наклона, W/S для движения вверх/вниз</p>
          <p>Правая сторона: J/L для наклона, I/K для движения вверх/вниз</p>
        </div>
      )}
    </div>
  )
}
