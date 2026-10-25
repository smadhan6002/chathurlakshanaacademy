import { useState, useEffect } from 'react'
import './index.css'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

// Homepage Sections
import HeroSection from './sections/HeroSection'
import VideoShowcaseSection from './sections/VideoShowcaseSection'
import CoursesPreviewSection from './sections/CoursesPreviewSection'
import AcademyPillarsPreview from './sections/AcademyPillarsPreview'
import FounderIntroPreview from './sections/FounderIntroPreview'
import VoicesPreview from './sections/VoicesPreview'

// Dedicated Tab/Page Sections
import AcademySection from './sections/AcademySection'
import AcademyJourneySection from './sections/AcademyJourneySection'
import FounderSection from './sections/FounderSection'
import CoursesSection from './sections/CoursesSection'
import GallerySection from './sections/GallerySection'
import ScrollingGallerySection from './sections/ScrollingGallerySection'
import ReelsSection from './sections/ReelsSection'
import AchievementsSection from './sections/AchievementsSection'
import ContactSection from './sections/ContactSection'

// Admin Portal
import AdminLogin from './admin/AdminLogin'
import AdminDashboard from './admin/AdminDashboard'
import { getCurrentAdmin, signOutAdmin, verifyUserIsAdmin } from './lib/auth'
import { supabase } from './lib/supabase'

// Shared UI Components
import LoadingScreen from './components/LoadingScreen'
import ScrollProgressBar from './components/ScrollProgressBar'
import EnquiryModal from './components/EnquiryModal'
import type { EnquiryType } from './components/EnquiryModal'

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  
  // Unified Enquiry Modal state
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false)
  const [enquiryCourse, setEnquiryCourse] = useState('Bharatanatyam')
  const [enquiryType, setEnquiryType] = useState<EnquiryType>('Course Enrolment')

  const handleOpenEnquiry = (course = 'Bharatanatyam', type: EnquiryType = 'Course Enrolment') => {
    setEnquiryCourse(course)
    setEnquiryType(type)
    setIsEnquiryOpen(true)
  }

  const handleCloseEnquiry = () => {
    setIsEnquiryOpen(false)
  }

  // Global custom event listener for opening enquiry modal
  useEffect(() => {
    const handleEvent = (e: any) => {
      const course = e.detail?.course || 'Bharatanatyam'
      const type = e.detail?.type || 'Course Enrolment'
      handleOpenEnquiry(course, type)
    }
    window.addEventListener('open-enquiry-modal', handleEvent)
    return () => window.removeEventListener('open-enquiry-modal', handleEvent)
  }, [])

  useEffect(() => {
    let isMounted = true

    // Check initial Supabase admin session on mount
    getCurrentAdmin()
      .then((adminUser) => {
        if (isMounted) {
          setIsAuthenticated(Boolean(adminUser))
          setIsAuthChecking(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsAuthenticated(false)
          setIsAuthChecking(false)
        }
      })

    // Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return
      if (session?.user) {
        const isAdmin = await verifyUserIsAdmin(session.user)
        if (isMounted) {
          setIsAuthenticated(isAdmin)
          setIsAuthChecking(false)
        }
      } else {
        if (isMounted) {
          setIsAuthenticated(false)
          setIsAuthChecking(false)
        }
      }
    })

    // Handle browser back and forward buttons
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      isMounted = false
      window.removeEventListener('popstate', handlePopState)
      subscription?.unsubscribe()
    }
  }, [])

  const navigate = (path: string) => {
    window.history.pushState({}, '', path)
    setCurrentPath(path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogin = () => {
    setIsAuthenticated(true)
    setIsAuthChecking(false)
    navigate('/admin/dashboard')
  }

  const handleLogout = async () => {
    await signOutAdmin()
    setIsAuthenticated(false)
    setIsAuthChecking(false)
    navigate('/admin')
  }

  // Admin routes — show a clean loading indicator while verifying admin session on page refresh
  if (currentPath === '/admin/dashboard') {
    if (isAuthChecking) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: 'var(--color-bg-alternate)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          color: 'var(--color-accent)',
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          letterSpacing: '0.18em',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '2px solid rgba(184, 138, 50, 0.25)',
            borderTopColor: 'var(--color-accent)',
            borderRadius: '50%',
            animation: 'adminSpin 0.8s linear infinite',
          }} />
          <span>VERIFYING ADMINISTRATOR ACCESS...</span>
          <style>{`@keyframes adminSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )
    }

    if (!isAuthenticated) {
      setTimeout(() => navigate('/admin'), 0)
      return null
    }
    return (
      <AdminDashboard onLogout={handleLogout} />
    )
  }

  if (currentPath === '/admin') {
    if (isAuthChecking) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: 'var(--color-bg-alternate)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          color: 'var(--color-accent)',
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          letterSpacing: '0.18em',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '2px solid rgba(184, 138, 50, 0.25)',
            borderTopColor: 'var(--color-accent)',
            borderRadius: '50%',
            animation: 'adminSpin 0.8s linear infinite',
          }} />
          <span>CHECKING SESSION...</span>
          <style>{`@keyframes adminSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )
    }

    if (isAuthenticated) {
      setTimeout(() => navigate('/admin/dashboard'), 0)
      return null
    }
    return (
      <AdminLogin onLogin={handleLogin} />
    )
  }

  // Render content based on current active tab/route
  const renderPageContent = () => {
    switch (currentPath) {
      case '/academy':
        return (
          <>
            <AcademySection />
            <AcademyJourneySection />
          </>
        )

      case '/founder':
        return (
          <>
            <FounderSection />
          </>
        )

      case '/courses':
        return (
          <>
            <CoursesSection onOpenEnquire={(c) => handleOpenEnquiry(c, 'Course Enrolment')} />
          </>
        )

      case '/gallery':
        return (
          <>
            <GallerySection />
            <ScrollingGallerySection />
            <ReelsSection />
          </>
        )

      case '/voices':
      case '/achievements':
        return (
          <>
            <AchievementsSection />
          </>
        )

      case '/contact':
        return (
          <>
            <ContactSection onOpenEnquiry={handleOpenEnquiry} />
          </>
        )

      case '/':
      default:
        // Streamlined Homepage with course previews near the top!
        return (
          <>
            <HeroSection onNavigate={navigate} />
            <VideoShowcaseSection />
            <CoursesPreviewSection
              onOpenEnquire={(c) => handleOpenEnquiry(c, 'Course Enrolment')}
              onNavigateToCourses={() => navigate('/courses')}
            />
            <AcademyPillarsPreview onNavigateToAcademy={() => navigate('/academy')} />
            <FounderIntroPreview onNavigateToFounder={() => navigate('/founder')} />
            <VoicesPreview onNavigateToVoices={() => navigate('/voices')} />
            <ContactSection onOpenEnquiry={handleOpenEnquiry} />
          </>
        )
    }
  }

  return (
    <>
      {/* Premium loading screen */}
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}

      {/* Gold scroll progress bar */}
      <ScrollProgressBar />

      {/* Navigation Header */}
      <Navbar
        currentPath={currentPath}
        onNavigate={navigate}
        onOpenEnrol={() => handleOpenEnquiry('Bharatanatyam', 'Course Enrolment')}
      />

      {/* Main Page Content */}
      <main style={{ minHeight: '80vh', paddingTop: currentPath === '/' ? 0 : '88px' }}>
        {renderPageContent()}
      </main>

      {/* Footer */}
      <Footer onNavigate={navigate} />

      {/* Unified Admissions & Contact Enquiry Modal */}
      <EnquiryModal
        isOpen={isEnquiryOpen}
        initialCourse={enquiryCourse}
        initialType={enquiryType}
        onClose={handleCloseEnquiry}
      />
    </>
  )
}
