import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  ClipboardPlus,
  Clock3,
  Droplets,
  ExternalLink,
  FileHeart,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MoreHorizontal,
  Navigation,
  Plus,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  UserCheck,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

export function Logo({ light = false }) {
  return (
    <Link className={`brand ${light ? 'brand-light' : ''}`} to="/">
      <span className="brand-mark"><Droplets size={21} fill="currentColor" strokeWidth={2.6} /></span>
      <span className="brand-name">Blood<span>Board</span></span>
    </Link>
  )
}

export function Button({ children, variant = 'primary', size = 'md', icon: Icon, className = '', type = 'button', ...props }) {
  return (
    <button className={`button button-${variant} button-${size} ${className}`} type={type} {...props}>
      {Icon && <Icon size={size === 'sm' ? 15 : 17} strokeWidth={2.2} />}
      <span>{children}</span>
    </button>
  )
}

export function StatusBadge({ children, variant = 'active', dot = true }) {
  return <span className={`status-badge status-${variant}`}>{dot && <span className="status-dot" />}{children}</span>
}

export function BloodBadge({ group, size = 'md' }) {
  return <span className={`blood-badge blood-${size}`}>{group}</span>
}

export function Avatar({ initials, tone = 'teal', size = 'md' }) {
  return <span className={`avatar avatar-${tone} avatar-${size}`}>{initials}</span>
}

export function PublicNav() {
  const [open, setOpen] = useState(false)
  return (
    <header className="public-nav">
      <div className="container nav-inner">
        <Logo />
        <nav className={`public-links ${open ? 'is-open' : ''}`}>
          <a href="/#how-it-works" onClick={() => setOpen(false)}>How it works</a>
          <Link to="/board" onClick={() => setOpen(false)}>Emergency board</Link>
          <a href="/#about" onClick={() => setOpen(false)}>About us</a>
        </nav>
        <div className="nav-actions">
          <Link className="nav-login" to="/login">Log in</Link>
          <Link className="button button-primary button-sm nav-cta" to="/register">Join the network <ArrowRight size={15} /></Link>
        </div>
        <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  )
}

const sidebarItems = [
  { label: 'Overview', to: '/hospital', icon: LayoutDashboard, match: ['/hospital'] },
  { label: 'Emergency board', to: '/board', icon: Radio, match: ['/board'] },
  { label: 'My requests', to: '/hospital', icon: ClipboardPlus, match: ['/hospital'] },
]

export function AppShell({ children, role = 'hospital', title = 'Workspace', subtitle = 'Tuesday, 20 February 2024', noPadding = false }) {
  const location = useLocation()
  const { currentUser, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const accountRole = currentUser?.role.toLowerCase() || role
  const isDonor = accountRole === 'donor'
  const isAdmin = accountRole === 'admin'
  const initials = currentUser?.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || (isAdmin ? 'AD' : isDonor ? 'AK' : 'MD')

  const items = isAdmin
    ? [
        { label: 'Overview', to: '/admin', icon: LayoutDashboard },
        { label: 'Emergency requests', to: '/board', icon: Radio },
        { label: 'Hospitals', to: '/admin', icon: Building2 },
        { label: 'Donor network', to: '/admin', icon: Users },
      ]
    : isDonor
      ? [
          { label: 'My dashboard', to: '/donor', icon: LayoutDashboard },
          { label: 'Emergency board', to: '/board', icon: Radio },
          { label: 'Donation history', to: '/donor', icon: FileHeart },
        ]
      : sidebarItems

  const isActive = (item) => item.to === '/hospital' ? location.pathname === '/hospital' : location.pathname.startsWith(item.to)

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-top">
          <Logo light />
          <button className="collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">
            <ChevronRight size={17} />
          </button>
        </div>
        <div className="workspace-switcher">
          <Avatar initials={initials} tone={isAdmin ? 'purple' : isDonor ? 'coral' : 'teal'} size="sm" />
          <span className="workspace-copy"><strong>{isAdmin ? 'Admin console' : isDonor ? 'Donor workspace' : currentUser?.name || 'CityCare Medical'}</strong><small>{isAdmin ? 'Platform overview' : isDonor ? 'Personal account' : 'Hospital account'}</small></span>
          <ChevronRight size={15} className="workspace-chevron" />
        </div>
        <div className="sidebar-content">
          <p className="sidebar-label">Workspace</p>
          <nav className="sidebar-nav">
            {items.map((item) => {
              const Icon = item.icon
              return <NavLink key={item.label} to={item.to} className={() => `sidebar-link ${isActive(item) ? 'active' : ''}`} onClick={() => setMobileOpen(false)}><Icon size={18} /><span>{item.label}</span>{item.label === 'Emergency board' && <span className="nav-notification">6</span>}</NavLink>
            })}
          </nav>
          <p className="sidebar-label sidebar-label-spaced">Manage</p>
          <nav className="sidebar-nav">
            <NavLink to={isDonor ? '/donor' : '/hospital'} className="sidebar-link"><UserRound size={18} /><span>Profile & settings</span></NavLink>
            <NavLink to="/board" className="sidebar-link"><CircleHelp size={18} /><span>Help center</span></NavLink>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-trust"><ShieldCheck size={17} /><span><strong>Private & secure</strong><small>Your data is protected</small></span></div>
          <Link to="/login" replace onClick={logout} className="sidebar-link logout"><LogOut size={18} /><span>Sign out</span></Link>
        </div>
      </aside>
      {mobileOpen && <button className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
      <main className="app-main">
        <header className="app-header">
          <button className="mobile-menu app-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
          <div className="app-heading"><p className="eyebrow">{subtitle}</p><h1>{title}</h1></div>
          <div className="app-header-actions">
            <button className="icon-button has-alert" aria-label="Notifications"><Bell size={19} /></button>
            <span className="header-divider" />
            <div className="header-profile"><Avatar initials={initials} tone={isAdmin ? 'purple' : isDonor ? 'coral' : 'teal'} size="sm" /><span><strong>{currentUser?.name || (isAdmin ? 'Aarav D.' : isDonor ? 'Ananya Kapoor' : 'Maya Deshmukh')}</strong><small>{isAdmin ? 'Administrator' : isDonor ? 'Donor' : 'Coordinator'}</small></span></div>
          </div>
        </header>
        <div className={`page-content ${noPadding ? 'no-padding' : ''}`}>{children}</div>
      </main>
    </div>
  )
}

export function PageIntro({ eyebrow, title, description, children }) {
  return <div className="page-intro"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{description && <p className="intro-description">{description}</p>}</div>{children && <div className="page-intro-actions">{children}</div>}</div>
}

export function StatCard({ label, value, detail, icon: Icon, tone = 'teal', trend }) {
  return <div className={`stat-card stat-${tone}`}><div className="stat-card-top"><span className="stat-icon"><Icon size={19} /></span>{trend && <span className="stat-trend"><TrendingUp size={13} /> {trend}</span>}</div><strong className="stat-value">{value}</strong><span className="stat-label">{label}</span>{detail && <span className="stat-detail">{detail}</span>}</div>
}

export function EmergencyCard({ request, compact = false }) {
  const urgency = request.urgency.toLowerCase()
  return <article className={`emergency-card emergency-${urgency} ${compact ? 'emergency-compact' : ''}`}>
    <div className="emergency-card-head"><div className="emergency-card-ident"><BloodBadge group={request.bloodGroup} size="lg" /><div><span className="request-id">#{request.id}</span><strong>{request.hospital}</strong></div></div><div className="emergency-card-status"><span className={`request-urgency urgency-${urgency}`}>{request.urgency}</span><StatusBadge variant={request.status === 'Fulfilled' ? 'fulfilled' : urgency}>{request.status}</StatusBadge></div></div>
    <div className="emergency-card-info"><div><span className="info-label">Units needed</span><strong>{request.units} <small>{request.units === 1 ? 'unit' : 'units'}</small></strong></div><div><span className="info-label">Location</span><strong><MapPin size={14} />{request.distance}</strong></div><div><span className="info-label">Time remaining</span><strong className={request.status === 'Fulfilled' ? 'muted' : urgency === 'critical' ? 'critical-text' : ''}><Clock3 size={14} />{request.timeRemaining}</strong></div></div>
    {!compact && <div className="emergency-card-footer"><span className="match-count"><Users size={15} /> {request.matchedDonors} matching donors</span><Link className="text-link" to={`/requests/${request.id}`}>View request <ArrowRight size={15} /></Link></div>}
  </article>
}

export function SectionHeading({ eyebrow, title, action, children }) {
  return <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3></div>{action}{children}</div>
}

export function DonorRow({ donor, action = true }) {
  const avatarTone = donor.tone === 'gray' ? 'gray' : donor.tone === 'blue' ? 'blue' : 'teal'
  return <div className="donor-row"><Avatar initials={donor.initials} tone={avatarTone} /><div className="donor-main"><strong>{donor.name}</strong><span>{donor.bloodGroup} <i /> {donor.distance} away</span></div><div className="donor-match"><strong>{donor.match}%</strong><span>match</span></div><StatusBadge variant={donor.availability === 'Available' ? 'available' : 'offline'}>{donor.availability}</StatusBadge>{action && <Button variant="outline" size="sm">View</Button>}</div>
}

export function Field({ label, children, hint, className = '' }) {
  return <label className={`form-field ${className}`}><span>{label}</span>{children}{hint && <small className="field-hint">{hint}</small>}</label>
}

export function EmptyState({ icon: Icon = ClipboardCheck, title, description }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={24} /></span><h4>{title}</h4><p>{description}</p></div>
}

export function FilterBar({ search = true, children }) {
  return <div className="filter-bar">{search && <label className="search-box"><Search size={17} /><input placeholder="Search requests..." /></label>}{children}<Button variant="outline" size="sm" icon={SlidersHorizontal}>Filters</Button></div>
}

export function Timeline({ items }) {
  return <div className="timeline">{items.map(([time, text], index) => <div className="timeline-item" key={`${time}-${text}`}><span className={`timeline-marker ${index === items.length - 1 ? 'current' : ''}`}>{index === items.length - 1 ? <Activity size={12} /> : <Check size={12} />}</span><div><strong>{text}</strong><span>{time}</span></div></div>)}</div>
}

export function Toast({ children, onClose }) {
  return <div className="toast"><CheckCircle2 size={18} /><span>{children}</span><button onClick={onClose}><X size={15} /></button></div>
}

export { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, Clock3, ExternalLink, FileHeart, HeartPulse, MapPin, Navigation, Plus, Search, UserCheck, Users, Zap }
