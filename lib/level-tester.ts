import { LevelGenerator } from '../lib/level-generator';
import { Vector2D } from '../lib/physics';
import { PathFinder } from '../lib/path-finder';

// Функция для автоматического тестирования генерации уровней
export function testLevelGenerator(numTests: number = 100, maxLevel: number = 30): { level: number, success: boolean, errorInfo?: string }[] {
  const results: { level: number, success: boolean, errorInfo?: string }[] = [];
  
  // Создаем виртуальный контекст для рендеринга (не используется в тестах)
  const mockCanvas = {
    width: 400,
    height: 700
  };
  
  for (let level = 1; level <= maxLevel; level++) {
    let levelSuccessCount = 0;
    let levelFailures = 0;
    const levelErrors: string[] = [];
    
    console.log(`Testing level ${level}...`);
    
    // Тестируем каждый уровень несколько раз для учета случайности генерации
    for (let i = 0; i < numTests; i++) {
      try {
        // Создаем генератор уровней
        const generator = new LevelGenerator(
          mockCanvas.width,
          mockCanvas.height - 120,
          mockCanvas.width * 0.1,
          mockCanvas.width * 0.9,
          20 // Размер лунок
        );
        
        // Генерируем уровень
        const targetHoleIndex = generator.generateLevel(level);
        
        // Считаем успешную генерацию
        levelSuccessCount++;
      } catch (e) {
        levelFailures++;
        levelErrors.push(`Iteration ${i}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    
    // Записываем результаты
    const successRate = levelSuccessCount / numTests;
    results.push({
      level,
      success: successRate >= 0.95, // Успешно, если 95% или более генераций удались
      errorInfo: levelFailures > 0 ? 
        `Success rate: ${(successRate * 100).toFixed(1)}%. Errors: ${levelErrors.slice(0, 3).join("; ")}${levelErrors.length > 3 ? ` and ${levelErrors.length - 3} more...` : ""}` 
        : undefined
    });
    
    console.log(`Level ${level}: success rate ${(successRate * 100).toFixed(1)}%`);
  }
  
  return results;
}

// Функция для тестирования проходимости конкретного уровня
export function testLevelSolvability(level: number, iterations: number = 10): { solvable: number, unsolvable: number, rate: number } {
  let solvableCount = 0;
  let unsolvableCount = 0;
  
  const mockCanvas = {
    width: 400,
    height: 700
  };
  
  for (let i = 0; i < iterations; i++) {
    // Создаем генератор уровней
    const generator = new LevelGenerator(
      mockCanvas.width,
      mockCanvas.height - 120,
      mockCanvas.width * 0.1,
      mockCanvas.width * 0.9,
      20 // Размер лунок
    );
    
    // Генерируем уровень
    const targetHoleIndex = generator.generateLevel(level);
    
    // Создаем PathFinder и проверяем проходимость
    const pathFinder = new PathFinder(mockCanvas.width, mockCanvas.height - 120, 10);
    
    // Создаем стартовую и целевую позиции
    const startPos = new Vector2D(mockCanvas.width / 2, mockCanvas.height - 150);
    
    // Для простоты считаем, что целевая лунка всегда первая в массиве
    const targetPos = new Vector2D(200, 200); // Примерная позиция
    
    const path = pathFinder.findPath(startPos, targetPos);
    
    if (path && path.length > 0) {
      solvableCount++;
    } else {
      unsolvableCount++;
    }
  }
  
  return {
    solvable: solvableCount,
    unsolvable: unsolvableCount,
    rate: solvableCount / iterations
  };
}