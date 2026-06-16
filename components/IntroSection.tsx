'use client'

import { useEffect, useRef, useState } from 'react'

interface IntroSectionProps {
  title: string
  subtitle: string
  onEnter: () => void
}

export default function IntroSection({ title, subtitle, onEnter }: IntroSectionProps) {
  const [visible, setVisible] = useState(false)
  const [subtitleChars, setSubtitleChars] = useState<{ char: string; index: number }[]>([])
  const enterRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true)
      setTimeout(() => {
        setSubtitleChars([...subtitle].map((char, index) => ({ char, index })))
      }, 270)
    }, 100)
    return () => clearTimeout(timer)
  }, [subtitle])

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const deltaY = e.deltaY || (e as any).wheelDelta * -1 || (e as any).detail
      if (deltaY > 0) {
        onEnter()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!window.startx || !window.starty) return
      const endx = e.changedTouches[0].pageX
      const endy = e.changedTouches[0].pageY
      const angx = endx - window.startx
      const angy = endy - window.starty
      if (Math.abs(angx) < 2 && Math.abs(angy) < 2) return
      const angle = (Math.atan2(angy, angx) * 180) / Math.PI
      if (angle > 45 && angle < 135) {
        onEnter()
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      window.startx = e.touches[0].pageX
      window.starty = e.touches[0].pageY
    }

    document.body.addEventListener('wheel', handleWheel, { passive: true })
    document.body.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.body.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.body.removeEventListener('wheel', handleWheel)
      document.body.removeEventListener('touchstart', handleTouchStart)
      document.body.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onEnter])

  return (
    <section className="content-intro">
      <div className="content-inner">
        <div className={`intro-wrap ${visible ? 'in' : ''}`}>
          <h2 className="content-title">{title}</h2>
          <h3 className="content-subtitle">
            {subtitleChars.map(({ char, index }) => (
              <span key={index} style={{ animationDelay: `${0.05 * index}s` }}>
                {char}
              </span>
            ))}
          </h3>
          <a
            ref={enterRef}
            className="enter-btn"
            onClick={(e) => {
              e.preventDefault()
              onEnter()
            }}
          >
            ENTER
          </a>
          <div className="arrow arrow-1" />
          <div className="arrow arrow-2" />
        </div>
      </div>
      <div className="shape-wrap">
        <svg
          className="shape"
          width="100%"
          height="100vh"
          preserveAspectRatio="none"
          viewBox="0 0 1440 800"
        >
          <path
            className="shape-path"
            d="M -44,-50 C -52.71,28.52 15.86,8.186 184,14.69 383.3,22.39 462.5,12.58 638,14 835.5,15.6 987,6.4 1194,13.86 1661,30.68 1652,-36.74 1582,-140.1 1512,-243.5 15.88,-589.5 -44,-50 Z"
          />
        </svg>
      </div>
    </section>
  )
}
