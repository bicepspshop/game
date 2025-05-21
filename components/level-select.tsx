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
    <div className="flex flex-col items-center justify-center p-6 glass-panel rounded-xl shadow-neonglow max-w-md w-full">
      <div className="w-full flex items-center mb-6">
        <button onClick={onBack} className="p-2 glass-btn rounded-full hover:bg-opacity-90 transition-all">
          <ArrowLeftIcon size={24} className="text-[#4DEEEA] hover:text-white transition-colors" />
        </button>
        <h2 className="text-2xl font-title font-bold text-[#4DEEEA] text-glow-blue flex-1 text-center pr-8">Выбор уровня</h2>
      </div>

      {/* Изменяем сетку, чтобы она лучше отображала 50 уровней */}
      {/* Меняем grid-cols-5 на grid-cols-5 sm:grid-cols-10 */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-4 mb-8 w-full max-h-[400px] overflow-y-auto p-3 glass-panel-controls rounded-lg">
        {Array.from({ length: totalLevels }, (_, i) => i + 1).map((level) => {
          const isUnlocked = unlockedLevels.includes(level)

          return (
            <button
              key={level}
              onClick={() => handleLevelSelect(level)}
              className={`w-14 h-14 rounded-lg flex items-center justify-center text-xl font-bold transition-all
                ${
                  isUnlocked
                    ? "bg-gradient-to-br from-[#4DEEEA] to-[#2E1A47] hover:brightness-110 text-white shadow-neonglow"
                    : "bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed"
                }`}
              disabled={!isUnlocked}
            >
              <div className="relative">
                {level}
                <div className="absolute -top-1 -right-1">
                  {isUnlocked ? (
                    <UnlockIcon size={12} className="text-[#39FF14]" />
                  ) : (
                    <LockIcon size={12} className="text-[#FF3864]" />
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => onStartGame(1)}
        className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#4DEEEA] to-[#39FF14] hover:brightness-110 text-white py-3 px-6 rounded-xl font-bold text-lg font-game transition-all play-btn w-full"
      >
        <PlayIcon size={20} />
        Начать игру
      </button>
    </div>
  )
}
