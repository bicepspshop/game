# Ice Cold Beer Game

This is a physics-based game inspired by the classic arcade game 'Ice Cold Beer'.

## Game Mechanics

The game is played by controlling a metal bar that can be tilted left and right. A ball rolls along the bar, and the player must guide it into a designated hole while avoiding other holes. The game becomes progressively more difficult as the player advances through levels.

## Game Progress Caching

The game uses local storage to save player progress, including:
- Current level
- Unlocked levels
- High scores (for both normal and endless modes)

### Game Progress Schema

```typescript
interface GameProgress {
  currentLevel: number;
  maxUnlocked: number[];
  highScore: number;
  endlessHighScore: number;
}
```

### Cache Strategy

- Game progress is saved in localStorage under the key `gameProgress`
- The game version is tracked under `gameVersion` to allow for future data migrations
- When levels are completed, the current level and unlocked levels are updated
- High scores are updated automatically when beaten
- On "Play Again" after Game Over, the game will restart at the same level instead of resetting to level 1

### Level Continuity

- When a player dies on level N, clicking "Play Again" will restart level N
- The main menu shows a "Continue Game" button when the player has progress beyond level 1
- Unlocked levels are preserved even when restarting the game

## Developer Features

### Debug URL Parameters

The game supports URL parameters for development and testing:

- `?level=N` - Start the game at level N (must be a number)
- `?nocache=true` - Bypass localStorage cache for testing

Example: `http://localhost:3000/?level=5&nocache=true`

When `nocache=true` is set, a "Clear Cache" button will appear in the menu for developers.

### Testing

The game includes Jest tests to verify the level restart behavior:

```
npm test
```

or for watch mode:

```
npm run test:watch
```

### Test Coverage

Tests ensure:
- The game correctly restarts at the same level after game over
- Unlocked levels are preserved during restarts
- Developer mode URL parameters work as expected

## Browser Support

The game is designed to work in modern browsers that support:
- localStorage
- Canvas
- ES6 features
- React 19+

## Installation

```
npm install
npm run dev
```

## Build

```
npm run build
npm start
```
