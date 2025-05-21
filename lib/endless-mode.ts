 -boardElevation / 100); // Увеличиваем влияние подъема
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