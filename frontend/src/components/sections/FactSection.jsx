import { useEffect, useState } from 'react'

const facts = [
  { icon: 'fa fa-check fa-2x text-white mb-3', label: 'Years Experience', delay: '0.1s' },
  { icon: 'fa fa-users-cog fa-2x text-white mb-3', label: 'Expert Technicians', delay: '0.3s' },
  { icon: 'fa fa-users fa-2x text-white mb-3', label: 'Satisfied Clients', delay: '0.5s' },
  { icon: 'fa fa-car fa-2x text-white mb-3', label: 'Compleate Projects', delay: '0.7s' },
]

function Counter({ value = 1234 }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const duration = 2000
    const start = performance.now()
    let frame

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      setCount(Math.floor(progress * value))
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return <h2 className="text-white mb-2">{count}</h2>
}

export default function FactSection() {
  return (
    <div className="container-fluid fact bg-dark my-5 py-5">
      <div className="container">
        <div className="row g-4">
          {facts.map((fact) => (
            <div key={fact.label} className="col-md-6 col-lg-3 text-center wow fadeIn" data-wow-delay={fact.delay}>
              <i className={fact.icon}></i>
              <Counter />
              <p className="text-white mb-0">{fact.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
