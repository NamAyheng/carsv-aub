import { Link, NavLink, useLocation } from 'react-router-dom'

const pageRoutes = ['/booking', '/team', '/testimonial', '/404']

export default function Navbar({ scrolled }) {
  const { pathname } = useLocation()
  const pagesActive = pageRoutes.includes(pathname)

  return (
    <nav className={`navbar navbar-expand-lg bg-white navbar-light shadow sticky-top p-0${scrolled ? ' navbar-scrolled' : ''}`}>
      <Link to="/" className="navbar-brand d-flex align-items-center px-4 px-lg-5">
        <h2 className="m-0 text-primary"><i className="fa fa-car me-3"></i>CarSV</h2>
      </Link>
      <button type="button" className="navbar-toggler me-4" data-bs-toggle="collapse" data-bs-target="#navbarCollapse">
        <span className="navbar-toggler-icon"></span>
      </button>
      <div className="collapse navbar-collapse" id="navbarCollapse">
        <div className="navbar-nav ms-auto p-4 p-lg-0">
          <NavLink to="/" end className={({ isActive }) => `nav-item nav-link${isActive ? ' active' : ''}`}>Home</NavLink>
          <NavLink to="/about" className={({ isActive }) => `nav-item nav-link${isActive ? ' active' : ''}`}>About</NavLink>
          <NavLink to="/service" className={({ isActive }) => `nav-item nav-link${isActive ? ' active' : ''}`}>Services</NavLink>
          <div className="nav-item dropdown">
            <a href="#" className={`nav-link dropdown-toggle${pagesActive ? ' active' : ''}`} data-bs-toggle="dropdown">Pages</a>
            <div className="dropdown-menu fade-up m-0">
              <NavLink to="/booking" className={({ isActive }) => `dropdown-item${isActive ? ' active' : ''}`}>Booking</NavLink>
              <NavLink to="/team" className={({ isActive }) => `dropdown-item${isActive ? ' active' : ''}`}>Technicians</NavLink>
              <NavLink to="/testimonial" className={({ isActive }) => `dropdown-item${isActive ? ' active' : ''}`}>Testimonial</NavLink>
              <NavLink to="/404" className={({ isActive }) => `dropdown-item${isActive ? ' active' : ''}`}>404 Page</NavLink>
            </div>
          </div>
          <NavLink to="/contact" className={({ isActive }) => `nav-item nav-link${isActive ? ' active' : ''}`}>Contact</NavLink>
        </div>
        <Link to="/booking" className="btn btn-primary py-4 px-lg-5 d-none d-lg-block">
          Get A Quote<i className="fa fa-arrow-right ms-3"></i>
        </Link>
      </div>
    </nav>
  )
}
