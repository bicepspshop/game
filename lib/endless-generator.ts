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

  // Генерация нового сегмента
  private generateSegment(segmentIndex: number): void {
    console.log(`Generating segment ${segmentIndex}`)

    // Базовая позиция Y для этого сегмента
    const baseY = segmentIndex * this.segmentHeight

    // Количество препятствий в сегменте зависит от его номера (увеличивается со временем)
    const baseObstacles = 5
    const additionalObstacles = Math.min(Math.floor(segmentIndex / 3), 15)
    const numObstacles = baseObstacles + additionalObstacles

    // Увеличиваем плотность препятствий с ростом сегмента
    const density = Math.min(this.segmentDensity + segmentIndex * 0.01, 0.95)

    // Минимальное расстояние между препятствиями
    const obstacleSize = this.obstacleRadius * 1.5
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

    // Создаем проход для игрока
    this.createPathway(segmentIndex)
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
