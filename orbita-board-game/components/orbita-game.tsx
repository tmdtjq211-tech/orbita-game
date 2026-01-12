"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { GameBoard } from "./game-board"
import { PlayerHand } from "./player-hand"
import { GameLog } from "./game-log"
import { ModeSelector } from "./mode-selector"

import { database } from "@/lib/firebase"
import { ref, set, onValue, off } from "firebase/database"

import { type GameState, type Card as GameCard, type LogEntry, type GameMode, PLANET_INFO } from "@/lib/game-types"
import {
  initializeGame,
  validateSelection,
  playCards,
  determineRoundWinner,
  aiChooseCards
} from "@/lib/game-logic"

export default function OrbitaGame() {
  const [gameMode, setGameMode] = useState<GameMode | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [role, setRole] = useState<"host" | "guest" | "spectator">("host")
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [error, setError] = useState<string>("")
  const [roundCards, setRoundCards] = useState<{
    player: { cards: GameCard[]; position: number } | null
    ai: { cards: GameCard[]; position: number } | null
  }>({ player: null, ai: null })

  const [logs, setLogs] = useState<LogEntry[]>([])
  const logIdRef = useRef(0)
  const myKey = role === "host" ? "player" : "ai"

  // 1. [핵심] 공통 카드 제출 함수 (AI와 사람 모두 이 함수를 사용)
  const executeMove = async (playerKey: "player" | "ai", indices: number[]) => {
    if (!gameState) return

    const { newState, playedCards, newPosition } = playCards(gameState, playerKey, indices)
    const planet = playedCards[0].planet

    const newLogs = [...logs, {
      id: Date.now(), roundNumber: gameState.roundNumber, type: "play" as const,
      player: playerKey, planet, cardCount: playedCards.length, position: newPosition,
      timestamp: new Date(), message: `${playerKey === "player" ? "방장" : "참가자"}: ${PLANET_INFO[planet].name} ${playedCards.length}장 (위치 ${newPosition})`,
    }]

    let nextRoundCards = { ...roundCards, [playerKey]: { cards: playedCards, position: newPosition } }
    let finalState = { ...newState }

    // 라운드 종료 판정: 두 명 모두 카드를 냈을 때
    if (nextRoundCards.player && nextRoundCards.ai) {
      const winner = determineRoundWinner(nextRoundCards.player.position, nextRoundCards.ai.position)
      const allCards = [...nextRoundCards.player.cards, ...nextRoundCards.ai.cards]
      
      if (winner === "player") finalState.player.wonCards.push(...allCards)
      else if (winner === "ai") finalState.ai.wonCards.push(...allCards)

      finalState.roundNumber += 1
      finalState.isFirstPlayer = winner === "tie" ? finalState.isFirstPlayer : winner
      finalState.currentTurn = finalState.isFirstPlayer
      finalState.phase = finalState.isFirstPlayer === "player" ? "player-turn" : "ai-turn"
      finalState.firstPlayedPlanet = null
      nextRoundCards = { player: null, ai: null }
      
      newLogs.push({
        id: Date.now() + 1, roundNumber: gameState.roundNumber, type: "round-result" as const,
        message: `결과: ${winner === "tie" ? "무승부" : winner === "player" ? "방장 승리" : "참가자 승리"}!`,
        timestamp: new Date()
      })
    } else {
      // 첫 번째 플레이어가 냈을 때 턴 교체
      finalState.phase = (playerKey === "player") ? "ai-turn" : "player-turn"
      finalState.currentTurn = (playerKey === "player") ? "ai" : "player"
      finalState.firstPlayedPlanet = planet
    }

    // 상태 업데이트 (온라인/로컬)
    if (gameMode === "online" && roomId) {
      await set(ref(database, `rooms/${roomId}`), {
        state: finalState, roundCards: nextRoundCards, logs: newLogs, lastUpdated: Date.now()
      })
    } else {
      setGameState(finalState); setRoundCards(nextRoundCards); setLogs(newLogs)
    }
  }

  // 2. 플레이어 카드 제출 버튼
  const handlePlayCards = () => {
    if (!gameState || selectedIndices.length === 0) return
    const excludePlanet = gameState.isFirstPlayer !== myKey ? gameState.firstPlayedPlanet : undefined
    const validation = validateSelection(gameState[myKey].hand, selectedIndices, excludePlanet || undefined)

    if (!validation.valid) { setError(validation.message); return }

    executeMove(myKey, selectedIndices)
    setSelectedIndices([]); setError("")
  }

  // 3. [해결] AI 자동 턴 실행
  useEffect(() => {
    if (gameMode === "vs-ai" && gameState?.phase === "ai-turn") {
      const timer = setTimeout(() => {
        const aiIndices = aiChooseCards(gameState)
        if (aiIndices.length > 0) {
          executeMove("ai", aiIndices) // 상태를 거치지 않고 직접 함수 호출
        }
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [gameState?.phase, gameMode])

  // --- 이하 초기화 및 렌더링 로직 (동일) ---
  const startGame = useCallback((mode: GameMode, r: "host" | "guest" = "host", id: string | null = null) => {
    const newState = initializeGame()
    setGameState(newState); setGameMode(mode); setRole(r); setRoomId(id)
    setLogs([{ id: 0, roundNumber: 1, type: "game-start", timestamp: new Date(), message: "게임 시작!" }])
    setRoundCards({ player: null, ai: null })
  }, [])

  useEffect(() => {
    if (!roomId || gameMode !== "online" || !database) return
    const unsubscribe = onValue(ref(database, `rooms/${roomId}`), (snapshot) => {
      const data = snapshot.val()
      if (data) { setGameState(data.state); setRoundCards(data.roundCards); setLogs(data.logs) }
    })
    return () => off(ref(database, `rooms/${roomId}`))
  }, [roomId, gameMode])

  if (!gameMode) return <ModeSelector onSelectMode={(m) => startGame(m)} onJoinOnline={startGame} />
  if (!gameState) return <div className="text-white text-center p-20">로딩 중...</div>

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
           <div>ROUND {gameState.roundNumber} {roomId && `| 방: ${roomId}`}</div>
           <div className="font-bold text-blue-400">
              {(role === "host" && gameState.phase === "player-turn") || (role === "guest" && gameState.phase === "ai-turn") 
              ? "★ 내 차례" : "상대 대기 중..."}
           </div>
        </div>
        <GameBoard tokens={gameState.tokens} />
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <PlayerHand
              cards={gameState[myKey].hand}
              selectedIndices={selectedIndices}
              onSelectCard={(i: number) => { setError(""); setSelectedIndices(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i]) }}
              disabled={(role === "host" && gameState.phase !== "player-turn") || (role === "guest" && gameState.phase !== "ai-turn")}
            />
            {error && <div className="mt-2 text-red-400 text-center text-sm">{error}</div>}
            <Button onClick={handlePlayCards} disabled={selectedIndices.length === 0 || ((role === "host" && gameState.phase !== "player-turn") || (role === "guest" && gameState.phase !== "ai-turn"))} className="w-full mt-6 h-16 text-xl bg-blue-600">
              카드 제출 ({selectedIndices.length}장)
            </Button>
          </CardContent>
        </Card>
        <GameLog logs={logs} />
      </div>
    </div>
  )
}
