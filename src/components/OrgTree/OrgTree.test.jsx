import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OrgTree from './OrgTree.jsx'

const orgs = [
  { id: 'mss', name: 'MSS', countryId: 'china', parentOrgId: null, childOrgIds: ['mss-jinan'], actorIds: [] },
  { id: 'mss-jinan', name: 'MSS Jinan Bureau', countryId: 'china', parentOrgId: 'mss', childOrgIds: [], actorIds: ['apt31'] },
]
const actors = [{ id: 'apt31', name: 'APT31', orgId: 'mss-jinan' }]

test('renders root org', () => {
  render(<MemoryRouter><OrgTree orgs={orgs} actors={actors} countryId="china" /></MemoryRouter>)
  expect(screen.getByText('MSS')).toBeInTheDocument()
})

test('child org is visible by default', () => {
  render(<MemoryRouter><OrgTree orgs={orgs} actors={actors} countryId="china" /></MemoryRouter>)
  expect(screen.getByText('MSS Jinan Bureau')).toBeInTheDocument()
})

test('actor link is rendered', () => {
  render(<MemoryRouter><OrgTree orgs={orgs} actors={actors} countryId="china" /></MemoryRouter>)
  expect(screen.getByText('APT31')).toBeInTheDocument()
})
