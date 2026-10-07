import { ArrowLeft, CalendarClock, FileText, HeartPulse, Info, MapPin, Plus, Send, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { AppShell, BloodBadge, Button, Field, Toast } from '../components/Shared'
import AuthFeedback from '../components/AuthFeedback'
import { bloodGroups } from '../data/mockData'
import { requestApi } from '../api/requests'
import { toApiBloodGroup, toApiUrgency } from '../data/requestView'
import { useAuth } from '../auth/AuthContext'

const localDateTime = (hoursFromNow = 4) => {
  const date = new Date(Date.now() + hoursFromNow * 3_600_000)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

export default function CreateRequestPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [urgency, setUrgency] = useState('Critical')
  const [group, setGroup] = useState('O−')
  const [units, setUnits] = useState(3)
  const [fields, setFields] = useState({ hospital: currentUser?.name || '', location: currentUser?.location || '', requiredBefore: localDateTime(), notes: 'Emergency support needed. Please respond if you are an eligible compatible donor.' })
  const [created, setCreated] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const change = (event) => setFields((current) => ({ ...current, [event.target.name]: event.target.value }))
  const previewDate = useMemo(() => fields.requiredBefore ? new Date(fields.requiredBefore).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Select a time', [fields.requiredBefore])

  const submit = async (event) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await requestApi.create({
        bloodGroup: toApiBloodGroup(group),
        unitsRequired: units,
        hospital: fields.hospital.trim(),
        location: fields.location.trim(),
        urgency: toApiUrgency(urgency),
        requiredBefore: new Date(fields.requiredBefore).toISOString(),
        additionalNotes: fields.notes.trim(),
      })
      setCreated(true)
      setTimeout(() => navigate('/hospital'), 800)
    } catch (failure) {
      setError(failure)
    } finally {
      setSubmitting(false)
    }
  }

  return <AppShell title="Create emergency request" subtitle="Hospital workspace · New request">
    <div className="form-page-top"><Link className="back-link back-link-dark" to="/hospital"><ArrowLeft size={15} /> Back to dashboard</Link></div>
    <div className="create-request-layout">
      <div className="content-panel form-panel">
        <div className="form-panel-heading"><span className="form-panel-icon"><HeartPulse size={21} /></span><div><h2>Request blood support</h2><p>Share the essential details so nearby donors can respond quickly.</p></div></div>
        <AuthFeedback error={error} />
        <form onSubmit={submit} aria-busy={submitting}>
          <div className="form-section"><div className="form-section-heading"><span>01</span><div><h3>What do you need?</h3><p>Choose the blood group and quantity required.</p></div></div><div className="form-grid form-grid-three">
            <Field label="Blood group"><div className="blood-select-grid">{bloodGroups.map((bloodGroup) => <button type="button" key={bloodGroup} className={group === bloodGroup ? 'selected' : ''} onClick={() => setGroup(bloodGroup)} disabled={submitting}><BloodBadge group={bloodGroup} size="sm" /></button>)}</div></Field>
            <Field label="Units required"><div className="number-input"><button type="button" aria-label="Decrease units" onClick={() => setUnits((value) => Math.max(1, value - 1))} disabled={submitting}><span>−</span></button><strong>{units}</strong><button type="button" aria-label="Increase units" onClick={() => setUnits((value) => value + 1)} disabled={submitting}><Plus size={15} /></button></div></Field>
            <Field label="Urgency"><div className="urgency-options">{['Critical', 'Urgent', 'Normal'].map((level) => <button type="button" key={level} className={`${level.toLowerCase()} ${urgency === level ? 'selected' : ''}`} onClick={() => setUrgency(level)} disabled={submitting}><span />{level}</button>)}</div></Field>
          </div></div>
          <div className="form-section"><div className="form-section-heading"><span>02</span><div><h3>Where should donors go?</h3><p>Help donors find the right place without any delay.</p></div></div><div className="form-grid">
            <Field label="Hospital name" className="form-span"><div className="input-with-icon"><HeartPulse size={17} /><input name="hospital" value={fields.hospital} onChange={change} required disabled={submitting} /></div></Field>
            <Field label="Hospital location"><div className="input-with-icon"><MapPin size={17} /><input name="location" value={fields.location} onChange={change} required disabled={submitting} /></div></Field>
            <Field label="Required before"><div className="input-with-icon"><CalendarClock size={17} /><input name="requiredBefore" type="datetime-local" value={fields.requiredBefore} onChange={change} required disabled={submitting} /></div></Field>
          </div></div>
          <div className="form-section"><div className="form-section-heading"><span>03</span><div><h3>Add context for donors <small>Optional</small></h3><p>A little more information can help the right person say yes.</p></div></div><Field label="Additional notes"><div className="textarea-wrap"><FileText size={17} /><textarea name="notes" rows="4" value={fields.notes} onChange={change} placeholder="Share any useful context about this request..." disabled={submitting} /></div></Field></div>
          <div className="form-actions"><Link className="button button-outline" to="/hospital">Cancel</Link><Button type="submit" icon={Send} disabled={submitting}>{submitting ? 'Creating request…' : created ? 'Request created' : 'Create emergency request'}</Button></div>
        </form>
      </div>
      <aside className="request-preview"><div className="preview-label"><Sparkles size={15} /> Live preview</div><div className="preview-card"><div className="preview-card-top"><span className="preview-status"><span /> {urgency} need</span><span className="preview-live">Preview</span></div><div className="preview-blood"><BloodBadge group={group} size="xl" /><div><span>Blood needed</span><strong>{group} blood</strong></div></div><div className="preview-detail"><MapPin size={16} /><span><small>Hospital</small><strong>{fields.hospital || 'Your hospital'}</strong><em>{fields.location || 'Hospital location'}</em></span></div><div className="preview-detail"><CalendarClock size={16} /><span><small>Required before</small><strong>{previewDate}</strong><em>Shared with compatible donors</em></span></div><div className="preview-note"><Info size={15} /><span>This request will be shared with compatible donors within 15 km.</span></div></div><div className="preview-tip"><span>💡</span><p><strong>Good to know</strong> Critical requests appear at the top of the emergency board.</p></div></aside>
    </div>
    {created && <Toast onClose={() => setCreated(false)}>Emergency request created successfully</Toast>}
  </AppShell>
}
