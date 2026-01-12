"use client"

import { useState, useEffect } from "react"
// UI 컴포넌트 경로도 @ 대신 상대 경로로 수정했습니다
import { Button } from "./ui/button"
import { GameBoard } from "./game-board"
import { PlayerHand } from "./player-hand"
import { GameLog } from "./game-log"
import { ModeSelector } from "./mode-selector"
// lib 폴더 경로 수정
import { type GameState, type LogEntry, type GameMode, PLANET_INFO } from "../lib/game-types"
import { playCards } from "../lib/game-logic"
import { database } from "../lib/firebase"
import { ref, set, onValue, off } from "firebase/database"

export default function OrbitaGame() {
  const [gameMode, setGameMode] = useState<GameMode | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [role, setRole] = useState<"host" | "guest" | "spectator">("host")
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [roundCards, setRoundCards] = useState<{player: any, ai: any}>({ player: null, ai: null })
  const [logs, setLogs] = useState<LogEntry[]>([])

  const myKey = role === "host" ? "player" : "ai"
  const opponentKey = role === "host" ? "ai" : "player"

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

  const handlePlayCards = async () => {
    if (!gameState || !roomId || selectedIndices.length === 0) return
    if (gameState.currentTurn !== myKey) return 

    const { newState, playedCards, newPosition } = playCards(gameState, myKey, selectedIndices)
    
    const newLog: LogEntry = {
      id: Date.now(), 
      roundNumber: gameState.roundNumber, 
      type: "play", 
      player: myKey,
      planet: playedCards[0].planet, 
      cardCount: playedCards.length, 
      position: newPosition,
      message: `${role === "host" ? "호스트" : "게스트"}가 ${PLANET_INFO[playedCards[0].planet].name} ${playedCards.length}장을 냈습니다.`,
      timestamp: new Date()
    }

    const updates: any = {
      state: {
        ...newState,
        currentTurn: opponentKey,
        phase: newState.isFirstPlayer === myKey ? (role === "host" ? "ai-turn" : "player-turn") : "round-end"
      },
      [`roundCards/${myKey}`]: { cards: playedCards, position: newPosition },
      logs: [...logs, newLog]
    }

    await set(ref(database, `rooms/${roomId}/gameState`), updates)
    setSelectedIndices([])
  }

  if (!gameMode) {
    return (
      <ModeSelector 
        onSelectMode={(m) => setGameMode(m)} 
        onJoinOnline={(id, r) => { 
          setRoomId(id); 
          setRole(r); 
          setGameMode("vs-ai"); 
        }} 
      />
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {roomId && (
        <div className="text-center bg-blue-900/30 p-2 rounded mb-4 border border-blue-500/50">
          방 코드: <span className="font-bold text-blue-400 text-xl">{roomId}</span> 
          <span className="ml-2 text-sm text-gray-400">({role === "host" ? "방장" : "참여자"})</span>
        </div>
      )}
      
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
              <Button onClick={handlePlayCards} className="w-full mt-4 h-12 text-lg">
                카드 내기 ({selectedIndices.length}장)
              </Button>
            )}
            {gameState.currentTurn !== myKey && (
              <div className="text-center mt-4 p-2 bg-gray-800 rounded animate-pulse text-blue-300">
                상대방이 카드를 내길 기다리는 중...
              </div>
            )}
          </div>
        </>
      )}
      <GameLog logs={logs} />
    </div>
  )
}
