"use client"

import { useState, useEffect } from "react"
// 경로 에러를 피하기 위해 상대 경로(./)로 모두 수정했습니다.
import { Button } from "./ui/button"
import { GameBoard } from "./game-board"
import { PlayerHand } from "./player-hand"
import { GameLog } from "./game-log"
import { ModeSelector } from "./mode-selector"
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

  // 실시간 데이터 감시 (Firebase)
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

  // 카드 내기 및 온라인 전송
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
      message: `${role === "host" ? "방장" : "참여자"}가 ${PLANET_INFO[playedCards[0].planet].name} ${playedCards.length}장을 냈습니다.`,
      timestamp: new Date()
    }

    const updates = {
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

  // 초기 화면 (온라인 모드 선택창)
  if (!gameMode) {
    return (
      <ModeSelector 
        onSelectMode={(m) => setGameMode(m)} 
        onJoinOnline={(id, r) => { 
          setRoomId(id); 
          setRole(r); 
          setGameMode("vs-ai"); // 온라인 대전 시작
        }} 
      />
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 text-white">
      {roomId && (
        <div className="text-center bg-blue-900/40 p-3 rounded-lg mb-6 border border-blue-400">
          <p className="text-sm text-blue-200">초대 코드</p>
          <span className="font-bold text-2xl tracking-widest text-white">{roomId}</span>
          <p className="text-xs mt-1 text-blue-300">상대방에게 이 코드를 알려주세요!</p>
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
            {gameState.currentTurn === myKey ? (
              <Button onClick={handlePlayCards} className="w-full mt-4 h-14 text-xl bg-blue-600 hover:bg-blue-500">
                카드 내기 ({selectedIndices.length}장)
              </Button>
            ) : (
              <div className="w-full mt-4 p-4 text-center bg-gray-800 rounded-lg animate-pulse text-blue-300 border border-gray-700">
                상대방의 턴입니다...
              </div>
            )}
          </div>
        </>
      )}
      <GameLog logs={logs} />
    </div>
  )
}
