"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  findPlayableGroups,
  aiChooseCards // AI 로직 추가
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

  // 데이터 동기화 함수
  const syncToFirebase = async (newState: GameState, newRoundCards: any, newLogs: LogEntry[]) => {
    if (!roomId || !database) return
    await set(ref(database, `rooms/${roomId}`), {
      state: newState,
      roundCards: newRoundCards,
      logs: newLogs,
      lastUpdated: Date.now()
    })
  }

  // 게임 시작 처리
  const startGame = useCallback((mode: GameMode, r: "host" | "guest" = "host", id: string | null = null) => {
    const newState = initializeGame()
    const initialLogs = [{
      id: 0, roundNumber: 1, type: "game-start" as const, timestamp: new Date(),
      message: `게임 시작! ${mode === "online" ? "온라인" : "AI"} 모드`,
    }]

    setGameState(newState)
    setGameMode(mode)
    setRole(r)
    setRoomId(id)
    setLogs(initialLogs)
    setRoundCards({ player: null, ai: null })

    if (mode === "online" && r === "host" && id) {
      syncToFirebase(newState, { player: null, ai: null }, initialLogs)
    }
  }, [])

  // 온라인 데이터 수신
  useEffect(() => {
    if (!roomId || gameMode !== "online" || !database) return
    const gameRef = ref(database, `rooms/${roomId}`)
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setGameState(data.state)
        setRoundCards(data.roundCards || { player: null, ai: null })
        setLogs(data.logs || [])
      }
    })
    return () => off(gameRef)
  }, [roomId, gameMode])

  // 카드 제출 메인 로직
  const handlePlayCards = async () => {
    if (!gameState || selectedIndices.length === 0) return

    const playerKey = myKey
    const excludePlanet = gameState.isFirstPlayer !== playerKey ? gameState.firstPlayedPlanet : undefined
    const validation = validateSelection(gameState[playerKey].hand, selectedIndices, excludePlanet || undefined)

    if (!validation.valid) {
      setError(validation.message); return
    }

    const { newState, playedCards, newPosition } = playCards(gameState, playerKey, selectedIndices)
    const planet = playedCards[0].planet

    const newLogs = [...logs, {
      id: Date.now(), roundNumber: gameState.roundNumber, type: "play" as const,
      player: playerKey, planet, cardCount: playedCards.length, position: newPosition,
      timestamp: new Date(), message: `${role === "host" ? "방장" : "참가자"}: ${PLANET_INFO[planet].name} ${playedCards.length}장 (위치 ${newPosition})`,
    }]

    let nextRoundCards = { ...roundCards, [playerKey]: { cards: playedCards, position: newPosition } }
    let finalState = { ...newState }

    // 라운드 종료 판정 (두 명 모두 카드를 냈을 때)
    if (nextRoundCards.player && nextRoundCards.ai) {
      const winner = determineRoundWinner(nextRoundCards.player.position, nextRoundCards.ai.position)
      const allCards = [...nextRoundCards.player.cards, ...nextRoundCards.ai.cards]
      
      if (winner === "player") finalState.player.wonCards.push(...allCards)
      else if (winner === "ai") finalState.ai.wonCards.push(...allCards)

      // 라운드 리셋 및 다음 라운드 준비
      finalState.roundNumber += 1
      finalState.isFirstPlayer = winner === "tie" ? finalState.isFirstPlayer : winner
      finalState.currentTurn = finalState.isFirstPlayer
      finalState.phase = finalState.isFirstPlayer === "player" ? "player-turn" : "ai-turn"
      finalState.firstPlayedPlanet = null
      nextRoundCards = { player: null, ai: null }
      
      newLogs.push({
        id: Date.now() + 1, roundNumber: gameState.roundNumber, type: "round-result" as const,
        message: `라운드 종료: ${winner === "tie" ? "무승부" : winner === "player" ? "방장 승리" : "참가자 승리"}!`,
        timestamp: new Date()
      })
    } else {
      // 첫 번째 플레이어가 냈을 때
      finalState.phase = (playerKey === "player") ? "ai-turn" : "player-turn"
      finalState.currentTurn = (playerKey === "player") ? "ai" : "player"
      finalState.firstPlayedPlanet = planet
    }

    if (gameMode === "online") await syncToFirebase(finalState, nextRoundCards, newLogs)
    else {
      setGameState(finalState); setRoundCards(nextRoundCards); setLogs(newLogs)
    }
    setSelectedIndices([]); setError("")
  }

  // AI 자동 턴 실행 (싱글 모드용)
  useEffect(() => {
    if (gameMode === "vs-ai" && gameState?.phase === "ai-turn") {
      const timer = setTimeout(() => {
        const aiIndices = aiChooseCards(gameState)
        if (aiIndices.length > 0) {
           setSelectedIndices(aiIndices)
           // role을 "guest"로 임시 변경하여 AI 슬롯으로 카드 제출
           setRole("guest") 
           handlePlayCards().then(() => setRole("host"))
        }
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [gameState?.phase, gameMode])

  if (!gameMode) {
    return (
      <ModeSelector 
        onSelectMode={(m) => startGame(m, "host")} 
        onJoinOnline={(id, r) => startGame("online", r, id)} 
      />
    )
  }

  if (!gameState) return <div className="text-white text-center p-20 font-bold">로딩 중...</div>

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white font-sans">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex justify-between items-center bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow-2xl">
          <div className="text-sm font-bold text-slate-400">ROUND {gameState.roundNumber}</div>
          <div className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-tighter ${
            (role === "host" && gameState.phase === "player-turn") || (role === "guest" && gameState.phase === "ai-turn")
            ? "bg-green-500 text-white animate-pulse" : "bg-slate-800 text-slate-500"
          }`}>
            {(role === "host" && gameState.phase === "player-turn") || (role === "guest" && gameState.phase === "ai-turn")
            ? "● 내 차례" : "○ 상대 대기 중"}
          </div>
        </div>

        <GameBoard tokens={gameState.tokens} />
        
        <div className="grid grid-cols-1 gap-6">
          <Card className="bg-slate-900 border-slate-800 overflow-hidden">
            <CardContent className="p-6">
              <PlayerHand
                cards={gameState[myKey].hand}
                selectedIndices={selectedIndices}
                onSelectCard={(i: number) => {
                  setError("")
                  setSelectedIndices(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])
                }}
                disabled={(role === "host" && gameState.phase !== "player-turn") || (role === "guest" && gameState.phase !== "ai-turn")}
              />
              {error && <div className="mt-4 text-red-400 text-center text-sm font-bold animate-bounce">{error}</div>}
              <Button 
                onClick={handlePlayCards} 
                className="w-full mt-6 h-16 text-xl font-black bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all"
                disabled={selectedIndices.length === 0 || ((role === "host" && gameState.phase !== "player-turn") || (role === "guest" && gameState.phase !== "ai-turn"))}
              >
                카드 제출 ({selectedIndices.length}장)
              </Button>
            </CardContent>
          </Card>
          <GameLog logs={logs} />
        </div>
      </div>
    </div>
  )
}
