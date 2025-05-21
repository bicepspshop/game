import { Vector2D } from "./physics"

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

  constructor(width: number, height: number, platformRadius: number) {
    this.viewportWidth = width
    this.viewportHeight = height
    this.lastPlatformY = height
    
    // Инициализируем пул объектов для оптимизации
    for (let i = 0; i < this.poolSize; i++) {
      this.platformPool.push(new Platform(new Vector2D(0, 0), platformRadius));
    }
    
    // Генерируем начальные платформы
    this.generateInitialPlatforms()
  }
  
  // Получение платформы из пула объектов
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

  // Генерация начальных платформ
  private generateInitialPlatforms(): void {
    // Создаем начальные платформы для старта игры
    // Начинаем с самой нижней части и двигаемся вверх
    let y = this.viewportHeight
    
    // Создаем несколько рядов платформ
    for (let i = 0; i < 15; i++) {
      this.spawnPlatformRow(y)
      y -= this.getRandomSpacing()
    }
    
    // Запоминаем верхнюю платформу
    this.lastPlatformY = y
  }
  
  // Генерация случайного расстояния между рядами платформ
  private getRandomSpacing(): number {
    return this.minPlatformSpacing + Math.random() * (this.maxPlatformSpacing - this.minPlatformSpacing)
  }
  
  // Создание ряда платформ на заданной высоте
  private spawnPlatformRow(y: number): void {
    // Количество платформ в ряду
    const minPlatforms = 3
    const maxPlatforms = 6
    
    // Чем выше, тем больше платформ для усложнения
    const heightFactor = Math.min(1, this.heightInMeters / 300)
    const numPlatforms = minPlatforms + Math.floor(heightFactor * (maxPlatforms - minPlatforms))
    
    // Добавляем случайность
    const actualPlatforms = numPlatforms + Math.floor(Math.random() * 3) - 1
    
    // Ширина сектора для равномерного распределения
    const sectorWidth = this.viewportWidth / (actualPlatforms + 1)
    
    for (let i = 0; i < actualPlatforms; i++) {
      // Базовая позиция X - равномерно распределяем по ширине
      const baseX = (i + 1) * sectorWidth
      
      // Добавляем случайное смещение внутри сектора
      const offsetX = (Math.random() - 0.5) * sectorWidth * 0.7
      const x = baseX + offsetX
      
      // Получаем платформу из пула и настраиваем
      const platform = this.getPlatformFromPool(x, y, 20 + Math.random() * 5)
      
      // Определяем цвет платформы - чем выше, тем сложнее
      if (this.heightInMeters > 100 && Math.random() < 0.1) {
        // Небольшой шанс для красных "смертельных" платформ на больших высотах
        platform.color = "#FF3864"
      } else {
        platform.color = "#4b5563"
      }
      
      this.platforms.push(platform)
    }
    
    // Обновляем последнюю высоту
    if (y < this.lastPlatformY) {
      this.lastPlatformY = y
    }
  }
  
  // Создание свободного прохода в указанном сегменте
  private createPathway(segmentIndex: number): void {
    // Базовая Y-координата для сегмента
    const segmentY = segmentIndex * this.segmentHeight
    
    // Удаляем некоторые платформы, чтобы создать проход
    const pathWidth = 80 // Ширина прохода
    
    // Выбираем случайную X-координату для прохода
    const pathX = this.viewportWidth * 0.2 + Math.random() * (this.viewportWidth * 0.6)
    
    // Отфильтровываем платформы, которые попадают в проход
    this.platforms = this.platforms.filter(platform => {
      // Проверяем, находится ли платформа в текущем сегменте
      const inSegment = platform.position.y >= segmentY && 
                       platform.position.y < segmentY + this.segmentHeight
      
      // Проверяем, находится ли платформа в зоне прохода
      const inPathway = Math.abs(platform.position.x - pathX) < pathWidth / 2
      
      // Если платформа в сегменте и в проходе, удаляем её
      return !(inSegment && inPathway)
    })
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
      scrollSpeed = this.baseSpeed * Math.min(this.speedMultiplier, 3.0); // Позволяем большую максимальную скорость
      
      // Обновляем смещение viewport только если палка двигается вверх
      const pixelDelta = scrollSpeed * deltaTime;
      this.viewportOffset += pixelDelta;
    } else {
      // Если палка не двигается вверх, скорость прокрутки = 0
      this.speedMultiplier = 0;
    }
    
    // Обновляем счётчик метров с десятыми долями
    this.heightInMeters = this.viewportOffset / this.pixelsPerMeter;
    
    // Адаптивная сложность - уменьшаем расстояние между платформами с высотой более плавно
    // Используем логарифмическую зависимость для более сбалансированной сложности
    const logFactor = Math.log(1 + this.heightInMeters / 100) / Math.log(10);
    this.minPlatformSpacing = Math.max(70, 120 - logFactor * 50);
    this.maxPlatformSpacing = Math.max(120, 220 - logFactor * 100);
    
    // Временный массив для активных платформ
    const activePlatforms: Platform[] = [];
    
    // Перемещаем все существующие платформы и фильтруем те, которые ушли далеко за пределы экрана
    for (const platform of this.platforms) {
      const screenY = platform.position.y - this.viewportOffset;
      
      // Если платформа слишком далеко ушла вниз или вверх, пропускаем её
      // Расширяем диапазон видимости с запасом
      if (screenY >= -this.viewportHeight && screenY <= this.viewportHeight * 2) {
        // Переиспользуем объект из пула
        const reusedPlatform = this.getPlatformFromPool(
          platform.position.x,
          platform.position.y,
          platform.radius
        );
        // Сохраняем цвет платформы
        reusedPlatform.color = platform.color;
        activePlatforms.push(reusedPlatform);
        
        // Если достигли лимита видимых платформ, прекращаем добавление
        if (activePlatforms.length >= this.maxVisiblePlatforms) {
          break;
        }
      }
    }
    
    // Заменяем массив платформ только активными
    this.platforms = activePlatforms;
    
    // Проверяем, нужно ли генерировать новые платформы вверху
    const highestPlatformY = this.lastPlatformY - this.viewportOffset;
    
    // Также найдем самую нижнюю платформу в видимой области
    let lowestVisibleY = this.viewportHeight * 3; // Начальное значение достаточно большое
    
    // Находим самую нижнюю платформу
    for (const platform of this.platforms) {
      if (platform.position.y < lowestVisibleY) {
        lowestVisibleY = platform.position.y;
      }
    }
    
    // Генерируем новые платформы вверх, если верхняя часть приближается к видимой области
    // Добавим платформы, только если у нас меньше максимального количества платформ
    if (highestPlatformY > 0 && this.platforms.length < this.maxVisiblePlatforms) {
      const newY = this.lastPlatformY - this.getRandomSpacing();
      this.spawnPlatformRow(newY);
      
      // Проверяем, нужно ли создать новый проход для следующего сегмента
      const segmentIndex = Math.floor(newY / this.segmentHeight);
      const segmentY = segmentIndex * this.segmentHeight;
      
      // Если новый ряд находится в начале нового сегмента, создаем проход для этого сегмента
      if (newY < segmentY + this.segmentHeight / 2 && newY > segmentY) {
        this.createPathway(segmentIndex);
      }
    }
    
    // Генерируем новые платформы внизу, если нижняя часть видимой области нуждается в платформах
    const bottomScreenY = this.viewportHeight + this.viewportOffset;
    const bottomVisibleY = lowestVisibleY - this.viewportOffset;
    
    // Если самая нижняя платформа находится выше нижней границы экрана + запас
    if (bottomVisibleY < this.viewportHeight * 0.9 && this.platforms.length < this.maxVisiblePlatforms) {
      // Генерируем несколько платформ внизу
      const startY = lowestVisibleY > 0 ? lowestVisibleY + this.getRandomSpacing() : this.viewportHeight;
      
      // Генерируем до трех рядов платформ вниз
      let currentY = startY;
      for (let i = 0; i < 3 && this.platforms.length < this.maxVisiblePlatforms; i++) {
        this.spawnPlatformRow(currentY);
        currentY += this.getRandomSpacing();
        
        // Если ушли слишком далеко вниз, останавливаемся
        if (currentY - this.viewportOffset > this.viewportHeight * 2) {
          break;
        }
      }
    }
  }

  // Отрисовка всех элементов бесконечного режима
  public render(ctx: CanvasRenderingContext2D): void {
    // Отрисовываем платформы
    for (const platform of this.platforms) {
      // Вычисляем экранную позицию с учетом смещения viewport
      const screenY = platform.position.y - this.viewportOffset;
      
      // Отрисовываем только то, что в зоне видимости (с небольшим запасом)
      if (screenY >= -platform.radius && screenY <= this.viewportHeight + platform.radius) {
        ctx.fillStyle = platform.color;
        ctx.beginPath();
        ctx.arc(platform.position.x, screenY, platform.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Отрисовываем счетчик метров
    this.drawMeters(ctx);
    
    // Отрисовываем фоновые линии для визуального ощущения движения
    this.drawBackgroundLines(ctx);
    
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

  // Отрисовка фоновых линий для визуального ощущения движения - оптимизированная версия
  private drawBackgroundLines(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    
    // Рисуем горизонтальные линии через равные промежутки
    const lineSpacing = 100; // Увеличено расстояние с 50 до 100 пикселей
    
    // Вычисляем, какая линия должна быть внизу экрана
    const bottomLineY = Math.ceil(this.viewportOffset / lineSpacing) * lineSpacing;
    
    // Рисуем только 8 линий вместо всех возможных
    const maxLines = 8;
    
    for (let i = 0; i < maxLines; i++) {
      const y = bottomLineY - i * lineSpacing;
      const screenY = y - this.viewportOffset;
      
      // Если линия видна на экране
      if (screenY >= 0 && screenY <= this.viewportHeight) {
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(this.viewportWidth, screenY);
        ctx.stroke();
        
        // Отмечаем каждые 100 пикселей (1 метр) значением - только для линий, кратных 500
        if (y % 500 === 0) {
          const meters = y / this.pixelsPerMeter;
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
          ctx.font = "12px Arial";
          ctx.textAlign = "left";
          ctx.fillText(`${meters}m`, 10, screenY - 5);
        }
      }
    }
  }

  // Проверка столкновения шарика с платформами
  public checkCollision(ballPosition: Vector2D, ballRadius: number): boolean {
    // Применяем смещение к позиции шарика для корректной проверки
    const adjustedBallY = ballPosition.y + this.viewportOffset;
    
    for (const platform of this.platforms) {
      const distance = Vector2D.distance(
        new Vector2D(ballPosition.x, adjustedBallY),
        platform.position
      );
      
      // Если расстояние меньше суммы радиусов, произошло столкновение
      // Уменьшаем погрешность с 0.7 до 0.65 для более точного определения столкновений
      if (distance < platform.radius + ballRadius * 0.65) {
        return true; // Столкновение произошло
      }
    }
    
    return false; // Столкновений нет
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
    this.platforms = []; // Очищаем все платформы
    this.poolIndex = 0; // Сбрасываем индекс пула
    
    // Сбрасываем базовые параметры
    this.viewportOffset = 0;
    this.heightInMeters = 0;
    this.lastPlatformY = this.viewportHeight;
    
    // Генерируем новые начальные платформы
    this.generateInitialPlatforms();
    this.isPaused = false;
  }
  
  // Явное освобождение ресурсов
  public destroy(): void {
    this.platforms = [];
    this.platformPool = [];
    this.poolIndex = 0;
  }
}