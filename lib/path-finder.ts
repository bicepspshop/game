import { Vector2D } from "./physics";

export interface GridNode {
  x: number;
  y: number;
  f: number;
  g: number;
  h: number;
  walkable: boolean;
  parent: GridNode | null;
}

// Класс для создания и проверки сетки проходимости уровня
export class PathFinder {
  private grid: GridNode[][];
  private openSet: GridNode[];
  private closedSet: GridNode[];
  private gridSizeX: number;
  private gridSizeY: number;
  private cellSize: number;

  constructor(width: number, height: number, cellSize: number) {
    this.cellSize = cellSize;
    this.gridSizeX = Math.ceil(width / cellSize);
    this.gridSizeY = Math.ceil(height / cellSize);
    this.grid = [];
    this.openSet = [];
    this.closedSet = [];
    
    // Инициализируем сетку проходимости
    this.initGrid();
  }
  
  // Инициализация сетки
  private initGrid(): void {
    for (let y = 0; y < this.gridSizeY; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridSizeX; x++) {
        this.grid[y][x] = {
          x,
          y,
          f: 0,
          g: 0,
          h: 0,
          walkable: true,
          parent: null
        };
      }
    }
  }
  
  // Обновление проходимости ячеек сетки на основе препятствий
  public updateGrid(obstacles: Array<{position: Vector2D, radius: number}>): void {
    // Сначала сбрасываем всю сетку
    this.initGrid();
    
    // Затем отмечаем непроходимые ячейки
    for (const obstacle of obstacles) {
      // Расширяем радиус препятствия для учета размера шарика
      const safeRadius = obstacle.radius * 1.2;
      
      // Преобразуем координаты препятствия в ячейки сетки
      const centerX = Math.floor(obstacle.position.x / this.cellSize);
      const centerY = Math.floor(obstacle.position.y / this.cellSize);
      
      // Расчет радиуса в ячейках сетки
      const cellRadius = Math.ceil(safeRadius / this.cellSize);
      
      // Отмечаем ячейки в пределах радиуса как непроходимые
      for (let y = centerY - cellRadius; y <= centerY + cellRadius; y++) {
        for (let x = centerX - cellRadius; x <= centerX + cellRadius; x++) {
          if (y >= 0 && y < this.gridSizeY && x >= 0 && x < this.gridSizeX) {
            // Проверяем расстояние от центра препятствия до центра ячейки
            const dx = (x + 0.5) * this.cellSize - obstacle.position.x;
            const dy = (y + 0.5) * this.cellSize - obstacle.position.y;
            const distSq = dx * dx + dy * dy;
            
            if (distSq <= safeRadius * safeRadius) {
              this.grid[y][x].walkable = false;
            }
          }
        }
      }
    }
  }
  
  // Эвристическая функция расстояния для A*
  private heuristic(a: GridNode, b: GridNode): number {
    // Манхэттенское расстояние
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
  
  // Алгоритм A* для поиска пути
  public findPath(startPos: Vector2D, endPos: Vector2D): Vector2D[] | null {
    this.openSet = [];
    this.closedSet = [];
    
    // Преобразуем координаты в индексы сетки
    const startX = Math.floor(startPos.x / this.cellSize);
    const startY = Math.floor(startPos.y / this.cellSize);
    const endX = Math.floor(endPos.x / this.cellSize);
    const endY = Math.floor(endPos.y / this.cellSize);
    
    // Проверяем, что начальная и конечная точки находятся в пределах сетки
    if (startX < 0 || startX >= this.gridSizeX || startY < 0 || startY >= this.gridSizeY ||
        endX < 0 || endX >= this.gridSizeX || endY < 0 || endY >= this.gridSizeY) {
      return null;
    }
    
    // Получаем узлы начала и конца
    const startNode = this.grid[startY][startX];
    const endNode = this.grid[endY][endX];
    
    // Проверяем, что начальный и конечный узлы проходимы
    if (!startNode.walkable || !endNode.walkable) {
      return null;
    }
    
    // Инициализируем начальный узел
    startNode.g = 0;
    startNode.h = this.heuristic(startNode, endNode);
    startNode.f = startNode.g + startNode.h;
    
    // Добавляем начальный узел в открытый список
    this.openSet.push(startNode);
    
    // Направления движения (8 направлений)
    const dirs = [
      {x: 0, y: -1}, // вверх
      {x: 1, y: -1}, // вверх-вправо
      {x: 1, y: 0},  // вправо
      {x: 1, y: 1},  // вниз-вправо
      {x: 0, y: 1},  // вниз
      {x: -1, y: 1}, // вниз-влево
      {x: -1, y: 0}, // влево
      {x: -1, y: -1} // вверх-влево
    ];
    
    // Основной цикл A*
    while (this.openSet.length > 0) {
      // Находим узел с наименьшей оценкой f в открытом списке
      let lowestIndex = 0;
      for (let i = 0; i < this.openSet.length; i++) {
        if (this.openSet[i].f < this.openSet[lowestIndex].f) {
          lowestIndex = i;
        }
      }
      
      // Текущий обрабатываемый узел
      const currentNode = this.openSet[lowestIndex];
      
      // Если достигли конечного узла, восстанавливаем и возвращаем путь
      if (currentNode === endNode) {
        return this.reconstructPath(endNode);
      }
      
      // Удаляем текущий узел из открытого списка и добавляем в закрытый
      this.openSet.splice(lowestIndex, 1);
      this.closedSet.push(currentNode);
      
      // Проверяем всех соседей
      for (const dir of dirs) {
        const x = currentNode.x + dir.x;
        const y = currentNode.y + dir.y;
        
        // Проверяем, что сосед находится в пределах сетки
        if (x < 0 || x >= this.gridSizeX || y < 0 || y >= this.gridSizeY) {
          continue;
        }
        
        const neighbor = this.grid[y][x];
        
        // Пропускаем непроходимые узлы и узлы из закрытого списка
        if (!neighbor.walkable || this.closedSet.includes(neighbor)) {
          continue;
        }
        
        // Рассчитываем стоимость пути через текущий узел
        // Диагональное движение стоит больше
        const isDiagonal = dir.x !== 0 && dir.y !== 0;
        const moveCost = isDiagonal ? 1.4142 : 1.0; // sqrt(2) для диагоналей
        const tentativeG = currentNode.g + moveCost;
        
        // Если сосед уже в открытом списке и новый путь хуже, пропускаем
        if (this.openSet.includes(neighbor) && tentativeG >= neighbor.g) {
          continue;
        }
        
        // Этот путь лучше, обновляем соседа
        neighbor.parent = currentNode;
        neighbor.g = tentativeG;
        neighbor.h = this.heuristic(neighbor, endNode);
        neighbor.f = neighbor.g + neighbor.h;
        
        // Если сосед еще не в открытом списке, добавляем его
        if (!this.openSet.includes(neighbor)) {
          this.openSet.push(neighbor);
        }
      }
    }
    
    // Путь не найден
    return null;
  }
  
  // Восстановление пути от конечного узла к начальному
  private reconstructPath(endNode: GridNode): Vector2D[] {
    const path: Vector2D[] = [];
    let currentNode: GridNode | null = endNode;
    
    while (currentNode) {
      // Преобразуем сеточные координаты обратно в мировые
      const x = (currentNode.x + 0.5) * this.cellSize;
      const y = (currentNode.y + 0.5) * this.cellSize;
      path.unshift(new Vector2D(x, y));
      
      currentNode = currentNode.parent;
    }
    
    return path;
  }
  
  // Проверка существования коридора заданной ширины
  public validateCorridor(startPos: Vector2D, endPos: Vector2D, minWidth: number): boolean {
    // Обновляем размер ячейки для учета минимальной ширины коридора
    const cellSize = Math.min(this.cellSize, minWidth / 2);
    const pathFinder = new PathFinder(this.gridSizeX * this.cellSize, this.gridSizeY * this.cellSize, cellSize);
    
    // Создаем список препятствий с уменьшенными размерами, чтобы учесть минимальную ширину коридора
    const obstacles: Array<{position: Vector2D, radius: number}> = [];
    for (let y = 0; y < this.gridSizeY; y++) {
      for (let x = 0; x < this.gridSizeX; x++) {
        const node = this.grid[y][x];
        if (!node.walkable) {
          const pos = new Vector2D((x + 0.5) * this.cellSize, (y + 0.5) * this.cellSize);
          obstacles.push({
            position: pos,
            radius: minWidth / 2
          });
        }
      }
    }
    
    // Обновляем сетку с учетом минимальной ширины коридора
    pathFinder.updateGrid(obstacles);
    
    // Проверяем, существует ли путь
    const path = pathFinder.findPath(startPos, endPos);
    return path !== null && path.length > 0;
  }
  
  // Упрощенная проверка проходимости с использованием лучей
  public rayCast(startPos: Vector2D, endPos: Vector2D, ballRadius: number): boolean {
    // Преобразуем координаты в индексы сетки
    const startX = Math.floor(startPos.x / this.cellSize);
    const startY = Math.floor(startPos.y / this.cellSize);
    const endX = Math.floor(endPos.x / this.cellSize);
    const endY = Math.floor(endPos.y / this.cellSize);
    
    // Алгоритм Брезенхема для построения линии
    const dx = Math.abs(endX - startX);
    const dy = Math.abs(endY - startY);
    const sx = startX < endX ? 1 : -1;
    const sy = startY < endY ? 1 : -1;
    let err = dx - dy;
    
    let x = startX;
    let y = startY;
    
    while (x !== endX || y !== endY) {
      // Проверяем, что ячейка проходима
      if (y >= 0 && y < this.gridSizeY && x >= 0 && x < this.gridSizeX) {
        if (!this.grid[y][x].walkable) {
          return false;
        }
      } else {
        return false;
      }
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    
    // Проверяем конечную точку
    if (endY >= 0 && endY < this.gridSizeY && endX >= 0 && endX < this.gridSizeX) {
      return this.grid[endY][endX].walkable;
    }
    
    return false;
  }
  
  // Создание безопасного пути от начала к концу путем удаления препятствий
  public createSafePath(startPos: Vector2D, endPos: Vector2D, ballRadius: number, obstacles: Array<{position: Vector2D, radius: number, isTarget?: boolean}>): Array<{position: Vector2D, radius: number, isTarget?: boolean}> {
    // Найдем прямой путь от начала к концу
    const pathLength = Vector2D.distance(startPos, endPos);
    const stepCount = Math.ceil(pathLength / (ballRadius * 2));
    const safeNodes: Vector2D[] = [];
    
    // Создаем равномерно распределенные узлы на пути
    for (let i = 0; i <= stepCount; i++) {
      const t = i / stepCount;
      const x = startPos.x + (endPos.x - startPos.x) * t;
      const y = startPos.y + (endPos.y - startPos.y) * t;
      safeNodes.push(new Vector2D(x, y));
    }
    
    // Фильтруем препятствия, оставляя только те, которые не блокируют путь
    const safeObstacles = obstacles.filter(obstacle => {
      // Целевую лунку всегда сохраняем
      if (obstacle.isTarget) return true;
      
      // Проверяем, не блокирует ли препятствие путь
      for (const node of safeNodes) {
        const distance = Vector2D.distance(node, obstacle.position);
        if (distance < obstacle.radius + ballRadius) {
          return false; // Препятствие блокирует путь
        }
      }
      
      return true; // Препятствие не блокирует путь
    });
    
    return safeObstacles;
  }
  
  // Визуализация сетки проходимости для отладки
  public debugDrawGrid(ctx: CanvasRenderingContext2D): void {
    for (let y = 0; y < this.gridSizeY; y++) {
      for (let x = 0; x < this.gridSizeX; x++) {
        const node = this.grid[y][x];
        
        ctx.fillStyle = node.walkable ? "rgba(0, 255, 0, 0.2)" : "rgba(255, 0, 0, 0.4)";
        ctx.fillRect(
          x * this.cellSize,
          y * this.cellSize,
          this.cellSize,
          this.cellSize
        );
        
        ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
        ctx.strokeRect(
          x * this.cellSize,
          y * this.cellSize,
          this.cellSize,
          this.cellSize
        );
      }
    }
  }
}