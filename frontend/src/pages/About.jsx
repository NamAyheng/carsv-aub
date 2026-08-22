import PageHeader from '../components/layout/PageHeader'
import AboutSection from '../components/sections/AboutSection'
import FactSection from '../components/sections/FactSection'
import FeatureCards from '../components/sections/FeatureCards'
import TeamSection from '../components/sections/TeamSection'

export default function About() {
  return (
    <>
      <PageHeader title="About Us" current="About" background="/img/carousel-bg-1.jpg" />
      <FeatureCards />
      <AboutSection />
      <FactSection />
      <TeamSection />
    </>
  )
}
