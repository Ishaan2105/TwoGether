import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ScrollCanvasAnimation from '../components/common/ScrollCanvasAnimation.jsx';

const MOTIVATIONAL_QUOTES = [
  {
    quote: 'If you want to go fast, go alone. If you want to go far, go together.',
    author: 'African Proverb · The Duo Principle',
    tag: '🔥 DUO PHILOSOPHY',
  },
  {
    quote: 'When one of you slips, the entire Duo feels it. No more quietly skipping days or giving up.',
    author: 'TwoGether Core · Shared Stakes',
    tag: '🤝 1-ON-1 ACCOUNTABILITY',
  },
  {
    quote: 'Different daily habits, shared team victory. TwoGether fuses your routines into Shared Focus Shells.',
    author: 'TwoGether Engine · Shared Victory',
    tag: '🧩 SMART SYNERGY SHELLS',
  },
  {
    quote: 'Two are better than one, because they have a good reward for their labor.',
    author: 'Ecclesiastes 4:9 · Unbreakable Bond',
    tag: '🤝 MUTUAL STAKES',
  },
  {
    quote: 'We don’t rise to the level of our goals, we fall to the level of our systems.',
    author: 'James Clear · Powered by Duo Synergy',
    tag: '⚡ UNBREAKABLE MOMENTUM',
  },
  {
    quote: 'When two people commit to the same standard, slacking is no longer an option.',
    author: 'TwoGether Philosophy · Shared Accountability',
    tag: '🎯 UNCOMPROMISING STANDARDS',
  },
  {
    quote: 'Alone we can do so little; together we can do so much.',
    author: 'Helen Keller · TwoGether Synergy',
    tag: '✨ EXPONENTIAL SYNERGY',
  },
];

const DUO_PILLARS = [
  {
    id: 'accountability',
    badge: '🤝 1-ON-1 ACCOUNTABILITY',
    badgeClass: 'badge--primary',
    category: 'architecture',
    title: 'Two People. One Unbreakable Bond.',
    desc: 'When one of you slips, the entire Duo feels it. No more quietly skipping days or giving up when nobody is watching. Shared commitment and mutual stakes keep you both showing up every single day.',
    chips: ['Direct Partner Pairing', 'Real-Time Nudges', 'Zero Silent Quitting'],
    icon: '🤝',
  },
  {
    id: 'shells',
    badge: '🧩 SMART SYNERGY SHELLS',
    badgeClass: 'badge--success',
    category: 'architecture',
    title: 'Different Habits. Shared Team Victory.',
    desc: 'You do Deep Work Coding, your partner does Exam Study. TwoGether intelligently fuses disparate routines into Shared Focus Shells to power your joint Duo streak!',
    preview: {
      leftIcon: '💻',
      leftHabit: '90m Deep Work',
      centerTag: '⚡ FUSED INTO FOCUS SHELL ⚡',
      rightIcon: '📚',
      rightHabit: 'Exam Revision',
    },
    chips: ['Semantic Fusing', 'Personal Freedom', 'Unified Duo Progress'],
    icon: '🧩',
  },
  {
    id: 'philosophy',
    badge: '🔥 DUO PHILOSOPHY',
    badgeClass: 'badge--gold',
    category: 'philosophy',
    quote: 'If you want to go fast, go alone. If you want to go far, go together.',
    desc: 'A solo promise is easy to break in silence. But when someone you respect is relying on your consistency, showing up becomes second nature.',
    author: 'African Proverb · The Duo Principle',
    chips: ['Core Ethos', 'Social Gravity', 'Unbroken Chains'],
    icon: '🔥',
  },
  {
    id: 'stakes',
    badge: '🤝 MUTUAL STAKES',
    badgeClass: 'badge--primary',
    category: 'philosophy',
    quote: 'Two are better than one, because they have a good reward for their labor.',
    desc: 'When you share accountability, victory is twice as sweet and giving up is never an option. Your partner’s daily momentum is tied to your presence.',
    author: 'Ecclesiastes 4:9 · Unbreakable Bond',
    chips: ['Shared Victory', 'Equal Investment', 'Interlocked Fate'],
    icon: '🤝',
  },
  {
    id: 'momentum',
    badge: '⚡ UNBREAKABLE MOMENTUM',
    badgeClass: 'badge--cyan',
    category: 'philosophy',
    quote: 'We don’t rise to the level of our goals, we fall to the level of our systems.',
    desc: 'When two partners build a shared system of daily execution, consistency stops being an uphill struggle and becomes your default identity.',
    author: 'James Clear · Powered by Duo Synergy',
    chips: ['Systemic Discipline', 'Daily Habit Loops', 'Flywheel Effect'],
    icon: '⚡',
  },
  {
    id: 'standards',
    badge: '🎯 UNCOMPROMISING STANDARDS',
    badgeClass: 'badge--danger',
    category: 'philosophy',
    quote: 'When two people commit to the same standard, slacking is no longer an option.',
    desc: 'Every check-in powers your joint streak. Your partner is depending on your standard today. Elevate each other’s discipline ceiling.',
    author: 'TwoGether Philosophy · Shared Accountability',
    chips: ['High-Bar Standards', 'Mutual Respect', 'No Weak Links'],
    icon: '🎯',
  },
  {
    id: 'synergy',
    badge: '✨ EXPONENTIAL SYNERGY',
    badgeClass: 'badge--purple',
    category: 'philosophy',
    quote: 'Alone we can do so little; together we can do so much.',
    desc: 'One partner pushes the other. Two disciplined minds create an unstoppable flywheel of daily progress, compounding discipline into lifelong habits.',
    author: 'Helen Keller · TwoGether Synergy',
    chips: ['1 + 1 = 10', 'Compound Gains', 'Exponential Impact'],
    icon: '✨',
  },
];

const PLATFORM_FEATURES = [
  {
    icon: '🤝',
    title: 'Mutual Duo Pairing',
    tag: 'MILESTONE 3',
    text: 'Pair up with a partner using unique DUO invite codes. Your individual actions now power a shared Duo identity.',
  },
  {
    icon: '📝',
    title: 'Editable Daily Tasks',
    tag: 'MILESTONE 4',
    text: 'Create and edit personal daily habits with custom icons, categories (Fitness, Health, Focus, Mindset), and priority levels.',
  },
  {
    icon: '🧩',
    title: 'Semantic Synergy Shells',
    tag: 'SMART AI ENGINE',
    text: 'Do different workouts? The engine recognizes Gym & Calisthenics under the Exercise Shell, calculating shared team synergy!',
  },
  {
    icon: '🔥',
    title: 'Shared Duo Streaks & XP',
    tag: 'PROGRESSION',
    text: 'Check in daily to build solo and Duo streaks, earn XP, level up your profile, and earn custom titles.',
  },
  {
    icon: '🛡️',
    title: 'Duo Streak Shields',
    tag: 'PROTECTION',
    text: 'Life happens. Built-in Duo Shields automatically protect your hard-earned streak when emergencies arise.',
  },
  {
    icon: '⚡',
    title: 'Real-Time Nudges & SOS',
    tag: 'INTERACTIONS',
    text: 'Send instant Hype pulses, gentle reminders, or hit the Emergency SOS when your partner’s streak is on the line.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Create Your Account & Grab Your Code',
    text: 'Sign up in 10 seconds to get your personal DUO-XXXX invite code.',
  },
  {
    n: '02',
    title: 'Set Your Personal Daily Habits',
    text: 'Add your individual tasks—fitness, hydration, coding, reading, or meditation.',
  },
  {
    n: '03',
    title: 'Pair Up & Build Unbreakable Synergy',
    text: 'Enter your friend’s code to fuse your habits into Shared Synergy Shells and level up together!',
  },
];

export default function Landing() {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [fadeQuote, setFadeQuote] = useState(false);
  const [pillarFilter, setPillarFilter] = useState('all');

  // Ensure the landing page color theme is always Dark Blue (#023047 / #011d2b)
  // regardless of which theme the user selects under settings
  useEffect(() => {
    document.documentElement.classList.add('landing-dark-theme');
    document.body.classList.add('landing-dark-theme');
    return () => {
      document.documentElement.classList.remove('landing-dark-theme');
      document.body.classList.remove('landing-dark-theme');
    };
  }, []);

  // Auto-rotate quotes every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      handleNextQuote();
    }, 8000);
    return () => clearInterval(timer);
  }, [quoteIndex]);

  const handleNextQuote = () => {
    setFadeQuote(true);
    setTimeout(() => {
      setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
      setFadeQuote(false);
    }, 250);
  };

  const currentQuote = MOTIVATIONAL_QUOTES[quoteIndex];
  const displayedPillars =
    pillarFilter === 'all'
      ? DUO_PILLARS
      : DUO_PILLARS.filter((p) => p.category === pillarFilter);

  return (
    <div className="landing">
      {/* ======================================================== */}
      {/* 3D SCROLL SEQUENCE CANVAS HERO & SCENES                  */}
      {/* ======================================================== */}
      <ScrollCanvasAnimation />

      {/* ======================================================== */}
      {/* THE 7 PILLARS OF DUO SYNERGY & PHILOSOPHY CARDS          */}
      {/* ======================================================== */}
      <section className="container section duo-pillars-section" id="duo-pillars">
        <div className="duo-pillars-header">
          <span className="badge badge--pill">✨ CORE ARCHITECTURE &amp; MINDSET</span>
          <h2 className="section__title">The 7 Pillars of Duo Synergy</h2>
          <p className="section__sub muted">
            Every layer of TwoGether is designed using behavioral psychology, mutual accountability,
            and shared stakes so neither partner ever walks alone.
          </p>

          <div className="duo-pillar-tabs" role="tablist">
            <button
              type="button"
              className={`duo-pillar-tab ${pillarFilter === 'all' ? 'duo-pillar-tab--active' : ''}`}
              onClick={() => setPillarFilter('all')}
            >
              All 7 Pillars (7)
            </button>
            <button
              type="button"
              className={`duo-pillar-tab ${pillarFilter === 'architecture' ? 'duo-pillar-tab--active' : ''}`}
              onClick={() => setPillarFilter('architecture')}
            >
              ⚙️ Core Systems (2)
            </button>
            <button
              type="button"
              className={`duo-pillar-tab ${pillarFilter === 'philosophy' ? 'duo-pillar-tab--active' : ''}`}
              onClick={() => setPillarFilter('philosophy')}
            >
              🔥 Duo Philosophy (5)
            </button>
          </div>
        </div>

        <div className="duo-pillars-grid">
          {displayedPillars.map((pillar) => (
            <div
              key={pillar.id}
              className={`duo-pillar-card ${pillar.preview ? 'duo-pillar-card--featured' : ''}`}
            >
              <div className="duo-pillar-card__top">
                <span className={`badge badge--pill ${pillar.badgeClass}`}>
                  {pillar.badge}
                </span>
                <span className="duo-pillar-card__icon">{pillar.icon}</span>
              </div>

              {pillar.quote ? (
                <div className="duo-pillar-card__quote-block">
                  <h3 className="duo-pillar-card__title duo-pillar-card__title--quote">
                    &ldquo;{pillar.quote}&rdquo;
                  </h3>
                  <cite className="duo-pillar-card__citation">— {pillar.author}</cite>
                </div>
              ) : (
                <h3 className="duo-pillar-card__title">{pillar.title}</h3>
              )}

              <p className="duo-pillar-card__desc">{pillar.desc}</p>

              {pillar.preview && (
                <div className="scene-shell-preview duo-pillar-preview">
                  <span className="scene-shell-habit">
                    <span className="scene-shell-icon">{pillar.preview.leftIcon}</span>
                    <span>{pillar.preview.leftHabit}</span>
                  </span>
                  <span className="scene-shell-fuse">{pillar.preview.centerTag}</span>
                  <span className="scene-shell-habit">
                    <span className="scene-shell-icon">{pillar.preview.rightIcon}</span>
                    <span>{pillar.preview.rightHabit}</span>
                  </span>
                </div>
              )}

              {pillar.chips && (
                <div className="duo-pillar-card__chips">
                  {pillar.chips.map((chip, i) => (
                    <span key={i} className="duo-pillar-chip">
                      {chip}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* MOTIVATIONAL QUOTE SECTION                               */}
      {/* ======================================================== */}
      <section className="container quote-section">
        <div className="quote-card">
          <div className="quote-card__header">
            <span className="badge badge--pill">{currentQuote.tag}</span>
            <span className="quote-card__label">DAILY DUO INSPIRATION</span>
            <button
              type="button"
              className="quote-refresh-btn"
              onClick={handleNextQuote}
              title="Next motivational quote"
              aria-label="Next quote"
            >
              Next Quote
            </button>
          </div>

          <div className={`quote-card__body ${fadeQuote ? 'quote-card__body--fade' : ''}`}>
            <span className="quote-card__mark" aria-hidden="true">
              “
            </span>
            <blockquote className="quote-card__text">{currentQuote.quote}</blockquote>
            <cite className="quote-card__author">— {currentQuote.author}</cite>
          </div>

          <div className="quote-card__dots">
            {MOTIVATIONAL_QUOTES.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`quote-dot ${i === quoteIndex ? 'quote-dot--active' : ''}`}
                onClick={() => setQuoteIndex(i)}
                aria-label={`Go to quote ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* HOW IT WORKS (3 STEPS)                                   */}
      {/* ======================================================== */}
      <section className="container section">
        <h2 className="section__title">How TwoGether Works</h2>
        <p className="section__sub muted">Get up and running in under 2 minutes.</p>
        <div className="steps">
          {STEPS.map((step) => (
            <div key={step.n} className="step-card">
              <span className="step-card__num">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* XP & LEVEL PROGRESSION SYSTEM                            */}
      {/* ======================================================== */}
      <section className="container section xp-explainer-section">
        <div className="xp-explainer-header">
          <span className="badge badge--pill">⚡ GAMIFIED CONSISTENCY</span>
          <h2 className="section__title">The XP & Level System</h2>
          <p className="section__sub muted">
            Every habit you complete earns Experience Points (XP). Level up your rank, unlock streak shields, and prove your consistency to your partner.
          </p>
        </div>

        {/* 1. XP Rewards Grid */}
        <div className="xp-cards-grid">
          <div className="xp-card xp-card--high">
            <div className="xp-card__icon-badge">🔥</div>
            <div className="xp-card__val">+20 XP</div>
            <h4>High Priority Habit</h4>
            <p>Your non-negotiable daily anchors (e.g., 1hr Gym, 90m Deep Work).</p>
          </div>

          <div className="xp-card xp-card--medium">
            <div className="xp-card__icon-badge">⚡</div>
            <div className="xp-card__val">+15 XP</div>
            <h4>Medium Priority Habit</h4>
            <p>Core daily maintenance routines (e.g., 20 Pages Reading, 2.5L Water).</p>
          </div>

          <div className="xp-card xp-card--low">
            <div className="xp-card__icon-badge">✨</div>
            <div className="xp-card__val">+10 XP</div>
            <h4>Low Priority Habit</h4>
            <p>Quick micro-habits & mindful check-ins (e.g., 5m Meditation, Stretch).</p>
          </div>

          <div className="xp-card xp-card--bonus">
            <div className="xp-card__icon-badge">🎯</div>
            <div className="xp-card__val">+50 XP</div>
            <h4>Sprint Goal Mastery</h4>
            <p>Awarded when you conclude a time-bounded goal with ≥ 80% accuracy.</p>
          </div>
        </div>

        {/* 2. How Leveling Works & Tier Ladder */}
        <div className="xp-formula-card">
          <div className="xp-formula-card__left">
            <span className="xp-formula-tag">LEVEL CALCULATION</span>
            <h3>100 XP = 1 Level Up</h3>
            <p className="muted">
              Your level reflects your cumulative habit volume and discipline over time. Every check-in stacks XP into your profile and shared Duo stats.
            </p>
            <div className="xp-math-pill">
              <code>Level = Math.floor(Total XP / 100) + 1</code>
            </div>
          </div>

          <div className="xp-formula-card__right">
            <div className="xp-ranks-ladder">
              <div className="xp-rank-step">
                <span className="xp-rank-badge">Lv 1 – 3</span>
                <div className="xp-rank-info">
                  <strong>Habit Rookie 🥉</strong>
                  <small>Building the initial habit loop</small>
                </div>
              </div>
              <div className="xp-rank-step">
                <span className="xp-rank-badge">Lv 4 – 6</span>
                <div className="xp-rank-info">
                  <strong>Consistency Striker 🥈</strong>
                  <small>Solidifying multi-week momentum</small>
                </div>
              </div>
              <div className="xp-rank-step">
                <span className="xp-rank-badge">Lv 7 – 9</span>
                <div className="xp-rank-info">
                  <strong>Discipline Sentinel 🥇</strong>
                  <small>Unbreakable daily routine execution</small>
                </div>
              </div>
              <div className="xp-rank-step xp-rank-step--top">
                <span className="xp-rank-badge xp-rank-badge--master">Lv 10+</span>
                <div className="xp-rank-info">
                  <strong>Habit Master 💎</strong>
                  <small>Elite accountability & mastery</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Solo vs Duo Progression Dual Banner */}
        <div className="xp-dual-progression">
          <div className="xp-progression-col xp-progression-col--solo">
            <div className="xp-progression-icon">👤</div>
            <h4>Personal Level</h4>
            <p>Tracks your individual discipline across all personal tasks and monthly spreadsheets.</p>
          </div>
          <div className="xp-progression-divider">
            <span>VS</span>
          </div>
          <div className="xp-progression-col xp-progression-col--duo">
            <div className="xp-progression-icon">🤝</div>
            <h4>Duo Level & Shields</h4>
            <p>Fueled when both partners check in, powering shared synergy and emergency streak shields.</p>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* COMPREHENSIVE FEATURES GRID                              */}
      {/* ======================================================== */}
      <section className="container section">
        <h2 className="section__title">Everything built for consistency</h2>
        <p className="section__sub muted">
          Designed with behavioral psychology, mutual stakes, and zero fluff.
        </p>

        <div className="features">
          {PLATFORM_FEATURES.map((feature) => (
            <div key={feature.title} className="feature-card">
              <div className="feature-card__top">
                <span className="feature-card__tag">{feature.tag}</span>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* FINAL CTA SECTION                                        */}
      {/* ======================================================== */}
      <section className="final-cta">
        <h2>Ready to build habits that never break?</h2>
        <p className="muted" style={{ maxWidth: '480px', margin: '1rem auto 2rem' }}>
          Find an accountability partner, exchange your Duo code, and start your streak today.
        </p>
        <Link to="/register" className="btn btn--primary btn--lg">
          START YOUR DUO NOW
        </Link>
      </section>

      {/* ======================================================== */}
      {/* FOOTER                                                   */}
      {/* ======================================================== */}
      <footer className="footer">
        <p>TwoGether — Unbreakable Accountability Engine</p>
      </footer>
    </div>
  );
}