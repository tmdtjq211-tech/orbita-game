"use client"

import { Button } from "@/components/ui/button"
import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type Card, PLANET_INFO, type Planet } from "@/lib/game-types"
import { calculateFinalScores } from "@/lib/game-logic"

interface GameResultProps {
  playerWonCards: Card[]
  aiWonCards: Card[]
  onPlayAgain: () => void
  isAiVsAi?: boolean
}

export function GameResult({ playerWonCards, aiWonCards, onPlayAgain, isAiVsAi = false }: GameResultProps) {
  const { playerPenalty, aiPenalty, winner, details } = calculateFinalScores(playerWonCards, aiWonCards)

  const planetBgColors: Record<Planet, string> = {
    water: "bg-blue-500/20",
    forest: "bg-green-500/20",
    desert: "bg-orange-500/20",
    galaxy: "bg-purple-500/20",
  }

  const player1Label = isAiVsAi ? "AI 1" : "당신"
  const player2Label = isAiVsAi ? "AI 2" : "AI"

  return (
    <UICard className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-center">
          {isAiVsAi ? (
            <>
              {winner === "ai" && "🤖 AI 1 승리! 🤖"}
              {winner === "player" && "🤖 AI 2 승리! 🤖"}
              {winner === "tie" && "🤝 무승부 🤝"}
            </>
          ) : (
            <>
              {winner === "player" && "🎉 승리! 🎉"}
              {winner === "ai" && "😢 패배 😢"}
              {winner === "tie" && "🤝 무승부 🤝"}
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 text-left">행성</th>
                <th className="py-2 text-center">{player2Label}</th>
                <th className="py-2 text-center">{player1Label}</th>
              </tr>
            </thead>
            <tbody>
              {details.map(({ planet, playerCount, aiCount, playerFlipped, aiFlipped }) => (
                <tr key={planet} className={`border-b border-border/50 ${planetBgColors[planet]}`}>
                  <td className="py-2">
                    {PLANET_INFO[planet].emoji} {PLANET_INFO[planet].name}
                  </td>
                  <td className={`py-2 text-center ${aiFlipped ? "text-destructive line-through" : ""}`}>
                    {aiCount}장 {aiFlipped && `(-${aiCount})`}
                  </td>
                  <td className={`py-2 text-center ${playerFlipped ? "text-destructive line-through" : ""}`}>
                    {playerCount}장 {playerFlipped && `(-${playerCount})`}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="py-2">벌점 합계</td>
                <td className="py-2 text-center text-destructive">{aiPenalty}점</td>
                <td className="py-2 text-center text-destructive">{playerPenalty}점</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="text-center text-muted-foreground text-sm">
          벌점이 적을수록 승리! ({player1Label}: {aiPenalty}점 vs {player2Label}: {playerPenalty}점)
        </p>

        <Button onClick={onPlayAgain} className="w-full">
          다시 하기
        </Button>
      </CardContent>
    </UICard>
  )
}
