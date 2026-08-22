import { Link } from 'react-router-dom'

export default function CallToAction() {
  return (
    <div className="container-xxl py-5 wow fadeInUp" data-wow-delay="0.1s">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-8 col-md-6">
            <h6 className="text-primary text-uppercase">// Call To Action //</h6>
            <h1 className="mb-4">Have Any Pre Booking Question?</h1>
            <p className="mb-0">Lorem diam ea sit dolor labore. Clita et dolor erat sed est lorem sed et sit. Diam sed duo magna erat et stet clita ea magna ea sed, sit labore magna lorem tempor justo rebum dolores. Eos dolor sea erat amet et, lorem labore lorem at dolores. Stet ea ut justo et, clita et et ipsum diam.</p>
          </div>
          <div className="col-lg-4 col-md-6">
            <div className="bg-primary d-flex flex-column justify-content-center text-center h-100 p-4">
              <h3 className="text-white mb-4"><i className="fa fa-phone-alt me-3"></i>+012 345 6789</h3>
              <Link to="/contact" className="btn btn-secondary py-3 px-5">Contact Us<i className="fa fa-arrow-right ms-3"></i></Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
