"use client"

import { useState } from "react"
import { PlayIcon, ListIcon, TrophyIcon, ArrowUpIcon } from "lucide-react"
import LevelSelect from "./level-select"

interface GameMenuProps {
  onStartGame: (level: number) => void
  onStartEndlessMode: () => void
  highScore: number
  endlessHighScore: number
  unlockedLevels: number[]
}

export default function GameMenu({
  onStartGame,
  onStartEndlessMode,
  highScore,
  endlessHighScore,
  unlockedLevels,
}: GameMenuProps) {
  const [showLevelSelect, setShowLevelSelect] = useState(false)

  if (showLevelSelect) {
    return (
      <LevelSelect onStartGame={onStartGame} unlockedLevels={unlockedLevels} onBack={() => setShowLevelSelect(false)} />
    )
  }

  // Форматируем метры с одним десятичным знаком
  const formattedEndlessHighScore = endlessHighScore.toFixed(1)

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-900 rounded-lg shadow-lg max-w-md w-full">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white mb-2">Ice Cold Beer</h1>
        <p className="text-gray-400">Управляй палкой и проведи шарик в зеленую лунку</p>

        <div className="mt-4 flex flex-col items-center justify-center gap-2">
          {highScore > 0 && (
            <div className="flex items-center justify-center gap-2 text-yellow-400">
              <TrophyIcon size={20} />
              <span>Рекорд: {highScore}</span>
            </div>
          )}

          {endlessHighScore > 0 && (
            <div className="flex items-center justify-center gap-2 text-blue-400">
              <ArrowUpIcon size={20} />
              <span>Рекорд высоты: {formattedEndlessHighScore}м</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 w-full">
        <button
          onClick={() => onStartGame(1)}
          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg font-bold text-lg transition-colors w-full"
        >
          <PlayIcon size={24} />
          Начать игру
        </button>

        <button
          onClick={() => setShowLevelSelect(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg font-bold text-lg transition-colors w-full"
        >
          <ListIcon size={24} />
          Выбор уровня
        </button>

        <button
          onClick={onStartEndlessMode}
          className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-4 px-6 rounded-lg font-bold text-lg transition-colors w-full"
        >
          <ArrowUpIcon size={24} />
          Бесконечная игра
        </button>
      </div>
    </div>
  )
}
