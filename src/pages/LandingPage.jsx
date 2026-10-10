import { ArrowRight, CheckCircle2, Clock3, HeartPulse, MapPin, Radio, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BloodBadge, Button, EmergencyCard, Logo, PublicNav } from '../components/Shared'
import { emergencyRequests } from '../data/mockData'

export default function LandingPage() {
  return <div className="marketing-page">
    <PublicNav />
    <main>
      <section className="hero-section">
        <div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="hero-kicker"><span className="pulse-dot" /> <span>Live emergency network</span><span className="kicker-line" /><span className="kicker-location"><MapPin size={13} /> Bengaluru</span></div>
            <h1>When every minute <em>matters,</em> we connect you.</h1>
            <p className="hero-description">Blood Emergency Board brings hospitals and willing donors together in real time — so the right blood reaches the right patient, faster.</p>
            <div className="hero-actions"><Link className="button button-primary button-lg" to="/board">Find blood <ArrowRight size={17} /></Link></div>
            <div className="hero-trust"><div className="trust-avatars"><span>AM</span><span>ST</span><span>RK</span><span>+2k</span></div><div><div className="trust-stars">★★★★★ <span>4.9/5</span></div><p>Trusted by our donor community</p></div></div>
          </div>
          <div className="hero-visual">
            <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
            <div className="hero-map-card"><div className="map-topline"><span><span className="live-signal" /> Live requests nearby</span><span>Updated just now</span></div><div className="map-area"><div className="map-grid-lines" /><div className="map-road road-a" /><div className="map-road road-b" /><div className="map-road road-c" /><div className="map-road road-d" /><span className="map-label label-one">Koramangala</span><span className="map-label label-two">Indiranagar</span><span className="map-label label-three">Vasanth Nagar</span><span className="map-pin pin-main"><Radio size={16} /></span><span className="map-pin pin-two"><span>O−</span></span><span className="map-pin pin-three"><span>A+</span></span><span className="map-pin pin-four"><span>B+</span></span><div className="map-center"><span className="center-pulse" /><span className="center-dot" /></div></div><div className="map-card-footer"><div><strong>6 active requests</strong><span>Within 15 km of you</span></div><Link to="/board">Open board <ArrowRight size={14} /></Link></div></div>
            <div className="floating-alert floating-alert-top"><span className="alert-icon"><Zap size={16} fill="currentColor" /></span><span><strong>Critical need</strong><small>O− · 2.4 km away</small></span><span className="alert-time">1h 42m</span></div>
            <div className="floating-alert floating-alert-bottom"><span className="mini-check"><CheckCircle2 size={16} /></span><span><strong>Donor matched</strong><small>Arjun is on the way</small></span><span className="mini-arrow"><ArrowRight size={15} /></span></div>
          </div>
        </div>
      </section>
      <section className="stats-strip"><div className="container stats-grid"><div><strong>2,480<span>+</span></strong><span>Registered donors</span></div><div><strong>86<span>%</span></strong><span>Requests matched</span></div><div><strong>14<span> min</span></strong><span>Average response time</span></div><div><strong>32<span>+</span></strong><span>Partner hospitals</span></div></div></section>
      <section className="mission-section section-padding" id="about"><div className="container mission-grid"><div className="mission-heading"><p className="eyebrow">A better way to respond</p><h2>Built around the moments that <em>matter most.</em></h2></div><div className="mission-copy"><p>In an emergency, finding blood should not depend on phone calls, spreadsheets, or luck. BloodBoard gives hospitals a clear view of their need and donors a meaningful way to help.</p><div className="mission-points"><span><CheckCircle2 size={17} /> Live, location-based matching</span><span><CheckCircle2 size={17} /> Clear status from request to recovery</span></div></div></div></section>
      <section className="how-section section-padding" id="how-it-works"><div className="container"><div className="center-heading"><p className="eyebrow">Simple by design</p><h2>Help can move at the speed of a notification.</h2><p>One shared board gives everyone a clear next step.</p></div><div className="steps-grid"><div className="step-card"><span className="step-number">01</span><span className="step-icon"><Radio size={21} /></span><h3>Hospitals raise a request</h3><p>Post the blood group, units, location and urgency in under a minute.</p><span className="step-line" /></div><div className="step-card"><span className="step-number">02</span><span className="step-icon"><Users size={21} /></span><h3>Donors see the need</h3><p>Nearby, compatible donors get a clear alert and all the details they need.</p><span className="step-line" /></div><div className="step-card"><span className="step-number">03</span><span className="step-icon"><HeartPulse size={21} /></span><h3>Lives move forward</h3><p>Track responses and keep everyone aligned until the request is fulfilled.</p></div></div></div></section>
      <section className="board-preview section-padding"><div className="container"><div className="preview-heading"><div><p className="eyebrow">The emergency board</p><h2>See where help is needed.</h2></div><Link className="text-link text-link-dark" to="/board">View all requests <ArrowRight size={15} /></Link></div><div className="preview-grid">{emergencyRequests.slice(0, 3).map((request) => <EmergencyCard key={request.id} request={request} />)}</div></div></section>
      <section className="cta-section"><div className="container cta-inner"><div className="cta-icon"><DropletsIcon /></div><div><p className="eyebrow">Your next action could change a life</p><h2>Ready to make an impact?</h2><p>Whether you need blood today or want to be there for someone else, you belong here.</p></div><Link className="button button-light button-lg" to="/register">Join BloodBoard <ArrowRight size={17} /></Link></div></section>
    </main>
     <footer className="public-footer"><div className="container footer-top"><div><Logo /><p>A faster, clearer way to respond to blood emergencies.</p></div><div className="footer-links"><div><strong>Platform</strong><Link to="/board">Emergency board</Link><Link to="/login">Hospital login</Link></div><div><strong>Company</strong><a href="/#about">About us</a><a href="/#how-it-works">How it works</a><a href="/#support">Help center</a></div></div></div><div className="container footer-bottom"><span>© 2024 BloodBoard. Built for better response.</span><span><ShieldCheck size={14} /> Your privacy matters</span></div></footer>
  </div>
}

function DropletsIcon() {
  return <span className="cta-droplets"><span /><span /><span /></span>
}
