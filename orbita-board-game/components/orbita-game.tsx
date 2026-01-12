"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GameBoard } from "./game-board"
import { PlayerHand } from "./player-hand"
import { WonCardsDisplay } from "./won-cards-display"
import { GameResult } from "./game-result"
import { GameLog } from "./game-log"
import { ModeSelector } from "./mode-selector"
import { type GameState, type Card as GameCard, type LogEntry, type GameMode, PLANET_INFO } from "@/lib/game-types"
import { initializeGame, validateSelection, playCards, determineRoundWinner, findPlayableGroups } from "@/lib/game-logic"
import { database } from "@/lib/firebase"
import { ref, set, onValue, off, serverTimestamp } from "firebase/database"

export default function OrbitaGame() {
  const [gameMode, setGameMode] = useState<GameMode | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [role, setRole] = useState<"host" | "guest" | "spectator">("host")
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [roundCards, setRoundCards] = useState<{player: any, ai: any}>({ player: null, ai: null })
  const [logs, setLogs] = useState<LogEntry[]>([])

  // 내 역할에 따른 데이터 매핑 (Host=player, Guest=ai)
  const myKey = role === "host" ? "player" : "ai"
  const opponentKey = role === "host" ? "ai" : "player"

  // 1. 온라인 입장 및 동기화
  useEffect(() => {
    if (!roomId) return
    const gameRef = ref(database, `rooms/${roomId}/gameState`)
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val()
      if (!data) return
      setGameState(data.state)
      setRoundCards(data.roundCards || { player: null, ai: null })
      setLogs(data.logs || [])
    })
    return () => off(gameRef)
  }, [roomId])

  // 2. 카드 내기 (Firebase 전송)
  const handlePlayCards = async () => {
    if (!gameState || !roomId || selectedIndices.length === 0) return
    if (gameState.currentTurn !== myKey) return // 내 턴 아니면 컷

    const validation = validateSelection(gameState[myKey].hand, selectedIndices, gameState.firstPlayedPlanet || undefined)
    if (!validation.valid) return alert(validation.message)

    const { newState, playedCards, newPosition } = playCards(gameState, myKey, selectedIndices)
    
    // 로그 생성
    const newLog: LogEntry = {
      id: Date.now(), roundNumber: gameState.roundNumber, type: "play", player: myKey,
      planet: playedCards[0].planet, cardCount: playedCards.length, position: newPosition,
      message: `${role === "host" ? "호스트" : "게스트"}가 ${PLANET_INFO[playedCards[0].planet].name} ${playedCards.length}장을 냈습니다.`,
      timestamp: new Date()
    }

    // 데이터 업데이트 준비
    const updates: any = {
      state: {
        ...newState,
        currentTurn: opponentKey, // 턴 넘기기
        phase: newState.isFirstPlayer === myKey ? (role === "host" ? "ai-turn" : "player-turn") : "round-end"
      },
      [`roundCards/${myKey}`]: { cards: playedCards, position: newPosition },
      logs: [...logs, newLog]
    }

    // 두 명 다 냈다면 결과 처리 (Host가 계산 담당)
    if (gameState.isFirstPlayer !== myKey && roundCards[opponentKey]) {
      const winner = determineRoundWinner(role === "host" ? newPosition : roundCards.player.position, role === "host" ? roundCards.ai.position : newPosition)
      // ... 여기서 결과에 따른 카드 분배 로직 추가 ...
    }

    await set(ref(database, `rooms/${roomId}/gameState`), updates)
    setSelectedIndices([])
  }

  if (!gameMode) return <ModeSelector onSelectMode={(m) => setGameMode(m)} onJoinOnline={(id, r) => { setRoomId(id); setRole(r); setGameMode("vs-ai"); }} />

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* 룸 코드 표시 */}
      {roomId && <div className="text-center bg-blue-900/30 p-2 rounded mb-4">방 코드: <span className="font-bold text-blue-400">{roomId}</span> ({role})</div>}
      
      {gameState && (
        <>
          <GameBoard tokens={gameState.tokens} />
          <div className="mt-8">
            <PlayerHand 
              cards={gameState[myKey].hand} 
              selectedIndices={selectedIndices} 
              onSelectCard={(i) => setSelectedIndices(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
              disabled={gameState.currentTurn !== myKey}
            />
            {gameState.currentTurn === myKey && (
              <Button onClick={handlePlayCards} className="w-full mt-4">카드 내기 ({selectedIndices.length}장)</Button>
            )}
          </div>
        </>
      )}
      <GameLog logs={logs} />
    </div>
  )
}