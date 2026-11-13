window.PlayBoxGames = window.PlayBoxGames || {};

window.PlayBoxGames.memory = {
  title: 'Emoji Flip Match',
  mount(container, ctx) {
    const EMOJIS = ['🚀', '🎮', '💎', '🔥', '⚡', '🦊', '🍕', '🌈'];
    const deck = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((icon, id) => ({ id, icon, flipped: false, matched: false }));

    let openCards = [];
    let lock = false;
    let turn = 1;
    let moves = 0;
    let p1Pairs = 0;
    let p2Pairs = 0;

    async function flipCard(idx) {
      const card = deck[idx];
      if (lock || card.flipped || card.matched) return;

      card.flipped = true;
      openCards.push(card);
      SoundFX.tap();
      render();

      if (openCards.length === 2) {
        lock = true;
        moves += 1;
        const [a, b] = openCards;

        if (a.icon === b.icon) {
          a.matched = b.matched = true;
          openCards = [];
          lock = false;
          SoundFX.score();

          if (ctx.mode === '2p') {
            if (turn === 1) { p1Pairs++; ctx.addScore(1, 0); }
            else { p2Pairs++; ctx.addScore(0, 1); }
          } else {
            p1Pairs++;
            ctx.setScore(p1Pairs, moves);
          }

          render();

          if (deck.every((c) => c.matched)) {
            SoundFX.win();
            if (ctx.mode === '1p') {
              ctx.setTurn(`Cleared in ${moves} Moves! 🎉`);
              await PlayBoxDB.updateStat('memory', (s) => {
                s.wins += 1;
                if (!s.bestMoves || moves < s.bestMoves) s.bestMoves = moves;
                return s;
              });
            } else {
              const msg = p1Pairs === p2Pairs
                ? 'Tie Game!'
                : `${p1Pairs > p2Pairs ? ctx.p1Name : ctx.p2Name} Wins (${Math.max(p1Pairs, p2Pairs)} pairs)!`;
              ctx.setTurn(msg);
              await PlayBoxDB.updateStat('memory', (s) => ({ ...s, p2Games: s.p2Games + 1 }));
            }
            ctx.refreshLobbyStats();
          }
        } else {
          setTimeout(() => {
            a.flipped = b.flipped = false;
            openCards = [];
            lock = false;
            if (ctx.mode === '2p') {
              turn = turn === 1 ? 2 : 1;
              ctx.setTurn(`${turn === 1 ? ctx.p1Name : ctx.p2Name}'s Turn`);
            } else {
              ctx.setTurn(`Pairs: ${p1Pairs}/8 • Moves: ${moves}`);
            }
            render();
          }, 650);
        }
      }
    }

    function render() {
      const grid = document.createElement('div');
      grid.className = 'mem-grid';
      deck.forEach((card, idx) => {
        const btn = document.createElement('button');
        btn.className = `mem-card ${card.flipped ? 'flipped' : ''} ${card.matched ? 'matched' : ''}`;
        btn.textContent = card.flipped || card.matched ? card.icon : '?';
        btn.onclick = () => flipCard(idx);
        grid.appendChild(btn);
      });
      container.innerHTML = '';
      container.appendChild(grid);
    }

    if (ctx.mode === '1p') {
      ctx.setLabels(ctx.p1Name, 'Moves');
      ctx.setScore(0, 0);
      ctx.setTurn('Find all 8 pairs!');
    } else {
      ctx.setTurn(`${ctx.p1Name}'s Turn — Match keeps turn!`);
    }
    render();
    return () => {};
  }
};
