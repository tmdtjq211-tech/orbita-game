"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PLANET_INFO } from "@/lib/game-types"

const TUTORIAL_STEPS = [
  {
    title: "게임 소개",
    content: `오르비타(Orbita)는 2인용 전략 카드 게임입니다.
4종류의 행성 카드(물, 숲, 사막, 은하)를 사용해 행성 토큰을 태양 주위의 궤도에서 이동시키며 승부를 겨룹니다.
게임 종료 시 벌점이 적은 플레이어가 승리합니다!`,
    emoji: "🌌",
  },
  {
    title: "게임판 구조",
    content: `게임판은 태양을 중심으로 U자형 트랙입니다.

• 좌측(올라감): 1 → 2 → 3 → 4 → 5 → 6 → 7
• 정상: 7+ (꼭대기)
• 우측(내려감): 6+ → 5+ → 4+ → 3+ → 2+ → 1+
• 탈출: 1+를 지나면 트랙 밖으로!

+가 붙은 숫자가 더 큰 게 아닙니다.
트랙을 따라 이동하는 순서가 중요합니다!`,
    emoji: "☀️",
  },
  {
    title: "행성 배치",
    content: `4개의 행성 토큰이 모두 같은 트랙에서 이동합니다:

플레이어:
• 🌊 물
• 🌳 숲

AI:
• 🏜️ 사막
• 🔮 은하

모든 토큰이 같은 1-14 트랙 위에서 움직입니다!`,
    emoji: "🎯",
  },
  {
    title: "카드 구성",
    content: `총 28장의 카드가 있습니다:
• 🌊 물 카드 7장
• 🏜️ 사막 카드 7장
• 🌳 숲 카드 7장
• 🔮 은하 카드 7장

각 플레이어는 게임 시작 시 14장씩 받으며, 카드 순서는 바꿀 수 없습니다.`,
    emoji: "🃏",
  },
  {
    title: "카드 내기 규칙",
    content: `한 번에 같은 행성의 카드를 1~3장 낼 수 있습니다.

중요한 규칙:
• 손에서 연속된 같은 행성 카드가 3장 이하면 반드시 모두 내야 합니다
• 4장 이상 연속이면 양 끝에서 1~3장씩 떼어 낼 수 있습니다
• 후공은 선공이 낸 행성과 다른 카드를 내야 합니다`,
    emoji: "📤",
  },
  {
    title: "토큰 이동과 건너뛰기",
    content: `카드를 내면 해당 행성의 토큰이 이동합니다.

• 낸 카드 수만큼 전진합니다 (1~3칸)
• 판 밖 → 1 → 2 → ... → 7 → 7+ (꼭대기) → 6+ → ... → 1+ → 트랙 밖 (탈출)
• 착지할 칸에 다른 토큰이 있으면 그 칸을 건너뛰고 다음 빈 칸으로!
• 같은 칸에 두 토큰이 멈출 수 없습니다`,
    emoji: "🔄",
  },
  {
    title: "라운드 승패",
    content: `양 플레이어가 모두 카드를 내면 라운드가 끝납니다.

• 더 높은 숫자에 토큰을 놓은 사람이 승리
• 승자가 양쪽이 낸 모든 카드를 획득합니다
• 무승부 시 카드는 버려집니다
• 라운드 승자가 다음 라운드의 선공이 됩니다`,
    emoji: "⚔️",
  },
  {
    title: "점수 계산 (벌점)",
    content: `게임 종료 시 각 행성별로 카드 수를 비교합니다:

• 상대보다 적게 가진 행성의 카드는 벌점이 됩니다
• 예: 물 카드 3장 vs 상대 5장 → 3벌점
• 총 벌점이 적은 사람이 승리!
• 동점 시 총 카드 수가 많은 사람이 승리`,
    emoji: "📊",
  },
]

interface TutorialModalProps {
  trigger?: React.ReactNode
}

export function TutorialModal({ trigger }: TutorialModalProps) {
  const [step, setStep] = useState(0)
  const [open, setOpen] = useState(false)

  const currentStep = TUTORIAL_STEPS[step]
  const isFirst = step === 0
  const isLast = step === TUTORIAL_STEPS.length - 1

  const handleOpen = (value: boolean) => {
    setOpen(value)
    if (value) setStep(0)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger || <Button variant="outline">튜토리얼</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{currentStep.emoji}</span>
            <span>{currentStep.title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {step + 1} / {TUTORIAL_STEPS.length}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="whitespace-pre-line text-sm text-foreground">{currentStep.content}</div>

          {step === 2 && (
            <div className="mt-4 flex justify-center gap-4">
              {(["water", "forest", "desert", "galaxy"] as const).map((planet) => (
                <div key={planet} className="text-center">
                  <div className="text-2xl">{PLANET_INFO[planet].emoji}</div>
                  <div className="text-xs text-muted-foreground">{PLANET_INFO[planet].name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={isFirst}>
            이전
          </Button>
          <div className="flex gap-1">
            {TUTORIAL_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step ? "bg-foreground" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          {isLast ? (
            <Button onClick={() => setOpen(false)}>완료</Button>
          ) : (
            <Button onClick={() => setStep((s) => s + 1)}>다음</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
