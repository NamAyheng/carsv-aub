export default function BackToTop({ visible }) {
  const scrollTop = (event) => {
    event.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <a
      href="#"
      className={`btn btn-lg btn-primary btn-lg-square back-to-top${visible ? ' visible' : ''}`}
      onClick={scrollTop}
    >
      <i className="bi bi-arrow-up"></i>
    </a>
  )
}
