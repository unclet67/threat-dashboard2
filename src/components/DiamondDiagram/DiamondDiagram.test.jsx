import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DiamondDiagram from './DiamondDiagram.jsx'

const props = {
  adversary: { label: 'APT31', id: 'apt31' },
  capability: { label: 'SOGU', id: 'cap-sogu' },
  infrastructure: { label: 'SOHO Routers' },
  victim: { label: 'EU Govt' },
}

test('renders all four node labels', () => {
  render(<MemoryRouter><DiamondDiagram {...props} /></MemoryRouter>)
  expect(screen.getByText('APT31')).toBeInTheDocument()
  expect(screen.getByText('SOGU')).toBeInTheDocument()
  expect(screen.getByText('SOHO Routers')).toBeInTheDocument()
  expect(screen.getByText('EU Govt')).toBeInTheDocument()
})

test('renders node role labels', () => {
  render(<MemoryRouter><DiamondDiagram {...props} /></MemoryRouter>)
  expect(screen.getByText('ADVERSARY')).toBeInTheDocument()
  expect(screen.getByText('CAPABILITY')).toBeInTheDocument()
  expect(screen.getByText('INFRASTRUCTURE')).toBeInTheDocument()
  expect(screen.getByText('VICTIM')).toBeInTheDocument()
})
