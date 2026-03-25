// ============================================================
//  GET SKONED — game.js
//  Main game loop, state machine, business logic
// ============================================================

const GS = {
  MENU:      'menu',
  PLAYING:   'playing',
  SERVING:   'serving',
  EOD:       'eod',
  VENDOR:    'vendor',
  MARKETING: 'marketing',
};

class Game {
  constructor() {
    this.canvas = document.getElementById('store-canvas');
    this.canvas.width  = CONFIG.canvas.width;
    this.canvas.height = CONFIG.canvas.height;

    this.renderer = new StoreRenderer(this.canvas);
    this.ui       = new UIManager(this);

    // ── Business state ──
    this.money      = CONFIG.game.startingMoney;
    this.day        = 0;  // startDay() will increment to 1
    this.shift      = 1;
    this.reputation = 10;  // 0–100+

    // ── Inventory ──
    // Start with all tier-1 products and always-unlocked add-ons
    this.unlockedProductIds = new Set(
      Object.values(PRODUCTS).flatMap(cat => cat.filter(p => p.tier === 1).map(p => p.id))
    );
    this.unlockedAddonIds = new Set(
      ADDONS.filter(a => a.alwaysUnlocked).map(a => a.id)
    );

    // ── Progression ──
    this.vendors         = JSON.parse(JSON.stringify(VENDORS));      // deep copy
    this.activeCampaigns = [];  // { id, daysLeft }

    // ── Day stats ──
    this.dayRevenue   = 0;
    this.dayCost      = 0;
    this.todayCustomers = 0;
    this.dayUpsells   = 0;
    this.dayAddons    = 0;

    // ── Customer queue ──
    this.customers       = [];     // active on-screen customers
    this.customerQueue   = [];     // scheduled for current shift
    this.currentCustomer = null;
    this.nextCustomerId  = 1;
    this.serveTimer      = 0;      // seconds before next customer is summoned
    this.shiftActive     = false;

    // ── Game state ──
    this.state      = GS.MENU;
    this.lastTime   = 0;
    this._raf       = null;

    // ── Audio context (simple tones) ──
    this._audioCtx  = null;

    this._loop = this._loop.bind(this);
  }

  // ─── Start / state transitions ────────────────────────────
  init() {
    // Initialise music player (loads YouTube IFrame API in background)
    if (window.musicPlayer) window.musicPlayer.init();

    this.ui.renderMenu();

    // "Open for Business" — start game AND kick off music on first user gesture
    document.getElementById('btn-start')?.addEventListener('click', () => {
      if (window.musicPlayer) window.musicPlayer.start();
      this.startDay();
    });

    // Music toggle button in HUD
    document.getElementById('btn-music-toggle')?.addEventListener('click', () => {
      if (window.musicPlayer) window.musicPlayer.toggle();
    });

    // How to Play — from the main menu
    document.getElementById('btn-howtoplay-menu')?.addEventListener('click', () => {
      this.ui.renderHowToPlay('menu');
    });

    // How to Play — from the HUD (during gameplay)
    document.getElementById('btn-howtoplay-hud')?.addEventListener('click', () => {
      this.ui.renderHowToPlay('game');
    });

    this._raf = requestAnimationFrame(this._loop);
  }

  startDay() {
    // Age campaigns
    this.activeCampaigns = this.activeCampaigns
      .map(ac => ({ ...ac, daysLeft: ac.daysLeft - 1 }))
      .filter(ac => ac.daysLeft > 0 || MARKETING.find(m => m.id === ac.id)?.durationDays >= 9999);

    // Vendor availability
    this.vendors.forEach(v => {
      if (!v.available && v.unlocksAfterDay && this.day >= v.unlocksAfterDay) {
        v.available = true;
      }
    });

    this.day++;
    this.shift = 1;
    this.dayRevenue = 0;
    this.dayCost    = 0;
    this.todayCustomers = 0;
    this.dayUpsells = 0;
    this.dayAddons  = 0;

    this.state = GS.PLAYING;
    this.ui.showOnly(null); // show HUD, hide all panels
    this.ui.updateHUD();

    this._startShift();
  }

  _startShift() {
    this.shiftActive = true;
    const base  = CONFIG.game.baseCustomersPerShift;
    const extra = this._calculateCustomerBoost();
    const count = Math.max(2, base + Math.floor(extra / CONFIG.game.shiftsPerDay)
                              + Math.floor(this.reputation / 30));

    // Build queue for this shift
    this.customerQueue = [];
    for (let i = 0; i < count; i++) {
      this.customerQueue.push({ delay: 1.5 + i * (2.5 + Math.random() * 1.5) });
    }
    this.serveTimer = 0;
  }

  _calculateCustomerBoost() {
    let boost = 0;
    // Active campaigns
    this.activeCampaigns.forEach(ac => {
      const m = MARKETING.find(mk => mk.id === ac.id);
      if (m) boost += m.customerBoostPerDay;
    });
    // Vendor bonuses
    this.vendors.filter(v => v.unlocked).forEach(v => boost += v.customerBoostPerDay);
    return boost;
  }

  // ─── Main loop ────────────────────────────────────────────
  _loop(ts) {
    const dt   = Math.min((ts - this.lastTime) / 1000, 0.05);
    this.lastTime = ts;

    this._update(dt);
    this._render();
    this._raf = requestAnimationFrame(this._loop);
  }

  _update(dt) {
    // Update customers
    const waitingIdx = this.customers
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.state === CustomerState.WAITING);

    this.customers.forEach((c, qi) => {
      const qpos = waitingIdx.findIndex(w => w.c === c);
      c.update(dt, qpos >= 0 ? qpos : 0);
    });

    // Remove done customers
    this.customers = this.customers.filter(c => c.state !== 'done');

    // Spawn from queue
    if (this.shiftActive && this.state === GS.PLAYING) {
      this.serveTimer += dt;
      if (this.customerQueue.length > 0 && this.serveTimer >= this.customerQueue[0].delay) {
        this.customerQueue.shift();
        this._spawnCustomer();
      }

      // Auto-summon next waiting customer to counter if no one is being served
      if (!this.currentCustomer) {
        const nextWaiting = this.customers.find(c => c.state === CustomerState.WAITING);
        if (nextWaiting) {
          this._serveNext(nextWaiting);
        }
      }

      // Shift over?
      if (this.customerQueue.length === 0 && this.customers.every(c => c.state === 'done' || c.state === CustomerState.SERVED)) {
        if (this.customers.length === 0 || this.customers.every(c => c.state === 'done')) {
          this.shiftActive = false;
          if (this.state === GS.PLAYING) {
            this._endShift();
          }
        }
      }
    }

    // Update HUD
    if (this.state !== GS.MENU) this.ui.updateHUD();
  }

  _spawnCustomer() {
    const c = new Customer(this.nextCustomerId++, this.canvas.width, this.canvas.height);
    this.customers.push(c);
    this.todayCustomers++;
  }

  _serveNext(customer) {
    this.currentCustomer = customer;
    customer.approach();

    // Pause on the customer so the player can read their speech bubble
    setTimeout(() => {
      if (customer.state === CustomerState.AT_COUNTER) {
        this.state = GS.SERVING;
        const unlockedProducts = this._buildUnlockedInventory();
        this.ui.renderServicePanel(customer, unlockedProducts);
      }
    }, 2200);  // 2.2 s — long enough to read the customer dialogue
  }

  _buildUnlockedInventory() {
    const inv = {};
    Object.keys(PRODUCTS).forEach(cat => {
      inv[cat] = PRODUCTS[cat].filter(p => this.unlockedProductIds.has(p.id));
    });
    inv._addons = ADDONS.filter(a => this.unlockedAddonIds.has(a.id));
    return inv;
  }

  // ─── Sale logic ───────────────────────────────────────────
  attemptSale(customer, productId, addonId) {
    const product = Object.values(PRODUCTS).flat().find(p => p.id === productId);
    if (!product) return;

    // Wrong category — customer walks out angry
    const productCat = Object.keys(PRODUCTS).find(cat => PRODUCTS[cat].some(p => p.id === productId));
    if (productCat !== customer.category) {
      const wantedMeta = CATEGORY_META[customer.category];
      this.ui.showNotification(
        `😤 <strong>${customer.name}</strong> wanted ${wantedMeta.icon} ${wantedMeta.label} — they're leaving!`,
        'error'
      );
      customer.serve(false);
      this._maybeShowReview(false, 0.55);
      this._finishSale(customer, null, null);
      return;
    }

    const isUpsell    = product.price > customer.budget;
    let   productSold = false;
    let   addonSold   = false;

    // Determine if customer accepts the product
    if (!isUpsell) {
      // In-budget: always accepted
      productSold = true;
    } else {
      // Over budget: acceptance based on type + how much over
      const overPct = (product.price - customer.budget) / customer.budget;
      let   chance  = customer.typeDef.upsellChance;
      if (overPct > 0.4) chance *= 0.5;  // steep upsell = harder
      if (overPct > 0.8) chance *= 0.3;
      productSold = Math.random() < chance;
    }

    if (!productSold) {
      // Customer declined
      this.ui.showNotification(
        `<strong>${customer.name}</strong> passed on the ${product.name}. Budget too tight!`,
        'warning'
      );
      customer.serve(false);
      this._maybeShowReview(false, 0.20);
      this._finishSale(customer, null, null);
      return;
    }

    // Product sold
    let   addon     = null;
    let   addonProfit = 0;
    if (addonId && addonId !== 'none') {
      addon = ADDONS.find(a => a.id === addonId);
      if (addon) {
        const acceptsAddon = Math.random() < customer.typeDef.addonChance;
        if (acceptsAddon) {
          addonSold   = true;
          addonProfit = addon.price - addon.cost;
          this.dayAddons++;
        } else {
          addon = null;
        }
      }
    }

    const productProfit = product.price - product.cost;
    const totalRevenue  = product.price + (addonSold ? (ADDONS.find(a => a.id === addonId)?.price || 0) : 0);
    const totalProfit   = productProfit + addonProfit;

    this.money       += totalRevenue;
    this.dayRevenue  += totalRevenue;
    this.dayCost     += product.cost + (addonSold ? (ADDONS.find(a => a.id === addonId)?.cost || 0) : 0);

    if (isUpsell) this.dayUpsells++;

    // Reputation
    const repGain = isUpsell ? 1.5 : 0.8;
    this.reputation = Math.min(100, this.reputation + repGain);

    // Spawn money float
    this.renderer.spawnMoneyParticle(
      this.canvas.width / 2,
      this.canvas.height * 0.5,
      totalRevenue
    );

    if (isUpsell) {
      this.renderer.spawnSaleText(
        this.canvas.width / 2 + 60,
        this.canvas.height * 0.45,
        'UPSELL! 🔥',
        CONFIG.colors.upsell
      );
    }

    if (addonSold && addon) {
      this.renderer.spawnSaleText(
        this.canvas.width / 2 - 60,
        this.canvas.height * 0.45,
        `+${addon.name}`,
        CONFIG.colors.brandGreen
      );
    }

    // Notification
    let msg = `✅ Sold <strong>${product.name}</strong> for $${product.price}`;
    if (addonSold && addon) msg += ` + ${addon.icon} ${addon.name} ($${addon.price})`;
    if (isUpsell)            msg += ` — <span style="color:#C86820">Upsell!</span>`;
    msg += ` | Profit: $${totalProfit.toFixed(0)}`;

    this.ui.showNotification(msg, 'success');
    this._playTone(isUpsell ? 880 : 660);
    this._maybeShowReview(true, 0.38);

    customer.serve(true);
    this._finishSale(customer, product, addonSold ? ADDONS.find(a => a.id === addonId) : null);
  }

  skipCustomer(customer) {
    customer.serve(false);
    this._finishSale(customer, null, null);
  }

  _maybeShowReview(happy, chance = 0.35) {
    if (Math.random() < chance) {
      this.ui.showReview(happy ? 5 : 1);
    }
  }

  _finishSale(customer, product, addon) {
    this.currentCustomer = null;
    this.state = GS.PLAYING;
    this.ui.showOnly(null);
    this.ui.updateHUD();
  }

  // ─── Shift / Day management ───────────────────────────────
  _endShift() {
    if (this.shift < CONFIG.game.shiftsPerDay) {
      this.shift++;
      setTimeout(() => this._startShift(), 1200);
    } else {
      setTimeout(() => this._endDay(), 1500);
    }
  }

  _endDay() {
    this.state = GS.EOD;
    const stats = {
      day:             this.day,
      customersServed: this.todayCustomers,
      revenue:         this.dayRevenue,
      profit:          this.dayRevenue - this.dayCost,
      upsells:         this.dayUpsells,
      addonsSold:      this.dayAddons,
      reputation:      this.reputation,
      money:           this.money,
    };
    this.ui.renderEOD(stats);
  }

  showEOD() {
    const stats = {
      day:             this.day,
      customersServed: this.todayCustomers,
      revenue:         this.dayRevenue,
      profit:          this.dayRevenue - this.dayCost,
      upsells:         this.dayUpsells,
      addonsSold:      this.dayAddons,
      reputation:      this.reputation,
      money:           this.money,
    };
    this.ui.renderEOD(stats);
  }

  // ─── Vendors ──────────────────────────────────────────────
  showVendors() {
    this.state = GS.VENDOR;
    this.ui.renderVendors(this.vendors, this.money);
  }

  unlockVendor(vendorId) {
    const vendor = this.vendors.find(v => v.id === vendorId);
    if (!vendor || vendor.unlocked || !vendor.available) return;
    if (this.money < vendor.cost) {
      this.ui.showNotification('Not enough cash!', 'warning');
      return;
    }

    this.money -= vendor.cost;
    vendor.unlocked = true;

    // Unlock products & add-ons
    vendor.unlocks.products.forEach(pid => this.unlockedProductIds.add(pid));
    vendor.unlocks.addons.forEach(aid => this.unlockedAddonIds.add(aid));

    // Reputation boost
    this.reputation = Math.min(100, this.reputation + vendor.reputationBoost);

    this._playTone(990);
    this.ui.showNotification(
      `🤝 Partnered with <strong>${vendor.name}</strong>! New products unlocked!`,
      'success', 3500
    );

    // Re-render vendors
    setTimeout(() => this.ui.renderVendors(this.vendors, this.money), 600);
  }

  // ─── Marketing ────────────────────────────────────────────
  showMarketing() {
    this.state = GS.MARKETING;
    this.ui.renderMarketing(MARKETING, this.activeCampaigns, this.money);
  }

  launchCampaign(campaignId) {
    const campaign = MARKETING.find(m => m.id === campaignId);
    if (!campaign) return;
    if (this.money < campaign.cost) {
      this.ui.showNotification('Not enough cash!', 'warning');
      return;
    }
    const already = this.activeCampaigns.find(ac => ac.id === campaignId);
    if (already) {
      // Refresh duration
      already.daysLeft = campaign.durationDays;
    } else {
      this.activeCampaigns.push({ id: campaignId, daysLeft: campaign.durationDays });
    }

    this.money -= campaign.cost;
    this.reputation = Math.min(100, this.reputation + campaign.reputationBoost);

    this._playTone(770);
    this.ui.showNotification(
      `📣 <strong>${campaign.name}</strong> launched! +${campaign.customerBoostPerDay} customers/day`,
      'success', 3000
    );

    setTimeout(() => this.ui.renderMarketing(MARKETING, this.activeCampaigns, this.money), 600);
  }

  // ─── Rendering ────────────────────────────────────────────
  _render() {
    this.renderer.render(
      { unlockedProductIds: this.unlockedProductIds },
      this.customers,
      this.currentCustomer
    );
  }

  // ─── Audio ────────────────────────────────────────────────
  _playTone(freq, duration = 0.12) {
    try {
      if (!this._audioCtx) this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = this._audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) { /* audio not available */ }
  }
}

// ─── Boot ─────────────────────────────────────────────────

// ─── Viewport scaling ────────────────────────────────────────────────────────
// Scales the 960x520 game to fill any screen (desktop, tablet, phone landscape)
function fitGameToViewport() {
  const container  = document.getElementById('game-container');
  const rotateHint = document.getElementById('rotate-hint');
  if (!container) return;

  const W = window.innerWidth;
  const H = window.innerHeight;

  // On small portrait screens show rotate hint — handled purely by CSS media query
  // but we also pause interaction here
  const isPortraitPhone = W < 768 && H > W;

  if (rotateHint) {
    rotateHint.style.display = isPortraitPhone ? 'flex' : 'none';
  }

  // Scale to fill the viewport (allow upscale on large screens too)
  const scaleX = W / 960;
  const scaleY = H / 520;
  const scale  = Math.min(scaleX, scaleY); // fill screen, no artificial 1× cap

  container.style.transform = `scale(${scale})`;

  // Expose scale so CSS can use it (e.g. for modal width calculations)
  document.documentElement.style.setProperty('--game-scale', scale.toFixed(4));
}
window.addEventListener('resize',            fitGameToViewport);
window.addEventListener('orientationchange', () => setTimeout(fitGameToViewport, 150));

window.addEventListener('DOMContentLoaded', () => {
  fitGameToViewport();          // scale to fit before rendering
  window.game = new Game();
  window.game.init();
});
