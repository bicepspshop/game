import { Vector2D } from "./physics"

// Класс для препятствий в бесконечном режиме
export class Obstacle {
  constructor(
    public position: Vector2D,
    public radius: number,
  ) {}
}

// Класс для генерации бесконечного режима
export class EndlessGenerator {
  private obstacles: Obstacle[] = []
  private width: number
  private height: number
  private minX: number
  private maxX: number
  private obstacleRadius: number
  private segmentHeight = 600 // Высота одного сегмента
  private currentTopSegment = 0 // Номер верхнего сегмента
  private segmentDensity = 0.8 // Плотность препятствий (0-1)

  // Шаблоны расположения препятствий, вдохновленные оригинальным автоматом
  private segmentTemplates = [
    // Диагональный каскад
    (baseY: number, width: number, segmentHeight: number, obstacleSize: number, segmentIndex: number): Obstacle[] => {
      const obstacles: Obstacle[] = [];
      const numHoles = 5 + Math.min(3, Math.floor(segmentIndex / 3));
      
      // Располагаем отверстия по диагонали
      const leftToRight = segmentIndex % 2 === 0;
      const startX = leftToRight ? width * 0.2 : width * 0.8;
      const startY = baseY + segmentHeight * 0.1;
      
      const stepX = (width * 0.6) / (numHoles - 1) * (leftToRight ? 1 : -1);
      const stepY = (segmentHeight * 0.7) / (numHoles - 1);
      
      for (let i = 0; i < numHoles; i++) {
        obstacles.push(new Obstacle(
          new Vector2D(startX + stepX * i, startY + stepY * i),
          obstacleSize
        ));
      }
      
      // Добавляем дополнительные препятствия по краям
      if (segmentIndex > 3) {
        const borderCount = Math.min(5, Math.floor(segmentIndex / 2));
        const borderY = baseY + segmentHeight * 0.4;
        
        // По левому краю
        for (let i = 0; i < borderCount; i++) {
          obstacles.push(new Obstacle(
            new Vector2D(width * 0.1, baseY + (segmentHeight / borderCount) * i),
            obstacleSize * 0.8
          ));
        }
        
        // По правому краю
        for (let i = 0; i < borderCount; i++) {
          obstacles.push(new Obstacle(
            new Vector2D(width * 0.9, baseY + (segmentHeight / borderCount) * i),
            obstacleSize * 0.8
          ));
        }
      }
      
      return obstacles;
    },
    
    // Зигзагообразный коридор
    (baseY: number, width: number, segmentHeight: number, obstacleSize: number, segmentIndex: number): Obstacle[] => {
      const obstacles: Obstacle[] = [];
      const numZigs = 3 + Math.min(3, Math.floor(segmentIndex / 3));
      
      const startX = width * 0.25;
      const endX = width * 0.75;
      const startY = baseY + segmentHeight * 0.1;
      
      const xStep = (endX - startX) / (numZigs - 1);
      const amplitude = segmentHeight * (0.15 + (segmentIndex / 30) * 0.1);
      
      for (let i = 0; i < numZigs; i++) {
        const x = startX + i * xStep;
        const y = startY + (i % 2 === 0 ? 0 : amplitude);
        
        // Добавляем основные отверстия зигзага
        obstacles.push(new Obstacle(new Vector2D(x, y), obstacleSize));
        
        // Добавляем дополнительные отверстия вокруг
        if (segmentIndex > 6) {
          obstacles.push(new Obstacle(new Vector2D(x - width * 0.05, y - segmentHeight * 0.05), obstacleSize * 0.8));
          obstacles.push(new Obstacle(new Vector2D(x + width * 0.05, y - segmentHeight * 0.05), obstacleSize * 0.8));
        }
      }
      
      return obstacles;
    },
    
    // Кольцевой кластер
    (baseY: number, width: number, segmentHeight: number, obstacleSize: number, segmentIndex: number): Obstacle[] => {
      const obstacles: Obstacle[] = [];
      const centerX = width / 2;
      const centerY = baseY + segmentHeight * 0.4;
      
      // Радиус зависит от номера сегмента
      const radius = width * (0.2 + (segmentIndex / 100) * 0.1);
      // Больше отверстий на высоких сегментах
      const numHoles = 8 + Math.min(6, Math.floor(segmentIndex / 4));
      
      for (let i = 0; i < numHoles; i++) {
        const angle = (i / numHoles) * Math.PI * 2;
        // Добавляем небольшое случайное смещение для органичности
        const randomOffset = (Math.random() - 0.5) * 0.1;
        const randomAngle = angle + randomOffset;
        
        // Создаем разрыв в кольце для возможности прохода
        const gapAngle = Math.PI / 2; // Разрыв внизу
        const gapWidth = Math.PI / 6; // Ширина разрыва
        
        // Пропускаем создание отверстия в зоне разрыва
        if (Math.abs(angle - gapAngle) < gapWidth) continue;
        
        obstacles.push(new Obstacle(
          new Vector2D(
            centerX + Math.cos(randomAngle) * radius,
            centerY + Math.sin(randomAngle) * radius
          ),
          obstacleSize
        ));
      }
      
      // Добавляем дополнительные препятствия внутри кольца на высоких уровнях
      if (segmentIndex > 15) {
        const innerRadius = radius * 0.5;
        for (let i = 0; i < numHoles / 2; i++) {
          const angle = (i / (numHoles / 2)) * Math.PI * 2;
          obstacles.push(new Obstacle(
            new Vector2D(
              centerX + Math.cos(angle) * innerRadius,
              centerY + Math.sin(angle) * innerRadius
            ),
            obstacleSize * 0.7
          ));
        }
      }
      
      return obstacles;
    },
    
    // Вертикальные ворота
    (baseY: number, width: number, segmentHeight: number, obstacleSize: number, segmentIndex: number): Obstacle[] => {
      const obstacles: Obstacle[] = [];
      const gateWidth = width * 0.4;
      const gateHeight = segmentHeight * 0.8;
      
      const leftGateX = width / 2 - gateWidth / 2;
      const rightGateX = width / 2 + gateWidth / 2;
      const startY = baseY + segmentHeight * 0.1;
      
      // Количество отверстий в каждой вертикальной линии
      const numHoles = 4 + Math.min(5, Math.floor(segmentIndex / 3));
      
      // Создаем вертикальные линии отверстий
      for (let i = 0; i < numHoles; i++) {
        const y = startY + (gateHeight / (numHoles - 1)) * i;
        
        // С увеличением сегмента добавляем смещение для усложнения
        const leftOffset = segmentIndex > 10 ? (Math.sin(i * 0.7) * width * 0.05) : 0;
        const rightOffset = segmentIndex > 10 ? (Math.sin(i * 0.7 + Math.PI) * width * 0.05) : 0;
        
        obstacles.push(new Obstacle(new Vector2D(leftGateX + leftOffset, y), obstacleSize));
        obstacles.push(new Obstacle(new Vector2D(rightGateX + rightOffset, y), obstacleSize));
      }
      
      // Добавляем дополнительные препятствия по краям на высоких уровнях
      if (segmentIndex > 5) {
        // Добавляем препятствия по краям экрана
        for (let i = 0; i < 3; i++) {
          obstacles.push(new Obstacle(new Vector2D(width * 0.05, baseY + segmentHeight * (0.2 + i * 0.3)), obstacleSize));
          obstacles.push(new Obstacle(new Vector2D(width * 0.95, baseY + segmentHeight * (0.2 + i * 0.3)), obstacleSize));
        }
      }
      
      return obstacles;
    },
    
    // Защитный барьер
    (baseY: number, width: number, segmentHeight: number, obstacleSize: number, segmentIndex: number): Obstacle[] => {
      const obstacles: Obstacle[] = [];
      
      // Размещаем барьеры в нескольких местах сегмента
      const numBarriers = 1 + Math.min(2, Math.floor(segmentIndex / 10));
      
      for (let b = 0; b < numBarriers; b++) {
        const centerX = width * (0.3 + b * 0.4);
        const centerY = baseY + segmentHeight * (0.3 + b * 0.3);
        const numHoles = 6 + Math.min(6, Math.floor(segmentIndex / 5));
        const radius = width * 0.15;
        
        // Создаем круговой барьер с разрывом
        for (let i = 0; i < numHoles; i++) {
          const angle = (i / numHoles) * Math.PI * 2;
          
          // Определяем позицию разрыва в зависимости от номера барьера
          const gapAngle = Math.PI / 2 + b * Math.PI / 2; // Меняем позицию разрыва для разных барьеров
          const gapWidth = Math.PI / (4 + segmentIndex * 0.05); // Разрыв сужается с ростом сегмента
          
          // Пропускаем создание отверстия в зоне разрыва
          if (Math.abs(((angle + Math.PI * 2) % (Math.PI * 2)) - gapAngle) < gapWidth) continue;
          
          obstacles.push(new Obstacle(
            new Vector2D(
              centerX + Math.cos(angle) * radius,
              centerY + Math.sin(angle) * radius
            ),
            obstacleSize
          ));
        }
      }
      
      return obstacles;
    }
  ];

  constructor(width: number, height: number, minX: number, maxX: number, obstacleRadius: number) {
    this.width = width
    this.height = height
    this.minX = minX
    this.maxX = maxX
    this.obstacleRadius = obstacleRadius
  }

  // Сбросить генератор
  public reset(): void {
    this.obstacles = []
    this.currentTopSegment = 0
  }

  // Генерация начального сегмента
  public generateInitialSegment(): void {
    // Генерируем первые два сегмента
    this.generateSegment(0)
    this.generateSegment(1)
  }
  
  // Генерация нового сегмента
  private generateSegment(segmentIndex: number): void {
    console.log(`Generating segment ${segmentIndex}`);

    // Базовая позиция Y для этого сегмента
    const baseY = segmentIndex * this.segmentHeight;
    const obstacleSize = this.obstacleRadius * 1.5;

    // Используем шаблоны уровней, вдохновленные оригинальным автоматом
    if (this.segmentTemplates.length > 0 && segmentIndex > 0) {
      // Выбираем шаблоны в зависимости от уровня
      const templateIndex = segmentIndex % this.segmentTemplates.length;
      
      // Генерируем препятствия по шаблону
      const obstacles = this.segmentTemplates[templateIndex](baseY, this.width, this.segmentHeight, obstacleSize, segmentIndex);
      
      // Добавляем их в общий список
      this.obstacles.push(...obstacles);
      
      // Если уровень достаточно высокий, добавляем элементы из другого шаблона
      if (segmentIndex > 8) {
        const secondTemplateIndex = (templateIndex + Math.floor(segmentIndex / 4)) % this.segmentTemplates.length;
        
        if (secondTemplateIndex !== templateIndex) {
          const secondaryObstacles = this.segmentTemplates[secondTemplateIndex](baseY, this.width, this.segmentHeight, obstacleSize * 0.8, segmentIndex);
          
          // Берем только часть препятствий из второго шаблона
          const numToTake = Math.floor(secondaryObstacles.length / 3);
          
          // Добавляем их в общий список
          this.obstacles.push(...secondaryObstacles.slice(0, numToTake));
        }
      }
    } else {
      // Для первого сегмента используем простую случайную генерацию
      // Количество препятствий в сегменте зависит от его номера (увеличивается со временем)
      const baseObstacles = 5
      const additionalObstacles = Math.min(Math.floor(segmentIndex / 3), 15)
      const numObstacles = baseObstacles + additionalObstacles

      // Увеличиваем плотность препятствий с ростом сегмента
      const density = Math.min(this.segmentDensity + segmentIndex * 0.01, 0.95)

      // Минимальное расстояние между препятствиями
      const minDistance = obstacleSize * 2.2

      // Создаем сетку для размещения препятствий
      const gridCols = Math.floor(this.width / minDistance)
      const gridRows = Math.floor(this.segmentHeight / minDistance)

      // Массив для отслеживания занятых ячеек
      const occupiedCells: boolean[][] = Array(gridRows)
        .fill(0)
        .map(() => Array(gridCols).fill(false))

      // Генерируем препятствия
      let placedObstacles = 0
      let attempts = 0
      const maxAttempts = 1000

      while (placedObstacles < numObstacles && attempts < maxAttempts) {
        attempts++

        // Выбираем случайную ячейку
        const row = Math.floor(Math.random() * gridRows)
        const col = Math.floor(Math.random() * gridCols)

        // Если ячейка не занята
        if (!occupiedCells[row][col]) {
          // Проверяем, не слишком ли близко к другим препятствиям
          const x = this.minX + (col + 0.5) * (this.width / gridCols)
          const y = baseY + (row + 0.5) * (this.segmentHeight / gridRows)

          let tooClose = false

          // Проверяем соседние ячейки
          for (let r = Math.max(0, row - 1); r <= Math.min(gridRows - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(gridCols - 1, col + 1); c++) {
              if (r === row && c === col) continue

              if (occupiedCells[r][c]) {
                tooClose = true
                break
              }
            }
            if (tooClose) break
          }

          // Если не слишком близко, размещаем препятствие
          if (!tooClose) {
            occupiedCells[row][col] = true

            // Добавляем случайное смещение внутри ячейки
            const offsetX = (Math.random() - 0.5) * ((this.width / gridCols) * 0.5)
            const offsetY = (Math.random() - 0.5) * ((this.segmentHeight / gridRows) * 0.5)

            const obstacle = new Obstacle(new Vector2D(x + offsetX, y + offsetY), obstacleSize)

            this.obstacles.push(obstacle)
            placedObstacles++
          }
        }
      }

      console.log(`Generated ${placedObstacles} obstacles for segment ${segmentIndex}`)
    }
    
    // Создаем проход для игрока
    this.createPathway(segmentIndex)
  }

  // Обновление сегментов при прокрутке
  public updateSegments(viewportOffset: number, viewportHeight: number): void {
    // Определяем, какой сегмент сейчас виден в верхней части экрана
    const visibleTopSegment = Math.floor((viewportOffset + viewportHeight) / this.segmentHeight)

    // Если мы приближаемся к новому сегменту, генерируем его
    if (visibleTopSegment >= this.currentTopSegment) {
      this.generateSegment(visibleTopSegment + 1)
      this.currentTopSegment = visibleTopSegment

      // Удаляем старые сегменты, которые уже не видны
      this.removeOldSegments(viewportOffset - this.segmentHeight)
    }
  }

  // Создание прохода для игрока
  private createPathway(segmentIndex: number): void {
    // Базовая позиция Y для этого сегмента
    const baseY = segmentIndex * this.segmentHeight

    // Создаем извилистый путь через сегмент
    const pathPoints = []
    const numPoints = 5 // Количество точек пути

    // Начальная точка - случайная позиция в нижней части сегмента
    let prevX = this.minX + Math.random() * (this.maxX - this.minX)

    for (let i = 0; i < numPoints; i++) {
      // Позиция Y для этой точки
      const y = baseY + (i + 0.5) * (this.segmentHeight / numPoints)

      // Позиция X - случайное смещение от предыдущей точки
      const maxOffset = this.width * 0.3
      const x = Math.max(this.minX, Math.min(this.maxX, prevX + (Math.random() - 0.5) * maxOffset))

      pathPoints.push(new Vector2D(x, y))
      prevX = x
    }

    // Удаляем препятствия вблизи пути
    const clearRadius = this.obstacleRadius * 3

    this.obstacles = this.obstacles.filter((obstacle) => {
      // Проверяем расстояние до каждой точки пути
      for (const point of pathPoints) {
        const distance = Vector2D.distance(obstacle.position, point)
        if (distance < clearRadius) {
          return false // Удаляем препятствие
        }
      }
      return true // Оставляем препятствие
    })
  }

  // Удаление старых сегментов
  private removeOldSegments(minY: number): void {
    this.obstacles = this.obstacles.filter((obstacle) => obstacle.position.y > minY)
  }

  // Проверка столкновения с препятствиями
  public checkObstacleCollision(ballPosition: Vector2D, ballRadius: number, viewportOffset: number): boolean {
    // Проверяем только препятствия в видимой области
    const visibleObstacles = this.obstacles.filter(
      (obstacle) => obstacle.position.y >= viewportOffset && obstacle.position.y <= viewportOffset + this.height,
    )

    for (const obstacle of visibleObstacles) {
      const distance = Vector2D.distance(ballPosition, obstacle.position)
      const collisionThreshold = obstacle.radius + ballRadius * 0.7

      if (distance < collisionThreshold) {
        return true // Столкновение произошло
      }
    }

    return false // Столкновений нет
  }

  // Отрисовка препятствий
  public render(ctx: CanvasRenderingContext2D, viewportOffset: number): void {
    // Отрисовываем только препятствия в видимой области
    const visibleObstacles = this.obstacles.filter(
      (obstacle) => obstacle.position.y >= viewportOffset && obstacle.position.y <= viewportOffset + this.height,
    )

    for (const obstacle of visibleObstacles) {
      // Преобразуем координаты с учетом смещения видимой области
      const screenY = obstacle.position.y - viewportOffset

      ctx.fillStyle = "#4b5563"
      ctx.beginPath()
      ctx.arc(obstacle.position.x, screenY, obstacle.radius, 0, Math.PI * 2)
      ctx.fill()
    }

    // Рисуем линии уровней (каждые 100 метров)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"
    ctx.lineWidth = 1

    const meterSize = 10 // 1 метр = 10 пикселей
    const startMeter = Math.floor(viewportOffset / meterSize) * meterSize
    const endMeter = Math.ceil((viewportOffset + this.height) / meterSize) * meterSize

    for (let y = startMeter; y <= endMeter; y += meterSize * 10) {
      // Каждые 10 метров
      const screenY = y - viewportOffset

      ctx.beginPath()
      ctx.moveTo(0, screenY)
      ctx.lineTo(this.width, screenY)
      ctx.stroke()

      // Рисуем метки высоты
      const meters = y / meterSize
      if (meters % 100 === 0) {
        // Каждые 100 метров
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
        ctx.font = "12px Arial"
        ctx.fillText(`${meters}м`, 10, screenY - 5)
      }
    }
  }
}
