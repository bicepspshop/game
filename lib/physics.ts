export class Vector2D {
  constructor(
    public x: number,
    public y: number,
  ) {}

  public add(v: Vector2D): Vector2D {
    return new Vector2D(this.x + v.x, this.y + v.y)
  }

  public subtract(v: Vector2D): Vector2D {
    return new Vector2D(this.x - v.x, this.y - v.y)
  }

  public multiply(scalar: number): Vector2D {
    return new Vector2D(this.x * scalar, this.y * scalar)
  }

  public length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  public normalize(): Vector2D {
    const len = this.length()
    if (len === 0) return new Vector2D(0, 0)
    return new Vector2D(this.x / len, this.y / len)
  }

  public static distance(a: Vector2D, b: Vector2D): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  public clone(): Vector2D {
    return new Vector2D(this.x, this.y)
  }
}

export class Body {
  public velocity: Vector2D = new Vector2D(0, 0)
  public acceleration: Vector2D = new Vector2D(0, 0)
  public rotation = 0
  public angularVelocity = 0
  public mass = 1
  public restitution = 0.2
  public friction = 0.1
  public isStatic = false

  constructor(
    public position: Vector2D,
    public width: number,
    public height: number,
    public type: "circle" | "rectangle" = "rectangle",
  ) {}
}

export class Physics {
  private bodies: Body[] = []
  private gravity: Vector2D = new Vector2D(0, 550) // Adjusted from 800 to 550
  private boardMaxRotation: number = Math.PI / 6 // 30 degrees

  // Left and right pivot positions
  private leftPivotY = 0
  private rightPivotY = 0
  private baseY = 0

  // Board control parameters
  private tiltSpeed = 150 // Speed for tilting (angle control)
  private verticalSpeed = 100 // Speed for vertical movement
  private maxPivotTravel = 100 // Maximum distance the pivots can move vertically
  private minPivotY = -500 // Minimum Y position (highest point)
  private maxPivotY = 0 // Maximum Y position (lowest point)

  // Maximum ball velocity to prevent it from moving too fast
  private maxBallVelocity = 450 // Adjusted from 600 to 450

  constructor() {}

  public createBoard(
    position: Vector2D,
    width: number,
    height: number,
    leftPivot: Vector2D,
    rightPivot: Vector2D,
  ): Body {
    const board = new Body(position, width, height)
    board.isStatic = false
    board.mass = 10
    this.bodies.push(board)

    // Store the base Y position for the board
    this.baseY = position.y

    return board
  }

  public createBall(position: Vector2D, radius: number): Body {
    const ball = new Body(position, radius * 2, radius * 2, "circle")
    ball.mass = 10 // Adjusted from 12 to 10
    ball.restitution = 0.04 // Adjusted from 0.03 to 0.04
    ball.friction = 0.6 // Adjusted from 0.5 to 0.6
    ball.velocity = new Vector2D(0, 0)
    ball.acceleration = new Vector2D(0, 0)
    this.bodies.push(ball)
    return ball
  }

  public removeBody(body: Body): void {
    const index = this.bodies.indexOf(body)
    if (index !== -1) {
      this.bodies.splice(index, 1)
    }
  }

  public getLeftPivotY(): number {
    return this.leftPivotY
  }

  public getRightPivotY(): number {
    return this.rightPivotY
  }

  public applyBoardControl(
    board: Body,
    leftTiltInput: number,
    rightTiltInput: number,
    leftVerticalInput: number,
    rightVerticalInput: number,
    deltaTime: number,
  ): void {
    // Handle vertical movement of the left pivot
    if (leftVerticalInput !== 0) {
      // Positive input moves the pivot up (decreases Y)
      this.leftPivotY -= leftVerticalInput * this.verticalSpeed * deltaTime
      // Clamp to limits
      this.leftPivotY = Math.max(this.minPivotY, Math.min(this.maxPivotY, this.leftPivotY))
    }

    // Handle vertical movement of the right pivot
    if (rightVerticalInput !== 0) {
      // Positive input moves the pivot up (decreases Y)
      this.rightPivotY -= rightVerticalInput * this.verticalSpeed * deltaTime
      // Clamp to limits
      this.rightPivotY = Math.max(this.minPivotY, Math.min(this.maxPivotY, this.rightPivotY))
    }

    // Handle tilting of the left pivot (relative to its current position)
    if (leftTiltInput !== 0) {
      // Positive input tilts the left side up (decreases Y)
      this.leftPivotY -= leftTiltInput * this.tiltSpeed * deltaTime
      // Clamp to limits
      this.leftPivotY = Math.max(this.minPivotY, Math.min(this.maxPivotY, this.leftPivotY))
    }

    // Handle tilting of the right pivot (relative to its current position)
    if (rightTiltInput !== 0) {
      // Positive input tilts the right side up (decreases Y)
      this.rightPivotY -= rightTiltInput * this.tiltSpeed * deltaTime
      // Clamp to limits
      this.rightPivotY = Math.max(this.minPivotY, Math.min(this.maxPivotY, this.rightPivotY))
    }

    // Apply gravity effect - if no input, the board naturally falls down
    const gravityEffect = 30 * deltaTime
    if (leftTiltInput === 0 && leftVerticalInput === 0) {
      this.leftPivotY = Math.min(this.maxPivotY, this.leftPivotY + gravityEffect)
    }
    if (rightTiltInput === 0 && rightVerticalInput === 0) {
      this.rightPivotY = Math.min(this.maxPivotY, this.rightPivotY + gravityEffect)
    }

    // Calculate board rotation based on the difference in pivot heights
    const heightDifference = this.rightPivotY - this.leftPivotY
    const rotation = Math.atan2(heightDifference, board.width)

    // Clamp rotation to maximum allowed angle
    const clampedRotation = Math.max(-this.boardMaxRotation, Math.min(this.boardMaxRotation, rotation))

    // Set board rotation
    board.rotation = clampedRotation

    // Calculate the new center position of the board based on pivot positions
    const avgPivotY = (this.leftPivotY + this.rightPivotY) / 2
    board.position.y = this.baseY + avgPivotY
  }

  public update(deltaTime: number): void {
    // Apply forces and update positions
    for (const body of this.bodies) {
      if (body.isStatic) continue

      // Apply gravity only to the ball, not to the board
      if (body.type === "circle") {
        body.acceleration = this.gravity.clone()

        // Update velocity
        body.velocity = body.velocity.add(body.acceleration.multiply(deltaTime))

        // Apply friction
        body.velocity = body.velocity.multiply(1 - body.friction * deltaTime)

        // Apply additional damping to make the ball more stable
        body.velocity = body.velocity.multiply(0.96) // Adjusted from 0.98 to 0.96 for more damping

        // Limit maximum velocity to prevent the ball from moving too fast
        const speed = body.velocity.length()
        if (speed > this.maxBallVelocity) {
          body.velocity = body.velocity.normalize().multiply(this.maxBallVelocity)
        }

        // Update position
        body.position = body.position.add(body.velocity.multiply(deltaTime))
      }

      // Update rotation
      body.rotation += body.angularVelocity * deltaTime
    }

    // Handle collisions
    this.resolveCollisions()
  }

  private resolveCollisions(): void {
    // Check for ball-board collision
    const balls = this.bodies.filter((body) => body.type === "circle")
    const boards = this.bodies.filter((body) => body.type === "rectangle" && !body.isStatic)

    for (const ball of balls) {
      for (const board of boards) {
        this.resolveBallBoardCollision(ball, board)
      }
    }
  }

  private resolveBallBoardCollision(ball: Body, board: Body): void {
    // Transform ball position relative to board
    const boardCenterX = board.position.x
    const boardCenterY = board.position.y
    const boardHalfWidth = board.width / 2
    const boardHalfHeight = board.height / 2
    const ballRadius = ball.width / 2

    // Calculate board corners in world space
    const cosRotation = Math.cos(board.rotation)
    const sinRotation = Math.sin(board.rotation)

    // Calculate ball position relative to board center
    const relBallX = ball.position.x - boardCenterX
    const relBallY = ball.position.y - boardCenterY

    // Rotate ball position to align with board orientation
    const rotatedBallX = relBallX * cosRotation + relBallY * sinRotation
    const rotatedBallY = -relBallX * sinRotation + relBallY * cosRotation

    // Find closest point on board to ball
    const closestX = Math.max(-boardHalfWidth, Math.min(boardHalfWidth, rotatedBallX))
    const closestY = Math.max(-boardHalfHeight, Math.min(boardHalfHeight, rotatedBallY))

    // Calculate distance from closest point to ball center
    const distanceX = rotatedBallX - closestX
    const distanceY = rotatedBallY - closestY
    const distanceSquared = distanceX * distanceX + distanceY * distanceY

    // Check if collision occurred
    if (distanceSquared <= ballRadius * ballRadius) {
      // Calculate penetration depth
      const distance = Math.sqrt(distanceSquared)
      const penetration = ballRadius - distance

      // Calculate normal vector
      let normalX = 0
      let normalY = 0

      if (distance > 0) {
        normalX = distanceX / distance
        normalY = distanceY / distance
      } else {
        // If ball is exactly at closest point, use y-axis as normal
        normalX = 0
        normalY = 1
      }

      // Rotate normal back to world space
      const worldNormalX = normalX * cosRotation - normalY * sinRotation
      const worldNormalY = normalX * sinRotation + normalY * cosRotation

      // Move ball out of collision
      ball.position.x += worldNormalX * penetration
      ball.position.y += worldNormalY * penetration

      // Calculate relative velocity
      const relVelX = ball.velocity.x
      const relVelY = ball.velocity.y

      // Calculate velocity along normal
      const normalVelocity = relVelX * worldNormalX + relVelY * worldNormalY

      // Only resolve if objects are moving toward each other
      if (normalVelocity < 0) {
        // Calculate restitution (bounce)
        const restitution = ball.restitution

        // Calculate impulse scalar
        const impulseMagnitude = -(1 + restitution) * normalVelocity

        // Apply impulse
        const impulseX = worldNormalX * impulseMagnitude
        const impulseY = worldNormalY * impulseMagnitude

        ball.velocity.x += impulseX
        ball.velocity.y += impulseY

        // Apply board angle to ball velocity (rolling effect)
        // Adjusted from 100 to 70 for smoother rolling
        ball.velocity.x += Math.sin(board.rotation) * 70
      }
    }
  }

  public reset(): void {
    // Reset any accumulated forces or states
    for (const body of this.bodies) {
      if (!body.isStatic) {
        body.velocity = new Vector2D(0, 0)
        body.acceleration = new Vector2D(0, 0)
        body.angularVelocity = 0
      }
    }

    // Reset pivot positions
    this.leftPivotY = 0
    this.rightPivotY = 0
  }
}
