import { Vector2D } from "./physics"

export class Hole {
  constructor(
    public position: Vector2D,
    public radius: number,
    public isTarget = false,
  ) {}
}

export class LevelGenerator {
  private holes: Hole[] = []
  private width: number
  private height: number
  private minX: number
  private maxX: number
  private holeRadius: number
  private targetHoleRadius: number

  constructor(width: number, height: number, minX: number, maxX: number, holeRadius: number) {
    this.width = width
    this.height = height
    this.minX = minX
    this.maxX = maxX
    this.holeRadius = holeRadius
    // Уменьшаем размер целевой лунки для большей сложности (с 80% до 65% от базового размера)
    this.targetHoleRadius = holeRadius * 0.65
  }

  public generateLevel(level: number): number {
    // Clear existing holes
    this.holes = []

    // Определяем количество лунок в зависимости от уровня
    // Увеличиваем базовое количество лунок и скорость их прироста
    const baseHoles = 7 // Увеличено с 6 до 7
    const maxAdditionalHoles = 18 // Увеличено с 15 до 18
    // Быстрее увеличиваем количество лунок с ростом уровня
    const numHoles = Math.min(baseHoles + Math.floor(level * 0.7), baseHoles + maxAdditionalHoles)

    console.log(`Generating level ${level} with ${numHoles} holes`)

    // Рассчитываем минимальное расстояние между центрами лунок
    const grayHoleRadius = this.holeRadius * 1.5
    // Немного уменьшаем минимальное расстояние для более плотного расположения
    const minDistanceBetweenHoles = grayHoleRadius * 2.0 // Уменьшено с 2.2 до 2.0

    // Создаем целевую лунку первой с учетом сложности
    const targetHole = this.createTargetHole(level, numHoles)
    this.holes.push(targetHole)

    // Создаем защитный барьер из серых лунок вокруг зеленой для высоких уровней
    if (level > 3) {
      this.createProtectiveBarrier(targetHole, level, grayHoleRadius)
    }

    // Создаем обычные лунки с проверкой на перекрытие
    let attempts = 0
    const maxAttempts = 1000

    while (this.holes.length < numHoles && attempts < maxAttempts) {
      attempts++

      // Генерируем случайную позицию
      const x = this.minX + Math.random() * (this.maxX - this.minX)

      // Для более высоких уровней увеличиваем вероятность появления лунок в верхней части экрана
      let y
      if (level > 10 && Math.random() < 0.7) {
        // 70% шанс разместить лунку в верхней половине экрана для высоких уровней
        y = this.height * 0.1 + Math.random() * (this.height * 0.4)
      } else {
        y = this.height * 0.1 + Math.random() * (this.height * 0.7)
      }

      // Проверяем, не слишком ли близко к другим лункам
      let tooClose = false
      for (const hole of this.holes) {
        const distance = Vector2D.distance(new Vector2D(x, y), hole.position)
        const minDistance = hole.isTarget
          ? this.targetHoleRadius + grayHoleRadius + 10 // Дополнительный отступ от целевой лунки
          : minDistanceBetweenHoles

        if (distance < minDistance) {
          tooClose = true
          break
        }
      }

      // Если позиция подходит, создаем новую лунку
      if (!tooClose) {
        const hole = new Hole(new Vector2D(x, y), grayHoleRadius, false)
        this.holes.push(hole)
      }
    }

    console.log(`Generated ${this.holes.length} holes after ${attempts} attempts`)

    // Если не удалось создать нужное количество лунок, уменьшаем минимальное расстояние и пробуем еще раз
    if (this.holes.length < numHoles / 2) {
      console.log("Not enough holes generated, retrying with smaller minimum distance")

      // Сохраняем целевую лунку и защитный барьер, если он есть
      const targetAndBarrier = this.holes.slice(0, Math.min(this.holes.length, 5))
      this.holes = targetAndBarrier

      const reducedMinDistance = minDistanceBetweenHoles * 0.8
      attempts = 0

      while (this.holes.length < numHoles && attempts < maxAttempts) {
        attempts++

        const x = this.minX + Math.random() * (this.maxX - this.minX)
        const y = this.height * 0.1 + Math.random() * (this.height * 0.7)

        let tooClose = false
        for (const hole of this.holes) {
          const distance = Vector2D.distance(new Vector2D(x, y), hole.position)
          const minDistance = hole.isTarget ? this.targetHoleRadius + grayHoleRadius + 5 : reducedMinDistance

          if (distance < minDistance) {
            tooClose = true
            break
          }
        }

        if (!tooClose) {
          const hole = new Hole(new Vector2D(x, y), grayHoleRadius, false)
          this.holes.push(hole)
        }
      }

      console.log(`Second attempt: Generated ${this.holes.length} holes after ${attempts} attempts`)
    }

    // Возвращаем индекс целевой лунки (всегда 0, так как мы добавили её первой)
    return 0
  }

  // Создаем защитный барьер из серых лунок вокруг зеленой
  private createProtectiveBarrier(targetHole: Hole, level: number, grayHoleRadius: number): void {
    // Количество лунок в барьере зависит от уровня
    const barrierHoles = Math.min(Math.floor(level / 2), 8)

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
      const outerBarrierRadius = barrierRadius * 1.5
      const outerBarrierHoles = Math.min(barrierHoles + 2, 10)

      for (let i = 0; i < outerBarrierHoles; i++) {
        const angle = (i / outerBarrierHoles) * Math.PI * 2 + Math.PI / outerBarrierHoles // Смещаем относительно внутреннего круга
        const randomOffset = 0.1
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

  // Создаем целевую лунку в зависимости от уровня
  private createTargetHole(level: number, numHoles: number): Hole {
    // Для более высоких уровней целевая лунка размещается выше и ближе к краям
    const minY = this.height * 0.15 // Минимальная высота (15% от верха)
    const maxY = this.height * 0.6 // Максимальная высота (60% от верха) - уменьшено с 0.7

    // Чем выше уровень, тем выше целевая лунка и тем ближе к краям
    const levelFactor = Math.min(level / 20, 1) // От 0 до 1, достигает максимума на уровне 20
    const y = maxY - levelFactor * (maxY - minY)

    // Для высоких уровней увеличиваем вероятность размещения у краев
    let x
    if (level > 5 && Math.random() < 0.7) {
      // 70% шанс разместить у края для уровней выше 5
      const side = Math.random() < 0.5 ? -1 : 1 // Левый или правый край
      const edgeFactor = 0.2 + levelFactor * 0.2 // От 0.2 до 0.4
      const margin = this.width * edgeFactor

      if (side < 0) {
        // Левый край
        x = this.minX + margin * Math.random()
      } else {
        // Правый край
        x = this.maxX - margin * Math.random()
      }
    } else {
      // Случайная позиция, но не слишком близко к краям
      const margin = this.width * 0.15
      x = this.minX + margin + Math.random() * (this.maxX - this.minX - 2 * margin)
    }

    // Для очень высоких уровней иногда делаем лунку еще меньше
    let targetRadius = this.targetHoleRadius
    if (level > 15 && Math.random() < 0.5) {
      targetRadius *= 0.9 // Уменьшаем на 10%
    }

    return new Hole(new Vector2D(x, y), targetRadius, true)
  }

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

  public render(ctx: CanvasRenderingContext2D): void {
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
  }
}
