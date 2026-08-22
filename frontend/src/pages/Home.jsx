import AboutSection from '../components/sections/AboutSection'
import BookingSection from '../components/sections/BookingSection'
import FactSection from '../components/sections/FactSection'
import FeatureCards from '../components/sections/FeatureCards'
import HeroCarousel from '../components/sections/HeroCarousel'
import ServiceTabs from '../components/sections/ServiceTabs'
import TeamSection from '../components/sections/TeamSection'
import TestimonialSection from '../components/sections/TestimonialSection'

export default function Home() {
  return (
    <>
      <HeroCarousel />
      <FeatureCards />
      <AboutSection />
      <FactSection />
      <ServiceTabs />
      <BookingSection />
      <TeamSection />
      <TestimonialSection />
    </>
  )
}
