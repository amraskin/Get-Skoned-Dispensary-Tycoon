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
    ['menu','hud','service','eod','vendor','marketing','notification']
      .forEach(id => { this.panels[id] = document.getElementById(`panel-${id}`); });
  }

  showOnly(panelName) {
    Object.keys(this.panels).forEach(k => {
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
  renderServicePanel(customer, unlockedProducts) {
    const panel = this.panels.service;
    if (!panel) return;

    const cat       = customer.category;
    const catMeta   = CATEGORY_META[cat];
    const available = unlockedProducts[cat] || [];

    panel.innerHTML = `
      <div class="sp-header">
        <div class="sp-customer-info">
          <div class="sp-avatar">${customer.typeDef.outfits[0]}</div>
          <div class="sp-details">
            <div class="sp-name">${customer.name}</div>
            <div class="sp-type" style="color:${customer.typeDef.color}">${customer.typeDef.label}</div>
            <div class="sp-request">Looking for: <strong>${catMeta.icon} ${catMeta.label}</strong> &nbsp;|&nbsp; Budget: <strong>$${customer.budget}</strong></div>
            <div class="sp-dialogue">"${customer.dialogue}"</div>
          </div>
        </div>
        <button class="btn btn-secondary sp-skip" id="btn-skip-customer">Pass</button>
      </div>

      <div class="sp-scroll-body">
        <div class="sp-section-title">Recommend a Product</div>
        <div class="sp-products" id="sp-products"></div>

        <div class="sp-section-title">Suggest an Add-On <span style="font-weight:400;color:#aaa">(optional)</span></div>
        <div class="sp-addons" id="sp-addons"></div>
      </div>

      <div class="sp-footer">
        <div id="sp-selected-product" class="sp-selected-slot">👆 Select a product above</div>
        <div id="sp-selected-addon"   class="sp-selected-slot sp-addon-slot">No add-on</div>
        <button class="btn btn-brand sp-sell-btn" id="btn-complete-sale" disabled>💰 Complete Sale</button>
      </div>
    `;

    this._renderProductOptions(available, customer);
    this._renderAddonOptions(unlockedProducts._addons || []);
    this._wireServiceEvents(customer);
    this.showOnly('service');
  }

  _renderProductOptions(products, customer) {
    const container = document.getElementById('sp-products');
    if (!container) return;

    container.innerHTML = products.map(p => {
      const overBudget = p.price > customer.budget;
      const pct  = overBudget ? Math.round(((p.price - customer.budget) / customer.budget) * 100) : 0;
      const tag  = overBudget
        ? `<span class="tag tag-upsell">↑ $${p.price - customer.budget} over budget</span>`
        : `<span class="tag tag-ok">In budget ✓</span>`;

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

    // Card click
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

  _wireServiceEvents(customer) {
    const btnComplete = document.getElementById('btn-complete-sale');
    const btnSkip     = document.getElementById('btn-skip-customer');

    if (btnComplete) {
      btnComplete.addEventListener('click', () => {
        const selProduct = document.getElementById('sp-selected-product');
        const selAddon   = document.getElementById('sp-selected-addon');
        const productId  = selProduct?.dataset?.productId;
        const addonId    = selAddon?.dataset?.addonId;
        if (productId) this.game.attemptSale(customer, productId, addonId);
      });
    }

    if (btnSkip) {
      btnSkip.addEventListener('click', () => {
        this.game.skipCustomer(customer);
      });
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
}
