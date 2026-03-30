// ============================================================
//  GET SKONED — customer.js
//  Customer class: movement, behavior, dialogue
// ============================================================

const CustomerState = {
  BROWSING:    'browsing',   // walks around store before joining queue
  ENTERING:    'entering',
  WAITING:     'waiting',
  APPROACHING: 'approaching',
  AT_COUNTER:  'at_counter',
  SERVED:      'served',
  LEAVING:     'leaving',
  DECLINED:    'declined',
};

class Customer {
  constructor(id, canvasWidth, canvasHeight, name = null, excludeCats = []) {
    const typeDef = this.pickType();
    const customerName = name || CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];
    const cat     = this.pickCategory(excludeCats);

    // Browse-first behaviour (some customers look around before queuing)
    const browseFirst    = Math.random() < 0.28;
    this.browseTargetX   = 260 + Math.random() * 220;
    this.browseTimer     = 2.2 + Math.random() * 2.5;

    this.id            = id;
    this.name          = customerName;
    this.typeDef       = typeDef;
    this.type          = typeDef.type;
    this.category      = cat;
    this.state         = browseFirst ? CustomerState.BROWSING : CustomerState.ENTERING;
    this.dialogue      = this.pickDialogue(typeDef.type);
    this.vagueDialogue = this.pickVagueDialogue(typeDef.type);
    this.effectHint    = this.pickEffectHint(cat);
    this.satisfied     = false;
    this.declined     = false;
    this.patience     = 100; // 0–100; drops if ignored

    // Conversation patience: how many questions they'll answer (2 or 3)
    // Highrollers are always in a hurry; everyone else will answer up to 3
    this.questionPatience = (typeDef.type === 'highroller') ? 2 : 3;

    // Misc hint: bonus clue revealed by 3rd question
    this.miscHint = this.pickMiscHint(typeDef.type);

    // Dance
    this.danceTimer   = 0.5 + Math.random() * 1.5; // fires quickly so waiting customers dance
    this.isDancing    = false;
    this.danceTime    = 0;
    this.danceType    = 'sway'; // 'sway' | 'spin' | 'headspin'
    this.spinAngle    = 0;

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

  pickCategory(excludeCats = []) {
    const weights = Object.fromEntries(
      Object.entries(CATEGORY_WEIGHTS).filter(([k]) => !excludeCats.includes(k))
    );
    const total = Object.values(weights).reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (const [cat, w] of Object.entries(weights)) {
      r -= w;
      if (r <= 0) return cat;
    }
    return Object.keys(weights)[0];
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

  pickVagueDialogue(type) {
    const lines = CUSTOMER_VAGUE_DIALOGUES[type] || CUSTOMER_VAGUE_DIALOGUES.curious;
    return lines[Math.floor(Math.random() * lines.length)];
  }

  pickReturningDialogue(type) {
    const lines = CUSTOMER_RETURNING_DIALOGUES[type] || CUSTOMER_RETURNING_DIALOGUES.curious;
    return lines[Math.floor(Math.random() * lines.length)];
  }

  pickEffectHint(cat) {
    const hints = CATEGORY_EFFECT_HINTS[cat] || [];
    return hints[Math.floor(Math.random() * hints.length)] || 'Just looking for something good.';
  }

  pickMiscHint(type) {
    const hints = MISC_HINTS[type] || MISC_HINTS.curious;
    return hints[Math.floor(Math.random() * hints.length)];
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
      case CustomerState.BROWSING:
        this.facing  = 1;
        this.targetX = this.browseTargetX;
        if (Math.abs(this.x - this.targetX) < 4) {
          this.x = this.targetX;
          this.browseTimer -= dt;
          if (!this.speechBubble) this.showSpeech(this.vagueDialogue, (this.browseTimer * 900));
          if (this.browseTimer <= 0) this.state = CustomerState.ENTERING;
        }
        break;

      case CustomerState.ENTERING:
        this.facing  = 1;
        this.targetX = this.canvasW * 0.38 + queuePosition * 52;
        if (Math.abs(this.x - this.targetX) < 4) {
          this.x     = this.targetX;
          this.state = CustomerState.WAITING;
          this.showSpeech(this.vagueDialogue, 3500);
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

    // Dance — only when WAITING (standing in line)
    if (this.state === CustomerState.WAITING) {
      if (this.isDancing) {
        this.danceTime -= dt;
        // Spin angle for spin/headspin types
        this.spinAngle = (this.spinAngle + 0.10) % (Math.PI * 2);
        if (this.danceTime <= 0) {
          this.isDancing  = false;
          this.spinAngle  = 0;
          this.danceTimer = 1 + Math.random() * 3;
        }
      } else {
        this.danceTimer -= dt;
        if (this.danceTimer <= 0) {
          if (Math.random() < 0.75) { // 75% chance to dance when timer fires
            const r = Math.random();
            this.danceType = r < 0.35 ? 'sway' : r < 0.65 ? 'spin' : 'headspin';
            this.isDancing = true;
            this.danceTime = 2.5 + Math.random() * 3;
            const emojis = {
              sway:      ['👍', '😁', '🎵', '✨'],
              spin:      ['🌀', '😎', '🎶', '💫'],
              headspin:  ['🤸', '🔥', '💥', '🕺'],
            };
            const set = emojis[this.danceType];
            this.showSpeech(set[Math.floor(Math.random() * set.length)], 2200);
          } else {
            this.danceTimer = 0.5 + Math.random() * 1.5;
          }
        }
      }
    } else {
      this.isDancing = false;
      this.spinAngle = 0;
    }

    // Bob
    if (this.state !== CustomerState.WAITING && this.state !== CustomerState.AT_COUNTER) {
      this.bobOffset = Math.sin(this.walkCycle) * 3;
    } else if (this.isDancing) {
      this.bobOffset = Math.sin(this.walkCycle * 1.8) * 5; // bigger, faster bounce when dancing
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

    if (this.isDancing && this.danceType === 'headspin') {
      ctx.translate(0, -18);
      ctx.rotate(this.spinAngle);
      ctx.scale(sx, -1);
    } else if (this.isDancing && this.danceType === 'spin') {
      ctx.rotate(this.spinAngle);
      ctx.scale(sx, 1);
    } else if (this.isDancing && this.danceType === 'sway') {
      // Side-to-side sway with a slight tilt
      ctx.translate(Math.sin(this.spinAngle * 2) * 8, 0);
      ctx.rotate(Math.sin(this.spinAngle * 2) * 0.18);
      ctx.scale(sx, 1);
    } else {
      ctx.scale(sx, 1);
    }

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
    const legSwing  = isWalking ? Math.sin(this.walkCycle) * 12
                    : this.isDancing ? Math.sin(this.walkCycle * 1.8) * 18 : 0;
    const armSwing  = isWalking ? Math.sin(this.walkCycle) * 10
                    : this.isDancing ? Math.sin(this.walkCycle * 1.8) * 40 + 30 : 0; // arms raised when dancing

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

    // Mouth — big smile when dancing or satisfied, frown when declined, neutral otherwise
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 1.5;
    if (this.isDancing) {
      // Big open grin
      ctx.beginPath();
      ctx.arc(0, -56, 8, 0.1, Math.PI - 0.1);
      ctx.stroke();
      // Teeth
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-6, -61, 12, 5);
    } else if (this.satisfied) {
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
