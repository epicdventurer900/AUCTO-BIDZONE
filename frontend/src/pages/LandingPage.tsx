import { Link } from 'react-router-dom'

const upcomingAuctions = [
  { title: 'Neon Relics', type: 'Collectibles', price: '₹12,500', time: 'Today · 20:30', color: 'violet' },
  { title: 'Velocity Garage', type: 'Automotive', price: '₹4,80,000', time: 'Tomorrow · 18:00', color: 'blue' },
  { title: 'Studio Eight', type: 'Design objects', price: '₹38,000', time: 'Fri · 21:15', color: 'green' },
]

export default function LandingPage() {
  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <Link to="/" className="brand-mark" aria-label="Aucto Bidzone home">
          <span className="brand-glyph">◈</span>
          <span>AUCTO<span>-BIDZONE</span></span>
        </Link>
        <div className="landing-links">
          <a href="#live">Live Auctions</a>
          <a href="#rooms">Rooms</a>
          <a href="#results">Results</a>
        </div>
        <div className="nav-actions">
          <button className="icon-button" aria-label="Search">⌕</button>
          <button className="icon-button" aria-label="Notifications">◌</button>
          <Link to="/login" className="nav-login">Login</Link>
          <Link to="/register" className="nav-cta">Create account</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="hero-copy">
          <div className="landing-kicker"><span /> LIVE INTELLIGENCE FOR MODERN AUCTIONS</div>
          <h1>The next generation of <em>live auctions.</em></h1>
          <p>Bid. Compete. Win. Experience auctions in real time with a faster, more immersive way to discover what is next.</p>
          <div className="hero-actions">
            <Link to="/login" className="hero-primary">Enter auction <span>↗</span></Link>
            <a href="#rooms" className="hero-secondary">Explore rooms <span>↓</span></a>
          </div>
          <div className="hero-proof">
            <div className="avatar-stack"><i>R</i><i>K</i><i>M</i><i>+</i></div>
            <span><strong>2,480+</strong> bidders active this week</span>
          </div>
        </div>

        <div className="auction-orbit" aria-label="Live auction preview">
          <div className="orbit-ring ring-one" />
          <div className="orbit-ring ring-two" />
          <div className="orbit-grid" />
          <div className="holo-card holo-top"><span>LIVE NOW</span><strong>42 bidders</strong><small>connected</small></div>
          <div className="holo-card holo-side"><span>TIME LEFT</span><strong>00:28</strong><small>Lot #024</small></div>
          <div className="auction-podium">
            <div className="podium-glow" />
            <div className="floating-object">◈</div>
            <div className="podium-top"><span>LOT 024</span><strong>€18,420</strong></div>
            <div className="podium-base" />
          </div>
          <div className="bid-ticker"><span>HIGHEST BID</span><strong>₹ 1,24,500</strong><b>+12.4%</b></div>
        </div>
      </section>

      <section className="landing-section live-section" id="live">
        <div className="section-title-row">
          <div><span className="landing-kicker"><span /> LIVE FEED</span><h2>Happening right now</h2></div>
          <a href="#rooms">View all auctions →</a>
        </div>
        <div className="live-card">
          <div className="live-art"><div className="art-orb">◈</div><span>LOT 024</span></div>
          <div className="live-info"><span className="card-eyebrow">CURATED COLLECTIBLES · LIVE</span><h3>The Midnight Collection</h3><p>Contemporary objects, rare finds and pieces with a story.</p><div className="live-stats"><span><small>CURRENT BID</small><strong>₹ 1,24,500</strong></span><span><small>TIME LEFT</small><strong className="cyan">00:28</strong></span><span><small>BIDDERS</small><strong>42</strong></span></div></div>
          <Link to="/login" className="join-button">Join live <span>↗</span></Link>
        </div>
      </section>

      <section className="landing-section" id="rooms">
        <div className="section-title-row"><div><span className="landing-kicker"><span /> NEXT UP</span><h2>Find your next obsession</h2></div><span className="section-note">03 curated rooms</span></div>
        <div className="auction-cards">{upcomingAuctions.map((auction) => <article className={`auction-card ${auction.color}`} key={auction.title}><div className="card-visual"><span>03D / {auction.type.toUpperCase()}</span><div className="visual-shape" /></div><div className="card-content"><span className="card-eyebrow">{auction.time}</span><h3>{auction.title}</h3><div><span>Starting at <strong>{auction.price}</strong></span><Link to="/login">View auction →</Link></div></div></article>)}</div>
      </section>

      <section className="landing-stats" id="results">
        <div><strong>24</strong><span>Live auctions</span></div><div><strong>8.4k</strong><span>Active bidders</span></div><div><strong>12.6k</strong><span>Items auctioned</span></div><div><strong>94k</strong><span>Total bids placed</span></div>
      </section>

      <footer className="landing-footer"><span>© 2026 AUCTO-BIDZONE</span><span>THE FUTURE IS UP FOR BID.</span><Link to="/login">Enter platform ↗</Link></footer>
    </main>
  )
}
