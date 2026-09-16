import { useSidebar } from '../../context/SidebarContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDuo } from '../../context/DuoContext.jsx';

export default function StreakShieldModal() {
  const { isShieldModalOpen, closeShieldModal } = useSidebar();
  const { user } = useAuth();
  const { duo } = useDuo();

  if (!isShieldModalOpen) return null;

  const soloShields = user?.inventory?.streakShields ?? 1;
  const duoShields = duo?.duoShields ?? 1;

  return (
    <div className="modal-backdrop" onClick={closeShieldModal}>
      <div
        className="shield-modal modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shield-title"
      >
        <div className="shield-modal__header">
          <div className="shield-modal__icon" aria-hidden="true">
            🛡️
          </div>
          <div>
            <h2 id="shield-title" className="shield-modal__title">
              Streak Shield Vault
            </h2>
            <p className="shield-modal__subtitle">
              Automated streak defense protecting your solo discipline and Duo accountability.
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={closeShieldModal}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="shield-modal__body">
          {/* Shield Count Cards */}
          <div className="shield-cards-grid">
            <div className="shield-card">
              <div className="shield-card__badge">
                <span className="shield-card__icon">🛡️</span>
                <span className="shield-card__count">{soloShields}</span>
              </div>
              <div className="shield-card__info">
                <strong>Personal Streak Shields</strong>
                <p>Protects your personal daily check-in streak if life gets in the way.</p>
              </div>
            </div>

            <div className="shield-card">
              <div className="shield-card__badge shield-card__badge--duo">
                <span className="shield-card__icon">⚡</span>
                <span className="shield-card__count">{duoShields}</span>
              </div>
              <div className="shield-card__info">
                <strong>Shared Duo Shields</strong>
                <p>Protects the shared Duo streak if either partner misses a midnight cutoff.</p>
              </div>
            </div>
          </div>

          {/* Mechanics */}
          <div className="shield-rules">
            <span className="shield-rules__title">HOW SHIELD PROTECTION WORKS</span>
            <div className="shield-rule-item">
              <span className="shield-rule-num">1</span>
              <p><strong>Auto-Defense:</strong> If you miss a day, an available shield automatically activates at midnight to preserve your streak.</p>
            </div>
            <div className="shield-rule-item">
              <span className="shield-rule-num">2</span>
              <p><strong>Milestone Recharge:</strong> Earn +1 bonus shield for every 7-day uninterrupted streak you and your Duo achieve.</p>
            </div>
            <div className="shield-rule-item">
              <span className="shield-rule-num">3</span>
              <p><strong>Emergency SOS:</strong> Trigger an emergency nudge to notify your partner before cutoff time.</p>
            </div>
          </div>
        </div>

        <div className="shield-modal__footer">
          <button type="button" className="btn btn--primary" onClick={closeShieldModal}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
