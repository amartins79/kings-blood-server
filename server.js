/**
 * King's Blood — Multiplayer Server
 * Node.js + Socket.IO, server-authoritative game logic
 * Run: node server.js
 * Deploy: Railway / Render / Fly.io (set PORT env var)
 */

const { createServer } = require('http');
const { Server }       = require('socket.io');
const { GameEngine }   = require('./gameEngine');

const PORT = process.env.PORT || 3000;
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET','POST'] },
  pingTimeout: 20000,
  pingInterval: 10000,
});

// ── In-memory state ──────────────────────────────────────────────────────────
const rooms   = new Map(); // roomId → Room
const queue   = [];        // waiting sockets: [{ socketId, displayName }]
const sockToRoom = new Map(); // socketId → roomId

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeRoomId() {
  return Math.random().toString(36).slice(2,8).toUpperCase();
}

function getRoomForSocket(socketId) {
  const roomId = sockToRoom.get(socketId);
  return roomId ? rooms.get(roomId) : null;
}

function broadcastState(room) {
  const [p1sock, p2sock] = room.players.map(p => io.sockets.sockets.get(p.socketId));

  // Each player gets their own hand count vs opponent's hand count
  room.players.forEach((player, idx) => {
    const sock = io.sockets.sockets.get(player.socketId);
    if (!sock) return;
    const opp = room.players[1 - idx];
    sock.emit('STATE_UPDATE', {
      board:      room.engine.getBoard(),
      yourHand:   player.hand,
      oppHandCount: opp.hand.length,
      laneScores: room.engine.getLaneScores(),
      scores:     room.engine.getTotalScores(),
      turn:       room.turnIndex === idx ? 'yours' : 'opponent',
      phase:      room.phase,
      passCount:  room.passCount,
    });
  });
}

function startTurnTimer(room) {
  clearTimeout(room.timer);
  let secs = 60;

  // Broadcast initial timer
  room.players.forEach(p => {
    const s = io.sockets.sockets.get(p.socketId);
    if (s) s.emit('TIMER_UPDATE', { secondsLeft: secs });
  });

  room.timerInterval = setInterval(() => {
    secs--;
    room.players.forEach(p => {
      const s = io.sockets.sockets.get(p.socketId);
      if (s) s.emit('TIMER_UPDATE', { secondsLeft: secs });
    });
    if (secs <= 0) {
      clearInterval(room.timerInterval);
      // Auto-pass for current player
      handlePass(room, room.players[room.turnIndex].socketId);
    }
  }, 1000);
}

function stopTurnTimer(room) {
  clearInterval(room.timerInterval);
}

function endGame(room) {
  room.phase = 'gameover';
  stopTurnTimer(room);
  const result = room.engine.getFinalResult();
  room.players.forEach((p, idx) => {
    const s = io.sockets.sockets.get(p.socketId);
    if (!s) return;
    s.emit('GAME_END', {
      winner:      result.winner, // 'p1' | 'p2' | 'draw'
      yourIndex:   idx === 0 ? 'p1' : 'p2',
      finalScores: result.scores,
      laneScores:  result.laneScores,
    });
  });
}

function handlePass(room, socketId) {
  const playerIdx = room.players.findIndex(p => p.socketId === socketId);
  if (playerIdx === -1 || room.turnIndex !== playerIdx) return;

  room.players[playerIdx].passed = true;
  room.passCount++;

  // Notify opponent
  const oppIdx = 1 - playerIdx;
  const oppSock = io.sockets.sockets.get(room.players[oppIdx].socketId);
  if (oppSock) oppSock.emit('OPPONENT_ACTION', { action: 'pass' });

  if (room.passCount >= 2) {
    endGame(room);
    return;
  }

  // Advance turn
  room.turnIndex = oppIdx;
  stopTurnTimer(room);
  broadcastState(room);
  startTurnTimer(room);
}

// ── Matchmaking ───────────────────────────────────────────────────────────────
function tryMatch() {
  if (queue.length < 2) return;
  const [a, b] = [queue.shift(), queue.shift()];
  const sockA  = io.sockets.sockets.get(a.socketId);
  const sockB  = io.sockets.sockets.get(b.socketId);
  if (!sockA || !sockB) { tryMatch(); return; } // one disconnected while queuing

  const roomId = makeRoomId();
  const engine = new GameEngine();
  engine.init();

  const room = {
    roomId,
    phase: 'mulligan',
    turnIndex: Math.random() < 0.5 ? 0 : 1, // coin flip
    passCount: 0,
    timer: null,
    timerInterval: null,
    mulliganReady: [false, false],
    engine,
    players: [
      { socketId: a.socketId, displayName: a.displayName, hand: engine.drawHand('p1'), deck: engine.getPlayerDeck('p1'), passed: false },
      { socketId: b.socketId, displayName: b.displayName, hand: engine.drawHand('p2'), deck: engine.getPlayerDeck('p2'), passed: false },
    ],
  };

  rooms.set(roomId, room);
  sockToRoom.set(a.socketId, roomId);
  sockToRoom.set(b.socketId, roomId);

  sockA.join(roomId);
  sockB.join(roomId);

  // Tell each player their index and opponent name
  sockA.emit('ROOM_JOINED',  { roomId, playerIndex: 0, opponentName: b.displayName });
  sockB.emit('ROOM_JOINED',  { roomId, playerIndex: 1, opponentName: a.displayName });

  // Send initial hands for mulligan
  sockA.emit('GAME_START', { yourHand: room.players[0].hand, boardState: engine.getBoard(), firstTurn: room.turnIndex });
  sockB.emit('GAME_START', { yourHand: room.players[1].hand, boardState: engine.getBoard(), firstTurn: room.turnIndex });
}

// ── Socket events ─────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] ${socket.id} connected`);

  // ── Join matchmaking queue
  socket.on('JOIN_QUEUE', ({ displayName }) => {
    const name = String(displayName || 'Knight').slice(0,20).trim() || 'Knight';
    queue.push({ socketId: socket.id, displayName: name });
    socket.emit('QUEUE_JOINED', { position: queue.length });
    tryMatch();
  });

  // ── Mulligan: swap selected cards
  socket.on('MULLIGAN_DONE', ({ roomId, swapIndices }) => {
    const room = rooms.get(roomId);
    if (!room || room.phase !== 'mulligan') return;
    const playerIdx = room.players.findIndex(p => p.socketId === socket.id);
    if (playerIdx === -1) return;

    // Swap requested cards (max 3)
    const indices = (swapIndices || []).slice(0,3).filter(i => i >= 0 && i < 5);
    const newCards = room.engine.drawCards(playerIdx === 0 ? 'p1' : 'p2', indices.length);
    indices.forEach((i, j) => { room.players[playerIdx].hand[i] = newCards[j] || room.players[playerIdx].hand[i]; });

    socket.emit('HAND_UPDATE', { hand: room.players[playerIdx].hand });
    room.mulliganReady[playerIdx] = true;

    // Start match when both ready
    if (room.mulliganReady[0] && room.mulliganReady[1]) {
      room.phase = 'play';
      broadcastState(room);
      startTurnTimer(room);
    }
  });

  // ── Play a card
  socket.on('PLAY_CARD', ({ roomId, instanceId, row, col }) => {
    const room = rooms.get(roomId);
    if (!room || room.phase !== 'play') { socket.emit('INVALID_MOVE', { reason: 'Not in play phase' }); return; }
    const playerIdx = room.players.findIndex(p => p.socketId === socket.id);
    if (playerIdx === -1 || room.turnIndex !== playerIdx) { socket.emit('INVALID_MOVE', { reason: 'Not your turn' }); return; }

    const player  = room.players[playerIdx];
    const cardIdx = player.hand.findIndex(c => c.instanceId === instanceId);
    if (cardIdx === -1) { socket.emit('INVALID_MOVE', { reason: 'Card not in hand' }); return; }

    const card   = player.hand[cardIdx];
    const pKey   = playerIdx === 0 ? 'p1' : 'p2';
    const result = room.engine.tryPlaceCard(card, row, col, pKey);

    if (!result.valid) { socket.emit('INVALID_MOVE', { reason: result.reason }); return; }

    // Remove from hand, draw replacement
    player.hand.splice(cardIdx, 1);
    const drawn = room.engine.drawCards(pKey, 1);
    if (drawn.length) player.hand.push(drawn[0]);

    // Reset pass count on a play action
    room.passCount = 0;
    room.players[playerIdx].passed = false;

    // Notify opponent of the action
    const oppSock = io.sockets.sockets.get(room.players[1-playerIdx].socketId);
    if (oppSock) oppSock.emit('OPPONENT_ACTION', { action: 'play', card, row, col });

    // Advance turn
    room.turnIndex = 1 - playerIdx;
    stopTurnTimer(room);
    broadcastState(room);
    startTurnTimer(room);
  });

  // ── Pass turn
  socket.on('PASS_TURN', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    handlePass(room, socket.id);
  });

  // ── Disconnect handling
  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id} disconnected`);

    // Remove from queue if waiting
    const qi = queue.findIndex(q => q.socketId === socket.id);
    if (qi !== -1) { queue.splice(qi, 1); return; }

    const room = getRoomForSocket(socket.id);
    if (!room || room.phase === 'gameover') return;

    const oppIdx = room.players.findIndex(p => p.socketId !== socket.id);
    if (oppIdx === -1) return;
    const oppSock = io.sockets.sockets.get(room.players[oppIdx].socketId);

    // 30-second grace period
    let secs = 30;
    if (oppSock) oppSock.emit('OPPONENT_DISCONNECTED', { secondsLeft: secs });
    room.disconnectInterval = setInterval(() => {
      secs--;
      if (oppSock) oppSock.emit('OPPONENT_DISCONNECTED', { secondsLeft: secs });
      if (secs <= 0) {
        clearInterval(room.disconnectInterval);
        stopTurnTimer(room);
        // Opponent wins by forfeit
        const winner = oppIdx === 0 ? 'p1' : 'p2';
        if (oppSock) oppSock.emit('GAME_END', { winner, forfeit: true, finalScores: { p1:0, p2:0 }, laneScores: room.engine.getLaneScores() });
        rooms.delete(room.roomId);
      }
    }, 1000);

    sockToRoom.delete(socket.id);
  });
});

httpServer.listen(PORT, () => console.log(`King's Blood server on :${PORT}`));
