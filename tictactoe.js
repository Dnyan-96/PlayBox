window.PlayBoxGames = window.PlayBoxGames || {};

window.PlayBoxGames.tictactoe = {
  title: 'Neon Tic-Tac-Toe',
  mount(container, ctx) {
    let board = Array(9).fill(null);
    let current = 'X';
    let over = false;
    const wins = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];

    function checkWinner(b) {
      for (const [a, c, d] of wins) {
        if (b[a] && b[a] === b[c] && b[a] === b[d]) return { winner: b[a], line: [a, c, d] };
      }
      if (b.every(Boolean)) return { winner: 'DRAW', line: [] };
      return null;
    }

    function minimax(b, depth, isMax) {
      const res = checkWinner(b);
      if (res) {
        if (res.winner === 'O') return 10 - depth;
        if (res.winner === 'X') return depth - 10;
        return 0;
      }
      if (isMax) {
        let best = -Infinity;
        for (let i = 0; i < 9; i++) {
          if (!b[i]) {
            b[i] = 'O';
            best = Math.max(best, minimax(b, depth + 1, false));
            b[i] = null;
          }
        }
        return best;
      } else {
        let best = Infinity;
        for (let i = 0; i < 9; i++) {
          if (!b[i]) {
            b[i] = 'X';
            best = Math.min(best, minimax(b, depth + 1, true));
            b[i] = null;
          }
        }
        return best;
      }
    }

    function bestAIMove() {
      const empty = board.map((v, i) => (v ? null : i)).filter((v) => v !== null);
      if (Math.random() < 0.2) return empty[Math.floor(Math.random() * empty.length)];

      let bestScore = -Infinity;
      let move = empty[0];
      for (const i of empty) {
        board[i] = 'O';
        const score = minimax(board, 0, false);
        board[i] = null;
        if (score > bestScore) {
          bestScore = score;
          move = i;
        }
      }
      return move;
    }

    async function handleMove(idx) {
      if (over || board[idx]) return;
      board[idx] = current;
      SoundFX.tap();

      const res = checkWinner(board);
      if (res) {
        over = true;
        render(res.line);
        if (res.winner === 'DRAW') {
          SoundFX.drop();
          ctx.setTurn("It's a Draw!");
          await PlayBoxDB.updateStat('tictactoe', (s) => ({ ...s, draws: s.draws + 1 }));
        } else {
          const p1Won = res.winner === 'X';
          if (p1Won) {
            SoundFX.win();
            ctx.addScore(1, 0);
            ctx.setTurn(`${ctx.p1Name} Wins! 🎉`);
          } else {
            ctx.mode === '1p' ? SoundFX.lose() : SoundFX.win();
            ctx.addScore(0, 1);
            ctx.setTurn(`${ctx.p2Name} Wins! 🎉`);
          }
          await PlayBoxDB.updateStat('tictactoe', (s) => {
            if (ctx.mode === '2p') s.p2Games += 1;
            else if (p1Won) s.wins += 1;
            else s.losses += 1;
            return s;
          });
        }
        ctx.refreshLobbyStats();
        return;
      }

      current = current === 'X' ? 'O' : 'X';
      ctx.setTurn(`${current === 'X' ? ctx.p1Name : ctx.p2Name}'s Turn (${current})`);
      render();

      if (ctx.mode === '1p' && current === 'O' && !over) {
        setTimeout(() => handleMove(bestAIMove()), 280);
      }
    }

    function render(winLine = []) {
      const grid = document.createElement('div');
      grid.className = 'ttt-grid';
      board.forEach((val, idx) => {
        const btn = document.createElement('button');
        btn.className = `ttt-cell ${val ? val.toLowerCase() : ''} ${winLine.includes(idx) ? 'win' : ''}`;
        btn.textContent = val || '';
        btn.disabled = Boolean(val) || over || (ctx.mode === '1p' && current === 'O');
        btn.onclick = () => handleMove(idx);
        grid.appendChild(btn);
      });
      container.innerHTML = '';
      container.appendChild(grid);
    }

    ctx.setTurn(`${ctx.p1Name}'s Turn (X)`);
    render();
    return () => {};
  }
};
