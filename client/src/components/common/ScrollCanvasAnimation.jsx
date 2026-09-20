import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './ScrollExpand.css';

const TOTAL_FRAMES = 136;

const SCROLL_DUO_QUOTES = [
  {
    tag: '🔥 DUO PHILOSOPHY',
    quote: 'If you want to go fast, go alone. If you want to go far, go together.',
    author: 'African Proverb · The Duo Principle',
    sub: 'A solo promise is easy to break in silence. But when someone you respect is relying on your consistency, showing up becomes second nature.',
  },
  {
    tag: '🤝 MUTUAL STAKES',
    quote: 'Two are better than one, because they have a good reward for their labor.',
    author: 'Ecclesiastes 4:9 · Unbreakable Bond',
    sub: 'When you share accountability, victory is twice as sweet and giving up is never an option.',
  },
  {
    tag: '⚡ UNBREAKABLE MOMENTUM',
    quote: 'We don’t rise to the level of our goals, we fall to the level of our systems.',
    author: 'James Clear · Powered by Duo Synergy',
    sub: 'When two partners build a shared system of daily execution, consistency stops being a struggle and becomes your default identity.',
  },
  {
    tag: '🎯 UNCOMPROMISING STANDARDS',
    quote: 'When two people commit to the same standard, slacking is no longer an option.',
    author: 'TwoGether Philosophy · Shared Accountability',
    sub: 'Every check-in powers your joint streak. Your partner is depending on your standard today.',
  },
  {
    tag: '✨ EXPONENTIAL SYNERGY',
    quote: 'Alone we can do so little; together we can do so much.',
    author: 'Helen Keller · TwoGether Synergy',
    sub: 'One partner pushes the other. Two disciplined minds create an unstoppable flywheel of daily progress.',
  },
];

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

  // Preload all 63 image frames
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
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount >= TOTAL_FRAMES) {
          setImagesLoaded(true);
        }
      };
      loadedImages.push(img);
    }
    setImages(loadedImages);
  }, []);

  // Draw frame on canvas with high-DPI scaling, cover mode, and smooth fit
  const renderFrame = useCallback((frameIndex) => {
    const canvas = canvasRef.current;
    if (!canvas || !images[frameIndex]) return;
    const ctx = canvas.getContext('2d');
    const img = images[frameIndex];

    if (!img.complete || img.naturalWidth === 0) return;

    // High-DPI canvas
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

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
      getComputedStyle(canvas).getPropertyValue('--canvas-bg').trim() || '#04121f';
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    const srcWidth = img.naturalWidth;
    const srcHeight = img.naturalHeight;
    const srcRatio = srcWidth / srcHeight;
    const canvasRatio = displayWidth / displayHeight;

    const ZOOM_FACTOR = 1.05;

    let drawWidth, drawHeight;
    if (canvasRatio > srcRatio) {
      drawWidth = displayWidth * ZOOM_FACTOR;
      drawHeight = (displayWidth / srcRatio) * ZOOM_FACTOR;
    } else {
      drawHeight = displayHeight * ZOOM_FACTOR;
      drawWidth = (displayHeight * srcRatio) * ZOOM_FACTOR;
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

  // Handle scroll events, frame scrubbing, clip-path expansion, and background fade-out
  useEffect(() => {
    let animationFrameId;

    const handleScroll = () => {
      const wrapper = wrapperRef.current;
      const fixedWrap = fixedCanvasWrapRef.current;
      if (!wrapper) return;

      const rect = wrapper.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalHeroTrackDistance = wrapper.offsetHeight - windowHeight;
      if (totalHeroTrackDistance <= 0) return;

      // 1. Progress across the hero scrubbing track (0.0 to 1.0)
      const progress = clamp(-rect.top / totalHeroTrackDistance, 0, 1);
      setScrollProgress(progress);

      // 2. Map progress to frame index (0 to 119).
      // When scrolling past all frames (progress === 1.0), frameIndex remains locked on the last frame (119)
      const frameIndex = Math.min(
        TOTAL_FRAMES - 1,
        Math.max(0, Math.round(progress * (TOTAL_FRAMES - 1)))
      );

      // 3. Full-bleed 3D canvas on all viewports for immersive, cinematic presentation
      if (fixedWrap) {
        fixedWrap.style.clipPath = 'none';
        fixedWrap.style.border = 'none';
        fixedWrap.style.boxShadow = 'none';

        // 4. Smooth Fade-Out as user finishes the hero track (progress 0.90 -> 1.0):
        // Fades smoothly to clean background so the quotes & feature sections have crisp contrast
        let opacity = 1;
        if (progress >= 0.88) {
          const fadeRatio = clamp((progress - 0.88) / 0.12, 0, 1);
          opacity = Math.max(0, 0.5 * (1 + Math.cos(fadeRatio * Math.PI)));
        }
        const scrollPastHero = Math.max(0, -rect.top - totalHeroTrackDistance);
        if (scrollPastHero > 0) {
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
      {/* Stays fixed behind content when scrolling past frames    */}
      {/* and gradually fades out until background is clean        */}
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
      {/* 2. HERO INTERACTIVE SCROLL TRACK (EXPAND & SCENES)       */}
      {/* ======================================================== */}
      <div ref={wrapperRef} className="scroll-sequence-container">
        <div className="scroll-sequence-sticky">
          {/* Narrative Scenes Overlay */}
          <div className="scroll-expand-scenes-container">
            {/* Scene 1: Unified Hero Header & CTAs (0% - 22% Scroll) */}
            <div
              className={`scroll-scene scroll-scene--hero ${
                scrollProgress <= 0.22
                  ? 'scroll-scene--active'
                  : 'scroll-scene--hidden'
              }`}
            >
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

              <div className="scroll-indicator" aria-hidden="true">
                <span className="scroll-indicator__text">SCROLL TO EXPLORE</span>
                <span className="scroll-indicator__arrow">↓</span>
              </div>
            </div>

            {/* Scene 2: 1-on-1 Accountability (22% - 36% Scroll) */}
            <div
              className={`scroll-scene scroll-scene--callout ${
                scrollProgress > 0.22 && scrollProgress <= 0.36
                  ? 'scroll-scene--active'
                  : 'scroll-scene--hidden'
              }`}
            >
              <div className="scene-card">
                <span className="badge badge--pill">🤝 1-ON-1 ACCOUNTABILITY</span>
                <h2>Two people. One unbreakable bond.</h2>
                <p className="muted">
                  When one of you slips, the entire Duo feels it. No more quietly skipping days or
                  giving up when nobody is watching.
                </p>
              </div>
            </div>

            {/* Scene 3: Semantic Synergy Shells (36% - 50% Scroll) */}
            <div
              className={`scroll-scene scroll-scene--callout ${
                scrollProgress > 0.36 && scrollProgress <= 0.50
                  ? 'scroll-scene--active'
                  : 'scroll-scene--hidden'
              }`}
            >
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
            </div>

            {/* Scene 4: Interactive Scrolling Duo Quotes (50% - 84% Scroll) */}
            {(() => {
              const isQuotesPhase = scrollProgress > 0.50 && scrollProgress <= 0.84;
              const quotePhaseProgress = clamp((scrollProgress - 0.50) / (0.84 - 0.50), 0, 0.999);
              const activeQuoteIdx = Math.min(
                SCROLL_DUO_QUOTES.length - 1,
                Math.max(0, Math.floor(quotePhaseProgress * SCROLL_DUO_QUOTES.length))
              );
              const activeQuote = SCROLL_DUO_QUOTES[activeQuoteIdx];

              return (
                <div
                  className={`scroll-scene scroll-scene--callout ${
                    isQuotesPhase ? 'scroll-scene--active' : 'scroll-scene--hidden'
                  }`}
                >
                  <div key={activeQuoteIdx} className="scene-card scene-card--quote scene-quote-animated">
                    <span className="badge badge--pill">{activeQuote.tag}</span>
                    <h2 className="scene-quote-title">
                      &ldquo;{activeQuote.quote}&rdquo;
                    </h2>
                    <p className="muted scene-quote-sub">
                      {activeQuote.sub}
                    </p>
                    <cite className="scene-quote-cite">— {activeQuote.author}</cite>

                    <div className="scene-quote-scroll-dots">
                      {SCROLL_DUO_QUOTES.map((_, i) => (
                        <div
                          key={i}
                          className={`scene-quote-dot ${i === activeQuoteIdx ? 'scene-quote-dot--active' : ''}`}
                        />
                      ))}
                    </div>
                    <div className="scene-quote-counter">
                      Duo Quote {activeQuoteIdx + 1} of {SCROLL_DUO_QUOTES.length} · Scroll to cycle quotes ↓
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Scene 5: Unbreakable Streaks & Shields (84% - 96% Scroll with clean exit fade) */}
            <div
              className={`scroll-scene scroll-scene--callout ${
                scrollProgress > 0.84 && scrollProgress <= 0.96
                  ? 'scroll-scene--active'
                  : 'scroll-scene--hidden'
              }`}
            >
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

