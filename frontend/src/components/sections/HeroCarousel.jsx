import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Carousel } from 'bootstrap'

export default function HeroCarousel() {
  useEffect(() => {
    const element = document.getElementById('header-carousel')
    if (!element) return undefined
    const carousel = Carousel.getOrCreateInstance(element, { interval: 5000, ride: 'carousel' })
    return () => carousel.dispose()
  }, [])

  return (
    <div className="container-fluid p-0 mb-5">
      <div id="header-carousel" className="carousel slide" data-bs-ride="carousel">
        <div className="carousel-inner">
          <div className="carousel-item active">
            <img className="w-100" src="/img/carousel-bg-1.jpg" alt="Image" />
            <div className="carousel-caption d-flex align-items-center">
              <div className="container">
                <div className="row align-items-center justify-content-center justify-content-lg-start">
                  <div className="col-10 col-lg-7 text-center text-lg-start">
                    <h6 className="text-white text-uppercase mb-3 animated slideInDown">// Car Servicing //</h6>
                    <h1 className="display-3 text-white mb-4 pb-3 animated slideInDown">Qualified Car Repair Service Center</h1>
                    <Link to="/about" className="btn btn-primary py-3 px-5 animated slideInDown">Learn More<i className="fa fa-arrow-right ms-3"></i></Link>
                  </div>
                  <div className="col-lg-5 d-none d-lg-flex animated zoomIn">
                    <img className="img-fluid" src="/img/carousel-1.png" alt="" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="carousel-item">
            <img className="w-100" src="/img/carousel-bg-2.jpg" alt="Image" />
            <div className="carousel-caption d-flex align-items-center">
              <div className="container">
                <div className="row align-items-center justify-content-center justify-content-lg-start">
                  <div className="col-10 col-lg-7 text-center text-lg-start">
                    <h6 className="text-white text-uppercase mb-3 animated slideInDown">// Car Servicing //</h6>
                    <h1 className="display-3 text-white mb-4 pb-3 animated slideInDown">Qualified Car Wash Service Center</h1>
                    <Link to="/service" className="btn btn-primary py-3 px-5 animated slideInDown">Learn More<i className="fa fa-arrow-right ms-3"></i></Link>
                  </div>
                  <div className="col-lg-5 d-none d-lg-flex animated zoomIn">
                    <img className="img-fluid" src="/img/carousel-2.png" alt="" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button className="carousel-control-prev" type="button" data-bs-target="#header-carousel" data-bs-slide="prev">
          <span className="carousel-control-prev-icon" aria-hidden="true"></span>
          <span className="visually-hidden">Previous</span>
        </button>
        <button className="carousel-control-next" type="button" data-bs-target="#header-carousel" data-bs-slide="next">
          <span className="carousel-control-next-icon" aria-hidden="true"></span>
          <span className="visually-hidden">Next</span>
        </button>
      </div>
    </div>
  )
}
