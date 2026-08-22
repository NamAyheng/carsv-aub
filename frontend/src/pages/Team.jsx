import PageHeader from '../components/layout/PageHeader'
import TeamSection from '../components/sections/TeamSection'

const teamPageMembers = [
  '/img/team-1.jpg',
  '/img/team-2.jpg',
  '/img/team-3.jpg',
  '/img/team-4.jpg',
  '/img/team-2.jpg',
  '/img/team-3.jpg',
  '/img/team-4.jpg',
  '/img/team-1.jpg',
]

export default function Team() {
  return (
    <>
      <PageHeader title="Technicians" current="Technicians" background="/img/carousel-bg-2.jpg" />
      <TeamSection members={teamPageMembers} />
    </>
  )
}
