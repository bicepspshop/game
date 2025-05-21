"use client"

import { useState, useEffect } from "react"
import { PlayIcon, ListIcon, TrophyIcon, ArrowUpIcon, FastForwardIcon } from "lucide-react"
import LevelSelect from "./level-select"

interface GameMenuProps {
  onStartGame: (level: number) => void
  onStartEndlessMode: () => void
  highScore: number
  endlessHighScore: number
  unlockedLevels: number[]
}

// Функция для загрузки текущего уровня из localStorage
const loadCurrentLevel = (): number => {
  try {
    const gameProgressStr = localStorage.getItem("gameProgress");
    if (!gameProgressStr) return 1;
    
    const gameProgress = JSON.parse(gameProgressStr);
    return gameProgress.currentLevel || 1;
  } catch (e) {
    console.error("Error loading current level:", e);
    return 1;
  }
};

export default function GameMenu({
  onStartGame,
  onStartEndlessMode,
  highScore,
  endlessHighScore,
  unlockedLevels,
}: GameMenuProps) {
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  
  // Загружаем текущий уровень при монтировании компонента
  useEffect(() => {
    setCurrentLevel(loadCurrentLevel());
  }, []);

  if (showLevelSelect) {
    return (
      <LevelSelect onStartGame={onStartGame} unlockedLevels={unlockedLevels} onBack={() => setShowLevelSelect(false)} />
    )
  }

  // Форматируем метры с одним десятичным знаком
  const formattedEndlessHighScore = endlessHighScore.toFixed(1)

  // Определяем, нужно ли показывать кнопку продолжения игры
  const showContinueButton = currentLevel > 1;

  return (
    <div className="flex flex-col items-center justify-center p-6 glass-panel rounded-xl shadow-neonglow max-w-md w-full">
      <div className="neon-title mb-8 text-center">
        <h1 className="text-4xl font-title text-white mb-2 text-glow-blue">ICE <span className="text-[#F000FF] text-glow-pink">COLD</span> BEER</h1>
        <div className="w-full h-1 bg-gradient-to-r from-[#4DEEEA] via-[#F000FF] to-[#4DEEEA] rounded-full"></div>
        <p className="text-gray-300 mt-4 font-game">Управляй палкой и проведи шарик в светящуюся лунку</p>

        <div className="mt-4 flex flex-col items-center justify-center gap-2">
          {highScore > 0 && (
            <div className="flex items-center justify-center gap-2 text-[#FFD700] text-glow-gold font-numbers">
              <TrophyIcon size={20} />
              <span>Рекорд: {highScore}</span>
            </div>
          )}

          {endlessHighScore > 0 && (
            <div className="flex items-center justify-center gap-2 text-[#4DEEEA] text-glow-blue font-numbers">
              <ArrowUpIcon size={20} />
              <span>Рекорд высоты: {formattedEndlessHighScore}м</span>
            </div>
          )}
          
          {showContinueButton && (
            <div className="flex items-center justify-center gap-2 text-[#39FF14] text-glow-blue font-numbers">
              <FastForwardIcon size={20} />
              <span>Текущий уровень: {currentLevel}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 w-full">
        {showContinueButton && (
          <button
            onClick={() => onStartGame(currentLevel)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#39FF14] to-[#F000FF] hover:brightness-110 text-white py-4 px-6 rounded-xl font-bold text-lg font-game transition-all play-btn w-full"
          >
            <FastForwardIcon size={24} />
            Продолжить игру (Уровень {currentLevel})
          </button>
        )}

        <button
          onClick={() => onStartGame(1)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#4DEEEA] to-[#39FF14] hover:brightness-110 text-white py-4 px-6 rounded-xl font-bold text-lg font-game transition-all play-btn w-full"
        >
          <PlayIcon size={24} />
          {showContinueButton ? "Начать с 1 уровня" : "Начать игру"}
        </button>

        <button
          onClick={() => setShowLevelSelect(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#2E1A47] to-[#4DEEEA] hover:brightness-110 text-white py-4 px-6 rounded-xl font-bold text-lg font-game transition-all menu-btn w-full"
        >
          <ListIcon size={24} />
          Выбор уровня
        </button>

        <button
          onClick={onStartEndlessMode}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#F000FF] to-[#FF3864] hover:brightness-110 text-white py-4 px-6 rounded-xl font-bold text-lg font-game transition-all play-btn w-full"
        >
          <ArrowUpIcon size={24} />
          Бесконечная игра
        </button>
      </div>
    </div>
  )
}
