/**
 * King's Blood — Card Database (server copy)
 * Must stay in sync with client CARD_DB in kings-blood.html
 */
const CARD_DB = [
  { id:'squire',          name:'Squire',          rank:1, basePower:1, rarity:'common',    art:'⚔',  pattern:[[0,1],[0,2]],                          abilityDesc:'', ability:null, synergy:['vanguard','stalwart'] },
  { id:'vanguard',        name:'Vanguard',         rank:2, basePower:3, rarity:'common',    art:'🛡',  pattern:[[-1,0],[1,0],[0,1]],                    abilityDesc:'', ability:null, synergy:['squire','stalwart'] },
  { id:'plague_rat',      name:'Plague Rat',       rank:1, basePower:2, rarity:'rare',      art:'🐀',  pattern:[[-1,-1],[-1,1],[1,-1],[1,1]],           abilityDesc:'Enfeeble adjacent enemies -1.', ability:{type:'enfeeble',range:[[-1,0],[1,0],[0,-1],[0,1]],value:1}, synergy:['cursed_witch','banshee'] },
  { id:'archmage',        name:'Royal Archmage',   rank:3, basePower:5, rarity:'legendary', art:'🔮',  pattern:[[-1,1],[0,1],[1,1],[-1,0],[1,0],[-1,-1],[1,-1]], abilityDesc:'Buff adjacent allies +2.', ability:{type:'buff',range:[[-1,0],[1,0],[0,-1],[0,1]],value:2}, synergy:['cleric','war_drummer'] },
  { id:'shadow_assassin', name:'Shadow Assassin',  rank:2, basePower:4, rarity:'epic',      art:'🗡',  pattern:[[0,1],[-1,1],[1,1]],                   abilityDesc:'On Play: destroy front enemy if power ≤ 3.', ability:{type:'on_play_destroy_front',threshold:3}, synergy:['plague_rat','banshee'] },
  { id:'iron_golem',      name:'Iron Golem',       rank:3, basePower:6, rarity:'rare',      art:'⚙',   pattern:[[0,1],[0,-1]],                          abilityDesc:'', ability:null },
  { id:'cursed_witch',    name:'Cursed Witch',     rank:2, basePower:2, rarity:'epic',      art:'🧙',  pattern:[[-1,0],[1,0],[-1,1],[1,1]],             abilityDesc:'Enfeeble all enemies in lane -2.', ability:{type:'enfeeble_lane',value:2} },
  { id:'herald',          name:'Herald',           rank:1, basePower:1, rarity:'common',    art:'📯',  pattern:[[0,1],[0,2],[0,3]],                     abilityDesc:'', ability:null },
  { id:'accumulator',     name:'Blood Shard',      rank:1, basePower:1, rarity:'rare',      art:'💎',  pattern:[[-1,0],[1,0]],                          abilityDesc:'Accumulate +1 on destroy.', ability:{type:'accumulate_on_destroy',value:1} },
  { id:'lane_bonus',      name:'Victory Banner',   rank:2, basePower:3, rarity:'rare',      art:'🏴',  pattern:[[0,1],[-1,0],[1,0]],                   abilityDesc:'Score Bonus +5 if lane won.', ability:{type:'score_bonus',value:5} },
  { id:'stalwart',        name:'Stalwart Knight',  rank:3, basePower:4, rarity:'common',    art:'⚜',   pattern:[[-2,0],[-1,0],[1,0],[2,0],[0,1]],       abilityDesc:'', ability:null, synergy:['squire','vanguard'] },
  { id:'fire_drake',      name:'Fire Drake',       rank:3, basePower:5, rarity:'epic',      art:'🐉',  pattern:[[0,1],[0,2],[-1,2],[1,2]],              abilityDesc:'On Play: front column enemies -2.', ability:{type:'on_play_col_enfeeble',value:2}, synergy:['dragon_knight','storm_phoenix'] },
  { id:'cleric',          name:'Battle Cleric',    rank:1, basePower:2, rarity:'common',    art:'✝',   pattern:[[-1,1],[0,1],[1,1]],                    abilityDesc:'Buff lane allies +1.', ability:{type:'buff_lane',value:1}, synergy:['archmage','high_templar'] },
  { id:'banshee',         name:'Banshee',          rank:2, basePower:3, rarity:'epic',      art:'👻',  pattern:[[-1,0],[1,0],[-1,1],[0,1],[1,1]],       abilityDesc:'Enfeeble adjacent enemies -2.', ability:{type:'enfeeble',range:[[-1,0],[1,0],[0,-1],[0,1]],value:2} },
  { id:'siege_engine',    name:'Siege Engine',     rank:3, basePower:7, rarity:'rare',      art:'🏰',  pattern:[[0,1]],                                 abilityDesc:'', ability:null },
  { id:'forest_scout',    name:'Forest Scout',     rank:1, basePower:2, rarity:'common',    art:'🏹',  pattern:[[-1,0],[1,0],[0,1]],                    abilityDesc:'', ability:null },
  { id:'grave_warden',    name:'Grave Warden',     rank:1, basePower:1, rarity:'rare',      art:'💀',  pattern:[[0,1],[-1,1]],                          abilityDesc:'Accumulate +1 on destroy.', ability:{type:'accumulate_on_destroy',value:1} },
  { id:'battle_standard', name:'Battle Standard',  rank:1, basePower:2, rarity:'common',    art:'🚩',  pattern:[[-1,0],[1,0]],                          abilityDesc:'Score Bonus +3 if lane won.', ability:{type:'score_bonus',value:3} },
  { id:'war_drummer',     name:'War Drummer',      rank:2, basePower:2, rarity:'epic',      art:'🥁',  pattern:[[-1,1],[0,1],[1,1],[-1,0],[1,0]],       abilityDesc:'Buff lane allies +2.', ability:{type:'buff_lane',value:2} },
  { id:'stone_guardian',  name:'Stone Guardian',   rank:2, basePower:5, rarity:'rare',      art:'🗿',  pattern:[[0,1]],                                 abilityDesc:'', ability:null },
  { id:'poison_adept',    name:'Poison Adept',     rank:2, basePower:2, rarity:'rare',      art:'🧪',  pattern:[[-1,1],[1,1],[0,1]],                    abilityDesc:'Enfeeble adjacent enemies -2.', ability:{type:'enfeeble',range:[[-1,0],[1,0],[0,-1],[0,1]],value:2} },
  { id:'duel_champion',   name:'Duel Champion',    rank:2, basePower:3, rarity:'epic',      art:'⚔️', pattern:[[0,1],[-1,0],[1,0]],                    abilityDesc:'On Play: destroy front enemy if power ≤ 4.', ability:{type:'on_play_destroy_front',threshold:4} },
  { id:'dragon_knight',   name:'Dragon Knight',    rank:3, basePower:6, rarity:'epic',      art:'🐲',  pattern:[[-1,1],[0,1],[1,1],[0,2]],              abilityDesc:'', ability:null },
  { id:'high_templar',    name:'High Templar',     rank:3, basePower:4, rarity:'legendary', art:'🛡️', pattern:[[-1,0],[1,0],[-1,1],[1,1],[0,1]],       abilityDesc:'Buff adjacent allies +3.', ability:{type:'buff',range:[[-1,0],[1,0],[0,-1],[0,1]],value:3} },
  { id:'void_herald',     name:'Void Herald',      rank:3, basePower:3, rarity:'legendary', art:'🌑',  pattern:[[-1,0],[1,0],[0,1],[-1,1],[1,1]],       abilityDesc:'Enfeeble all enemies in lane -3.', ability:{type:'enfeeble_lane',value:3} },
  { id:'iron_scout',      name:'Iron Scout',       rank:1, basePower:2, rarity:'common',    art:'🔭',  pattern:[[0,1],[0,2],[-1,0]],                   abilityDesc:'', ability:null },
  { id:'frost_archer',    name:'Frost Archer',     rank:1, basePower:1, rarity:'rare',      art:'❄',   pattern:[[0,1],[0,2],[0,3]],                     abilityDesc:'Enfeeble front enemy -1.', ability:{type:'enfeeble',range:[[0,1]],value:1} },
  { id:'goblin_thief',    name:'Goblin Thief',     rank:1, basePower:2, rarity:'common',    art:'🪙',  pattern:[[-1,1],[1,1]],                          abilityDesc:'', ability:null },
  { id:'shield_maiden',   name:'Shield Maiden',    rank:2, basePower:4, rarity:'common',    art:'🛡',  pattern:[[-1,0],[1,0],[0,1]],                    abilityDesc:'', ability:null },
  { id:'moon_witch',      name:'Moon Witch',       rank:2, basePower:2, rarity:'epic',      art:'🌙',  pattern:[[-1,1],[0,1],[1,1]],                    abilityDesc:'Buff lane allies +2.', ability:{type:'buff_lane',value:2} },
  { id:'thunder_ox',      name:'Thunder Ox',       rank:2, basePower:5, rarity:'rare',      art:'🐂',  pattern:[[0,1],[-1,0],[1,0]],                   abilityDesc:'', ability:null },
  { id:'rune_keeper',     name:'Rune Keeper',      rank:2, basePower:1, rarity:'rare',      art:'🔣',  pattern:[[-1,0],[1,0],[0,1],[0,-1]],             abilityDesc:'Accumulate +2 on destroy.', ability:{type:'accumulate_on_destroy',value:2} },
  { id:'ancient_golem',   name:'Ancient Golem',    rank:3, basePower:7, rarity:'epic',      art:'🗻',  pattern:[[0,1]],                                 abilityDesc:'', ability:null },
  { id:'storm_phoenix',   name:'Storm Phoenix',    rank:3, basePower:4, rarity:'legendary', art:'🦅',  pattern:[[-1,1],[0,1],[1,1],[-2,0],[2,0]],       abilityDesc:'On Play: front column enemies -3.', ability:{type:'on_play_col_enfeeble',value:3}, synergy:['fire_drake','dragon_knight'] },
  { id:'blood_oracle',    name:'Blood Oracle',     rank:3, basePower:3, rarity:'legendary', art:'🩸',  pattern:[[-1,0],[1,0],[-1,1],[1,1],[0,1],[0,2]], abilityDesc:'Buff adjacent allies +2.', ability:{type:'buff',range:[[-1,0],[1,0],[0,-1],[0,1]],value:2} },
];

module.exports = { CARD_DB };
