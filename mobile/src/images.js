export const images = {
  'about.jpg': require('../assets/images/about.jpg'),
  'carousel-1.png': require('../assets/images/carousel-1.png'),
  'carousel-2.png': require('../assets/images/carousel-2.png'),
  'carousel-bg-1.jpg': require('../assets/images/carousel-bg-1.jpg'),
  'carousel-bg-2.jpg': require('../assets/images/carousel-bg-2.jpg'),
  'service-1.jpg': require('../assets/images/service-1.jpg'),
  'service-2.jpg': require('../assets/images/service-2.jpg'),
  'service-3.jpg': require('../assets/images/service-3.jpg'),
  'service-4.jpg': require('../assets/images/service-4.jpg'),
  'team-1.jpg': require('../assets/images/team-1.jpg'),
  'team-2.jpg': require('../assets/images/team-2.jpg'),
  'team-3.jpg': require('../assets/images/team-3.jpg'),
  'team-4.jpg': require('../assets/images/team-4.jpg'),
  'testimonial-1.jpg': require('../assets/images/testimonial-1.jpg'),
  'testimonial-2.jpg': require('../assets/images/testimonial-2.jpg'),
  'testimonial-3.jpg': require('../assets/images/testimonial-3.jpg'),
  'testimonial-4.jpg': require('../assets/images/testimonial-4.jpg'),
}

export function getImage(name) {
  return images[name] || images['about.jpg']
}
