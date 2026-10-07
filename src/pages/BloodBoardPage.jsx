import { ArrowLeft, ArrowRight, Clock3, HeartPulse, Radio, Search, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { EmergencyCard, PublicNav } from '../components/Shared'
import AuthFeedback from '../components/AuthFeedback'
import { requestApi } from '../api/requests'
import { toRequestView } from '../data/requestView'

export default function BloodBoardPage() {
  const [requests, setRequests] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All requests')
  const [group, setGroup] = useState('All groups')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    requestApi.list().then((records) => setRequests(records.map(toRequestView))).catch(setError).finally(() => setLoading(false))
  }, [])

  const openRequests = requests.filter((request) => ['Active', 'Matching'].includes(request.status))
  const filtered = useMemo(() => requests.filter((request) => request.status !== 'Cancelled'
    && (filter === 'All requests' || request.urgency === filter)
    && (group === 'All groups' || request.bloodGroup === group)
    && `${request.hospital} ${request.location} ${request.bloodGroup}`.toLowerCase().includes(query.toLowerCase())), [requests, query, filter, group])

  return <div className="public-page board-page"><PublicNav /><main>
    <div className="board-hero"><div className="container board-hero-inner"><div><Link className="back-link" to="/"><ArrowLeft size={15} /> Back to home</Link><div className="board-title-row"><span className="board-live-icon"><Radio size={22} /></span><div><p className="eyebrow">Public emergency network <span className="live-inline"><span /> Live now</span></p><h1>Emergency blood board</h1></div></div><p className="board-lead">A live view of blood requests from verified hospitals across Bengaluru. Every request is a chance to make a difference.</p></div><div className="board-side-stat"><strong>{openRequests.length}</strong><span>active requests</span><small><span className="pulse-dot" /> Updated just now</small></div></div></div>
    <div className="container board-content"><AuthFeedback error={error} />
      <div className="board-toolbar"><div className="board-toolbar-tabs"><button className={filter === 'All requests' ? 'active' : ''} onClick={() => setFilter('All requests')}>All requests <span>{openRequests.length}</span></button><button className={filter === 'Critical' ? 'active' : ''} onClick={() => setFilter('Critical')}>Critical <span className="critical-count">{openRequests.filter((request) => request.urgency === 'Critical').length}</span></button><button className={filter === 'Urgent' ? 'active' : ''} onClick={() => setFilter('Urgent')}>Urgent <span>{openRequests.filter((request) => request.urgency === 'Urgent').length}</span></button></div><div className="board-toolbar-tools"><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by hospital or area" /></label><select value={group} onChange={(event) => setGroup(event.target.value)}><option>All groups</option><option value="O−">O−</option><option value="O+">O+</option><option value="A+">A+</option><option value="A−">A−</option><option value="B+">B+</option><option value="B−">B−</option><option value="AB+">AB+</option><option value="AB−">AB−</option></select><button className="icon-button" aria-label="More board filters"><SlidersHorizontal size={17} /></button></div></div>
      <div className="board-notice"><span className="notice-icon"><HeartPulse size={17} /></span><p><strong>Are you a compatible donor?</strong> Create a free donor profile to get notified about requests near you.</p><Link to="/register">Join the network <ArrowRight size={15} /></Link></div>
      <div className="board-results-heading"><div><h2>{loading ? 'Loading requests…' : `${filtered.length} ${filtered.length === 1 ? 'request' : 'requests'}`}</h2><span>Live requests from the backend</span></div><span className="board-updated"><Clock3 size={14} /> Last updated just now</span></div>
      <div className="public-board-grid">{filtered.length ? filtered.map((request) => <EmergencyCard key={request.id} request={request} />) : !loading && <div className="board-empty"><span><Search size={22} /></span><h3>No requests found</h3><p>Try a different search or filter.</p></div>}</div>
    </div>
  </main><footer className="minimal-footer"><div className="container"><Link className="brand mini-brand" to="/"><span className="brand-mark"><HeartPulse size={16} /></span><span className="brand-name">Blood<span>Board</span></span></Link><span>For verified hospitals and willing donors · <Link to="/register">Join the network</Link></span></div></footer></div>
}
