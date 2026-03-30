// ============================================================
//  GET SKONED — ui.js
//  All HTML panel rendering and event wiring
// ============================================================

class UIManager {
  constructor(game) {
    this.game     = game;
    this.panels   = {};
    this._init();
  }

  // ─── Build all panels ─────────────────────────────────────
  _init() {
    // Collect panel references
    ['menu','hud','service','eod','vendor','marketing','notification','howtoplay','review','leaderboard']
      .forEach(id => { this.panels[id] = document.getElementById(`panel-${id}`); });
  }

  showOnly(panelName) {
    Object.keys(this.panels).forEach(k => {
      // Notification and review manage their own visibility via timers
      if (k === 'notification' || k === 'review') return;
      if (this.panels[k]) this.panels[k].style.display = 'none';
    });
    if (panelName && this.panels[panelName]) {
      this.panels[panelName].style.display = 'flex';
    }
    // HUD always visible except on menu
    if (panelName !== 'menu' && this.panels.hud) {
      this.panels.hud.style.display = 'flex';
    }
  }

  // ─── HUD ──────────────────────────────────────────────────
  updateHUD() {
    const g = this.game;
    const el = id => document.getElementById(id);

    el('hud-money').textContent   = `$${g.money.toFixed(0)}`;
    el('hud-day').textContent     = `Day ${g.day}`;
    el('hud-shift').textContent   = `Shift ${g.shift} / ${CONFIG.game.shiftsPerDay}`;
    el('hud-customers').textContent = `Today: ${g.todayCustomers}`;
    el('hud-rep').textContent     = `Rep: ${Math.round(g.reputation)}`;

    // Reputation bar
    const repBar = el('hud-rep-bar');
    if (repBar) repBar.style.width = `${Math.min(100, g.reputation)}%`;
  }

  // ─── Main menu ────────────────────────────────────────────
  renderMenu(hasSave = false) {
    const panel = this.panels.menu;
    if (!panel) { this.showOnly('menu'); return; }

    const savedDate = (() => {
      try {
        const d = JSON.parse(localStorage.getItem('get-skoned-save') || '{}');
        if (!d.savedAt) return '';
        return new Date(d.savedAt).toLocaleDateString();
      } catch (e) { return ''; }
    })();

    panel.innerHTML = `
      <div class="menu-bg-logo">
        <img src="img/logo.png" alt="Skones" class="menu-logo" />
      </div>
      <div class="menu-content">
        <div class="menu-title">Dispensary Tycoon</div>
        <div class="menu-icons">🌿 🍬 💨 💎 🪄 🏺</div>
        <div class="pixel-owner-frame">
          <canvas id="canvas-pixel-owner"></canvas>
          <div class="pixel-owner-label">👍 ASkone — The Boss</div>
        </div>
        <div class="menu-desc">
          Run your own cannabis dispensary. Know your customers, make everyone happy,
          build vendor partnerships, and grow your reputation into an empire.
        </div>
        ${hasSave ? `
          <div class="menu-save-badge">💾 Save found — ${savedDate}</div>
          <button class="btn btn-brand btn-start" id="btn-continue">▶ Continue</button>
          <button class="btn btn-secondary btn-htp-menu" id="btn-start">🆕 New Game</button>
        ` : `
          <button class="btn btn-brand btn-start" id="btn-start">Open for Business</button>
        `}
        <button class="btn btn-secondary btn-htp-menu" id="btn-leaderboard-menu">🏆 Leaderboard</button>
        <button class="btn btn-secondary btn-htp-menu" id="btn-howtoplay-menu">📖 How to Play</button>
      </div>
    `;
    this.showOnly('menu');
    this._drawPixelOwner();
  }

  _drawPixelOwner() {
    const cv = document.getElementById('canvas-pixel-owner');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = 90, H = 110;
    cv.width = W; cv.height = H;

    // ── Wood slat background ──
    for (let i = 0; i < W; i += 10) {
      ctx.fillStyle = i % 20 === 0 ? '#B89060' : '#C8A070';
      ctx.fillRect(i, 0, 10, H);
    }

    // ── Skones green sign text area ──
    const sg = ctx.createLinearGradient(0,4,0,22);
    sg.addColorStop(0,'#0D6030'); sg.addColorStop(1,'#084020');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.roundRect(14,4,92,18,4); ctx.fill();
    ctx.fillStyle = '#7AE870'; ctx.font = 'bold 11px serif';
    ctx.textAlign = 'center'; ctx.fillText('Skones', W/2, 17);

    // ── Hair ──
    ctx.fillStyle = '#201510';
    ctx.beginPath();
    ctx.ellipse(W/2, 44, 30, 22, 0, Math.PI, 0);
    ctx.fill();
    // grey highlights
    ctx.fillStyle = '#6A5A50';
    ctx.fillRect(34, 34, 8, 6); ctx.fillRect(75, 34, 8, 6);

    // ── Face ──
    const fg = ctx.createRadialGradient(W/2,60,5,W/2,58,28);
    fg.addColorStop(0,'#D8A880'); fg.addColorStop(1,'#B88060');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.ellipse(W/2, 62, 28, 30, 0, 0, Math.PI*2);
    ctx.fill();

    // ── Glasses frame ──
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5;
    ctx.fillStyle = 'rgba(180,215,235,0.45)';
    // left lens
    ctx.beginPath(); ctx.roundRect(33,54,22,14,3); ctx.fill(); ctx.stroke();
    // right lens
    ctx.beginPath(); ctx.roundRect(65,54,22,14,3); ctx.fill(); ctx.stroke();
    // bridge
    ctx.beginPath(); ctx.moveTo(55,61); ctx.lineTo(65,61); ctx.stroke();
    // temples
    ctx.beginPath(); ctx.moveTo(33,61); ctx.lineTo(26,59); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(87,61); ctx.lineTo(94,59); ctx.stroke();
    // lens highlights
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(40,57,4,3,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(72,57,4,3,0,0,Math.PI*2); ctx.fill();

    // ── Nose ──
    ctx.fillStyle = '#A87050';
    ctx.beginPath(); ctx.ellipse(W/2,73,5,4,0,0,Math.PI*2); ctx.fill();

    // ── Slight smile ──
    ctx.strokeStyle = '#9A6040'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(W/2,80,7,0.15,Math.PI-0.15); ctx.stroke();

    // ── Salt & pepper beard / stubble ──
    // base beard shape
    ctx.fillStyle = '#3A2E28';
    ctx.beginPath();
    ctx.moveTo(24,76); ctx.bezierCurveTo(22,92,28,102,W/2,104);
    ctx.bezierCurveTo(92,102,98,92,96,76);
    ctx.lineTo(90,74); ctx.bezierCurveTo(80,82,40,82,30,74);
    ctx.closePath(); ctx.fill();
    // grey flecks
    ctx.fillStyle = '#9A8878';
    for (const [bx,by] of [[32,82],[42,90],[52,96],[62,96],[72,90],[82,82],[38,78],[68,78],[56,100]]) {
      ctx.beginPath(); ctx.ellipse(bx,by,2,1.5,Math.random(),0,Math.PI*2); ctx.fill();
    }
    // mustache
    ctx.fillStyle = '#2E2420';
    ctx.beginPath(); ctx.ellipse(W/2,78,12,4,0,0,Math.PI); ctx.fill();

    // ── Neck ──
    ctx.fillStyle = '#B88060';
    ctx.fillRect(W/2-10,100,20,12);

    // ── White hoodie body ──
    const hg = ctx.createLinearGradient(0,112,W,112);
    hg.addColorStop(0,'#C8C4BC'); hg.addColorStop(0.3,'#F2EFEA');
    hg.addColorStop(0.7,'#F2EFEA'); hg.addColorStop(1,'#C8C4BC');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(10,112); ctx.lineTo(W-10,112);
    ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();
    // hoodie pocket line
    ctx.strokeStyle = '#D8D4CC'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W/2-18,138); ctx.lineTo(W/2+18,138); ctx.stroke();

    // ── Thumbs up (right side) ──
    // fist
    ctx.fillStyle = '#C08858';
    ctx.beginPath(); ctx.roundRect(88,120,18,22,4); ctx.fill();
    // thumb pointing up
    ctx.fillStyle = '#B87848';
    ctx.beginPath(); ctx.roundRect(91,103,12,20,6); ctx.fill();
    // knuckle lines
    ctx.strokeStyle = '#A07040'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(90,124); ctx.lineTo(105,124); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(90,128); ctx.lineTo(105,128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(90,132); ctx.lineTo(105,132); ctx.stroke();

  }

  // ─── Service panel (serving current customer) ─────────────
  renderServicePanel(customer, unlockedProducts, history = null) {
    const panel = this.panels.service;
    if (!panel) return;

    this._activeCatTab = Object.keys(PRODUCTS)[0]; // start on first tab, NOT customer's category
    this._revealed       = { category: false, budget: false, effects: false, lastVisit: false };
    this._questionsAsked = 0;
    this._cart           = [];

    const isReturning = history && history.visits > 0;

    panel.innerHTML = `
      <div class="sp-header">
        <div class="sp-customer-info">
          <div class="sp-avatar">${customer.typeDef.outfits[0]}</div>
          <div class="sp-details">
            <div class="sp-name">${customer.name}${isReturning ? ' <span class="sp-returning-badge">🔄 Returning</span>' : ''}</div>
            <div class="sp-type" style="color:${customer.typeDef.color}">${customer.typeDef.label}</div>
            <div class="sp-dialogue">"${customer.vagueDialogue || customer.dialogue}"</div>
          </div>
        </div>
        <button class="btn btn-secondary sp-skip" id="btn-skip-customer">Pass</button>
      </div>
      <div class="sp-scroll-body" id="sp-scroll-body"></div>
      <div class="sp-footer"     id="sp-footer"></div>
    `;

    document.getElementById('btn-skip-customer')?.addEventListener('click', () => {
      this.game.skipCustomer(customer);
    });

    this._renderConversationPhase(customer, unlockedProducts, history);
    this.showOnly('service');
  }

  // ─── Conversation phase ────────────────────────────────────
  _renderConversationPhase(customer, unlockedProducts, history) {
    const body   = document.getElementById('sp-scroll-body');
    const footer = document.getElementById('sp-footer');
    if (!body || !footer) return;

    const visits  = history?.visits || 0;
    const catMeta = CATEGORY_META[customer.category];

    // For returning customers, auto-reveal what you already know
    if (visits >= 1) this._revealed.category = true;

    // Auto-reveal: some customers volunteer one piece of info upfront
    if (customer.autoReveal && !this._revealed[customer.autoReveal]) {
      this._revealed[customer.autoReveal] = true;
    }
    const autoRevealLine = customer.autoReveal ? {
      category: `Just so you know, I'm thinking ${catMeta.label} today.`,
      budget:   `I've only got about $${customer.budget} on me.`,
      effects:  `I'm mainly looking for ${customer.effectHint || 'something good'}.`,
    }[customer.autoReveal] : null;

    // Which question buttons to show (still reduces for regulars)
    const showCategory = visits === 0 && !this._revealed.category;
    const showBudget   = visits <= 1;
    const showEffects  = true;

    // Build recent visit history HTML
    const recentVisits = history?.recentVisits || (
      history?.productName ? [{ productName: history.productName, category: history.category, totalSpent: null, satisfied: history.satisfied }] : []
    );
    const historyHtml = recentVisits.length ? `
      <div class="sp-history-box">
        <div class="sp-convo-label">📖 Purchase history:</div>
        ${recentVisits.map((v, i) => `
          <div class="sp-history-row">
            <span class="sp-history-visit">${i === 0 ? 'Last visit' : '2 visits ago'}</span>
            <span class="sp-history-product">${CATEGORY_META[v.category]?.icon || ''} ${v.productName}</span>
            ${v.totalSpent != null ? `<span class="sp-history-spent">$${v.totalSpent}</span>` : ''}
            <span class="sp-history-outcome">${v.satisfied ? '✅' : '❌'}</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    const convoLabel = visits === 0
      ? (customer.questionPatience === 1 ? 'They seem in a hurry — one question, then recommend:' : 'Ask up to 2 questions, then make your recommendation:')
      : visits === 1 ? 'You remember them — ask one more question:'
      : 'You know this regular — just confirm one thing:';

    body.innerHTML = `
      ${historyHtml}
      ${autoRevealLine ? `<div class="sp-auto-reveal">💬 <em>"${autoRevealLine}"</em></div>` : ''}
      <div class="sp-convo-section">
        <div class="sp-convo-label">💬 ${convoLabel}</div>
        <div class="sp-questions" id="sp-questions">
          ${showCategory ? '<button class="sp-question-btn" id="q-category">🔍 What are you looking for today?</button>' : ''}
          ${showBudget   ? '<button class="sp-question-btn" id="q-budget">💰 What\'s your budget like?</button>' : ''}
          ${showEffects  ? '<button class="sp-question-btn" id="q-effects">✨ What kind of effects are you after?</button>' : ''}
        </div>
        <div class="sp-patience-hint" id="sp-patience-hint"></div>
      </div>
      <div class="sp-clue-box">
        <div class="sp-clue-title">📋 What you know:</div>
        <div id="sp-clues"></div>
      </div>
    `;

    footer.innerHTML = `
      <button class="btn btn-brand sp-sell-btn" id="btn-make-rec">🛍️ Make a Recommendation →</button>
    `;

    // Seed clues with anything already known
    this._updateClues(customer, history);
    this._updatePatienceState(customer);

    // Wire question buttons
    document.getElementById('q-category')?.addEventListener('click', e => {
      if (this._revealed.category) return;
      if (this._questionsAsked >= customer.questionPatience) { this._annoyedWalkOut(customer); return; }
      this._questionsAsked++;
      this._revealed.category = true;
      e.currentTarget.classList.add('asked');
      e.currentTarget.textContent = `🔍 Looking for: ${catMeta.icon} ${catMeta.label}`;
      this._updateClues(customer, history);
      this._updatePatienceState(customer);
    });

    document.getElementById('q-budget')?.addEventListener('click', e => {
      if (this._revealed.budget) return;
      if (this._questionsAsked >= customer.questionPatience) { this._annoyedWalkOut(customer); return; }
      this._questionsAsked++;
      this._revealed.budget = true;
      e.currentTarget.classList.add('asked');
      e.currentTarget.textContent = `💰 Budget: around $${customer.budget}`;
      this._updateClues(customer, history);
      this._updatePatienceState(customer);
    });

    document.getElementById('q-effects')?.addEventListener('click', e => {
      if (this._revealed.effects) return;
      if (this._questionsAsked >= customer.questionPatience) { this._annoyedWalkOut(customer); return; }
      this._questionsAsked++;
      this._revealed.effects = true;
      e.currentTarget.classList.add('asked');
      e.currentTarget.textContent = `✨ "${customer.effectHint || 'Something good...'}"`;
      this._updateClues(customer, history);
      this._updatePatienceState(customer);
    });

    document.getElementById('btn-make-rec')?.addEventListener('click', () => {
      this._renderRecommendationPhase(customer, unlockedProducts);
    });
  }

  _updatePatienceState(customer) {
    const remaining = customer.questionPatience - this._questionsAsked;
    document.querySelectorAll('.sp-question-btn:not(.asked)').forEach(btn => {
      btn.classList.toggle('patience-warn',   remaining === 1 && customer.questionPatience > 1);
      btn.classList.toggle('patience-danger', remaining <= 0);
    });
    const hint = document.getElementById('sp-patience-hint');
    if (!hint) return;
    if (remaining <= 0)     hint.textContent = '⚠️ They look annoyed — any more questions and they\'ll leave!';
    else if (remaining === 1 && customer.questionPatience > 1) hint.textContent = '⚡ Last question — then make your recommendation.';
    else hint.textContent = '';
  }

  _annoyedWalkOut(customer) {
    const lines = [
      "That's way too many questions...",
      "You're making this complicated. I'm out.",
      "Never mind — I'll shop somewhere else.",
      "This feels like an interview. Bye!",
    ];
    customer.showSpeech(lines[Math.floor(Math.random() * lines.length)], 2500);
    document.querySelectorAll('.sp-question-btn').forEach(b => b.disabled = true);
    const rec = document.getElementById('btn-make-rec');
    if (rec) rec.disabled = true;
    setTimeout(() => this.game.skipCustomer(customer), 900);
  }

  _updateClues(customer, history) {
    const cluesEl = document.getElementById('sp-clues');
    if (!cluesEl) return;
    const catMeta = CATEGORY_META[customer.category];
    const visits  = history?.visits || 0;
    const items   = [];

    if (this._revealed.category)
      items.push(`<div class="sp-clue-item">🎯 Wants: <strong>${catMeta.icon} ${catMeta.label}</strong>${visits >= 1 ? ' <span class="sp-clue-source">(you remember)</span>' : ''}</div>`);
    if (this._revealed.budget)
      items.push(`<div class="sp-clue-item">💰 Budget: <strong>~$${customer.budget}</strong></div>`);
    if (this._revealed.effects)
      items.push(`<div class="sp-clue-item">✨ <em>"${customer.effectHint || 'Something good'}"</em></div>`);

    cluesEl.innerHTML = items.length
      ? items.join('')
      : '<div class="sp-clue-empty">Ask questions to gather info before recommending...</div>';
  }

  // ─── Recommendation phase ──────────────────────────────────
  _renderRecommendationPhase(customer, unlockedProducts) {
    const body   = document.getElementById('sp-scroll-body');
    const footer = document.getElementById('sp-footer');
    if (!body || !footer) return;

    this._cart         = [];
    this._activeCatTab = Object.keys(PRODUCTS)[0];
    const catMeta      = CATEGORY_META[customer.category];
    const tolerance    = customer.typeDef.cartTolerance || 2;

    // Build compact "what you know" summary for the rec phase
    const knownBits = [];
    if (this._revealed.category) knownBits.push(`${catMeta.icon} ${catMeta.label}`);
    if (this._revealed.budget)   knownBits.push(`~$${customer.budget}`);
    if (this._revealed.effects)  knownBits.push(`"${customer.effectHint || 'Something good'}"`);
    const knownBar = knownBits.length ? `
      <div class="sp-rec-knowbar">
        <span class="sp-rec-knowbar-label">You know:</span>
        ${knownBits.map(b => `<span class="sp-rec-knowbar-chip">${b}</span>`).join('')}
      </div>` : '';

    body.innerHTML = `
      ${knownBar}
      <div class="sp-cat-tabs" id="sp-cat-tabs"></div>
      <div class="sp-wrong-cat-banner" id="sp-wrong-cat-banner" style="display:none">
        ⚠️ Wrong category — they'll leave unless your effect hint suggests this works!
      </div>
      <div class="sp-section-title" id="sp-products-title"></div>
      <div class="sp-products" id="sp-products"></div>
      <div class="sp-section-title">Add-ons <span style="font-weight:400;color:#aaa">(optional)</span></div>
      <div class="sp-addons" id="sp-addons"></div>
    `;

    footer.innerHTML = `
      <div class="sp-cart" id="sp-cart">
        <div class="sp-cart-header">
          <span class="sp-cart-label">🛒 Cart</span>
          <span class="sp-cart-mood" id="sp-cart-mood" title="Customer patience">😊</span>
          <span class="sp-cart-tolerance" id="sp-cart-tolerance">0 / ${tolerance}</span>
        </div>
        <div class="sp-cart-items" id="sp-cart-items">
          <span class="sp-cart-empty">Add items above to build the sale</span>
        </div>
        <div class="sp-cart-total-row">
          <span id="sp-cart-total">Total: $0</span>
          <button class="btn btn-brand sp-sell-btn" id="btn-complete-sale" disabled>💰 Complete Sale</button>
        </div>
      </div>
    `;

    this._renderCatTabs(customer, unlockedProducts);
    this._renderProductsForTab(this._activeCatTab, unlockedProducts, customer);
    this._renderAddonOptions(unlockedProducts._addons || [], customer);

    document.getElementById('btn-complete-sale')?.addEventListener('click', () => {
      if (this._cart.length > 0) this.game.attemptSale(customer, this._cart);
    });
  }

  // ─── Cart management ───────────────────────────────────────
  _toggleCartItem(item, customer) {
    const existing = this._cart.findIndex(c => c.id === item.id);
    if (existing >= 0) {
      this._cart.splice(existing, 1);
    } else {
      this._cart.push(item);
    }
    this._refreshCartUI(customer);
    this._refreshProductButtons();
    this._refreshAddonButtons();
  }

  _refreshCartUI(customer) {
    const tolerance  = customer.typeDef.cartTolerance || 2;
    const cartItems  = document.getElementById('sp-cart-items');
    const cartTotal  = document.getElementById('sp-cart-total');
    const cartMood   = document.getElementById('sp-cart-mood');
    const cartTolEl  = document.getElementById('sp-cart-tolerance');
    const btnSell    = document.getElementById('btn-complete-sale');

    const total = this._cart.reduce((s, i) => s + i.price, 0);

    // Cart items list
    if (cartItems) {
      if (this._cart.length === 0) {
        cartItems.innerHTML = '<span class="sp-cart-empty">Add items above to build the sale</span>';
      } else {
        cartItems.innerHTML = this._cart.map(i => `
          <span class="sp-cart-item" data-id="${i.id}">
            ${i.name} <em>$${i.price}</em>
            <button class="sp-cart-remove" data-id="${i.id}">✕</button>
          </span>
        `).join('');
        cartItems.querySelectorAll('.sp-cart-remove').forEach(btn => {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            const id = btn.dataset.id;
            this._cart = this._cart.filter(c => c.id !== id);
            this._refreshCartUI(customer);
            this._refreshProductButtons();
            this._refreshAddonButtons();
          });
        });
      }
    }

    if (cartTotal) cartTotal.textContent = `Total: $${total}`;
    if (btnSell)   btnSell.disabled = this._cart.length === 0;

    // Mood + tolerance indicator
    const count = this._cart.length;
    if (cartTolEl) cartTolEl.textContent = `${count} / ${tolerance}`;
    if (cartMood) {
      if      (count === 0)              cartMood.textContent = '😊';
      else if (count <= tolerance)       cartMood.textContent = '😊';
      else if (count === tolerance + 1)  cartMood.textContent = '😐';
      else                               cartMood.textContent = '😤';
    }
  }

  _refreshProductButtons() {
    document.querySelectorAll('.product-cart-btn').forEach(btn => {
      const id      = btn.dataset.id;
      const inCart  = this._cart.some(c => c.id === id);
      btn.textContent  = inCart ? '✓ Added' : '+ Add';
      btn.className    = 'product-cart-btn' + (inCart ? ' in-cart' : '');
    });
  }

  _refreshAddonButtons() {
    document.querySelectorAll('.addon-cart-btn').forEach(btn => {
      const id     = btn.dataset.id;
      const inCart = this._cart.some(c => c.id === id);
      btn.textContent = inCart ? '✓' : '+';
      btn.className   = 'addon-cart-btn' + (inCart ? ' in-cart' : '');
    });
  }

  _renderCatTabs(customer, unlockedProducts) {
    const container = document.getElementById('sp-cat-tabs');
    if (!container) return;

    const allCats = Object.keys(PRODUCTS);
    container.innerHTML = allCats.map(cat => {
      const meta      = CATEGORY_META[cat];
      const isWants   = cat === customer.category;
      const isActive  = cat === this._activeCatTab;
      // Only show "Wants!" badge if player asked about category
      const showHint  = isWants && this._revealed && this._revealed.category;
      return `
        <button class="sp-cat-tab${isActive ? ' active' : ''}${showHint ? ' wants' : ''}" data-cat="${cat}">
          <span class="sp-cat-tab-icon">${meta.icon}</span>
          <span class="sp-cat-tab-label">${meta.label}</span>
          ${showHint ? '<span class="sp-cat-wants-badge">Wants!</span>' : ''}
        </button>
      `;
    }).join('');

    container.querySelectorAll('.sp-cat-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this._activeCatTab = btn.dataset.cat;
        container.querySelectorAll('.sp-cat-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const banner = document.getElementById('sp-wrong-cat-banner');
        if (banner) {
          const wrongTab = this._activeCatTab !== customer.category;
          banner.style.display = (this._revealed.category && wrongTab) ? 'flex' : 'none';
        }

        this._renderProductsForTab(this._activeCatTab, unlockedProducts, customer);
      });
    });
  }

  _renderProductsForTab(cat, unlockedProducts, customer) {
    const products = unlockedProducts[cat] || [];
    const meta     = CATEGORY_META[cat];
    const titleEl  = document.getElementById('sp-products-title');
    if (titleEl) titleEl.textContent = `${meta.icon} ${meta.label}`;
    this._renderProductOptions(products, customer);
  }

  _renderProductOptions(products, customer) {
    const container = document.getElementById('sp-products');
    if (!container) return;

    const cat = this._activeCatTab;
    container.innerHTML = products.map(p => {
      const overBudget = p.price > customer.budget;
      const inCart     = this._cart && this._cart.some(c => c.id === p.id);
      let tag = '';
      if (this._revealed && this._revealed.budget) {
        tag = overBudget
          ? `<span class="tag tag-upsell">↑ $${p.price - customer.budget} over</span>`
          : `<span class="tag tag-ok">In budget ✓</span>`;
      }
      return `
        <div class="product-card ${overBudget ? 'over-budget' : 'in-budget'}${inCart ? ' in-cart-card' : ''}"
             data-product-id="${p.id}">
          <div class="product-name">${p.name}</div>
          <div class="product-desc">${p.desc}</div>
          <div class="product-effect">✨ ${p.effect}</div>
          <div class="product-footer">
            <span class="product-price">$${p.price}</span>
            ${tag}
            <button class="product-cart-btn${inCart ? ' in-cart' : ''}" data-id="${p.id}">${inCart ? '✓ Added' : '+ Add'}</button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.product-cart-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const p = products.find(pr => pr.id === btn.dataset.id);
        if (!p) return;
        this._toggleCartItem({ id: p.id, name: p.name, price: p.price, cost: p.cost, category: cat, isAddon: false }, customer);
        // Refresh card highlight
        container.querySelectorAll('.product-card').forEach(card => {
          const inC = this._cart.some(c => c.id === card.dataset.productId);
          card.classList.toggle('in-cart-card', inC);
        });
      });
    });
  }

  _renderAddonOptions(addons, customer) {
    const container = document.getElementById('sp-addons');
    if (!container) return;

    container.innerHTML = addons.map(a => {
      const inCart = this._cart && this._cart.some(c => c.id === a.id);
      return `
        <div class="addon-card${inCart ? ' in-cart-card' : ''}" data-addon-id="${a.id}">
          <span class="addon-icon">${a.icon}</span>
          <span class="addon-name">${a.name}</span>
          <span class="addon-price">$${a.price}</span>
          <button class="addon-cart-btn${inCart ? ' in-cart' : ''}" data-id="${a.id}">${inCart ? '✓' : '+'}</button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.addon-cart-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const a = addons.find(ad => ad.id === btn.dataset.id);
        if (!a) return;
        this._toggleCartItem({ id: a.id, name: a.name, price: a.price, cost: a.cost, category: null, isAddon: true }, customer);
        container.querySelectorAll('.addon-card').forEach(card => {
          const inC = this._cart.some(c => c.id === card.dataset.addonId);
          card.classList.toggle('in-cart-card', inC);
        });
      });
    });
  }



  // ─── Sale result notification ──────────────────────────────
  showNotification(text, type = 'success', durationMs = 2800) {
    const panel = this.panels.notification;
    if (!panel) return;
    panel.className = `notification notification-${type}`;
    panel.innerHTML = text;
    panel.style.display = 'block';
    clearTimeout(this._notifTimer);
    this._notifTimer = setTimeout(() => {
      panel.style.display = 'none';
    }, durationMs);
  }

  // ─── Star review toast ────────────────────────────────────
  showReview(stars) {
    const panel = this.panels.review;
    if (!panel) return;

    const isGood = stars >= 4;
    const goodMsgs = [
      'Amazing selection — knew exactly what I needed!',
      'Best dispensary in town. Highly recommend Skones!',
      'Staff really listened. Perfect recommendation.',
      'Will definitely be back. Top tier service!',
    ];
    const badMsgs = [
      "Didn't listen to what I wanted at all.",
      'Tried to sell me something completely different. Terrible.',
      'Zero stars if I could. Complete waste of my time.',
      'Rude and unhelpful. Never going back.',
    ];
    const msgs = isGood ? goodMsgs : badMsgs;
    const msg  = msgs[Math.floor(Math.random() * msgs.length)];
    const names = ['Alex R.', 'Jordan T.', 'Sam K.', 'Casey M.', 'Riley B.', 'Morgan P.'];
    const name  = names[Math.floor(Math.random() * names.length)];

    panel.innerHTML = `
      <div class="review-toast ${isGood ? 'review-good' : 'review-bad'}">
        <div class="review-header">
          <span class="review-stars">${'⭐'.repeat(stars)}</span>
          <span class="review-name">${name}</span>
        </div>
        <div class="review-msg">"${msg}"</div>
      </div>
    `;
    panel.style.display = 'block';
    clearTimeout(this._reviewTimer);
    this._reviewTimer = setTimeout(() => { panel.style.display = 'none'; }, 4000);
  }

  // ─── End-of-day panel ─────────────────────────────────────
  renderEOD(stats) {
    const panel = this.panels.eod;
    if (!panel) return;

    panel.innerHTML = `
      <div class="eod-container">
        <div class="eod-logo">🌿 End of Day ${stats.day}</div>
        <h2 class="eod-title">Daily Summary</h2>

        <div class="eod-stats">
          <div class="eod-stat">
            <div class="eod-stat-label">Customers Served</div>
            <div class="eod-stat-value">${stats.customersServed}</div>
          </div>
          <div class="eod-stat">
            <div class="eod-stat-label">Revenue</div>
            <div class="eod-stat-value money">$${stats.revenue.toFixed(0)}</div>
          </div>
          <div class="eod-stat">
            <div class="eod-stat-label">Profit</div>
            <div class="eod-stat-value ${stats.profit >= 0 ? 'money' : 'negative'}">
              $${stats.profit.toFixed(0)}
            </div>
          </div>
          <div class="eod-stat">
            <div class="eod-stat-label">Everyone's Happy</div>
            <div class="eod-stat-value upsell">${stats.upsells}</div>
          </div>
          <div class="eod-stat">
            <div class="eod-stat-label">Add-ons Sold</div>
            <div class="eod-stat-value">${stats.addonsSold}</div>
          </div>
          <div class="eod-stat">
            <div class="eod-stat-label">Reputation</div>
            <div class="eod-stat-value rep">${Math.round(stats.reputation)}</div>
          </div>
        </div>

        <div class="eod-cash">
          Cash on Hand: <strong>$${stats.money.toFixed(0)}</strong>
        </div>

        <div class="eod-actions">
          <button class="btn btn-brand" id="btn-visit-vendors">
            🤝 Visit Vendors
          </button>
          <button class="btn btn-secondary" id="btn-open-marketing">
            📣 Marketing
          </button>
          <button class="btn btn-primary" id="btn-next-day">
            Next Day →
          </button>
        </div>

        <div class="eod-leaderboard-section">
          <div class="eod-score-line">🏆 Your score: <strong>${stats.score.toLocaleString()}</strong></div>
          ${LEADERBOARD.enabled ? `
            <div class="eod-submit-row" id="eod-submit-row">
              <input class="eod-name-input" id="eod-player-name" type="text" maxlength="20" placeholder="Your name" />
              <button class="btn btn-secondary eod-submit-btn" id="btn-submit-score">Submit Score</button>
              <button class="btn btn-secondary eod-submit-btn" id="btn-view-lb">View Leaderboard</button>
            </div>
          ` : `
            <div class="eod-lb-note">
              <button class="btn btn-secondary eod-submit-btn" id="btn-view-lb">🏆 View Leaderboard</button>
            </div>
          `}
        </div>
      </div>
    `;

    document.getElementById('btn-visit-vendors')?.addEventListener('click', () => this.game.showVendors());
    document.getElementById('btn-open-marketing')?.addEventListener('click', () => this.game.showMarketing());
    document.getElementById('btn-next-day')?.addEventListener('click', () => this.game.startDay());
    document.getElementById('btn-view-lb')?.addEventListener('click', () => this.renderLeaderboard('eod'));

    document.getElementById('btn-submit-score')?.addEventListener('click', async () => {
      const nameEl = document.getElementById('eod-player-name');
      const name = (nameEl?.value || '').trim();
      if (!name) { nameEl?.focus(); return; }
      const btn = document.getElementById('btn-submit-score');
      if (btn) btn.textContent = 'Submitting…';
      const ok = await LEADERBOARD.submitScore(name, stats.score, stats.day, Math.round(stats.reputation));
      const row = document.getElementById('eod-submit-row');
      if (row) {
        row.innerHTML = ok
          ? `<span class="eod-submit-ok">✅ Score submitted! <button class="btn btn-secondary eod-submit-btn" id="btn-view-lb-after">View Leaderboard</button></span>`
          : `<span style="color:#c04040">❌ Couldn't submit — check your connection.</span>`;
        document.getElementById('btn-view-lb-after')?.addEventListener('click', () => this.renderLeaderboard('eod'));
      }
    });

    this.showOnly('eod');
  }

  // ─── Vendor panel ─────────────────────────────────────────
  renderVendors(vendors, money) {
    const panel = this.panels.vendor;
    if (!panel) return;

    panel.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h2>🤝 Vendor Hall</h2>
          <div class="modal-money">Cash: <strong>$${money.toFixed(0)}</strong></div>
        </div>

        <div class="vendor-grid" id="vendor-grid"></div>

        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-vendor-back">← Back</button>
        </div>
      </div>
    `;

    const grid = document.getElementById('vendor-grid');
    if (grid) {
      vendors.forEach(v => {
        const canAfford   = money >= v.cost;
        const isUnlocked  = v.unlocked;
        const isAvailable = v.available;

        let statusClass = '';
        let btnHtml     = '';

        if (isUnlocked) {
          statusClass = 'vendor-unlocked';
          btnHtml     = `<div class="vendor-status-badge badge-green">✓ Partner</div>`;
        } else if (!isAvailable) {
          statusClass = 'vendor-locked';
          btnHtml     = `<div class="vendor-status-badge badge-grey">🔒 Unlocks Day ${v.unlocksAfterDay}</div>`;
        } else {
          statusClass = canAfford ? 'vendor-available' : 'vendor-costly';
          btnHtml     = `
            <button class="btn ${canAfford ? 'btn-brand' : 'btn-disabled'} btn-vendor-deal"
                    data-vendor-id="${v.id}" ${canAfford ? '' : 'disabled'}>
              ${canAfford ? `Deal — $${v.cost}` : `Need $${v.cost - money} more`}
            </button>`;
        }

        // Product unlocks preview
        const unlockList = [
          ...Object.keys(PRODUCTS).flatMap(cat => {
            if (!v.unlocks?.products) return [];
            return v.unlocks.products
              .filter(pid => PRODUCTS[cat].find(p => p.id === pid))
              .map(pid => {
                const p = PRODUCTS[cat].find(pr => pr.id === pid);
                return p ? `${CATEGORY_META[cat]?.icon} ${p.name}` : '';
              });
          }),
          ...(v.unlocks?.addons || []).map(aid => {
            const a = ADDONS.find(ad => ad.id === aid);
            return a ? `${a.icon} ${a.name}` : '';
          }),
        ].filter(Boolean);

        grid.innerHTML += `
          <div class="vendor-card ${statusClass}">
            <div class="vendor-avatar">${v.avatar}</div>
            <div class="vendor-info">
              <div class="vendor-name">${v.name}</div>
              <div class="vendor-tagline">${v.tagline}</div>
              <div class="vendor-pitch">"${v.pitch}"</div>
              <div class="vendor-unlocks">
                <strong>Unlocks:</strong>
                <div class="unlock-list">${unlockList.map(u => `<span class="unlock-tag">${u}</span>`).join('')}</div>
              </div>
              <div class="vendor-perks">
                +${v.customerBoostPerDay} customers/day &nbsp;•&nbsp; +${v.reputationBoost} reputation
              </div>
            </div>
            <div class="vendor-action">${btnHtml}</div>
          </div>
        `;
      });

      grid.querySelectorAll('.btn-vendor-deal').forEach(btn => {
        btn.addEventListener('click', () => {
          this.game.unlockVendor(btn.dataset.vendorId);
        });
      });
    }

    document.getElementById('btn-vendor-back')?.addEventListener('click', () => {
      this.game.showEOD();
    });

    this.showOnly('vendor');
  }

  // ─── Marketing panel ──────────────────────────────────────
  renderMarketing(campaigns, activeCampaigns, money) {
    const panel = this.panels.marketing;
    if (!panel) return;

    panel.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h2>📣 Marketing</h2>
          <div class="modal-money">Cash: <strong>$${money.toFixed(0)}</strong></div>
        </div>

        <div class="marketing-grid" id="marketing-grid"></div>

        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-marketing-back">← Back</button>
        </div>
      </div>
    `;

    const grid = document.getElementById('marketing-grid');
    if (grid) {
      campaigns.forEach(c => {
        const active    = activeCampaigns.find(ac => ac.id === c.id);
        const canAfford = money >= c.cost;
        const permanent = c.durationDays >= 9999;

        let statusHtml = '';
        if (active) {
          statusHtml = `
            <div class="marketing-active">
              ✅ Active — ${permanent ? 'Permanent' : `${active.daysLeft} days left`}
            </div>`;
        } else {
          statusHtml = `
            <button class="btn ${canAfford ? 'btn-brand' : 'btn-disabled'} btn-launch-campaign"
                    data-campaign-id="${c.id}" ${canAfford ? '' : 'disabled'}>
              ${canAfford ? `Launch — $${c.cost}` : `Need $${c.cost - money} more`}
            </button>`;
        }

        grid.innerHTML += `
          <div class="marketing-card ${active ? 'active' : ''}">
            <div class="marketing-icon">${c.icon}</div>
            <div class="marketing-info">
              <div class="marketing-name">${c.name}</div>
              <div class="marketing-desc">${c.desc}</div>
              <div class="marketing-perks">
                +${c.customerBoostPerDay} customers/day
                ${permanent ? '(permanent)' : `for ${c.durationDays} days`}
                &nbsp;•&nbsp; +${c.reputationBoost} reputation
              </div>
            </div>
            <div class="marketing-action">${statusHtml}</div>
          </div>
        `;
      });

      grid.querySelectorAll('.btn-launch-campaign').forEach(btn => {
        btn.addEventListener('click', () => {
          this.game.launchCampaign(btn.dataset.campaignId);
        });
      });
    }

    document.getElementById('btn-marketing-back')?.addEventListener('click', () => {
      this.game.showEOD();
    });

    this.showOnly('marketing');
  }

  // ─── How to Play panel ────────────────────────────────────
  renderHowToPlay(returnTo) {
    // returnTo = 'menu' | 'game'  (so the back button goes to the right place)
    const panel = this.panels.howtoplay;
    if (!panel) return;

    panel.innerHTML = `
      <div class="htp-container">

        <div class="htp-header">
          <div class="htp-title">📖 How to Play</div>
          <button class="btn btn-secondary htp-close" id="btn-htp-close">
            ${returnTo === 'menu' ? '← Back to Menu' : '← Back to Game'}
          </button>
        </div>

        <div class="htp-body">

          <!-- ── OVERVIEW ── -->
          <div class="htp-section">
            <div class="htp-section-title">🌿 The Big Picture</div>
            <p class="htp-text">
              You're running <strong>Skones</strong> — a cannabis dispensary.
              Customers walk in every shift, but they <em>won't tell you what they want upfront</em>.
              Your job is to <strong>ask the right questions, read between the lines,
              build the right sale, and close it fast</strong>.
              The more you earn, the more vendors and marketing you unlock — growing your store into an empire.
            </p>
          </div>

          <!-- ── DAILY FLOW ── -->
          <div class="htp-section">
            <div class="htp-section-title">🗓️ A Day in the Store</div>
            <div class="htp-steps">
              <div class="htp-step"><span class="htp-step-num">1</span>
                <div><strong>Customer walks up</strong> — reads their vague opening line. They won't tell you what they want yet.</div>
              </div>
              <div class="htp-step"><span class="htp-step-num">2</span>
                <div><strong>Ask up to 2 questions</strong> — choose wisely from "What are you looking for?", "What's your budget?", and "What effects are you after?". Ask too many and they'll walk out. Sometimes they'll volunteer info on their own.</div>
              </div>
              <div class="htp-step"><span class="htp-step-num">3</span>
                <div><strong>Make a Recommendation</strong> — browse categories and add items to the cart with the <strong>+ Add</strong> button. Build a haul — but don't overdo it.</div>
              </div>
              <div class="htp-step"><span class="htp-step-num">4</span>
                <div><strong>Complete the Sale</strong> — hit the green button. Watch the cart mood emoji: 😊 = good, 😐 = pushing it, 😤 = they'll walk.</div>
              </div>
              <div class="htp-step"><span class="htp-step-num">5</span>
                <div><strong>End of Day</strong> — review earnings, visit vendors, invest in marketing. Rinse and repeat.</div>
              </div>
            </div>
          </div>

          <!-- ── CONVERSATION ── -->
          <div class="htp-section">
            <div class="htp-section-title">💬 Asking the Right Questions</div>
            <p class="htp-text">You can only ask <strong>2 of the 3 questions</strong> — choose wisely. Each reveals key intel:</p>
            <div class="htp-steps">
              <div class="htp-step"><span class="htp-step-num">🔍</span>
                <div><strong>"What are you looking for?"</strong> — Reveals their category. The matching tab gets a <em>Wants!</em> badge. Skip this and you're guessing blind.</div>
              </div>
              <div class="htp-step"><span class="htp-step-num">💰</span>
                <div><strong>"What's your budget?"</strong> — Reveals their budget. Products then show <em>In budget ✓</em> or <em>↑ over budget</em> tags.</div>
              </div>
              <div class="htp-step"><span class="htp-step-num">✨</span>
                <div><strong>"What effects are you after?"</strong> — Their answer contains <strong>hidden clues</strong>. Sometimes it hints at a smarter recommendation than their stated category.</div>
              </div>
            </div>
            <div class="htp-tip">⚠️ Ask more than their patience allows and they'll walk out. Watch for the warning — the 3rd button turns red when you're at the limit. Some customers are in a hurry and only tolerate one question.</div>
            <div class="htp-tip">💬 Sometimes a customer volunteers info before you even ask — a green bubble appears. That's a freebie and doesn't count as a question.</div>
            <div class="htp-tip">🔄 <strong>Returning customers:</strong> You already remember their category. The more they visit, the less you need to ask — a regular might only need one quick question before you know exactly what they want.</div>
          </div>

          <!-- ── SMART SELLS ── -->
          <div class="htp-section">
            <div class="htp-section-title">🌟 Smart Sells — Reading the Room</div>
            <p class="htp-text">
              Sometimes a customer comes in for one thing but their <strong>effects hint</strong>
              suggests something else would actually suit them better.
              If you offer a compatible alternative that matches their hints, there's a
              <strong>65% chance they love it</strong> — and you get a bonus reputation boost for reading the room.
            </p>
            <div class="htp-products-grid">
              <div class="htp-prod-row"><span class="htp-prod-icon">🌿→🪄</span><div>Flower customer says <em>"I'm always on the go, something convenient"</em> → try Pre-rolls</div></div>
              <div class="htp-prod-row"><span class="htp-prod-icon">🌿→🏺</span><div>Flower customer says <em>"I want to invest in a nice piece for home"</em> → try a BSkone Bong</div></div>
              <div class="htp-prod-row"><span class="htp-prod-icon">🍬→💨</span><div>Edibles customer says <em>"Need something discreet and portable"</em> → try Vapes</div></div>
              <div class="htp-prod-row"><span class="htp-prod-icon">💨→💎</span><div>Vape customer says <em>"I dab, need something strong"</em> → try Concentrate</div></div>
            </div>
            <div class="htp-tip">💡 If the effects hint doesn't match the category you're offering, offering the wrong thing will still make them leave.</div>
          </div>

          <!-- ── CART & OVERSELL ── -->
          <div class="htp-section">
            <div class="htp-section-title">🛒 Building the Cart — Don't Oversell</div>
            <p class="htp-text">
              You can add <strong>multiple products and add-ons</strong> to the cart before completing a sale.
              But every customer has a tolerance for how much they'll buy.
              Push too hard and they'll walk out without buying <em>anything</em>.
            </p>
            <div class="htp-customers">
              <div class="htp-customer-card" style="border-color:#7090A8">
                <div class="htp-cust-emoji">👕</div>
                <div class="htp-cust-name" style="color:#7090A8">Budget Shopper</div>
                <div class="htp-cust-stat">Cart limit: <strong>1 item</strong></div>
                <div class="htp-cust-desc">Just wants their one thing. Add anything extra and they'll push back.</div>
              </div>
              <div class="htp-customer-card" style="border-color:#78A870">
                <div class="htp-cust-emoji">🧥</div>
                <div class="htp-cust-name" style="color:#78A870">Curious Explorer</div>
                <div class="htp-cust-stat">Cart limit: <strong>2 items</strong></div>
                <div class="htp-cust-desc">Open to one extra. A lighter or grinder works great.</div>
              </div>
              <div class="htp-customer-card" style="border-color:#A07840">
                <div class="htp-cust-emoji">🥼</div>
                <div class="htp-cust-name" style="color:#A07840">Cannabis Enthusiast</div>
                <div class="htp-cust-stat">Cart limit: <strong>3 items</strong></div>
                <div class="htp-cust-desc">Loves building a haul. Load them up.</div>
              </div>
              <div class="htp-customer-card" style="border-color:#A06088">
                <div class="htp-cust-emoji">🥻</div>
                <div class="htp-cust-name" style="color:#A06088">High Roller</div>
                <div class="htp-cust-stat">Cart limit: <strong>4 items</strong></div>
                <div class="htp-cust-desc">Take everything. Pile it on — they're here to spend.</div>
              </div>
            </div>
          </div>

          <!-- ── REVIEWS & SPEED ── -->
          <div class="htp-section">
            <div class="htp-section-title">⭐ Reviews & Speed</div>
            <p class="htp-text">
              Happy customers sometimes leave <strong>5-star reviews</strong>. Unhappy customers leave <strong>1-star reviews</strong>.
              But even a successful sale can get a bad review if you took too long.
              Speed matters — faster service = better chance of a glowing review.
            </p>
            <div class="htp-steps">
              <div class="htp-step"><span class="htp-step-num">⚡</span><div><strong>Under 12 seconds</strong> — 70% chance of 5-star review</div></div>
              <div class="htp-step"><span class="htp-step-num">🕐</span><div><strong>12–25 seconds</strong> — 45% good, 5% bad</div></div>
              <div class="htp-step"><span class="htp-step-num">🐢</span><div><strong>25–45 seconds</strong> — Even odds of good vs bad review</div></div>
              <div class="htp-step"><span class="htp-step-num">😤</span><div><strong>Over 45 seconds</strong> — 50% chance of a 1-star even if sale succeeds</div></div>
            </div>
          </div>

          <!-- ── VENDORS ── -->
          <div class="htp-section">
            <div class="htp-section-title">🤝 Vendors — Grow Your Inventory</div>
            <p class="htp-text">
              After each day, visit the <strong>Vendor Hall</strong> to partner with suppliers.
              Each vendor unlocks higher-tier products, more customers per day, and a reputation boost.
            </p>
            <div class="htp-vendor-list">
              <div class="htp-vendor-row"><span>🌸</span><div><strong>Florist Fridays</strong> — $600. Unlocks Wedding Cake, Runtz, King Size pre-rolls.</div></div>
              <div class="htp-vendor-row"><span>☁️</span><div><strong>Cloud Nine Extracts</strong> — $800. Unlocks live resin &amp; rosin vapes and concentrates.</div></div>
              <div class="htp-vendor-row"><span>🧁</span><div><strong>Happy Bakers Co.</strong> — $700. Unlocks premium and nano edibles.</div></div>
              <div class="htp-vendor-row"><span>🏺</span><div><strong>BSkone Glass Works</strong> — $950. Unlocks Artisan, Signature &amp; Grand Artist bongs.</div></div>
              <div class="htp-vendor-row"><span>🏆</span><div><strong>Premium Cultivars</strong> — $1,800. Unlocks exotic top-shelf flower (Day 5+).</div></div>
              <div class="htp-vendor-row"><span>💎</span><div><strong>Apex Concentrates</strong> — $2,500. Unlocks Diamonds &amp; Sauce (Day 8+).</div></div>
            </div>
          </div>

          <!-- ── MARKETING ── -->
          <div class="htp-section">
            <div class="htp-section-title">📣 Marketing — Fill the Store</div>
            <p class="htp-text">
              Invest in marketing campaigns at end of day to add more customers per shift and boost reputation.
            </p>
            <div class="htp-tip">💡 The Loyalty Card Program ($400) is permanent — buy it as soon as you can.</div>
          </div>

          <!-- ── TIPS ── -->
          <div class="htp-section htp-tips-section">
            <div class="htp-section-title">🔥 Pro Tips</div>
            <div class="htp-tip">🔍 Always ask "What are you looking for?" first — recommending the wrong category sends them straight out the door.</div>
            <div class="htp-tip">✨ The effects hint is your most powerful tool — read it carefully, it often points to a better sale than the obvious choice.</div>
            <div class="htp-tip">😊 Watch the cart mood emoji — the moment it hits 😐 you're at the limit. One more item and you risk losing the whole sale.</div>
            <div class="htp-tip">⚡ Speed beats perfection — a quick solid sale beats a slow perfect one when reviews are on the line.</div>
            <div class="htp-tip">🏺 BSkone Bongs have the highest margins. The Grand Artist ($320) returns nearly $200 profit — worth unlocking BSkone Glass Works early.</div>
            <div class="htp-tip">🔄 Returning customers are gold — ask about their last visit and nail the follow-up. They're already fans.</div>
          </div>

        </div><!-- /htp-body -->

        <div class="htp-footer">
          <button class="btn btn-brand" id="btn-htp-close-bottom">
            ${returnTo === 'menu' ? '← Back to Menu' : '✅ Got It — Back to Game'}
          </button>
        </div>

      </div><!-- /htp-container -->
    `;

    document.getElementById('btn-htp-close')?.addEventListener('click',        () => this._closeHowToPlay(returnTo));
    document.getElementById('btn-htp-close-bottom')?.addEventListener('click', () => this._closeHowToPlay(returnTo));

    this.showOnly('howtoplay');
    panel.style.display = 'flex';
  }

  _closeHowToPlay(returnTo) {
    if (returnTo === 'menu') {
      this.showOnly('menu');
    } else {
      // Return to wherever the game was (playing, EOD, etc.)
      this.panels.howtoplay.style.display = 'none';
      if (this.panels.hud) this.panels.hud.style.display = 'flex';
    }
  }

  // ─── Leaderboard panel ────────────────────────────────────
  async renderLeaderboard(returnTo = 'menu') {
    const panel = this.panels.leaderboard;
    if (!panel) return;

    panel.innerHTML = `
      <div class="modal-container lb-panel">
        <div class="modal-header">
          <h2>🏆 Leaderboard</h2>
        </div>
        <div id="lb-content" class="lb-content">
          ${LEADERBOARD.enabled
            ? '<div class="lb-loading">⏳ Loading scores…</div>'
            : `<div class="lb-setup">
                <div class="lb-setup-title">🔧 Leaderboard Setup Required</div>
                <p>To enable the public leaderboard, create a free Supabase account and follow these steps:</p>
                <ol class="lb-setup-steps">
                  <li>Go to <strong>supabase.com</strong> → New Project</li>
                  <li>Open <strong>SQL Editor</strong> and run:<br>
                    <code>CREATE TABLE leaderboard (id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY, player_name TEXT, score INT, days_played INT, reputation INT, created_at TIMESTAMPTZ DEFAULT NOW());<br>
                    ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;<br>
                    CREATE POLICY "public read"  ON leaderboard FOR SELECT USING (true);<br>
                    CREATE POLICY "public write" ON leaderboard FOR INSERT WITH CHECK (true);</code>
                  </li>
                  <li>Copy your <strong>Project URL</strong> and <strong>anon public key</strong> from Settings → API</li>
                  <li>Paste them into <strong>js/leaderboard.js</strong> (url and key fields)</li>
                </ol>
              </div>`
          }
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-lb-back">← Back</button>
        </div>
      </div>
    `;

    document.getElementById('btn-lb-back')?.addEventListener('click', () => {
      if (returnTo === 'eod') {
        this.game.showEOD();
      } else {
        this.renderMenu(Game.hasSave());
      }
    });

    this.showOnly('leaderboard');

    if (!LEADERBOARD.enabled) return;

    const scores = await LEADERBOARD.getTopScores(10);
    const content = document.getElementById('lb-content');
    if (!content) return;

    if (!scores || scores.length === 0) {
      content.innerHTML = '<div class="lb-empty">No scores yet — be the first to submit!</div>';
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    content.innerHTML = `
      <table class="lb-table">
        <thead><tr><th>#</th><th>Player</th><th>Score</th><th>Day</th><th>Rep</th></tr></thead>
        <tbody>
          ${scores.map((s, i) => `
            <tr class="${i < 3 ? 'lb-medal-' + i : ''}">
              <td>${medals[i] || i + 1}</td>
              <td>${s.player_name}</td>
              <td>${Number(s.score).toLocaleString()}</td>
              <td>${s.days_played}</td>
              <td>${s.reputation}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}
