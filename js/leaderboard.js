// ============================================================
//  GET SKONED — leaderboard.js
//  Public leaderboard via Supabase REST API
//  Setup: see README — takes ~5 minutes, totally free
// ============================================================

const LEADERBOARD = {
  // ── Fill these in after creating your Supabase project ──
  url: '',   // e.g. 'https://abcdefgh.supabase.co'
  key: '',   // your project's anon/public key

  get enabled() {
    return !!(this.url && this.key);
  },

  // ── Fetch top scores ─────────────────────────────────────
  async getTopScores(limit = 10) {
    if (!this.enabled) return null;
    try {
      const res = await fetch(
        `${this.url}/rest/v1/leaderboard?order=score.desc&limit=${limit}&select=player_name,score,days_played,reputation`,
        { headers: { apikey: this.key, Authorization: `Bearer ${this.key}` } }
      );
      return res.ok ? await res.json() : null;
    } catch (e) { return null; }
  },

  // ── Submit a score ───────────────────────────────────────
  async submitScore(playerName, score, daysPlayed, reputation) {
    if (!this.enabled) return false;
    try {
      const res = await fetch(`${this.url}/rest/v1/leaderboard`, {
        method: 'POST',
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ player_name: playerName, score, days_played: daysPlayed, reputation }),
      });
      return res.ok;
    } catch (e) { return false; }
  },
};
