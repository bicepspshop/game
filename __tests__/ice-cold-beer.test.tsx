/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import IceColdBeer from '../components/ice-cold-beer';

// Мокаем GameManager, который используется в IceColdBeer
jest.mock('../lib/game-manager', () => {
  return {
    GameManager: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn(),
        destroy: jest.fn(),
        setInputs: jest.fn(),
      };
    }),
  };
});

// Мокаем localStorage
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: function(key: string) {
      return store[key] || null;
    },
    setItem: function(key: string, value: string) {
      store[key] = value;
    },
    removeItem: function(key: string) {
      delete store[key];
    },
    clear: function() {
      store = {};
    },
    length: 0,
    key: function(i: number) { return Object.keys(store)[i] || null; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Мокаем requestAnimationFrame
window.requestAnimationFrame = jest.fn().mockImplementation(callback => {
  return setTimeout(callback, 0);
});

// Мокаем setTimeout
jest.useFakeTimers();

describe('IceColdBeer Component - Game Over and Restart Tests', () => {
  beforeEach(() => {
    // Очищаем localStorage перед каждым тестом
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test('Should restart game at the same level after game over', async () => {
    // Устанавливаем начальное состояние прогресса игры в localStorage
    const initialProgress = {
      currentLevel: 5,
      maxUnlocked: [1, 2, 3, 4, 5],
      highScore: 1000,
      endlessHighScore: 10.5
    };
    localStorageMock.setItem('gameProgress', JSON.stringify(initialProgress));
    localStorageMock.setItem('gameVersion', '1.0');

    // Рендерим компонент
    render(<IceColdBeer />);

    // Проверяем, что меню отображается с опцией "Продолжить игру"
    expect(screen.getByText(/Продолжить игру/i)).toBeInTheDocument();
    expect(screen.getByText(/Уровень 5/i)).toBeInTheDocument();

    // Кликаем на кнопку "Продолжить игру"
    fireEvent.click(screen.getByText(/Продолжить игру/i));
    
    // Ждем пока setTimeout в startGame выполнится
    act(() => {
      jest.runAllTimers();
    });

    // Симулируем событие Game Over
    const { GameManager } = require('../lib/game-manager');
    const mockGameManagerInstance = GameManager.mock.results[0].value;
    const mockOnGameOver = GameManager.mock.calls[0][1].onGameOver;
    
    mockOnGameOver(); // Вызываем callback onGameOver
    
    // Проверяем, что отображается экран Game Over
    expect(screen.getByText(/Game Over/i)).toBeInTheDocument();
    
    // Нажимаем на кнопку "Play Again"
    fireEvent.click(screen.getByText(/Play Again/i));
    
    // Проверяем, что для новой игры используется тот же уровень 5
    act(() => {
      jest.runAllTimers();
    });
    
    const calls = GameManager.mock.calls;
    // Первый вызов при старте игры на уровне 5, второй при перезапуске
    expect(calls.length).toBe(2);
    expect(calls[0][2]).toBe(5); // Первый запуск на уровне 5
    expect(calls[1][2]).toBe(5); // Перезапуск на том же уровне 5
  });

  test('Should preserve unlocked levels when restarting the game', async () => {
    // Устанавливаем начальное состояние прогресса игры в localStorage
    const initialProgress = {
      currentLevel: 3,
      maxUnlocked: [1, 2, 3],
      highScore: 500,
      endlessHighScore: 5.0
    };
    localStorageMock.setItem('gameProgress', JSON.stringify(initialProgress));
    
    // Рендерим компонент
    render(<IceColdBeer />);
    
    // Кликаем на кнопку "Выбор уровня"
    fireEvent.click(screen.getByText(/Выбор уровня/i));
    
    // Проверяем, что уровни 1, 2 и 3 разблокированы
    // Для этого нам потребуется проверить наличие этих уровней в меню выбора уровня
    // (Это может потребовать дополнительной настройки тестов в зависимости от реализации LevelSelect)
    
    // Возвращаемся в главное меню
    fireEvent.click(screen.getByText(/Назад/i));
    
    // Продолжаем игру с уровня 3
    fireEvent.click(screen.getByText(/Продолжить игру/i));
    
    act(() => {
      jest.runAllTimers();
    });
    
    // Симулируем событие Game Over
    const { GameManager } = require('../lib/game-manager');
    const mockOnGameOver = GameManager.mock.calls[0][1].onGameOver;
    mockOnGameOver();
    
    // Нажимаем на кнопку "Play Again"
    fireEvent.click(screen.getByText(/Play Again/i));
    
    act(() => {
      jest.runAllTimers();
    });
    
    // Теперь проверяем, что прогресс в localStorage не был сброшен
    const savedProgress = JSON.parse(localStorageMock.getItem('gameProgress') || '{}');
    expect(savedProgress.currentLevel).toBe(3); // Уровень сохранился
    expect(savedProgress.maxUnlocked).toContain(3); // Разблокированные уровни сохранились
  });

  // Добавляем тест для URL-параметров режима разработчика
  test('Should handle developer mode URL parameters', () => {
    // Мокаем window.location.search для имитации URL-параметров
    Object.defineProperty(window, 'location', {
      value: {
        search: '?level=7&nocache=true'
      }
    });
    
    // Рендерим компонент
    render(<IceColdBeer />);
    
    // Проверяем, что кнопка очистки кэша отображается в режиме разработчика
    const clearCacheButton = screen.getByText(/Clear Cache/i);
    expect(clearCacheButton).toBeInTheDocument();
    
    // Нажимаем кнопку и проверяем, что localStorage очищается
    fireEvent.click(clearCacheButton);
    
    // Проверяем, что после нажатия кнопки localStorage был очищен
    expect(localStorageMock.getItem('gameProgress')).toBeNull();
    expect(localStorageMock.getItem('gameVersion')).toBeNull();
  });
});
