#!/bin/bash
# ============================================================
#  GET SKONED — Game Launcher
#  Double-click this file to start the game with music!
# ============================================================

# Move to the folder this script lives in
cd "$(dirname "$0")"

echo "╔═══════════════════════════════════════╗"
echo "║     🌿  GET SKONED  — Launching...    ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Free port 8080 if something is already using it
EXISTING=$(lsof -ti:8080 2>/dev/null)
if [ -n "$EXISTING" ]; then
  echo "⚡ Clearing port 8080..."
  echo "$EXISTING" | xargs kill -9 2>/dev/null
  sleep 0.3
fi

# Start the local web server in the background
python3 -m http.server 8080 &
SERVER_PID=$!
echo "✅ Server started (PID $SERVER_PID) at http://localhost:8080"
echo ""

# Give the server a moment to be ready, then open the browser
sleep 0.6
open "http://localhost:8080"

echo "🎮 Game is open in your browser."
echo "🎵 Music will start when you click 'Open for Business'."
echo ""
echo "────────────────────────────────────────"
echo "  Close this window to stop the server."
echo "────────────────────────────────────────"

# Keep script alive (so the server keeps running)
wait $SERVER_PID
