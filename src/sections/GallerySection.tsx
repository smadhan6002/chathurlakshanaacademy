import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useState, useEffect, useCallback } from 'react'
import { fetchActiveMedia } from '../lib/mediaService'
import type { MediaItem } from '../lib/mediaService'
import { GALLERY_CATEGORIES } from '../admin/config'

// Import real local assets
import img1 from '../assets/jayashree_srinivasann_72390dc097ca46fdb51378c242cc129c.jpg'
import img2 from '../assets/jayashree_srinivasann_bfef744f8e5d4cbcba11df8498cc4b55.jpg'
import img3 from '../assets/jayashree_srinivasann_a34c896d8ab54c55a5fb832cc519b760.jpg'
import img4 from '../assets/raiveeson_e4149c9ca6f44e6f8bb6a35ddfd5fe60.jpg'
import img5 from '../assets/raiveeson_7a2e458cf19d45658d947283309892cd.jpg'
import img6 from '../assets/jayashree_srinivasann_488a76705714438996f1d47282588f2b.jpg'
import img7 from '../assets/master_sriram_9ff9382d10bc481bb72b5e91194fe5cb.jpg'
import img8 from '../assets/master_sriram_4256661ffaaa431f9276e74d5f9986c6.jpg'
import img9 from '../assets/noodlesandoldbooks_61691627fc434ad498e1d5e67e919866.jpg'
import img10 from '../assets/raiveeson_23d2423e8e7644409ddc582d0c472025.jpg'

// Unified gallery item shape for display
interface GalleryDisplayItem {
  id: string;
  category: string;
  title: string;
  description: string;
  imageUrl: string;
  createdAt: number;
}

// Static fallback images — always displayed
const staticPerformances: GalleryDisplayItem[] = [
  { id: 'static_1', category: 'PERFORMANCES', title: 'Margazhi Recital', description: 'Graceful abhinaya capturing the essence of devotion.', imageUrl: img1, createdAt: 1000 },
  { id: 'static_2', category: 'CLASSROOM', title: 'Adavu Practice', description: 'Perfecting footwork with precision and rhythm.', imageUrl: img2, createdAt: 999 },
  { id: 'static_3', category: 'PERFORMANCES', title: 'Temple Offering', description: 'A devotional offering to the divine.', imageUrl: img3, createdAt: 998 },
  { id: 'static_4', category: 'ARANGETRAMS', title: 'Arangetram Moments', description: 'The grand debut performance.', imageUrl: img4, createdAt: 997 },
  { id: 'static_5', category: 'PERFORMANCES', title: 'Varnam Excerpt', description: 'Complex rhythmic patterns and expressive storytelling.', imageUrl: img5, createdAt: 996 },
  { id: 'static_6', category: 'FESTIVALS', title: 'Group Choreography', description: 'Synchronized movements in thematic productions.', imageUrl: img6, createdAt: 995 },
  { id: 'static_7', category: 'PERFORMANCES', title: 'Tillana Joy', description: 'The vibrant and rhythmic conclusion.', imageUrl: img7, createdAt: 994 },
  { id: 'static_8', category: 'CLASSROOM', title: 'Guru Shishya Parampara', description: 'Imparting traditional knowledge.', imageUrl: img8, createdAt: 993 },
  { id: 'static_9', category: 'FESTIVALS', title: 'Cultural Showcase', description: 'Celebrating our rich heritage on stage.', imageUrl: img9, createdAt: 992 },
  { id: 'static_10', category: 'PERFORMANCES', title: 'Purana Manjari', description: 'Thematic production staging ancient epics.', imageUrl: img10, createdAt: 991 },
]

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  )
}

function GalleryImage({ src, alt }: { src: string; alt: string }) {
  const [errored, setErrored] = useState(false);
  return errored ? (
    <div style={{ width: '100%', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#301326', color: 'var(--accent-gold-light)', fontSize: '13px', fontFamily: 'var(--font-body)', textAlign: 'center', padding: '16px' }}>
      Image unavailable
    </div>
  ) : (
    <img src={src} alt={alt} loading="lazy" onError={() => setErrored(true)} />
  )
}

export default function GallerySection() {
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [items, setItems] = useState<GalleryDisplayItem[]>([])
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [dbLoaded, setDbLoaded] = useState(false)

  const loadGalleryItems = useCallback(async () => {
    try {
      const dbItems: MediaItem[] = await fetchActiveMedia('image')
      if (dbItems && dbItems.length > 0) {
        const mapped: GalleryDisplayItem[] = dbItems.map(item => ({
          id: item.id,
          category: item.category || 'PERFORMANCES',
          title: item.title,
          description: item.description || '',
          imageUrl: item.media_url,
          createdAt: new Date(item.created_at).getTime(),
        }))
        setItems(mapped)
      } else {
        // Fallback to static gallery when DB has no images yet
        setItems(staticPerformances)
      }
    } catch (err) {
      console.warn('Failed to load gallery items from Supabase:', err)
      setItems(staticPerformances)
    } finally {
      setDbLoaded(true)
    }
  }, [])

  useEffect(() => {
    loadGalleryItems()
    const handleFocus = () => loadGalleryItems()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [loadGalleryItems])

  const filteredItems = activeCategory === 'ALL'
    ? items
    : items.filter(item => item.category === activeCategory)

  const openLightbox = (index: number) => { setCurrentImageIndex(index); setLightboxOpen(true) }
  const closeLightbox = () => setLightboxOpen(false)

  const nextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setCurrentImageIndex((prev) => (prev + 1) % filteredItems.length)
  }
  const prevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setCurrentImageIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)
  }

  useEffect(() => {
    if (!lightboxOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowRight') nextImage()
      if (e.key === 'ArrowLeft') prevImage()
    }
    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'auto'
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, filteredItems.length])

  return (
    <section
      id="gallery"
      style={{
        backgroundColor: '#260D20', // Rich secondary plum background
        padding: 'clamp(100px, 12vw, 150px) 0 100px',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid rgba(212, 175, 101, 0.2)',
      }}
    >
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 clamp(16px, 4vw, 48px)', marginBottom: '60px' }}>
        <FadeIn>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: "var(--font-body)",
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.25em',
              color: 'var(--accent-gold)',
              textTransform: 'uppercase',
              marginBottom: '18px',
            }}>
              ✧ EVENT GALLERY ✧
            </div>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontSize: 'clamp(2.8rem, 5.5vw, 5rem)',
              fontWeight: 400,
              color: 'var(--text-primary)',
              marginBottom: '20px',
              lineHeight: 1.15,
            }}>
              Glimpses of Artistry
            </h2>
            <div style={{
              width: '70px',
              height: '1.5px',
              background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)',
              margin: '0 auto 24px',
            }} />
            <p style={{
              fontFamily: "var(--font-display)",
              fontSize: 'clamp(1.2rem, 2vw, 1.55rem)',
              fontStyle: 'italic',
              color: 'var(--text-secondary)',
              marginBottom: '44px',
            }}>
              Photographs from recitals, temple offerings, and arangetrams.
            </p>

            {/* Category Filters */}
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '48px',
            }}>
              {GALLERY_CATEGORIES.map(cat => {
                const isActive = activeCategory === cat
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      background: isActive ? 'rgba(212, 175, 101, 0.15)' : 'rgba(48, 19, 38, 0.5)',
                      border: isActive ? '1px solid var(--accent-gold)' : '1px solid rgba(212, 175, 101, 0.25)',
                      borderRadius: '2px',
                      fontFamily: "var(--font-body)",
                      fontSize: 'clamp(11px, 1.4vw, 12.5px)',
                      fontWeight: 600,
                      letterSpacing: '0.18em',
                      color: isActive ? 'var(--accent-gold-light)' : 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      padding: '10px 20px',
                      transition: 'all 0.3s ease',
                      whiteSpace: 'nowrap',
                      boxShadow: isActive ? '0 0 16px rgba(212, 175, 101, 0.2)' : 'none',
                    }}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>
        </FadeIn>

        {/* Loading state */}
        {!dbLoaded && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontFamily: "var(--font-body)" }}>
            Loading gallery...
          </div>
        )}

        {/* Masonry Editorial Grid */}
        {filteredItems.length === 0 && dbLoaded ? (
          <div style={{ width: '100%', textAlign: 'center', padding: '100px 0', color: 'var(--text-secondary)', fontFamily: "var(--font-body)" }}>
            No images found in this category.
          </div>
        ) : (
          <div className="gallery-masonry">
            {filteredItems.map((item, i) => (
              <motion.div
                key={item.id}
                className="gallery-item"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.65, delay: (i % 4) * 0.1 }}
                onClick={() => openLightbox(i)}
              >
                <div className="gallery-image-wrapper">
                  <GalleryImage src={item.imageUrl} alt={item.title} />
                  <div className="gallery-overlay">
                    <div className="gallery-content">
                      <span className="gallery-category">✦ {item.category}</span>
                      <h3 className="gallery-title">{item.title}</h3>
                      {item.description && (
                        <p className="gallery-desc">{item.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && filteredItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              backgroundColor: 'rgba(22, 8, 17, 0.96)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onClick={closeLightbox}
          >
            {/* Top Close Bar */}
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '28px',
              zIndex: 10000,
            }}>
              <button
                onClick={(e) => { e.stopPropagation(); closeLightbox() }}
                aria-label="Close Lightbox"
                style={{
                  background: 'rgba(48, 19, 38, 0.7)',
                  border: '1px solid var(--accent-gold)',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  color: 'var(--accent-gold-light)',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  lineHeight: 1,
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-gold)'
                  e.currentTarget.style.color = '#160811'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(48, 19, 38, 0.7)'
                  e.currentTarget.style.color = 'var(--accent-gold-light)'
                }}
              >
                ✕
              </button>
            </div>

            {/* Navigation Buttons */}
            <button
              onClick={prevImage}
              aria-label="Previous Image"
              className="lightbox-nav left"
              style={{
                position: 'absolute',
                left: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(48, 19, 38, 0.8)',
                border: '1px solid var(--accent-gold)',
                borderRadius: '50%',
                width: '52px',
                height: '52px',
                cursor: 'pointer',
                zIndex: 10000,
                color: 'var(--accent-gold)',
                fontSize: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--accent-gold)'
                e.currentTarget.style.color = '#160811'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'rgba(48, 19, 38, 0.8)'
                e.currentTarget.style.color = 'var(--accent-gold)'
              }}
            >
              ←
            </button>
            <button
              onClick={nextImage}
              aria-label="Next Image"
              className="lightbox-nav right"
              style={{
                position: 'absolute',
                right: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(48, 19, 38, 0.8)',
                border: '1px solid var(--accent-gold)',
                borderRadius: '50%',
                width: '52px',
                height: '52px',
                cursor: 'pointer',
                zIndex: 10000,
                color: 'var(--accent-gold)',
                fontSize: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--accent-gold)'
                e.currentTarget.style.color = '#160811'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'rgba(48, 19, 38, 0.8)'
                e.currentTarget.style.color = 'var(--accent-gold)'
              }}
            >
              →
            </button>

            {/* Main Lightbox Image */}
            <motion.div
              key={currentImageIndex}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              style={{
                width: '100%',
                height: '75vh',
                padding: '0 80px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={filteredItems[currentImageIndex].imageUrl}
                alt={filteredItems[currentImageIndex].title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '3px',
                  border: '1px solid rgba(212, 175, 101, 0.35)',
                  boxShadow: '0 25px 70px rgba(0,0,0,0.8), 0 0 35px rgba(212, 175, 101, 0.15)',
                }}
              />
            </motion.div>

            {/* Image Metadata Caption */}
            <div
              style={{
                position: 'absolute',
                bottom: '24px',
                left: 0,
                right: 0,
                textAlign: 'center',
                padding: '0 24px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                fontFamily: "var(--font-body)",
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.25em',
                color: 'var(--accent-gold)',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}>
                ✦ {filteredItems[currentImageIndex].category}
              </div>
              <h3 style={{
                fontFamily: "var(--font-display)",
                fontSize: 'clamp(20px, 3vw, 30px)',
                fontWeight: 400,
                color: 'var(--text-primary)',
                margin: '0 0 6px',
              }}>
                {filteredItems[currentImageIndex].title}
              </h3>
              {filteredItems[currentImageIndex].description && (
                <p style={{
                  fontFamily: "var(--font-body)",
                  fontSize: '14.5px',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  maxWidth: '600px',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}>
                  {filteredItems[currentImageIndex].description}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .gallery-masonry {
          column-count: 3;
          column-gap: 24px;
          width: 100%;
        }

        .gallery-item {
          break-inside: avoid;
          margin-bottom: 24px;
          width: 100%;
          cursor: pointer;
          position: relative;
          display: block;
        }

        .gallery-image-wrapper {
          position: relative;
          width: 100%;
          overflow: hidden;
          background-color: #301326;
          border: 1px solid rgba(212, 175, 101, 0.3);
          border-radius: 3px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
          transition: border-color 0.4s ease, box-shadow 0.4s ease;
        }

        .gallery-image-wrapper img {
          width: 100%;
          height: auto;
          display: block;
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), filter 0.8s ease;
          filter: contrast(1.05) saturate(0.95);
        }

        .gallery-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(22, 8, 17, 0.95) 0%, rgba(38, 13, 32, 0.6) 50%, transparent 100%);
          opacity: 0;
          transition: opacity 0.4s ease;
          display: flex;
          align-items: flex-end;
          padding: 24px;
        }

        .gallery-content {
          transform: translateY(16px);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .gallery-category {
          display: block;
          font-family: var(--font-body);
          font-size: 11px;
          fontWeight: 600;
          letter-spacing: 0.22em;
          color: var(--accent-gold);
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .gallery-title {
          font-family: var(--font-display);
          font-size: clamp(20px, 2.5vw, 26px);
          color: var(--text-primary);
          font-weight: 400;
          margin: 0 0 4px;
          line-height: 1.25;
        }

        .gallery-desc {
          font-family: var(--font-body);
          font-size: 13.5px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }

        .gallery-item:hover .gallery-image-wrapper {
          border-color: rgba(212, 175, 101, 0.7);
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.6), 0 0 25px rgba(212, 175, 101, 0.18);
        }
        .gallery-item:hover img { transform: scale(1.03); filter: contrast(1.08) saturate(1); }
        .gallery-item:hover .gallery-overlay { opacity: 1; }
        .gallery-item:hover .gallery-content { transform: translateY(0); }

        @media (max-width: 1024px) {
          .gallery-masonry { column-count: 2; }
        }

        @media (max-width: 640px) {
          .gallery-masonry {
            column-count: 1;
            column-gap: 16px;
          }
          .gallery-item { margin-bottom: 16px; }
          .lightbox-nav { width: 44px !important; height: 44px !important; font-size: 18px !important; }
        }
      `}</style>
    </section>
  )
}
