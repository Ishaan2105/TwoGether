import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './ScrollExpand.css';

const TOTAL_FRAMES = 136;

function getFrameUrl(index) {
  const padded = String(index + 1).padStart(3, '0');
  return `/frames/ezgif-frame-${padded}.jpg`;
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

export default function ScrollCanvasAnimation() {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const fixedCanvasWrapRef = useRef(null);

  const [images, setImages] = useState([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Smooth scroll down to first card below hero
  const handleScrollToFirstCard = () => {
    const el = document.getElementById('card-accountability');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Preload all image frames
  useEffect(() => {
    let loadedCount = 0;
    const loadedImages = [];

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFrameUrl(i);
      img.onload = () => {
        loadedCount++;
        setLoadProgress(Math.round((loadedCount / TOTAL_FRAMES) * 100));
        if (loadedCount >= TOTAL_FRAMES) {
          setImages(loadedImages);
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount >= TOTAL_FRAMES) {
          setImages(loadedImages);
          setImagesLoaded(true);
        }
      };
      loadedImages.push(img);
    }
  }, []);

  // Render a specific frame on the canvas - perfectly centered and proportioned
  const renderFrame = useCallback((frameIndex) => {
    const canvas = canvasRef.current;
    if (!canvas || !images[frameIndex]) return;
    const ctx = canvas.getContext('2d');
    const img = images[frameIndex];

    if (!img.complete || img.naturalWidth === 0) return;

    // High-DPI canvas matching true viewport width & height
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = window.innerWidth || canvas.clientWidth;
    const displayHeight = window.innerHeight || canvas.clientHeight;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Clear with theme background
    const canvasBg =
      getComputedStyle(canvas).getPropertyValue('--canvas-bg').trim() || '#040a13';
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    const srcWidth = img.naturalWidth;
    const srcHeight = img.naturalHeight;
    const srcRatio = srcWidth / srcHeight;
    const canvasRatio = displayWidth / displayHeight;

    // Center and cover full screen seamlessly without cropping characters off center
    let drawWidth, drawHeight;
    if (canvasRatio > srcRatio) {
      drawWidth = displayWidth;
      drawHeight = displayWidth / srcRatio;
    } else {
      drawHeight = displayHeight;
      drawWidth = displayHeight * srcRatio;
    }

    const offsetX = (displayWidth - drawWidth) / 2;
    const offsetY = (displayHeight - drawHeight) / 2;

    ctx.drawImage(
      img,
      0,
      0,
      srcWidth,
      srcHeight,
      offsetX,
      offsetY,
      drawWidth,
      drawHeight
    );
    ctx.restore();
  }, [images]);

  // Handle scroll events, frame scrubbing, and background fade-out
  useEffect(() => {
    let animationFrameId;

    const handleScroll = () => {
      const wrapper = wrapperRef.current;
      const fixedWrap = fixedCanvasWrapRef.current;
      if (!wrapper) return;

      const rect = wrapper.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalTrackDistance = wrapper.offsetHeight - windowHeight;
      if (totalTrackDistance <= 0) return;

      // 1. Progress from top of hero (0.0) down through all cards until Daily Duo Inspiration (1.0)
      const progress = clamp(-rect.top / totalTrackDistance, 0, 1);
      setScrollProgress(progress);

      // 2. Map progress to frame index (0 to 135)
      const frameIndex = Math.min(
        TOTAL_FRAMES - 1,
        Math.max(0, Math.floor(progress * TOTAL_FRAMES))
      );

      // 3. Smooth Fade-Out as user finishes the cards and transitions into Daily Duo Inspiration
      if (fixedWrap) {
        let opacity = 1;
        if (progress >= 0.92) {
          const fadeRatio = clamp((progress - 0.92) / 0.08, 0, 1);
          opacity = Math.max(0, 0.5 * (1 + Math.cos(fadeRatio * Math.PI)));
        }

        const scrollPastTrack = -rect.top - totalTrackDistance;
        if (scrollPastTrack > 50) {
          opacity = 0;
        }

        fixedWrap.style.opacity = opacity;
        fixedWrap.style.visibility = opacity <= 0.001 ? 'hidden' : 'visible';
      }

      animationFrameId = requestAnimationFrame(() => {
        renderFrame(frameIndex);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    window.addEventListener('orientationchange', handleScroll, { passive: true });

    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('orientationchange', handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, [images, imagesLoaded, renderFrame]);

  // Initial draw once loaded
  useEffect(() => {
    if (imagesLoaded) {
      renderFrame(0);
    }
  }, [imagesLoaded, renderFrame]);

  return (
    <>
      {/* ======================================================== */}
      {/* 1. FIXED BACKGROUND 3D CANVAS LAYER                      */}
      {/* Displays frames in background while scrolling cards      */}
      {/* ======================================================== */}
      <div
        ref={fixedCanvasWrapRef}
        className="scroll-canvas-fixed-wrap"
        style={{
          pointerEvents: 'none',
        }}
      >
        <canvas ref={canvasRef} className="scroll-sequence-canvas" />
        <div className="scroll-sequence-vignette" />

        {!imagesLoaded && (
          <div className="canvas-loader">
            <div className="spinner" />
            <p>Loading 3D Experience… {loadProgress}%</p>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. HERO & NARRATIVE CARDS TRACK                          */}
      {/* Cards appear below SCROLL TO DISCOVER until Inspiration  */}
      {/* ======================================================== */}
      <div ref={wrapperRef} className="scroll-sequence-container">
        {/* Section 1: Hero Header & CTAs */}
        <section className="scroll-hero-section">
          <div className="scroll-hero-content">
            <h1 className="hero__title">
              BUILD HABITS.
              <br />
              <span className="hero__title--accent">TOGETHER.</span>
            </h1>

            <p className="hero__sub">
              Your daily habits aren&rsquo;t just a solo checklist anymore. Connect with a partner,
              fuse your goals into <strong>Shared Synergy Shells</strong>, and hold each other to a
              higher standard.
            </p>

            <div className="hero__cta">
              <Link to="/register" className="btn btn--primary btn--lg">
                START YOUR DUO ⚡
              </Link>
              <Link to="/login" className="btn btn--ghost btn--lg">
                I ALREADY HAVE A CODE
              </Link>
            </div>

            <button
              type="button"
              className="scroll-indicator"
              onClick={handleScrollToFirstCard}
              aria-label="Scroll to discover features"
            >
              <span className="scroll-indicator__text">SCROLL TO DISCOVER</span>
              <span className="scroll-indicator__arrow">↓</span>
            </button>
          </div>
        </section>

        {/* ======================================================== */}
        {/* CARDS BELOW SCROLL TO DISCOVER UNTIL DAILY DUO INSPIRATION */}
        {/* ======================================================== */}

        {/* Card 1: 1-on-1 Accountability */}
        <section id="card-accountability" className="scroll-card-section">
          <div className="scene-card">
            <span className="badge badge--pill">🤝 1-ON-1 ACCOUNTABILITY</span>
            <h2>Two people. One unbreakable bond.</h2>
            <p className="muted">
              When one of you slips, the entire Duo feels it. No more quietly skipping days or
              giving up when nobody is watching.
            </p>
          </div>
        </section>

        {/* Card 2: Smart Synergy Shells */}
        <section id="card-shells" className="scroll-card-section">
          <div className="scene-card scene-card--highlight">
            <span className="badge badge--success">🧩 SMART SYNERGY SHELLS</span>
            <h2>Different habits. Shared team victory.</h2>
            <p className="muted">
              You do <strong>Deep Work Coding</strong>, your partner does <strong>Exam Study</strong>.
              TwoGether intelligently fuses both under the <strong>Focus & Mastery Shell</strong> to
              power your Duo streak!
            </p>
            <div className="scene-shell-preview">
              <span className="scene-shell-habit">
                <span className="scene-shell-icon">💻</span>
                <span>90m Deep Work</span>
              </span>
              <span className="scene-shell-fuse">⚡ FUSED INTO FOCUS SHELL ⚡</span>
              <span className="scene-shell-habit">
                <span className="scene-shell-icon">📚</span>
                <span>Exam Revision</span>
              </span>
            </div>
          </div>
        </section>

        {/* Card 3: Duo Philosophy */}
        <section id="card-philosophy" className="scroll-card-section">
          <div className="scene-card scene-card--quote">
            <span className="badge badge--pill">🔥 DUO PHILOSOPHY</span>
            <h2 className="scene-quote-title">
              &ldquo;If you want to go fast, go alone. If you want to go far, go together.&rdquo;
            </h2>
            <p className="muted scene-quote-sub">
              A solo promise is easy to break in silence. But when someone you respect is relying
              on your consistency, showing up becomes second nature.
            </p>
            <cite className="scene-quote-cite">— African Proverb · The Duo Principle</cite>
          </div>
        </section>

        {/* Card 4: Mutual Stakes */}
        <section id="card-stakes" className="scroll-card-section">
          <div className="scene-card scene-card--quote">
            <span className="badge badge--pill">🤝 MUTUAL STAKES</span>
            <h2 className="scene-quote-title">
              &ldquo;Two are better than one, because they have a good reward for their labor.&rdquo;
            </h2>
            <p className="muted scene-quote-sub">
              When you share accountability, victory is twice as sweet and giving up is never an option.
              Your partner&rsquo;s daily momentum is tied to your presence.
            </p>
            <cite className="scene-quote-cite">— Ecclesiastes 4:9 · Unbreakable Bond</cite>
          </div>
        </section>

        {/* Card 5: Unbreakable Momentum */}
        <section id="card-momentum" className="scroll-card-section">
          <div className="scene-card scene-card--quote">
            <span className="badge badge--pill">⚡ UNBREAKABLE MOMENTUM</span>
            <h2 className="scene-quote-title">
              &ldquo;We don&rsquo;t rise to the level of our goals, we fall to the level of our systems.&rdquo;
            </h2>
            <p className="muted scene-quote-sub">
              When two partners build a shared system of daily execution, consistency stops being a struggle
              and becomes your default identity.
            </p>
            <cite className="scene-quote-cite">— James Clear · Powered by Duo Synergy</cite>
          </div>
        </section>

        {/* Card 6: Uncompromising Standards */}
        <section id="card-standards" className="scroll-card-section">
          <div className="scene-card scene-card--quote">
            <span className="badge badge--pill">🎯 UNCOMPROMISING STANDARDS</span>
            <h2 className="scene-quote-title">
              &ldquo;When two people commit to the same standard, slacking is no longer an option.&rdquo;
            </h2>
            <p className="muted scene-quote-sub">
              Every check-in powers your joint streak. Your partner is depending on your standard today.
              Elevate each other&rsquo;s discipline ceiling.
            </p>
            <cite className="scene-quote-cite">— TwoGether Philosophy · Shared Accountability</cite>
          </div>
        </section>

        {/* Card 7: Exponential Synergy */}
        <section id="card-synergy" className="scroll-card-section">
          <div className="scene-card scene-card--quote">
            <span className="badge badge--pill">✨ EXPONENTIAL SYNERGY</span>
            <h2 className="scene-quote-title">
              &ldquo;Alone we can do so little; together we can do so much.&rdquo;
            </h2>
            <p className="muted scene-quote-sub">
              One partner pushes the other. Two disciplined minds create an unstoppable flywheel of daily
              progress, compounding discipline into lifelong habits.
            </p>
            <cite className="scene-quote-cite">— Helen Keller · TwoGether Synergy</cite>
          </div>
        </section>

        {/* Card 8: Streak Shields & Duo XP */}
        <section id="card-shields" className="scroll-card-section">
          <div className="scene-card">
            <span className="badge badge--pill">🛡️ STREAK SHIELDS & DUO XP</span>
            <h2>Level up together. Protect the chain.</h2>
            <p className="muted">
              Earn XP with every habit completed, climb ranks, unlock titles, and protect your
              streak with emergency Duo Shields.
            </p>
            <div className="hero__cta" style={{ marginTop: '1.5rem' }}>
              <Link to="/register" className="btn btn--primary btn--md">
                CREATE YOUR DUO NOW ➜
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}


