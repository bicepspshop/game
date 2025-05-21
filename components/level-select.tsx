"use client"

import { LockIcon, UnlockIcon, PlayIcon, ArrowLeftIcon } from "lucide-react"

interface LevelSelectProps {
  onStartGame: (level: number) => void
  onBack: () => void
  unlockedLevels: number[]
}

export default function LevelSelect({ onStartGame, onBack, unlockedLevels }: LevelSelectProps) {
  // Изменяем количество уровней с 10 до 50
  const totalLevels = 50

  const handleLevelSelect = (level: number) => {
    if (unlockedLevels.includes(level)) {
      onStartGame(level)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-900 rounded-lg shadow-lg max-w-md w-full">
      <div className="w-full flex items-center mb-6">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-800 transition-colors">
          <ArrowLeftIcon size={24} className="text-white" />
        </button>
        <h2 className="text-2xl font-bold text-white flex-1 text-center pr-8">Выбор уровня</h2>
      </div>

      {/* Изменяем сетку, чтобы она лучше отображала 50 уровней */}
      {/* Меняем grid-cols-5 на grid-cols-5 sm:grid-cols-10 */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-4 mb-8 w-full max-h-[400px] overflow-y-auto p-2">
        {Array.from({ length: totalLevels }, (_, i) => i + 1).map((level) => {
          const isUnlocked = unlockedLevels.includes(level)

          return (
            <button
              key={level}
              onClick={() => handleLevelSelect(level)}
              className={`w-14 h-14 rounded-lg flex items-center justify-center text-xl font-bold transition-all
                ${
                  isUnlocked
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              disabled={!isUnlocked}
            >
              <div className="relative">
                {level}
                <div className="absolute -top-1 -right-1">
                  {isUnlocked ? (
                    <UnlockIcon size={12} className="text-green-400" />
                  ) : (
                    <LockIcon size={12} className="text-red-400" />
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => onStartGame(1)}
        className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-bold text-lg transition-colors w-full"
      >
        <PlayIcon size={20} />
        Начать игру
      </button>
    </div>
  )
}
