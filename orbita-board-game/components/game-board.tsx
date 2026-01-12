"use client"

import { type TokenPosition, PLANET_INFO, type Planet } from "@/lib/game-types"
import { TRACK_LABELS } from "@/lib/game-logic"

interface GameBoardProps {
  tokens: TokenPosition[]
}

export function GameBoard({ tokens }: GameBoardProps) {
  const getTokenAtPosition = (pos: number) => {
    return tokens.find((t) => t.position === pos)
  }

  const getTokensBeyondTrack = () => {
    return tokens.filter((t) => t.position !== null && t.position > 14)
  }

  const outsideTokens = tokens.filter((t) => t.position === null)

  const planetColors: Record<Planet, string> = {
    water: "#3b82f6",
    forest: "#22c55e",
    desert: "#f97316",
    galaxy: "#a855f7",
  }

  // position 1-7: 좌측
  // position 8: 7+ (상단 연결)
  // position 9-14: 6+, 5+, 4+, 3+, 2+, 1+ (우측)

  const TrackSlot = ({ position }: { position: number }) => {
    const token = getTokenAtPosition(position)
    const label = TRACK_LABELS[position - 1]

    return (
      <div
        className={`
          w-12 h-12 rounded-full flex items-center justify-center
          border-2 transition-all duration-300 relative
          ${token ? "border-white/60 shadow-lg shadow-white/20" : "border-slate-600/50 bg-slate-800/60"}
        `}
        style={{
          backgroundColor: token ? planetColors[token.planet] : undefined,
        }}
      >
        {!token && <span className="text-slate-400 text-sm font-bold">{label}</span>}
        {token && <span className="text-xl">{PLANET_INFO[token.planet].emoji}</span>}
      </div>
    )
  }

  // 14(1+)를 넘어간 토큰들 (탈출 영역)
  const EscapedZone = () => {
    const escaped = getTokensBeyondTrack()
    if (escaped.length === 0) return null

    return (
      <div className="flex gap-1 items-center">
        {escaped.map((token) => (
          <div
            key={token.planet}
            className="relative w-10 h-10 rounded-full flex items-center justify-center border-2 border-white/60"
            style={{ backgroundColor: planetColors[token.planet] }}
            title={`${PLANET_INFO[token.planet].name}: ${token.position! - 14}바퀴 초과`}
          >
            <span className="text-sm">{PLANET_INFO[token.planet].emoji}</span>
            <span className="absolute -bottom-4 text-[10px] text-slate-400">+{token.position! - 14}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl p-4 border border-slate-700/50">
      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-white/50 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative flex justify-center gap-6">
        {/* Left Track: 1-7 (아래에서 위로 올라감) */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs text-slate-400 mb-1">올라감 ↑</div>

          {/* Position 7 at top */}
          <TrackSlot position={7} />
          <TrackSlot position={6} />
          <TrackSlot position={5} />
          <TrackSlot position={4} />
          <TrackSlot position={3} />
          <TrackSlot position={2} />
          <TrackSlot position={1} />

          <div className="text-xs text-slate-500 mt-1">시작</div>
        </div>

        {/* Center: Sun + 7+ position + Escaped zone */}
        <div className="flex flex-col items-center justify-between py-4">
          {/* 7+ position (position 8) - 꼭대기 */}
          <div className="flex flex-col items-center">
            <TrackSlot position={8} />
            <div className="text-xs text-slate-500 mt-1">정상</div>
          </div>

          {/* Sun */}
          <div className="my-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-300 via-orange-400 to-red-500 flex items-center justify-center shadow-2xl shadow-orange-500/50">
              <span className="text-3xl">☀️</span>
            </div>
            <div className="text-center mt-2">
              <div className="text-sm font-bold text-foreground">ORBITA</div>
            </div>
          </div>

          {/* Escaped Zone (1+를 넘어간 토큰들) */}
          <div className="min-h-14 flex flex-col items-center">
            <EscapedZone />
            {getTokensBeyondTrack().length === 0 && (
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-700/50 flex items-center justify-center">
                <span className="text-slate-600 text-xs">탈출</span>
              </div>
            )}
            <div className="text-xs text-slate-500 mt-1">1+ 통과</div>
          </div>
        </div>

        {/* Right Track: 6+~1+ (위에서 아래로 내려감) */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs text-slate-400 mb-1">↓ 내려감</div>

          {/* Position 9(6+) to 14(1+), top to bottom */}
          <TrackSlot position={9} />
          <TrackSlot position={10} />
          <TrackSlot position={11} />
          <TrackSlot position={12} />
          <TrackSlot position={13} />
          <TrackSlot position={14} />

          <div className="text-xs text-slate-500 mt-1">끝</div>
        </div>
      </div>

      {/* Flow indicator */}
      <div className="mt-3 text-center text-[10px] text-slate-500">
        이동 순서: 1→2→3→4→5→6→7→7+→6+→5+→4+→3+→2+→1+→탈출
      </div>

      {/* Outside tokens indicator */}
      {outsideTokens.length > 0 && (
        <div className="mt-4 flex justify-center gap-3 items-center bg-slate-800/50 rounded-lg px-4 py-2">
          <span className="text-xs text-muted-foreground">대기중:</span>
          {outsideTokens.map((token) => (
            <div
              key={token.planet}
              className="flex items-center gap-1 px-2 py-1 rounded-full"
              style={{ backgroundColor: `${planetColors[token.planet]}30` }}
            >
              <span className="text-lg">{PLANET_INFO[token.planet].emoji}</span>
              <span className="text-xs text-muted-foreground">{PLANET_INFO[token.planet].name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
