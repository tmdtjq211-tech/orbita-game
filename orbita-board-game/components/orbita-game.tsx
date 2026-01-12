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
  
  // '이번 라운드에 낸 카드'만 따로 관리 (보드판 토큰과 별개)
  const roundCardsRef = useRef<{
    player: { cards: GameCard[]; position: number } | null
    ai: { cards: GameCard[]; position: number } | null
  }>({ player: null, ai: null })
  
  const [logs, setLogs] = useState<LogEntry[]>([])
  const myKey = role === "host" ? "player" : "ai"

  const executeMove = async (playerKey: "player" | "ai", indices: number[]) => {
    if (!gameState) return

    // 1. 카드를 내면 '보드판의 토큰'이 이동한 새로운 상태(newState)를 받아옵니다.
    const { newState, playedCards, newPosition } = playCards(gameState, playerKey, indices)
    const planet = playedCards[0].planet
    
    // 이번 라운드 제출 정보 저장
    roundCardsRef.current[playerKey] = { cards: playedCards, position: newPosition }

    const newLogs = [...logs, {
      id: Date.now(), roundNumber: gameState.roundNumber, type: "play" as const,
      player: playerKey, planet, cardCount: playedCards.length, position: newPosition,
      timestamp: new Date(), message: `${playerKey === "player" ? "방장" : "참가자"}가 ${PLANET_INFO[planet].name} 제출`,
    }]

    // 핵심: newState에는 이미 이동된 토큰 정보가 들어있습니다.
    let finalState = { ...newState }
    let nextRoundCards = { ...roundCardsRef.current }

    // 2. 라운드 종료 판정 (두 명 다 냈을 때)
    if (nextRoundCards.player && nextRoundCards.ai) {
      const winner = determineRoundWinner(nextRoundCards.player.position, nextRoundCards.ai.position)
      const allRoundCards = [...nextRoundCards.player.cards, ...nextRoundCards.ai.cards]
      
      if (winner === "player") finalState.player.wonCards.push(...allRoundCards)
      else if (winner === "ai") finalState.ai.wonCards.push(...allRoundCards)

      // 보드판(tokens)은 그대로 두고, 라운드 정보만 업데이트
      finalState.roundNumber += 1
      finalState.isFirstPlayer = winner === "tie" ? finalState.isFirstPlayer : winner
      finalState.currentTurn = finalState.isFirstPlayer
      finalState.phase = finalState.isFirstPlayer === "player" ? "player-turn" : "ai-turn"
      finalState.firstPlayedPlanet = null
      
      // '낸 카드 섹션'만 비웁니다. (행성 보드판은 유지!)
      roundCardsRef.current = { player: null, ai: null }
      nextRoundCards = { player: null, ai: null }

      newLogs.push({
        id: Date.now() + 1, roundNumber: gameState.roundNumber, type: "round-result" as const,
        message: `라운드 종료: ${winner === "tie" ? "무승부" : (winner === "player" ? "방장" : "참가자") + " 승리"}!`,
        timestamp: new Date()
      })
    } else {
      // 첫 번째 사람이 냈을 때는 턴만 넘김
      finalState.phase = (playerKey === "player") ? "ai-turn" : "player-turn"
      finalState.currentTurn = (playerKey === "player") ? "ai" : "player"
      finalState.firstPlayedPlanet = planet
    }

    // 3. 업데이트된 보드판 상태(finalState)를 저장
    if (gameMode === "online" && roomId) {
      await set(ref(database, `rooms/${roomId}`), {
        state: finalState, roundCards: nextRoundCards, logs: newLogs, lastUpdated: Date.now()
      })
    } else {
      setGameState(finalState); setLogs(newLogs)
    }
  }

  // (플레이어 버튼 클릭 / AI 자동 실행 로직은 위 executeMove를 호출하므로 그대로 유지)
  const handlePlayCards = () => {
    if (!gameState || selectedIndices.length === 0) return
    const validation = validateSelection(gameState[myKey].hand, selectedIndices, (gameState.isFirstPlayer !== myKey ? gameState.firstPlayedPlanet : undefined) || undefined)
    if (!validation.valid) { setError(validation.message); return }
    executeMove(myKey, selectedIndices)
    setSelectedIndices([]); setError("")
  }

  useEffect(() => {
    if (gameMode === "vs-ai" && gameState?.phase === "ai-turn") {
      const timer = setTimeout(() => {
        const aiIndices = aiChooseCards(gameState)
        if (aiIndices.length > 0) executeMove("ai", aiIndices)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [gameState?.phase, gameState?.roundNumber, gameMode])

  // 초기화 및 Firebase 수신 로직 (생략 - 기존과 동일)
  const startGame = useCallback((mode: GameMode, r: "host" | "guest" = "host", id: string | null = null) => {
    const newState = initializeGame()
    setGameState(newState); setGameMode(mode); setRole(r); setRoomId(id)
    setLogs([{ id: 0, roundNumber: 1, type: "game-start", timestamp: new Date(), message: "게임 시작!" }])
    roundCardsRef.current = { player: null, ai: null }
  }, [])

  useEffect(() => {
    if (!roomId || gameMode !== "online" || !database) return
    const unsubscribe = onValue(ref(database, `rooms/${roomId}`), (snapshot) => {
      const data = snapshot.val()
      if (data) { setGameState(data.state); roundCardsRef.current = data.roundCards || { player: null, ai: null }; setLogs(data.logs || []); }
    })
    return () => off(ref(database, `rooms/${roomId}`))
  }, [roomId, gameMode])

  if (!gameMode) return <ModeSelector onSelectMode={(m) => startGame(m)} onJoinOnline={startGame} />
  if (!gameState) return <div className="text-white text-center p-20">데이터 불러오는 중...</div>

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* 상단바: 라운드와 턴 표시 */}
        <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
           <div className="text-slate-400 font-bold text-xl tracking-tighter">ORBITA ROUND {gameState.roundNumber}</div>
           <div className={`px-4 py-1 rounded-full text-sm font-black ${
              (role === "host" && gameState.phase === "player-turn") || (role === "guest" && gameState.phase === "ai-turn") 
              ? "bg-blue-600 text-white animate-pulse" : "bg-slate-800 text-slate-500"
           }`}>
              {(role === "host" && gameState.phase === "player-turn") || (role === "guest" && gameState.phase === "ai-turn") 
              ? "★ 당신의 차례" : "상대방 차례 대기"}
           </div>
        </div>

        {/* 1. 보드판: 행성 위 토큰은 절대 비워지지 않고 누적/이동됩니다! */}
        <GameBoard tokens={gameState.tokens} />

        {/* 2. 조작부: 카드 선택 및 내기 */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <PlayerHand
              cards={gameState[myKey].hand}
              selectedIndices={selectedIndices}
              onSelectCard={(i: number) => { setError(""); setSelectedIndices(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i]) }}
              disabled={(role === "host" && gameState.phase !== "player-turn") || (role === "guest" && gameState.phase !== "ai-turn")}
            />
            {error && <div className="mt-4 text-red-400 text-center font-bold">{error}</div>}
            <Button 
              onClick={handlePlayCards} 
              disabled={selectedIndices.length === 0 || ((role === "host" && gameState.phase !== "player-turn") || (role === "guest" && gameState.phase !== "ai-turn"))}
              className="w-full mt-6 h-16 text-2xl font-black bg-blue-700 hover:bg-blue-600 shadow-xl"
            >
              카드 내기 ({selectedIndices.length}장)
            </Button>
          </CardContent>
        </Card>
        
        <GameLog logs={logs} />
      </div>
    </div>
  )
}
