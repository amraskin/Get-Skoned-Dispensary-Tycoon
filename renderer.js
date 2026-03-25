// ============================================================
//  GET SKONED — renderer.js
//  Draws the Skones dispensary store on canvas
// ============================================================

class StoreRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.W      = canvas.width;
    this.H      = canvas.height;
    this.time   = 0;         // for animations
    this.moneyParticles = [];
    this.floatTexts     = [];

    // Preload the real Skones logo for the chalkboard wall
    this.logoImg = new Image();
    this.logoImg.src = 'img/logo.png';
  }

  // ─── Main render ──────────────────────────────────────────
  render(gameState, customers, currentCustomer) {
    this.time += 0.016;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);

    this.drawBackground();
    this.drawFloor();
    this.drawBackWallLeft();
    this.drawFeatureWall();
    this.drawArchNiche();
    this.drawPendantLight(215, 0,  95);
    this.drawPendantLight(745, 0,  80);
    this.drawCounter();
    this.drawCounterProducts(gameState);
    this.drawBudtender();

    // Draw customers
    if (customers) {
      customers.forEach(c => c.draw(ctx, this.time));
    }

    this.updateAndDrawParticles(ctx);
    this.updateAndDrawFloatTexts(ctx);
  }

  // ─── Background walls & ceiling ───────────────────────────
  drawBackground() {
    const { ctx, W, H } = this;

    // Main wall — off-white
    ctx.fillStyle = CONFIG.colors.wallBg;
    ctx.fillRect(0, 0, W, H * 0.72);

    // Ceiling coffer (slightly darker strip)
    ctx.fillStyle = '#E8E4DE';
    ctx.fillRect(0, 0, W, 30);

    // Recessed ceiling panel (inset look)
    ctx.strokeStyle = '#D8D0C8';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 6, W - 80, 22);

    // Ceiling track lighting dots
    ctx.fillStyle = '#FFFEF8';
    [120, 250, 400, 560, 710, 840].forEach(x => {
      ctx.beginPath();
      ctx.arc(x, 17, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#C8C0B8';
      ctx.lineWidth = 1;
      ctx.stroke();
      // small glow
      const g = ctx.createRadialGradient(x, 17, 0, x, 17, 12);
      g.addColorStop(0, 'rgba(255,252,220,0.5)');
      g.addColorStop(1, 'rgba(255,252,220,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, 17, 12, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ─── Floor ────────────────────────────────────────────────
  drawFloor() {
    const { ctx, W, H } = this;
    const floorY = Math.round(H * 0.72);

    // Base tile color
    ctx.fillStyle = CONFIG.colors.floorTile;
    ctx.fillRect(0, floorY, W, H - floorY);

    // Tile grid lines (perspective-ish: horizontal = uniform, vertical = converging)
    ctx.strokeStyle = CONFIG.colors.floorTileGrid;
    ctx.lineWidth = 0.8;

    // Horizontal grout lines
    const tileH = 52;
    for (let y = floorY; y < H + tileH; y += tileH) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    // Vertical grout lines
    const tileW = 52;
    for (let x = 0; x < W + tileW; x += tileW) {
      ctx.beginPath();
      ctx.moveTo(x, floorY);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // Subtle floor sheen
    const sheen = ctx.createLinearGradient(0, floorY, 0, H);
    sheen.addColorStop(0, 'rgba(255,255,255,0.18)');
    sheen.addColorStop(0.4,'rgba(255,255,255,0.04)');
    sheen.addColorStop(1, 'rgba(0,0,0,0.05)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, floorY, W, H - floorY);
  }

  // ─── Left wall shelving ───────────────────────────────────
  drawBackWallLeft() {
    const { ctx } = this;

    // Shelf unit frame
    ctx.fillStyle = CONFIG.colors.shelfWood;
    ctx.fillRect(18, 55, 165, 310);

    // Shelf back panel (lighter)
    ctx.fillStyle = '#D8BC90';
    ctx.fillRect(24, 61, 153, 298);

    // Horizontal shelves
    ctx.fillStyle = CONFIG.colors.shelfWood;
    [100, 160, 220, 280, 338].forEach(y => {
      ctx.fillRect(24, y, 153, 10);
    });

    // Decorative items on shelves (abstract product rectangles)
    const colors = ['#4A8A40','#3080B0','#C04080','#8A6A30','#6840A0'];
    [[34, 72],[80, 68],[126, 75],
     [34,130],[68,132],[105,128],[140,131],
     [34,188],[58,190],[92,186],[125,183],[155,188],
     [34,245],[70,248],[110,244],[148,246],
     [34,302],[72,298],[115,304],[152,300]].forEach(([x,y], i) => {
      ctx.fillStyle = colors[i % colors.length];
      const w = 22 + (i % 3) * 6;
      const h = 20 + (i % 4) * 8;
      // Label band
      ctx.fillRect(x, y - h, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x, y - h + 3, w, 6);
      ctx.fillStyle = colors[i % colors.length];
    });

    // Shelf unit outer shadow
    ctx.strokeStyle = '#9A7840';
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 55, 165, 310);
  }

  // ─── Feature / chalkboard wall (centre) ───────────────────
  drawFeatureWall() {
    const { ctx, W } = this;
    const fx = 200, fy = 30, fw = 540, fh = 340;

    // Dark chalkboard panel
    ctx.fillStyle = '#161616';
    ctx.fillRect(fx, fy, fw, fh);

    // Chalkboard texture (subtle noise lines)
    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      const y = fy + Math.random() * fh;
      ctx.beginPath();
      ctx.moveTo(fx, y);
      ctx.lineTo(fx + fw, y + (Math.random() - 0.5) * 6);
      ctx.stroke();
    }

    // "WELCOME" chalk writing
    ctx.save();
    ctx.font = 'italic 16px Georgia';
    ctx.fillStyle = 'rgba(200,200,200,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('WELCOME', W / 2, fy + 48);
    ctx.restore();

    // Chalk doodles / cannabis leaves (abstract)
    this.drawChalkDoodles(fx + 30, fy + 60, fw - 60, fh - 80);

    // ── GET SKONED neon sign ──
    const nx = W / 2, ny = fy + 160;
    this.drawNeonSign(nx, ny);

    // Chalkboard border
    ctx.strokeStyle = '#2A2A2A';
    ctx.lineWidth = 3;
    ctx.strokeRect(fx, fy, fw, fh);
  }

  drawChalkDoodles(x, y, w, h) {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = 'rgba(180,180,180,0.2)';
    ctx.fillStyle   = 'rgba(180,180,180,0.15)';
    ctx.lineWidth = 1.2;

    // Simple cannabis leaf shape
    const drawLeaf = (cx, cy, size) => {
      ctx.save();
      ctx.translate(cx, cy);
      for (let i = 0; i < 7; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI * 2) / 7 - Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.7, size * 0.2, size * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      // stem
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, size * 0.4);
      ctx.stroke();
      ctx.restore();
    };

    [[x+30, y+60, 18],[x+w-40, y+50, 14],[x+20, y+h-30, 16],
     [x+w-30, y+h-25, 12],[x+w/2-80, y+20, 10]].forEach(([cx,cy,s]) => drawLeaf(cx,cy,s));

    // small stars / sparkles
    ctx.strokeStyle = 'rgba(200,200,200,0.25)';
    [[x+80,y+30],[x+w-80,y+80],[x+50,y+h-50],[x+w-50,y+30]].forEach(([sx,sy]) => {
      ctx.beginPath();
      ctx.moveTo(sx-6,sy); ctx.lineTo(sx+6,sy);
      ctx.moveTo(sx,sy-6); ctx.lineTo(sx,sy+6);
      ctx.moveTo(sx-4,sy-4); ctx.lineTo(sx+4,sy+4);
      ctx.moveTo(sx+4,sy-4); ctx.lineTo(sx-4,sy+4);
      ctx.stroke();
    });

    ctx.restore();
  }

  drawNeonSign(cx, cy) {
    const { ctx, time, logoImg } = this;
    const pulse = 0.85 + 0.15 * Math.sin(time * 1.5);

    ctx.save();

    if (logoImg.complete && logoImg.naturalWidth > 0) {
      // ── Real logo with neon-green tint + glow ──
      const logoW = 300;
      const logoH = logoW * (logoImg.naturalHeight / logoImg.naturalWidth);
      const lx    = cx - logoW / 2;
      const ly    = cy - logoH / 2;

      // Glow via shadow (applied before drawing)
      ctx.shadowColor = `rgba(140, 255, 30, ${0.9 * pulse})`;
      ctx.shadowBlur  = 22 * pulse;

      // Tint white logo pixels to neon green using compositing:
      // 1. Draw logo normally (white on transparent)
      ctx.globalAlpha = pulse;
      ctx.filter = `sepia(1) saturate(6) hue-rotate(55deg) brightness(${0.95 + 0.15 * pulse})`;
      ctx.drawImage(logoImg, lx, ly, logoW, logoH);

      // 2. Second pass — stronger glow layer at lower alpha
      ctx.filter = `sepia(1) saturate(8) hue-rotate(55deg) brightness(1.4)`;
      ctx.globalAlpha = 0.25 * pulse;
      ctx.shadowBlur  = 35 * pulse;
      ctx.drawImage(logoImg, lx, ly, logoW, logoH);
    } else {
      // ── Fallback text sign while image loads ──
      ctx.shadowColor = CONFIG.colors.neonGlow;
      ctx.shadowBlur  = 28 * pulse;
      ctx.strokeStyle = `rgba(140, 255, 30, ${0.7 * pulse})`;
      ctx.lineWidth   = 3;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 145, 36, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font         = `bold 32px 'Arial Black', Arial`;
      ctx.fillStyle    = `rgba(185, 255, 50, ${pulse})`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur   = 18;
      ctx.fillText('SKONES', cx, cy);
    }

    ctx.restore();
  }

  // ─── Arch / circular niche shelving (right) ───────────────
  drawArchNiche() {
    const { ctx } = this;
    const nx = 755, ny = 50, nw = 190, nh = 320;

    // Niche recess (shadow)
    ctx.fillStyle = '#C8C0B4';
    ctx.beginPath();
    ctx.roundRect(nx, ny, nw, nh, 12);
    ctx.fill();

    // Niche back wall
    ctx.fillStyle = '#E8E0D4';
    ctx.beginPath();
    ctx.roundRect(nx + 5, ny + 5, nw - 10, nh - 10, 10);
    ctx.fill();

    // Circular cut-outs (like the real Skones arch shelf)
    const archHoles = [
      [nx + 30, ny + 42,  60], [nx + 105, ny + 42,  60],
      [nx + 30, ny + 125, 60], [nx + 105, ny + 125, 60],
      [nx + 30, ny + 208, 60], [nx + 105, ny + 208, 60],
    ];

    archHoles.forEach(([hx, hy, r], i) => {
      // Arch shadow
      ctx.fillStyle = '#B0A898';
      ctx.beginPath();
      ctx.arc(hx, hy, r / 2 + 2, 0, Math.PI * 2);
      ctx.fill();

      // Arch opening
      ctx.fillStyle = '#D8D0C4';
      ctx.beginPath();
      ctx.arc(hx, hy, r / 2, 0, Math.PI * 2);
      ctx.fill();

      // Product inside each arch
      const archProducts = [
        { color:'#4A8A40', label:'🌿' },
        { color:'#C04080', label:'🍬' },
        { color:'#3080B0', label:'💨' },
        { color:'#8A6A30', label:'🪄' },
        { color:'#6840A0', label:'💎' },
        { color:'#A06030', label:'🏺' },
      ];
      const p = archProducts[i];
      ctx.fillStyle = p.color;
      ctx.fillRect(hx - 10, hy - 8, 20, 18);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(hx - 10, hy - 8, 20, 5);

      ctx.font = '13px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(p.label, hx, hy + 20);
    });

    // Decorative shelf dividers (horizontal)
    ctx.fillStyle = CONFIG.colors.archWood;
    [ny + 84, ny + 167, ny + 250].forEach(sy => {
      ctx.fillRect(nx + 8, sy, nw - 16, 8);
    });

    // Niche frame
    ctx.strokeStyle = CONFIG.colors.archWood;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(nx, ny, nw, nh, 12);
    ctx.stroke();

    // Seasonal/decor wreath / flowers at top
    ctx.font = '22px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🌸', nx + nw / 2, ny - 4);
  }

  // ─── Pendant light ────────────────────────────────────────
  drawPendantLight(cx, topY, cableLen) {
    const { ctx, time } = this;
    const sway = Math.sin(time * 0.4) * 1.5;
    const lx   = cx + sway;
    const ly   = topY + cableLen;

    // Cable
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.quadraticCurveTo(cx + sway / 2, ly - 20, lx, ly);
    ctx.stroke();

    // Glow halo
    const glow = ctx.createRadialGradient(lx, ly + 20, 0, lx, ly + 20, 68);
    glow.addColorStop(0, `rgba(255, 160, 30, ${0.25 + 0.05 * Math.sin(time * 2)})`);
    glow.addColorStop(1, 'rgba(255, 160, 30, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lx, ly + 20, 68, 0, Math.PI * 2);
    ctx.fill();

    // Wrapped shade (stacked rings)
    const rings = 9;
    for (let i = 0; i < rings; i++) {
      const t  = i / (rings - 1);
      const ry = ly + i * 8;
      const rx = 12 + t * 16;
      const shade = `hsl(${28 + t * 8}, ${80 - t * 15}%, ${40 + t * 20}%)`;
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.ellipse(lx, ry, rx, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Bottom bulb
    ctx.fillStyle = `rgba(255, 230, 150, ${0.9 + 0.1 * Math.sin(time * 3)})`;
    ctx.beginPath();
    ctx.ellipse(lx, ly + rings * 8 + 4, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bottom glow cone
    const coneGlow = ctx.createRadialGradient(lx, ly + rings * 8 + 8, 0, lx, ly + rings * 8 + 8, 40);
    coneGlow.addColorStop(0, 'rgba(255, 240, 180, 0.4)');
    coneGlow.addColorStop(1, 'rgba(255, 200, 80, 0)');
    ctx.fillStyle = coneGlow;
    ctx.beginPath();
    ctx.arc(lx, ly + rings * 8 + 8, 40, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─── Display counter ──────────────────────────────────────
  drawCounter() {
    const { ctx, W, H } = this;
    const cy  = Math.round(H * 0.68);
    const ch  = 95;

    // Counter front (wood panel with vertical groove lines)
    const woodGrad = ctx.createLinearGradient(0, cy, 0, cy + ch);
    woodGrad.addColorStop(0,   '#D4A870');
    woodGrad.addColorStop(0.4, '#C09858');
    woodGrad.addColorStop(1,   '#A07840');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(0, cy, W, ch);

    // Wood grain lines
    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, cy);
      ctx.lineTo(x, cy + ch);
      ctx.stroke();
    }

    // Counter top (white quartz / marble)
    const topGrad = ctx.createLinearGradient(0, cy - 18, 0, cy + 2);
    topGrad.addColorStop(0, '#FAFAF8');
    topGrad.addColorStop(0.5, '#F4F0EC');
    topGrad.addColorStop(1, '#E8E4E0');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, cy - 18, W, 20);

    // Counter top highlight line
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, cy - 17);
    ctx.lineTo(W, cy - 17);
    ctx.stroke();

    // Shadow under counter top
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, cy + 2);
    ctx.lineTo(W, cy + 2);
    ctx.stroke();

    // Add-ons display (small stand to the right)
    this.drawAddonStand(W - 165, cy - 55);
  }

  drawAddonStand(x, y) {
    const { ctx } = this;

    // Stand base
    ctx.fillStyle = '#D8D0C8';
    ctx.fillRect(x - 5, y + 48, 170, 8);

    // Little shelf
    ctx.fillStyle = '#C8B890';
    ctx.fillRect(x, y + 10, 160, 40);

    ctx.font = '9px Arial';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText('ADD-ONS', x + 80, y + 8);

    // Sample addon icons
    const addonIcons = ['📄', '🔥', '⚙️', '🔋'];
    addonIcons.forEach((icon, i) => {
      ctx.font = '18px serif';
      ctx.fillText(icon, x + 20 + i * 36, y + 40);
    });
  }

  // ─── Products on counter top ──────────────────────────────
  drawCounterProducts(gameState) {
    const { ctx, W, H } = this;
    const cy  = Math.round(H * 0.68) - 18;

    if (!gameState) return;

    // Display 1 product per category
    const categories = Object.keys(PRODUCTS);
    const displayW   = (W - 200) / categories.length;

    categories.forEach((cat, i) => {
      const px = 20 + i * displayW + displayW / 2;
      const py = cy - 10;

      const meta = CATEGORY_META[cat];
      if (!meta) return;

      // Product stand acrylic
      ctx.strokeStyle = 'rgba(150,150,150,0.4)';
      ctx.lineWidth   = 1;
      ctx.fillStyle   = 'rgba(220,220,220,0.3)';
      ctx.beginPath();
      ctx.roundRect(px - 18, py - 38, 36, 42, 4);
      ctx.fill();
      ctx.stroke();

      // Product icon
      ctx.font = '20px serif';
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(meta.icon, px, py - 20);

      // Category label
      ctx.font = 'bold 9px Arial';
      ctx.fillStyle = meta.color;
      ctx.fillText(meta.label, px, py + 2);
    });
  }

  // ─── Budtender character ──────────────────────────────────
  drawBudtender() {
    const { ctx, W, H, time } = this;
    const cx = W / 2 + 60;
    const cy = H * 0.68 - 18;

    const breathe = Math.sin(time * 0.8) * 1.5;

    // Body (green vest over light shirt)
    // Legs (behind counter — not visible)
    // Torso
    ctx.fillStyle = '#1A3A28';
    ctx.fillRect(cx - 18, cy - 90 + breathe, 36, 52);

    // Shirt collar
    ctx.fillStyle = '#A0A8A0';
    ctx.fillRect(cx - 10, cy - 90 + breathe, 20, 18);

    // Arms
    ctx.fillStyle = '#1A3A28';
    ctx.fillRect(cx - 28, cy - 88 + breathe, 10, 40);
    ctx.fillRect(cx + 18, cy - 88 + breathe, 10, 40);

    // Head
    ctx.fillStyle = '#D4A870';
    ctx.beginPath();
    ctx.arc(cx, cy - 105 + breathe, 18, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#2A1808';
    ctx.beginPath();
    ctx.arc(cx, cy - 118 + breathe, 16, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 16, cy - 118 + breathe, 32, 8);

    // Eyes
    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 107 + breathe, 2.5, 0, Math.PI * 2);
    ctx.arc(cx + 6, cy - 107 + breathe, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy - 101 + breathe, 7, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Name badge
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - 12, cy - 72 + breathe, 24, 14);
    ctx.fillStyle = CONFIG.colors.brandGreen;
    ctx.font = 'bold 7px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('STAFF', cx, cy - 62 + breathe);
  }

  // ─── Particle effects ─────────────────────────────────────
  spawnMoneyParticle(x, y, amount) {
    const sign = amount >= 0 ? '+' : '';
    this.floatTexts.push({
      x, y,
      text: `${sign}$${amount}`,
      color: amount >= 0 ? '#2D8A4E' : '#C04040',
      alpha: 1,
      vy: -1.2,
      life: 90,
    });
  }

  spawnSaleText(x, y, text, color = '#C86820') {
    this.floatTexts.push({ x, y, text, color, alpha: 1, vy: -0.8, life: 100 });
  }

  updateAndDrawParticles(ctx) {
    this.moneyParticles = this.moneyParticles.filter(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.15;
      p.alpha -= 0.02;
      if (p.alpha <= 0) return false;
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return true;
    });
  }

  updateAndDrawFloatTexts(ctx) {
    this.floatTexts = this.floatTexts.filter(ft => {
      ft.y    += ft.vy;
      ft.life -= 1;
      ft.alpha = Math.min(1, ft.life / 20);
      if (ft.life <= 0) return false;
      ctx.save();
      ctx.globalAlpha  = ft.alpha;
      ctx.font         = 'bold 20px Arial';
      ctx.fillStyle    = ft.color;
      ctx.strokeStyle  = 'rgba(255,255,255,0.8)';
      ctx.lineWidth    = 3;
      ctx.textAlign    = 'center';
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
      return true;
    });
  }
}
