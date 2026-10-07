import { Activity, ArrowRight, CalendarClock, ChevronDown, Clock3, MoreHorizontal, Plus, Radio, Users, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { AppShell, BloodBadge, EmergencyCard, PageIntro, SectionHeading, StatCard, StatusBadge } from '../components/Shared'
import { requestApi } from '../api/requests'
import { toRequestView } from '../data/requestView'
import AuthFeedback from '../components/AuthFeedback'
import { useAuth } from '../auth/AuthContext'

export default function HospitalDashboard() {
  const { currentUser } = useAuth()
  const [requests, setRequests] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadRequests = async () => {
    setError(null)
    try {
      const records = await requestApi.list()
      setRequests(records.map(toRequestView))
    } catch (failure) {
      setError(failure)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRequests() }, [])

  const ownRequests = useMemo(() => requests.filter((request) => request.hospitalId === currentUser?.hospitalId), [requests, currentUser?.hospitalId])
  const activeRequests = ownRequests.filter((request) => ['Active', 'Matching'].includes(request.status))
  const criticalRequests = activeRequests.filter((request) => request.urgency === 'Critical')
  const fulfilledRequests = ownRequests.filter((request) => request.status === 'Fulfilled')
  const matchingDonors = ownRequests.reduce((total, request) => total + request.matchedDonors, 0)

  return <AppShell title="Hospital workspace" subtitle={`${currentUser?.name || 'Hospital'} · Emergency coordination`}>
    <PageIntro eyebrow="Hospital workspace" title="Your emergency overview" description="Stay on top of active requests and keep your team aligned.">
      <Link className="button button-primary" to="/hospital/requests/new"><Plus size={17} /> Create emergency request</Link>
    </PageIntro>
    <AuthFeedback error={error} />
    <div className="stat-grid four-stats">
      <StatCard label="Total active requests" value={String(activeRequests.length).padStart(2, '0')} detail="From your hospital" icon={Radio} tone="teal" />
      <StatCard label="Critical requests" value={String(criticalRequests.length).padStart(2, '0')} detail="Need immediate response" icon={Zap} tone="coral" />
      <StatCard label="Fulfilled requests" value={String(fulfilledRequests.length).padStart(2, '0')} detail="Persisted in the backend" icon={Activity} tone="blue" />
      <StatCard label="Matching donors" value={String(matchingDonors).padStart(2, '0')} detail="Across your requests" icon={Users} tone="purple" />
    </div>
    <div className="dashboard-grid main-dashboard-grid">
      <section className="content-panel requests-panel">
        <SectionHeading eyebrow="Live requests" title="Your emergency requests" action={<Link className="panel-link" to="/board">View board <ArrowRight size={14} /></Link>} />
        {loading && <p className="auth-loading-copy">Loading requests…</p>}
        {!loading && !activeRequests.length && <div className="empty-state"><h4>No active requests yet</h4><p>Create an emergency request to start the response workflow.</p></div>}
        {!loading && <div className="request-table">
          <div className="table-head"><span>Request</span><span>Need</span><span>Urgency</span><span>Time remaining</span><span>Donors</span><span /></div>
          {activeRequests.map((request) => <div className="table-row" key={request.id}>
            <div className="request-cell"><BloodBadge group={request.bloodGroup} /><span><strong>#{request.id}</strong><small>{request.hospital}</small></span></div>
            <div className="units-cell"><strong>{request.units}</strong><span>{request.units === 1 ? 'unit' : 'units'}</span></div>
            <div><StatusBadge variant={request.urgency.toLowerCase()}>{request.urgency}</StatusBadge></div>
            <div className={`time-cell ${request.urgency === 'Critical' ? 'critical-text' : ''}`}><Clock3 size={14} />{request.timeRemaining}</div>
            <div className="donor-count"><Users size={14} />{request.matchedDonors}</div>
            <Link to={`/requests/${request.id}`} className="more-button" aria-label={`Open ${request.id}`}><MoreHorizontal size={18} /></Link>
          </div>)}
        </div>}
        {!loading && <div className="mobile-request-list">{activeRequests.map((request) => <div key={request.id}><EmergencyCard request={request} compact /><Link to={`/requests/${request.id}`} className="mobile-row-link">Open request <ArrowRight size={14} /></Link></div>)}</div>}
      </section>
      <aside className="content-panel side-panel">
        <SectionHeading eyebrow="Network pulse" title="Response activity" />
        <div className="activity-chart"><div className="chart-header"><span>Matched donors this week</span><strong>{matchingDonors}</strong></div><div className="fake-chart"><div className="chart-y"><span>40</span><span>30</span><span>20</span><span>10</span><span>0</span></div><div className="chart-plot"><span className="gridline g1" /><span className="gridline g2" /><span className="gridline g3" /><span className="gridline g4" /><svg viewBox="0 0 310 120" preserveAspectRatio="none"><path d="M0,91 C18,87 22,76 38,80 S58,88 73,69 S96,78 110,59 S135,62 149,44 S170,67 185,49 S207,45 222,34 S242,53 257,27 S280,39 310,13" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M0,91 C18,87 22,76 38,80 S58,88 73,69 S96,78 110,59 S135,62 149,44 S170,67 185,49 S207,45 222,34 S242,53 257,27 S280,39 310,13 V120 H0Z" fill="url(#chartFill)" opacity=".15" /><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#21a995" /><stop offset="100%" stopColor="#21a995" stopOpacity="0" /></linearGradient></defs></svg><div className="chart-x"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div></div></div>
        <div className="activity-summary"><span><i className="dot teal-dot" /> Responded <strong>{matchingDonors}</strong></span><span><i className="dot coral-dot" /> Pending <strong>{activeRequests.length}</strong></span></div>
        <div className="side-divider" /><div className="next-action"><span className="next-action-icon"><CalendarClock size={18} /></span><div><strong>Next recommended action</strong><p>{activeRequests.length ? 'Review matching donors for your most recent request.' : 'Create an emergency request when your team needs support.'}</p>{activeRequests[0] && <Link to={`/matching/${activeRequests[0].id}`}>Review matches <ArrowRight size={14} /></Link>}</div></div>
      </aside>
    </div>
    <section className="content-panel recent-panel"><SectionHeading eyebrow="Recently fulfilled" title="A little good news" action={<button className="filter-select">This month <ChevronDown size={14} /></button>} /><div className="fulfilled-list">{fulfilledRequests.length ? fulfilledRequests.slice(0, 3).map((request) => <div key={request.id}><span className="fulfilled-icon"><Activity size={16} /></span><span><strong>{request.units} {request.units === 1 ? 'unit' : 'units'} of {request.bloodGroup} fulfilled</strong><small>{request.hospital} · {request.created}</small></span><StatusBadge variant="fulfilled">Fulfilled</StatusBadge></div>) : <p className="auth-loading-copy">Fulfilled requests will appear here.</p>}</div></section>
  </AppShell>
}
