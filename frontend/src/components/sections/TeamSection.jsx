const defaultMembers = [
  '/img/team-1.jpg',
  '/img/team-2.jpg',
  '/img/team-3.jpg',
  '/img/team-4.jpg',
]

export default function TeamSection({ members = defaultMembers }) {
  return (
    <div className="container-xxl py-5">
      <div className="container">
        <div className="text-center wow fadeInUp" data-wow-delay="0.1s">
          <h6 className="text-primary text-uppercase">// Our Technicians //</h6>
          <h1 className="mb-5">Our Expert Technicians</h1>
        </div>
        <div className="row g-4">
          {members.map((image, index) => (
            <div key={`${image}-${index}`} className="col-lg-3 col-md-6 wow fadeInUp" data-wow-delay={`${0.1 + (index % 4) * 0.2}s`}>
              <div className="team-item">
                <div className="position-relative overflow-hidden">
                  <img className="img-fluid" src={image} alt="" />
                  <div className="team-overlay position-absolute start-0 top-0 w-100 h-100">
                    <a className="btn btn-square mx-1" href="#"><i className="fab fa-facebook-f"></i></a>
                    <a className="btn btn-square mx-1" href="#"><i className="fab fa-twitter"></i></a>
                    <a className="btn btn-square mx-1" href="#"><i className="fab fa-instagram"></i></a>
                  </div>
                </div>
                <div className="bg-light text-center p-4">
                  <h5 className="fw-bold mb-0">Full Name</h5>
                  <small>Designation</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
