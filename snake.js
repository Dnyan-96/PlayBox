window.PlayBoxGames = window.PlayBoxGames || {};

window.PlayBoxGames.snake = {
  title: 'Neon Snake Arena',
  mount(container, ctx) {
    const SIZE = 20;
    const CELL = 16;
    const CANVAS_PX = SIZE * CELL;

    container.innerHTML = `
      <div class="snake-wrap">
        <canvas id="snakeCanvas" width="${CANVAS_PX}" height="${CANVAS_PX}"></canvas>
        <div class="snake-pads" id="snakePads"></div>
      </div>
    `;

    const canvas = container.querySelector('#snakeCanvas');
    const c2d = canvas.getContext('2d');
    const padsEl = container.querySelector('#snakePads');

    let p1 = { body: [{ x: 4, y: 10 }, { x: 3, y: 10 }], dir: { x: 1, y: 0 }, next: { x: 1, y: 0 }, color: '#06b6d4', score: 0, alive: true };
    let p2 = { body: [{ x: 15, y: 10 }, { x: 16, y: 10 }], dir: { x: -1, y: 0 }, next: { x: -1, y: 0 }, color: '#ec4899', score: 0, alive: ctx.mode === '2p' };
    let food = spawnFood();
    let over = false;

    function spawnFood() {
      while (true) {
        const pt = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
        const hit1 = p1.body.some((s) => s.x === pt.x && s.y === pt.y);
        const hit2 = p2.alive && p2.body.some((s) => s.x === pt.x && s.y === pt.y);
        if (!hit1 && !hit2) return pt;
      }
    }

    function setDir(snake, dx, dy) {
      if (snake.dir.x + dx === 0 && snake.dir.y + dy === 0) return;
      snake.next = { x: dx, y: dy };
    }

    function buildDpad(label, snake) {
      const box = document.createElement('div');
      box.innerHTML = `<div style="text-align:center;font-size:12px;margin-bottom:4px;color:#94a3b8">${label}</div>`;
      const pad = document.createElement('div');
      pad.className = 'dpad';
      pad.innerHTML = `
        <span></span><button data-d="0,-1">▲</button><span></span>
        <button data-d="-1,0">◀</button><button data-d="0,1">▼</button><button data-d="1,0">▶</button>
      `;
      pad.querySelectorAll('button').forEach((b) => {
        b.onclick = () => {
          const [dx, dy] = b.dataset.d.split(',').map(Number);
          setDir(snake, dx, dy);
        };
      });
      box.appendChild(pad);
      return box;
    }

    padsEl.appendChild(buildDpad(ctx.mode === '2p' ? `${ctx.p1Name} (WASD)` : 'Controls', p1));
    if (ctx.mode === '2p') {
      padsEl.appendChild(buildDpad(`${ctx.p2Name} (Arrows)`, p2));
    }

    function onKey(e) {
      const k = e.key.toLowerCase();
      if (ctx.mode === '1p') {
        if (k === 'arrowup' || k === 'w') setDir(p1, 0, -1);
        if (k === 'arrowdown' || k === 's') setDir(p1, 0, 1);
        if (k === 'arrowleft' || k === 'a') setDir(p1, -1, 0);
        if (k === 'arrowright' || k === 'd') setDir(p1, 1, 0);
      } else {
        if (k === 'w') setDir(p1, 0, -1);
        if (k === 's') setDir(p1, 0, 1);
        if (k === 'a') setDir(p1, -1, 0);
        if (k === 'd') setDir(p1, 1, 0);
        if (e.key === 'ArrowUp') setDir(p2, 0, -1);
        if (e.key === 'ArrowDown') setDir(p2, 0, 1);
        if (e.key === 'ArrowLeft') setDir(p2, -1, 0);
        if (e.key === 'ArrowRight') setDir(p2, 1, 0);
      }
    }
    window.addEventListener('keydown', onKey);

    let touchStart = null;
    canvas.addEventListener('touchstart', (e) => {
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    canvas.addEventListener('touchend', (e) => {
      if (!touchStart) return;
      const dx = e.changedTouches[0].clientX - touchStart.x;
      const dy = e.changedTouches[0].clientY - touchStart.y;
      if (Math.abs(dx) > Math.abs(dy)) setDir(p1, dx > 0 ? 1 : -1, 0);
      else setDir(p1, 0, dy > 0 ? 1 : -1);
    }, { passive: true });

    async function endGame(msg) {
      over = true;
      clearInterval(loop);
      SoundFX.lose();
      ctx.setTurn(msg);
      await PlayBoxDB.updateStat('snake', (s) => {
        s.gamesPlayed += 1;
        if (ctx.mode === '2p') s.p2Games += 1;
        if (p1.score > s.highScore) s.highScore = p1.score;
        return s;
      });
      ctx.refreshLobbyStats();
    }

    function stepSnake(snake, other) {
      snake.dir = snake.next;
      const head = { x: snake.body[0].x + snake.dir.x, y: snake.body[0].y + snake.dir.y };
      const wallHit = head.x < 0 || head.x >= SIZE || head.y < 0 || head.y >= SIZE;
      const selfHit = snake.body.some((s) => s.x === head.x && s.y === head.y);
      const otherHit = other && other.alive && other.body.some((s) => s.x === head.x && s.y === head.y);

      if (wallHit || selfHit || otherHit) {
        snake.alive = false;
        return;
      }

      snake.body.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        snake.score += 10;
        SoundFX.score();
        food = spawnFood();
      } else {
        snake.body.pop();
      }
    }

    function draw() {
      c2d.fillStyle = '#090d16';
      c2d.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

      c2d.fillStyle = '#f59e0b';
      c2d.beginPath();
      c2d.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * 0.4, 0, Math.PI * 2);
      c2d.fill();

      [p1, p2].forEach((sn) => {
        if (!sn.alive) return;
        c2d.fillStyle = sn.color;
        sn.body.forEach((seg, i) => {
          c2d.globalAlpha = i === 0 ? 1 : 0.78;
          c2d.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
        });
        c2d.globalAlpha = 1;
      });
    }

    if (ctx.mode === '1p') {
      ctx.setLabels(ctx.p1Name, 'Target');
      ctx.setScore(0, '∞');
      ctx.setTurn('Collect Gems!');
    } else {
      ctx.setTurn('Survive Longer Than Your Rival!');
    }

    const loop = setInterval(() => {
      if (over) return;
      if (p1.alive) stepSnake(p1, p2);
      if (ctx.mode === '2p' && p2.alive) stepSnake(p2, p1);

      if (ctx.mode === '1p') {
        ctx.setScore(p1.score, '∞');
        if (!p1.alive) return endGame(`Game Over! Score: ${p1.score}`);
      } else {
        ctx.setScore(p1.score, p2.score);
        if (!p1.alive && !p2.alive) return endGame('Double Crash — Draw!');
        if (!p1.alive) return endGame(`${ctx.p2Name} Wins! 🎉`);
        if (!p2.alive) return endGame(`${ctx.p1Name} Wins! 🎉`);
      }
      draw();
    }, 155);

    draw();
    return () => {
      clearInterval(loop);
      window.removeEventListener('keydown', onKey);
    };
  }
};
