import { useEffect, useState } from 'react'

const testimonials = [
  '/img/testimonial-1.jpg',
  '/img/testimonial-2.jpg',
  '/img/testimonial-3.jpg',
  '/img/testimonial-4.jpg',
]

function TestimonialCard({ image, center }) {
  return (
    <div className={`testimonial-item text-center${center ? ' center' : ''}`}>
      <img className="bg-light rounded-circle p-2 mx-auto mb-3" src={image} style={{ width: 80, height: 80 }} alt="" />
      <h5 className="mb-0">Client Name</h5>
      <p>Profession</p>
      <div className="testimonial-text bg-light text-center p-4">
        <p className="mb-0">Tempor erat elitr rebum at clita. Diam dolor diam ipsum sit diam amet diam et eos. Clita erat ipsum et lorem et sit.</p>
      </div>
    </div>
  )
}

export default function TestimonialSection() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % testimonials.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const left = (active + testimonials.length - 1) % testimonials.length
  const right = (active + 1) % testimonials.length

  return (
    <div className="container-xxl py-5 wow fadeInUp" data-wow-delay="0.1s">
      <div className="container">
        <div className="text-center">
          <h6 className="text-primary text-uppercase">// Testimonial //</h6>
          <h1 className="mb-5">Our Clients Say!</h1>
        </div>
        <div className="testimonial-carousel position-relative">
          <div className="testimonial-track">
            <TestimonialCard image={testimonials[left]} />
            <TestimonialCard image={testimonials[active]} center />
            <TestimonialCard image={testimonials[right]} />
          </div>
          <div className="testimonial-dots">
            {testimonials.map((image, index) => (
              <button
                key={image}
                type="button"
                className={`testimonial-dot${index === active ? ' active' : ''}`}
                onClick={() => setActive(index)}
                aria-label={`Show testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
