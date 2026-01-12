"use client"

import { type Card, PLANET_INFO, type Planet } from "@/lib/game-types"

interface WonCardsDisplayProps {
  cards: Card[]
  label: string
}

export function WonCardsDisplay({ cards, label }: WonCardsDisplayProps) {
  const planets: Planet[] = ["water", "forest", "desert", "galaxy"]

  const countByPlanet = planets.map((planet) => ({
    planet,
    count: cards.filter((c) => c.planet === planet).length,
  }))

  return (
    <div className="text-center">
      <h4 className="text-xs text-muted-foreground mb-1">{label}</h4>
      <div className="flex gap-2 justify-center">
        {countByPlanet.map(({ planet, count }) => (
          <div key={planet} className="flex items-center gap-0.5">
            <span className="text-sm">{PLANET_INFO[planet].emoji}</span>
            <span className="text-xs font-mono">{count}</span>
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground mt-1">총 {cards.length}장</div>
    </div>
  )
}
