// ============================================================
//  GET SKONED — music.js
//  Playlist (loops continuously):
//    1. "Because I Got High"  — Afroman       (WeYsTmIzjkw)
//    2. "Lemon Pound Cake"    — Afroman       (9xxK5yyecRo)
//
//  IMPORTANT: Must run via the local server (start_game.command)
//  YouTube's API is blocked on file:// URLs.
// ============================================================

// Song order — add more IDs here to extend the playlist
const PLAYLIST = [
  'WeYsTmIzjkw',   // Because I Got High — Afroman
  '9xxK5yyecRo',   // Lemon Pound Cake   — Afroman
];

class MusicPlayer {
  constructor() {
    this.player       = null;
    this.playing      = false;
    this.ready        = false;
    this.volume       = 65;          // 0–100
    this._pendingPlay = false;
    this._trackIndex  = 0;           // which song is playing
    this._onFile      = window.location.protocol !== 'file:';  // true = served via http
  }

  // ─── Called once at game boot ─────────────────────────────
  init() {
    if (!this._onFile) {
      // Running as file:// — YouTube won't work; warn in console
      console.warn(
        '[Music] Running as file:// — YouTube is blocked.\n' +
        'Double-click start_game.command to launch with music!'
      );
      this._showFileWarning();
      return;
    }

    // Expose the callback YouTube calls when its API script loads
    window.onYouTubeIframeAPIReady = () => {
      this.player = new YT.Player('yt-player', {
        height:  '1',
        width:   '1',
        videoId: PLAYLIST[0],
        playerVars: {
          autoplay:       0,
          loop:           1,
          // Pass full playlist so the API cycles through all tracks
          playlist:       PLAYLIST.join(','),
          controls:       0,
          disablekb:      1,
          fs:             0,
          modestbranding: 1,
          rel:            0,
          origin:         window.location.origin,
        },
        events: {
          onReady: (e) => {
            this.ready = true;
            e.target.setVolume(this.volume);
            if (this._pendingPlay) {
              e.target.playVideo();
              this.playing      = true;
              this._pendingPlay = false;
              this._updateBtn();
            }
          },
          onError: (e) => {
            // If a track errors (e.g. not embeddable), skip to the next one
            console.warn('[Music] YouTube player error code:', e.data, '— skipping track');
            if (this.playing) this._nextTrack();
          },
          onStateChange: (e) => {
            // ENDED (0) — advance to next track manually as a fallback
            if (e.data === 0 && this.playing) this._nextTrack();
          },
        },
      });
    };

    // Dynamically inject the YouTube IFrame API script (once)
    if (!document.getElementById('yt-api-script')) {
      const tag    = document.createElement('script');
      tag.id       = 'yt-api-script';
      tag.src      = 'https://www.youtube.com/iframe_api';
      tag.async    = true;
      tag.onerror  = () => console.warn('[Music] Failed to load YouTube API (no internet?)');
      document.head.appendChild(tag);
    }
  }

  // ─── Public controls ──────────────────────────────────────
  start() {
    if (!this._onFile) return;   // silently skip on file://

    if (!this.ready) {
      this._pendingPlay = true;  // play as soon as API is ready
      return;
    }
    this.player.playVideo();
    this.playing = true;
    this._updateBtn();
  }

  stop() {
    this._pendingPlay = false;
    if (!this.ready || !this.player) return;
    this.player.pauseVideo();
    this.playing = false;
    this._updateBtn();
  }

  toggle() {
    if (this.playing) this.stop();
    else              this.start();
    return this.playing;
  }

  setVolume(v) {
    this.volume = Math.round(Math.max(0, Math.min(100, v)));
    if (this.ready && this.player) this.player.setVolume(this.volume);
  }

  // ─── Advance to next track (wraps around) ─────────────────
  _nextTrack() {
    if (!this.ready || !this.player) return;
    this._trackIndex = (this._trackIndex + 1) % PLAYLIST.length;
    this.player.loadVideoById(PLAYLIST[this._trackIndex]);
  }

  // ─── UI helpers ───────────────────────────────────────────
  _updateBtn() {
    const btn = document.getElementById('btn-music-toggle');
    if (!btn) return;
    if (this.playing) {
      btn.textContent = '🔊';
      btn.title       = 'Mute music';
      btn.classList.remove('muted');
    } else {
      btn.textContent = '🔇';
      btn.title       = 'Play music';
      btn.classList.add('muted');
    }
  }

  // Subtle one-time tooltip nudging the user to use the launcher
  _showFileWarning() {
    const btn = document.getElementById('btn-music-toggle');
    if (btn) {
      btn.title   = '🎵 Open via start_game.command for music!';
      btn.style.animation = 'neonPulse 1.5s ease-in-out 3';
    }
  }
}

// ─── Global singleton ─────────────────────────────────────
window.musicPlayer = new MusicPlayer();
