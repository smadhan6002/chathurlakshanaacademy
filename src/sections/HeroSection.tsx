import { useState, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import GoldParticles from '../components/GoldParticles'
import pose0 from '../assets/Purana Manjari 2019.jpg.jpeg'

interface HeroSectionProps {
  onNavigate?: (path: string) => void
}

export default function HeroSection({ onNavigate }: HeroSectionProps = {}) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const { scrollY } = useScroll()

  // Gentle scroll parallax
  const bgY = useTransform(scrollY, [0, 800], [0, 160])
  const textY = useTransform(scrollY, [0, 800], [0, -60])
  const opacity = useTransform(scrollY, [0, 600], [1, 0.2])

  useEffect(() => {
    // Only track mouse parallax on desktop / non-touch
    if (window.matchMedia('(hover: none)').matches) return

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window
      const x = (e.clientX / innerWidth - 0.5) * 20
      const y = (e.clientY / innerHeight - 0.5) * 15
      setMousePos({ x, y })
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#160811',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        perspective: '1000px',
      }}
    >
      {/* Layer 1: Atmospheric Deep Background & Temple Geometry Silhouette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 35%, rgba(212, 175, 101, 0.15) 0%, rgba(38, 13, 32, 0.75) 50%, #160811 85%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Layer 2: Dancer Image with 3D Parallax & Depth */}
      <motion.div
        style={{
          position: 'absolute',
          inset: '-20px',
          y: bgY,
          x: mousePos.x * 0.4,
          scale: 1.05,
          zIndex: 2,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
      >
        <img
          src={pose0}
          alt="Classical Bharatanatyam recital at Chathur Lakshana"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 18%',
            filter: 'contrast(1.08) saturate(0.95)',
          }}
        />

        {/* Cinematic Multi-layer Vignette & Lighting */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(22, 8, 17, 0.55) 0%, rgba(22, 8, 17, 0.35) 40%, rgba(22, 8, 17, 0.82) 78%, #160811 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Soft Gold Directional Side Lighting */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 45%, transparent 35%, rgba(22, 8, 17, 0.7) 85%)',
            pointerEvents: 'none',
          }}
        />
      </motion.div>

      {/* Layer 3: Subtle Temple Arch SVG Silhouette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 3,
          opacity: 0.22,
        }}
        aria-hidden="true"
      >
        <svg
          width="720"
          height="720"
          viewBox="0 0 600 600"
          fill="none"
          stroke="#D4AF65"
          strokeWidth="0.75"
          style={{
            maxWidth: '90vw',
            maxHeight: '90vh',
            transform: `translate(${mousePos.x * 0.2}px, ${mousePos.y * 0.2}px) scale(1.05)`,
            transition: 'transform 0.2s ease-out',
          }}
        >
          {/* Temple Mandala & Classical Geometry */}
          <circle cx="300" cy="300" r="280" strokeDasharray="4 6" opacity="0.6" />
          <circle cx="300" cy="300" r="230" opacity="0.8" />
          <circle cx="300" cy="300" r="170" strokeDasharray="3 5" opacity="0.5" />
          <polygon points="300,70 530,300 300,530 70,300" opacity="0.4" />
          <polygon points="300,110 490,300 300,490 110,300" opacity="0.3" />
          <line x1="300" y1="20" x2="300" y2="580" opacity="0.3" />
          <line x1="20" y1="300" x2="580" y2="300" opacity="0.3" />
        </svg>
      </div>

      {/* Layer 4: Ambient Floating Gold Particles */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
        <GoldParticles density={36} />
      </div>

      {/* Layer 5: Hero Content with Staggered Entrance & 3D Perspective */}
      <motion.div
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          padding: '120px 24px 60px',
          maxWidth: '940px',
          width: '100%',
          y: textY,
          opacity,
          transform: `translate3d(${mousePos.x * -0.3}px, ${mousePos.y * -0.3}px, 0)`,
          transition: 'transform 0.15s ease-out',
        }}
      >
        {/* Sacred Star Emblem */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: '28px',
            color: 'var(--accent-gold)',
            marginBottom: '16px',
            display: 'inline-block',
            textShadow: '0 0 16px rgba(212, 175, 101, 0.6)',
          }}
        >
          ✧
        </motion.div>

        {/* Academy Label Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 'clamp(11px, 1.4vw, 13px)',
            fontWeight: 600,
            letterSpacing: '0.3em',
            color: 'var(--accent-gold-light)',
            textTransform: 'uppercase',
            marginBottom: '22px',
          }}
        >
          TRADITIONAL ARTS ACADEMY · MYLAPORE, CHENNAI
        </motion.div>

        {/* Main Serif Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.95, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="hero-title"
          style={{
            marginBottom: '0',
            color: 'var(--text-primary)',
            textShadow: '0 4px 28px rgba(0, 0, 0, 0.7), 0 0 30px rgba(212, 175, 101, 0.15)',
            letterSpacing: '0.02em',
          }}
        >
          <span style={{ display: 'block' }}>Art · Discipline · Life</span>
        </motion.h1>

        {/* Temple Gold Divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.55 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            margin: '28px auto',
            width: '180px',
          }}
        >
          <div style={{ flex: 1, height: '1.5px', background: 'linear-gradient(to right, transparent, var(--accent-gold))' }} />
          <span style={{ color: 'var(--accent-gold)', fontSize: '13px', lineHeight: 1 }}>✦</span>
          <div style={{ flex: 1, height: '1.5px', background: 'linear-gradient(to left, transparent, var(--accent-gold))' }} />
        </motion.div>

        {/* Supporting Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.7 }}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 'clamp(1.25rem, 2.4vw, 1.75rem)',
            fontStyle: 'italic',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: '640px',
            margin: '0 auto',
            textShadow: '0 2px 14px rgba(0, 0, 0, 0.8)',
          }}
        >
          Rooted in culture. Guided by gurus.<br />
          Inspiring excellence in every learner.
        </motion.p>

        {/* Hero CTA Group */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.9 }}
          className="hero-cta-group"
          style={{
            display: 'flex',
            gap: '18px',
            justifyContent: 'center',
            marginTop: '44px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => {
              const el = document.querySelector('#courses-preview') || document.querySelector('#courses')
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' })
              } else if (onNavigate) {
                onNavigate('/courses')
              }
            }}
            className="btn-primary"
            style={{
              padding: '16px 38px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            EXPLORE COURSES
          </button>
          <button
            type="button"
            onClick={() => {
              const el = document.querySelector('#gallery')
              if (el) {
                const navbarHeight = 88
                const elementPosition = el.getBoundingClientRect().top + window.pageYOffset
                window.scrollTo({
                  top: Math.max(0, elementPosition - navbarHeight),
                  behavior: 'smooth',
                })
              } else if (onNavigate) {
                onNavigate('/gallery')
              } else {
                window.history.pushState({}, '', '/gallery')
                window.dispatchEvent(new PopStateEvent('popstate'))
              }
            }}
            className="btn-gallery"
            style={{
              padding: '16px 38px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            VIEW GALLERY
          </button>
          <button
            type="button"
            onClick={() => {
              if (onNavigate) {
                onNavigate('/academy')
              } else {
                const el = document.querySelector('#pillars-preview') || document.querySelector('#academy')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }
            }}
            className="btn-secondary"
            style={{
              padding: '16px 38px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            OUR ACADEMY
          </button>
        </motion.div>
      </motion.div>

      {/* Floating Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        style={{
          position: 'absolute',
          bottom: '28px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
        }}
        onClick={() => document.querySelector('#video-showcase')?.scrollIntoView({ behavior: 'smooth' })}
      >
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: '10px',
            letterSpacing: '0.25em',
            color: 'var(--accent-gold)',
            textTransform: 'uppercase',
            opacity: 0.8,
          }}
        >
          SCROLL TO EXPLORE
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          style={{
            width: '20px',
            height: '32px',
            borderRadius: '10px',
            border: '1.5px solid rgba(212, 175, 101, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '6px',
          }}
        >
          <div
            style={{
              width: '3px',
              height: '6px',
              backgroundColor: 'var(--accent-gold)',
              borderRadius: '2px',
            }}
          />
        </motion.div>
      </motion.div>
    </section>
  )
}
