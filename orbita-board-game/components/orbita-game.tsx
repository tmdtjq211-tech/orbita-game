"use client"

import { useState, useEffect } from "react"
// UI 부품들을 가져올 때 @/ 대신 ./ (현재 폴더)를 사용하도록 수정했습니다.
import { Button } from "./ui/button"
import { GameBoard } from "./game-board"
import { PlayerHand } from "./player-hand"
import { GameLog } from "./game-log"
import { ModeSelector } from "./mode-selector"

// lib 폴더는 한 단계 위에 있으므로 ../ 를 사용합니다.
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

  // 실시간 데이터 감시 (Firebase 연동)
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

  // 카드 내기 및 Firebase 전송 로직
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

  // 초기 화면 (온라인 모드 선택)
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
              onSelectCard={(
