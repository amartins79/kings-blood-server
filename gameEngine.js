/**
 * King's Blood — Server-side Game Engine
 * Mirrors the client-side logic exactly.
 * No DOM, no audio — pure state management.
 */

const { CARD_DB } = require('./cardDb');

// ── Helpers ──────────────────────────────────────────────────────────────────
function inBounds(r, c) { return r >= 0 && r < 5 && c >= 0 && c < 5; }
function rowLabel(r)    { return String.fromCharCode(65 + r); }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function makeId() { return Math.random().toString(36).slice(2, 10); }

function makeCardInstance(tmpl, owner) {
  return {
    instanceId: makeId(),
    cardId:     tmpl.id,
    name:       tmpl.name,
    rank:       tmpl.rank,
    basePower:  tmpl.basePower,
    power:      tmpl.basePower,
    pattern:    tmpl.pattern,
    ability:    tmpl.ability ? { ...tmpl.ability } : null,
    abilityDesc:tmpl.abilityDesc,
    art:        tmpl.art,
    rarity:     tmpl.rarity || 'common',
    synergy:    tmpl.synergy || null,
    owner,
  };
}

function buildDeckForPlayer(owner) {
  const WEIGHTS = { common:10, rare:5, epic:2, legendary:1 };
  const weighted = [];
  CARD_DB.forEach(c => { const w = WEIGHTS[c.rarity]||1; for(let i=0;i<w;i++) weighted.push(c); });
  const deck = [];
  const used  = {};
  const commons = shuffle(CARD_DB.filter(c=>c.rarity==='common')).slice(0,3);
  commons.forEach(c => { deck.push(makeCardInstance(c,owner)); used[c.id]=(used[c.id]||0)+1; });
  let att = 0;
  while (deck.length < 20 && att < 500) {
    att++;
    const tmpl = weighted[Math.floor(Math.random()*weighted.length)];
    if ((used[tmpl.id]||0) >= 3) continue;
    deck.push(makeCardInstance(tmpl,owner));
    used[tmpl.id] = (used[tmpl.id]||0)+1;
  }
  return shuffle(deck);
}

// ── GameEngine class ──────────────────────────────────────────────────────────
class GameEngine {
  constructor() {
    this.board   = null;
    this.decks   = { p1: [], p2: [] };
    this.laneScores = null;
  }

  init() {
    // Build 5×5 board
    this.board = [];
    for (let r = 0; r < 5; r++) {
      const row = [];
      for (let c = 0; c < 5; c++) row.push({ owner:'none', pawns:0, card:null });
      this.board.push(row);
    }
    // Starting pawns
    for (let r = 0; r < 5; r++) {
      this.board[r][0].owner = 'p1'; this.board[r][0].pawns = 1;
      this.board[r][4].owner = 'p2'; this.board[r][4].pawns = 1;
    }
    this.decks.p1 = buildDeckForPlayer('p1');
    this.decks.p2 = buildDeckForPlayer('p2');
    this.recalcAllScores();
  }

  drawHand(owner) {
    return this.decks[owner].splice(0, 5);
  }

  drawCards(owner, count) {
    return this.decks[owner].splice(0, count);
  }

  getPlayerDeck(owner) {
    return [...this.decks[owner]];
  }

  getBoard() {
    return this.board.map(row => row.map(cell => ({ ...cell, card: cell.card ? { ...cell.card } : null })));
  }

  getLaneScores() {
    return JSON.parse(JSON.stringify(this.laneScores || []));
  }

  getTotalScores() {
    const scores = { p1:0, p2:0 };
    if (!this.laneScores) return scores;
    this.laneScores.forEach(ls => {
      if (ls.p1 > ls.p2) scores.p1 += ls.p1;
      else if (ls.p2 > ls.p1) scores.p2 += ls.p2;
    });
    return scores;
  }

  getFinalResult() {
    const scores = this.getTotalScores();
    const winner = scores.p1 > scores.p2 ? 'p1' : scores.p2 > scores.p1 ? 'p2' : 'draw';
    return { winner, scores, laneScores: this.getLaneScores() };
  }

  // ── Validate and execute card placement ────────────────────────────────────
  tryPlaceCard(card, row, col, owner) {
    if (!inBounds(row, col))              return { valid:false, reason:'Out of bounds' };
    const tile = this.board[row][col];
    if (tile.card)                        return { valid:false, reason:'Tile occupied' };
    if (tile.owner !== owner)             return { valid:false, reason:'Not your tile' };
    if (tile.pawns < card.rank)           return { valid:false, reason:'Insufficient pawns' };

    this._placeCard(card, row, col, owner);
    return { valid:true };
  }

  _placeCard(card, row, col, owner) {
    const tile = this.board[row][col];
    tile.card  = { ...card, owner, power: card.basePower, synergyActive: false };

    this._expandPawns(card, row, col, owner);
    this._triggerOnPlay(card, row, col, owner);
    this._checkSynergy(card, row, col, owner);
    this._recalcPassive();
    this.recalcAllScores();
  }

  _expandPawns(card, row, col, owner) {
    const opp = owner === 'p1' ? 'p2' : 'p1';
    const dm  = owner === 'p1' ? 1 : -1;
    for (const [dr,dc] of card.pattern) {
      const nr = row+dr, nc = col+(dc*dm);
      if (!inBounds(nr,nc)) continue;
      const t = this.board[nr][nc];
      if (t.card) continue;
      if (t.owner === owner)        { t.pawns = Math.min(3, t.pawns+1); }
      else if (t.owner === 'none')  { t.owner = owner; t.pawns = 1; }
      else                          { t.owner = owner; t.pawns = 1; } // capture
    }
  }

  _triggerOnPlay(card, row, col, owner) {
    if (!card.ability) return;
    const ab  = card.ability;
    const opp = owner === 'p1' ? 'p2' : 'p1';
    const dm  = owner === 'p1' ? 1 : -1;

    if (ab.type === 'on_play_destroy_front') {
      const fc = col + dm;
      if (inBounds(row, fc)) {
        const ft = this.board[row][fc];
        if (ft.card && ft.card.owner === opp && ft.card.power <= ab.threshold) {
          this._destroyCard(row, fc);
        }
      }
    }
    if (ab.type === 'on_play_col_enfeeble') {
      const fc = col + dm;
      if (fc >= 0 && fc < 5) {
        const toDestroy = [];
        for (let r=0;r<5;r++) {
          const t = this.board[r][fc];
          if (t.card && t.card.owner === opp) {
            t.card.power -= ab.value;
            if (t.card.power <= 0) toDestroy.push(r);
          }
        }
        toDestroy.forEach(r => this._destroyCard(r, fc));
      }
    }
  }

  _checkSynergy(card, row, col, owner) {
    if (!card.synergy || !card.synergy.length) return;
    for (let sr=0;sr<5;sr++) for (let sc=0;sc<5;sc++) {
      if (sr===row && sc===col) continue;
      const bt = this.board[sr][sc];
      if (bt.card && bt.card.owner === owner && card.synergy.includes(bt.card.cardId)) {
        this.board[row][col].card.basePower += 2;
        this.board[row][col].card.synergyActive = true;
        return;
      }
    }
  }

  _recalcPassive(depth = 0) {
    if (depth > 10) return;
    // Reset to basePower
    for (let r=0;r<5;r++) for (let c=0;c<5;c++) {
      const t = this.board[r][c];
      if (t.card) t.card.power = t.card.basePower;
    }
    // Apply passives
    for (let r=0;r<5;r++) for (let c=0;c<5;c++) {
      const t = this.board[r][c];
      if (!t.card || !t.card.ability) continue;
      const ab    = t.card.ability;
      const owner = t.card.owner;
      const opp   = owner === 'p1' ? 'p2' : 'p1';
      if (ab.type==='buff')          for (const [dr,dc] of ab.range) { const nr=r+dr,nc=c+dc; if(inBounds(nr,nc)){const tt=this.board[nr][nc]; if(tt.card&&tt.card.owner===owner) tt.card.power+=ab.value;} }
      if (ab.type==='buff_lane')     for (let c2=0;c2<5;c2++) { if(c2===c) continue; const tt=this.board[r][c2]; if(tt.card&&tt.card.owner===owner) tt.card.power+=ab.value; }
      if (ab.type==='enfeeble')      for (const [dr,dc] of ab.range) { const nr=r+dr,nc=c+dc; if(inBounds(nr,nc)){const tt=this.board[nr][nc]; if(tt.card&&tt.card.owner===opp) tt.card.power-=ab.value;} }
      if (ab.type==='enfeeble_lane') for (let c2=0;c2<5;c2++) { if(c2===c) continue; const tt=this.board[r][c2]; if(tt.card&&tt.card.owner===opp) tt.card.power-=ab.value; }
    }
    // Collect deaths
    const dead = [];
    for (let r=0;r<5;r++) for (let c=0;c<5;c++) { const t=this.board[r][c]; if(t.card&&t.card.power<=0) dead.push([r,c]); }
    if (dead.length > 0) {
      dead.forEach(([r,c]) => this._destroyCard(r,c));
      // Accumulator bonuses
      for (let r=0;r<5;r++) for (let c=0;c<5;c++) {
        const t = this.board[r][c];
        if (t.card && t.card.ability && t.card.ability.type==='accumulate_on_destroy') t.card.basePower += t.card.ability.value;
      }
      this._recalcPassive(depth+1);
    }
  }

  _destroyCard(r, c) {
    this.board[r][c].card = null;
  }

  recalcAllScores() {
    this.laneScores = [];
    for (let r=0;r<5;r++) {
      let lp1=0, lp2=0;
      for (let c=0;c<5;c++) {
        const t = this.board[r][c];
        if (!t.card) continue;
        if (t.card.owner==='p1') lp1 += Math.max(0, t.card.power);
        else                     lp2 += Math.max(0, t.card.power);
      }
      // Score bonus abilities
      for (let c=0;c<5;c++) {
        const t = this.board[r][c];
        if (t.card && t.card.ability && t.card.ability.type==='score_bonus') {
          if (t.card.owner==='p1' && lp1>lp2) lp1 += t.card.ability.value;
          else if (t.card.owner==='p2' && lp2>lp1) lp2 += t.card.ability.value;
        }
      }
      this.laneScores.push({ p1: lp1, p2: lp2 });
    }
  }
}

module.exports = { GameEngine };
