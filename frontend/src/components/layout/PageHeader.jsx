import { Link } from 'react-router-dom'

export default function PageHeader({ title, current, background = '/img/carousel-bg-1.jpg' }) {
  return (
    <div className="container-fluid page-header mb-5 p-0" style={{ backgroundImage: `url(${background})` }}>
      <div className="container-fluid page-header-inner py-5">
        <div className="container text-center">
          <h1 className="display-3 text-white mb-3 animated slideInDown">{title}</h1>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb justify-content-center text-uppercase">
              <li className="breadcrumb-item"><Link to="/">Home</Link></li>
              <li className="breadcrumb-item"><a href="#">Pages</a></li>
              <li className="breadcrumb-item text-white active" aria-current="page">{current}</li>
            </ol>
          </nav>
        </div>
      </div>
    </div>
  )
}
