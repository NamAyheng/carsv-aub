const services = [
  { id: 'tab-pane-1', icon: 'fa fa-car-side fa-2x me-3', title: 'Diagnostic Test', image: '/img/service-1.jpg' },
  { id: 'tab-pane-2', icon: 'fa fa-car fa-2x me-3', title: 'Engine Servicing', image: '/img/service-2.jpg' },
  { id: 'tab-pane-3', icon: 'fa fa-cog fa-2x me-3', title: 'Tires Replacement', image: '/img/service-3.jpg' },
  { id: 'tab-pane-4', icon: 'fa fa-oil-can fa-2x me-3', title: 'Oil Changing', image: '/img/service-4.jpg' },
]

export default function ServiceTabs() {
  return (
    <div className="container-xxl service py-5">
      <div className="container">
        <div className="text-center wow fadeInUp" data-wow-delay="0.1s">
          <h6 className="text-primary text-uppercase">// Our Services //</h6>
          <h1 className="mb-5">Explore Our Services</h1>
        </div>
        <div className="row g-4 wow fadeInUp" data-wow-delay="0.3s">
          <div className="col-lg-4">
            <div className="nav w-100 nav-pills me-4">
              {services.map((service, index) => (
                <button
                  key={service.id}
                  className={`nav-link w-100 d-flex align-items-center text-start p-4 ${index === services.length - 1 ? 'mb-0' : 'mb-4'}${index === 0 ? ' active' : ''}`}
                  data-bs-toggle="pill"
                  data-bs-target={`#${service.id}`}
                  type="button"
                >
                  <i className={service.icon}></i>
                  <h4 className="m-0">{service.title}</h4>
                </button>
              ))}
            </div>
          </div>
          <div className="col-lg-8">
            <div className="tab-content w-100">
              {services.map((service, index) => (
                <div key={service.id} className={`tab-pane fade${index === 0 ? ' show active' : ''}`} id={service.id}>
                  <div className="row g-4">
                    <div className="col-md-6" style={{ minHeight: 350 }}>
                      <div className="position-relative h-100">
                        <img className="position-absolute img-fluid w-100 h-100" src={service.image} style={{ objectFit: 'cover' }} alt="" />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <h3 className="mb-3">15 Years Of Experience In Auto Servicing</h3>
                      <p className="mb-4">Tempor erat elitr rebum at clita. Diam dolor diam ipsum sit. Aliqu diam amet diam et eos. Clita erat ipsum et lorem et sit, sed stet lorem sit clita duo justo magna dolore erat amet</p>
                      <p><i className="fa fa-check text-success me-3"></i>Quality Servicing</p>
                      <p><i className="fa fa-check text-success me-3"></i>Expert Workers</p>
                      <p><i className="fa fa-check text-success me-3"></i>Modern Equipment</p>
                      <a href="#" className="btn btn-primary py-3 px-5 mt-3">Read More<i className="fa fa-arrow-right ms-3"></i></a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
