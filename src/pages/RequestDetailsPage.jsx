import { ArrowLeft, ArrowRight, CalendarClock, Check, CheckCircle2, Clock3, FileText, HeartPulse, MapPin, MessageCircle, MoreHorizontal, Navigation, ShieldCheck, UserCheck, Users, XCircle, Zap } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { AppShell, BloodBadge, Button, DonorRow, SectionHeading, StatusBadge, Timeline, Toast } from '../components/Shared'
import AuthFeedback from '../components/AuthFeedback'
import { requestApi } from '../api/requests'
import { toDonorView, toRequestView } from '../data/requestView'
import { useAuth } from '../auth/AuthContext'

export default function RequestDetailsPage() {
  const { requestId } = useParams()
  const { currentUser } = useAuth()
  const [request, setRequest] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState('')

  const load = async () => {
    setError(null)
    try {
      const [record, matchData] = await Promise.all([requestApi.get(requestId), requestApi.matches(requestId)])
      const view = toRequestView(record)
      setRequest(view)
      setMatches((matchData.matches || []).map((donor) => toDonorView(donor, view.acceptedDonorIds)))
    } catch (failure) {
      setError(failure)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [requestId])

  const canFulfill = currentUser?.role === 'HOSPITAL' && request?.hospitalId === currentUser.hospitalId
  const timeline = useMemo(() => {
    if (!request) return []
    const items = [[request.created, `Request created by ${request.hospital}`]]
    if (request.acceptedDonorIds.length) items.push(['Now', `${request.acceptedDonorIds.length} donor accepted this request`])
    else if (request.status === 'Fulfilled') items.push(['Completed', 'Request marked fulfilled'])
    else items.push(['Live', 'Waiting for a compatible donor'])
    return items
  }, [request])

  const fulfill = async () => {
    try {
      const updated = await requestApi.fulfill(request.id)
      setRequest(toRequestView(updated))
      setToast('Blood Request Fulfilled')
    } catch (failure) {
      setError(failure)
    }
  }

  if (loading) return <AppShell title="Request details" subtitle="Emergency request · Details"><div className="auth-loading-copy">Loading request…</div></AppShell>
  if (!request) return <AppShell title="Request details" subtitle="Emergency request · Details"><AuthFeedback error={error || 'Request not found.'} /><Link className="back-link back-link-dark" to="/board"><ArrowLeft size={15} /> Back to board</Link></AppShell>

  return <AppShell title={`Request #${request.id}`} subtitle="Emergency request · Details"><div className="form-page-top request-detail-back"><Link className="back-link back-link-dark" to="/board"><ArrowLeft size={15} /> Back to board</Link><div className="detail-top-actions"><button className="icon-button" aria-label="More request options"><MoreHorizontal size={18} /></button></div></div>
    <AuthFeedback error={error} />
    <div className="detail-hero"><div className="detail-hero-main"><div className={`detail-blood-wrap ${request.urgency.toLowerCase()}`}><BloodBadge group={request.bloodGroup} size="xl" /></div><div><div className="detail-badges"><StatusBadge variant={request.status === 'Fulfilled' ? 'fulfilled' : request.urgency.toLowerCase()}>{request.status === 'Fulfilled' ? 'Fulfilled' : `${request.urgency} need`}</StatusBadge><span className="detail-id">Created {request.created}</span></div><h2>{request.units} {request.units === 1 ? 'unit' : 'units'} of {request.bloodGroup} blood needed</h2><p><HeartPulse size={16} /> {request.hospital}</p></div></div><div className="detail-hero-actions"><Button variant="outline" icon={MessageCircle}>Message team</Button>{canFulfill && request.status !== 'Fulfilled' && <Button icon={CheckCircle2} onClick={fulfill}>Mark fulfilled</Button>}</div></div>
    <div className="detail-stat-row"><div><MapPin size={17} /><span><small>Location</small><strong>{request.location}</strong></span></div><div><CalendarClock size={17} /><span><small>Required before</small><strong>{request.requiredBefore}</strong></span></div><div><Clock3 size={17} /><span><small>Time remaining</small><strong className={request.status === 'Fulfilled' ? 'muted' : 'critical-text'}>{request.timeRemaining}</strong></span></div><div><Users size={17} /><span><small>Matching donors</small><strong>{matches.length} people</strong></span></div></div>
    <div className="detail-grid"><div className="detail-main-column"><section className="content-panel details-panel"><SectionHeading eyebrow="Request context" title="About this request" /><p className="detail-notes">{request.notes}</p><div className="detail-meta-grid"><span><FileText size={15} /><small>Request ID</small><strong>{request.id}</strong></span><span><ShieldCheck size={15} /><small>Posted by</small><strong>{request.hospital}</strong></span><span><Navigation size={15} /><small>Search radius</small><strong>15 kilometers</strong></span><span><Zap size={15} /><small>Priority</small><strong>{request.urgency}</strong></span></div></section><section className="content-panel details-panel"><SectionHeading eyebrow="The response" title="Top matching donors" action={<Link className="panel-link" to={`/matching/${request.id}`}>View all matches <ArrowRight size={14} /></Link>} /><div className="donor-list">{matches.slice(0, 3).map((donor) => <DonorRow key={donor.id} donor={donor} action={false} />)}{!matches.length && <p className="auth-loading-copy">No compatible donors are currently available.</p>}</div></section></div>
      <aside className="detail-side-column"><section className="content-panel timeline-panel"><SectionHeading eyebrow="Live updates" title="Request timeline" /><Timeline items={timeline} /></section><section className="content-panel detail-actions-panel"><h3>Manage request</h3><p>Review the response and update the request when your team confirms the next step.</p><Link className="detail-action" to={`/matching/${request.id}`}><UserCheck size={16} /><span><strong>View matching donors</strong><small>See compatibility and availability</small></span><ArrowRight size={15} /></Link>{canFulfill && request.status !== 'Fulfilled' && <button className="detail-action" onClick={fulfill}><Check size={16} /><span><strong>Mark as fulfilled</strong><small>Close this emergency request</small></span><ArrowRight size={15} /></button>}{request.status === 'Fulfilled' && <div className="detail-action"><CheckCircle2 size={16} /><span><strong>Blood Request Fulfilled</strong><small>This status is persisted in the backend.</small></span></div>}{canFulfill && request.status !== 'Fulfilled' && <button className="detail-action danger" disabled><XCircle size={16} /><span><strong>Cancel request</strong><small>Available outside this demo workflow</small></span><ArrowRight size={15} /></button>}</section></aside>
    </div>{toast && <Toast onClose={() => setToast('')}>{toast}</Toast>}
  </AppShell>
}
