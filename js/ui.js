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
    ['menu','hud','service','eod','vendor','marketing','notification','howtoplay','review']
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
  renderMenu() {
    this.showOnly('menu');
  }

  // ─── Service panel (serving current customer) ─────────────
  renderServicePanel(customer, unlockedProducts, history = null) {
    const panel = this.panels.service;
    if (!panel) return;

    this._activeCatTab = customer.category;
    this._revealed     = { category: false, budget: false, effects: false, lastVisit: false };

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

    const isReturning = history && history.visits > 0;
    const catMeta     = CATEGORY_META[customer.category];

    body.innerHTML = `
      <div class="sp-convo-section">
        <div class="sp-convo-label">💬 Ask questions to learn what they need:</div>
        <div class="sp-questions" id="sp-questions">
          <button class="sp-question-btn" id="q-category">🔍 What are you looking for today?</button>
          <button class="sp-question-btn" id="q-budget">💰 What's your budget like?</button>
          <button class="sp-question-btn" id="q-effects">✨ What kind of effects are you after?</button>
          ${isReturning ? '<button class="sp-question-btn" id="q-lastvisit">🔄 How was your last visit?</button>' : ''}
        </div>
      </div>
      <div class="sp-clue-box">
        <div class="sp-clue-title">📋 What you know so far:</div>
        <div id="sp-clues"><div class="sp-clue-empty">Ask questions to gather info before recommending...</div></div>
      </div>
    `;

    footer.innerHTML = `
      <button class="btn btn-brand sp-sell-btn" id="btn-make-rec">🛍️ Make a Recommendation →</button>
    `;

    // Wire question buttons
    document.getElementById('q-category')?.addEventListener('click', e => {
      if (this._revealed.category) return;
      this._revealed.category = true;
      e.currentTarget.classList.add('asked');
      e.currentTarget.textContent = `🔍 Looking for: ${catMeta.icon} ${catMeta.label}`;
      this._updateClues(customer, history);
    });

    document.getElementById('q-budget')?.addEventListener('click', e => {
      if (this._revealed.budget) return;
      this._revealed.budget = true;
      e.currentTarget.classList.add('asked');
      e.currentTarget.textContent = `💰 Budget: around $${customer.budget}`;
      this._updateClues(customer, history);
    });

    document.getElementById('q-effects')?.addEventListener('click', e => {
      if (this._revealed.effects) return;
      this._revealed.effects = true;
      e.currentTarget.classList.add('asked');
      e.currentTarget.textContent = `✨ "${customer.effectHint || 'Something good...'}"`;
      this._updateClues(customer, history);
    });

    if (isReturning) {
      document.getElementById('q-lastvisit')?.addEventListener('click', e => {
        if (this._revealed.lastVisit) return;
        this._revealed.lastVisit = true;
        e.currentTarget.classList.add('asked');
        const txt = history.satisfied
          ? `🔄 "${history.productName}? Loved it!" ✅`
          : `🔄 "Last time wasn't great..." ❌`;
        e.currentTarget.textContent = txt;
        this._updateClues(customer, history);
      });
    }

    document.getElementById('btn-make-rec')?.addEventListener('click', () => {
      this._renderRecommendationPhase(customer, unlockedProducts);
    });
  }

  _updateClues(customer, history) {
    const cluesEl = document.getElementById('sp-clues');
    if (!cluesEl) return;
    const catMeta = CATEGORY_META[customer.category];
    const items = [];
    if (this._revealed.category)
      items.push(`<div class="sp-clue-item">🎯 Wants: <strong>${catMeta.icon} ${catMeta.label}</strong></div>`);
    if (this._revealed.budget)
      items.push(`<div class="sp-clue-item">💰 Budget: <strong>~$${customer.budget}</strong></div>`);
    if (this._revealed.effects)
      items.push(`<div class="sp-clue-item">✨ <em>"${customer.effectHint || 'Something good'}"</em></div>`);
    if (this._revealed.lastVisit && history) {
      const icon = history.satisfied ? '✅' : '❌';
      const txt  = history.satisfied
        ? `Last bought <strong>${history.productName}</strong> — loved it`
        : `Last visit didn't go well — make it right`;
      items.push(`<div class="sp-clue-item">${icon} ${txt}</div>`);
    }
    cluesEl.innerHTML = items.length
      ? items.join('')
      : '<div class="sp-clue-empty">Ask questions to gather info before recommending...</div>';
  }

  // ─── Recommendation phase ──────────────────────────────────
  _renderRecommendationPhase(customer, unlockedProducts) {
    const body   = document.getElementById('sp-scroll-body');
    const footer = document.getElementById('sp-footer');
    if (!body || !footer) return;

    const catMeta = CATEGORY_META[customer.category];
    this._activeCatTab = customer.category;

    body.innerHTML = `
      <div class="sp-cat-tabs" id="sp-cat-tabs"></div>
      <div class="sp-wrong-cat-banner" id="sp-wrong-cat-banner" style="display:none">
        ⚠️ <strong>${customer.name}</strong> wants <strong>${catMeta.icon} ${catMeta.label}</strong> — wrong category = they leave!
      </div>
      <div class="sp-section-title" id="sp-products-title"></div>
      <div class="sp-products" id="sp-products"></div>
      <div class="sp-section-title">Add-On <span style="font-weight:400;color:#aaa">(optional)</span></div>
      <div class="sp-addons" id="sp-addons"></div>
    `;

    footer.innerHTML = `
      <div id="sp-selected-product" class="sp-selected-slot">👆 Select a product above</div>
      <div id="sp-selected-addon"   class="sp-selected-slot sp-addon-slot">No add-on</div>
      <button class="btn btn-brand sp-sell-btn" id="btn-complete-sale" disabled>💰 Complete Sale</button>
    `;

    this._renderCatTabs(customer, unlockedProducts);
    this._renderProductsForTab(customer.category, unlockedProducts, customer);
    this._renderAddonOptions(unlockedProducts._addons || []);

    document.getElementById('btn-complete-sale')?.addEventListener('click', () => {
      const selProduct = document.getElementById('sp-selected-product');
      const selAddon   = document.getElementById('sp-selected-addon');
      const productId  = selProduct?.dataset?.productId;
      const addonId    = selAddon?.dataset?.addonId;
      if (productId) this.game.attemptSale(customer, productId, addonId);
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
          // Only warn if player actually learned the category
          const wrongTab = this._activeCatTab !== customer.category;
          banner.style.display = (this._revealed.category && wrongTab) ? 'flex' : 'none';
        }

        const selProduct = document.getElementById('sp-selected-product');
        if (selProduct) {
          selProduct.textContent = '👆 Select a product above';
          delete selProduct.dataset.productId;
        }
        const btnComplete = document.getElementById('btn-complete-sale');
        if (btnComplete) btnComplete.disabled = true;

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

    container.innerHTML = products.map(p => {
      const overBudget = p.price > customer.budget;
      // Only show budget hint tags if player asked about budget
      let tag = '';
      if (this._revealed && this._revealed.budget) {
        tag = overBudget
          ? `<span class="tag tag-upsell">↑ $${p.price - customer.budget} over budget</span>`
          : `<span class="tag tag-ok">In budget ✓</span>`;
      }
      return `
        <div class="product-card ${overBudget ? 'over-budget' : 'in-budget'}"
             data-product-id="${p.id}" data-price="${p.price}">
          <div class="product-name">${p.name}</div>
          <div class="product-desc">${p.desc}</div>
          <div class="product-effect">✨ ${p.effect}</div>
          <div class="product-footer">
            <span class="product-price">$${p.price}</span>
            ${tag}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.product-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const pid = card.dataset.productId;
        const p   = products.find(pr => pr.id === pid);
        if (p) {
          const sel = document.getElementById('sp-selected-product');
          if (sel) {
            sel.textContent = `${p.name} — $${p.price}`;
            sel.dataset.productId = p.id;
          }
          this._checkSaleReady();
        }
      });
    });
  }

  _renderAddonOptions(addons) {
    const container = document.getElementById('sp-addons');
    if (!container) return;

    container.innerHTML = `
      <div class="addon-card addon-none selected" data-addon-id="none">
        <span class="addon-icon">🚫</span>
        <span class="addon-name">None</span>
      </div>
    ` + addons.map(a => `
      <div class="addon-card" data-addon-id="${a.id}" data-price="${a.price}">
        <span class="addon-icon">${a.icon}</span>
        <span class="addon-name">${a.name}</span>
        <span class="addon-price">$${a.price}</span>
      </div>
    `).join('');

    container.querySelectorAll('.addon-card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.addon-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const aid = card.dataset.addonId;
        const sel = document.getElementById('sp-selected-addon');
        if (sel) {
          if (aid === 'none') {
            sel.textContent = 'No add-on';
            sel.dataset.addonId = 'none';
          } else {
            const addon = ADDONS.find(a => a.id === aid);
            if (addon) {
              sel.textContent = `${addon.icon} ${addon.name} — $${addon.price}`;
              sel.dataset.addonId = addon.id;
            }
          }
        }
      });
    });
  }

  _checkSaleReady() {
    const btn = document.getElementById('btn-complete-sale');
    const sel = document.getElementById('sp-selected-product');
    if (btn && sel && sel.dataset.productId) {
      btn.disabled = false;
    }
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
            <div class="eod-stat-label">Successful Upsells</div>
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
      </div>
    `;

    document.getElementById('btn-visit-vendors')?.addEventListener('click', () => this.game.showVendors());
    document.getElementById('btn-open-marketing')?.addEventListener('click', () => this.game.showMarketing());
    document.getElementById('btn-next-day')?.addEventListener('click', () => this.game.startDay());
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
              Customers walk in every shift looking for something specific.
              Your job is to <strong>recommend the right product, suggest an add-on,
              and close the sale</strong>. The more you earn, the more vendors
              and marketing you can unlock — growing your store into an empire.
            </p>
          </div>

          <!-- ── DAILY FLOW ── -->
          <div class="htp-section">
            <div class="htp-section-title">🗓️ A Day in the Store</div>
            <div class="htp-steps">
              <div class="htp-step">
                <span class="htp-step-num">1</span>
                <div><strong>Customers arrive</strong> — they walk up to the counter and tell you what they're after.</div>
              </div>
              <div class="htp-step">
                <span class="htp-step-num">2</span>
                <div><strong>Pick a product</strong> — choose something in their budget for a sure sale, or suggest something pricier and try to upsell.</div>
              </div>
              <div class="htp-step">
                <span class="htp-step-num">3</span>
                <div><strong>Add an add-on</strong> — rolling papers, a lighter, a vape battery — a quick extra few dollars on every sale.</div>
              </div>
              <div class="htp-step">
                <span class="htp-step-num">4</span>
                <div><strong>Complete the Sale</strong> — hit the green button and watch the money roll in.</div>
              </div>
              <div class="htp-step">
                <span class="htp-step-num">5</span>
                <div><strong>End of Day</strong> — after 3 shifts, review your earnings, visit vendors, and invest in marketing before the next day.</div>
              </div>
            </div>
          </div>

          <!-- ── CUSTOMER TYPES ── -->
          <div class="htp-section">
            <div class="htp-section-title">👥 Know Your Customers</div>
            <p class="htp-text">Each customer has a type — watch for the badge on their shirt and adjust your pitch accordingly.</p>
            <div class="htp-customers">
              <div class="htp-customer-card" style="border-color:#7090A8">
                <div class="htp-cust-emoji">👕</div>
                <div class="htp-cust-name" style="color:#7090A8">Budget Shopper</div>
                <div class="htp-cust-desc">Has a strict budget. Rarely accepts upsells. Stick close to their number.</div>
                <div class="htp-cust-stat">Upsell chance: <strong style="color:#E05050">5%</strong></div>
              </div>
              <div class="htp-customer-card" style="border-color:#78A870">
                <div class="htp-cust-emoji">🧥</div>
                <div class="htp-cust-name" style="color:#78A870">Curious Explorer</div>
                <div class="htp-cust-desc">Open to suggestions and new things. Good target for a gentle upsell.</div>
                <div class="htp-cust-stat">Upsell chance: <strong style="color:#C86820">40%</strong></div>
              </div>
              <div class="htp-customer-card" style="border-color:#A07840">
                <div class="htp-cust-emoji">🥼</div>
                <div class="htp-cust-name" style="color:#A07840">Cannabis Enthusiast</div>
                <div class="htp-cust-desc">Loves premium products. Happy to spend more for quality. Push the top shelf.</div>
                <div class="htp-cust-stat">Upsell chance: <strong style="color:#2A8A50">65%</strong></div>
              </div>
              <div class="htp-customer-card" style="border-color:#A06088">
                <div class="htp-cust-emoji">🥻</div>
                <div class="htp-cust-name" style="color:#A06088">High Roller</div>
                <div class="htp-cust-desc">Only wants the finest. Always show the most expensive option — they'll almost always bite.</div>
                <div class="htp-cust-stat">Upsell chance: <strong style="color:#2A8A50">90%</strong></div>
              </div>
            </div>
          </div>

          <!-- ── PRODUCTS ── -->
          <div class="htp-section">
            <div class="htp-section-title">🛍️ Product Categories</div>
            <div class="htp-products-grid">
              <div class="htp-prod-row"><span class="htp-prod-icon">🌿</span><div><strong>Flower</strong> — Classic buds. Tiers from a $25 House Blend up to $105 Jealousy.</div></div>
              <div class="htp-prod-row"><span class="htp-prod-icon">🪄</span><div><strong>Pre-rolls</strong> — Ready to go. From an $8 House Pre-roll to $55 Diamond Infused.</div></div>
              <div class="htp-prod-row"><span class="htp-prod-icon">🍬</span><div><strong>Edibles</strong> — Gummies and chocolates. Ranges from $15 (10mg) to $85 Luxury Box.</div></div>
              <div class="htp-prod-row"><span class="htp-prod-icon">💨</span><div><strong>Vapes</strong> — Carts and devices. From a $35 500mg cart to a $125 All-In-One.</div></div>
              <div class="htp-prod-row"><span class="htp-prod-icon">💎</span><div><strong>Concentrate</strong> — Extracts for the serious consumer. $45 Live Resin to $125 Diamonds & Sauce.</div></div>
              <div class="htp-prod-row"><span class="htp-prod-icon">🏺</span><div><strong>BSkone Bongs</strong> — Handcrafted glass from our own collection. $45 Mini to $320 Grand Artist.</div></div>
            </div>
            <p class="htp-text" style="margin-top:10px">
              <strong>Tier 1 products</strong> are available from day one.
              <strong>Tier 2 &amp; 3</strong> unlock when you partner with the right vendor.
            </p>
          </div>

          <!-- ── UPSELLING ── -->
          <div class="htp-section">
            <div class="htp-section-title">💰 The Art of the Upsell</div>
            <p class="htp-text">
              When you recommend a product <strong>above a customer's budget</strong>,
              it's a gamble — they might say no. But if they say yes, you earn significantly more
              <em>and</em> gain bonus reputation. The customer's budget is shown in the top-right
              of the service panel. Products marked <span style="background:#FFF0D8;color:#C86820;
              padding:1px 6px;border-radius:4px;font-size:12px;font-weight:700">↑ over budget</span>
              are upsells. The further over budget, the lower the acceptance chance.
            </p>
            <div class="htp-tip">💡 <strong>Tip:</strong> Enthusiasts and High Rollers respond well to upsells. Never upsell a Budget Shopper more than 20% over — they'll walk out.</div>
          </div>

          <!-- ── ADD-ONS ── -->
          <div class="htp-section">
            <div class="htp-section-title">🛒 Add-Ons — Easy Extra Revenue</div>
            <p class="htp-text">
              After selecting a product, always offer an add-on from the register area.
              These are small impulse purchases — rolling papers ($3), a lighter ($2),
              a grinder ($15), a vape battery ($22), and more. Customers accept add-ons
              about 30–75% of the time depending on their type.
              Unlock more add-ons by partnering with vendors.
            </p>
            <div class="htp-tip">💡 <strong>Tip:</strong> Even a $3 rolling papers add-on sold 10 times a day is $30 pure profit. Don't skip it!</div>
          </div>

          <!-- ── VENDORS ── -->
          <div class="htp-section">
            <div class="htp-section-title">🤝 Vendors — Grow Your Inventory</div>
            <p class="htp-text">
              After each day, visit the <strong>Vendor Hall</strong> to partner with
              new suppliers. Each vendor you sign unlocks higher-tier products,
              brings in more customers per day, and boosts your reputation.
              Vendors are a one-time cost — invest early and they pay back fast.
            </p>
            <div class="htp-vendor-list">
              <div class="htp-vendor-row"><span>🌸</span><div><strong>Florist Fridays</strong> — $600. Unlocks Wedding Cake, Runtz, King Size pre-rolls.</div></div>
              <div class="htp-vendor-row"><span>☁️</span><div><strong>Cloud Nine Extracts</strong> — $800. Unlocks live resin &amp; rosin vapes and concentrates.</div></div>
              <div class="htp-vendor-row"><span>🧁</span><div><strong>Happy Bakers Co.</strong> — $700. Unlocks premium and nano edibles.</div></div>
              <div class="htp-vendor-row"><span>🏺</span><div><strong>BSkone Glass Works</strong> — $950. Unlocks Artisan, Signature &amp; Grand Artist bongs.</div></div>
              <div class="htp-vendor-row"><span>🏆</span><div><strong>Premium Cultivars</strong> — $1,800. Unlocks exotic top-shelf flower (unlocks Day 5+).</div></div>
              <div class="htp-vendor-row"><span>💎</span><div><strong>Apex Concentrates</strong> — $2,500. Unlocks Diamonds &amp; Sauce (unlocks Day 8+).</div></div>
            </div>
          </div>

          <!-- ── MARKETING ── -->
          <div class="htp-section">
            <div class="htp-section-title">📣 Marketing — Fill the Store</div>
            <p class="htp-text">
              More customers = more sales. Invest in marketing campaigns from the
              <strong>Marketing</strong> tab at end of day. Campaigns add bonus
              customers per shift and boost your reputation. Some are temporary,
              some are permanent.
            </p>
            <div class="htp-tip">💡 <strong>Tip:</strong> The Loyalty Card Program ($400) is permanent — buy it as soon as you can afford it.</div>
          </div>

          <!-- ── REPUTATION ── -->
          <div class="htp-section">
            <div class="htp-section-title">⭐ Reputation</div>
            <p class="htp-text">
              Every successful sale builds your reputation. Upsells give a bigger boost.
              Higher reputation unlocks more High Roller customers and increases your
              daily foot traffic naturally. Watch the green bar in the HUD.
            </p>
          </div>

          <!-- ── TIPS ── -->
          <div class="htp-section htp-tips-section">
            <div class="htp-section-title">🔥 Pro Tips</div>
            <div class="htp-tip">🎯 Always offer an add-on — even if the customer says no, there's no downside.</div>
            <div class="htp-tip">📈 Unlock vendors before marketing — new products bring new customer types organically.</div>
            <div class="htp-tip">🏺 BSkone Bongs have the highest margins in the store. The Grand Artist at $320 returns nearly $200 profit per sale.</div>
            <div class="htp-tip">⏰ A customer's patience bar drains if you ignore them — serve them before it runs out or they leave empty-handed.</div>
            <div class="htp-tip">🎸 The Grand In-Store Event marketing ($2,200) gives a massive +25 reputation spike — great once you're established.</div>
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
}
