"use client"

import React, { useState, useEffect } from "react"
import { ref, set, onValue, off } from "firebase/database"
// 아래는 프로젝트에 이미 설치된 기본 라이브러리들입니다.
import { Card } from "@/components/ui/card" 
import { Button } from "@/components/ui/button"
import { type GameState, type LogEntry, type GameMode, PLANET_INFO } from "../lib/game-types"
import { playCards } from "../lib/game-logic"
import { database } from "../lib/firebase"

/** * [중요] 모든 하위 부품(GameBoard, PlayerHand 등)을 
 * 외부 파일에서 부르지 않고 이 파일 안에서 직접 정의합니다. 
 */

// 1. 게임 보드 부품
const GameBoard = ({ tokens }: { tokens: any }) => (
  <div className="grid grid-cols-4 gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
    {Object.entries(PLANET_INFO).map(([id, info]) => (
      <div key={id} className="relative flex flex-col items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <div className="text-3xl mb-2">{info.icon}</div>
        <div className="text-xs font-bold text-slate-400">{info.name}</div>
        <div className="absolute -top-2 -right-2 bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold shadow-lg border-2 border-slate-900">
          {tokens[id] || 0}
        </div>
      </div>
    ))}
  </div>
)

// 2. 플레이어 손패 부품
const PlayerHand = ({ cards, selectedIndices, onSelectCard, disabled }: any) => (
  <div className="flex flex-wrap gap-3 justify-center">
    {cards.map((card: any, idx: number) => (
      <div
        key={idx}
        onClick={() => !disabled && onSelectCard(idx)}
        className={`relative cursor-pointer transition-all duration-200 ${
          selectedIndices.includes(idx) ? "-translate-y-4 scale-110" : "hover:-translate-y-2"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className={`w-16 h-24 rounded-lg border-2 flex flex-col items-center justify-center bg-slate-800 ${
          selectedIndices.includes(idx) ? "border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]" : "border-slate-600"
        }`}>
          <span className="text-2xl">{PLANET_INFO[card.planet].icon}</span>
          <span className="text-[10px] mt-1 font-bold text-slate-300">{PLANET_INFO[card.planet].name}</span>
        </div>
      </div>
    ))}
  </div>
)

// 3. 메인 게임 부품 (이것이 export default 되어야 함)
export default function OrbitaGame() {
  const [gameMode, setGameMode] = useState<GameMode | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [role, setRole] = useState<"host" | "guest" | "spectator">("host")
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])

  const myKey = role === "host" ? "player" : "ai"
  const opponentKey = role === "host" ? "ai" : "player"

  useEffect(() => {
    if (!roomId) return
    const gameRef = ref(database, `rooms/${roomId}/gameState`)
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val()
      if (data && data.state) {
        setGameState(data.state)
        setLogs(data.logs || [])
      }
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
      message: `${role === "host" ? "방장" : "참여자"}가 ${PLANET_INFO[playedCards[0].planet].name} ${playedCards.length}장을 냈습니다.`,
      timestamp: new Date()
    }

    await set(ref(database, `rooms/${roomId}/gameState`), {
      state: { ...newState, currentTurn: opponentKey },
      logs: [...logs, newLog]
    })
    setSelectedIndices([])
  }

  if (typeof window === "undefined") return null // 서버 빌드 시 렌더링 방지 (핵심 방어)

  if (!gameMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
        <h2 className="text-2xl font-bold">게임 모드 선택</h2>
        <Button onClick={() => setGameMode("vs-ai")} className="w-64 h-16 text-xl">AI와 대결</Button>
        <div className="flex gap-2 mt-4">
          <input 
            id="roomInput" 
            placeholder="방 코드 입력" 
            className="bg-slate-800 p-2 rounded border border-slate-700 text-white"
          />
          <Button onClick={() => {
            const val = (document.getElementById('roomInput') as HTMLInputElement).value;
            if(val) { setRoomId(val); setRole("guest"); setGameMode("vs-ai"); }
          }}>입장</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 text-white">
      {gameState ? (
        <div className="space-y-8">
          <GameBoard tokens={gameState.tokens} />
          <div className="mt-8">
            <PlayerHand 
              cards={gameState[myKey].hand} 
              selectedIndices={selectedIndices} 
              onSelectCard={(i: number) => setSelectedIndices(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])}
              disabled={gameState.currentTurn !== myKey}
            />
            <Button 
              onClick={handlePlayCards} 
              disabled={selectedIndices.length === 0 || gameState.currentTurn !== myKey}
              className="w-full mt-4 h-14 text-xl bg-blue-600 hover:bg-blue-500"
            >
              카드 내기 ({selectedIndices.length}장)
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center p-20">데이터 로딩 중...</div>
      )}
    </div>
  )
}
