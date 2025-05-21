import { testLevelGenerator, testLevelSolvability } from './level-tester';

// Для запуска тестов в консоли
export function runLevelTests() {
  console.log("Running level generation tests...");
  
  // Тестируем только первые 20 уровней, по 50 итераций для каждого
  const results = testLevelGenerator(50, 20);
  
  console.log("\n== LEVEL GENERATION TEST RESULTS ==");
  
  // Выводим результаты
  let allSuccess = true;
  for (const result of results) {
    if (result.success) {
      console.log(`Level ${result.level}: ✅ SUCCESS`);
    } else {
      console.log(`Level ${result.level}: ❌ FAILED - ${result.errorInfo}`);
      allSuccess = false;
    }
  }
  
  console.log(`\nOverall test result: ${allSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  // Тестируем проходимость высоких уровней
  console.log("\n== TESTING DIFFICULT LEVELS SOLVABILITY ==");
  
  const difficultLevels = [15, 16, 17, 18, 19, 20];
  
  for (const level of difficultLevels) {
    const solvabilityResult = testLevelSolvability(level, 10);
    console.log(`Level ${level}: ${solvabilityResult.solvable}/${solvabilityResult.solvable + solvabilityResult.unsolvable} solvable (${(solvabilityResult.rate * 100).toFixed(1)}%)`);
  }
}

// Автоматически запускаем тесты при импорте в разработческой среде
if (process.env.NODE_ENV === 'development') {
  runLevelTests();
}