export type Planet = "water" | "forest" | "desert" | "galaxy"

export interface Card {
  id: string
  planet: Planet
}

export interface TokenPosition {
  planet: Planet
  position: number | null // null = 판 밖, 1-14 = 위치 (14 초과 가능)
}

export interface PlayerState {
  hand: Card[]
  wonCards: Card[]
}

export interface RoundResult {
  winner: "player" | "ai" | "tie"
  playerCards: Card[]
  aiCards: Card[]
  playerPosition: number
  aiPosition: number
}

export interface GameState {
  player: PlayerState
  ai: PlayerState
  tokens: TokenPosition[]
  currentTurn: "player" | "ai"
  isFirstPlayer: "player" | "ai"
  roundNumber: number
  phase: "waiting" | "player-turn" | "ai-turn" | "round-end" | "game-over"
  lastRoundResult: RoundResult | null
  firstPlayedPlanet: Planet | null
  message: string
}

export const PLANET_INFO: Record<Planet, { emoji: string; name: string; color: string }> = {
  water: { emoji: "🌊", name: "물", color: "bg-blue-500" },
  forest: { emoji: "🌳", name: "숲", color: "bg-green-500" },
  desert: { emoji: "🏜️", name: "사막", color: "bg-orange-500" },
  galaxy: { emoji: "🔮", name: "은하", color: "bg-purple-500" },
}

export const PLANET_OWNER: Record<Planet, "player" | "ai"> = {
  water: "player",
  forest: "player",
  desert: "ai",
  galaxy: "ai",
}

export interface LogEntry {
  id: number
  roundNumber: number
  type: "play" | "round-result" | "game-start" | "game-end"
  player?: "player" | "ai"
  planet?: Planet
  cardCount?: number
  position?: number
  winner?: "player" | "ai" | "tie"
  message: string
  timestamp: Date
}

export type GameMode = "vs-ai" | "ai-vs-ai"
