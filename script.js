'use strict';

/* ==========================================
   NAVBAR — scroll blur + active section
   ========================================== */
const navbar = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section[id]');
const hamburger = document.getElementById('hamburger');
const navLinksList = document.querySelector('.nav-links');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
  updateActiveNav();
}, { passive: true });

function updateActiveNav() {
  let current = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 100) current = s.id; });
  navLinks.forEach(l => {
    l.classList.toggle('active', l.getAttribute('href') === '#' + current);
  });
}

hamburger.addEventListener('click', () => navLinksList.classList.toggle('open'));
navLinks.forEach(l => l.addEventListener('click', () => navLinksList.classList.remove('open')));

/* ==========================================
   NEURAL NETWORK BACKGROUND (full-page)
   Flowing nodes connected by glowing lines,
   mouse attracts nearby nodes, click creates pulse
   ========================================== */
(function initNeural() {
  const canvas = document.getElementById('particle-canvas');
  const ctx    = canvas.getContext('2d');

  let W, H, nodes = [], mouse = { x: -9999, y: -9999 };

  const CONFIG = {
    nodeCount:    90,
    connectDist:  180,
    nodeSpeed:    0.4,
    nodeRadius:   { min: 1.5, max: 3.5 },
    mouseRadius:  160,
    mouseForce:   0.06,
    pulseNodes:   [], // click-generated expanding pulse rings
  };

  const PALETTE = [
    { r: 108, g: 99,  b: 255 },  // purple
    { r: 62,  g: 207, b: 207 },  // cyan
    { r: 255, g: 107, b: 157 },  // pink (rare)
  ];

  /* ── resize ── */
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', () => { resize(); initNodes(); }, { passive: true });

  /* ── node factory ── */
  function rand(a, b) { return Math.random() * (b - a) + a; }

  function makeNode() {
    const c  = PALETTE[Math.random() < 0.7 ? 0 : Math.random() < 0.6 ? 1 : 2];
    const angle = rand(0, Math.PI * 2);
    const speed = rand(0.1, CONFIG.nodeSpeed);
    return {
      x:    rand(0, W),  y:    rand(0, H),
      vx:   Math.cos(angle) * speed,
      vy:   Math.sin(angle) * speed,
      r:    rand(CONFIG.nodeRadius.min, CONFIG.nodeRadius.max),
      c,
      alpha:    rand(0.5, 1.0),
      phase:    rand(0, Math.PI * 2),   // for pulse glow
      pulseAmt: rand(0.3, 0.7),
    };
  }

  function initNodes() {
    nodes = [];
    for (let i = 0; i < CONFIG.nodeCount; i++) nodes.push(makeNode());
  }

  /* ── mouse track ── */
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  window.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  /* ── click pulse ── */
  document.addEventListener('click', e => {
    const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    CONFIG.pulseNodes.push({ x: e.clientX, y: e.clientY, r: 0, maxR: 200, alpha: 0.8, c });
    // spawn 3 extra nodes at click
    for (let i = 0; i < 3; i++) {
      const n = makeNode();
      n.x = e.clientX + rand(-20, 20);
      n.y = e.clientY + rand(-20, 20);
      nodes.push(n);
      if (nodes.length > CONFIG.nodeCount + 30) nodes.shift();
    }
  });

  /* ── draw ── */
  function draw(t) {
    ctx.clearRect(0, 0, W, H);

    // ── pulse rings from clicks ──
    CONFIG.pulseNodes = CONFIG.pulseNodes.filter(p => p.alpha > 0.01);
    CONFIG.pulseNodes.forEach(p => {
      p.r     += 4;
      p.alpha -= 0.015;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${p.c.r},${p.c.g},${p.c.b},${p.alpha})`;
      ctx.lineWidth   = 2;
      ctx.stroke();
      // second ring
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${p.c.r},${p.c.g},${p.c.b},${p.alpha * 0.4})`;
      ctx.lineWidth   = 1;
      ctx.stroke();
    });

    // ── connections ──
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx   = nodes[i].x - nodes[j].x;
        const dy   = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.connectDist) {
          const strength = 1 - dist / CONFIG.connectDist;
          // blend colours of the two connected nodes
          const cr = (nodes[i].c.r + nodes[j].c.r) / 2;
          const cg = (nodes[i].c.g + nodes[j].c.g) / 2;
          const cb = (nodes[i].c.b + nodes[j].c.b) / 2;

          const grad = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
          grad.addColorStop(0, `rgba(${nodes[i].c.r},${nodes[i].c.g},${nodes[i].c.b},${strength * 0.5})`);
          grad.addColorStop(1, `rgba(${nodes[j].c.r},${nodes[j].c.g},${nodes[j].c.b},${strength * 0.5})`);

          ctx.strokeStyle = grad;
          ctx.lineWidth   = strength * 1.5;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // ── nodes ──
    nodes.forEach((n, i) => {
      const glow = 0.5 + n.pulseAmt * Math.sin(t * 0.001 + n.phase);

      // outer glow ring
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 4);
      g.addColorStop(0,   `rgba(${n.c.r},${n.c.g},${n.c.b},${0.25 * glow})`);
      g.addColorStop(1,   `rgba(${n.c.r},${n.c.g},${n.c.b},0)`);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();

      // core dot
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${n.c.r},${n.c.g},${n.c.b},${n.alpha * glow})`;
      ctx.fill();
    });
  }

  /* ── update ── */
  function update() {
    nodes.forEach(n => {
      // mouse attraction
      const dx   = mouse.x - n.x;
      const dy   = mouse.y - n.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONFIG.mouseRadius && dist > 1) {
        n.vx += (dx / dist) * CONFIG.mouseForce;
        n.vy += (dy / dist) * CONFIG.mouseForce;
      }

      // dampen
      n.vx *= 0.992;
      n.vy *= 0.992;

      // max speed
      const spd = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (spd > CONFIG.nodeSpeed * 2.5) {
        n.vx = (n.vx / spd) * CONFIG.nodeSpeed * 2.5;
        n.vy = (n.vy / spd) * CONFIG.nodeSpeed * 2.5;
      }

      // move
      n.x += n.vx;
      n.y += n.vy;

      // wrap
      if (n.x < -10) n.x = W + 10;
      if (n.x > W + 10) n.x = -10;
      if (n.y < -10) n.y = H + 10;
      if (n.y > H + 10) n.y = -10;
    });
  }

  /* ── loop ── */
  function loop(t) {
    update();
    draw(t);
    requestAnimationFrame(loop);
  }

  resize();
  initNodes();
  requestAnimationFrame(loop);
})();

/* ==========================================
   TYPEWRITER
   ========================================== */
(function initTypewriter() {
  const el      = document.getElementById('typewriter');
  const phrases = ['AI Engineer', 'SDE', 'ML Systems Builder', 'Software Developer', 'Backend Engineer'];
  let pi = 0, ci = 0, del = false;

  function tick() {
    const cur = phrases[pi];
    if (!del) {
      el.textContent = cur.slice(0, ++ci);
      if (ci === cur.length) { del = true; return setTimeout(tick, 2200); }
      setTimeout(tick, 65);
    } else {
      el.textContent = cur.slice(0, --ci);
      if (ci === 0) { del = false; pi = (pi + 1) % phrases.length; return setTimeout(tick, 400); }
      setTimeout(tick, 35);
    }
  }
  tick();
})();

/* ==========================================
   INTERSECTION OBSERVER — reveal
   ========================================== */
(function initReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const siblings = [...entry.target.parentElement.querySelectorAll('.reveal')];
      const delay    = siblings.indexOf(entry.target) * 80;
      setTimeout(() => entry.target.classList.add('visible'), delay);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
})();

/* ==========================================
   3D TILT
   ========================================== */
(function initTilt() {
  document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r   = card.getBoundingClientRect();
      const nx  = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
      const ny  = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
      card.style.transition = 'transform 0.1s ease';
      card.style.transform  = `perspective(800px) rotateX(${-ny*13}deg) rotateY(${nx*13}deg) translateZ(8px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)';
      card.style.transform  = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    });
  });
})();

/* ==========================================
   SMOOTH SCROLL
   ========================================== */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
  });
});
