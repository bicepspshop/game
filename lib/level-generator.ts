import { Vector2D } from "./physics"
import { PathFinder } from "./path-finder"

export class Hole {
  constructor(
    public position: Vector2D,
    public radius: number,
    public isTarget = false,
    public isBlocker = false // Добавляем флаг для обозначения блокирующих лунок
  ) {}
}

// Интерфейс для параметров сложности уровня
export interface LevelParams {
  numHoles: number;          // Количество лунок
  targetHoleSize: number;    // Размер целевой лунки (коэффициент)
  gapWidth: number;          // Минимальная ширина проходов
  barrierCount: number;      // Количество лунок в защитном барьере
  minDistanceBetweenHoles: number; // Минимальное расстояние между лунками
  pathfindingIterations: number;   // Количество попыток для поиска пути
}

export class LevelGenerator {
  private holes: Hole[] = []
  private width: number
  private height: number
  private minX: number
  private maxX: number
  private holeRadius: number
  private targetHoleRadius: number
  private safePathNodes: Vector2D[] = [] // Узлы безопасного пути
  private levelParameters: Map<number, LevelParams> = new Map() // Параметры для каждого уровня
  private ballRadius: number = 14 // Радиус шарика для проверки проходимости
  private pathFinder: PathFinder | null = null; // Для поиска пути и проверки проходимости

  constructor(width: number, height: number, minX: number, maxX: number, holeRadius: number) {
    this.width = width
    this.height = height
    this.minX = minX
    this.maxX = maxX
    this.holeRadius = holeRadius
    // Используем более сбалансированный размер целевой лунки
    this.targetHoleRadius = holeRadius * 0.7
    
    // Создаем поисковик путей с ячейками размером 10 пикселей
    this.pathFinder = new PathFinder(width, height, 10);
    
    // Инициализируем параметры для разных уровней
    this.initLevelParameters()
  }
  
  // Инициализация параметров сложности для каждого уровня
  private initLevelParameters(): void {
    // Базовые параметры
    const baseHoles = 6
    const baseTargetSize = 0.7
    const baseGapWidth = 80
    const baseBarrierCount = 4
    const baseDistance = this.holeRadius * 3.0
    
    // Создаем параметры для первых 30 уровней
    for (let level = 1; level <= 30; level++) {
      // Формулы масштабирования с ограничениями для предотвращения резких скачков сложности
      const difficulty = Math.min(0.7, (level - 1) * 0.025) // 0.0 - 0.7
      
      // Вычисляем параметры с плавным масштабированием
      const numHoles = Math.min(baseHoles + Math.floor(level * 0.6), baseHoles + 15)
      const targetHoleSize = Math.max(0.55, baseTargetSize - level * 0.005)
      const gapWidth = Math.max(50, baseGapWidth - level * 1.2)
      const barrierCount = Math.min(baseBarrierCount + Math.floor(level / 3), 8)
      const minDistanceBetweenHoles = Math.max(this.holeRadius * 2.2, baseDistance - level * 0.08)
      const pathfindingIterations = 20 + level * 2
      
      // Сохраняем параметры для этого уровня
      this.levelParameters.set(level, {
        numHoles,
        targetHoleSize,
        gapWidth,
        barrierCount,
        minDistanceBetweenHoles,
        pathfindingIterations
      })
    }
  }

  public generateLevel(level: number): number {
    // Очищаем существующие лунки и пути
    this.holes = []
    this.safePathNodes = []
    
    console.log(`Generating level ${level}`)
    
    // Получаем параметры сложности для этого уровня
    const params = this.getParamsForLevel(level)
    
    // Рассчитываем размеры лунок
    const grayHoleRadius = this.holeRadius * 1.5
    this.targetHoleRadius = this.holeRadius * params.targetHoleSize
    
    console.log(`Level ${level}: target=${params.numHoles} holes, gap=${params.gapWidth}px, target size=${params.targetHoleSize}`)
    
    // Сначала создаем целевую лунку
    const targetHole = this.createTargetHole(level, params.numHoles)
    this.holes.push(targetHole)
    
    // Создаем барьер вокруг целевой лунки с уровня 4
    if (level > 3) {
      this.createProtectiveBarrier(targetHole, level, grayHoleRadius, params.barrierCount)
    }
    
    // Добавляем шаблонные препятствия в зависимости от уровня
    this.addPatternedObstacles(level, grayHoleRadius, params);
    
    // Добавляем оставшиеся случайные лунки
    this.addRandomObstacles(level, grayHoleRadius, params);
    
    // Проверяем проходимость уровня с использованием PathFinder
    const startPosition = new Vector2D(this.width / 2, this.height - 50); // Начальная позиция шарика
    const hasPath = this.checkLevelSolvability(startPosition, targetHole.position, params.gapWidth);
    
    // Если уровень непроходим, упрощаем его
    if (!hasPath) {
      console.log(`Level ${level} not solvable, simplifying...`);
      this.removeBlockingObstacles(startPosition, targetHole.position, params.gapWidth);
    }

    console.log(`Generated ${this.holes.length} holes for level ${level}`)
    
    // Возвращаем индекс целевой лунки (всегда 0, т.к. она добавляется первой)
    return 0;
  }
  
  // Получение параметров для конкретного уровня
  private getParamsForLevel(level: number): LevelParams {
    // Если у нас есть сохраненные параметры, используем их
    if (this.levelParameters.has(level)) {
      return this.levelParameters.get(level)!;
    }
    
    // Иначе используем последний известный уровень или дефолтные значения
    let lastLevel = 0;
    for (const lvl of this.levelParameters.keys()) {
      if (lvl < level && lvl > lastLevel) {
        lastLevel = lvl;
      }
    }
    
    if (lastLevel > 0) {
      const lastParams = this.levelParameters.get(lastLevel)!;
      return {
        numHoles: lastParams.numHoles + 1,
        targetHoleSize: Math.max(0.55, lastParams.targetHoleSize - 0.01),
        gapWidth: Math.max(50, lastParams.gapWidth - 2),
        barrierCount: Math.min(lastParams.barrierCount + 1, 8),
        minDistanceBetweenHoles: Math.max(this.holeRadius * 2.2, lastParams.minDistanceBetweenHoles - 0.1),
        pathfindingIterations: lastParams.pathfindingIterations + 5
      };
    }
    
    // Дефолтные значения для неизвестных уровней
    return {
      numHoles: 6 + level,
      targetHoleSize: 0.7,
      gapWidth: 80,
      barrierCount: 4,
      minDistanceBetweenHoles: this.holeRadius * 2.5,
      pathfindingIterations: 30
    };
  }
  
  // Создаем целевую лунку в зависимости от уровня
  private createTargetHole(level: number, numHoles: number): Hole {
    // Для более высоких уровней размещаем целевую лунку выше, но не слишком близко к краям
    const minY = this.height * 0.15 // Минимальная высота (15% от верха)
    const maxY = this.height * 0.6  // Максимальная высота (60% от верха)
    
    // Чем выше уровень, тем выше целевая лунка, но плавнее чем раньше
    // Максимальная высота достигается на уровне 25 вместо 20
    const levelFactor = Math.min(level / 25, 1) // От 0 до 1
    const y = maxY - levelFactor * (maxY - minY)

    // Ограничиваем размещение у краев на высоких уровнях
    let x;
    // На низких уровнях размещаем в центре, на высоких - равномернее по всей площади
    if (level <= 3) {
      // Для первых уровней делаем цель в центре
      x = this.width / 2;
    } else if (level > 5 && level <= 10) {
      // Средние уровни - частично в стороне
      const side = Math.random() < 0.5 ? -1 : 1;
      x = this.width / 2 + side * this.width * 0.2 * Math.random();
    } else {
      // Высокие уровни - по всей площади, но не слишком близко к краям
      const margin = this.width * 0.2;
      x = this.minX + margin + Math.random() * (this.maxX - this.minX - 2 * margin);
    }

    // Рассчитываем размер целевой лунки - делаем баланс
    // Для высоких уровней уменьшаем, но не слишком
    let targetRadius = this.targetHoleRadius;
    if (level > 15) {
      // Уменьшаем размер максимум на 15%
      const reductionFactor = Math.min(0.15, (level - 15) * 0.01);
      targetRadius *= (1 - reductionFactor);
    }

    return new Hole(new Vector2D(x, y), targetRadius, true);
  }
  
  // Создаем защитный барьер из серых лунок вокруг зеленой
  private createProtectiveBarrier(targetHole: Hole, level: number, grayHoleRadius: number, barrierCount: number): void {
    // Количество лунок в барьере зависит от уровня
    const barrierHoles = Math.min(barrierCount, 8)

    if (barrierHoles <= 0) return

    // Радиус барьера вокруг целевой лунки
    const barrierRadius = targetHole.radius * 3.5 + (level > 15 ? 10 : 20)

    // Создаем лунки по кругу вокруг целевой
    for (let i = 0; i < barrierHoles; i++) {
      // Вычисляем угол для равномерного распределения по кругу
      const angle = (i / barrierHoles) * Math.PI * 2

      // Добавляем случайное отклонение для неравномерности
      const randomOffset = level > 10 ? 0.1 : 0.2 // Меньше случайности на высоких уровнях
      const randomAngle = angle + (Math.random() - 0.5) * randomOffset

      // Вычисляем позицию
      const x = targetHole.position.x + Math.cos(randomAngle) * barrierRadius
      const y = targetHole.position.y + Math.sin(randomAngle) * barrierRadius

      // Проверяем, что лунка находится в пределах игрового поля
      if (x >= this.minX && x <= this.maxX && y >= this.height * 0.1 && y <= this.height * 0.8) {
        const hole = new Hole(new Vector2D(x, y), grayHoleRadius * 0.9, false) // Немного меньше обычных лунок
        this.holes.push(hole)
      }
    }

    // Для высоких уровней добавляем второй ряд барьера
    if (level > 12 && barrierHoles >= 4) {
      // Для уровней выше 12 добавляем второй ряд барьера, но размещаем лунки более разреженно,
      // чтобы оставить проходы для шарика
      const outerBarrierRadius = barrierRadius * 1.5
      const outerBarrierHoles = Math.min(barrierHoles + 1, 6) // Уменьшили с 10 до 6 для уменьшения сложности

      for (let i = 0; i < outerBarrierHoles; i++) {
        const angle = (i / outerBarrierHoles) * Math.PI * 2 + Math.PI / outerBarrierHoles // Смещаем относительно внутреннего круга
        const randomOffset = 0.15 // Увеличили с 0.1 до 0.15 для большей неравномерности
        const randomAngle = angle + (Math.random() - 0.5) * randomOffset

        const x = targetHole.position.x + Math.cos(randomAngle) * outerBarrierRadius
        const y = targetHole.position.y + Math.sin(randomAngle) * outerBarrierRadius

        if (x >= this.minX && x <= this.maxX && y >= this.height * 0.1 && y <= this.height * 0.8) {
          const hole = new Hole(new Vector2D(x, y), grayHoleRadius * 0.85, false)
          this.holes.push(hole)
        }
      }
    }
  }
  
  // Добавление шаблонных препятствий в зависимости от уровня
  private addPatternedObstacles(level: number, holeRadius: number, params: LevelParams): void {
    // Выбираем шаблон на основе уровня
    const patternIndex = (level - 1) % 7; // 7 разных шаблонов
    
    // Оставляем первый уровень без шаблонов, чтобы игрок мог освоиться
    if (level == 1) return;
    
    switch (patternIndex) {
      case 0: // Ступенчатый ряд лунок
        this.createStaggeredRow(this.height * 0.5, holeRadius, params);
        break;
        
      case 1: // Два симметричных ряда
        this.createSymmetricalRows(this.height * 0.4, this.height * 0.6, holeRadius, params);
        break;
        
      case 2: // Зигзагообразный паттерн
        this.createZigzagPattern(this.height * 0.3, this.height * 0.7, holeRadius, params);
        break;
        
      case 3: // Кластер в центре
        this.createCentralCluster(holeRadius, params);
        break;
        
      case 4: // Ворота с препятствиями по бокам
        this.createGatePattern(this.height * 0.5, holeRadius, params);
        break;
        
      case 5: // Маятниковый паттерн - лунки расположены в форме маятника
        this.createPendulumPattern(holeRadius, params);
        break;
        
      case 6: // Спиральный паттерн
        this.createSpiralPattern(holeRadius, params);
        break;
    }
  }
  
  // Создание ступенчатого ряда лунок
  private createStaggeredRow(centerY: number, holeRadius: number, params: LevelParams): void {
    // Расстояние между лунками
    const spacing = holeRadius * 3
    const numInRow = Math.floor((this.maxX - this.minX) / spacing) - 1
    const yOffset = 30
    
    // Создаем два ряда со смещением в шахматном порядке
    for (let i = 0; i < numInRow; i += 2) {
      const x = this.minX + spacing + i * spacing
      this.addHoleIfValid(new Vector2D(x, centerY - yOffset), holeRadius, false, params)
    }
    
    for (let i = 1; i < numInRow; i += 2) {
      const x = this.minX + spacing + i * spacing
      this.addHoleIfValid(new Vector2D(x, centerY + yOffset), holeRadius, false, params)
    }
  }
  
  // Создание двух симметричных рядов
  private createSymmetricalRows(topY: number, bottomY: number, holeRadius: number, params: LevelParams): void {
    const spacing = holeRadius * 4
    const numInRow = Math.floor((this.maxX - this.minX) / spacing) - 1
    
    for (let i = 0; i < numInRow; i++) {
      const x = this.minX + spacing + i * spacing
      // Создаем симметричные лунки в верхнем и нижнем ряду, но со смещением
      // Верхний ряд
      if (i % 2 === 0) {
        this.addHoleIfValid(new Vector2D(x, topY), holeRadius, false, params)
      }
      // Нижний ряд
      if (i % 2 === 1) {
        this.addHoleIfValid(new Vector2D(x, bottomY), holeRadius, false, params)
      }
    }
  }
  
  // Создание зигзагообразного паттерна
  private createZigzagPattern(topY: number, bottomY: number, holeRadius: number, params: LevelParams): void {
    const numPoints = 5
    const xStep = (this.maxX - this.minX) / (numPoints - 1)
    const midY = (topY + bottomY) / 2
    const amplitude = (bottomY - topY) / 2
    
    // Создаем зигзаг из лунок
    for (let i = 0; i < numPoints; i++) {
      const x = this.minX + i * xStep
      const y = midY + amplitude * Math.sin(i * Math.PI)
      this.addHoleIfValid(new Vector2D(x, y), holeRadius, false, params)
    }
  }
  
  // Создание кластера лунок в центре
  private createCentralCluster(holeRadius: number, params: LevelParams): void {
    const centerX = (this.minX + this.maxX) / 2
    const centerY = this.height * 0.5
    const radius = this.width * 0.15
    const numHoles = Math.min(6, params.numHoles / 3)
    
    // Создаем лунки по кругу
    for (let i = 0; i < numHoles; i++) {
      const angle = (i / numHoles) * Math.PI * 2
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius
      this.addHoleIfValid(new Vector2D(x, y), holeRadius, false, params)
    }
  }
  
  // Создание паттерна ворот с препятствиями по бокам
  private createGatePattern(gateY: number, holeRadius: number, params: LevelParams): void {
    const centerX = (this.minX + this.maxX) / 2
    const gateWidth = params.gapWidth * 1.5
    
    // Создаем лунки слева от ворот
    let x = this.minX + holeRadius * 2
    while (x < centerX - gateWidth / 2) {
      this.addHoleIfValid(new Vector2D(x, gateY), holeRadius, false, params)
      x += holeRadius * 3
    }
    
    // Создаем лунки справа от ворот
    x = centerX + gateWidth / 2
    while (x < this.maxX - holeRadius * 2) {
      this.addHoleIfValid(new Vector2D(x, gateY), holeRadius, false, params)
      x += holeRadius * 3
    }
  }
  
  // Создание маятникового паттерна
  private createPendulumPattern(holeRadius: number, params: LevelParams): void {
    const centerX = (this.minX + this.maxX) / 2
    const numPoints = 5
    const stepY = this.height * 0.6 / numPoints
    const startY = this.height * 0.2
    
    for (let i = 0; i < numPoints; i++) {
      const y = startY + i * stepY
      const offsetX = Math.sin(i * Math.PI / 2) * this.width * 0.3
      this.addHoleIfValid(new Vector2D(centerX + offsetX, y), holeRadius, false, params)
    }
  }
  
  // Создание спирального паттерна
  private createSpiralPattern(holeRadius: number, params: LevelParams): void {
    const centerX = (this.minX + this.maxX) / 2
    const centerY = this.height * 0.5
    const numPoints = 8
    const maxRadius = this.width * 0.3
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 4
      const radius = (i / numPoints) * maxRadius
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius
      this.addHoleIfValid(new Vector2D(x, y), holeRadius, false, params)
    }
  }
  
  // Добавление случайных препятствий
  private addRandomObstacles(level: number, holeRadius: number, params: LevelParams): void {
    // Определяем, сколько еще лунок надо добавить
    const targetCount = params.numHoles;
    const remainingHoles = Math.max(0, targetCount - this.holes.length);
    let attempts = 0;
    const maxAttempts = 1000;
    
    console.log(`Adding ${remainingHoles} random obstacles`);
    
    while (this.holes.length < targetCount && attempts < maxAttempts) {
      attempts++;
      
      // Генерируем случайную позицию
      const x = this.minX + Math.random() * (this.maxX - this.minX);
      
      // Распределяем лунки по высоте в зависимости от уровня
      let y;
      if (level > 10 && Math.random() < 0.7) {
        // Увеличиваем шанс появления лунок в верхней части экрана
        y = this.height * 0.1 + Math.random() * (this.height * 0.4);
      } else {
        y = this.height * 0.1 + Math.random() * (this.height * 0.7);
      }
      
      this.addHoleIfValid(new Vector2D(x, y), holeRadius, false, params);
    }
  }
  
  // Добавление лунки, если она не перекрывается с существующими
  private addHoleIfValid(position: Vector2D, radius: number, isTarget: boolean, params: LevelParams): boolean {
    if (position.x < this.minX || position.x > this.maxX || position.y < this.height * 0.05 || position.y > this.height * 0.9) {
      return false;
    }
    
    // Проверяем расстояние до других лунок
    for (const hole of this.holes) {
      const distance = Vector2D.distance(position, hole.position);
      const minDistance = hole.isTarget
        ? this.targetHoleRadius + radius + 10 // Дополнительный отступ от целевой лунки
        : params.minDistanceBetweenHoles;
        
      if (distance < minDistance) {
        return false;
      }
    }
    
    // Создаем новую лунку
    const hole = new Hole(position, radius, isTarget);
    this.holes.push(hole);
    return true;
  }
  
  // Проверка проходимости уровня и создание безопасного пути
  private checkLevelSolvability(start: Vector2D, target: Vector2D, minPathWidth: number): boolean {
    console.log(`Checking level solvability with minPathWidth=${minPathWidth}px...`);
    if (!this.pathFinder) return false;
    
    // Преобразуем лунки в препятствия для PathFinder
    const obstacles = this.holes.map(hole => ({
      position: hole.position,
      radius: hole.radius,
      isTarget: hole.isTarget
    }));
    
    // Обновляем сетку проходимости
    this.pathFinder.updateGrid(obstacles);
    
    // Проверяем, существует ли путь с учетом минимальной ширины коридора
    const hasSafePath = this.pathFinder.validateCorridor(start, target, minPathWidth);
    
    if (hasSafePath) {
      console.log("Level is solvable!");
      
      // Дополнительно находим и сохраняем путь для отладки
      const path = this.pathFinder.findPath(start, target);
      if (path) {
        this.safePathNodes = path;
      }
      return true;
    }
    
    console.log("Level is not solvable!");
    return false;
  }
  
  // Удаление блокирующих препятствий для обеспечения проходимости уровня
  private removeBlockingObstacles(start: Vector2D, target: Vector2D, minPathWidth: number): void {
    console.log("Removing blocking obstacles to ensure level solvability...");
    if (!this.pathFinder) return;
    
    // Преобразуем лунки в препятствия для PathFinder
    const obstacles = this.holes.map(hole => ({
      position: hole.position,
      radius: hole.radius,
      isTarget: hole.isTarget
    }));
    
    // Создаем безопасный путь, удаляя блокирующие препятствия
    const safeObstacles = this.pathFinder.createSafePath(start, target, this.ballRadius, obstacles);
    
    // Обновляем список лунок
    this.holes = safeObstacles.map(o => new Hole(o.position, o.radius, o.isTarget || false, false));
    
    console.log(`Removed ${obstacles.length - safeObstacles.length} blocking obstacles to create safe path`);
    
    // Находим и сохраняем новый безопасный путь
    this.pathFinder.updateGrid(safeObstacles);
    const path = this.pathFinder.findPath(start, target);
    if (path) {
      this.safePathNodes = path;
    }
  }
  
  // Проверка столкновения шарика с лунками
  public checkBallCollision(ballPosition: Vector2D, ballRadius: number): number | null {
    // Check for collisions with all holes
    for (let i = 0; i < this.holes.length; i++) {
      const hole = this.holes[i]
      const distance = Vector2D.distance(ballPosition, hole.position)

      // Используем разные пороги для обычных и целевых лунок
      // Для целевых лунок делаем более точное попадание
      const collisionThreshold = hole.isTarget
        ? hole.radius + ballRadius * 0.3 // Уменьшено с 0.5 до 0.3 для большей сложности
        : hole.radius - ballRadius * 0.3

      if (distance < collisionThreshold) {
        return i
      }
    }

    return null
  }

  // Рендеринг лунок и безопасного пути (для отладки)
  public render(ctx: CanvasRenderingContext2D): void {
    // Рисуем безопасный путь (если включена отладка)
    if (this.safePathNodes.length > 0 && false) { // Установите в true для отладки
      ctx.strokeStyle = "rgba(0, 255, 0, 0.3)"
      ctx.lineWidth = 2
      ctx.beginPath()
      
      const startNode = this.safePathNodes[0]
      ctx.moveTo(startNode.x, startNode.y)
      
      for (let i = 1; i < this.safePathNodes.length; i++) {
        const node = this.safePathNodes[i]
        ctx.lineTo(node.x, node.y)
      }
      
      ctx.stroke()
    }
    
    // Сначала рисуем обычные лунки
    for (const hole of this.holes) {
      if (!hole.isTarget) {
        ctx.fillStyle = "#4b5563"
        ctx.beginPath()
        ctx.arc(hole.position.x, hole.position.y, hole.radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Затем рисуем целевую лунку поверх остальных
    for (const hole of this.holes) {
      if (hole.isTarget) {
        // Рисуем подсветку для целевой лунки
        ctx.strokeStyle = "#34d399"
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(hole.position.x, hole.position.y, hole.radius + 5, 0, Math.PI * 2)
        ctx.stroke()

        // Рисуем саму целевую лунку
        ctx.fillStyle = "#10b981"
        ctx.beginPath()
        ctx.arc(hole.position.x, hole.position.y, hole.radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    
    // Отрисовка сетки проходимости для отладки
    if (this.pathFinder && false) { // Установите в true для отладки
      this.pathFinder.debugDrawGrid(ctx);
    }
  }
}