import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('shows resource panels', () => {
    render(<App />)
    expect(screen.getAllByText(/Cash/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Heat 100에서만 버튼이 깜빡입니다/i)).toBeInTheDocument()
  })
})
