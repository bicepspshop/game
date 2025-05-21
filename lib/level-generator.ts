import { Vector2D } from "./physics"
import { PathFinder } from "./path-finder"
import { PolygonObstacle } from "./polygon-obstacle"

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
  private polygonObstacles: PolygonObstacle[] = [] // Новые полигональные препятствия
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
  private usePolygonObstacles: boolean = false // Флаг для использования полигональных препятствий

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
  
  // Шаблоны и методы расположения отверстий на основе аркадной версии
  private levelTemplates = [
    {
      name: "Вертикальные ворота",
      minLevel: 1,
      maxLevel: 7,
      generateHoles: (width: number, height: number, level: number, holeRadius: number): Vector2D[] => {
        const points: Vector2D[] = [];
        const gateWidth = width * 0.4;
        const gateHeight = height * 0.4;
        
        const leftGateX = width / 2 - gateWidth / 2;
        const rightGateX = width / 2 + gateWidth / 2;
        const gateY = height * 0.3;
        
        // Количество отверстий в каждой вертикальной линии
        const numHoles = 3 + Math.min(3, Math.floor(level / 2));
        
        // Создаем левую и правую вертикальные линии отверстий
        for (let i = 0; i < numHoles; i++) {
          const y = gateY + (gateHeight / (numHoles - 1)) * i;
          
          points.push(new Vector2D(leftGateX, y));
          points.push(new Vector2D(rightGateX, y));
        }
        
        return points;
      },
      getTargetPosition: (width: number, height: number): Vector2D => {
        return new Vector2D(width / 2, height * 0.65);
      }
    },
    {
      name: "Диагональный каскад",
      minLevel: 4,
      maxLevel: 12,
      generateHoles: (width: number, height: number, level: number, holeRadius: number): Vector2D[] => {
        const points: Vector2D[] = [];
        const numHoles = 5 + Math.min(3, Math.floor((level - 4) / 3));
        
        // Направление меняется в зависимости от уровня
        const leftToRight = level % 2 === 0;
        const startX = leftToRight ? width * 0.2 : width * 0.8;
        const startY = height * 0.2;
        
        const stepX = (width * 0.6) / (numHoles - 1) * (leftToRight ? 1 : -1);
        const stepY = (height * 0.5) / (numHoles - 1);
        
        for (let i = 0; i < numHoles; i++) {
          points.push(new Vector2D(
            startX + stepX * i,
            startY + stepY * i
          ));
        }
        
        return points;
      },
      getTargetPosition: (width: number, height: number): Vector2D => {
        return new Vector2D(width / 2, height * 0.7);
      }
    },
    {
      name: "Зигзагообразный коридор",
      minLevel: 8,
      maxLevel: 18,
      generateHoles: (width: number, height: number, level: number, holeRadius: number): Vector2D[] => {
        const points: Vector2D[] = [];
        const numZigs = 3 + Math.min(3, Math.floor((level - 8) / 3));
        
        const startX = width * 0.2;
        const endX = width * 0.8;
        const startY = height * 0.3;
        
        const xStep = (endX - startX) / (numZigs - 1);
        const amplitude = height * (0.15 + (level - 8) * 0.01);
        
        for (let i = 0; i < numZigs; i++) {
          const x = startX + i * xStep;
          const y = startY + (i % 2 === 0 ? 0 : amplitude);
          
          // Добавляем основные точки зигзага
          points.push(new Vector2D(x, y));
          
          // На высоких уровнях добавляем дополнительные отверстия вокруг основных точек
          if (level > 12) {
            points.push(new Vector2D(x - width * 0.05, y - height * 0.05));
            points.push(new Vector2D(x + width * 0.05, y - height * 0.05));
          }
        }
        
        return points;
      },
      getTargetPosition: (width: number, height: number): Vector2D => {
        return new Vector2D(width / 2, height * 0.7);
      }
    },
    {
      name: "Защитный барьер",
      minLevel: 13,
      maxLevel: 25,
      generateHoles: (width: number, height: number, level: number, holeRadius: number): Vector2D[] => {
        const centerX = width / 2;
        const centerY = height * 0.35;
        const points: Vector2D[] = [];
        
        const radius = width * 0.15;
        const numHoles = 6 + Math.min(4, Math.floor((level - 13) / 2));
        
        for (let i = 0; i < numHoles; i++) {
          const angle = (i / numHoles) * Math.PI * 2;
          
          // Создаем разрыв в барьере для возможности прохода
          const gapAngle = Math.PI / 2; // Разрыв внизу (для входа снизу)
          const gapWidth = Math.PI / (4 + (level - 13) * 0.1);
          
          // Пропускаем создание отверстия, если оно в зоне разрыва
          if (Math.abs(angle - gapAngle) < gapWidth) continue;
          
          points.push(new Vector2D(
            centerX + Math.cos(angle) * radius,
            centerY + Math.sin(angle) * radius
          ));
        }
        
        return points;
      },
      getTargetPosition: (width: number, height: number): Vector2D => {
        return new Vector2D(width / 2, height * 0.35);
      }
    },
    {
      name: "Кольцевой кластер",
      minLevel: 19,
      maxLevel: 30,
      generateHoles: (width: number, height: number, level: number, holeRadius: number): Vector2D[] => {
        const centerX = width / 2;
        const centerY = height * 0.4;
        const points: Vector2D[] = [];
        
        const radius = width * 0.2 + (level - 19) * 2;
        const numHoles = 8 + Math.min(4, Math.floor((level - 19) / 2));
        
        for (let i = 0; i < numHoles; i++) {
          const angle = (i / numHoles) * Math.PI * 2;
          const randomOffset = (Math.random() - 0.5) * 0.1;
          const randomAngle = angle + randomOffset;
          
          points.push(new Vector2D(
            centerX + Math.cos(randomAngle) * radius,
            centerY + Math.sin(randomAngle) * radius
          ));
        }
        
        return points;
      },
      getTargetPosition: (width: number, height: number): Vector2D => {
        return new Vector2D(width / 2, height * 0.4);
      }
    }
  ];

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
    this.polygonObstacles = []
    this.safePathNodes = []
    
    console.log(`Generating level ${level}`)
    
    // Получаем параметры сложности для этого уровня
    const params = this.getParamsForLevel(level)
    
    // Рассчитываем размеры лунок
    const grayHoleRadius = this.holeRadius * 1.5
    this.targetHoleRadius = this.holeRadius * params.targetHoleSize
    
    console.log(`Level ${level}: target=${params.numHoles} holes, gap=${params.gapWidth}px, target size=${params.targetHoleSize}`)
    
    // Определяем, используем ли полигональные препятствия
    // Начинаем использовать их с 4 уровня
    this.usePolygonObstacles = level >= 4;
    
    // Сначала создаем целевую лунку
    const targetHole = this.createTargetHole(level, params.numHoles);
    this.holes.push(targetHole);
    
    // Создаем барьер вокруг целевой лунки с уровня 4
    if (level > 3) {
      this.createProtectiveBarrier(targetHole, level, grayHoleRadius, params.barrierCount);
    }
    
    // Добавляем шаблонные препятствия в зависимости от уровня
    this.addPatternedObstacles(level, grayHoleRadius, params);
    
    // Добавляем случайные лунки для заполнения до нужного количества
    this.addRandomObstacles(level, grayHoleRadius, params);
    
    // Проверяем проходимость уровня с использованием PathFinder
    const startPosition = new Vector2D(this.width / 2, this.height - 50); // Начальная позиция шарика
    const hasPath = this.checkLevelSolvability(startPosition, this.holes[0].position, params.gapWidth);
    
    // Если уровень непроходим, упрощаем его
    if (!hasPath) {
      console.log(`Level ${level} not solvable, simplifying...`);
      this.removeBlockingObstacles(startPosition, this.holes[0].position, params.gapWidth);
    }

    console.log(`Generated ${this.holes.length} holes and ${this.polygonObstacles.length} polygon obstacles for level ${level}`);
    
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
    
    // Если используем полигоны и уровень выше определенного значения, создаем полигональную целевую лунку
    if (this.usePolygonObstacles && level > 8) {
      // Создаем полигональную целевую лунку
      const targetPosition = new Vector2D(x, y);
      const targetObstacle = PolygonObstacle.createShape(targetPosition, 'circle', targetRadius, true);
      this.polygonObstacles.push(targetObstacle);
      
      // Мы все равно возвращаем фиктивную круглую лунку для совместимости
      return new Hole(targetPosition, 0.1, true);
    }

    return new Hole(new Vector2D(x, y), targetRadius, true);
  }
  
  // Создаем защитный барьер из серых лунок вокруг зеленой
  private createProtectiveBarrier(targetHole: Hole, level: number, holeRadius: number, barrierCount: number): void {
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
      const position = new Vector2D(x, y);

      // Проверяем, что лунка находится в пределах игрового поля
      if (x >= this.minX && x <= this.maxX && y >= this.height * 0.1 && y <= this.height * 0.8) {
        // Используем полигональные препятствия с уровня 5 и с вероятностью 70%
        if (this.usePolygonObstacles && level >= 5 && Math.random() < 0.7) {
          // Создаем полигональное препятствие
          const shapeTypes = ['triangle', 'square', 'diamond', 'trapezoid', 'hexagon', 'blob'];
          const randomType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
          const obstacle = PolygonObstacle.createShape(position, randomType, holeRadius * 0.9, false);
          this.polygonObstacles.push(obstacle);
        } else {
          // Создаем обычную круглую лунку
          const hole = new Hole(position, holeRadius * 0.9, false);
          this.holes.push(hole);
        }
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
        const position = new Vector2D(x, y);

        if (x >= this.minX && x <= this.maxX && y >= this.height * 0.1 && y <= this.height * 0.8) {
          // Используем полигональные препятствия с вероятностью 85% на высоких уровнях
          if (this.usePolygonObstacles && Math.random() < 0.85) {
            // Предпочитаем более сложные формы для внешнего барьера
            const shapeTypes = ['trapezoid', 'hexagon', 'blob'];
            const randomType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
            const obstacle = PolygonObstacle.createShape(position, randomType, holeRadius * 0.85, false);
            this.polygonObstacles.push(obstacle);
          } else {
            const hole = new Hole(position, holeRadius * 0.85, false);
            this.holes.push(hole);
          }
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
      this.addObstacleIfValid(new Vector2D(x, centerY - yOffset), holeRadius, false, params)
    }
    
    for (let i = 1; i < numInRow; i += 2) {
      const x = this.minX + spacing + i * spacing
      this.addObstacleIfValid(new Vector2D(x, centerY + yOffset), holeRadius, false, params)
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
        this.addObstacleIfValid(new Vector2D(x, topY), holeRadius, false, params)
      }
      // Нижний ряд
      if (i % 2 === 1) {
        this.addObstacleIfValid(new Vector2D(x, bottomY), holeRadius, false, params)
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
      this.addObstacleIfValid(new Vector2D(x, y), holeRadius, false, params)
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
      this.addObstacleIfValid(new Vector2D(x, y), holeRadius, false, params)
    }
  }
  
  // Создание паттерна ворот с препятствиями по бокам
  private createGatePattern(gateY: number, holeRadius: number, params: LevelParams): void {
    const centerX = (this.minX + this.maxX) / 2
    const gateWidth = params.gapWidth * 1.5
    
    // Создаем лунки слева от ворот
    let x = this.minX + holeRadius * 2
    while (x < centerX - gateWidth / 2) {
      this.addObstacleIfValid(new Vector2D(x, gateY), holeRadius, false, params)
      x += holeRadius * 3
    }
    
    // Создаем лунки справа от ворот
    x = centerX + gateWidth / 2
    while (x < this.maxX - holeRadius * 2) {
      this.addObstacleIfValid(new Vector2D(x, gateY), holeRadius, false, params)
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
      this.addObstacleIfValid(new Vector2D(centerX + offsetX, y), holeRadius, false, params)
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
      this.addObstacleIfValid(new Vector2D(x, y), holeRadius, false, params)
    }
  }
  
  // Общий метод для добавления препятствий (круглых или полигональных)
  private addObstacleIfValid(position: Vector2D, radius: number, isTarget: boolean, params: LevelParams): boolean {
    // Используем полигональные препятствия с вероятностью 70% если включен соответствующий режим
    if (this.usePolygonObstacles && Math.random() < 0.7) {
      return this.addPolygonObstacleIfValid(position, radius, isTarget, params);
    } else {
      return this.addHoleIfValid(position, radius, isTarget, params);
    }
  }
  
  // Добавление случайных препятствий
  private addRandomObstacles(level: number, holeRadius: number, params: LevelParams): void {
    // Определяем, сколько еще лунок надо добавить
    const targetCount = params.numHoles;
    const totalObstaclesCount = this.holes.length + this.polygonObstacles.length;
    const remainingHoles = Math.max(0, targetCount - totalObstaclesCount);
    let attempts = 0;
    const maxAttempts = 1000;
    
    console.log(`Adding ${remainingHoles} random obstacles`);
    
    while ((this.holes.length + this.polygonObstacles.length) < targetCount && attempts < maxAttempts) {
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
      
      const position = new Vector2D(x, y);
      
      // Если используем полигональные препятствия, то с вероятностью 70% создаём полигон
      if (this.usePolygonObstacles && Math.random() < 0.7) {
        this.addPolygonObstacleIfValid(position, holeRadius, false, params);
      } else {
        this.addHoleIfValid(position, holeRadius, false, params);
      }
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
    
    // Проверяем расстояние до полигональных препятствий
    for (const obstacle of this.polygonObstacles) {
      const distance = Vector2D.distance(position, obstacle.position);
      const minDistance = obstacle.isTarget
        ? obstacle.boundingRadius + radius + 10
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
  
  // Добавление полигонального препятствия, если оно не перекрывается с существующими
  private addPolygonObstacleIfValid(position: Vector2D, radius: number, isTarget: boolean, params: LevelParams): boolean {
    if (position.x < this.minX || position.x > this.maxX || position.y < this.height * 0.05 || position.y > this.height * 0.9) {
      return false;
    }
    
    // Проверяем расстояние до лунок
    for (const hole of this.holes) {
      const distance = Vector2D.distance(position, hole.position);
      const minDistance = hole.isTarget
        ? this.targetHoleRadius + radius + 15 // Дополнительный отступ от целевой лунки
        : params.minDistanceBetweenHoles;
        
      if (distance < minDistance) {
        return false;
      }
    }
    
    // Проверяем расстояние до других полигональных препятствий
    for (const obstacle of this.polygonObstacles) {
      const distance = Vector2D.distance(position, obstacle.position);
      const minDistance = obstacle.isTarget
        ? obstacle.boundingRadius + radius + 15
        : params.minDistanceBetweenHoles;
        
      if (distance < minDistance) {
        return false;
      }
    }
    
    // Создаем новое полигональное препятствие случайной формы
    let obstacle;
    
    if (isTarget) {
      // Целевые отверстия всегда круглые для удобства
      obstacle = PolygonObstacle.createShape(position, 'circle', radius * 0.7, true);
    } else {
      // Выбираем случайную форму для обычных препятствий
      const shapeTypes = ['triangle', 'square', 'diamond', 'trapezoid', 'hexagon', 'blob'];
      const randomType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
      
      // Создаем препятствие случайной формы с небольшими вариациями размера
      const size = radius * (0.9 + Math.random() * 0.4);
      obstacle = PolygonObstacle.createShape(position, randomType, size, false);
    }
    
    this.polygonObstacles.push(obstacle);
    return true;
  }
  
  // Проверка проходимости уровня и создание безопасного пути
  private checkLevelSolvability(start: Vector2D, target: Vector2D, minPathWidth: number): boolean {
    console.log(`Checking level solvability with minPathWidth=${minPathWidth}px...`);
    if (!this.pathFinder) return false;
    
    // Преобразуем все препятствия (и круглые и полигональные) в препятствия для PathFinder
    const obstacles: {position: Vector2D, radius: number, isTarget: boolean}[] = [
      ...this.holes.map(hole => ({
        position: hole.position,
        radius: hole.radius,
        isTarget: hole.isTarget
      }))
    ];
    
    // Добавляем полигональные препятствия
    if (this.usePolygonObstacles) {
      for (const poly of this.polygonObstacles) {
        obstacles.push({
          position: poly.position,
          radius: poly.boundingRadius, // Используем ограничивающий радиус для проверки столкновений
          isTarget: poly.isTarget
        });
      }
    }
    
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
    
    // Преобразуем все препятствия (и круглые и полигональные) в препятствия для PathFinder
    const obstacles: {position: Vector2D, radius: number, isTarget: boolean}[] = [
      ...this.holes.map(hole => ({
        position: hole.position,
        radius: hole.radius,
        isTarget: hole.isTarget
      }))
    ];
    
    // Добавляем полигональные препятствия
    if (this.usePolygonObstacles) {
      for (const poly of this.polygonObstacles) {
        obstacles.push({
          position: poly.position,
          radius: poly.boundingRadius, // Используем ограничивающий радиус для проверки столкновений
          isTarget: poly.isTarget
        });
      }
    }
    
    // Создаем безопасный путь, удаляя блокирующие препятствия
    const safeObstacles = this.pathFinder.createSafePath(start, target, this.ballRadius, obstacles);
    
    // Вычисляем, какие препятствия были удалены
    const removedPositions = obstacles
      .filter(o => !o.isTarget) // Не учитываем целевые лунки
      .filter(o => !safeObstacles.some(s => s.position.x === o.position.x && s.position.y === o.position.y))
      .map(o => o.position);
    
    // Удаляем эти препятствия из обоих списков
    this.holes = this.holes.filter(hole => 
      hole.isTarget || !removedPositions.some(pos => 
        pos.x === hole.position.x && pos.y === hole.position.y
      )
    );
    
    this.polygonObstacles = this.polygonObstacles.filter(poly => 
      poly.isTarget || !removedPositions.some(pos => 
        pos.x === poly.position.x && pos.y === poly.position.y
      )
    );
    
    console.log(`Removed ${removedPositions.length} blocking obstacles to create safe path`);
    
    // Обновляем сетку и находим новый безопасный путь
    this.pathFinder.updateGrid(safeObstacles);
    const path = this.pathFinder.findPath(start, target);
    if (path) {
      this.safePathNodes = path;
    }
  }
  
  // Получение информации о всех лунках
  public getHoles(): { position: Vector2D; radius: number; isTarget: boolean }[] {
    const result = this.holes.map(hole => ({
      position: hole.position,
      radius: hole.radius,
      isTarget: hole.isTarget
    }));
    
    // Добавляем информацию о полигональных препятствиях
    if (this.usePolygonObstacles) {
      this.polygonObstacles.forEach(obstacle => {
        result.push({
          position: obstacle.position,
          radius: obstacle.radius,
          isTarget: obstacle.isTarget
        });
      });
    }
    
    return result;
  }
  
  // Проверка столкновения шарика с лунками
  public checkBallCollision(ballPosition: Vector2D, ballRadius: number): number | null {
    // Проверяем столкновения со всеми лунками
    for (let i = 0; i < this.holes.length; i++) {
      const hole = this.holes[i];
      const distance = Vector2D.distance(ballPosition, hole.position);

      // Разные пороги для обычных и целевых лунок
      const collisionThreshold = hole.isTarget
        ? hole.radius * 1.1  // Для зеленой лунки делаем больше область взаимодействия
        : hole.radius - ballRadius * 0.3; // Для серых лунок шарик должен быть преимущественно внутри

      if (distance < collisionThreshold) {
        return i;
      }
    }
    
    // Проверяем столкновения с полигональными препятствиями
    if (this.usePolygonObstacles) {
      for (let i = 0; i < this.polygonObstacles.length; i++) {
        const obstacle = this.polygonObstacles[i];
        
        // Если это целевое отверстие (зеленое) и шарик внутри него
        if (obstacle.isTarget && obstacle.containsPoint(ballPosition)) {
          return this.holes.length + i;
        }
        
        // Если это обычное препятствие (серое) и шарик пересекается с ним
        if (!obstacle.isTarget && obstacle.intersectsCircle(ballPosition, ballRadius * 0.7)) {
          return this.holes.length + i;
        }
      }
    }

    return null;
  }

  // Рендеринг лунок и безопасного пути (для отладки)
  public render(ctx: CanvasRenderingContext2D, debugMode: boolean = false): void {
    // Рисуем безопасный путь в режиме отладки
    if (this.safePathNodes.length > 0 && debugMode) {
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
    
    // Сначала рисуем обычные полигональные препятствия
    if (this.usePolygonObstacles) {
      for (const obstacle of this.polygonObstacles) {
        if (!obstacle.isTarget) {
          obstacle.render(ctx);
        }
      }
    }
    
    // Затем рисуем обычные круглые лунки
    for (const hole of this.holes) {
      if (!hole.isTarget) {
        ctx.fillStyle = "#4b5563"
        ctx.beginPath()
        ctx.arc(hole.position.x, hole.position.y, hole.radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Затем рисуем полигональные целевые лунки
    if (this.usePolygonObstacles) {
      for (const obstacle of this.polygonObstacles) {
        if (obstacle.isTarget) {
          obstacle.render(ctx);
        }
      }
    }
    
    // Затем рисуем обычные целевые лунки
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
    if (this.pathFinder && debugMode) {
      this.pathFinder.debugDrawGrid(ctx);
    }
  }
}