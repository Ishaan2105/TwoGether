import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useDuo } from '../context/DuoContext.jsx';
import * as duoService from '../services/duo.js';

export default function LeaderboardPage() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { duo } = useDuo();

  const currentTab = tab === 'duo' ? 'duo' : 'solo';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [soloLeaders, setSoloLeaders] = useState([]);
  const [duoLeaders, setDuoLeaders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('streak'); // 'streak' | 'xp' | 'level'

  const fetchLeaderboards = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      const res = await duoService.getLeaderboards();
      const solo = res?.soloLeaderboard || [];
      const duoList = res?.duoLeaderboard || [];

      setSoloLeaders(solo);
      setDuoLeaders(duoList);
    } catch (err) {
      console.error('Failed to load leaderboards from database:', err);
      setError('Could not fetch latest rankings from database. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboards();
  }, [fetchLeaderboards]);

  const handleTabChange = (newTab) => {
    navigate(`/leaderboard/${newTab}`);
  };

  // Filter and Sort Solo Leaders
  const filteredSoloLeaders = useMemo(() => {
    let list = [...soloLeaders];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.username?.toLowerCase().includes(q) ||
          u.customTitle?.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'xp') {
      list.sort((a, b) => (b.personalXP || 0) - (a.personalXP || 0));
    } else if (sortBy === 'level') {
      list.sort((a, b) => (b.personalLevel || 1) - (a.personalLevel || 1));
    } else {
      list.sort((a, b) => (b.soloStreak || 0) - (a.soloStreak || 0));
    }

    // Re-assign display ranks
    return list.map((item, idx) => ({ ...item, displayRank: idx + 1 }));
  }, [soloLeaders, searchQuery, sortBy]);

  // Filter and Sort Duo Leaders
  const filteredDuoLeaders = useMemo(() => {
    let list = [...duoLeaders];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.duoName?.toLowerCase().includes(q) ||
          d.members?.some((m) => m.username?.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'xp') {
      list.sort((a, b) => (b.duoXP || 0) - (a.duoXP || 0));
    } else if (sortBy === 'level') {
      list.sort((a, b) => (b.duoLevel || 1) - (a.duoLevel || 1));
    } else {
      list.sort((a, b) => (b.duoStreak || 0) - (a.duoStreak || 0));
    }

    return list.map((item, idx) => ({ ...item, displayRank: idx + 1 }));
  }, [duoLeaders, searchQuery, sortBy]);

  const top3Solo = filteredSoloLeaders.slice(0, 3);
  const remainingSolo = filteredSoloLeaders.slice(3);

  const top3Duo = filteredDuoLeaders.slice(0, 3);
  const remainingDuo = filteredDuoLeaders.slice(3);

  return (
    <div className="app-shell">
      <main className="container leaderboard-page">
        {/* Page Hero Header */}
        <section className="leaderboard-hero">
          <div className="leaderboard-hero__content">
            <div className="leaderboard-hero__tag">
              <span className="badge badge--pill">🏆 HALL OF FAME</span>
              <span className="leaderboard-hero__live-dot" />
              <span className="leaderboard-hero__live-text">Live Database Sync</span>
            </div>
            <h1>
              {currentTab === 'solo' ? 'Solo Habit Leaderboard' : 'Duo Synergy Leaderboard'}
            </h1>
            <p className="leaderboard-hero__subtitle">
              {currentTab === 'solo'
                ? 'Ranking all registered adventurers across unbroken daily streaks, earned XP, and habit mastery.'
                : 'Ranking active Duos maintaining mutual accountability and co-op habit synergy.'}
            </p>
          </div>

          <div className="leaderboard-hero__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => fetchLeaderboards(true)}
              disabled={refreshing || loading}
              title="Refresh Leaderboard Data"
            >
              <span className={refreshing ? 'spinning' : ''}>🔄</span>
              <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          </div>
        </section>

        {/* Global Error Notice */}
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        {/* Tab & Filter Control Bar */}
        <section className="leaderboard-controls">
          {/* Tabs */}
          <div className="leaderboard-main-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={currentTab === 'solo'}
              className={`leaderboard-main-tab leaderboard-main-tab--solo ${currentTab === 'solo' ? 'leaderboard-main-tab--active' : ''}`}
              onClick={() => handleTabChange('solo')}
            >
              <span className="leaderboard-main-tab__icon">🔥</span>
              <span>Solo Leaderboard</span>
              <span className="leaderboard-main-tab__count">({soloLeaders.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={currentTab === 'duo'}
              className={`leaderboard-main-tab leaderboard-main-tab--duo ${currentTab === 'duo' ? 'leaderboard-main-tab--active' : ''}`}
              onClick={() => handleTabChange('duo')}
            >
              <span className="leaderboard-main-tab__icon">⚡</span>
              <span>Duo Leaderboard</span>
              <span className="leaderboard-main-tab__count">({duoLeaders.length})</span>
            </button>
          </div>

          {/* Search & Sort */}
          <div className="leaderboard-filters">
            <div className="leaderboard-search">
              <span className="leaderboard-search__icon" aria-hidden="true">
                🔍
              </span>
              <input
                type="text"
                placeholder={
                  currentTab === 'solo' ? 'Search by username or title…' : 'Search by duo or partner…'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="leaderboard-search__input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="leaderboard-search__clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div
              className={`leaderboard-sort-group leaderboard-sort-group--${currentTab}`}
              data-tab={currentTab}
              role="group"
              aria-label="Sort rankings"
            >
              <span className="leaderboard-sort-label">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <span>Sort by:</span>
              </span>
              <div className="leaderboard-sort-pills">
                <button
                  type="button"
                  className={`sort-pill sort-pill--streak ${sortBy === 'streak' ? 'sort-pill--active' : ''}`}
                  onClick={() => setSortBy('streak')}
                  data-sort="streak"
                  aria-pressed={sortBy === 'streak'}
                >
                  <span className="sort-pill__icon">🔥</span>
                  <span>Streak</span>
                </button>
                <button
                  type="button"
                  className={`sort-pill sort-pill--xp ${sortBy === 'xp' ? 'sort-pill--active' : ''}`}
                  onClick={() => setSortBy('xp')}
                  data-sort="xp"
                  aria-pressed={sortBy === 'xp'}
                >
                  <span className="sort-pill__icon">⚡</span>
                  <span>XP</span>
                </button>
                <button
                  type="button"
                  className={`sort-pill sort-pill--level ${sortBy === 'level' ? 'sort-pill--active' : ''}`}
                  onClick={() => setSortBy('level')}
                  data-sort="level"
                  aria-pressed={sortBy === 'level'}
                >
                  <span className="sort-pill__icon">👑</span>
                  <span>Level</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="leaderboard-loading-state">
            <div className="spinner" />
            <p>Loading database rankings…</p>
          </div>
        ) : currentTab === 'solo' ? (
          /* ======================================================== */
          /* SOLO LEADERBOARD VIEW                                    */
          /* ======================================================== */
          <div className="leaderboard-view">
            {filteredSoloLeaders.length === 0 ? (
              <div className="leaderboard-empty card">
                <span className="leaderboard-empty__icon">🔍</span>
                <h3>No players found</h3>
                <p>
                  {searchQuery
                    ? `No players matched your search filter "${searchQuery}".`
                    : 'No registered users found in the database yet.'}
                </p>
                {searchQuery && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSearchQuery('')}>
                    Reset search
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* 3-Card Podium ONLY when 3 or more real players exist and no search is active */}
                {filteredSoloLeaders.length >= 3 && !searchQuery && (
                  <div className="leaderboard-podium">
                    {/* Rank 2 (Silver) */}
                    {top3Solo[1] && (
                      <div className="podium-card podium-card--silver">
                        <div className="podium-card__rank-badge">🥈 #2</div>
                        <div className="podium-card__avatar">
                          <span>{(top3Solo[1].username?.[0] || 'U').toUpperCase()}</span>
                        </div>
                        <div className="podium-card__info">
                          <strong className="podium-card__username">
                            {top3Solo[1].username}
                            {top3Solo[1].isCurrentUser && <span className="badge-you">YOU</span>}
                          </strong>
                          <span className="podium-card__title">{top3Solo[1].customTitle}</span>
                        </div>
                        <div className="podium-card__stats">
                          <div className="podium-stat">
                            <span className="podium-stat__label">STREAK</span>
                            <span className="podium-stat__val">{top3Solo[1].soloStreak || 0}d</span>
                          </div>
                          <div className="podium-stat">
                            <span className="podium-stat__label">LEVEL</span>
                            <span className="podium-stat__val">Lv {top3Solo[1].personalLevel || 1}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rank 1 (Gold Champion) */}
                    {top3Solo[0] && (
                      <div className="podium-card podium-card--gold">
                        <div className="podium-card__crown">👑</div>
                        <div className="podium-card__rank-badge">🥇 #1 CHAMPION</div>
                        <div className="podium-card__avatar">
                          <span>{(top3Solo[0].username?.[0] || 'U').toUpperCase()}</span>
                        </div>
                        <div className="podium-card__info">
                          <strong className="podium-card__username">
                            {top3Solo[0].username}
                            {top3Solo[0].isCurrentUser && <span className="badge-you">YOU</span>}
                          </strong>
                          <span className="podium-card__title">{top3Solo[0].customTitle}</span>
                        </div>
                        <div className="podium-card__stats">
                          <div className="podium-stat">
                            <span className="podium-stat__label">SOLO STREAK</span>
                            <span className="podium-stat__val podium-stat__val--highlight">
                              🔥 {top3Solo[0].soloStreak || 0} Days
                            </span>
                          </div>
                          <div className="podium-stat">
                            <span className="podium-stat__label">TOTAL XP</span>
                            <span className="podium-stat__val">⚡ {top3Solo[0].personalXP || 0} XP</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rank 3 (Bronze) */}
                    {top3Solo[2] && (
                      <div className="podium-card podium-card--bronze">
                        <div className="podium-card__rank-badge">🥉 #3</div>
                        <div className="podium-card__avatar">
                          <span>{(top3Solo[2].username?.[0] || 'U').toUpperCase()}</span>
                        </div>
                        <div className="podium-card__info">
                          <strong className="podium-card__username">
                            {top3Solo[2].username}
                            {top3Solo[2].isCurrentUser && <span className="badge-you">YOU</span>}
                          </strong>
                          <span className="podium-card__title">{top3Solo[2].customTitle}</span>
                        </div>
                        <div className="podium-card__stats">
                          <div className="podium-stat">
                            <span className="podium-stat__label">STREAK</span>
                            <span className="podium-stat__val">{top3Solo[2].soloStreak || 0}d</span>
                          </div>
                          <div className="podium-stat">
                            <span className="podium-stat__label">LEVEL</span>
                            <span className="podium-stat__val">Lv {top3Solo[2].personalLevel || 1}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Player Rankings List (renders remaining ranks if podium is shown, or full list if < 3 players) */}
                {((filteredSoloLeaders.length >= 3 && !searchQuery ? remainingSolo : filteredSoloLeaders).length > 0) && (
                  <div className="leaderboard-full-list">
                    <div className="leaderboard-table-header">
                      <span className="col-rank">RANK</span>
                      <span className="col-player">DATABASE USER</span>
                      <span className="col-streak">STREAK</span>
                      <span className="col-level">LEVEL</span>
                      <span className="col-xp">XP</span>
                    </div>

                    {(filteredSoloLeaders.length >= 3 && !searchQuery ? remainingSolo : filteredSoloLeaders).map((player) => {
                      const isYou = player.isCurrentUser;
                      const initial = (player.username?.[0] || 'U').toUpperCase();
                      const rank = player.displayRank;

                      return (
                        <div
                          key={player.userId || player.username || rank}
                          className={`leaderboard-full-row ${isYou ? 'leaderboard-full-row--you' : ''} ${
                            rank === 1 ? 'row--top1' : rank === 2 ? 'row--top2' : rank === 3 ? 'row--top3' : ''
                          }`}
                        >
                          <div className="col-rank">
                            <span
                              className={`rank-badge ${
                                rank === 1
                                  ? 'rank-badge--1'
                                  : rank === 2
                                  ? 'rank-badge--2'
                                  : rank === 3
                                  ? 'rank-badge--3'
                                  : ''
                              }`}
                            >
                              {rank === 1 ? '🥇 #1' : rank === 2 ? '🥈 #2' : rank === 3 ? '🥉 #3' : `#${rank}`}
                            </span>
                          </div>

                          <div className="col-player">
                            <div className="player-avatar">
                              <span>{initial}</span>
                            </div>
                            <div className="player-info">
                              <div className="player-name-row">
                                <span className="player-name">{player.username}</span>
                                {isYou && <span className="badge-you">YOU</span>}
                              </div>
                              <span className="player-title">{player.customTitle || 'Habit Adventurer'}</span>
                            </div>
                          </div>

                          <div className="col-streak">
                            <span className="streak-pill">
                              🔥 <strong>{player.soloStreak || 0}</strong> days
                            </span>
                            {player.highestSoloStreak > player.soloStreak && (
                              <span className="streak-best">Best: {player.highestSoloStreak}d</span>
                            )}
                          </div>

                          <div className="col-level">
                            <span className="level-badge">⚡ Lv {player.personalLevel || 1}</span>
                          </div>

                          <div className="col-xp">
                            <span className="xp-val">{player.personalXP || 0} XP</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* ======================================================== */
          /* DUO LEADERBOARD VIEW                                     */
          /* ======================================================== */
          <div className="leaderboard-view">
            {filteredDuoLeaders.length === 0 ? (
              <div className="leaderboard-empty card">
                <span className="leaderboard-empty__icon">🤝</span>
                <h3>No Active Duos in Database</h3>
                <p>
                  {searchQuery
                    ? `No Duo teams matched your search filter "${searchQuery}".`
                    : 'There are currently 0 active paired duos in the database. Pair up using an invite code to appear here!'}
                </p>
                {!user?.duoId && (
                  <Link to="/dashboard" className="btn btn--primary btn--sm" style={{ marginTop: '0.75rem' }}>
                    Go to Duo Hub & Pair Up
                  </Link>
                )}
              </div>
            ) : (
              <>
                {/* Duo Podium ONLY when 3 or more duos exist and no search is active */}
                {filteredDuoLeaders.length >= 3 && !searchQuery && (
                  <div className="leaderboard-podium">
                    {/* Rank 2 (Silver Duo) */}
                    {top3Duo[1] && (
                      <div className="podium-card podium-card--silver">
                        <div className="podium-card__rank-badge">🥈 #2 DUO</div>
                        <div className="podium-card__avatar podium-card__avatar--duo">
                          <span>🤝</span>
                        </div>
                        <div className="podium-card__info">
                          <strong className="podium-card__username">
                            {top3Duo[1].duoName}
                            {top3Duo[1].isCurrentDuo && <span className="badge-you">YOUR DUO</span>}
                          </strong>
                          <span className="podium-card__title">
                            {top3Duo[1].members?.map((m) => m.username).join(' & ') || 'Duo Partners'}
                          </span>
                        </div>
                        <div className="podium-card__stats">
                          <div className="podium-stat">
                            <span className="podium-stat__label">DUO STREAK</span>
                            <span className="podium-stat__val">{top3Duo[1].duoStreak || 0}d</span>
                          </div>
                          <div className="podium-stat">
                            <span className="podium-stat__label">SYNERGY</span>
                            <span className="podium-stat__val">{top3Duo[1].synergyScore || 100}%</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rank 1 (Gold Champion Duo) */}
                    {top3Duo[0] && (
                      <div className="podium-card podium-card--gold">
                        <div className="podium-card__crown">👑</div>
                        <div className="podium-card__rank-badge">🥇 #1 TOP DUO</div>
                        <div className="podium-card__avatar podium-card__avatar--duo">
                          <span>🤝</span>
                        </div>
                        <div className="podium-card__info">
                          <strong className="podium-card__username">
                            {top3Duo[0].duoName}
                            {top3Duo[0].isCurrentDuo && <span className="badge-you">YOUR DUO</span>}
                          </strong>
                          <span className="podium-card__title">
                            {top3Duo[0].members?.map((m) => m.username).join(' & ') || 'Duo Partners'}
                          </span>
                        </div>
                        <div className="podium-card__stats">
                          <div className="podium-stat">
                            <span className="podium-stat__label">DUO STREAK</span>
                            <span className="podium-stat__val podium-stat__val--highlight">
                              ⚡ {top3Duo[0].duoStreak || 0} Days
                            </span>
                          </div>
                          <div className="podium-stat">
                            <span className="podium-stat__label">SYNERGY SCORE</span>
                            <span className="podium-stat__val">💚 {top3Duo[0].synergyScore || 100}%</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rank 3 (Bronze Duo) */}
                    {top3Duo[2] && (
                      <div className="podium-card podium-card--bronze">
                        <div className="podium-card__rank-badge">🥉 #3 DUO</div>
                        <div className="podium-card__avatar podium-card__avatar--duo">
                          <span>🤝</span>
                        </div>
                        <div className="podium-card__info">
                          <strong className="podium-card__username">
                            {top3Duo[2].duoName}
                            {top3Duo[2].isCurrentDuo && <span className="badge-you">YOUR DUO</span>}
                          </strong>
                          <span className="podium-card__title">
                            {top3Duo[2].members?.map((m) => m.username).join(' & ') || 'Duo Partners'}
                          </span>
                        </div>
                        <div className="podium-card__stats">
                          <div className="podium-stat">
                            <span className="podium-stat__label">DUO STREAK</span>
                            <span className="podium-stat__val">{top3Duo[2].duoStreak || 0}d</span>
                          </div>
                          <div className="podium-stat">
                            <span className="podium-stat__label">SYNERGY</span>
                            <span className="podium-stat__val">{top3Duo[2].synergyScore || 100}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Duo Rankings List */}
                {((filteredDuoLeaders.length >= 3 && !searchQuery ? remainingDuo : filteredDuoLeaders).length > 0) && (
                  <div className="leaderboard-full-list">
                    <div className="leaderboard-table-header">
                      <span className="col-rank">RANK</span>
                      <span className="col-player">DUO TEAM</span>
                      <span className="col-streak">DUO STREAK</span>
                      <span className="col-level">SYNERGY</span>
                      <span className="col-xp">DUO LEVEL</span>
                    </div>

                    {(filteredDuoLeaders.length >= 3 && !searchQuery ? remainingDuo : filteredDuoLeaders).map((team) => {
                      const isYourDuo = team.isCurrentDuo;
                      const rank = team.displayRank;
                      const members = team.members || [];

                      return (
                        <div
                          key={team.duoId || team.duoName || rank}
                          className={`leaderboard-full-row ${isYourDuo ? 'leaderboard-full-row--you' : ''} ${
                            rank === 1 ? 'row--top1' : rank === 2 ? 'row--top2' : rank === 3 ? 'row--top3' : ''
                          }`}
                        >
                          <div className="col-rank">
                            <span
                              className={`rank-badge ${
                                rank === 1
                                  ? 'rank-badge--1'
                                  : rank === 2
                                  ? 'rank-badge--2'
                                  : rank === 3
                                  ? 'rank-badge--3'
                                  : ''
                              }`}
                            >
                              {rank === 1 ? '🥇 #1' : rank === 2 ? '🥈 #2' : rank === 3 ? '🥉 #3' : `#${rank}`}
                            </span>
                          </div>

                          <div className="col-player">
                            <div className="player-avatar player-avatar--duo">
                              <span>🤝</span>
                            </div>
                            <div className="player-info">
                              <div className="player-name-row">
                                <span className="player-name">{team.duoName}</span>
                                {isYourDuo && <span className="badge-you">YOUR DUO</span>}
                              </div>
                              <span className="player-title">
                                {members.length > 0
                                  ? members.map((m) => `@${m.username} (Lv ${m.level})`).join(' · ')
                                  : 'Active Duo'}
                              </span>
                            </div>
                          </div>

                          <div className="col-streak">
                            <span className="streak-pill">
                              ⚡ <strong>{team.duoStreak || 0}</strong> days
                            </span>
                            {team.highestStreak > team.duoStreak && (
                              <span className="streak-best">Best: {team.highestStreak}d</span>
                            )}
                          </div>

                          <div className="col-level">
                            <span className="synergy-badge">💚 {team.synergyScore || 100}%</span>
                          </div>

                          <div className="col-xp">
                            <span className="level-badge">Lv {team.duoLevel || 1}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
