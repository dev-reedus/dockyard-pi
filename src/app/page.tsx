import { redirect } from 'next/navigation'

// Root route redirects straight to the dashboard.
export default function RootPage(): never {
  redirect('/dashboard')
}
