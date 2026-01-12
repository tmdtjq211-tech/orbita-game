// @/ 대신 상대 경로인 ../ 를 사용하여 경로 에러를 해결했습니다
import OrbitaGame from "../components/orbita-game"

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950">
      <OrbitaGame />
    </main>
  )
}
