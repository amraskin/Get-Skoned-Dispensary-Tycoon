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

    // ── Customer history ── tracks what each customer name bought
    this.customerHistory = {};

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

  // ─── Save / Load ──────────────────────────────────────────
  saveGame() {
    try {
      const data = {
        version:            2,
        money:              this.money,
        day:                this.day,
        reputation:         this.reputation,
        unlockedProductIds: [...this.unlockedProductIds],
        unlockedAddonIds:   [...this.unlockedAddonIds],
        vendors:            this.vendors.map(v => ({ id: v.id, unlocked: v.unlocked, available: v.available })),
        activeCampaigns:    this.activeCampaigns,
        customerHistory:    this.customerHistory,
        savedAt:            Date.now(),
      };
      localStorage.setItem('get-skoned-save', JSON.stringify(data));
    } catch (e) { /* storage unavailable */ }
  }

  loadGame() {
    try {
      const raw = localStorage.getItem('get-skoned-save');
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d || d.version !== 2) return false;
      this.money              = d.money;
      this.day                = d.day;
      this.reputation         = d.reputation;
      this.unlockedProductIds = new Set(d.unlockedProductIds || []);
      this.unlockedAddonIds   = new Set(d.unlockedAddonIds   || []);
      this.activeCampaigns    = d.activeCampaigns  || [];
      this.customerHistory    = d.customerHistory  || {};
      (d.vendors || []).forEach(sv => {
        const v = this.vendors.find(x => x.id === sv.id);
        if (v) { v.unlocked = sv.unlocked; v.available = sv.available; }
      });
      return true;
    } catch (e) { return false; }
  }

  static hasSave() {
    try { return !!localStorage.getItem('get-skoned-save'); } catch (e) { return false; }
  }

  clearSave() {
    try { localStorage.removeItem('get-skoned-save'); } catch (e) {}
  }

  calculateScore() {
    return Math.round(this.money + this.reputation * 50 + this.day * 100);
  }

  // ─── Start / state transitions ────────────────────────────
  init() {
    // Initialise music player (loads YouTube IFrame API in background)
    if (window.musicPlayer) window.musicPlayer.init();

    const hasSave = Game.hasSave();
    this.ui.renderMenu(hasSave);

    // "Open for Business" — new game
    document.getElementById('btn-start')?.addEventListener('click', () => {
      if (window.musicPlayer) window.musicPlayer.start();
      this.clearSave();
      this.startDay();
    });

    // "Continue" — load saved game
    document.getElementById('btn-continue')?.addEventListener('click', () => {
      if (window.musicPlayer) window.musicPlayer.start();
      if (this.loadGame()) {
        this.state = GS.PLAYING;
        this.ui.showOnly(null);
        this.ui.updateHUD();
        this._startShift();
      }
    });

    // Music toggle button in HUD
    document.getElementById('btn-music-toggle')?.addEventListener('click', () => {
      if (window.musicPlayer) window.musicPlayer.toggle();
    });

    // Leaderboard — from main menu
    document.getElementById('btn-leaderboard-menu')?.addEventListener('click', () => {
      this.ui.renderLeaderboard('menu');
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

    // Open service panel when current customer reaches counter (frame-safe, no setTimeout)
    if (this._speechDelay > 0) this._speechDelay -= dt;
    if (this.currentCustomer &&
        this.currentCustomer.state === CustomerState.AT_COUNTER &&
        this.state !== GS.SERVING &&
        this._speechDelay <= 0) {
      this.state = GS.SERVING;
      this._serviceStartTime = Date.now();
      const unlockedProducts = this._buildUnlockedInventory();
      const history = this.customerHistory[this.currentCustomer.name] || null;
      this.ui.renderServicePanel(this.currentCustomer, unlockedProducts, history);
    }

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
    this._speechDelay    = 1.5; // seconds to let player read the speech bubble
    customer.approach();
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
  // cart = [{ id, name, price, cost, category, isAddon }, ...]
  attemptSale(customer, cart) {
    if (!cart || cart.length === 0) return;

    const elapsed  = (Date.now() - (this._serviceStartTime || Date.now())) / 1000;
    const prevH    = this.customerHistory[customer.name] || { visits: 0 };
    const recordBad = () => {
      this.customerHistory[customer.name] = { ...prevH, satisfied: false, visits: (prevH.visits||0)+1 };
    };

    // ── Find primary product (first non-addon in cart) ─────
    const primaryEntry = cart.find(i => !i.isAddon);
    if (!primaryEntry) return;
    const primaryProduct = Object.values(PRODUCTS).flat().find(p => p.id === primaryEntry.id);
    if (!primaryProduct) return;
    const primaryCat = Object.keys(PRODUCTS).find(cat => PRODUCTS[cat].some(p => p.id === primaryEntry.id));

    // ── Wrong category check ───────────────────────────────
    if (primaryCat !== customer.category) {
      const isSmartAlt = this._isSmartAlternative(customer, primaryCat);

      if (!isSmartAlt) {
        const wantedMeta = CATEGORY_META[customer.category];
        this.ui.showNotification(
          `😤 <strong>${customer.name}</strong> wanted ${wantedMeta.icon} ${wantedMeta.label} — they're leaving!`, 'error'
        );
        recordBad();
        customer.serve(false);
        this._maybeShowReview(false, 0.55, elapsed);
        this._finishSale(customer, null, null);
        return;
      }

      // Smart alternative — 65% acceptance
      if (Math.random() > 0.65) {
        const wantedMeta = CATEGORY_META[customer.category];
        this.ui.showNotification(
          `🤔 <strong>${customer.name}</strong> wasn't convinced — they really wanted ${wantedMeta.icon} ${wantedMeta.label}`, 'warning'
        );
        customer.serve(false);
        this._finishSale(customer, null, null);
        return;
      }
      // Smart sell success!
      const altMeta    = CATEGORY_META[primaryCat];
      const wantedMeta = CATEGORY_META[customer.category];
      this.renderer.spawnSaleText(this.canvas.width/2, this.canvas.height*0.38, '🌟 SMART SELL!', '#9B59B6');
      this.ui.showNotification(
        `🌟 <strong>Smart Sell!</strong> ${customer.name} came in for ${wantedMeta.icon} but you read the room — ${altMeta.icon} ${altMeta.label} was perfect!`,
        'success', 4000
      );
      this.reputation = Math.min(100, this.reputation + 2);
    }

    // ── Oversell check ─────────────────────────────────────
    const tolerance = customer.typeDef.cartTolerance || 2;
    if (cart.length > tolerance + 1) {
      this.ui.showNotification(
        `😤 <strong>${customer.name}</strong> felt oversold — walked out without buying anything!`, 'error'
      );
      recordBad();
      customer.serve(false);
      this._maybeShowReview(false, 0.75, elapsed);
      this._finishSale(customer, null, null);
      return;
    }

    // ── Primary product upsell check ───────────────────────
    const isUpsell = primaryProduct.price > customer.budget;
    if (isUpsell) {
      const overPct = (primaryProduct.price - customer.budget) / customer.budget;
      let chance = customer.typeDef.upsellChance;
      if (overPct > 0.4) chance *= 0.5;
      if (overPct > 0.8) chance *= 0.3;
      if (Math.random() >= chance) {
        this.ui.showNotification(
          `<strong>${customer.name}</strong> passed on ${primaryProduct.name}. Budget too tight!`, 'warning'
        );
        recordBad();
        customer.serve(false);
        this._maybeShowReview(false, 0.20, elapsed);
        this._finishSale(customer, null, null);
        return;
      }
    }

    // ── Process each cart item ─────────────────────────────
    let totalRevenue = 0, totalProfit = 0, totalCost = 0;
    const soldItems = [], skippedNames = [];

    cart.forEach((item, idx) => {
      let product = Object.values(PRODUCTS).flat().find(p => p.id === item.id);
      if (!product) product = ADDONS.find(a => a.id === item.id);
      if (!product) return;

      if (item.id === primaryEntry.id) {
        // Primary always goes through (already passed upsell check)
        soldItems.push(item);
        totalRevenue += product.price;
        totalProfit  += product.price - product.cost;
        totalCost    += product.cost;
        return;
      }

      // Extra items — acceptance chance decreases as cart grows
      const extraPos    = idx;
      const acceptChance = extraPos < tolerance ? 0.80 : 0.35;
      if (Math.random() < acceptChance) {
        soldItems.push(item);
        totalRevenue += product.price;
        totalProfit  += product.price - product.cost;
        totalCost    += product.cost;
      } else {
        skippedNames.push(product.name);
      }
    });

    if (soldItems.length === 0) { this._finishSale(customer, null, null); return; }

    // ── Finalize ───────────────────────────────────────────
    this.money      += totalRevenue;
    this.dayRevenue += totalRevenue;
    this.dayCost    += totalCost;
    if (isUpsell) this.dayUpsells++;
    if (soldItems.length > 1) this.dayAddons += soldItems.length - 1;
    this.reputation = Math.min(100, this.reputation + (isUpsell ? 1.5 : 0.8));

    this.renderer.spawnMoneyParticle(this.canvas.width/2, this.canvas.height*0.5, totalRevenue);
    if (isUpsell)
      this.renderer.spawnSaleText(this.canvas.width/2+60, this.canvas.height*0.45, 'UPSELL! 🔥', CONFIG.colors.upsell);
    if (soldItems.length > 1)
      this.renderer.spawnSaleText(this.canvas.width/2-60, this.canvas.height*0.45, `+${soldItems.length-1} extras!`, CONFIG.colors.brandGreen);

    let msg = soldItems.length === 1
      ? `✅ Sold <strong>${primaryProduct.name}</strong> for $${primaryProduct.price}`
      : `✅ Sold <strong>${soldItems.length} items</strong> — $${totalRevenue} total`;
    if (isUpsell)          msg += ` — <span style="color:#C86820">Upsell!</span>`;
    if (skippedNames.length) msg += ` <span style="color:#999;font-size:11px">(passed on ${skippedNames.join(', ')})</span>`;
    msg += ` | Profit: $${totalProfit.toFixed(0)}`;

    this.ui.showNotification(msg, 'success');
    this._playTone(isUpsell ? 880 : 660);
    this._maybeShowReview(true, 0.38, elapsed);

    this.customerHistory[customer.name] = {
      productName: primaryProduct.name,
      productId:   primaryEntry.id,
      category:    primaryCat,
      satisfied:   true,
      visits:      (prevH.visits||0) + 1,
    };

    customer.serve(true);
    this._finishSale(customer, primaryProduct, null);
  }

  // ── Smart alternative detection ────────────────────────────
  // Returns true if the offered category makes sense given the customer's effect hint
  _isSmartAlternative(customer, offeredCat) {
    const wantedMeta  = CATEGORY_META[customer.category];
    const offeredMeta = CATEGORY_META[offeredCat];
    if (!wantedMeta?.smartAlts?.includes(offeredCat)) return false;
    const hint     = (customer.effectHint || '').toLowerCase();
    const keywords = offeredMeta?.altKeywords || [];
    return keywords.some(kw => hint.includes(kw));
  }

  skipCustomer(customer) {
    customer.serve(false);
    this._finishSale(customer, null, null);
  }

  _maybeShowReview(happy, baseChance = 0.35, elapsedSeconds = 0) {
    if (!happy) {
      // Wrong category / passed — time doesn't save them, already a bad experience
      // But slow service on top of it makes a bad review more likely
      const badChance = Math.min(0.85, baseChance + (elapsedSeconds > 30 ? 0.20 : 0));
      if (Math.random() < badChance) this.ui.showReview(1);
      return;
    }

    // Successful sale — speed determines whether review is good, neutral, or bad
    let goodChance, badChance;
    if      (elapsedSeconds < 12) { goodChance = 0.70; badChance = 0.00; } // lightning fast
    else if (elapsedSeconds < 25) { goodChance = 0.45; badChance = 0.05; } // solid pace
    else if (elapsedSeconds < 45) { goodChance = 0.20; badChance = 0.22; } // slow
    else                          { goodChance = 0.08; badChance = 0.50; } // very slow

    const roll = Math.random();
    if      (roll < goodChance)              this.ui.showReview(5);
    else if (roll < goodChance + badChance)  this.ui.showReview(1);
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
    this.saveGame(); // ← auto-save
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
      score:           this.calculateScore(),
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
