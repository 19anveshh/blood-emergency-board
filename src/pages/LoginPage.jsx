import { ArrowLeft, ArrowRight, Building2, HeartPulse, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Button, Logo } from '../components/Shared'
import AuthFeedback from '../components/AuthFeedback'
import { dashboardForRole, useAuth } from '../auth/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, authError } = useAuth()
  const [role, setRole] = useState('Hospital')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState(location.state?.email || '')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (event) => {
    event.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      // Role selection is presentation only; identity and routing come from the backend.
      const user = await login({ email: email.trim(), password })
      setPassword('')
      navigate(dashboardForRole(user.role), { replace: true })
    } catch (failure) {
      setError(failure)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-aside">
        <Link className="auth-back" to="/"><ArrowLeft size={16} /> Back to home</Link>
        <div className="auth-aside-content">
          <div className="auth-quote-mark">“</div>
          <blockquote>In an emergency, the fastest way to help is to make the next step clear.</blockquote>
          <div className="quote-author"><span className="quote-avatar">SM</span><span><strong>Dr. Sarah Menon</strong><small>Emergency physician, Bengaluru</small></span></div>
        </div>
        <div className="auth-aside-footer"><span><ShieldCheck size={15} /> Built with privacy at the core</span><span>BloodBoard <span className="footer-dot">·</span> 2024</span></div>
      </div>
      <div className="auth-form-side">
        <div className="auth-mobile-logo"><Logo /></div>
        <div className="auth-form-wrap">
          <p className="eyebrow">Welcome back</p>
          <h1>Good to see you again.</h1>
          <p className="auth-subtitle">Sign in to continue coordinating life-saving care.</p>
          <div className="role-switch">
            <button className={role === 'Hospital' ? 'selected' : ''} onClick={() => setRole('Hospital')} type="button"><Building2 size={16} /> Hospital</button>
            <button className={role === 'Donor' ? 'selected' : ''} onClick={() => setRole('Donor')} type="button"><HeartPulse size={16} /> Donor</button>
          </div>
          <p className="auth-role-hint">Your workspace is determined by your account role.</p>
          <AuthFeedback error={error || authError} success={location.state?.registrationSuccess} />
          <form onSubmit={submit} aria-busy={submitting}>
            <label className="form-field"><span>Email address</span><div className="input-with-icon"><Mail size={17} /><input name="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={role === 'Hospital' ? 'name@hospital.org' : 'you@example.com'} required disabled={submitting} /></div></label>
            <label className="form-field"><span>Password</span><div className="input-with-icon"><LockKeyhole size={17} /><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required disabled={submitting} /><button type="button" className="input-action" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
            <div className="form-meta"><label className="checkbox-label" title="This demo saves your session in this browser until you sign out."><input type="checkbox" checked disabled /> <span>Remember me</span></label><a href="/#forgot">Forgot password?</a></div>
            <Button type="submit" className="full-button" icon={ArrowRight} disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in to workspace'}</Button>
          </form>
          <div className="auth-divider"><span>New to BloodBoard?</span></div>
          <Link className="button button-outline full-button" to="/register"><UserRound size={17} /> Create an account</Link>
          <p className="auth-terms">By continuing, you agree to our <a href="/#terms">Terms of use</a> and <a href="/#privacy">Privacy policy</a>.</p>
        </div>
      </div>
    </div>
  )
}
