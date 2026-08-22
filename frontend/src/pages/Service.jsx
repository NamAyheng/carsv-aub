import PageHeader from '../components/layout/PageHeader'
import BookingSection from '../components/sections/BookingSection'
import ServiceTabs from '../components/sections/ServiceTabs'
import TestimonialSection from '../components/sections/TestimonialSection'

export default function Service() {
  return (
    <>
      <PageHeader title="Services" current="Services" background="/img/carousel-bg-2.jpg" />
      <ServiceTabs />
      <BookingSection />
      <TestimonialSection />
    </>
  )
}
