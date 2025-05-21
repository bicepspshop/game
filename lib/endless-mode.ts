import { Vector2D } from "./physics";

// Класс для представления платформы (кружка) в бесконечном режиме
export class Platform {
  constructor(
    public position: Vector2D,
    public radius: number,
    public color: string = "#4b5563"
  ) {}
}

export class EndlessMode {
  private platforms: Platform[] = [];
  private viewportHeight: number;
  private viewportWidth: number;
  private minX: number;
  private maxX: number;
  private platformRadius: number;
  private viewportOffset = 0; // Смещение области просмотра (в пикселях)
  private heightInMeters = 0; // Высота в метрах
  private pixelsPerMeter = 100; // Коэффициент перевода пикселей в метры
  private platformDensity = 0.4; // Уменьшена плотность платформ с 0.6 до 0.4
  private platformPool: Platform[] = []; // Пул переиспользуемых объектов платформ
  private poolIndex = 0; // Индекс для пула объектов
  private lastPlatformY = 0; // Y-координата последней созданной платформы
  private minPlatformSpacing = 90; // Увеличен минимальный интервал с 70 до 90
  private maxPlatformSpacing = 180; // Увеличен максимальный интервал с 150 до 180
  private baseSpeed = 80; // Базовая скорость прокрутки (пикселей в секунду)
  private speedMultiplier = 1.0; // Множитель скорости от движения палки
  private isPaused = false; // Флаг паузы
  private maxVisiblePlatforms = 50; // Ограничение на количество видимых платформ

  constructor(viewportWidth: number, viewportHeight: number, platformRadius: number = 15) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.platformRadius = platformRadius;
    
    // Задаем границы для платформ (немного отступая от краев)
    this.minX = platformRadius * 2;
    this.maxX = viewportWidth - platformRadius * 2;
    
    // Инициализируем пул объектов платформ (для optimization) - уменьшаем начальный размер
    this.initPlatformPool(50); // Создаем 50 объектов для начала вместо 100
    
    // Генерируем начальный набор платформ
    this.generateInitialPlatforms();
  }

  // Инициализация пула объектов платформ для переиспользования
  private initPlatformPool(size: number): void {
    for (let i = 0; i < size; i++) {
      this.platformPool.push(new Platform(new Vector2D(0, 0), this.platformRadius));
    }
  }

  // Получение объекта платформы из пула
  private getPlatformFromPool(x: number, y: number, radius: number): Platform {
    // Если пул исчерпан, расширяем его
    if (this.poolIndex >= this.platformPool.length) {
      // Добавляем только 10 объектов за раз, чтобы избежать перерасхода памяти
      for (let i = 0; i < 10; i++) {
        this.platformPool.push(new Platform(new Vector2D(0, 0), this.platformRadius));
      }
    }
    
    const platform = this.platformPool[this.poolIndex++];
    platform.position.x = x;
    platform.position.y = y;
    platform.radius = radius;
    return platform;
  }

  // Сброс индекса пула (вызывается в начале каждого обновления)
  private resetPool(): void {
    this.poolIndex = 0;
  }

  // Генерация начального набора платформ
  public generateInitialPlatforms(): void {
    // Сбрасываем состояние
    this.resetPool();
    this.platforms = [];
    this.viewportOffset = 0;
    this.heightInMeters = 0;
    this.lastPlatformY = this.viewportHeight;

    // Генерируем платформы на весь экран по высоте
    for (let y = this.viewportHeight; y >= 0; y -= this.getRandomSpacing()) {
      this.spawnPlatformRow(y);
    }
    
    // Генерируем и платформы выше экрана для начального запаса
    let topY = -this.getRandomSpacing();
    for (let i = 0; i < 5; i++) {
      this.spawnPlatformRow(topY);
      topY -= this.getRandomSpacing();
    }
    
    // Генерируем платформы ниже экрана для начального ряда
    let bottomY = this.viewportHeight + this.getRandomSpacing();
    for (let i = 0; i < 10; i++) { // Больше платформ внизу, чтобы они были видны сразу
      this.spawnPlatformRow(bottomY);
      bottomY += this.getRandomSpacing();
    }
  }

  // Получение случайного интервала между платформами
  private getRandomSpacing(): number {
    return this.minPlatformSpacing + Math.random() * (this.maxPlatformSpacing - this.minPlatformSpacing);
  }

  // Создание ряда платформ на определенной высоте
  private spawnPlatformRow(y: number): void {
    // Вычисляем расстояние от земли в метрах для определения сложности
    const heightInMeters = Math.max(0, this.viewportOffset - y) / this.pixelsPerMeter;
    
    // Увеличиваем плотность платформ с высотой (до максимума 0.7)
    const currentDensity = Math.min(0.7, this.platformDensity + (heightInMeters / 100) * 0.3);
    
    // Уменьшаем размер безопасного пути с высотой (минимум 2.5 диаметра шарика)
    const safePathWidthMultiplier = Math.max(2.5, 5.0 - (heightInMeters / 50) * 2.5);
    const safePathWidth = this.platformRadius * safePathWidthMultiplier;

    // Вычисляем количество платформ в ряду на основе плотности и высоты
    const maxPlatformsInRow = Math.floor(this.viewportWidth / (this.platformRadius * 5)); 
    // С высотой увеличиваем минимальное количество платформ
    const minPlatforms = Math.min(maxPlatformsInRow - 2, 1 + Math.floor(heightInMeters / 20));
    const platformsToCreate = Math.max(minPlatforms, Math.floor(maxPlatformsInRow * currentDensity * Math.random()));
    
    // Создаем безопасный проход - с высотой становится все более рандомным
    const randomOffset = heightInMeters > 30 ? (Math.random() * 0.5) * this.viewportWidth : 0;
    const safePathX = this.minX + randomOffset + Math.random() * (this.viewportWidth - this.minX * 2 - safePathWidth - randomOffset);
    
    // Выбираем цвет платформ в зависимости от высоты (темнее на больших высотах)
    let platformColor = "#4b5563"; // Базовый серый
    if (heightInMeters > 50) {
      platformColor = "#374151"; // Более темный серый
    }
    if (heightInMeters > 100) {
      platformColor = "#1f2937"; // Еще темнее
    }
    
    // Создаем платформы, избегая безопасный проход
    for (let i = 0; i < platformsToCreate; i++) {
      let x;
      let isInSafePath;
      let attempts = 0;
      const maxAttempts = 10; // Ограничиваем количество попыток
      
      // На больших высотах иногда размещаем платформы в безопасном проходе
      const allowInSafePath = heightInMeters > 30 && Math.random() < (heightInMeters / 200);
      
      // Пробуем разместить платформу вне безопасного прохода
      do {
        x = this.minX + Math.random() * (this.maxX - this.minX);
        isInSafePath = x >= safePathX && x <= safePathX + safePathWidth;
        // Если allowInSafePath и шанс небольшой, то можем разместить в проходе
        if (isInSafePath && allowInSafePath && Math.random() < 0.3) {
          isInSafePath = false; // Прерываем цикл
          break;
        }
        attempts++;
      } while (isInSafePath && attempts < maxAttempts);
      
      // Если не удалось разместить вне пути после maxAttempts попыток, пропускаем
      if (isInSafePath) continue;
      
      // Добавляем больше вариаций размера платформ с высотой
      // Добавляем шанс на большие платформы на высоте
      let radiusMultiplier = 0.85 + Math.random() * 0.3;
      if (heightInMeters > 20 && Math.random() < 0.2) {
        radiusMultiplier = 1.1 + Math.random() * 0.3; // Большие платформы
      }
      const radius = this.platformRadius * radiusMultiplier;
      
      // Получаем переиспользуемый объект платформы из пула
      const platform = this.getPlatformFromPool(x, y, radius);
      platform.color = platformColor; // Устанавливаем цвет в зависимости от высоты
      this.platforms.push(platform);
    }
    
    this.lastPlatformY = y;
  }

  // Обновление позиций и генерация новых платформ
  public update(deltaTime: number, boardElevation: number): void {
    if (this.isPaused) return;
    
    // Сброс пула объектов в начале каждого обновления
    this.resetPool();
    
    // Меняем логику движения экрана - теперь двигаемся только если палка поднимается вверх
    // boardElevation: отрицательное значение = палка поднята вверх
    let scrollSpeed = 0;
    
    // Если палка поднимается (boardElevation < 0), двигаем экран
    if (boardElevation < 0) {
      // Вычисляем скорость прокрутки на основе подъема палки
      this.speedMultiplier = 1.0 + Math.max(0, -boardElevation / 100); // Увеличиваем влияние подъема
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
    
    // Адаптивная сложность - уменьшаем расстояние между платформами с высотой
    this.minPlatformSpacing = Math.max(70, 90 - (this.heightInMeters / 100) * 20);
    this.maxPlatformSpacing = Math.max(120, 180 - (this.heightInMeters / 100) * 60);
    
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
    
    // Отладочная информация - количество платформ
    // ctx.font = "12px Arial";
    // ctx.fillText(`Платформ: ${this.platforms.length}`, 20, 80);
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
      if (distance < platform.radius + ballRadius * 0.7) {
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