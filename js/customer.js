// ============================================================
//  GET SKONED — customer.js
//  Customer class: movement, behavior, dialogue
// ============================================================

const CustomerState = {
  ENTERING:    'entering',
  WAITING:     'waiting',
  APPROACHING: 'approaching',
  AT_COUNTER:  'at_counter',
  SERVED:      'served',
  LEAVING:     'leaving',
  DECLINED:    'declined',
};

class Customer {
  constructor(id, canvasWidth, canvasHeight) {
    const typeDef = this.pickType();
    const name    = CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
    const cat     = Object.keys(PRODUCTS)[Math.floor(Math.random() * Object.keys(PRODUCTS).length)];

    this.id           = id;
    this.name         = name;
    this.typeDef      = typeDef;
    this.type         = typeDef.type;
    this.category     = cat;
    this.state        = CustomerState.ENTERING;
    this.dialogue     = this.pickDialogue(typeDef.type);
    this.satisfied    = false;
    this.declined     = false;
    this.patience     = 100; // 0–100; drops if ignored

    // Budget = based on tier-1 max price in their desired category × multiplier
    const tier1Products = PRODUCTS[cat].filter(p => p.tier === 1);
    const maxTier1Price = Math.max(...tier1Products.map(p => p.price));
    this.baseBudget   = Math.round(maxTier1Price * typeDef.budgetMultiplier);
    this.budget       = this.baseBudget; // can be shown to player with upgrade

    // Visual
    this.color    = typeDef.color;
    this.canvasW  = canvasWidth;
    this.canvasH  = canvasHeight;
    this.x        = -50;
    this.targetX  = 200 + Math.random() * 120;
    this.y        = Math.round(canvasHeight * 0.68) - 60;
    this.speed    = 1.8 + Math.random() * 0.6;
    this.facing   = 1; // 1=right, -1=left
    this.walkCycle = 0;
    this.bobOffset = 0;
    this.hue      = Math.random() * 360;
    this.skinTone = this.pickSkinTone();
    this.outfit   = this.pickOutfit();
    this.speechBubble = null;
    this.speechTimer  = 0;
  }

  pickType() {
    const r = Math.random();
    let cumulative = 0;
    for (const t of CUSTOMER_TYPES) {
      cumulative += t.frequency;
      if (r < cumulative) return t;
    }
    return CUSTOMER_TYPES[0];
  }

  pickDialogue(type) {
    const lines = CUSTOMER_DIALOGUES[type] || CUSTOMER_DIALOGUES.curious;
    return lines[Math.floor(Math.random() * lines.length)];
  }

  pickSkinTone() {
    const tones = ['#FFDAB0', '#F0C090', '#D4A068', '#C08040', '#8B5520'];
    return tones[Math.floor(Math.random() * tones.length)];
  }

  pickOutfit() {
    const tops    = ['#4A6A9A', '#8A4A3A', '#4A8A5A', '#8A7A3A', '#6A4A8A', '#3A7A8A'];
    const bottoms = ['#3A3A5A', '#2A3A2A', '#5A4A3A', '#3A5A5A', '#4A4A4A'];
    return {
      top:    tops[Math.floor(Math.random() * tops.length)],
      bottom: bottoms[Math.floor(Math.random() * bottoms.length)],
    };
  }

  update(dt, queuePosition) {
    this.walkCycle += 0.15;

    // Destination based on state
    switch (this.state) {
      case CustomerState.ENTERING:
        this.facing  = 1;
        this.targetX = this.canvasW * 0.38 + queuePosition * 52;
        if (Math.abs(this.x - this.targetX) < 4) {
          this.x     = this.targetX;
          this.state = CustomerState.WAITING;
          this.showSpeech(this.dialogue, 3000);
        }
        break;

      case CustomerState.APPROACHING:
        this.facing  = 0; // face forward
        this.targetX = this.canvasW / 2 - 60;
        if (Math.abs(this.x - this.targetX) < 4) {
          this.x     = this.targetX;
          this.state = CustomerState.AT_COUNTER;
        }
        break;

      case CustomerState.SERVED:
      case CustomerState.LEAVING:
        this.facing  = 1;
        this.targetX = this.canvasW + 80;
        if (this.x > this.canvasW + 60) {
          this.state = 'done';
        }
        break;

      case CustomerState.DECLINED:
        this.facing  = -1;
        this.targetX = -80;
        if (this.x < -60) {
          this.state = 'done';
        }
        break;
    }

    // Move toward target
    if (Math.abs(this.x - this.targetX) > 2) {
      const dir = this.targetX > this.x ? 1 : -1;
      this.x += dir * this.speed;
      if (this.facing !== 0) this.facing = dir;
    }

    // Patience decay when waiting and not yet AT_COUNTER
    if (this.state === CustomerState.WAITING) {
      this.patience -= 0.04;
      if (this.patience <= 0) {
        this.patience = 0;
        this.leave(false);
      }
    }

    // Speech timer
    if (this.speechTimer > 0) {
      this.speechTimer -= dt;
      if (this.speechTimer <= 0) this.speechBubble = null;
    }

    // Bob
    if (this.state !== CustomerState.WAITING && this.state !== CustomerState.AT_COUNTER) {
      this.bobOffset = Math.sin(this.walkCycle) * 3;
    } else {
      this.bobOffset = Math.sin(this.walkCycle * 0.3) * 1;
    }
  }

  showSpeech(text, durationMs = 2500) {
    this.speechBubble = text;
    this.speechTimer  = durationMs;
  }

  approach() {
    this.state = CustomerState.APPROACHING;
  }

  serve(satisfied) {
    this.satisfied = satisfied;
    this.state     = satisfied ? CustomerState.SERVED : CustomerState.DECLINED;
    if (satisfied) {
      this.showSpeech('Thanks! 😊', 1500);
    } else {
      this.showSpeech('Maybe next time…', 1500);
    }
  }

  leave(happy) {
    this.state = happy ? CustomerState.LEAVING : CustomerState.DECLINED;
  }

  // ─── Drawing ──────────────────────────────────────────────
  draw(ctx, time) {
    if (this.state === 'done') return;

    const x  = Math.round(this.x);
    const y  = Math.round(this.y + this.bobOffset);
    const sx = this.facing === -1 ? -1 : 1;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, 1);

    this.drawBody(ctx, time);
    ctx.restore();

    // Speech bubble (not flipped)
    if (this.speechBubble) {
      this.drawSpeechBubble(ctx, x, y - 110, this.speechBubble);
    }

    // Patience bar (shows when waiting and patience < 70)
    if (this.state === CustomerState.WAITING && this.patience < 75) {
      this.drawPatienceBar(ctx, x, y - 90);
    }
  }

  drawBody(ctx, time) {
    const isWalking = this.state !== CustomerState.WAITING && this.state !== CustomerState.AT_COUNTER;
    const legSwing  = isWalking ? Math.sin(this.walkCycle) * 12 : 0;
    const armSwing  = isWalking ? Math.sin(this.walkCycle) * 10 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = this.outfit.bottom;
    // Left leg
    ctx.save();
    ctx.translate(-7, 0);
    ctx.rotate((-legSwing * Math.PI) / 180);
    ctx.fillRect(-5, 0, 10, 28);
    // Shoe
    ctx.fillStyle = '#2A2020';
    ctx.fillRect(-6, 26, 13, 6);
    ctx.restore();

    // Right leg
    ctx.fillStyle = this.outfit.bottom;
    ctx.save();
    ctx.translate(7, 0);
    ctx.rotate((legSwing * Math.PI) / 180);
    ctx.fillRect(-5, 0, 10, 28);
    ctx.fillStyle = '#2A2020';
    ctx.fillRect(-5, 26, 13, 6);
    ctx.restore();

    // Body / torso
    ctx.fillStyle = this.outfit.top;
    ctx.beginPath();
    ctx.roundRect(-14, -42, 28, 46, 4);
    ctx.fill();

    // Arms
    ctx.fillStyle = this.outfit.top;
    // Left arm
    ctx.save();
    ctx.translate(-14, -38);
    ctx.rotate((-armSwing * Math.PI) / 180);
    ctx.fillRect(-7, 0, 8, 30);
    // Hand
    ctx.fillStyle = this.skinTone;
    ctx.beginPath();
    ctx.arc(-3, 32, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right arm
    ctx.fillStyle = this.outfit.top;
    ctx.save();
    ctx.translate(14, -38);
    ctx.rotate((armSwing * Math.PI) / 180);
    ctx.fillRect(-1, 0, 8, 30);
    ctx.fillStyle = this.skinTone;
    ctx.beginPath();
    ctx.arc(3, 32, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Head
    ctx.fillStyle = this.skinTone;
    ctx.beginPath();
    ctx.arc(0, -62, 18, 0, Math.PI * 2);
    ctx.fill();

    // Hair (varied by hue)
    ctx.fillStyle = `hsl(${Math.round(this.hue * 0.1 + 20)}, 40%, 25%)`;
    ctx.beginPath();
    ctx.arc(0, -74, 16, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-16, -74, 32, 8);

    // Eyes
    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.arc(-6, -63, 2.5, 0, Math.PI * 2);
    ctx.arc(6, -63, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Mouth (smile or neutral)
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 1.5;
    if (this.satisfied) {
      ctx.beginPath();
      ctx.arc(0, -57, 6, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else if (this.state === CustomerState.DECLINED) {
      ctx.beginPath();
      ctx.arc(0, -51, 6, Math.PI + 0.2, -0.2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-5, -56); ctx.lineTo(5, -56);
      ctx.stroke();
    }

    // Type indicator badge on shirt
    ctx.font = '11px serif';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.typeDef.outfits[0], 0, -26);
  }

  drawSpeechBubble(ctx, x, y, text) {
    const pad  = 10;
    ctx.font   = '13px Arial';
    const tw   = ctx.measureText(text).width;
    const bw   = tw + pad * 2;
    const bh   = 28;

    ctx.fillStyle   = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - bw / 2, y - bh, bw, bh, 8);
    ctx.fill();
    ctx.stroke();

    // Tail
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + 6, y);
    ctx.lineTo(x, y + 8);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();

    ctx.fillStyle    = '#222';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y - bh / 2);
  }

  drawPatienceBar(ctx, x, y) {
    const bw = 40, bh = 5;
    const pct = this.patience / 100;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x - bw / 2 - 1, y - 1, bw + 2, bh + 2);
    ctx.fillStyle = pct > 0.5 ? '#4CAF50' : pct > 0.25 ? '#FFA500' : '#E53935';
    ctx.fillRect(x - bw / 2, y, bw * pct, bh);
  }
}
