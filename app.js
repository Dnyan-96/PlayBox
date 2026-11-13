document.addEventListener('DOMContentLoaded', async () => {
  await PlayBoxDB.init();
  let profile = await PlayBoxDB.getProfile();
  SoundFX.setEnabled(profile.sound);

  let activeGameId = null;
  let activeMode = '1p';
  let cleanupGame = null;
  let sessionScores = { p1: 0, p2: 0 };
  let deferredPrompt = null;

  const lobbyView = document.getElementById('lobbyView');
  const stageView = document.getElementById('stageView');
  const gameContainer = document.getElementById('gameContainer');
  const stageTitle = document.getElementById('stageTitle');
  const p1Label = document.getElementById('p1Label');
  const p2Label = document.getElementById('p2Label');
  const p1ScoreEl = document.getElementById('p1Score');
  const p2ScoreEl = document.getElementById('p2Score');
  const turnIndicator = document.getElementById('turnIndicator');
  const btnSound = document.getElementById('btnSound');
  const btnInstall = document.getElementById('btnInstall');

  btnSound.textContent = profile.sound ? '🔊' : '🔇';

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  function updateNetBadge() {
    const badge = document.getElementById('netStatus');
    badge.textContent = navigator.onLine ? '● Online & Cached' : '● Offline Mode';
  }
  window.addEventListener('online', updateNetBadge);
  window.addEventListener('offline', updateNetBadge);
  updateNetBadge();

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btnInstall.classList.remove('hidden');
  });

  btnInstall.onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    btnInstall.classList.add('hidden');
  };

  async function refreshLobbyStats() {
    const stats = await PlayBoxDB.getAllStats();
    stats.forEach((s) => {
      const el = document.getElementById(`stat-${s.id}`);
      if (!el) return;
      if (s.id === 'snake') el.textContent = `High: ${s.highScore}`;
      else if (s.id === 'memory') el.textContent = `Best: ${s.bestMoves ? s.bestMoves + ' moves' : '--'}`;
      else el.textContent = `Wins: ${s.wins}`;
    });
  }
  await refreshLobbyStats();

  document.querySelectorAll('.filter-pill').forEach((pill) => {
    pill.onclick = () => {
      document.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      const filter = pill.dataset.filter;
      document.querySelectorAll('.game-card').forEach((card) => {
        const modes = card.dataset.modes;
        card.classList.toggle('hidden', filter !== 'all' && !modes.includes(filter));
      });
    };
  });

  function launchGame(gameId, mode = activeMode) {
    const game = window.PlayBoxGames[gameId];
    if (!game) return;

    if (cleanupGame) cleanupGame();
    activeGameId = gameId;
    activeMode = mode;

    lobbyView.classList.add('hidden');
    stageView.classList.remove('hidden');
    stageTitle.textContent = game.title;

    document.getElementById('btnMode1P').classList.toggle('active', mode === '1p');
    document.getElementById('btnMode2P').classList.toggle('active', mode === '2p');

    p1Label.textContent = profile.p1;
    p2Label.textContent = mode === '1p' ? 'AI Bot' : profile.p2;
    p1ScoreEl.textContent = sessionScores.p1;
    p2ScoreEl.textContent = sessionScores.p2;

    const ctx = {
      mode,
      p1Name: profile.p1,
      p2Name: mode === '1p' ? 'AI Bot' : profile.p2,
      setTurn(txt) { turnIndicator.textContent = txt; },
      setLabels(l1, l2) { p1Label.textContent = l1; p2Label.textContent = l2; },
      setScore(s1, s2) { p1ScoreEl.textContent = s1; p2ScoreEl.textContent = s2; },
      addScore(d1, d2) {
        sessionScores.p1 += d1;
        sessionScores.p2 += d2;
        p1ScoreEl.textContent = sessionScores.p1;
        p2ScoreEl.textContent = sessionScores.p2;
      },
      refreshLobbyStats
    };

    cleanupGame = game.mount(gameContainer, ctx);
  }

  document.querySelectorAll('.game-card').forEach((card) => {
    card.onclick = () => {
      sessionScores = { p1: 0, p2: 0 };
      SoundFX.tap();
      launchGame(card.dataset.game, '1p');
    };
  });

  document.getElementById('btnMode1P').onclick = () => {
    sessionScores = { p1: 0, p2: 0 };
    launchGame(activeGameId, '1p');
  };

  document.getElementById('btnMode2P').onclick = () => {
    sessionScores = { p1: 0, p2: 0 };
    launchGame(activeGameId, '2p');
  };

  document.getElementById('btnRestartGame').onclick = () => {
    SoundFX.tap();
    launchGame(activeGameId, activeMode);
  };

  function goLobby() {
    if (cleanupGame) cleanupGame();
    cleanupGame = null;
    activeGameId = null;
    stageView.classList.add('hidden');
    lobbyView.classList.remove('hidden');
  }

  document.getElementById('btnBackLobby').onclick = goLobby;
  document.getElementById('btnHome').onclick = goLobby;

  btnSound.onclick = async () => {
    const next = !SoundFX.isEnabled();
    SoundFX.setEnabled(next);
    btnSound.textContent = next ? '🔊' : '🔇';
    if (next) SoundFX.tap();
    profile = await PlayBoxDB.saveProfile({ sound: next });
  };

  const playersModal = document.getElementById('playersModal');
  document.getElementById('btnPlayers').onclick = () => {
    document.getElementById('inputP1').value = profile.p1;
    document.getElementById('inputP2').value = profile.p2;
    playersModal.classList.remove('hidden');
  };

  document.getElementById('btnSavePlayers').onclick = async () => {
    const p1 = document.getElementById('inputP1').value.trim() || 'Player 1';
    const p2 = document.getElementById('inputP2').value.trim() || 'Player 2';
    profile = await PlayBoxDB.saveProfile({ p1, p2 });
    playersModal.classList.add('hidden');
    if (activeGameId) launchGame(activeGameId, activeMode);
  };

  const statsModal = document.getElementById('statsModal');
  async function renderStatsModal() {
    const stats = await PlayBoxDB.getAllStats();
    const list = document.getElementById('statsList');
    list.innerHTML = stats.map((s) => {
      let metric = `${s.wins}W / ${s.losses}L / ${s.draws}D`;
      if (s.id === 'memory') metric = `${s.wins} Clears • Best: ${s.bestMoves || '--'} moves`;
      if (s.id === 'snake') metric = `High: ${s.highScore} • Plays: ${s.gamesPlayed}`;
      return `<div class="stat-row"><strong>${s.name}</strong><span>${metric}</span></div>`;
    }).join('');
  }

  document.getElementById('btnStats').onclick = async () => {
    await renderStatsModal();
    statsModal.classList.remove('hidden');
  };

  document.getElementById('btnExportData').onclick = async () => {
    const json = await PlayBoxDB.exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playbox-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  document.getElementById('inputImportData').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      await PlayBoxDB.importAll(text);
      profile = await PlayBoxDB.getProfile();
      await refreshLobbyStats();
      await renderStatsModal();
      alert('PlayBox backup restored!');
    } catch (err) {
      alert(err.message);
    }
  };

  document.getElementById('btnResetData').onclick = async () => {
    if (!confirm('Reset all local PlayBox records?')) return;
    await PlayBoxDB.resetAll();
    await refreshLobbyStats();
    await renderStatsModal();
  };

  document.querySelectorAll('.close-modal').forEach((btn) => {
    btn.onclick = () => btn.closest('.modal').classList.add('hidden');
  });
});
