import { Vector2D, type Body, Physics } from "./physics"
import { LevelGenerator } from "./level-generator"
import { EndlessMode } from "./endless-mode" // Импортируем класс EndlessMode

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
  private endlessMode: EndlessMode | null = null
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
  private ballRadius = 14 // Увеличиваем размер шарика для лучшей видимости
  private holeRadius = 20 // Увеличиваем базовый размер лунок
  private isEndlessMode: boolean
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

    // Set up board dimensions - адаптируем для 9:16 пропорций
    const boardWidth = canvas.width * 0.8
    const boardHeight = 10
    this.boardY = canvas.height - 120

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

    // Initialize endless mode if needed
    if (isEndlessMode) {
      // Используем класс EndlessMode
      this.endlessMode = new EndlessMode(canvas.width, canvas.height, this.holeRadius)
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
    
    // Явно уничтожаем endlessMode для освобождения ресурсов
    if (this.endlessMode) {
      this.endlessMode.destroy();
      this.endlessMode = null;
    }
    
    // Сбрасываем все ссылки на объекты для помощи сборщику мусора
    if (this.ball) {
      this.physics.removeBody(this.ball);
      this.ball = null;
    }
    
    this.gameActive = false
    
    // Принудительно вызываем сборку мусора, если это возможно
    if (typeof window !== 'undefined' && window.gc) {
      try {
        window.gc();
      } catch (e) {
        console.log('GC not available');
      }
    }
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
    this.gameActive = true

    // Обновляем UI
    this.callbacks.onScoreChange(this.score)
    this.callbacks.onLevelChange(this.level)
    this.callbacks.onMetersChange(this.meters)

    // Сбрасываем физику и объекты
    this.resetGameState()

    // Сбрасываем бесконечный режим
    if (this.isEndlessMode) {
      // Используем класс EndlessMode
      if (this.endlessMode) {
        this.endlessMode.reset()
      }
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
    
    // Сброс всех массивов, которые могут накапливать объекты
    if (this.isEndlessMode && this.endlessMode) {
      this.endlessMode.reset();
    }
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

    // Применяем управление палкой (для обоих режимов)
    this.physics.applyBoardControl(
      this.board,
      this.leftInput,
      this.rightInput,
      this.leftVerticalInput,
      this.rightVerticalInput,
      deltaTime,
    )

    // Обновляем физику (для обоих режимов)
    this.physics.update(deltaTime)

    // В бесконечном режиме используем новый класс EndlessMode
    if (this.isEndlessMode && this.endlessMode) {
      // Получаем положение доски (среднее значение между опорами)
      const boardElevation = (this.physics.getLeftPivotY() + this.physics.getRightPivotY()) / 2;
      
      // Обновляем бесконечный режим с учетом положения доски
      this.endlessMode.update(deltaTime, boardElevation);
      
      // Получаем текущую высоту с десятичной точностью
      const newMeters = this.endlessMode.getHeightInMeters();
      
      // Обновляем метры, если они изменились хотя бы на 0.1
      if (Math.floor(newMeters * 10) !== Math.floor(this.meters * 10)) {
        this.meters = newMeters;
        this.callbacks.onMetersChange(this.meters);
        
        // Обновляем очки (используем целую часть метров)
        this.score = Math.floor(this.meters);
        this.callbacks.onScoreChange(this.score);
      }
    }

    // Проверяем шарик
    if (this.ball) {
      // Проверка выпадения шарика с доски
      if (this.isBallOffBoard()) {
        this.handleGameOver()
        return
      }

      // Проверка столкновений в зависимости от режима
      if (this.isEndlessMode) {
        // Используем новый метод checkCollision для EndlessMode
        if (this.endlessMode && this.endlessMode.checkCollision(this.ball.position, this.ballRadius)) {
          this.handleGameOver()
          return
        }
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

  // Добавим метод для рендеринга звездного фона
  private renderBackgroundParticles(ctx: CanvasRenderingContext2D): void {
    // Создаем псевдослучайные звезды с детерминированным результатом
    const seed = Math.floor(this.viewportOffset / 100); // Изменяем звезды при прокрутке в бесконечном режиме
    const pseudoRandom = (x: number, y: number) => {
      const value = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
      return value - Math.floor(value);
    };
    
    // Рисуем звезды разных размеров и яркости
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Малые звезды (многочисленные)
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    for (let i = 0; i < 100; i++) {
      const x = Math.floor(pseudoRandom(i, 0) * width);
      const y = Math.floor(pseudoRandom(0, i) * height);
      const size = pseudoRandom(i, i) * 1.5;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Средние звезды (с небольшим свечением)
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(pseudoRandom(i + 100, 0) * width);
      const y = Math.floor(pseudoRandom(0, i + 100) * height);
      const size = 1 + pseudoRandom(i, i + 50) * 2;
      
      ctx.shadowBlur = 5;
      ctx.shadowColor = "#FFFFFF";
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Несколько ярких звезд
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(pseudoRandom(i + 200, 10) * width);
      const y = Math.floor(pseudoRandom(10, i + 200) * height);
      const size = 2 + pseudoRandom(i + 10, i + 20) * 2;
      
      // Случайно выбираем цвет для некоторых ярких звезд
      const colorIdx = Math.floor(pseudoRandom(i, i + 30) * 3);
      if (colorIdx === 0) {
        ctx.shadowColor = "#4DEEEA"; // Неоновый голубой
        ctx.fillStyle = "#4DEEEA";
      } else if (colorIdx === 1) {
        ctx.shadowColor = "#F000FF"; // Неоновый розовый
        ctx.fillStyle = "#F000FF";
      } else {
        ctx.shadowColor = "#FFFFFF"; // Белый
        ctx.fillStyle = "#FFFFFF";
      }
      
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Сбрасываем shadow для остальных элементов
    ctx.shadowBlur = 0;
  }

  private render(): void {
    const { ctx, canvas } = this

    if (!ctx || !canvas) {
      console.error("Canvas or context is null in render method")
      return
    }

    // Clear canvas with a dark gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#0F1A2A"); // Темно-синий вверху
    gradient.addColorStop(1, "#2E1A47"); // Темно-фиолетовый внизу
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Добавляем фоновые частицы (звезды)
    this.renderBackgroundParticles(ctx);

    // Отрисовка в зависимости от режима
    if (this.isEndlessMode) {
      // Используем новый класс EndlessMode для отрисовки
      if (this.endlessMode) {
        this.endlessMode.render(ctx)
      }
    } else {
      // В обычном режиме отрисовываем лунки через levelGenerator
      this.levelGenerator.render(ctx)
    }

    // Draw pivots with glow effect
    ctx.fillStyle = "#4DEEEA" // Неоновый голубой
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#4DEEEA";
    
    ctx.beginPath()
    ctx.arc(this.leftPivot.x, this.physics.getLeftPivotY() + this.boardY, 6, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.beginPath()
    ctx.arc(this.rightPivot.x, this.physics.getRightPivotY() + this.boardY, 6, 0, Math.PI * 2)
    ctx.fill()
    
    // Сбрасываем shadow для остальных элементов
    ctx.shadowBlur = 0;

    // Draw board with metallic effect
    ctx.save()
    ctx.translate(this.board.position.x, this.board.position.y)
    ctx.rotate(this.board.rotation)
    
    // Create metallic gradient for the board
    const boardGradient = ctx.createLinearGradient(-this.board.width / 2, 0, this.board.width / 2, 0);
    boardGradient.addColorStop(0, "#888");
    boardGradient.addColorStop(0.5, "#DDD");
    boardGradient.addColorStop(1, "#888");
    
    ctx.fillStyle = boardGradient;
    ctx.fillRect(-this.board.width / 2, -this.board.height / 2, this.board.width, this.board.height)
    
    // Неоновая подсветка краев доски
    ctx.strokeStyle = "#4DEEEA";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#4DEEEA";
    ctx.strokeRect(-this.board.width / 2, -this.board.height / 2, this.board.width, this.board.height);
    ctx.shadowBlur = 0;
    
    ctx.restore()

    // Draw ball with glow effect
    if (this.ball) {
      // Внутренний градиент для шарика
      const ballGradient = ctx.createRadialGradient(
        this.ball.position.x - this.ballRadius * 0.3, 
        this.ball.position.y - this.ballRadius * 0.3, 
        0,
        this.ball.position.x,
        this.ball.position.y,
        this.ballRadius
      );
      
      ballGradient.addColorStop(0, "#FF8888");
      ballGradient.addColorStop(1, "#FF3864");
      
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#FF3864";
      ctx.fillStyle = ballGradient;
      ctx.beginPath()
      ctx.arc(this.ball.position.x, this.ball.position.y, this.ballRadius, 0, Math.PI * 2)
      ctx.fill()
      
      // Highlight на шарике
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.arc(this.ball.position.x - this.ballRadius * 0.3, this.ball.position.y - this.ballRadius * 0.3, this.ballRadius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
    }

    // В бесконечном режиме рисуем индикатор высоты
    if (this.isEndlessMode && !this.endlessMode) {
      // Фон индикатора
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(canvas.width - 30, 10, 20, canvas.height - 20);
      
      // Градиент для индикатора
      const indicatorGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      indicatorGradient.addColorStop(0, "#F000FF"); // Неоновый розовый вверху
      indicatorGradient.addColorStop(1, "#4DEEEA"); // Неоновый голубой внизу
      
      // Рамка индикатора
      ctx.strokeStyle = "#4DEEEA";
      ctx.lineWidth = 1;
      ctx.strokeRect(canvas.width - 30, 10, 20, canvas.height - 20);

      // Рисуем индикатор позиции игрока
      const playerPositionRatio = Math.min(1, this.ball ? this.ball.position.y / canvas.height : 0);
      const indicatorY = 10 + playerPositionRatio * (canvas.height - 40);

      // Неоновое свечение для индикатора
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#F000FF";
      ctx.fillStyle = "#F000FF";
      ctx.beginPath();
      ctx.arc(canvas.width - 20, indicatorY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  private generateLevel(): void {
    console.log(`Generating level ${this.level}`)

    // Generate new level or endless segment
    if (this.isEndlessMode) {
      // В бесконечном режиме используем класс EndlessMode
      // Генерация начальных платформ уже выполнена в конструкторе
    } else {
      // В обычном режиме генерируем новый уровень с гарантированной проходимостью
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