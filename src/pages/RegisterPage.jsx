import { ArrowLeft, ArrowRight, Building2, Check, HeartPulse, Mail, MapPin, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Button, Logo } from '../components/Shared'
import AuthFeedback from '../components/AuthFeedback'
import { useAuth } from '../auth/AuthContext'
import { bloodGroups } from '../data/mockData'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [role, setRole] = useState('Donor')
  const [fields, setFields] = useState({ name: '', email: '', password: '', phone: '', bloodGroup: '', location: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const change = (event) => setFields((current) => ({ ...current, [event.target.name]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await register({
        name: fields.name.trim(), email: fields.email.trim(), password: fields.password,
        phone: fields.phone.trim(), location: fields.location.trim(), role: role.toUpperCase(),
        ...(role === 'Donor' && { bloodGroup: fields.bloodGroup.replace(/−/g, '-') }),
      })
      setFields((current) => ({ ...current, password: '' }))
      navigate('/login', { replace: true, state: { email: fields.email.trim(), registrationSuccess: 'Account created successfully. Sign in to continue.' } })
    } catch (failure) {
      setError(failure)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page register-page">
      <div className="auth-aside register-aside">
        <Link className="auth-back" to="/"><ArrowLeft size={16} /> Back to home</Link>
        <div className="auth-aside-content">
          <div className="register-illustration"><div className="illustration-circle circle-one" /><div className="illustration-circle circle-two" /><span className="illustration-drop"><HeartPulse size={40} /></span><span className="illustration-bubble bubble-one"><Check size={14} /></span><span className="illustration-bubble bubble-two"><MapPin size={14} /></span></div>
          <p className="eyebrow">A network that shows up</p>
          <h2>One account.<br /><em>More ways to help.</em></h2>
          <p className="register-aside-copy">Join hospitals and donors who are making emergency response more human, more visible and more effective.</p>
          <div className="register-benefits"><span><Check size={14} /> Simple, real-time alerts</span><span><Check size={14} /> Verified community members</span><span><Check size={14} /> Track every request clearly</span></div>
        </div>
        <div className="auth-aside-footer"><span><ShieldCheck size={15} /> Your information stays private</span><span>BloodBoard <span className="footer-dot">·</span> 2024</span></div>
      </div>
      <div className="auth-form-side">
        <div className="auth-mobile-logo"><Logo /></div>
        <div className="register-form-wrap">
          <p className="eyebrow">Create your account</p>
          <h1>Join the response.</h1>
          <p className="auth-subtitle">Set up your profile in a couple of minutes.</p>
          <div className="role-switch">
            <button className={role === 'Donor' ? 'selected' : ''} onClick={() => setRole('Donor')} disabled={submitting} type="button"><HeartPulse size={16} /> I’m a donor</button>
            <button className={role === 'Hospital' ? 'selected' : ''} onClick={() => setRole('Hospital')} disabled={submitting} type="button"><Building2 size={16} /> I represent a hospital</button>
          </div>
          <AuthFeedback error={error} />
          <form onSubmit={submit} aria-busy={submitting}>
            <div className="form-grid">
              <label className="form-field form-span"><span>{role === 'Hospital' ? 'Hospital name' : 'Full name'}</span><div className="input-with-icon"><UserRound size={17} /><input name="name" value={fields.name} onChange={change} placeholder={role === 'Hospital' ? 'e.g. City Care Hospital' : 'e.g. Ananya Kapoor'} minLength={2} maxLength={120} required disabled={submitting} autoComplete={role === 'Hospital' ? 'organization' : 'name'} /></div></label>
              <label className="form-field"><span>Email address</span><div className="input-with-icon"><Mail size={17} /><input name="email" type="email" value={fields.email} onChange={change} placeholder="you@example.com" maxLength={254} autoComplete="email" required disabled={submitting} /></div></label>
              <label className="form-field"><span>Phone number</span><div className="input-with-icon"><Phone size={17} /><input name="phone" type="tel" value={fields.phone} onChange={change} placeholder="+91 98765 43210" autoComplete="tel" required disabled={submitting} /></div></label>
              {role === 'Donor' && <label className="form-field"><span>Blood group</span><select name="bloodGroup" value={fields.bloodGroup} onChange={change} required disabled={submitting}><option value="" disabled>Select group</option>{bloodGroups.map((group) => <option key={group}>{group}</option>)}</select></label>}
              <label className={`form-field ${role === 'Hospital' ? 'form-span' : ''}`}><span>{role === 'Hospital' ? 'Hospital location' : 'City / location'}</span><div className="input-with-icon"><MapPin size={17} /><input name="location" value={fields.location} onChange={change} placeholder="e.g. Bengaluru, Karnataka" autoComplete="address-level2" maxLength={500} required disabled={submitting} /></div></label>
              <label className="form-field form-span"><span>Create password</span><input name="password" type="password" value={fields.password} onChange={change} placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required disabled={submitting} /><small className="field-hint">Use uppercase, lowercase, a number and a symbol; maximum 72 UTF-8 bytes.</small></label>
            </div>
            <label className="checkbox-label terms-check"><input type="checkbox" required disabled={submitting} /> <span>I agree to the <a href="/#terms">Terms of use</a> and <a href="/#privacy">Privacy policy</a>.</span></label>
            <Button type="submit" className="full-button" icon={ArrowRight} disabled={submitting}>{submitting ? 'Creating account…' : 'Create my account'}</Button>
          </form>
          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  )
}
