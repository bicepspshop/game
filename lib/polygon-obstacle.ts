import { Vector2D } from "./physics"

// Класс для представления препятствий произвольной формы
export class PolygonObstacle {
  public vertices: Vector2D[] = []
  public position: Vector2D
  public isTarget: boolean
  public radius: number // Примерный радиус для совместимости
  public boundingRadius: number // Радиус, охватывающий весь полигон
  
  constructor(
    position: Vector2D,
    vertices: Vector2D[] = [],
    isTarget: boolean = false,
    radius: number = 20
  ) {
    this.position = position
    this.isTarget = isTarget
    this.radius = radius
    
    // Сохраняем вершины относительно центра
    this.vertices = vertices
    
    // Вычисляем ограничивающий радиус
    this.boundingRadius = this.calculateBoundingRadius()
  }
  
  // Создает случайный полигон с заданным количеством вершин
  public static createRandom(position: Vector2D, minRadius: number, maxRadius: number, numPoints: number = 6, irregularity: number = 0.3): PolygonObstacle {
    const vertices: Vector2D[] = []
    
    // Генерируем вершины по кругу
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2
      
      // Случайное отклонение для радиуса и угла
      const radiusVariation = 1 - (Math.random() * irregularity)
      const radius = minRadius + (maxRadius - minRadius) * radiusVariation
      const angleVariation = (Math.random() - 0.5) * 0.2
      
      // Вычисляем координаты вершины относительно центра
      const x = Math.cos(angle + angleVariation) * radius
      const y = Math.sin(angle + angleVariation) * radius
      
      vertices.push(new Vector2D(x, y))
    }
    
    return new PolygonObstacle(position, vertices, false, (minRadius + maxRadius) / 2)
  }
  
  // Создает полигон произвольной формы
  public static createShape(position: Vector2D, type: string, radius: number = 20, isTarget: boolean = false): PolygonObstacle {
    let vertices: Vector2D[] = []
    
    // Различные типы форм
    switch (type) {
      case 'triangle':
        vertices = [
          new Vector2D(0, -radius),
          new Vector2D(-radius * 0.9, radius * 0.6),
          new Vector2D(radius * 0.9, radius * 0.6)
        ]
        break
        
      case 'square':
        vertices = [
          new Vector2D(-radius * 0.7, -radius * 0.7),
          new Vector2D(radius * 0.7, -radius * 0.7),
          new Vector2D(radius * 0.7, radius * 0.7),
          new Vector2D(-radius * 0.7, radius * 0.7)
        ]
        break
        
      case 'diamond':
        vertices = [
          new Vector2D(0, -radius),
          new Vector2D(radius, 0),
          new Vector2D(0, radius),
          new Vector2D(-radius, 0)
        ]
        break
        
      case 'trapezoid':
        vertices = [
          new Vector2D(-radius * 0.4, -radius * 0.7),
          new Vector2D(radius * 0.4, -radius * 0.7),
          new Vector2D(radius * 0.8, radius * 0.7),
          new Vector2D(-radius * 0.8, radius * 0.7)
        ]
        break
        
      case 'hexagon':
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2
          vertices.push(new Vector2D(Math.cos(angle) * radius, Math.sin(angle) * radius))
        }
        break
        
      case 'blob': // Неправильная форма, как на втором скриншоте
        const numPoints = 6 + Math.floor(Math.random() * 4)
        for (let i = 0; i < numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2
          const radiusVar = radius * (0.7 + Math.random() * 0.5)
          const angleVar = (Math.random() - 0.5) * 0.3
          vertices.push(new Vector2D(
            Math.cos(angle + angleVar) * radiusVar,
            Math.sin(angle + angleVar) * radiusVar
          ))
        }
        break
        
      default: // круг
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2
          vertices.push(new Vector2D(Math.cos(angle) * radius, Math.sin(angle) * radius))
        }
    }
    
    return new PolygonObstacle(position, vertices, isTarget, radius)
  }
  
  // Вычисляет ограничивающий радиус полигона
  private calculateBoundingRadius(): number {
    let maxDistance = 0
    
    for (const vertex of this.vertices) {
      const distance = Math.sqrt(vertex.x * vertex.x + vertex.y * vertex.y)
      maxDistance = Math.max(maxDistance, distance)
    }
    
    return maxDistance
  }
  
  // Проверяет, находится ли точка внутри полигона
  public containsPoint(point: Vector2D): boolean {
    // Переводим точку в локальные координаты относительно центра полигона
    const localPoint = new Vector2D(
      point.x - this.position.x,
      point.y - this.position.y
    )
    
    // Быстрая проверка по ограничивающему кругу
    const distance = Math.sqrt(localPoint.x * localPoint.x + localPoint.y * localPoint.y)
    if (distance > this.boundingRadius) {
      return false
    }
    
    // Полная проверка - используем алгоритм "ray casting"
    let inside = false
    const n = this.vertices.length
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const vi = this.vertices[i]
      const vj = this.vertices[j]
      
      // Проверяем, пересекает ли луч из точки ребро полигона
      if (((vi.y > localPoint.y) !== (vj.y > localPoint.y)) &&
          (localPoint.x < (vj.x - vi.x) * (localPoint.y - vi.y) / (vj.y - vi.y) + vi.x)) {
        inside = !inside
      }
    }
    
    return inside
  }
  
  // Проверяет, пересекается ли круг с полигоном
  public intersectsCircle(center: Vector2D, radius: number): boolean {
    // Если центр круга внутри полигона, то пересечение есть
    if (this.containsPoint(center)) {
      return true
    }
    
    // Переводим центр круга в локальные координаты
    const localCenter = new Vector2D(
      center.x - this.position.x,
      center.y - this.position.y
    )
    
    // Проверяем каждую сторону полигона
    const n = this.vertices.length
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const vi = this.vertices[i]
      const vj = this.vertices[j]
      
      // Находим ближайшую точку на отрезке к центру круга
      const edge = new Vector2D(vj.x - vi.x, vj.y - vi.y)
      const edgeLengthSquared = edge.x * edge.x + edge.y * edge.y
      
      // Вектор от начала отрезка к центру круга
      const lineToCenter = new Vector2D(localCenter.x - vi.x, localCenter.y - vi.y)
      
      // Проекция на отрезок (нормализованная)
      let t = (lineToCenter.x * edge.x + lineToCenter.y * edge.y) / edgeLengthSquared
      t = Math.max(0, Math.min(1, t)) // Ограничиваем к отрезку
      
      // Ближайшая точка на отрезке
      const closestPoint = new Vector2D(
        vi.x + t * edge.x,
        vi.y + t * edge.y
      )
      
      // Расстояние от центра круга до ближайшей точки
      const distanceSquared = Math.pow(closestPoint.x - localCenter.x, 2) + 
                             Math.pow(closestPoint.y - localCenter.y, 2)
      
      // Если расстояние меньше радиуса круга, то пересечение есть
      if (distanceSquared <= radius * radius) {
        return true
      }
    }
    
    return false
  }
  
  // Рисует полигон
  public render(ctx: CanvasRenderingContext2D, viewportOffset: number = 0): void {
    // Преобразуем позицию с учетом смещения (для бесконечного режима)
    const screenY = this.position.y - viewportOffset
    
    // Начинаем рисовать фигуру
    ctx.save()
    ctx.translate(this.position.x, screenY)
    
    ctx.beginPath()
    
    // Перемещаемся к первой вершине
    if (this.vertices.length > 0) {
      ctx.moveTo(this.vertices[0].x, this.vertices[0].y)
      
      // Добавляем остальные вершины
      for (let i = 1; i < this.vertices.length; i++) {
        ctx.lineTo(this.vertices[i].x, this.vertices[i].y)
      }
    }
    
    // Замыкаем контур
    ctx.closePath()
    
    // Выбираем цвет заливки в зависимости от типа
    if (this.isTarget) {
      ctx.fillStyle = "#10b981" // Зеленый для целевой лунки
      ctx.strokeStyle = "#34d399"
      ctx.lineWidth = 3
      ctx.stroke()
    } else {
      ctx.fillStyle = "#4b5563" // Серый для обычных препятствий
    }
    
    ctx.fill()
    
    // Восстанавливаем контекст
    ctx.restore()
  }
}