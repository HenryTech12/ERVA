import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[#E8EAF0]">GR<span className="text-[#4FA0A0]">ACE</span></h1>
        <p className="text-sm text-[#8891A8] mt-1">Compliance Intelligence Platform</p>
      </div>

      <div className="bg-[#131B2E] border border-[#26314D] rounded-xl p-8">
        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[#4FA0A0]/10 border border-[#4FA0A0]/30 flex items-center justify-center mx-auto mb-4">
              <span className="text-[#4FA0A0] text-xl">✓</span>
            </div>
            <h2 className="text-base font-semibold text-[#E8EAF0] mb-2">Check your email</h2>
            <p className="text-sm text-[#8891A8] mb-6">Reset instructions sent to {email}</p>
            <Link to="/login" className="text-sm text-[#4FA0A0] hover:underline">Back to login</Link>
          </div>
        ) : (
          <>
            <h2 className="text-base font-semibold text-[#E8EAF0] mb-2">Reset password</h2>
            <p className="text-sm text-[#8891A8] mb-6">Enter your email to receive reset instructions.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Email Address" type="email" placeholder="officer@bank.ng" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">Send Reset Link</Button>
            </form>
            <div className="mt-4 text-center">
              <Link to="/login" className="text-xs text-[#8891A8] hover:text-[#4FA0A0] transition-colors">← Back to login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
