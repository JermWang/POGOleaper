// 🐸 POGO SHIMS — local replacements for the server-backed leaderboard,
// Twitter auth, and trophy modules. Keeps Pogo Leap fully playable offline:
// scores live in localStorage on this device.

const POGO_LB_KEY = 'pogo_leap_local_leaderboard';

const twitterAuth = {
    isAuthenticated: true,
    currentUser: { id: 'local-pogo', username: 'You' },
    async initiateAuth() {
        return this.currentUser;
    },
    updateUI() {},
    shareAchievement(text) {
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text || 'I\'m leaping with POGO THE LEAPER! 🐸')}`;
        window.open(tweetUrl, 'twitterShare', 'width=550,height=420');
    },
    shareTrophyAchievement(text) {
        this.shareAchievement(text);
    }
};

const leaderboard = {
    currentLeaderboard: [],

    async initialize() {
        await this.fetchWeeklyLeaderboard();
    },

    _load() {
        try {
            return JSON.parse(localStorage.getItem(POGO_LB_KEY)) || [];
        } catch (e) {
            return [];
        }
    },

    _save(entries) {
        try {
            localStorage.setItem(POGO_LB_KEY, JSON.stringify(entries));
        } catch (e) {
            console.warn('Could not save local leaderboard:', e);
        }
    },

    async submitScore(score) {
        if (typeof score !== 'number' || !isFinite(score) || score < 0) return;
        const entries = this._load();
        entries.push({
            user_id: twitterAuth.currentUser.id,
            username: twitterAuth.currentUser.username,
            score: Math.floor(score),
            created_at: new Date().toISOString()
        });
        entries.sort((a, b) => b.score - a.score);
        this._save(entries.slice(0, 50));
    },

    async fetchWeeklyLeaderboard() {
        this.currentLeaderboard = this._load();
        return this.currentLeaderboard;
    },

    getTimeUntilReset() {
        return 'never — all-time pond records';
    },

    getRankEmoji(rank) {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    },

    showExpandedLeaderboard() {
        const entries = this._load();
        let rows = '';
        if (entries.length === 0) {
            rows = `<p style="color: #94a3b8; margin: 12px 0;">No leaps recorded yet. Be the first frog on the board! 🐸</p>`;
        } else {
            entries.slice(0, 20).forEach((entry, index) => {
                rows += `
                    <div style="display: flex; justify-content: space-between; padding: 6px 10px;
                                background: rgba(255,255,255,0.05); border-radius: 6px; margin-bottom: 4px;
                                border: 1px solid rgba(255,255,255,0.1); font-size: 0.85rem;">
                        <span style="color: #a3e635; font-weight: 700; min-width: 32px;">${this.getRankEmoji(index + 1)}</span>
                        <span style="flex: 1; text-align: left; margin-left: 8px; color: #e2e8f0;">${entry.username}</span>
                        <span style="color: #fbbf24; font-weight: 700;">${entry.score.toLocaleString()}</span>
                    </div>`;
            });
        }
        const html = `
            <div style="max-width: 300px; margin: 0 auto; text-align: center;
                        background: linear-gradient(145deg, rgba(0,0,0,0.95), rgba(10,30,10,0.9));
                        border-radius: 16px; padding: 16px; border: 2px solid rgba(34, 197, 94, 0.4);">
                <h3 style="color: #fbbf24; margin: 0 0 4px 0;">🏆 Pond Leaderboard</h3>
                <div style="font-size: 0.7rem; color: #94a3b8; margin-bottom: 10px;">Local bests on this device</div>
                <div style="max-height: 240px; overflow-y: auto;">${rows}</div>
                <button onclick="game.hideOverlay()" style="margin-top: 12px; background: linear-gradient(135deg, #22c55e, #16a34a);
                        border: none; border-radius: 8px; padding: 8px 16px; color: white; font-weight: 700; cursor: pointer;">
                    Close
                </button>
            </div>`;
        if (window.game && typeof window.game.showOverlay === 'function') {
            window.game.showOverlay(html);
        }
    }
};

function showLeaderboard() {
    leaderboard.fetchWeeklyLeaderboard().then(() => leaderboard.showExpandedLeaderboard());
}

const trophyGenerator = {
    isLoaded: false,
    async loadTrophyImage() {
        return false;
    },
    async generateTrophy() {
        return null;
    },
    async generateAndPreview() {
        return null;
    }
};

window.twitterAuth = twitterAuth;
window.leaderboard = leaderboard;
window.trophyGenerator = trophyGenerator;
window.showLeaderboard = showLeaderboard;

console.log('🐸 Pogo shims loaded — local leaderboard active');
