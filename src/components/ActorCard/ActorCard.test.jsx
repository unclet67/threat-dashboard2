import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ActorCard from './ActorCard.jsx'

const actor = {
  id: 'apt31', name: 'APT31', aliases: ['Zirconium'],
  opTypes: ['Cyber', 'IO'], confidence: 'high',
  operationIds: ['op1', 'op2'], description: 'Test actor.'
}

test('renders actor name as link', () => {
  render(<MemoryRouter><ActorCard actor={actor} /></MemoryRouter>)
  expect(screen.getByRole('link', { name: /APT31/i })).toBeInTheDocument()
})

test('renders operation count', () => {
  render(<MemoryRouter><ActorCard actor={actor} /></MemoryRouter>)
  expect(screen.getByText(/2 operations/i)).toBeInTheDocument()
})
