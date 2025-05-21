import { Vector2D, type Body, Physics } from "./physics"
import { LevelGenerator } from "./level-generator"
import { EndlessGenerator } from "./endless-generator"

type GameCallbacks = {
  onScoreChange: (score: number) => void
  onLevelChange: (level: number) => void
  onMetersChange: (meters: number) => void
  onGameOver: () => void
}

export class GameManager {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private physics: Physics
  private levelGenerator: LevelGenerator
  private endlessGenerator: EndlessGenerator | null = null
  private board: Body
  private ball: Body | null = null
  private leftPivot: Vector2D
  private rightPivot: Vector2D
  private leftInput = 0
  private rightInput = 0
  private leftVerticalInput = 0
  private rightVerticalInput = 0
  private score = 0
  private level = 1
  private meters = 0
  private targetHole = 0
  private animationFrameId: number | null = null
  private lastTimestamp = 0
  private callbacks: GameCallbacks
  private gameActive = true
  private boardY: number
  private ballRadius = 10
  private holeRadius = 18 // Базовый размер лунок
  private isEndlessMode: boolean
  private scrollSpeed = 0
  private maxScrollSpeed = 15 // Максимальная скорость прокрутки в пикселях за секунду
  private scrollAcceleration = 0.2 // Ускорение прокрутки
  private viewportOffset = 0 // Смещение видимой области в бесконечном режиме

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks, startLevel = 1, isEndlessMode = false) {
    console.log(`GameManager constructor called, endless mode: ${isEndlessMode}`)
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")!
    this.isEndlessMode = isEndlessMode

    if (!this.ctx) {
      throw new Error("Could not get 2D context from canvas")
    }

    this.callbacks = callbacks
    this.level = startLevel

    // Initialize physics
    this.physics = new Physics()

    // Set up board dimensions
    const boardWidth = canvas.width * 0.8
    const boardHeight = 10
    this.boardY = canvas.height - 80

    // Set up pivots
    this.leftPivot = new Vector2D(canvas.width / 2 - boardWidth / 2, this.boardY)
    this.rightPivot = new Vector2D(canvas.width / 2 + boardWidth / 2, this.boardY)

    // Create board
    this.board = this.physics.createBoard(
      new Vector2D(canvas.width / 2, this.boardY),
      boardWidth,
      boardHeight,
      this.leftPivot,
      this.rightPivot,
    )

    // Initialize level generator with smaller hole radius
    this.levelGenerator = new LevelGenerator(
      canvas.width,
      this.boardY - 20,
      canvas.width * 0.1,
      canvas.width * 0.9,
      this.holeRadius,
    )

    // Initialize endless generator if in endless mode
    if (isEndlessMode) {
      this.endlessGenerator = new EndlessGenerator(
        canvas.width,
        canvas.height,
        canvas.width * 0.1,
        canvas.width * 0.9,
        this.holeRadius,
      )
      this.endlessGenerator.generateInitialSegment()
    }

    // Generate first level or endless segment
    this.generateLevel()

    // Set initial level
    this.callbacks.onLevelChange(this.level)
    this.callbacks.onMetersChange(this.meters)

    console.log("GameManager initialized successfully")
  }

  public start(): void {
    console.log("Game starting...")
    this.lastTimestamp = performance.now()
    this.gameActive = true
    this.gameLoop(this.lastTimestamp)
    console.log("Game loop started")
  }

  public destroy(): void {
    console.log("Destroying game...")
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.gameActive = false
  }

  public restart(): void {
    console.log("Restarting game...")

    // Останавливаем текущий игровой цикл
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    // Сбрасываем состояние игры
    this.score = 0
    this.level = 1
    this.meters = 0
    this.viewportOffset = 0
    this.scrollSpeed = 0
    this.gameActive = true

    // Обновляем UI
    this.callbacks.onScoreChange(this.score)
    this.callbacks.onLevelChange(this.level)
    this.callbacks.onMetersChange(this.meters)

    // Сбрасываем физику и объекты
    this.resetGameState()

    // Пересоздаем генератор для бесконечного режима
    if (this.isEndlessMode && this.endlessGenerator) {
      this.endlessGenerator.reset()
      this.endlessGenerator.generateInitialSegment()
    }

    // Генерируем новый уровень
    this.generateLevel()

    // Запускаем игровой цикл заново
    this.lastTimestamp = performance.now()
    this.gameLoop(this.lastTimestamp)

    console.log("Game restarted successfully")
  }

  private resetGameState(): void {
    // Remove existing ball if it exists
    if (this.ball) {
      this.physics.removeBody(this.ball)
      this.ball = null
    }

    // Reset board position and rotation
    this.board.rotation = 0
    this.board.position.y = this.boardY
    this.board.angularVelocity = 0

    // Reset physics
    this.physics.reset()

    // Reset inputs
    this.leftInput = 0
    this.rightInput = 0
    this.leftVerticalInput = 0
    this.rightVerticalInput = 0
  }

  public setInputs(leftInput: number, rightInput: number, leftVerticalInput: number, rightVerticalInput: number): void {
    this.leftInput = leftInput
    this.rightInput = rightInput
    this.leftVerticalInput = leftVerticalInput
    this.rightVerticalInput = rightVerticalInput
  }

  private gameLoop(timestamp: number): void {
    if (!this.gameActive) {
      console.log("Game not active, stopping game loop")
      return
    }

    if (this.animationFrameId === null && !this.gameActive) {
      console.log("Game destroyed, not continuing game loop")
      return
    }

    const deltaTime = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05) // Cap at 20 FPS minimum
    this.lastTimestamp = timestamp

    this.update(deltaTime)
    this.render()

    this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this))
  }

  private update(deltaTime: number): void {
    if (!this.gameActive) return

    // В бесконечном режиме обновляем скорость прокрутки и смещение
    if (this.isEndlessMode) {
      // Постепенно увеличиваем скорость прокрутки до максимальной
      this.scrollSpeed = Math.min(this.scrollSpeed + this.scrollAcceleration * deltaTime, this.maxScrollSpeed)

      // Обновляем смещение видимой области
      this.viewportOffset += this.scrollSpeed * deltaTime

      // Обновляем метры (1 метр = 10 пикселей)
      const newMeters = Math.floor(this.viewportOffset / 10)
      if (newMeters !== this.meters) {
        this.meters = newMeters
        this.callbacks.onMetersChange(this.meters)

        // Начисляем очки за высоту (1 метр = 1 очко)
        this.score = this.meters
        this.callbacks.onScoreChange(this.score)
      }

      // Генерируем новые сегменты по мере продвижения вверх
      if (this.endlessGenerator) {
        this.endlessGenerator.updateSegments(this.viewportOffset, this.canvas.height)
      }
    }

    // Apply board rotation and vertical movement based on inputs
    this.physics.applyBoardControl(
      this.board,
      this.leftInput,
      this.rightInput,
      this.leftVerticalInput,
      this.rightVerticalInput,
      deltaTime,
    )

    // Update physics
    this.physics.update(deltaTime)

    // Check if ball exists
    if (this.ball) {
      // В бесконечном режиме смещаем мяч вместе с экраном
      if (this.isEndlessMode) {
        this.ball.position.y += this.scrollSpeed * deltaTime
      }

      // Check if ball is completely off the board
      if (this.isBallOffBoard()) {
        this.handleGameOver()
        return
      }

      // Проверка столкновений в зависимости от режима
      if (this.isEndlessMode) {
        this.checkEndlessModeCollisions(deltaTime)
      } else {
        this.checkNormalModeCollisions(deltaTime)
      }
    }
  }

  private checkNormalModeCollisions(deltaTime: number): void {
    if (!this.ball) return

    // Check if ball hit any holes
    // We check for collisions more frequently for fast-moving balls
    const ballSpeed = this.ball.velocity.length()
    const numChecks = Math.max(1, Math.min(5, Math.floor(ballSpeed / 100)))

    for (let i = 0; i < numChecks; i++) {
      // Interpolate ball position for more accurate collision detection
      const t = i / numChecks
      const interpolatedPosition = new Vector2D(
        this.ball.position.x - this.ball.velocity.x * deltaTime * t,
        this.ball.position.y - this.ball.velocity.y * deltaTime * t,
      )

      const hitHole = this.levelGenerator.checkBallCollision(interpolatedPosition, this.ballRadius)
      if (hitHole !== null) {
        if (hitHole === this.targetHole) {
          // Hit the target hole - добавляем очки в зависимости от уровня и сложности
          // Увеличиваем награду за сложные уровни
          const levelPoints = Math.floor(10 * this.level * (1 + this.level * 0.05))
          this.score += levelPoints
          this.level += 1

          console.log(`Level completed! Added ${levelPoints} points. New score: ${this.score}`)

          this.callbacks.onScoreChange(this.score)
          this.callbacks.onLevelChange(this.level)

          // Reset the game state for the new level
          this.resetGameState()

          // Generate new level
          this.generateLevel()
          return
        } else {
          // Hit wrong hole
          this.handleGameOver()
          return
        }
      }
    }
  }

  private checkEndlessModeCollisions(deltaTime: number): void {
    if (!this.ball || !this.endlessGenerator) return

    // В бесконечном режиме проверяем только столкновения с препятствиями
    const ballSpeed = this.ball.velocity.length()
    const numChecks = Math.max(1, Math.min(5, Math.floor(ballSpeed / 100)))

    for (let i = 0; i < numChecks; i++) {
      const t = i / numChecks
      const interpolatedPosition = new Vector2D(
        this.ball.position.x - this.ball.velocity.x * deltaTime * t,
        this.ball.position.y - this.ball.velocity.y * deltaTime * t,
      )

      // Проверяем столкновение с препятствиями
      if (this.endlessGenerator.checkObstacleCollision(interpolatedPosition, this.ballRadius, this.viewportOffset)) {
        this.handleGameOver()
        return
      }
    }
  }

  // Check if the ball has completely fallen off the board
  private isBallOffBoard(): boolean {
    if (!this.ball) return false

    const ballRadius = this.ball.width / 2
    const boardHalfWidth = this.board.width / 2
    const boardHalfHeight = this.board.height / 2
    const boardCenterX = this.board.position.x
    const boardCenterY = this.board.position.y

    // Calculate board corners in world space based on rotation
    const cosRotation = Math.cos(this.board.rotation)
    const sinRotation = Math.sin(this.board.rotation)

    // Calculate ball position relative to board center
    const relBallX = this.ball.position.x - boardCenterX
    const relBallY = this.ball.position.y - boardCenterY

    // Rotate ball position to align with board orientation
    const rotatedBallX = relBallX * cosRotation + relBallY * sinRotation
    const rotatedBallY = -relBallX * sinRotation + relBallY * cosRotation

    // Check if the ball is completely off the board in the rotated space
    // We add the ball radius to account for the ball's size
    const isBallOffX = Math.abs(rotatedBallX) > boardHalfWidth + ballRadius
    const isBallOffY = rotatedBallY > boardHalfHeight + ballRadius

    // Ball is off the board if it's either too far to the sides or below the board
    return isBallOffX || isBallOffY || this.ball.position.y > this.canvas.height
  }

  private render(): void {
    const { ctx, canvas } = this

    if (!ctx || !canvas) {
      console.error("Canvas or context is null in render method")
      return
    }

    // Clear canvas
    ctx.fillStyle = "#1a1a2e"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw holes or endless segments
    if (this.isEndlessMode && this.endlessGenerator) {
      this.endlessGenerator.render(ctx, this.viewportOffset)
    } else {
      this.levelGenerator.render(ctx)
    }

    // Draw pivots
    ctx.fillStyle = "#6b7280"
    ctx.beginPath()
    ctx.arc(this.leftPivot.x, this.physics.getLeftPivotY() + this.boardY, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(this.rightPivot.x, this.physics.getRightPivotY() + this.boardY, 5, 0, Math.PI * 2)
    ctx.fill()

    // Draw board
    ctx.save()
    ctx.translate(this.board.position.x, this.board.position.y)
    ctx.rotate(this.board.rotation)
    ctx.fillStyle = "#d1d5db"
    ctx.fillRect(-this.board.width / 2, -this.board.height / 2, this.board.width, this.board.height)
    ctx.restore()

    // Draw ball
    if (this.ball) {
      ctx.fillStyle = "#ef4444"
      ctx.beginPath()
      ctx.arc(this.ball.position.x, this.ball.position.y, this.ballRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    // В бесконечном режиме рисуем индикатор высоты
    if (this.isEndlessMode) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
      ctx.fillRect(canvas.width - 30, 10, 20, canvas.height - 20)

      // Рисуем индикатор позиции игрока
      const playerPositionRatio = Math.min(1, this.ball ? this.ball.position.y / canvas.height : 0)
      const indicatorY = 10 + playerPositionRatio * (canvas.height - 40)

      ctx.fillStyle = "#ef4444"
      ctx.beginPath()
      ctx.arc(canvas.width - 20, indicatorY, 8, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private generateLevel(): void {
    console.log(`Generating level ${this.level}`)

    // Generate new level or endless segment
    if (this.isEndlessMode) {
      // В бесконечном режиме не нужно генерировать новый уровень
      // Сегменты генерируются автоматически в методе update
    } else {
      // В обычном режиме генерируем новый уровень
      this.targetHole = this.levelGenerator.generateLevel(this.level)
    }

    // Create new ball
    if (this.ball) {
      this.physics.removeBody(this.ball)
    }

    const ballPosition = new Vector2D(this.canvas.width / 2, this.boardY - 15)

    this.ball = this.physics.createBall(ballPosition, this.ballRadius)

    // Ensure ball has zero velocity
    this.ball.velocity = new Vector2D(0, 0)
    this.ball.acceleration = new Vector2D(0, 0)
  }

  private handleGameOver(): void {
    console.log("Game over")
    this.gameActive = false
    this.callbacks.onGameOver()
  }
}
