"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { GameBoard } from "./game-board"
import { PlayerHand } from "./player-hand"
import { GameLog } from "./game-log"
import { ModeSelector } from "./mode-selector"
// 경로 에러 방지를 위해 @ 대신 .. 상대경로로 수정했습니다
import { type GameState, type LogEntry, type GameMode, PLANET_INFO } from "../lib/game-types"
import { playCards, determineRoundWinner } from "../lib/game-logic"
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

  // 내 역할에 따른 데이터 매핑 (Host=player, Guest=ai)
  const myKey = role === "host" ? "player" : "ai"
  const opponentKey = role === "host" ? "ai" : "player"

  // 1. 온라인 동기화 (Firebase 리스너)
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

  // 2. 카드 내기 로직
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
        onSelectMode={(
