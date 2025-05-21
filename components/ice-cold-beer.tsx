"use client"

import { useEffect, useRef, useState } from "react"
import { useKeyboardControls } from "@/hooks/use-keyboard-controls"
import { useTouchControls } from "@/hooks/use-touch-controls"
import { GameManager } from "@/lib/game-manager"
import Joystick from "@/components/joystick"
import GameMenu from "@/components/game-menu"
import { HomeIcon, RefreshCwIcon as RefreshIcon, ArrowUpIcon } from "lucide-react"

// Интерфейс для прогресса игры
interface GameProgress {
  currentLevel: number;
  maxUnlocked: number[];
  highScore: number;
  endlessHighScore: number;
}

// Ключ для хранения прогресса игры в localStorage
const GAME_PROGRESS_KEY = "gameProgress";
const GAME_VERSION_KEY = "gameVersion";
const CURRENT_GAME_VERSION = "1.0";

// Вспомогательные функции для работы с прогрессом
const getDefaultProgress = (): GameProgress => ({
  currentLevel: 1,
  maxUnlocked: [1],
  highScore: 0,
  endlessHighScore: 0
});

const loadGameProgress = (): GameProgress => {
  try {
    // Проверяем версию игры для возможной миграции данных
    const savedVersion = localStorage.getItem(GAME_VERSION_KEY);
    if (savedVersion !== CURRENT_GAME_VERSION) {
      // Если версии не совпадают, обновляем версию
      localStorage.setItem(GAME_VERSION_KEY, CURRENT_GAME_VERSION);
      // При необходимости здесь можно добавить миграцию данных
    }

    const savedData = localStorage.getItem(GAME_PROGRESS_KEY);
    if (!savedData) return getDefaultProgress();
    
    const parsed = JSON.parse(savedData) as GameProgress;
    
    // Проверка корректности данных
    if (typeof parsed.currentLevel !== 'number' || 
        !Array.isArray(parsed.maxUnlocked) ||
        typeof parsed.highScore !== 'number' ||
        typeof parsed.endlessHighScore !== 'number') {
      console.warn("Corrupted game progress data, using defaults");
      return getDefaultProgress();
    }
    
    return parsed;
  } catch (e) {
    console.error("Error loading game progress:", e);
    return getDefaultProgress();
  }
};

const saveGameProgress = (progress: GameProgress): void => {
  try {
    localStorage.setItem(GAME_PROGRESS_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error("Error saving game progress:", e);
  }
};

// Функция для проверки URL-параметров (для режима разработчика)
const getUrlParams = () => {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  return {
    levelParam: params.get('level') ? parseInt(params.get('level') as string, 10) : null,
    noCache: params.get('nocache') === 'true'
  };
};

export default function IceColdBeer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<GameManager | null>(null)
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lives, setLives] = useState(3)
  const [meters, setMeters] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [showMenu, setShowMenu] = useState(true)
  const [highScore, setHighScore] = useState(0)
  const [endlessHighScore, setEndlessHighScore] = useState(0)
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1])
  const [gameInitialized, setGameInitialized] = useState(false)
  const [restartTrigger, setRestartTrigger] = useState(0)
  const [isEndlessMode, setIsEndlessMode] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  // Сохраняем последний уровень при Game Over для использования при перезапуске
  const [lastPlayedLevel, setLastPlayedLevel] = useState(1)

  const { leftInput, rightInput, leftVerticalInput, rightVerticalInput } = useKeyboardControls()
  const { leftTouchInput, rightTouchInput, leftTouchVerticalInput, rightTouchVerticalInput } = useTouchControls()

  // Combine keyboard and touch inputs
  const combinedLeftInput = leftInput + leftTouchInput
  const combinedRightInput = rightInput + rightTouchInput
  const combinedLeftVerticalInput = leftVerticalInput + leftTouchVerticalInput
  const combinedRightVerticalInput = rightVerticalInput + rightTouchVerticalInput

  // Load game progress from localStorage
  useEffect(() => {
    const { levelParam, noCache } = getUrlParams();
    
    // Используем URL-параметры для отладки, если они есть
    if (levelParam && !noCache) {
      setLevel(levelParam);
      setLastPlayedLevel(levelParam);
    }
    
    // Если указан параметр nocache, не загружаем сохраненный прогресс
    if (noCache) return;
    
    // Загружаем сохраненный прогресс
    const progress = loadGameProgress();
    
    setLevel(progress.currentLevel);
    setLastPlayedLevel(progress.currentLevel);
    setUnlockedLevels(progress.maxUnlocked);
    setHighScore(progress.highScore);
    setEndlessHighScore(progress.endlessHighScore);
    
  }, []);

  // Update high score when score changes
  useEffect(() => {
    if (!isEndlessMode && score > highScore) {
      setHighScore(score);
      
      // Обновляем сохраненный прогресс
      const progress = loadGameProgress();
      progress.highScore = score;
      saveGameProgress(progress);
    }
  }, [score, highScore, isEndlessMode]);

  // Update endless high score when meters changes
  useEffect(() => {
    if (isEndlessMode && meters > endlessHighScore) {
      setEndlessHighScore(meters);
      
      // Обновляем сохраненный прогресс
      const progress = loadGameProgress();
      progress.endlessHighScore = meters;
      saveGameProgress(progress);
    }
  }, [meters, endlessHighScore, isEndlessMode]);

  // Update unlocked levels and current level when level changes
  useEffect(() => {
    if (level > 1 && !unlockedLevels.includes(level)) {
      const newUnlockedLevels = [...unlockedLevels, level];
      setUnlockedLevels(newUnlockedLevels);
      
      // Обновляем сохраненный прогресс
      const progress = loadGameProgress();
      progress.maxUnlocked = newUnlockedLevels;
      progress.currentLevel = level;
      saveGameProgress(progress);
    } else if (level !== 1) {
      // Если уровень изменился, но он уже разблокирован, 
      // всё равно обновляем текущий уровень в прогрессе
      const progress = loadGameProgress();
      progress.currentLevel = level;
      saveGameProgress(progress);
    }
    
    // Обновляем lastPlayedLevel при изменении уровня
    setLastPlayedLevel(level);
  }, [level, unlockedLevels]);

  // Обработчик события Game Over
  useEffect(() => {
    if (gameOver && !isEndlessMode) {
      // Сохраняем последний уровень при Game Over
      setLastPlayedLevel(level);
    }
  }, [gameOver, level, isEndlessMode]);

  // Полностью пересоздаем игру при перезапуске
  useEffect(() => {
    if (restartTrigger > 0 && !showMenu && canvasRef.current) {
      console.log("Reinitializing game after restart...");
      console.log("Restarting at level:", lastPlayedLevel);

      // Уничтожаем текущую игру
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }

      // Сбрасываем состояние игры
      setGameInitialized(false);

      // Небольшая задержка перед пересозданием игры
      setTimeout(() => {
        try {
          // Инициализируем игру заново c текущим уровнем, а не с первого
          const canvas = canvasRef.current;
          if (canvas) {
            const game = new GameManager(
              canvas,
              {
                onScoreChange: (newScore) => {
                  console.log(`Score updated: ${newScore}`);
                  setScore(newScore);
                },
                onLevelChange: (newLevel) => {
                  console.log(`Level updated: ${newLevel}`);
                  setLevel(newLevel);
                },
                onMetersChange: (newMeters) => {
                  console.log(`Meters updated: ${newMeters}`);
                  setMeters(newMeters);
                },
                onGameOver: () => {
                  console.log("Game over triggered");
                  setGameOver(true);
                },
              },
              lastPlayedLevel, // Используем сохраненный уровень вместо фиксированного 1
              isEndlessMode,
              debugMode, // Передаем режим отладки
            );

            gameRef.current = game;
            game.start();
            setGameInitialized(true);
            console.log("Game reinitialized successfully at level:", lastPlayedLevel);
          }
        } catch (error) {
          console.error("Error reinitializing game:", error);
        }
      }, 100);
    }
  }, [restartTrigger, showMenu, isEndlessMode, lastPlayedLevel]);

  // Initialize game when canvas is available and showMenu is false
  useEffect(() => {
    // Только инициализируем, если не показываем меню, canvas доступен и это не перезапуск
    console.log('useEffect triggered, showMenu:', showMenu, 'canvas:', !!canvasRef.current, 'initialized:', gameInitialized);
    if (!showMenu && canvasRef.current && !gameInitialized && restartTrigger === 0) {
      console.log("Initializing game for the first time...");
      console.log("Starting at level:", level);

      // Reset inputs
      useKeyboardControls.setState({
        leftInput: 0,
        rightInput: 0,
        leftVerticalInput: 0,
        rightVerticalInput: 0,
      });
      useTouchControls.setState({
        leftTouchInput: 0,
        rightTouchInput: 0,
        leftTouchVerticalInput: 0,
        rightTouchVerticalInput: 0,
      });

      // Clean up any existing game
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }

      try {
        // Initialize the game
        const canvas = canvasRef.current;
        console.log('Initializing canvas with dimensions:', canvas.width, 'x', canvas.height);
        
        // Убедимся, что canvas имеет правильные размеры
        if (canvas.width === 0 || canvas.height === 0) {
          console.log('Fixing canvas dimensions');
          canvas.width = 400;
          canvas.height = 711;
        }
        
        // Отображаем сообщение о загрузке
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = "#0F1A2A";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.font = '18px Arial';
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.fillText('Загрузка игры...', canvas.width / 2, canvas.height / 2);
        } else {
          console.error('Failed to get 2D context before game initialization');
        }
        
        // Создаем обработчики событий для управления игрой
        const gameCallbacks = {
          onScoreChange: (newScore: number) => {
            console.log(`Score updated: ${newScore}`);
            setScore(newScore);
          },
          onLevelChange: (newLevel: number) => {
            console.log(`Level updated: ${newLevel}`);
            setLevel(newLevel);
          },
          onMetersChange: (newMeters: number) => {
            console.log(`Meters updated: ${newMeters}`);
            setMeters(newMeters);
          },
          onGameOver: () => {
            console.log("Game over triggered");
            setGameOver(true);
          }
        };
        
        // Инициализируем менеджер игры
        const game = new GameManager(
          canvas,
          gameCallbacks,
          level,
          isEndlessMode,
          debugMode // Передаем режим отладки
        );

        gameRef.current = game;
        
        // Даем небольшую задержку перед запуском
        setTimeout(() => {
          // Запускаем игру
          game.start();
          setGameInitialized(true);
          console.log("Game initialized successfully");
        }, 50);
      } catch (error) {
        console.error("Error initializing game:", error);
        
        // Отображаем сообщение об ошибке на canvas
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.fillStyle = "#0F1A2A";
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.font = '18px Arial';
            ctx.fillStyle = '#FF3864';
            ctx.textAlign = 'center';
            ctx.fillText('Ошибка запуска игры', canvasRef.current.width / 2, canvasRef.current.height / 2);
            ctx.fillText('Попробуйте перезагрузить страницу', canvasRef.current.width / 2, canvasRef.current.height / 2 + 30);
          }
        }
        
        // Возвращаемся в меню через 3 секунды
        setTimeout(() => {
          setShowMenu(true);
        }, 3000);
      }
    }

    // Clean up when component unmounts or when returning to menu
    return () => {
      if (gameRef.current && showMenu) {
        console.log("Destroying game...");
        gameRef.current.destroy();
        gameRef.current = null;
        setGameInitialized(false);
      }
    };
  }, [showMenu, level, gameInitialized, restartTrigger, isEndlessMode]);

  // Update game inputs when they change
  useEffect(() => {
    if (!showMenu && gameRef.current && gameInitialized) {
      gameRef.current.setInputs(
        combinedLeftInput,
        combinedRightInput,
        combinedLeftVerticalInput,
        combinedRightVerticalInput,
      );
    }
  }, [
    combinedLeftInput,
    combinedRightInput,
    combinedLeftVerticalInput,
    combinedRightVerticalInput,
    showMenu,
    gameInitialized,
  ]);

  const startGame = (startLevel = 1) => {
    console.log("Starting game at level:", startLevel);
    
    // Сначала уничтожим существующую игру, если она есть
    if (gameRef.current) {
      gameRef.current.destroy();
      gameRef.current = null;
    }
    
    // Сбрасываем состояние игры
    setLevel(startLevel);
    setLastPlayedLevel(startLevel); // Обновляем последний уровень
    setScore(0);
    setMeters(0);
    setGameOver(false);
    setGameInitialized(false);
    
    try {
      // Убедимся, что мы не в бесконечном режиме
      setIsEndlessMode(false);
      
      // Обновляем текущий уровень в сохраненном прогрессе
      const progress = loadGameProgress();
      progress.currentLevel = startLevel;
      saveGameProgress(progress);
      
      // Подготавливаем canvas заранее
      if (canvasRef.current) {
        console.log("Preparing canvas before game start...");
        // Убедимся, что canvas имеет корректные размеры
        canvasRef.current.width = 400;
        canvasRef.current.height = 711;
        
        // Очищаем canvas
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.fillStyle = "#0F1A2A";
          ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          ctx.font = '18px Arial';
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.fillText('Загрузка игры...', canvasRef.current.width / 2, canvasRef.current.height / 2);
        }
      }
      
      // Даем React время обновить состояние, затем показываем игровой экран
      setTimeout(() => {
        setShowMenu(false);
      }, 100);
    } catch (error) {
      console.error("Error starting game:", error);
      // В случае ошибки остаемся в меню
    }
  };

  const startEndlessMode = () => {
    console.log("Starting endless mode");
    
    // Сначала уничтожим существующую игру, если она есть
    if (gameRef.current) {
      gameRef.current.destroy();
      gameRef.current = null;
    }
    
    // Сбрасываем состояние игры
    setLevel(1);
    setLastPlayedLevel(1);
    setScore(0);
    setMeters(0);
    setGameOver(false);
    setGameInitialized(false);
    
    try {
      // Сначала включаем флаг бесконечного режима
      setIsEndlessMode(true);
      
      // Даем React время обновить состояние, затем показываем игровой экран
      setTimeout(() => {
        setShowMenu(false);
      }, 100);
    } catch (error) {
      console.error("Error starting endless mode:", error);
      // В случае ошибки остаемся в меню
      setIsEndlessMode(false);
    }
  };

  const handleRestart = () => {
    console.log("Restarting game...");
    console.log("Last played level:", lastPlayedLevel);
    
    try {
      // Уничтожаем текущую игру
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
      
      // Сбрасываем состояния игры, но сохраняем текущий уровень
      setScore(0);
      setMeters(0);
      setGameOver(false);
      setGameInitialized(false);

      // Сохраняем тот же уровень, на котором игрок проиграл
      // (lastPlayedLevel уже установлен в обработчике gameOver)
      
      // Используем триггер для полного пересоздания игры
      setRestartTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error restarting game:", error);
      // В случае ошибки вернемся в меню
      setShowMenu(true);
    }
  };

  const handleBackToMenu = () => {
    console.log("Going back to menu...");
    try {
      // Явно уничтожаем игру перед возвратом в меню
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
      
      // Очищаем все состояния, которые могут содержать ссылки на объекты
      setGameInitialized(false);
      setGameOver(false);
      
      // Очищаем canvas, чтобы не оставался серый экран
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          // Заполняем темным цветом
          ctx.fillStyle = "#0F1A2A";
          ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
      
      // Сбрасываем ввод управления
      useKeyboardControls.setState({
        leftInput: 0,
        rightInput: 0,
        leftVerticalInput: 0,
        rightVerticalInput: 0,
      });
      
      useTouchControls.setState({
        leftTouchInput: 0,
        rightTouchInput: 0,
        leftTouchVerticalInput: 0,
        rightTouchVerticalInput: 0,
      });
      
      // Может помочь сборщику мусора освободить память
      setTimeout(() => {
        // Отложенное обновление интерфейса
        setShowMenu(true);
        
        // Вызываем сборщик мусора, если он доступен
        if (typeof window !== 'undefined' && window.gc) {
          try {
            window.gc();
          } catch (e) {
            console.log('GC not available');
          }
        }
      }, 100);
    } catch (error) {
      console.error("Error while going back to menu:", error);
      // В случае ошибки всё равно возвращаемся в меню
      setShowMenu(true);
    }
  };

  const handleLeftJoystickMove = (x: number, y: number) => {
    useTouchControls.setState({
      leftTouchInput: -x, // Invert x for intuitive control
      leftTouchVerticalInput: -y, // Invert y for intuitive control
    });
  };

  const handleRightJoystickMove = (x: number, y: number) => {
    useTouchControls.setState({
      rightTouchInput: -x, // Invert x for intuitive control
      rightTouchVerticalInput: -y, // Invert y for intuitive control
    });
  };

  const handleJoystickEnd = () => {
    useTouchControls.setState({
      leftTouchInput: 0,
      rightTouchInput: 0,
      leftTouchVerticalInput: 0,
      rightTouchVerticalInput: 0,
    });
  };

  // Добавим функцию для очистки кэша (для режима разработчика)
  const clearProgressCache = () => {
    try {
      localStorage.removeItem(GAME_PROGRESS_KEY);
      localStorage.removeItem(GAME_VERSION_KEY);
      window.location.reload();
    } catch (e) {
      console.error("Error clearing game progress:", e);
    }
  };

  if (showMenu) {
    // Проверяем URL-параметры для режима разработчика
    const { noCache } = getUrlParams();
    
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900">
        <GameMenu
          onStartGame={startGame}
          onStartEndlessMode={startEndlessMode}
          highScore={highScore}
          endlessHighScore={endlessHighScore}
          unlockedLevels={unlockedLevels}
        />
        
        {/* Добавляем скрытую кнопку для разработчиков, если указан параметр nocache */}
        {noCache && (
          <>
            <button 
              onClick={clearProgressCache}
              className="mt-4 text-xs text-gray-500 hover:text-gray-400"
            >
              Clear Cache (Dev Mode)
            </button>
            <button 
              onClick={() => setDebugMode(!debugMode)}
              className="mt-2 text-xs text-gray-500 hover:text-gray-400"
            >
              {debugMode ? "Disable Debug Mode" : "Enable Debug Mode"}
            </button>
          </>
        )}
      </div>
    );
  }

  // Форматируем метры с одним десятичным знаком
  const formattedMeters = meters.toFixed(1);
  const formattedHighScore = endlessHighScore.toFixed(1);

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-between w-full max-w-md mb-2 px-4 py-3 glass-panel rounded-xl">
        {isEndlessMode ? (
          <>
            <div className="text-white flex items-center gap-1 font-game">
              <ArrowUpIcon size={18} className="text-[#4DEEEA]" />
              <span className="text-glow-blue">Высота: {formattedMeters}м</span>
            </div>
            <div className="text-white font-game text-glow-blue">Рекорд: {formattedHighScore}м</div>
          </>
        ) : (
          <>
            <div className="flex items-center">
              <div className="text-white font-game text-glow-blue mr-5">Score: <span className="text-[#F000FF]">{score}</span></div>
              <div className="text-white font-game text-glow-blue">Lives: {lives}</div>
            </div>
            <div className="text-white font-game text-glow-pink">Level: {level}</div>
          </>
        )}
      </div>

      <div className="relative game-container">
        {/* Устанавливаем фиксированные размеры и стили для обеспечения правильного отображения */}
        <canvas 
          ref={canvasRef} 
          width={400} 
          height={711} 
          className="border-0 bg-[#0F1A2A] rounded-2xl shadow-neonglow overflow-hidden" 
          style={{ width: '400px', height: '711px', display: 'block' }}
          onClick={(e) => {
            if (gameRef.current === null || !canvasRef.current) {
              // Если игра не инициализирована, отображаем отладочную информацию
              const ctx = canvasRef.current?.getContext('2d');
              if (ctx) {
                // Отображаем сообщение о диагностике
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(50, 50, 300, 200);
                ctx.font = '16px Arial';
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'center';
                ctx.fillText('Диагностика canvas', 200, 80);
                
                // Показываем размеры и состояние
                const dimensions = {
                  width: canvasRef.current.width,
                  height: canvasRef.current.height,
                  clientWidth: canvasRef.current.clientWidth,
                  clientHeight: canvasRef.current.clientHeight,
                  hasContext: !!ctx
                };
                
                ctx.fillText(`Размеры: ${dimensions.width}x${dimensions.height}`, 200, 110);
                ctx.fillText(`Клиентские: ${dimensions.clientWidth}x${dimensions.clientHeight}`, 200, 140);
                ctx.fillText('Нажмите для перезапуска игры', 200, 170);
                
                // Логируем информацию для отладки
                console.log('Canvas debug info:', dimensions);
                
                // Пытаемся перезапустить игру
                setTimeout(() => {
                  handleRestart();
                }, 500);
              }
            }
          }}
        />

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm rounded-2xl">
            <h2 className="text-3xl font-game font-bold text-[#F000FF] text-glow-pink mb-4">Game Over</h2>
            {isEndlessMode ? (
              <p className="text-white mb-4">Достигнутая высота: {formattedMeters}м</p>
            ) : (
              <p className="text-white mb-4">Final Score: {score}</p>
            )}
            <div className="flex gap-4">
              <button
                onClick={handleRestart}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF3864] to-[#F000FF] text-white font-game rounded-xl hover:brightness-110 transition-all focus:outline-none focus:ring-2 focus:ring-[#F000FF] focus:ring-opacity-50 play-btn"
              >
                <RefreshIcon size={20} />
                Play Again
              </button>
              <button
                onClick={handleBackToMenu}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#4DEEEA] to-[#2E1A47] text-white font-game rounded-xl hover:brightness-110 transition-all focus:outline-none focus:ring-2 focus:ring-[#4DEEEA] focus:ring-opacity-50 menu-btn"
              >
                <HomeIcon size={20} />
                Main Menu
              </button>
            </div>
          </div>
        )}

        {!gameOver && (
          <>
            <button
              onClick={handleBackToMenu}
              className="absolute top-2 left-2 p-2 glass-btn rounded-full hover:bg-opacity-90 transition-all"
            >
              <HomeIcon size={20} className="text-[#4DEEEA] hover:text-white transition-colors" />
            </button>
            
            {debugMode && (
              <div className="absolute top-12 left-2 p-2 glass-btn rounded-md bg-opacity-40 text-[#F000FF] text-sm">
                Debug Mode
              </div>
            )}
          </>
        )}
      </div>

      {!gameOver && (
        <div className="mt-4 flex justify-between w-full max-w-md glass-panel-controls rounded-xl p-4">
          <div className="flex flex-col items-center">
            <div className="text-[#4DEEEA] font-game text-sm mb-2 text-glow-blue">Левый джойстик</div>
            <Joystick
              onMove={handleLeftJoystickMove}
              onEnd={handleJoystickEnd}
              size={100}
              baseColor="#374151"
              stickColor="#6B7280"
            />
          </div>

          <div className="flex flex-col items-center">
            <div className="text-[#4DEEEA] font-game text-sm mb-2 text-glow-blue">Правый джойстик</div>
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
        <div className="mt-6 text-gray-400 text-sm font-game glass-panel-hint p-3 rounded-lg">
          <p>Управление клавиатурой:</p>
          <p>Левая сторона: A/D для наклона, W/S для движения вверх/вниз</p>
          <p>Правая сторона: J/L для наклона, I/K для движения вверх/вниз</p>
        </div>
      )}
    </div>
  )
}
