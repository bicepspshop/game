import { Vector2D } from "./physics"

// Тип для точки пути
type PathNode = {
  x: number
  y: number
  g: number // Стоимость пути от начальной точки
  h: number // Эвристическая оценка до цели
  f: number // Общая стоимость (g + h)
  parent: PathNode | null
}

// Тип для препятствия
type Obstacle = {
  position: Vector2D
  radius: number
  isTarget?: boolean
}

export class PathFinder {
  private width: number
  private height: number
  private cellSize: number
  private grid: boolean[][] = []
  private obstacles: Obstacle[] = []

  constructor(width: number, height: number, cellSize: number) {
    this.width = width
    this.height = height
    this.cellSize = cellSize

    // Инициализация сетки
    this.initGrid()
  }

  // Инициализация сетки
  private initGrid(): void {
    const cols = Math.ceil(this.width / this.cellSize)
    const rows = Math.ceil(this.height / this.cellSize)

    this.grid = Array(rows)
      .fill(0)
      .map(() => Array(cols).fill(true))
  }

  // Обновление сетки на основе препятствий
  public updateGrid(obstacles: Obstacle[]): void {
    this.obstacles = obstacles
    this.initGrid() // Сбрасываем сетку

    // Отмечаем ячейки с препятствиями
    for (const obstacle of obstacles) {
      if (obstacle.isTarget) continue // Пропускаем целевую лунку

      // Рассчитываем границы влияния препятствия
      const minCol = Math.max(0, Math.floor((obstacle.position.x - obstacle.radius) / this.cellSize))
      const maxCol = Math.min(
        this.grid[0].length - 1,
        Math.ceil((obstacle.position.x + obstacle.radius) / this.cellSize)
      )
      const minRow = Math.max(0, Math.floor((obstacle.position.y - obstacle.radius) / this.cellSize))
      const maxRow = Math.min(
        this.grid.length - 1,
        Math.ceil((obstacle.position.y + obstacle.radius) / this.cellSize)
      )

      // Маркируем ячейки сетки, которые пересекаются с препятствием
      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          const cellCenterX = (col + 0.5) * this.cellSize
          const cellCenterY = (row + 0.5) * this.cellSize
          const distance = Math.sqrt(
            Math.pow(cellCenterX - obstacle.position.x, 2) + Math.pow(cellCenterY - obstacle.position.y, 2)
          )

          // Если центр ячейки внутри препятствия, отмечаем её как непроходимую
          if (distance < obstacle.radius + this.cellSize / 2) {
            this.grid[row][col] = false
          }
        }
      }
    }
  }

  // Функция для проверки коридора с заданной шириной
  public validateCorridor(start: Vector2D, end: Vector2D, corridorWidth: number): boolean {
    // Увеличиваем радиус для всех препятствий на половину требуемой ширины коридора
    const inflatedObstacles = this.obstacles.map(o => {
      if (o.isTarget) return o // Не изменяем целевую лунку
      return {
        position: o.position,
        radius: o.radius + corridorWidth / 2,
        isTarget: o.isTarget,
      }
    })

    // Создаем временную копию сетки
    const tempPathFinder = new PathFinder(this.width, this.height, this.cellSize)
    tempPathFinder.updateGrid(inflatedObstacles)

    // Ищем путь с раздутыми препятствиями
    const path = tempPathFinder.findPath(start, end)
    return path !== null && path.length > 0
  }

  // Поиск пути от начальной точки до целевой
  public findPath(start: Vector2D, end: Vector2D): Vector2D[] | null {
    const startNode: PathNode = {
      x: start.x,
      y: start.y,
      g: 0,
      h: this.heuristic(start, end),
      f: 0,
      parent: null,
    }
    startNode.f = startNode.g + startNode.h

    const openSet: PathNode[] = [startNode]
    const closedSet: Set<string> = new Set()

    // Максимальное количество итераций для предотвращения бесконечного цикла
    const maxIterations = 500
    let iterations = 0

    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++

      // Находим узел с наименьшей общей стоимостью
      let currentIndex = 0
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIndex].f) {
          currentIndex = i
        }
      }

      const current = openSet[currentIndex]

      // Если достигли цели
      if (this.distance(current, end) < 20) {
        // Восстанавливаем путь
        const path: Vector2D[] = []
        let node: PathNode | null = current
        while (node !== null) {
          path.push(new Vector2D(node.x, node.y))
          node = node.parent
        }
        return path.reverse()
      }

      // Удаляем текущий узел из открытого списка и добавляем в закрытый
      openSet.splice(currentIndex, 1)
      closedSet.add(`${Math.floor(current.x)},${Math.floor(current.y)}`)

      // Генерируем соседей
      const neighbors = this.getNeighbors(current)
      for (const neighbor of neighbors) {
        const neighborKey = `${Math.floor(neighbor.x)},${Math.floor(neighbor.y)}`
        if (closedSet.has(neighborKey)) continue

        const tentativeG = current.g + this.distance(current, neighbor)

        let isNewNode = true
        for (let i = 0; i < openSet.length; i++) {
          if (
            Math.abs(openSet[i].x - neighbor.x) < 1 &&
            Math.abs(openSet[i].y - neighbor.y) < 1
          ) {
            isNewNode = false
            if (tentativeG < openSet[i].g) {
              openSet[i].g = tentativeG
              openSet[i].f = tentativeG + openSet[i].h
              openSet[i].parent = current
            }
            break
          }
        }

        if (isNewNode) {
          neighbor.g = tentativeG
          neighbor.h = this.heuristic(neighbor, end)
          neighbor.f = neighbor.g + neighbor.h
          neighbor.parent = current
          openSet.push(neighbor)
        }
      }
    }

    // Если путь не найден
    return null
  }

  // Эвристическая функция (манхэттенское расстояние)
  private heuristic(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
  }

  // Евклидово расстояние между двумя точками
  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
  }

  // Получение соседних узлов
  private getNeighbors(node: PathNode): PathNode[] {
    const neighbors: PathNode[] = []
    const directions = [
      { x: 0, y: -1 }, // Вверх
      { x: 1, y: 0 },  // Вправо
      { x: 0, y: 1 },  // Вниз
      { x: -1, y: 0 }, // Влево
      { x: 1, y: -1 }, // Вверх-вправо
      { x: 1, y: 1 },  // Вниз-вправо
      { x: -1, y: 1 }, // Вниз-влево
      { x: -1, y: -1 }, // Вверх-влево
    ]

    const stepSize = this.cellSize / 2

    for (const dir of directions) {
      const newX = node.x + dir.x * stepSize
      const newY = node.y + dir.y * stepSize

      // Проверяем, находится ли точка в пределах игрового поля
      if (newX < 0 || newX >= this.width || newY < 0 || newY >= this.height) {
        continue
      }

      // Проверяем, не пересекается ли точка с препятствиями
      let isValid = true
      for (const obstacle of this.obstacles) {
        if (obstacle.isTarget) continue // Пропускаем целевую лунку

        const distance = Math.sqrt(
          Math.pow(newX - obstacle.position.x, 2) + Math.pow(newY - obstacle.position.y, 2)
        )
        if (distance < obstacle.radius + stepSize / 2) {
          isValid = false
          break
        }
      }

      if (isValid) {
        neighbors.push({
          x: newX,
          y: newY,
          g: 0,
          h: 0,
          f: 0,
          parent: null,
        })
      }
    }

    return neighbors
  }

  // Создание безопасного пути, удаляя блокирующие препятствия
  public createSafePath(start: Vector2D, end: Vector2D, ballRadius: number, obstacles: Obstacle[]): Obstacle[] {
    // Попытка найти путь с текущими препятствиями
    this.updateGrid(obstacles)
    let path = this.findPath(start, end)

    // Если путь уже существует, возвращаем препятствия как есть
    if (path !== null && path.length > 0) {
      return obstacles
    }

    // Создаем копию препятствий для модификации
    const modifiableObstacles = [...obstacles]

    // Идентифицируем препятствия, которые блокируют путь
    let removedCount = 0
    let maxRemovals = Math.min(5, Math.floor(obstacles.length * 0.2)) // Удаляем не более 20% препятствий

    while (path === null && removedCount < maxRemovals) {
      // Находим препятствие, которое с наибольшей вероятностью блокирует путь
      const blockerIndex = this.findPotentialBlocker(modifiableObstacles, start, end)
      if (blockerIndex === -1) break

      // Удаляем блокирующее препятствие
      modifiableObstacles.splice(blockerIndex, 1)
      removedCount++

      // Пробуем найти путь без этого препятствия
      this.updateGrid(modifiableObstacles)
      path = this.findPath(start, end)
    }

    // Если всё ещё нет пути, удаляем препятствия вдоль прямой линии от старта к цели
    if (path === null) {
      this.clearDirectPath(modifiableObstacles, start, end, ballRadius)
      this.updateGrid(modifiableObstacles)
      path = this.findPath(start, end)
    }

    return modifiableObstacles
  }

  // Находит препятствие, которое, вероятно, блокирует путь
  private findPotentialBlocker(obstacles: Obstacle[], start: Vector2D, end: Vector2D): number {
    // Находим препятствия в прямой линии от старта к цели
    const directObstacles: { index: number; distance: number }[] = []

    // Рассчитываем вектор направления
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.sqrt(dx * dx + dy * dy)
    const dirX = dx / length
    const dirY = dy / length

    // Проверяем каждое препятствие
    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i]
      if (obstacle.isTarget) continue // Пропускаем целевую лунку

      // Вычисляем ближайшую точку на линии от препятствия
      const t = Math.max(0, Math.min(length, dirX * (obstacle.position.x - start.x) + dirY * (obstacle.position.y - start.y)))
      const nearestX = start.x + dirX * t
      const nearestY = start.y + dirY * t

      // Расстояние от препятствия до линии
      const distance = Math.sqrt(
        Math.pow(nearestX - obstacle.position.x, 2) + Math.pow(nearestY - obstacle.position.y, 2)
      )

      // Если препятствие близко к линии, добавляем его в список
      if (distance < obstacle.radius * 1.5) {
        directObstacles.push({ index: i, distance })
      }
    }

    // Если нет препятствий на прямой линии, выбираем ближайшее к цели
    if (directObstacles.length === 0) {
      let closestIndex = -1
      let minDistance = Number.MAX_VALUE

      for (let i = 0; i < obstacles.length; i++) {
        const obstacle = obstacles[i]
        if (obstacle.isTarget) continue

        const distanceToEnd = Math.sqrt(
          Math.pow(obstacle.position.x - end.x, 2) + Math.pow(obstacle.position.y - end.y, 2)
        )

        if (distanceToEnd < minDistance) {
          minDistance = distanceToEnd
          closestIndex = i
        }
      }

      return closestIndex
    }

    // Сортируем по расстоянию от препятствия до линии
    directObstacles.sort((a, b) => a.distance - b.distance)

    // Возвращаем индекс препятствия с наименьшим расстоянием
    return directObstacles[0].index
  }

  // Очищает прямой путь от старта к цели
  private clearDirectPath(obstacles: Obstacle[], start: Vector2D, end: Vector2D, ballRadius: number): void {
    // Рассчитываем вектор направления
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.sqrt(dx * dx + dy * dy)
    const dirX = dx / length
    const dirY = dy / length

    // Ширина коридора
    const corridorWidth = ballRadius * 4

    // Удаляем препятствия в коридоре
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obstacle = obstacles[i]
      if (obstacle.isTarget) continue // Пропускаем целевую лунку

      // Вычисляем ближайшую точку на линии от препятствия
      const t = Math.max(0, Math.min(length, dirX * (obstacle.position.x - start.x) + dirY * (obstacle.position.y - start.y)))
      const nearestX = start.x + dirX * t
      const nearestY = start.y + dirY * t

      // Расстояние от препятствия до линии
      const distance = Math.sqrt(
        Math.pow(nearestX - obstacle.position.x, 2) + Math.pow(nearestY - obstacle.position.y, 2)
      )

      // Если препятствие внутри коридора, удаляем его
      if (distance < corridorWidth + obstacle.radius) {
        obstacles.splice(i, 1)
      }
    }
  }

  // Отрисовка сетки для отладки
  public debugDrawGrid(ctx: CanvasRenderingContext2D): void {
    // Отрисовываем сетку
    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col < this.grid[0].length; col++) {
        const x = col * this.cellSize
        const y = row * this.cellSize
        const isWalkable = this.grid[row][col]

        ctx.fillStyle = isWalkable ? "rgba(0, 255, 0, 0.1)" : "rgba(255, 0, 0, 0.2)"
        ctx.fillRect(x, y, this.cellSize, this.cellSize)
      }
    }
  }
}