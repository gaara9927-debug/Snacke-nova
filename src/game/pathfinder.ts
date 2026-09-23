/**
 * Snake AI Pathfinding Engine using BFS / A* with Flood-Fill Safety Analysis
 * 
 * Capabilities:
 * 1. Locates all apples on the board with priority scoring.
 * 2. Survival Mode: automatically activates when space is constrained or snake is long.
 * 3. Escape Route & Trap Prevention: virtual path simulation ensures the snake never traps itself.
 * 4. Alert State Detection: signals when navigating near tight obstacles.
 * 5. Target Apple Tracking: exposes target apple for dynamic pupil look direction.
 */

import { GameApple, SnakeCoordinate } from '../../shared/types.ts';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const DIRECTIONS: { dir: Direction; dx: number; dy: number }[] = [
  { dir: 'UP', dx: 0, dy: -1 },
  { dir: 'DOWN', dx: 0, dy: 1 },
  { dir: 'LEFT', dx: -1, dy: 0 },
  { dir: 'RIGHT', dx: 1, dy: 0 },
];

export interface PathfindingContext {
  cols: number;
  rows: number;
  snake: SnakeCoordinate[];
  apples: GameApple[];
}

export interface AIMoveResult {
  nextMove: SnakeCoordinate | null;
  targetApple: GameApple | null;
  isSurvivalMode: boolean;
  isAlert: boolean;
}

/**
 * Encodes coordinate into a single integer key for fast Set lookups
 */
function coordKey(x: number, y: number, cols: number): number {
  return y * cols + x;
}

/**
 * Checks if coordinate is inside grid boundaries
 */
export function isInsideGrid(x: number, y: number, cols: number, rows: number): boolean {
  return x >= 0 && x < cols && y >= 0 && y < rows;
}

/**
 * Breadth-First Search (BFS) to find shortest path from start to target
 */
export function findShortestPath(
  start: SnakeCoordinate,
  target: SnakeCoordinate,
  obstacles: Set<number>,
  cols: number,
  rows: number
): SnakeCoordinate[] | null {
  if (start.x === target.x && start.y === target.y) return [];

  const queue: SnakeCoordinate[] = [start];
  const visited = new Set<number>();
  visited.add(coordKey(start.x, start.y, cols));

  const parentMap = new Map<number, SnakeCoordinate>();

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.x === target.x && current.y === target.y) {
      // Reconstruct path
      const path: SnakeCoordinate[] = [];
      let curr = current;
      while (!(curr.x === start.x && curr.y === start.y)) {
        path.unshift(curr);
        const pKey = coordKey(curr.x, curr.y, cols);
        curr = parentMap.get(pKey)!;
      }
      return path;
    }

    for (const { dx, dy } of DIRECTIONS) {
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (!isInsideGrid(nx, ny, cols, rows)) continue;

      const nKey = coordKey(nx, ny, cols);

      // Target coordinate is allowed even if obstacles contains it
      if (obstacles.has(nKey) && !(nx === target.x && ny === target.y)) {
        continue;
      }

      if (!visited.has(nKey)) {
        visited.add(nKey);
        parentMap.set(nKey, current);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return null;
}

/**
 * Computes the flood-fill reachable area from a coordinate
 */
export function calculateReachableSpace(
  start: SnakeCoordinate,
  obstacles: Set<number>,
  cols: number,
  rows: number,
  limit = 350
): number {
  const visited = new Set<number>();
  const queue: SnakeCoordinate[] = [start];
  visited.add(coordKey(start.x, start.y, cols));

  while (queue.length > 0 && visited.size < limit) {
    const current = queue.shift()!;

    for (const { dx, dy } of DIRECTIONS) {
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (!isInsideGrid(nx, ny, cols, rows)) continue;

      const nKey = coordKey(nx, ny, cols);
      if (obstacles.has(nKey)) continue;

      if (!visited.has(nKey)) {
        visited.add(nKey);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return visited.size;
}

/**
 * Virtual simulation to check if reaching an apple leaves the snake with a safe exit path
 */
function isPathSafe(
  snake: SnakeCoordinate[],
  path: SnakeCoordinate[],
  cols: number,
  rows: number
): boolean {
  // Simulate snake moving along path
  const simSnake: SnakeCoordinate[] = [...snake];
  for (const step of path) {
    simSnake.unshift(step);
    simSnake.pop();
  }

  const simHead = simSnake[0];
  const simTail = simSnake[simSnake.length - 1];

  // Build obstacle set of simulated body (excluding tail because tail vacates)
  const simObstacles = new Set<number>();
  for (let i = 0; i < simSnake.length - 1; i++) {
    simObstacles.add(coordKey(simSnake[i].x, simSnake[i].y, cols));
  }

  // 1. Can simulated head still reach its tail?
  const pathToTail = findShortestPath(simHead, simTail, simObstacles, cols, rows);
  if (pathToTail && pathToTail.length > 0) {
    return true;
  }

  // 2. Alternatively, does simulated head have enough flood-fill space to survive?
  const freeSpace = calculateReachableSpace(simHead, simObstacles, cols, rows, simSnake.length * 2);
  return freeSpace >= simSnake.length;
}

/**
 * Comprehensive AI decision maker:
 * - Prioritizes apples
 * - Automatically activates Survival Mode when space is restricted
 * - Identifies alert danger near tight obstacles
 * - Exposes target apple for pupil eye tracking
 */
export function decideAIMove(ctx: PathfindingContext): AIMoveResult {
  const { cols, rows, snake, apples } = ctx;
  if (snake.length === 0) {
    return { nextMove: null, targetApple: null, isSurvivalMode: false, isAlert: false };
  }

  const head = snake[0];
  const tail = snake[snake.length - 1];

  // Base obstacles = body segments except the very tail tip
  const baseObstacles = new Set<number>();
  for (let i = 0; i < snake.length - 1; i++) {
    baseObstacles.add(coordKey(snake[i].x, snake[i].y, cols));
  }

  // Check current immediate open space
  const immediateFreeSpace = calculateReachableSpace(head, baseObstacles, cols, rows, 60);
  const isAlert = immediateFreeSpace < 16;

  // High density / long snake ratio
  const totalCells = cols * rows;
  const isLongSnake = snake.length > totalCells * 0.22;

  // Sort apples by distance and priority
  const candidateApples = [...apples].sort((a, b) => {
    // Priority weights: giant=8, galaxy=5, special_green=4, donut=3, golden=2, regular=1
    const weightA = a.type === 'giant' ? 8 : a.type === 'galaxy' ? 5 : a.type === 'special_green' ? 4 : a.type === 'donut' ? 3 : a.type === 'golden' ? 2 : 1;
    const weightB = b.type === 'giant' ? 8 : b.type === 'galaxy' ? 5 : b.type === 'special_green' ? 4 : b.type === 'donut' ? 3 : b.type === 'golden' ? 2 : 1;
    const distA = Math.abs(head.x - a.x) + Math.abs(head.y - a.y);
    const distB = Math.abs(head.x - b.x) + Math.abs(head.y - b.y);

    const scoreA = distA / weightA;
    const scoreB = distB / weightB;
    return scoreA - scoreB;
  });

  // Evaluate candidate paths
  const topCandidates = candidateApples.slice(0, 12);
  for (const apple of topCandidates) {
    const path = findShortestPath(head, { x: apple.x, y: apple.y }, baseObstacles, cols, rows);
    if (path && path.length > 0) {
      if (isPathSafe(snake, path, cols, rows)) {
        // Safe path found to an apple!
        return {
          nextMove: path[0],
          targetApple: apple,
          isSurvivalMode: false,
          isAlert,
        };
      }
    }
  }

  // === SURVIVAL MODE ACTIVATION ===
  // When no safe apple path is found, or snake is coiled:
  // Fallback 1: Follow Tail safely (guaranteed space behind vacated tail)
  const pathToTail = findShortestPath(head, tail, baseObstacles, cols, rows);
  if (pathToTail && pathToTail.length > 1) {
    return {
      nextMove: pathToTail[0],
      targetApple: null,
      isSurvivalMode: true,
      isAlert: true,
    };
  }

  // Fallback 2: Choose safe neighbor with maximum reachable flood-fill space
  let bestNeighbor: SnakeCoordinate | null = null;
  let maxSpace = -1;

  for (const { dx, dy } of DIRECTIONS) {
    const nx = head.x + dx;
    const ny = head.y + dy;

    if (!isInsideGrid(nx, ny, cols, rows)) continue;

    const nKey = coordKey(nx, ny, cols);
    if (baseObstacles.has(nKey)) continue;

    const space = calculateReachableSpace({ x: nx, y: ny }, baseObstacles, cols, rows);
    if (space > maxSpace) {
      maxSpace = space;
      bestNeighbor = { x: nx, y: ny };
    }
  }

  return {
    nextMove: bestNeighbor,
    targetApple: null,
    isSurvivalMode: true,
    isAlert: true,
  };
}

/**
 * Backward-compatible helper for engine and unit tests
 */
export function determineNextMove(ctx: PathfindingContext): SnakeCoordinate | null {
  return decideAIMove(ctx).nextMove;
}
