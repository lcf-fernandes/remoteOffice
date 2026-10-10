import { useEffect, useState } from 'react'

// Relógio que atualiza a cada segundo só enquanto `active`; o tempo exibido vem de timestamps, não deste contador.
export default function useNow(active = true, intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!active) return undefined
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [active, intervalMs])
  return now
}
