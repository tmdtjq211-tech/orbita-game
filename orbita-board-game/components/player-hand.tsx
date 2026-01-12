"use client"

import { type Card, PLANET_INFO, type Planet } from "@/lib/game-types"
import { cn } from "@/lib/utils"

interface PlayerHandProps {
  cards: Card[]
  selectedIndices: number[]
  onSelectCard: (index: number) => void
  disabled?: boolean
  isAi?: boolean
}

export function PlayerHand({ cards, selectedIndices, onSelectCard, disabled, isAi }: PlayerHandProps) {
  const planetBgColors: Record<Planet, string> = {
    water: "bg-blue-500/20 border-blue-500 hover:bg-blue-500/30",
    forest: "bg-green-500/20 border-green-500 hover:bg-green-500/30",
    desert: "bg-orange-500/20 border-orange-500 hover:bg-orange-500/30",
    galaxy: "bg-purple-500/20 border-purple-500 hover:bg-purple-500/30",
  }

  const selectedColors: Record<Planet, string> = {
    water: "bg-blue-500/50 border-blue-400 ring-2 ring-blue-400",
    forest: "bg-green-500/50 border-green-400 ring-2 ring-green-400",
    desert: "bg-orange-500/50 border-orange-400 ring-2 ring-orange-400",
    galaxy: "bg-purple-500/50 border-purple-400 ring-2 ring-purple-400",
  }

  if (isAi) {
    return (
      <div className="flex flex-wrap gap-1 justify-center">
        {cards.map((_, index) => (
          <div
            key={index}
            className="w-10 h-14 rounded-md bg-secondary border border-border flex items-center justify-center text-muted-foreground text-xs"
          >
            ?
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {cards.map((card, index) => {
        const isSelected = selectedIndices.includes(index)
        return (
          <button
            key={`${card.id}-${index}`}
            onClick={() => !disabled && onSelectCard(index)}
            disabled={disabled}
            className={cn(
              "w-12 h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-all",
              disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              isSelected ? selectedColors[card.planet] : planetBgColors[card.planet],
              isSelected && "-translate-y-2",
            )}
          >
            <span className="text-lg">{PLANET_INFO[card.planet].emoji}</span>
            <span className="text-[10px] text-muted-foreground">{index + 1}</span>
          </button>
        )
      })}
    </div>
  )
}
