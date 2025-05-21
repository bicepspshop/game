import { Vector2D } from "./physics"
import { EndlessGenerator, Obstacle } from "./endless-generator" // Импортируем наш новый генератор

// Класс для платформ в бесконечном режиме
class Platform {
  constructor(
    public position: Vector2D,
    public radius: number,
    public color: string = "#4b5563"
  ) {}
}

export class EndlessMode {
  private platforms: Platform[] = []
  private platformPool: Platform[] = []
  private poolIndex: number = 0
  private poolSize: number = 200
  private viewportWidth: number
  private viewportHeight: number
  private viewportOffset: number = 0
  private lastPlatformY: number
  private minPlatformSpacing: number = 120
  private maxPlatformSpacing: number = 220
  private isPaused: boolean = false
  private baseSpeed: number = 50
  private speedMultiplier: number = 0
  private heightInMeters: number = 0
  private pixelsPerMeter: number = 100
  private maxVisiblePlatforms: number = 150
  private segmentHeight: number = 500
  
  // Новый генератор уровней, основанный на аркадном автомате
  private endlessGenerator: EndlessGenerator | null = null

  constructor(width: number, height: number, platformRadius: number) {
    this.viewportWidth = width
    this.viewportHeight = height
    this.lastPlatformY = height
    
    // Инициализируем наш новый генератор уровней
    this.endlessGenerator = new EndlessGenerator(
      width, 
      height, 
      width * 0.05, // левый край
      width * 0.95, // правый край
      platformRadius
    )
    
    // Инициализируем пул объектов для оптимизации (для старых платформ)
    for (let i = 0; i < this.poolSize; i++) {
      this.platformPool.push(new Platform(new Vector2D(0, 0), platformRadius));
    }
    
    // Генерируем начальные уровни с новым генератором
    this.endlessGenerator.generateInitialSegment()
  }
  
  // Получение платформы из пула объектов (для совместимости)
  private getPlatformFromPool(x: number, y: number, radius: number): Platform {
    // Если достигли конца пула, начинаем сначала
    if (this.poolIndex >= this.poolSize) {
      this.poolIndex = 0;
    }
    
    // Получаем существующий объект
    const platform = this.platformPool[this.poolIndex++];
    
    // Обновляем его свойства
    platform.position.x = x;
    platform.position.y = y;
    platform.radius = radius;
    
    return platform;
  }

  // Обновление состояния бесконечного режима
  public update(deltaTime: number, boardElevation: number): void {
    if (this.isPaused) return
    
    // Скорость прокрутки зависит от высоты доски (отрицательные значения - подъем вверх)
    let scrollSpeed = 0
    
    // Если доска движется вверх (отрицательное значение), увеличиваем скорость прокрутки
    if (boardElevation < 0) {
      // Плавно увеличиваем множитель скорости
      this.speedMultiplier += deltaTime * (Math.abs(boardElevation) / 30)
      // Применяем базовую скорость с множителем и влиянием подъема
      scrollSpeed = this.baseSpeed * this.speedMultiplier * Math.pow(Math.abs(boardElevation) / 100, 0.7); // Увеличиваем влияние подъема
      scrollSpeed = Math.min(scrollSpeed, this.baseSpeed * Math.min(this.speedMultiplier, 3.0)); // Позволяем большую максимальную скорость
      
      // Обновляем смещение viewport только если палка двигается вверх
      const pixelDelta = scrollSpeed * deltaTime;
      this.viewportOffset += pixelDelta;
    } else {
      // Если палка не двигается вверх, скорость прокрутки = 0
      this.speedMultiplier = Math.max(0, this.speedMultiplier - deltaTime * 0.5); // Плавное уменьшение скорости
    }
    
    // Обновляем счётчик метров с десятыми долями
    this.heightInMeters = this.viewportOffset / this.pixelsPerMeter;
    
    // Обновляем генератор уровней, основанный на аркадном автомате
    if (this.endlessGenerator) {
      this.endlessGenerator.updateSegments(this.viewportOffset, this.viewportHeight);
    }
  }

  // Отрисовка всех элементов бесконечного режима
  public render(ctx: CanvasRenderingContext2D): void {
    // Отрисовываем препятствия с новым генератором
    if (this.endlessGenerator) {
      this.endlessGenerator.render(ctx, this.viewportOffset);
    }
    
    // Отрисовываем счетчик метров
    this.drawMeters(ctx);
    
    // Отображаем показатель скорости
    // Индикатор скорости в виде полосы, размер которой зависит от скорости
    ctx.fillStyle = "rgba(0, 200, 255, 0.6)";
    const speedBarHeight = Math.min(100, this.speedMultiplier * 33);
    if (speedBarHeight > 0) {
      ctx.fillRect(this.viewportWidth - 20, this.viewportHeight - speedBarHeight, 10, speedBarHeight);
    }
    
    // Подпись для индикатора скорости
    ctx.font = "12px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "right";
    ctx.fillText("Скорость", this.viewportWidth - 25, this.viewportHeight - 10);
  }

  // Отрисовка счетчика метров
  private drawMeters(ctx: CanvasRenderingContext2D): void {
    // Настройка шрифта (один раз, не в цикле отрисовки)
    ctx.font = "bold 20px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    
    // Отображаем высоту с одним десятичным знаком
    const formattedHeight = this.heightInMeters.toFixed(1);
    ctx.fillText(`${formattedHeight} м`, 20, 30);
    
    // Опционально: отображаем скорость подъема
    ctx.font = "16px Arial";
    ctx.fillText(`Скорость: ${this.speedMultiplier.toFixed(1)}x`, 20, 60);
  }

  // Проверка столкновения шарика с препятствиями
  public checkCollision(ballPosition: Vector2D, ballRadius: number): boolean {
    if (this.endlessGenerator) {
      return this.endlessGenerator.checkObstacleCollision(ballPosition, ballRadius, this.viewportOffset);
    }
    return false;
  }

  // Получение текущей высоты в метрах
  public getHeightInMeters(): number {
    return this.heightInMeters;
  }

  // Пауза/продолжение бесконечного режима
  public setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  // Сброс бесконечного режима
  public reset(): void {
    this.platforms = []; // Очищаем старые платформы для совместимости
    this.poolIndex = 0; // Сбрасываем индекс пула
    
    // Сбрасываем базовые параметры
    this.viewportOffset = 0;
    this.heightInMeters = 0;
    this.lastPlatformY = this.viewportHeight;
    
    // Сбрасываем генератор уровней
    if (this.endlessGenerator) {
      this.endlessGenerator.reset();
      this.endlessGenerator.generateInitialSegment();
    }
    
    this.isPaused = false;
  }
  
  // Явное освобождение ресурсов
  public destroy(): void {
    this.platforms = [];
    this.platformPool = [];
    this.poolIndex = 0;
    
    // Освобождаем ресурсы генератора
    if (this.endlessGenerator) {
      this.endlessGenerator = null;
    }
  }
}