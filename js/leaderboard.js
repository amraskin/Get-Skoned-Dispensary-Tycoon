// ============================================================
//  GET SKONED — leaderboard.js
//  Public leaderboard via Supabase REST API
//  Setup: see README — takes ~5 minutes, totally free
// ============================================================

const LEADERBOARD = {
  // ── Fill these in after creating your Supabase project ──
  url: 'https://wphwexkmgdqkgufzpyl.supabase.co',   // e.g. 'https://abcdefgh.supabase.co'
  key: 'sb_publishable_pYXEXHkZ5wW24T01LZcLig_9M41oQEI',   // your project's anon/public key

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

  // ── Submit a score (replaces any prior score for this name from this browser) ─
  async submitScore(playerName, score, daysPlayed, reputation) {
    if (!this.enabled) return false;
    try {
      const headers = {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      };

      // Delete any existing entry for this player name saved from this browser
      const savedName = localStorage.getItem('skoned_submitted_name');
      if (savedName === playerName) {
        await fetch(`${this.url}/rest/v1/leaderboard?player_name=eq.${encodeURIComponent(playerName)}`, {
          method: 'DELETE',
          headers,
        });
      }

      const res = await fetch(`${this.url}/rest/v1/leaderboard`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ player_name: playerName, score, days_played: daysPlayed, reputation }),
      });

      if (res.ok) localStorage.setItem('skoned_submitted_name', playerName);
      return res.ok;
    } catch (e) { return false; }
  },
};
