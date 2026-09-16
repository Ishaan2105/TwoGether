import { useState, useRef, useCallback } from 'react';
import { useSidebar } from '../../context/SidebarContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDuo } from '../../context/DuoContext.jsx';
import { sendImageNudge } from '../../services/notifications.js';

// Preset stickers
const STICKERS = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '💪', label: 'Strong' },
  { emoji: '⚡', label: 'Energy' },
  { emoji: '🏆', label: 'Trophy' },
  { emoji: '🌟', label: 'Star' },
  { emoji: '😤', label: 'Focused' },
  { emoji: '👑', label: 'Crown' },
  { emoji: '🤝', label: 'Duo' },
  { emoji: '🚀', label: 'Launch' },
  { emoji: '💚', label: 'Love' },
  { emoji: '🎯', label: 'Goal' },
  { emoji: '🌈', label: 'Progress' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '😎', label: 'Cool' },
  { emoji: '🥳', label: 'Party' },
  { emoji: '👀', label: 'Eyes' },
  { emoji: '💀', label: 'Skull' },
  { emoji: '🫡', label: 'Salute' },
];

const MAX_IMAGE_SIZE = 120 * 1024; // 120 KB base64

/** Compress image File to base64 data URL under maxSize */
function compressImage(file, maxSize = MAX_IMAGE_SIZE) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const MAX_DIM = 480;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.82;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > maxSize && quality > 0.15) {
        quality -= 0.08;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(dataUrl);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function ImageNudgeModal() {
  const { isImageNudgeOpen, closeImageNudge } = useSidebar();
  const { user } = useAuth();
  const { duo, partner } = useDuo();

  const [selectedEmoji, setSelectedEmoji] = useState('🔥');
  const [message, setMessage] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [feedback, setFeedback] = useState('');

  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleClose = useCallback(() => {
    setSelectedEmoji('🔥');
    setMessage('');
    setImagePreview(null);
    setImageDataUrl(null);
    setStatus('idle');
    setFeedback('');
    closeImageNudge();
  }, [closeImageNudge]);

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFeedback('Please select an image file.');
      return;
    }
    setFeedback('');
    try {
      const compressed = await compressImage(file);
      setImagePreview(compressed);
      setImageDataUrl(compressed);
    } catch {
      setFeedback('Could not load image. Try a different file.');
    }
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageDataUrl(null);
  };

  const handleSend = async () => {
    if (status === 'loading') return;
    setStatus('loading');
    setFeedback('');
    try {
      const result = await sendImageNudge({
        imageDataUrl: imageDataUrl || null,
        message: message.trim(),
        emoji: selectedEmoji,
      });
      if (result.success) {
        setStatus('success');
        setFeedback(`Nudge fired to ${partner?.username || 'your partner'}! 🚀`);
        setTimeout(() => handleClose(), 2500);
      } else {
        setStatus('error');
        setFeedback(result.message || 'Could not send nudge.');
      }
    } catch (err) {
      setStatus('error');
      setFeedback(err?.response?.data?.message || 'Failed to send nudge.');
    }
  };

  if (!isImageNudgeOpen) return null;

  const partnerName = partner?.username || 'your partner';
  const hasDuo = !!(duo && partner);

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="image-nudge-modal modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nudge-title"
      >
        {/* ── Header ── */}
        <div className="image-nudge-modal__header">
          <div className="image-nudge-modal__title-area">
            <div className="image-nudge-modal__icon" aria-hidden="true">📸</div>
            <div>
              <h2 id="nudge-title" className="image-nudge-modal__title">Send a Secret Nudge</h2>
              <p className="image-nudge-modal__subtitle">
                {hasDuo
                  ? `Your image is hidden until ${partnerName} opens the app 🔒`
                  : 'You need a duo partner to send nudges.'}
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        {!hasDuo ? (
          <div className="image-nudge-modal__no-duo">
            <span className="image-nudge-modal__no-duo-icon">🤝</span>
            <h3>No Duo Partner Yet</h3>
            <p>Pair up with a friend using an invite code to unlock nudges.</p>
          </div>
        ) : (
          <div className="image-nudge-modal__body">

            {/* Partner chip */}
            <div className="nudge-partner-chip">
              <span className="nudge-partner-chip__avatar">{(partnerName[0] || 'P').toUpperCase()}</span>
              <span className="nudge-partner-chip__text">Sending to <strong>{partnerName}</strong></span>
              <span className="nudge-partner-chip__dot" />
            </div>

            {/* ── Section 1: Stickers ── */}
            <div className="nudge-section">
              <div className="nudge-section-header">
                <span className="nudge-section-step">1</span>
                <span className="nudge-section-label">Pick a Sticker</span>
              </div>
              <div className="nudge-sticker-grid" role="group" aria-label="Stickers">
                {STICKERS.map((s) => (
                  <button
                    key={s.emoji}
                    type="button"
                    className={`nudge-sticker${selectedEmoji === s.emoji ? ' nudge-sticker--active' : ''}`}
                    onClick={() => setSelectedEmoji(s.emoji)}
                    title={s.label}
                    aria-pressed={selectedEmoji === s.emoji}
                  >
                    {s.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Section 2: Photo ── */}
            <div className="nudge-section">
              <div className="nudge-section-header">
                <span className="nudge-section-step">2</span>
                <span className="nudge-section-label">Attach a Photo (optional)</span>
              </div>

              {imagePreview ? (
                <div className="nudge-image-preview">
                  <img src={imagePreview} alt="Nudge preview" className="nudge-image-preview__img" />
                  <button type="button" className="nudge-image-preview__remove" onClick={handleRemoveImage}>
                    ✕ Remove
                  </button>
                  <div className="nudge-image-preview__badge">🔒 Hidden until opened</div>
                </div>
              ) : (
                <div className="nudge-upload-options">
                  {/* Instant Camera */}
                  <button
                    type="button"
                    className="nudge-upload-btn nudge-upload-btn--camera"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <span className="nudge-upload-btn__icon">📷</span>
                    <span className="nudge-upload-btn__label">Take Photo</span>
                    <span className="nudge-upload-btn__hint">Instant camera</span>
                  </button>

                  {/* Gallery */}
                  <button
                    type="button"
                    className="nudge-upload-btn nudge-upload-btn--gallery"
                    onClick={() => galleryInputRef.current?.click()}
                  >
                    <span className="nudge-upload-btn__icon">🖼️</span>
                    <span className="nudge-upload-btn__label">Gallery</span>
                    <span className="nudge-upload-btn__hint">Choose photo</span>
                  </button>
                </div>
              )}

              {/* Camera input — opens device camera directly on mobile */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageFile}
                style={{ display: 'none' }}
                aria-hidden="true"
              />
              {/* Gallery input — normal file picker */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFile}
                style={{ display: 'none' }}
                aria-hidden="true"
              />
            </div>

            {/* ── Section 3: Message ── */}
            <div className="nudge-section">
              <div className="nudge-section-header">
                <span className="nudge-section-step">3</span>
                <span className="nudge-section-label">Add a Message (optional)</span>
              </div>
              <div className="nudge-message-field">
                <span className="nudge-message-field__emoji" aria-hidden="true">{selectedEmoji}</span>
                <textarea
                  className="nudge-message-field__input"
                  placeholder={`Say something to ${partnerName}…`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={120}
                  rows={2}
                />
                <span className="nudge-message-field__count">{message.length}/120</span>
              </div>
            </div>

            {/* ── Notification Preview ── */}
            <div className="nudge-preview-card">
              <span className="nudge-preview-card__label">📱 NOTIFICATION PREVIEW</span>
              <div className="nudge-preview-card__notification">
                <div className="nudge-preview-card__notif-icon">
                  <img src="/favicon.svg" alt="" width="20" height="20" />
                </div>
                <div className="nudge-preview-card__notif-content">
                  <strong>{user?.username} nudged you! 🚀</strong>
                  <span>
                    {selectedEmoji}{' '}
                    {imageDataUrl
                      ? `${user?.username} sent you a secret image nudge — tap to reveal! 🔒`
                      : message.trim() || `${user?.username} sent you a nudge!`}
                  </span>
                </div>
                {imageDataUrl && (
                  <div className="nudge-preview-card__secret-badge">🔒</div>
                )}
              </div>
              {imageDataUrl && (
                <p className="nudge-preview-card__note">
                  Image is hidden in the notification. Your partner must open the app to see it.
                </p>
              )}
            </div>

            {/* Feedback */}
            {feedback && (
              <div
                className={`nudge-feedback ${status === 'success' ? 'nudge-feedback--success' : 'nudge-feedback--error'}`}
                role="alert"
              >
                {status === 'success' ? '✅' : '⚠️'} {feedback}
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        {hasDuo && (
          <div className="image-nudge-modal__footer">
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary nudge-send-btn"
              onClick={handleSend}
              disabled={status === 'loading' || status === 'success'}
            >
              {status === 'loading' ? (
                <><span className="nudge-spinner" />Sending…</>
              ) : status === 'success' ? (
                '✅ Sent!'
              ) : (
                `🚀 Fire Nudge to ${partnerName}`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
