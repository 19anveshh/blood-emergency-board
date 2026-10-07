import { ArrowLeft, ArrowRight, HeartPulse, MapPin, MessageCircle, Phone, Search, ShieldCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { AppShell, Avatar, BloodBadge, Button, PageIntro, StatusBadge, Toast } from '../components/Shared'
import AuthFeedback from '../components/AuthFeedback'
import { requestApi } from '../api/requests'
import { toDonorView, toRequestView } from '../data/requestView'
import { useAuth } from '../auth/AuthContext'

export default function MatchingPage() {
  const { requestId } = useParams()
  const { currentUser } = useAuth()
  const [request, setRequest] = useState(null)
  const [matches, setMatches] = useState([])
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)

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

  const visibleMatches = useMemo(() => matches.filter((donor) => `${donor.name} ${donor.bloodGroup}`.toLowerCase().includes(query.toLowerCase())), [matches, query])
  const accept = async () => {
    if (!currentUser?.donorId || accepting) return
    setAccepting(true)
    setError(null)
    try {
      await requestApi.accept(request.id, currentUser.donorId)
      setToast('Request Accepted')
      await load()
    } catch (failure) {
      setError(failure)
    } finally {
      setAccepting(false)
    }
  }

  if (loading) return <AppShell title="Find the right match" subtitle="Matching donors"><div className="auth-loading-copy">Loading matching information…</div></AppShell>
  if (!request) return <AppShell title="Find the right match" subtitle="Matching donors"><AuthFeedback error={error || 'Request not found.'} /><Link className="back-link back-link-dark" to="/board"><ArrowLeft size={15} /> Back to board</Link></AppShell>

  return <AppShell title="Find the right match" subtitle={`Request #${request.id} · Matching donors`}><div className="form-page-top"><Link className="back-link back-link-dark" to={`/requests/${request.id}`}><ArrowLeft size={15} /> Back to request</Link></div><AuthFeedback error={error} />
    <PageIntro eyebrow="Donor matching" title="Compatible donors nearby" description={`Ranked matches for ${request.bloodGroup} blood at ${request.hospital}.`}><div className="match-summary"><BloodBadge group={request.bloodGroup} size="md" /><span><strong>{request.units} units needed</strong><small><MapPin size={13} /> Within 15 km</small></span></div></PageIntro>
    <div className="match-toolbar"><div><strong>{matches.length} potential matches</strong><span>Ranked by the backend compatibility algorithm</span></div><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search donors" /></label><button className="match-filter"><ShieldCheck size={15} /> Verified only</button></div>
    <div className="matching-layout"><section className="content-panel donor-matching-panel"><div className="match-panel-head"><span>Rank</span><span>Donor</span><span>Compatibility</span><span>Last donation</span><span>Response</span><span /></div>{visibleMatches.map((donor, index) => {
      const isCurrentDonor = currentUser?.role === 'DONOR' && currentUser.donorId === donor.id
      const accepted = donor.response === 'Accepted'
      return <div className={`matching-row ${index === 0 ? 'top-match' : ''}`} key={donor.id}><div className="rank-badge">{index === 0 ? <span>★</span> : String(index + 1).padStart(2, '0')}</div><div className="matching-donor"><Avatar initials={donor.initials} tone={donor.tone === 'blue' ? 'blue' : donor.tone === 'gray' ? 'gray' : 'teal'} /><span><strong>{donor.name}</strong><small><BloodBadge group={donor.bloodGroup.replace(/-/g, '−')} size="xs" /> <MapPin size={12} /> {donor.distance} away</small></span></div><div className="match-score"><strong>{donor.match}%</strong><span className="score-track"><i style={{ width: `${donor.match}%` }} /></span></div><div className="last-donation">{donor.lastDonation}<small>Eligible now</small></div><div><StatusBadge variant={accepted ? 'accepted' : donor.availability === 'Unavailable' ? 'offline' : 'available'}>{accepted ? 'Accepted' : donor.availability}</StatusBadge></div>{isCurrentDonor ? <Button variant={accepted ? 'outline' : 'primary'} size="sm" icon={accepted ? MessageCircle : HeartPulse} onClick={accepted ? undefined : accept} disabled={accepted || accepting}>{accepted ? 'Request Accepted' : accepting ? 'Accepting…' : 'Accept request'}</Button> : <Button variant="outline" size="sm" icon={accepted ? MessageCircle : Phone} onClick={() => setToast('Demo contact action ready')}>{accepted ? 'Message' : 'Contact'}</Button>}</div>
    })}{!visibleMatches.length && <p className="auth-loading-copy">No compatible donors are currently available.</p>}</section>
      <aside className="match-side-card"><div className="match-side-top"><span className="side-blood"><BloodBadge group={request.bloodGroup} size="lg" /></span><div><span className="eyebrow">Current request</span><strong>#{request.id}</strong></div></div><h3>{request.hospital}</h3><p><MapPin size={14} /> {request.location}</p><div className="match-side-stats"><span><strong>{request.units}</strong> units</span><span><strong>{matches.length}</strong> matched</span><span><strong>{request.status}</strong> status</span></div><Link className="button button-outline full-button" to={`/requests/${request.id}`}>View full request <ArrowRight size={15} /></Link></aside>
    </div>{toast && <Toast onClose={() => setToast('')}>{toast}</Toast>}</AppShell>
}
