"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { GameMode } from "@/lib/game-types"
import { TutorialModal } from "./tutorial-modal"

interface ModeSelectorProps {
  onSelectMode: (mode: GameMode) => void
  onJoinOnline: (roomId: string, role: "host" | "guest") => void 
}

export function ModeSelector({ onSelectMode, onJoinOnline }: ModeSelectorProps) {
  const [inputRoomId, setInputRoomId] = useState("")

  // 랜덤 6자리 방 번호 생성 및 Host 입장
  const handleCreateRoom = () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString()
    onJoinOnline(randomCode, "host")
  }

  // 입력한 번호로 참가 및 Guest 입장
  const handleJoinRoom = () => {
    if (inputRoomId.length === 6) {
      onJoinOnline(inputRoomId, "guest")
    } else {
      alert("6자리 방 번호를 입력해주세요!")
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            오르비타
          </CardTitle>
          <CardDescription className="text-slate-400">ORBITA - 우주 전략 카드 게임</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 싱글 플레이 모드 */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 px-1 uppercase tracking-wider">싱글 플레이</p>
            <Button className="w-full h-14 text-lg justify-start" onClick={() => onSelectMode("vs-ai")}>
              <span className="mr-3 text-2xl">🎮</span>
              AI와 대전
            </Button>
            <Button className="w-full h-14 text-lg justify-start" variant="secondary" onClick={() => onSelectMode("ai-vs-ai")}>
              <span className="mr-3 text-2xl">🤖</span>
              AI vs AI 관전
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-700" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-2 text-slate-500 font-bold">OR</span></div>
          </div>

          {/* 온라인 대전 섹션 */}
          <div className="space-y-3 bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
            <p className="text-xs font-semibold text-blue-400 px-1 uppercase tracking-wider">멀티 플레이 (Online)</p>
            
            <Button className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold" onClick={handleCreateRoom}>
              새 방 만들기 (HOST)
            </Button>
            
            <div className="flex gap-2">
              <Input 
                placeholder="방 번호 6자리" 
                value={inputRoomId} 
                onChange={(e) => setInputRoomId(e.target.value)}
                maxLength={6}
                className="bg-slate-950 border-slate-700 text-center font-mono text-lg text-white"
              />
              <Button variant="outline" className="shrink-0 font-bold border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white" onClick={handleJoinRoom}>
                참가하기
              </Button>
            </div>
          </div>

          <div className="pt-2 flex justify-center">
            <TutorialModal
              trigger={
                <Button variant="ghost" className="w-full text-slate-400 hover:text-white">
                  <span className="mr-2">📖</span>
                  게임 규칙 보기
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
