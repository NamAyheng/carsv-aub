import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import BackToTop from './BackToTop'
import Footer from './Footer'
import Navbar from './Navbar'
import Spinner from './Spinner'
import Topbar from './Topbar'

export default function Layout() {
  const location = useLocation()
  const [showSpinner, setShowSpinner] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    setShowSpinner(true)
    const timer = setTimeout(() => setShowSpinner(false), 200)
    return () => clearTimeout(timer)
  }, [location.pathname])

  useEffect(() => {
    const onScroll = () => {
      const past = window.scrollY > 300
      setScrolled(past)
      setShowTop(past)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <Spinner show={showSpinner} />
      <Topbar />
      <Navbar scrolled={scrolled} />
      <Outlet />
      <Footer />
      <BackToTop visible={showTop} />
    </>
  )
}
