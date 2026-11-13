window.PlayBoxGames = window.PlayBoxGames || {};

window.PlayBoxGames.connect4 = {
  title: 'Cyber Connect 4',
  mount(container, ctx) {
    const ROWS = 6;
    const COLS = 7;
    let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    let turn = 1;
    let over = false;
    let winCells = [];

    function getOpenRow(col) {
      for (let r = ROWS - 1; r >= 0; r--) {
        if (grid[r][col] === 0) return r;
      }
      return -1;
    }

    function findWin(player) {
      const dirs = [[0,1],[1,0],[1,1],[1,-1]];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c] !== player) continue;
          for (const [dr, dc] of dirs) {
            const cells = [[r, c]];
            for (let k = 1; k < 4; k++) {
              const nr = r + dr * k, nc = c + dc * k;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === player) {
                cells.push([nr, nc]);
              }
            }
            if (cells.length === 4) return cells;
          }
        }
      }
      return null;
    }

    function pickAICol() {
      const valid = [];
      for (let c = 0; c < COLS; c++) if (getOpenRow(c) !== -1) valid.push(c);

      for (const c of valid) {
        const r = getOpenRow(c);
        grid[r][c] = 2;
        const win = findWin(2);
        grid[r][c] = 0;
        if (win) return c;
      }
      for (const c of valid) {
        const r = getOpenRow(c);
        grid[r][c] = 1;
        const block = findWin(1);
        grid[r][c] = 0;
        if (block) return c;
      }
      valid.sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));
      return valid[0];
    }

    async function dropDisc(col) {
      if (over) return;
      const row = getOpenRow(col);
      if (row === -1) return;

      grid[row][col] = turn;
      SoundFX.drop();

      const won = findWin(turn);
      if (won) {
        over = true;
        winCells = won;
        render();
        if (turn === 1) {
          SoundFX.win();
          ctx.addScore(1, 0);
          ctx.setTurn(`${ctx.p1Name} Connects 4! 🎉`);
        } else {
          ctx.mode === '1p' ? SoundFX.lose() : SoundFX.win();
          ctx.addScore(0, 1);
          ctx.setTurn(`${ctx.p2Name} Connects 4! 🎉`);
        }
        await PlayBoxDB.updateStat('connect4', (s) => {
          if (ctx.mode === '2p') s.p2Games += 1;
          else if (turn === 1) s.wins += 1;
          else s.losses += 1;
          return s;
        });
        ctx.refreshLobbyStats();
        return;
      }

      if (grid[0].every((v) => v !== 0)) {
        over = true;
        ctx.setTurn('Board Full — Draw!');
        render();
        return;
      }

      turn = turn === 1 ? 2 : 1;
      ctx.setTurn(`${turn === 1 ? ctx.p1Name : ctx.p2Name}'s Turn`);
      render();

      if (ctx.mode === '1p' && turn === 2 && !over) {
        setTimeout(() => dropDisc(pickAICol()), 320);
      }
    }

    function render() {
      const board = document.createElement('div');
      board.className = 'c4-board';
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = document.createElement('div');
          const val = grid[r][c];
          const isWin = winCells.some(([wr, wc]) => wr === r && wc === c);
          cell.className = `c4-cell ${val === 1 ? 'p1' : val === 2 ? 'p2' : ''} ${isWin ? 'win' : ''}`;
          cell.onclick = () => {
            if (ctx.mode === '1p' && turn === 2) return;
            dropDisc(c);
          };
          board.appendChild(cell);
        }
      }
      container.innerHTML = '';
      container.appendChild(board);
    }

    ctx.setTurn(`${ctx.p1Name}'s Turn`);
    render();
    return () => {};
  }
};
