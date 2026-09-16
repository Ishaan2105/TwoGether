import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getLeaderboards } from '../../services/duo.js';

export default function LeaderboardModal() {
  const { isLeaderboardOpen, closeLeaderboard, leaderboardTab, setLeaderboardTab } = useSidebar();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [soloLeaders, setSoloLeaders] = useState([]);
  const [duoLeaders, setDuoLeaders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLeaderboardOpen) return;

    let isMounted = true;
    setLoading(true);
    setError('');

    getLeaderboards()
      .then((data) => {
        if (!isMounted) return;
        const solo = data?.soloLeaderboard || [];
        const duo = data?.duoLeaderboard || [];
        setSoloLeaders(solo);
        setDuoLeaders(duo);
      })
      .catch((err) => {
        console.error('Could not fetch server leaderboards:', err);
        if (isMounted) {
          setError('Could not fetch rankings from database.');
          setSoloLeaders([]);
          setDuoLeaders([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isLeaderboardOpen]);

  // Handle Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isLeaderboardOpen) {
        closeLeaderboard();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLeaderboardOpen, closeLeaderboard]);

  if (!isLeaderboardOpen) return null;

  const handleOpenFullPage = () => {
    closeLeaderboard();
    navigate(`/leaderboard/${leaderboardTab}`);
  };

  return (
    <div className="modal-backdrop" onClick={closeLeaderboard}>
      <div
        className="leaderboard-modal modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leaderboard-title"
      >
        {/* Modal Header */}
        <div className="leaderboard-modal__header">
          <div className="leaderboard-modal__title-box">
            <div className="leaderboard-modal__icon" aria-hidden="true">
              🏆
            </div>
            <div>
              <h2 id="leaderboard-title" className="leaderboard-modal__title">
                Hall of Fame & Leaderboards
              </h2>
              <p className="leaderboard-modal__subtitle">
                Exact database rankings synced live across solo consistency & duo synergy.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={closeLeaderboard}
            aria-label="Close leaderboard"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="leaderboard-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={leaderboardTab === 'solo'}
            className={`leaderboard-tab ${leaderboardTab === 'solo' ? 'leaderboard-tab--active' : ''}`}
            onClick={() => setLeaderboardTab('solo')}
          >
            <span className="leaderboard-tab__icon">🔥</span>
            <span>Solo Leaderboard</span>
            <span className="leaderboard-tab__count">({soloLeaders.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={leaderboardTab === 'duo'}
            className={`leaderboard-tab ${leaderboardTab === 'duo' ? 'leaderboard-tab--active' : ''}`}
            onClick={() => setLeaderboardTab('duo')}
          >
            <span className="leaderboard-tab__icon">⚡</span>
            <span>Duo Leaderboard</span>
            <span className="leaderboard-tab__count">({duoLeaders.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="leaderboard-modal__body">
          {error && (
            <div className="alert alert--error" style={{ margin: '1rem' }} role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="leaderboard-loading">
              <div className="spinner" />
              <span>Fetching live rankings from database...</span>
            </div>
          ) : leaderboardTab === 'solo' ? (
            soloLeaders.length === 0 ? (
              <div className="leaderboard-modal-empty">
                <span style={{ fontSize: '2rem' }}>🔥</span>
                <h4>No Solo Players Found</h4>
                <p>No registered adventurers recorded in the database yet.</p>
              </div>
            ) : (
              <div className="leaderboard-list" role="tabpanel">
                {soloLeaders.map((player) => {
                  const isYou =
                    player.isCurrentUser ||
                    (user && player.username?.toLowerCase() === user.username?.toLowerCase());
                  const initial = (player.username?.[0] || 'U').toUpperCase();
                  const rank = player.rank;

                  return (
                    <div
                      key={player.userId || player.username || rank}
                      className={`leaderboard-row ${isYou ? 'leaderboard-row--you' : ''} ${
                        rank <= 3 ? `leaderboard-row--top-${rank}` : ''
                      }`}
                    >
                      {/* Rank Badge */}
                      <div className="leaderboard-row__rank">
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                      </div>

                      {/* Avatar Initial */}
                      <div className="leaderboard-row__avatar">
                        <span>{initial}</span>
                      </div>

                      {/* User Details */}
                      <div className="leaderboard-row__info">
                        <div className="leaderboard-row__name-row">
                          <span className="leaderboard-row__username">
                            {player.username}
                          </span>
                          {isYou && <span className="leaderboard-row__you-tag">YOU</span>}
                        </div>
                        <span className="leaderboard-row__title">
                          {player.customTitle || 'Habit Adventurer'} · Lv {player.personalLevel || 1}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="leaderboard-row__stats">
                        <div className="leaderboard-stat-pill leaderboard-stat-pill--streak">
                          <span className="leaderboard-stat-icon">🔥</span>
                          <span className="leaderboard-stat-val">{player.soloStreak || 0}d</span>
                        </div>
                        <div className="leaderboard-stat-pill leaderboard-stat-pill--xp">
                          <span className="leaderboard-stat-icon">⚡</span>
                          <span className="leaderboard-stat-val">{player.personalXP || 0} XP</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : duoLeaders.length === 0 ? (
            <div className="leaderboard-modal-empty">
              <span style={{ fontSize: '2rem' }}>🤝</span>
              <h4>No Active Duos Yet</h4>
              <p>No paired accountability teams found in the database. Pair up to climb the Duo ranks!</p>
            </div>
          ) : (
            <div className="leaderboard-list" role="tabpanel">
              {duoLeaders.map((duo) => {
                const isYourDuo = duo.isCurrentDuo;
                const rank = duo.rank;
                const members = duo.members || [];

                return (
                  <div
                    key={duo.duoId || duo.duoName || rank}
                    className={`leaderboard-row ${isYourDuo ? 'leaderboard-row--you' : ''} ${
                      rank <= 3 ? `leaderboard-row--top-${rank}` : ''
                    }`}
                  >
                    {/* Rank Badge */}
                    <div className="leaderboard-row__rank">
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                    </div>

                    {/* Duo Icon */}
                    <div className="leaderboard-row__duo-icon">
                      <span>🤝</span>
                    </div>

                    {/* Duo Details */}
                    <div className="leaderboard-row__info">
                      <div className="leaderboard-row__name-row">
                        <span className="leaderboard-row__username">
                          {duo.duoName}
                        </span>
                        {isYourDuo && <span className="leaderboard-row__you-tag">YOUR DUO</span>}
                      </div>
                      <span className="leaderboard-row__title">
                        {members.length > 0
                          ? members.map((m) => m.username).join(' & ')
                          : 'Paired Duo'}{' '}
                        · Lv {duo.duoLevel || 1}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="leaderboard-row__stats">
                      <div className="leaderboard-stat-pill leaderboard-stat-pill--streak">
                        <span className="leaderboard-stat-icon">⚡</span>
                        <span className="leaderboard-stat-val">{duo.duoStreak || 0}d</span>
                      </div>
                      <div className="leaderboard-stat-pill leaderboard-stat-pill--synergy">
                        <span className="leaderboard-stat-icon">💚</span>
                        <span className="leaderboard-stat-val">{duo.synergyScore || 100}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="leaderboard-modal__footer">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={handleOpenFullPage}
          >
            <span>⛶ Open Full Section</span>
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={closeLeaderboard}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
