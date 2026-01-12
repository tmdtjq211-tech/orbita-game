"use client"

import React, { useState, useEffect } from "react"
import { ref, set, onValue, off } from "firebase/database"
import { Card } from "@/components/ui/card" 
import { Button } from "@/components/ui/button"
// 기존에 사용하시던 타입과 로직 경로를 유지합니다.
import { type GameState, type LogEntry, type GameMode, PLANET_INFO } from "../lib/game-types"
import { playCards } from "../lib/game-logic"
import { database } from "../lib/firebase"

/** * 1. 게임 보드 부품
 */
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

/**
 * 2. 플레이어 손패 부품
 */
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

/**
 * 3. 메인 게임 컴포넌트
 */
export default function OrbitaGame() {
  const [gameMode, setGameMode] = useState<GameMode | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [role, setRole] = useState<"host" | "guest" | "spectator">("host")
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])

  const myKey = role === "host" ? "player" : "ai"
  const opponentKey = role === "host" ? "ai" : "player"

  // --- [로직] 초기 게임 상태 생성 함수 ---
  const createInitialGame = () => {
    const initialTokens: Record<string, number> = {}
    Object.keys(PLANET_INFO).forEach(id => { initialTokens[id] = 0 })

    const mockHand = () => Array(5).fill(null).map(() => ({
      planet: Object.keys(PLANET_INFO)[Math.floor(Math.random() * 8)]
    }))

    return {
      tokens: initialTokens,
      player: { hand: mockHand(), score: 0 },
      ai: { hand: mockHand(), score: 0 },
      currentTurn: "player",
      roundNumber: 1,
      state: "playing"
    } as GameState
  }

  // AI 모드 즉시 시작
  const handleStartVsAI = () => {
    const initialState = createInitialGame()
    setGameState(initialState)
    setGameMode("vs-ai")
    setRole("host")
  }

  // 온라인 방 코드 입력 및 입장
  const handleJoinRoom = () => {
    const input = document.getElementById('roomInput') as HTMLInputElement
    const val = input.value
    if (val) {
      setRoomId(val)
      setRole("guest") // 입장하는 사람은 guest
      setGameMode("online")
    }
  }

  // Firebase 실시간 연동
  useEffect(() => {
    if (!roomId || gameMode !== "online") return

    const gameRef = ref(database, `rooms/${roomId}/gameState`)
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val()
      if (data && data.state) {
        setGameState(data.state)
        setLogs(data.logs || [])
      } else if (role === "host") {
        // 호스트인데 데이터가 없으면 초기화해서 올림
        const initialState = createInitialGame()
        set(gameRef, { state: initialState, logs: [] })
      }
    })
    return () => off(gameRef)
  }, [roomId, role, gameMode])

  // 카드 제출 로직
  const handlePlayCards = async () => {
    if (!gameState || selectedIndices.length === 0) return
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

    const finalState = { ...newState, currentTurn: opponentKey }
    const finalLogs = [...logs, newLog]

    if (gameMode === "vs-ai") {
      // AI 모드는 로컬 상태만 업데이트
      setGameState(finalState)
      setLogs(finalLogs)
    } else if (roomId) {
      // 온라인 모드는 Firebase 업데이트
      await set(ref(database, `rooms/${roomId}/gameState`), {
        state: finalState,
        logs: finalLogs
      })
    }
    setSelectedIndices([])
  }

  // SSR 방지
  if (typeof window === "undefined") return null

  // 1. 모드 선택 화면
  if (!gameMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 gap-8">
        <h1 className="text-4xl font-black text-white tracking-tighter">ORBITA</h1>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Button onClick={handleStartVsAI} className="h-16 text-xl bg-blue-600 hover:bg-blue-500 shadow-lg">
            AI와 대결 (오프라인)
          </Button>
          <div className="relative flex flex-col gap-2 p-4 bg-slate-900 rounded-xl border border-slate-800">
            <input 
              id="roomInput" 
              placeholder="방 코드 입력" 
              className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-white text-center font-mono"
            />
            <Button onClick={handleJoinRoom} variant="outline" className="border-slate-700 hover:bg-slate-800 text-white">
              온라인 방 입장하기
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 2. 메인 게임 화면
  return (
    <div className="max-w-4xl mx-auto p-4 text-white min-h-screen">
      {gameState ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex justify-between items-center bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Game Mode</p>
              <p className="text-sm font-medium">{gameMode === "vs-ai" ? "🤖 VS AI" : `🌐 Room: ${roomId}`}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Turn</p>
              <p className={`text-sm font-bold ${gameState.currentTurn === myKey ? "text-green-400" : "text-yellow-400"}`}>
                {gameState.currentTurn === myKey ? "내 차례" : "상대방 차례"}
              </p>
            </div>
          </div>

          <GameBoard tokens={gameState.tokens} />
          
          <div className="mt-8 space-y-4">
            <PlayerHand 
              cards={gameState[myKey].hand} 
              selectedIndices={selectedIndices} 
              onSelectCard={(i: number) => setSelectedIndices(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])}
              disabled={gameState.currentTurn !== myKey}
            />
            <Button 
              onClick={handlePlayCards} 
              disabled={selectedIndices.length === 0 || gameState.currentTurn !== myKey}
              className="w-full h-16 text-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
            >
              {gameState.currentTurn === myKey ? `카드 ${selectedIndices.length}장 내기` : "상대방 기다리는 중..."}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-medium text-slate-300">데이터를 불러오는 중...</p>
          <p className="text-xs text-slate-500 text-center">온라인 모드라면 Cloudflare에 <br/>Firebase 환경변수가 설정되어 있는지 확인해 주세요.</p>
        </div>
      )}
    </div>
  )
}
