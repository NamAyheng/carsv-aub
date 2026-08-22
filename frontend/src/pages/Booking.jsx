import PageHeader from '../components/layout/PageHeader'
import BookingSection from '../components/sections/BookingSection'
import CallToAction from '../components/sections/CallToAction'
import FeatureCards from '../components/sections/FeatureCards'

export default function Booking() {
  return (
    <>
      <PageHeader title="Booking" current="Booking" background="/img/carousel-bg-1.jpg" />
      <FeatureCards />
      <BookingSection />
      <CallToAction />
    </>
  )
}
