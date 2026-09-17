import React, { useState, useEffect, useRef } from 'react';
import './WhatsAppShareModal.css';

/**
 * WhatsAppShareModal
 * Provides an intuitive interface for users to share their Duo invite code
 * directly to WhatsApp either as formatted text or as a stylish image card.
 */
export default function WhatsAppShareModal({ isOpen, onClose, inviteCode, username }) {
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'image'
  const [cardDataUrl, setCardDataUrl] = useState(null);
  const [cardBlob, setCardBlob] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const canvasRef = useRef(null);

  // Formatted invite text for WhatsApp
  const shareText = `👋 Hey! Let's build daily habits together on *TwoGether*! 🚀\n\nPair up with me using my Duo Invite Code:\n👉 *${inviteCode}*\n\nSign up and link our accounts here:\n${window.location.origin}`;

  // Generate Image Card on Canvas
  useEffect(() => {
    if (!isOpen || !inviteCode) return;

    let isMounted = true;
    setIsGenerating(true);

    const generateCard = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');

        // 1. Background Fill
        const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
        bgGrad.addColorStop(0, '#090a16');
        bgGrad.addColorStop(0.5, '#0e1124');
        bgGrad.addColorStop(1, '#080a14');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1080, 1080);

        // 2. Ambient Glowing Orbs
        // Violet glow (top-left)
        const vGlow = ctx.createRadialGradient(200, 200, 0, 200, 200, 500);
        vGlow.addColorStop(0, 'rgba(139, 92, 246, 0.28)');
        vGlow.addColorStop(1, 'rgba(139, 92, 246, 0)');
        ctx.fillStyle = vGlow;
        ctx.beginPath();
        ctx.arc(200, 200, 500, 0, Math.PI * 2);
        ctx.fill();

        // Cyan glow (bottom-right)
        const cGlow = ctx.createRadialGradient(880, 880, 0, 880, 880, 550);
        cGlow.addColorStop(0, 'rgba(6, 182, 212, 0.28)');
        cGlow.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = cGlow;
        ctx.beginPath();
        ctx.arc(880, 880, 550, 0, Math.PI * 2);
        ctx.fill();

        // 3. Subtle Card Outer Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 3;
        roundRect(ctx, 40, 40, 1000, 1000, 36);
        ctx.stroke();

        // 4. Logo & Branding
        const drawLogo = async () => {
          return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = '/tg-logo.png';
            img.onload = () => {
              ctx.save();
              // Rounded clipping for logo
              roundRect(ctx, 490 - 45, 110, 90, 90, 22);
              ctx.clip();
              ctx.drawImage(img, 490 - 45, 110, 90, 90);
              ctx.restore();
              resolve();
            };
            img.onerror = () => {
              // Fallback logo
              ctx.fillStyle = 'linear-gradient(135deg, #8b5cf6, #06b6d4)';
              roundRect(ctx, 490 - 45, 110, 90, 90, 22);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 36px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('TG', 490, 168);
              resolve();
            };
          });
        };
        await drawLogo();

        // Brand Text
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 48px system-ui, -apple-system, sans-serif';
        ctx.letterSpacing = '6px';
        ctx.fillText('TWOGETHER', 540, 250);

        ctx.fillStyle = '#06b6d4';
        ctx.font = '700 20px system-ui, -apple-system, sans-serif';
        ctx.letterSpacing = '4px';
        ctx.fillText('DUO HABIT ACCELERATOR', 540, 285);

        // 5. Inviter Greeting Pill
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        roundRect(ctx, 240, 330, 600, 64, 32);
        ctx.fill();
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
        ctx.lineWidth = 1.5;
        roundRect(ctx, 240, 330, 600, 64, 32);
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '600 24px system-ui, -apple-system, sans-serif';
        ctx.fillText(`👋 @${username || 'A friend'} invited you to pair up!`, 540, 372);

        // 6. Huge Center Invite Code Box
        const codeBoxY = 430;
        const codeBoxH = 220;
        ctx.fillStyle = 'rgba(15, 18, 35, 0.75)';
        roundRect(ctx, 160, codeBoxY, 760, codeBoxH, 28);
        ctx.fill();

        // Neon border on code box
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.65)';
        ctx.lineWidth = 3;
        roundRect(ctx, 160, codeBoxY, 760, codeBoxH, 28);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 18px system-ui, -apple-system, sans-serif';
        ctx.letterSpacing = '3px';
        ctx.fillText('YOUR EXCLUSIVE DUO INVITE CODE', 540, codeBoxY + 52);

        // Glow behind code
        ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 76px monospace, sans-serif';
        ctx.letterSpacing = '8px';
        ctx.fillText(inviteCode, 540, codeBoxY + 138);

        // Reset shadow
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#38bdf8';
        ctx.font = '600 18px system-ui, -apple-system, sans-serif';
        ctx.letterSpacing = '1px';
        ctx.fillText('⚡ Enter this code to link habits & unlock shared synergy', 540, codeBoxY + 185);

        // 7. Three Feature Perks Box
        const perksY = 690;
        const perks = [
          { icon: '🔥', title: 'Shared Streaks', desc: 'Sync daily momentum' },
          { icon: '📸', title: 'Photo Nudges', desc: 'Real-time proof check-ins' },
          { icon: '🏆', title: 'Duo Leaderboard', desc: 'Climb the top ranks together' },
        ];

        perks.forEach((p, idx) => {
          const px = 180 + idx * 260;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          roundRect(ctx, px, perksY, 200, 160, 20);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          roundRect(ctx, px, perksY, 200, 160, 20);
          ctx.stroke();

          ctx.font = '40px sans-serif';
          ctx.fillText(p.icon, px + 100, perksY + 54);

          ctx.fillStyle = '#f8fafc';
          ctx.font = '700 18px system-ui, -apple-system, sans-serif';
          ctx.letterSpacing = '0px';
          ctx.fillText(p.title, px + 100, perksY + 98);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '500 13px system-ui, -apple-system, sans-serif';
          ctx.fillText(p.desc, px + 100, perksY + 128);
        });

        // 8. Footer URL & Call to Action
        ctx.fillStyle = '#64748b';
        ctx.font = '500 18px system-ui, -apple-system, sans-serif';
        ctx.fillText('Get started at:', 540, 930);

        ctx.fillStyle = '#a78bfa';
        ctx.font = '700 22px system-ui, -apple-system, sans-serif';
        ctx.fillText(window.location.origin.replace(/^https?:\/\//, ''), 540, 965);

        // Convert canvas to blob & dataUrl
        canvas.toBlob((blob) => {
          if (!isMounted || !blob) return;
          setCardBlob(blob);
          const url = URL.createObjectURL(blob);
          setCardDataUrl(url);
          setIsGenerating(false);
        }, 'image/png');
      } catch (err) {
        console.error('Error generating card:', err);
        if (isMounted) setIsGenerating(false);
      }
    };

    generateCard();

    return () => {
      isMounted = false;
    };
  }, [isOpen, inviteCode, username]);

  // Helper for rounded rectangles on Canvas
  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // Handle Share as Text to WhatsApp
  const handleShareText = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Handle Share Image to WhatsApp (Native share on mobile or Download + WhatsApp Web fallback)
  const handleShareImage = async () => {
    if (!cardBlob) return;

    const file = new File([cardBlob], `twogether-duo-${inviteCode}.png`, { type: 'image/png' });

    // 1. If Web Share API with files is supported (Android Chrome / Samsung A35 / iOS Safari)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'TwoGether Duo Invite',
          text: `Hey! Pair up with me on TwoGether with invite code: ${inviteCode}\n${window.location.origin}`,
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Native share failed, using fallback:', err);
        } else {
          return; // User cancelled
        }
      }
    }

    // 2. Desktop Fallback: Download image, copy to clipboard, and open WhatsApp Web
    handleDownloadCard();

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': cardBlob }),
        ]);
        showToast('Card copied to clipboard! Paste it into WhatsApp.');
      }
    } catch (e) {
      console.warn('Clipboard image write not allowed:', e);
    }

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Download Image Card
  const handleDownloadCard = () => {
    if (!cardBlob) return;
    const url = URL.createObjectURL(cardBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `twogether-duo-invite-${inviteCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Duo Invite Card saved to your downloads!');
  };

  // Copy Image to Clipboard
  const handleCopyImageToClipboard = async () => {
    if (!cardBlob) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': cardBlob }),
        ]);
        showToast('✓ Image copied to clipboard!');
      } else {
        handleDownloadCard();
      }
    } catch (err) {
      handleDownloadCard();
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="whatsapp-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-share-title"
      >
        {/* Modal Header */}
        <div className="whatsapp-modal__header">
          <div className="whatsapp-modal__icon-badge">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zM8.53 7.33c-.14 0-.36.05-.55.26-.19.2-.72.7-.72 1.72 0 1.01.74 1.99.84 2.13.1.14 1.44 2.21 3.5 3.1 1.71.74 2.06.6 2.43.56.37-.03 1.2-.49 1.37-.96.17-.48.17-.89.12-.97-.05-.08-.19-.13-.4-.24-.21-.1-1.24-.61-1.43-.68-.19-.07-.33-.1-.47.11-.14.21-.55.68-.67.82-.12.14-.24.16-.45.05-.21-.1-.89-.33-1.69-1.05-.62-.56-1.04-1.25-1.16-1.46-.12-.21-.01-.32.09-.43.09-.1.21-.26.31-.39.11-.13.14-.22.21-.37.07-.15.04-.28-.02-.39-.06-.11-.53-1.28-.73-1.75-.19-.46-.39-.4-.53-.41-.14-.01-.3-.01-.46-.01z"/>
            </svg>
          </div>
          <div className="whatsapp-modal__title-box">
            <h2 id="whatsapp-share-title" className="whatsapp-modal__title">
              Share on WhatsApp
            </h2>
            <p className="whatsapp-modal__subtitle">
              Send your Duo invite code to your partner as text or a custom image
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection: Text vs Image */}
        <div className="whatsapp-modal__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'text'}
            className={`whatsapp-tab ${activeTab === 'text' ? 'whatsapp-tab--active' : ''}`}
            onClick={() => setActiveTab('text')}
          >
            <span>💬</span>
            <span>Share as Text</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'image'}
            className={`whatsapp-tab ${activeTab === 'image' ? 'whatsapp-tab--active' : ''}`}
            onClick={() => setActiveTab('image')}
          >
            <span>🖼️</span>
            <span>Share as Image Card</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="whatsapp-modal__body">
          {toastMsg && <div className="whatsapp-toast-msg">{toastMsg}</div>}

          {/* TAB 1: TEXT SHARING */}
          {activeTab === 'text' && (
            <>
              <div className="whatsapp-chat-bubble">
                {shareText}
                <div className="whatsapp-chat-bubble__meta">
                  <span>Pre-composed WhatsApp message</span>
                </div>
              </div>

              <div className="whatsapp-info-tip">
                <span className="whatsapp-info-tip__icon">💡</span>
                <span>
                  Clicking below will open WhatsApp directly with your invite code and signup link ready to send.
                </span>
              </div>

              <button
                type="button"
                className="btn btn--whatsapp btn--block btn--lg"
                onClick={handleShareText}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zM8.53 7.33c-.14 0-.36.05-.55.26-.19.2-.72.7-.72 1.72 0 1.01.74 1.99.84 2.13.1.14 1.44 2.21 3.5 3.1 1.71.74 2.06.6 2.43.56.37-.03 1.2-.49 1.37-.96.17-.48.17-.89.12-.97-.05-.08-.19-.13-.4-.24-.21-.1-1.24-.61-1.43-.68-.19-.07-.33-.1-.47.11-.14.21-.55.68-.67.82-.12.14-.24.16-.45.05-.21-.1-.89-.33-1.69-1.05-.62-.56-1.04-1.25-1.16-1.46-.12-.21-.01-.32.09-.43.09-.1.21-.26.31-.39.11-.13.14-.22.21-.37.07-.15.04-.28-.02-.39-.06-.11-.53-1.28-.73-1.75-.19-.46-.39-.4-.53-.41-.14-.01-.3-.01-.46-.01z"/>
                </svg>
                <span>SEND VIA WHATSAPP</span>
              </button>
            </>
          )}

          {/* TAB 2: IMAGE CARD SHARING */}
          {activeTab === 'image' && (
            <>
              <div className="whatsapp-image-preview-card">
                {isGenerating ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                    <span>🎨 Rendering high-res Duo Invite Card...</span>
                  </div>
                ) : cardDataUrl ? (
                  <img
                    src={cardDataUrl}
                    alt="TwoGether Duo Invite Card"
                    className="whatsapp-image-preview-img"
                  />
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
                    Failed to render card.
                  </div>
                )}
              </div>

              <div className="whatsapp-info-tip">
                <span className="whatsapp-info-tip__icon">📱</span>
                <span>
                  {navigator.canShare
                    ? 'On mobile, this opens WhatsApp directly with the image card attached.'
                    : 'Downloads the high-resolution image and opens WhatsApp so you can paste or send it.'}
                </span>
              </div>

              <button
                type="button"
                className="btn btn--whatsapp btn--block btn--lg"
                onClick={handleShareImage}
                disabled={isGenerating || !cardBlob}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zM8.53 7.33c-.14 0-.36.05-.55.26-.19.2-.72.7-.72 1.72 0 1.01.74 1.99.84 2.13.1.14 1.44 2.21 3.5 3.1 1.71.74 2.06.6 2.43.56.37-.03 1.2-.49 1.37-.96.17-.48.17-.89.12-.97-.05-.08-.19-.13-.4-.24-.21-.1-1.24-.61-1.43-.68-.19-.07-.33-.1-.47.11-.14.21-.55.68-.67.82-.12.14-.24.16-.45.05-.21-.1-.89-.33-1.69-1.05-.62-.56-1.04-1.25-1.16-1.46-.12-.21-.01-.32.09-.43.09-.1.21-.26.31-.39.11-.13.14-.22.21-.37.07-.15.04-.28-.02-.39-.06-.11-.53-1.28-.73-1.75-.19-.46-.39-.4-.53-.41-.14-.01-.3-.01-.46-.01z"/>
                </svg>
                <span>SHARE IMAGE TO WHATSAPP</span>
              </button>

              <div className="whatsapp-image-actions">
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={handleDownloadCard}
                  disabled={!cardBlob}
                >
                  📥 Download Card
                </button>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={handleCopyImageToClipboard}
                  disabled={!cardBlob}
                >
                  📋 Copy Image
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
