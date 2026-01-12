import { type Card, type Planet, type TokenPosition, type GameState, PLANET_INFO } from "./game-types"

// 이동 순서: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 7+ → 6+ → 5+ → 4+ → 3+ → 2+ → 1+
// 크기 순서: 1 < 1+ < 2 < 2+ < 3 < 3+ < 4 < 4+ < 5 < 5+ < 6 < 6+ < 7 < 7+

// position 1-14는 내부 이동 순서
export const TRACK_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
export const TRACK_LABELS = ["1", "2", "3", "4", "5", "6", "7", "7+", "6+", "5+", "4+", "3+", "2+", "1+"]

// 1=1, 2=2, 3=3, 4=4, 5=5, 6=6, 7=7, 7+=7.5, 6+=6.5, 5+=5.5, 4+=4.5, 3+=3.5, 2+=2.5, 1+=1.5
export function getPositionValue(position: number | null): number {
  if (position === null) return 0
  if (position >= 15) return 8 + (position - 14) * 0.1 // 탈출한 경우 7.5보다 크게

  // position 1-7: 값 1-7
  // position 8: 7+ = 7.5
  // position 9: 6+ = 6.5
  // position 10: 5+ = 5.5
  // position 11: 4+ = 4.5
  // position 12: 3+ = 3.5
  // position 13: 2+ = 2.5
  // position 14: 1+ = 1.5
  const valueMap: Record<number, number> = {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 7.5,
    9: 6.5,
    10: 5.5,
    11: 4.5,
    12: 3.5,
    13: 2.5,
    14: 1.5,
  }
  return valueMap[position] || 0
}

// position을 트랙 라벨로 변환
export function getTrackLabel(position: number | null): string {
  if (position === null) return "대기"
  if (position >= 1 && position <= 14) return TRACK_LABELS[position - 1]
  return `탈출(+${position - 14})` // 14를 넘어간 경우
}

// Create initial deck of 28 cards (7 of each planet)
export function createDeck(): Card[] {
  const planets: Planet[] = ["water", "forest", "desert", "galaxy"]
  const deck: Card[] = []

  planets.forEach((planet) => {
    for (let i = 0; i < 7; i++) {
      deck.push({ id: `${planet}-${i}`, planet })
    }
  })

  return shuffleDeck(deck)
}

// Fisher-Yates shuffle
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function initializeGame(): GameState {
  const deck = createDeck()
  const playerHand = deck.slice(0, 14)
  const aiHand = deck.slice(14, 28)

  const firstPlayer = Math.random() < 0.5 ? "player" : "ai"

  return {
    player: { hand: playerHand, wonCards: [] },
    ai: { hand: aiHand, wonCards: [] },
    tokens: [
      { planet: "water", position: null },
      { planet: "forest", position: null },
      { planet: "desert", position: null },
      { planet: "galaxy", position: null },
    ],
    currentTurn: firstPlayer,
    isFirstPlayer: firstPlayer,
    roundNumber: 1,
    phase: firstPlayer === "player" ? "player-turn" : "ai-turn",
    lastRoundResult: null,
    firstPlayedPlanet: null,
    message:
      firstPlayer === "player" ? "당신이 선공입니다! 카드를 선택하세요." : "AI가 선공입니다. AI의 차례를 기다리세요...",
  }
}

// Find valid card groups that can be played
export function findPlayableGroups(
  hand: Card[],
  excludePlanet?: Planet,
): { planet: Planet; indices: number[]; minPlay: number; maxPlay: number }[] {
  const groups: { planet: Planet; indices: number[]; minPlay: number; maxPlay: number }[] = []

  if (hand.length === 0) return groups

  let i = 0
  while (i < hand.length) {
    const planet = hand[i].planet

    // Skip if this planet should be excluded (for second player)
    if (excludePlanet && planet === excludePlanet) {
      i++
      continue
    }

    // Find consecutive cards of the same planet
    const startIdx = i
    const indices: number[] = [i]

    while (i + 1 < hand.length && hand[i + 1].planet === planet) {
      i++
      indices.push(i)
    }

    // If 4+ consecutive, can play 1-3 at a time
    // Otherwise must play all consecutive
    const minPlay = indices.length >= 4 ? 1 : indices.length
    const maxPlay = Math.min(3, indices.length)

    groups.push({ planet, indices, minPlay, maxPlay })
    i++
  }

  return groups
}

// Validate card selection
export function validateSelection(
  hand: Card[],
  selectedIndices: number[],
  excludePlanet?: Planet,
): { valid: boolean; message: string } {
  if (selectedIndices.length === 0) {
    return { valid: false, message: "최소 1장의 카드를 선택해야 합니다." }
  }

  if (selectedIndices.length > 3) {
    return { valid: false, message: "최대 3장까지만 낼 수 있습니다." }
  }

  // Check all selected cards are the same planet
  const planets = selectedIndices.map((i) => hand[i].planet)
  const uniquePlanets = new Set(planets)
  if (uniquePlanets.size > 1) {
    return { valid: false, message: "같은 종류의 행성 카드만 낼 수 있습니다." }
  }

  const selectedPlanet = planets[0]

  // Check if excluded planet
  if (excludePlanet && selectedPlanet === excludePlanet) {
    // Check if player has any other playable cards
    const otherPlayable = findPlayableGroups(hand, excludePlanet)
    if (otherPlayable.length > 0) {
      return {
        valid: false,
        message: `후공은 선공이 낸 ${PLANET_INFO[excludePlanet].name} 행성과 다른 카드를 내야 합니다.`,
      }
    }
    // If no other options, allow playing the same planet
  }

  // Sort selected indices
  const sortedIndices = [...selectedIndices].sort((a, b) => a - b)

  // Check if selected cards are consecutive in hand
  for (let i = 1; i < sortedIndices.length; i++) {
    if (sortedIndices[i] !== sortedIndices[i - 1] + 1) {
      return { valid: false, message: "선택한 카드들은 손에서 연속되어 있어야 합니다." }
    }
  }

  // Find the full consecutive group containing selected cards
  const startIdx = sortedIndices[0]
  const endIdx = sortedIndices[sortedIndices.length - 1]

  // Count consecutive cards before selection
  let groupStart = startIdx
  while (groupStart > 0 && hand[groupStart - 1].planet === selectedPlanet) {
    groupStart--
  }

  // Count consecutive cards after selection
  let groupEnd = endIdx
  while (groupEnd < hand.length - 1 && hand[groupEnd + 1].planet === selectedPlanet) {
    groupEnd++
  }

  const totalConsecutive = groupEnd - groupStart + 1
  const selectedCount = sortedIndices.length

  // Rule: If less than 4 consecutive, must play all
  if (totalConsecutive < 4 && selectedCount !== totalConsecutive) {
    return {
      valid: false,
      message: `연속된 ${totalConsecutive}장의 ${PLANET_INFO[selectedPlanet].name} 카드는 반드시 함께 내야 합니다.`,
    }
  }

  // Rule: If 4+, can play 1-3 but only from one end
  if (totalConsecutive >= 4) {
    const fromStart = sortedIndices[0] === groupStart
    const toEnd = sortedIndices[sortedIndices.length - 1] === groupEnd

    if (!fromStart && !toEnd) {
      return {
        valid: false,
        message: "연속된 카드 그룹의 처음이나 끝에서만 떼어낼 수 있습니다.",
      }
    }
  }

  return { valid: true, message: "" }
}

export function calculateTokenPosition(
  currentPos: number | null,
  moveCount: number,
  allTokens: TokenPosition[],
  movingPlanet: Planet,
): number {
  // 다른 토큰들의 위치
  const occupiedPositions = new Set(
    allTokens.filter((t) => t.position !== null && t.planet !== movingPlanet).map((t) => t.position),
  )

  // 시작 위치 (null이면 0 = 판 밖)
  let pos = currentPos === null ? 0 : currentPos

  // 이동 거리만큼 전진
  for (let i = 0; i < moveCount; i++) {
    if (pos === 0) {
      pos = 1 // 판 밖에서 1로 진입
    } else {
      pos = pos + 1 // 계속 전진 (14 초과 가능 = 탈출)
    }
  }

  // 최종 착지점에 다른 토큰이 있으면, 다음 빈 칸으로 이동
  while (occupiedPositions.has(pos)) {
    pos = pos + 1
  }

  return pos
}

export function playCards(
  state: GameState,
  player: "player" | "ai",
  cardIndices: number[],
): { newState: GameState; playedCards: Card[]; newPosition: number } {
  const playerState = player === "player" ? state.player : state.ai
  const sortedIndices = [...cardIndices].sort((a, b) => a - b)

  // Get played cards
  const playedCards = sortedIndices.map((i) => playerState.hand[i])
  const planet = playedCards[0].planet

  // Remove cards from hand (in reverse order to maintain indices)
  const newHand = [...playerState.hand]
  for (let i = sortedIndices.length - 1; i >= 0; i--) {
    newHand.splice(sortedIndices[i], 1)
  }

  const newPosition = calculateTokenPosition(
    state.tokens.find((t) => t.planet === planet)!.position,
    playedCards.length,
    state.tokens,
    planet,
  )

  // Update token position
  const newTokens = state.tokens.map((t) => (t.planet === planet ? { ...t, position: newPosition } : t))

  // Update state
  const newPlayerState = { ...playerState, hand: newHand }

  return {
    newState: {
      ...state,
      [player]: newPlayerState,
      tokens: newTokens,
    },
    playedCards,
    newPosition,
  }
}

// Determine round winner
export function determineRoundWinner(playerPosition: number, aiPosition: number): "player" | "ai" | "tie" {
  const playerValue = getPositionValue(playerPosition)
  const aiValue = getPositionValue(aiPosition)

  if (playerValue > aiValue) return "player"
  if (aiValue > playerValue) return "ai"
  return "tie"
}

// AI strategy: Choose optimal cards to play
export function aiChooseCards(state: GameState): number[] {
  const hand = state.ai.hand
  const excludePlanet = state.isFirstPlayer === "player" ? state.firstPlayedPlanet : undefined
  const playableGroups = findPlayableGroups(hand, excludePlanet || undefined)

  if (playableGroups.length === 0) {
    // Must play excluded planet if no other options
    const allGroups = findPlayableGroups(hand)
    if (allGroups.length === 0) return []

    const group = allGroups[0]
    return group.indices.slice(0, Math.min(group.maxPlay, group.indices.length))
  }

  // Strategy: Prioritize based on current token positions and opponent's likely moves
  let bestGroup = playableGroups[0]
  let bestScore = Number.NEGATIVE_INFINITY

  for (const group of playableGroups) {
    const token = state.tokens.find((t) => t.planet === group.planet)!
    const currentPos = token.position || 0

    // Try different play amounts
    for (let count = group.minPlay; count <= group.maxPlay; count++) {
      const newPos = calculateTokenPosition(token.position, count, state.tokens, group.planet)

      // Score based on final position and cards used efficiency
      const score = newPos * 2 - count

      if (score > bestScore) {
        bestScore = score
        bestGroup = { ...group, maxPlay: count }
      }
    }
  }

  // Return indices for the chosen play
  const count = Math.min(bestGroup.maxPlay, bestGroup.indices.length)
  return bestGroup.indices.slice(0, count)
}

// Calculate final scores
export function calculateFinalScores(
  playerWonCards: Card[],
  aiWonCards: Card[],
): {
  playerPenalty: number
  aiPenalty: number
  winner: "player" | "ai" | "tie"
  details: { planet: Planet; playerCount: number; aiCount: number; playerFlipped: boolean; aiFlipped: boolean }[]
} {
  const planets: Planet[] = ["water", "forest", "desert", "galaxy"]
  const details: {
    planet: Planet
    playerCount: number
    aiCount: number
    playerFlipped: boolean
    aiFlipped: boolean
  }[] = []

  let playerPenalty = 0
  let aiPenalty = 0

  for (const planet of planets) {
    const playerCount = playerWonCards.filter((c) => c.planet === planet).length
    const aiCount = aiWonCards.filter((c) => c.planet === planet).length

    let playerFlipped = false
    let aiFlipped = false

    if (playerCount < aiCount) {
      playerFlipped = true
      playerPenalty += playerCount
    } else if (aiCount < playerCount) {
      aiFlipped = true
      aiPenalty += aiCount
    }

    details.push({ planet, playerCount, aiCount, playerFlipped, aiFlipped })
  }

  let winner: "player" | "ai" | "tie"

  if (playerPenalty < aiPenalty) {
    winner = "player"
  } else if (aiPenalty < playerPenalty) {
    winner = "ai"
  } else {
    // Tie-breaker: Total cards won
    const playerTotal = playerWonCards.length
    const aiTotal = aiWonCards.length

    if (playerTotal > aiTotal) {
      winner = "player"
    } else if (aiTotal > playerTotal) {
      winner = "ai"
    } else {
      winner = "tie"
    }
  }

  return { playerPenalty, aiPenalty, winner, details }
}
