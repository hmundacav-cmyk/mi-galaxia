(() => {
  const frases = ['Para Ashly Mishell', 'Con mucho cariño', 'Para ti'];
  const $ = (id) => document.getElementById(id);
  const cv = $('cielo'), ctx = cv.getContext('2d');
  const luna = $('luna'), avanzar = $('avanzar'), frase = $('frase'), mensaje = $('mensaje');
  const progreso = $('progreso'), ayuda = $('ayuda'), universo = $('universo');
  const puntos = [...progreso.querySelectorAll('.punto')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => Math.random() * (b - a) + a;
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- Ruido fractal (para la nebulosa) ---------- */
  const perm = new Uint8Array(512);
  { const p = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
  function vn(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
    const a = perm[perm[X] + Y], b = perm[perm[X + 1] + Y], c = perm[perm[X] + Y + 1], d = perm[perm[X + 1] + Y + 1];
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return (lerp(lerp(a, b, u), lerp(c, d, u), v)) / 255;
  }
  function fbm(x, y) {
    let s = 0, a = .5;
    for (let i = 0; i < 5; i++) { s += a * vn(x, y); x = x * 2.03 + 17; y = y * 2.03 + 31; a *= .5; }
    return s;
  }

  /* ---------- Estado ---------- */
  let W, H, DPR, gx, gy, GR, neb;
  let px = 0, py = 0, tx = 0, ty = 0, pulso = 0;
  const anillos = [], chispas = [], fugaces = [];

  /* Estrellas: coordenadas normalizadas, 3 capas de profundidad */
  const estrellas = Array.from({ length: 720 }, (_, i) => {
    const brillante = i < 26;
    return { x: Math.random(), y: Math.random(), z: Math.random(),
      s: brillante ? rnd(1.6, 2.6) : Math.pow(Math.random(), 3) * 1.6 + .35,
      f: rnd(.6, 2.4), p: rnd(0, 6.28), b: brillante,
      c: pick(['255,255,255', '255,236,205', '196,206,255', '255,208,226']) };
  });

  /* Galaxia espiral de dos brazos */
  const part = [];
  for (let i = 0; i < 3400; i++) {
    const bulbo = i < 520;
    const r = bulbo ? Math.pow(Math.random(), 2.2) * .3 : Math.pow(Math.random(), 1.35);
    const disp = (Math.random() + Math.random() + Math.random() - 1.5) * (.22 + .5 * (1 - r) * .5);
    const a = bulbo ? rnd(0, 6.283) : (i % 2) * Math.PI + r * 5.4 + disp;
    const rosa = !bulbo && Math.random() < .07;
    const c = bulbo || r < .22 ? [255, 226, 172] : rosa ? [255, 140, 196] : r < .55 ? [226, 226, 255] : [150, 176, 255];
    part.push({ r, a, w: 1 / Math.sqrt(r + .12), s: rnd(.6, 1.7) * (bulbo ? 1.1 : 1), al: rnd(.25, .9), c });
  }

  /* ---------- Nebulosa procedural (paleta tipo Hubble / Webb) ---------- */
  function construirNebulosa() {
    const nw = 520, nh = clamp(Math.round(nw * H / W), 300, 1000);
    neb = document.createElement('canvas'); neb.width = nw; neb.height = nh;
    const n = neb.getContext('2d'), img = n.createImageData(nw, nh), d = img.data;
    const sx = rnd(0, 50), sy = rnd(0, 50);
    const azul = [34, 52, 190], mag = [196, 58, 150], tur = [34, 170, 190], oro = [255, 176, 84];
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      const u = x / nw * 3.2 + sx, v = y / nw * 3.2 + sy;
      const q = fbm(u, v), r = fbm(u + q * 2.2 + 5.2, v + q * 2.2 + 1.3), f = fbm(u + r * 2.6 + 9, v + r * 2.6 + 3);
      const lane = sm(.5, .78, fbm(u * 2 + 40, v * 2 + 7));
      const m = sm(.25, .75, fbm(u * .5 + 70, v * .5 + 20));
      const dens = sm(.3, .85, f) * (.3 + .7 * m) * (1 - lane * .72);
      const hot = sm(.52, .95, q * r * 2.1) * m * (1 - lane * .55);
      const k = sm(.35, .65, r), t = sm(.5, .8, q) * .85;
      const dx = x / nw - .5, dy = y / nh - .5, vig = 1 - clamp((dx * dx + dy * dy) * 1.5);
      const i = (y * nw + x) * 4;
      for (let c = 0; c < 3; c++) {
        let val = lerp(azul[c], mag[c], k); val = lerp(val, tur[c], t);
        val = (val * dens * 1.5 + oro[c] * hot * 1.05 + (c === 2 ? 22 : 7)) * vig;
        d[i + c] = clamp(val, 0, 255);
      }
      d[i + 3] = 255;
    }
    n.putImageData(img, 0, 0);
    /* Campo profundo: pequeñas galaxias lejanas */
    n.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 22; i++) {
      const s = rnd(2, 7), col = pick(['255,214,160', '170,190,255', '255,170,210']);
      n.save(); n.translate(rnd(0, nw), rnd(0, nh)); n.rotate(rnd(0, 3.14)); n.scale(1, rnd(.25, .7));
      const g = n.createRadialGradient(0, 0, 0, 0, 0, s);
      g.addColorStop(0, `rgba(${col},.95)`); g.addColorStop(.3, `rgba(${col},.35)`); g.addColorStop(1, `rgba(${col},0)`);
      n.fillStyle = g; n.beginPath(); n.arc(0, 0, s, 0, 6.283); n.fill(); n.restore();
    }
  }

  function ajustar() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    gx = W / 2; gy = H * (W < 600 ? .33 : .34);
    GR = clamp(Math.min(W * .4, H * .24), 90, 250);
  }
  let rt;
  addEventListener('resize', () => { ajustar(); clearTimeout(rt); rt = setTimeout(construirNebulosa, 250); });

  /* ---------- Dibujo ---------- */
  function espigas(x, y, L, a) {
    ctx.lineWidth = .8; ctx.strokeStyle = `rgba(210,222,255,${a})`;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) { const an = Math.PI / 2 + k * Math.PI / 3, dx = Math.cos(an) * L, dy = Math.sin(an) * L; ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); }
    ctx.moveTo(x - L * .35, y); ctx.lineTo(x + L * .35, y);
    ctx.stroke();
  }

  function dibujarGalaxia(t) {
    const rot = reduce ? 0 : t * .05, R = GR * (1 + pulso * .1);
    ctx.save();
    ctx.translate(gx - px * 8, gy - py * 8); ctx.rotate(-.5); ctx.scale(1, .5);
    let g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.5);
    g.addColorStop(0, `rgba(255,222,165,${.5 + pulso * .3})`); g.addColorStop(.3, 'rgba(160,140,255,.14)'); g.addColorStop(1, 'rgba(60,40,140,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 1.5, 0, 6.283); ctx.fill();
    for (const p of part) {
      const a = p.a + rot * p.w, r = p.r * R, tw = .75 + .25 * Math.sin(t * 2 + p.a * 9);
      ctx.fillStyle = `rgba(${p.c},${Math.min(1, p.al * tw * (1 + pulso * .8))})`;
      ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r, p.s, p.s);
    }
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * .3);
    g.addColorStop(0, `rgba(255,250,232,${.95})`); g.addColorStop(.35, 'rgba(255,214,150,.55)'); g.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * .3, 0, 6.283); ctx.fill();
    ctx.restore();
  }

  let ultimo = 0, proxFugaz = 2;
  function cuadro(ms) {
    const t = ms / 1000, dt = Math.min(.05, t - ultimo); ultimo = t;
    px += (tx - px) * .05; py += (ty - py) * .05; pulso = Math.max(0, pulso - dt * .9);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '#02030a'; ctx.fillRect(0, 0, W, H);

    if (neb) {
      const w = W * 1.16, h = H * 1.16, dr = reduce ? 0 : 1;
      ctx.drawImage(neb, (W - w) / 2 - px * 18 + Math.sin(t * .05) * 12 * dr, (H - h) / 2 - py * 18 + Math.cos(t * .04) * 9 * dr, w, h);
    }

    ctx.globalCompositeOperation = 'lighter';
    for (const s of estrellas) {
      const x = s.x * W - px * s.z * 30, y = s.y * H - py * s.z * 30;
      const a = reduce ? .8 : .45 + .55 * Math.sin(t * s.f + s.p) ** 2;
      ctx.fillStyle = `rgba(${s.c},${a * (.4 + s.z * .6)})`;
      if (s.b) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, s.s * 7);
        g.addColorStop(0, `rgba(${s.c},${a})`); g.addColorStop(.2, `rgba(${s.c},${a * .3})`); g.addColorStop(1, `rgba(${s.c},0)`);
        ctx.fillStyle = g; ctx.fillRect(x - s.s * 7, y - s.s * 7, s.s * 14, s.s * 14);
        espigas(x, y, s.s * 16, a * .35);
      } else ctx.fillRect(x, y, s.s, s.s);
    }

    dibujarGalaxia(t);

    ctx.globalCompositeOperation = 'lighter';
    for (let i = anillos.length - 1; i >= 0; i--) {
      const r = anillos[i]; r.r += dt * GR * 2.6; r.a -= dt * .7;
      if (r.a <= 0) { anillos.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(255,226,175,${r.a * .6})`; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(gx, gy, r.r, r.r * .5, -.5, 0, 6.283); ctx.stroke();
    }
    for (let i = chispas.length - 1; i >= 0; i--) {
      const c = chispas[i]; c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= .985; c.vy *= .985; c.a -= dt * .9;
      if (c.a <= 0) { chispas.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(${c.c},${c.a})`; ctx.beginPath(); ctx.arc(c.x, c.y, c.s, 0, 6.283); ctx.fill();
    }
    if (!reduce && (proxFugaz -= dt) < 0) { proxFugaz = rnd(3, 7); fugaces.push({ x: rnd(W * .4, W), y: rnd(0, H * .4), a: 1 }); }
    for (let i = fugaces.length - 1; i >= 0; i--) {
      const f = fugaces[i]; f.x -= dt * 620; f.y += dt * 330; f.a -= dt * 1.5;
      if (f.a <= 0) { fugaces.splice(i, 1); continue; }
      const g = ctx.createLinearGradient(f.x, f.y, f.x + 130, f.y - 70);
      g.addColorStop(0, `rgba(255,255,255,${f.a})`); g.addColorStop(1, 'rgba(180,170,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + 130, f.y - 70); ctx.stroke();
    }
    requestAnimationFrame(cuadro);
  }

  /* ---------- Interacción ---------- */
  function onda(x, y) {
    pulso = 1; anillos.push({ r: GR * .2, a: 1 }, { r: 0, a: .7 });
    for (let i = 0; i < 34; i++) {
      const an = rnd(0, 6.283), v = rnd(40, 240);
      chispas.push({ x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, s: rnd(.6, 1.8), a: 1, c: pick(['255,233,185', '217,201,255', '255,255,255', '244,197,231']) });
    }
  }
  addEventListener('pointermove', (e) => { tx = (e.clientX / W - .5) * 2; ty = (e.clientY / H - .5) * 2; });

  let idx = 0, ocupado = false;
  function escribir(texto) {
    let n = 0;
    frase.innerHTML = texto.split(' ').map((w) => `<span class="w">${[...w].map((ch) => `<span class="l" style="--i:${n++}">${ch}</span>`).join('')}</span>`).join(' ');
  }
  function activar(e) {
    if (ocupado) return; ocupado = true;
    const r = luna.getBoundingClientRect();
    const tecla = !e || e.detail === 0 || !Number.isFinite(e.clientX);
    onda(tecla ? r.left + r.width / 2 : e.clientX, tecla ? r.top + r.height / 2 : e.clientY);
    idx = (idx + 1) % frases.length;
    mensaje.classList.add('cambiando');
    setTimeout(() => {
      escribir(frases[idx]);
      puntos.forEach((p, i) => p.classList.toggle('activo', i === idx));
      progreso.setAttribute('aria-label', `Mensaje ${idx + 1} de ${frases.length}`);
      ayuda.textContent = idx === frases.length - 1 ? 'TOCA PARA VOLVER A EMPEZAR' : 'TOCA PARA DESCUBRIR EL SIGUIENTE MENSAJE';
      mensaje.classList.remove('cambiando'); ocupado = false;
    }, 420);
  }
  luna.addEventListener('click', activar);
  avanzar.addEventListener('click', activar);
  universo.addEventListener('click', (e) => { if (!e.target.closest('button')) activar(e); });

  ajustar(); construirNebulosa(); escribir(frases[0]);
  requestAnimationFrame(cuadro);
})();
