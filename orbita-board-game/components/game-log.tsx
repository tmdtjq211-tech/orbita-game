"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type LogEntry, PLANET_INFO } from "@/lib/game-types"
import { useEffect, useRef } from "react"

interface GameLogProps {
  logs: LogEntry[]
}

export function GameLog({ logs }: GameLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const getLogIcon = (entry: LogEntry) => {
    if (entry.type === "game-start") return "🎮"
    if (entry.type === "game-end") return "🏆"
    if (entry.type === "round-result") {
      if (entry.winner === "player") return "✅"
      if (entry.winner === "ai") return "❌"
      return "🔄"
    }
    if (entry.planet) return PLANET_INFO[entry.planet].emoji
    return "📝"
  }

  const getLogColor = (entry: LogEntry) => {
    if (entry.type === "game-start") return "text-blue-400"
    if (entry.type === "game-end") return "text-yellow-400"
    if (entry.type === "round-result") {
      if (entry.winner === "player") return "text-green-400"
      if (entry.winner === "ai") return "text-red-400"
      return "text-muted-foreground"
    }
    if (entry.player === "player") return "text-cyan-400"
    return "text-orange-400"
  }

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <span>📋</span>
          <span>게임 로그</span>
          <span className="text-xs text-muted-foreground">({logs.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[200px] px-4 pb-4" ref={scrollRef}>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">아직 로그가 없습니다</p>
          ) : (
            <div className="space-y-1">
              {logs.map((entry) => (
                <div key={entry.id} className={`text-xs flex gap-2 ${getLogColor(entry)}`}>
                  <span className="shrink-0">{getLogIcon(entry)}</span>
                  <span className="text-muted-foreground shrink-0">R{entry.roundNumber}</span>
                  <span>{entry.message}</span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
