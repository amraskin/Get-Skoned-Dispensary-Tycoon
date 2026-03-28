// ============================================================
//  GET SKONED — leaderboard.js
//  Public leaderboard via Supabase REST API
//  Setup: see README — takes ~5 minutes, totally free
// ============================================================

const LEADERBOARD = {
  // ── Fill these in after creating your Supabase project ──
  url: 'https://wphwexkmgdqkgufzpfyl.supabase.co',   // e.g. 'https://abcdefgh.supabase.co'
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwaHdleGttZ2Rxa2d1ZnpwZnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjY4MTcsImV4cCI6MjA5MDE0MjgxN30.LPduHzo1x_8ZbV5F6Xs78erY5SyHIS3_mAyQHQCr6jE',   // your project's anon/public key

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
