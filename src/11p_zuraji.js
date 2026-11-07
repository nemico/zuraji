/* JIZURA pack: zuraji — レトロゲーム / サイバーパンク / Y2K / グラスモーフィズム
   One style, one signature part and one おまかせ theme per direction (pilot). Each direction is its own pack name
   (zr_retro, zr_cyber, zr_y2k, zr_glass) so a theme can keep exactly its own parts and style in. All of them are 追加分. */
(() => {
'use strict';
const E = J.E;
const MG = env => Math.round(Math.min(env.W, env.H) * 0.05);           // safe margin
const dark = env => J.lum(env.sc.bg) < 0.5;
const inE = (env, d = 0.35, delay = 0, ease = E.outExpo) => ease(J.clamp((env.lt - delay) / d));
const outK = env => 1 - E.inCubic(env.pOut);
const fontsOf = (st, roles) => J.fontsOf(st, roles);
const hasFont = k => !!(J.FONTS && J.FONTS[k]);
const slots = t => [...String(t || '').replace(/[\s　]+/g, '')];
const box = (x0, y0, x1, y1) => ({ x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, boxes: [] });
const union = (a, b) => (a && b ? J.unionBB(a, b) : a || b);
// lyric split into balanced lines of at most `per` glyphs
const wrap = (text, per) => { const n = J.glyphCount(text); return n > per ? J.splitLines(text, Math.ceil(n / Math.ceil(n / per))) : text; };
const rrPath = (ctx, x, y, w, h, r) => {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
};

/* ======================================================================= レトロゲーム — RPGの窓 (layout)
   the lyric sits in a game dialogue window at the bottom (or middle): pixel frame, hard shadow, a speaker tag
   and the blinking ▼ "next" cursor once the line is shown. Prefers the typewriter entrance. */
J.register('layout', 'zrRpgWindow', {
  name: 'RPGの窓', tags: ['pop', 'graphic'], w: 0.8, treat: 'safe', ae: 'labels', fits: n => n >= 1 && n <= 30,
  enterBias: { type: 2.6, cut: 1.4, flicker: 1.1, slice: 0.3, assemble: 0.3, drop: 0.3, spin: 0.2, zoom: 0.3 },
  plan(rng, cut, st) {
    const pix = hasFont('dot') && rng.chance(0.75);
    return { font: pix ? 'dot' : rng.pick(fontsOf(st, ['display', 'body'])), pos: rng.pick(['low', 'low', 'mid']),
      frame: rng.pick(['double', 'notch']), tag: rng.chance(0.55), cursor: rng.pick(['bob', 'bob', 'blink']) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, P = env.cut.params, M = Math.min(W, H), u = M / 1080;
    const text = String(env.cut.text || '').trim();
    if (!text) return null;
    const portrait = H > W;
    const winW = W * (portrait ? 0.9 : 0.84), padX = M * 0.06, padY = M * 0.05;
    const body = wrap(text, portrait ? 8 : 14), lines = body.split('\n').length;
    const lw = Math.max(2, 6 * u);
    const size = Math.min(J.fitSize(body, P.font, winW - padX * 2 - lw * 2, M * (lines > 1 ? 0.26 : 0.14), { lead: 1.35, track: 0.04 }), M * 0.095);
    const meas = J.measure({ text: body, font: P.font, size, lead: 1.35, track: 0.04 });
    const winH = Math.max(meas.h + padY * 2, M * 0.2);
    const x0 = (W - winW) / 2;
    const cy = P.pos === 'mid' ? H * 0.5 : H - MG(env) - winH / 2 - M * 0.02;
    const k = E.outExpo(J.clamp(env.lt / 0.22)) * outK(env);           // the window opens from its middle line
    if (k <= 0.002) return null;
    const hh = winH * k, yy = cy - hh / 2;
    const plate = dark(env) ? J.mix(sc.bg, '#000000', 0.5) : sc.fg;   // dark plate in every scheme
    const ink = dark(env) ? sc.fg : sc.bg;                              // text + frame
    const c = P.frame === 'notch' ? 9 * u : 0;
    const pts = (x, y, w, h, cc) => cc > 0
      ? [[x + cc, y], [x + w - cc, y], [x + w, y + cc], [x + w, y + h - cc], [x + w - cc, y + h], [x + cc, y + h], [x, y + h - cc], [x, y + cc]]
      : [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    const loop = a => a.concat([a[0]]);
    env.poly(pts(x0 + 10 * u, yy + 10 * u, winW, hh, c), '#000000', 0.35, false);     // hard pixel shadow
    env.poly(pts(x0, yy, winW, hh, c), plate, 0.94, false);
    if (hh > lw * 6) {
      env.line(loop(pts(x0 + lw, yy + lw, winW - 2 * lw, hh - 2 * lw, c)), ink, lw, 1, false);
      if (P.frame === 'double') env.line(loop(pts(x0 + lw * 2.7, yy + lw * 2.7, winW - 5.4 * lw, hh - 5.4 * lw, 0)), ink, Math.max(1, lw * 0.4), 0.8, false);
    }
    ctx.save(); ctx.beginPath(); ctx.rect(x0, yy, winW, hh); ctx.clip();
    const bb = J.mainDraw(env, { text: body, font: P.font, size, x: x0 + padX + lw, y: cy, align: 'left', lead: 1.35, track: 0.04, color: ink });
    ctx.restore();
    let tagBB = null;
    if (P.tag && k > 0.95) {                                            // speaker tag on the top edge
      const q = inE(env, 0.2, 0.18) * outK(env), ts = Math.max(14 * u, size * 0.55), tw = ts * 2.6, th = ts * 1.7;
      const tx = x0 + M * 0.035, ty = yy - th * 0.62;
      if (q > 0) {
        env.poly(pts(tx, ty, tw, th, c * 0.6), plate, q, false);
        env.line(loop(pts(tx + lw * 0.6, ty + lw * 0.6, tw - lw * 1.2, th - lw * 1.2, c * 0.6)), ink, Math.max(1.5, lw * 0.6), q, false);
        env.draw({ text: '♪', font: P.font, size: ts, x: tx + tw / 2, y: ty + th / 2, color: ink, alpha: q, ghost: false });
        tagBB = box(tx, ty, tx + tw, ty + th);
      }
    }
    const shownAt = (env.cut.inDur || 0.3) + 0.12;                     // ▼ once the line has finished appearing
    if (env.lt > shownAt && k > 0.95 && env.pOut < 0.05) {
      const blink = P.cursor === 'blink' ? Math.floor((env.ltb - shownAt) * 2.4) % 2 === 0 : true;
      const bob = P.cursor === 'bob' ? Math.abs(Math.sin((env.ltb - shownAt) * 5)) * 6 * u : 0;
      if (blink) {
        const s2 = Math.max(10 * u, size * 0.32), cx = x0 + winW - padX * 0.75, cyy = yy + hh - padY * 0.62 + bob;
        env.poly([[cx - s2, cyy - s2 * 0.6], [cx + s2, cyy - s2 * 0.6], [cx, cyy + s2 * 0.6]], ink, 1, false);
      }
    }
    return union(union(bb, box(x0, yy, x0 + winW, yy + hh)), tagBB);
  },
}, 'zr_retro');

/* ======================================================================= サイバーパンク — ネオン看板 (decor)
   a vertical neon sign at the screen edge, its tubes spelling a few characters of the lyric line (kanji first):
   the frame and each character stutter on, then hum with the odd flicker. Stays clear of the lyric. */
const NEON_STOCK = ['夜光', '電脳', '深夜営業', '未来', '開店中', '回線'];
J.register('decor', 'zrNeonSign', {
  name: 'ネオン看板', tags: ['glitch', 'graphic', 'emotional'], w: 0.7, layer: 'front', ae: 'bars',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const o = outK(env);
    if (o <= 0.003 || env.lt < 0 || !bb0) return;                    // wait for the lyric's real box (else it pops away)
    const bb = bb0, { W, H, sc, ctx } = env, M = Math.min(W, H), u = M / 1080, m = MG(env);
    const src = slots(env.cut.lineText || env.cut.text).filter(ch => !J.isPunct(ch) && !J.isLatin(ch) && ch !== '♪');
    const kan = src.filter(ch => J.isKanji(ch));
    let chars = P.v % 3 === 2 || src.length < 2 ? [...NEON_STOCK[(P.seed >>> 0) % NEON_STOCK.length]] : (kan.length >= 2 ? kan : src).slice(0, 2 + (P.n | 0) % 3);
    chars = chars.slice(0, 4);
    let cs = J.clamp(M * 0.075, 34 * u, 96 * u);
    const len = n => cs * (n * 1.12 + 0.9), gap = 18 * u;
    if (len(chars.length) > H - 2 * m) cs *= (H - 2 * m) / len(chars.length);
    // a tall sign at the left / right edge; when the lyric is in the way there, a wide one above / below it
    let vert = true, sw = cs * 1.6, sh = len(chars.length), x, y;
    const clearX = xx => xx + sw < bb.x0 - gap || xx > bb.x1 + gap;
    x = P.right ? W - m - sw : m;
    if (!clearX(x)) x = P.right ? m : W - m - sw;
    if (clearX(x)) y = P.low ? H - m - sh : P.corner ? m : (H - sh) / 2;
    else {
      vert = false; sw = len(chars.length); sh = cs * 1.6;
      if (sw > W - 2 * m) return;
      const top = bb.y0 - gap - sh >= m, bottom = bb.y1 + gap + sh <= H - m;
      if (!top && !bottom) return;
      y = (P.low && bottom) || !top ? H - m - sh : m;
      x = P.corner ? (P.right ? W - m - sw : m) : (W - sw) / 2;
    }
    const neon = P.accent ? sc.accent2 : sc.accent, neon2 = P.accent ? sc.accent : sc.accent2;
    const core = J.mix(neon, '#FFFFFF', 0.55);
    const on = (t0, salt) => {                                         // stutter on, then the odd flicker
      const q = env.lt - t0;
      if (q < 0) return 0;
      if (q < 0.28) return J.r(P.seed, salt, env.step) < 0.55 ? 0.15 : 1;
      return J.r(P.seed, salt, env.step, 7) < 0.03 ? 0.3 : 1;
    };
    ctx.save();
    ctx.globalAlpha = o;
    rrPath(ctx, x, y, sw, sh, cs * 0.22);
    ctx.fillStyle = J.rgba(J.mix(sc.bg, '#000000', 0.55), 0.88); ctx.fill();
    const fa = on(0.05, 99);
    if (fa > 0) {                                                       // the frame tube
      ctx.globalAlpha = o * fa;
      ctx.shadowColor = neon2; ctx.shadowBlur = cs * 0.35 * env.scale;
      rrPath(ctx, x + cs * 0.12, y + cs * 0.12, sw - cs * 0.24, sh - cs * 0.24, cs * 0.16);
      ctx.strokeStyle = neon2; ctx.lineWidth = Math.max(2, cs * 0.05); ctx.stroke();
    }
    ctx.restore();
    const font = hasFont('gothic_bold') ? 'gothic_bold' : J.fontsOf(env.st, ['display'])[0];
    chars.forEach((ch, i) => {
      const a = on(0.16 + i * 0.11, i) * o;
      if (a <= 0) return;
      const along = cs * 0.45 + cs * 1.12 * (i + 0.5);
      const cx = vert ? x + sw / 2 : x + along, cyy = vert ? y + along + cs * 0.05 : y + sh / 2;
      env.draw({ text: ch, font, size: cs, x: cx, y: cyy, fill: false, stroke: Math.max(2, cs * 0.075), strokeColor: neon, alpha: a,
        shadow: { color: neon, blur: cs * 0.5, dx: 0, dy: 0 }, ghost: false });
      env.draw({ text: ch, font, size: cs, x: cx, y: cyy, fill: false, stroke: Math.max(1, cs * 0.025), strokeColor: core, alpha: a, ghost: false });
    });
  },
}, 'zr_cyber');

/* ======================================================================= Y2K — Y2Kウィンドウ (decor)
   a glossy late-90s desktop window opens behind the lyric: gradient title bar with a file name, three bubble
   buttons, a bevelled translucent body, sparkles at the corners and (sometimes) a striped loading bar. */
J.register('decor', 'zrY2kWindow', {
  name: 'Y2Kウィンドウ', tags: ['pop', 'graphic'], w: 0.7, layer: 'back', ae: 'brackets',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const o = outK(env), q = J.clamp(E.outBack(J.clamp(env.lt / 0.34), 1.6), 0, 1.2);
    if (o * Math.min(1, q) <= 0.003 || env.lt < 0) return;
    const bb = J.centerBB(env, bb0), { W, H, sc, ctx } = env, M = Math.min(W, H), u = M / 1080, m = MG(env) * 0.6;
    const pad = M * 0.05, barH = M * 0.058;
    const x0 = Math.max(m, bb.x0 - pad), x1 = Math.min(W - m, bb.x1 + pad);
    const y0 = Math.max(m, bb.y0 - pad - barH), y1 = Math.min(H - m, bb.y1 + pad);
    const w = x1 - x0, h = y1 - y0, r = M * 0.02;
    if (w < M * 0.15 || h < barH * 2) return;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, s = 0.86 + 0.14 * q;
    const g2 = sc.grad && sc.grad.length >= 2 ? sc.grad : [sc.accent, sc.accent2];
    const lite = J.mix(sc.bg, '#FFFFFF', dark(env) ? 0.14 : 0.55), deep = J.mix(sc.bg, '#000000', 0.25);
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
    ctx.globalAlpha = o * J.clamp(q * 1.4);
    rrPath(ctx, x0 + M * 0.012, y0 + M * 0.014, w, h, r);              // soft drop shadow: reads as a window on light schemes
    ctx.fillStyle = J.rgba(J.mix(sc.bg, '#000000', 0.6), dark(env) ? 0.35 : 0.16); ctx.fill();
    rrPath(ctx, x0, y0, w, h, r);                                       // body: translucent, bevelled
    ctx.fillStyle = J.rgba(J.mix(sc.bg, sc.fg, dark(env) ? 0.1 : 0.05), 0.92); ctx.fill();
    ctx.save(); ctx.clip();
    const tg = ctx.createLinearGradient(x0, y0, x1, y0); tg.addColorStop(0, g2[0]); tg.addColorStop(1, g2[1]);
    ctx.fillStyle = tg; ctx.fillRect(x0, y0, w, barH);                 // title bar
    const gl = ctx.createLinearGradient(0, y0, 0, y0 + barH); gl.addColorStop(0, 'rgba(255,255,255,0.45)'); gl.addColorStop(0.5, 'rgba(255,255,255,0.08)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(x0, y0, w, barH);                 // glossy highlight
    ctx.restore();
    ctx.lineWidth = Math.max(1.5, 2.5 * u);
    rrPath(ctx, x0, y0, w, h, r); ctx.strokeStyle = J.mix(sc.bg, sc.fg, 0.35); ctx.stroke();
    rrPath(ctx, x0 + 2.5 * u, y0 + 2.5 * u, w - 5 * u, h - 5 * u, r * 0.8); ctx.strokeStyle = J.rgba(lite, 0.7); ctx.lineWidth = Math.max(1, 1.5 * u); ctx.stroke();
    ctx.restore();
    const a = o * J.clamp(q * 1.4), barTxt = J.lum(J.mix(g2[0], g2[1], 0.3)) > 0.55 ? '#000000' : '#FFFFFF';
    const fs = Math.max(12 * u, barH * 0.42);
    const name = (J.romaji(String(env.cut.text || '').replace(/\s+/g, '')) || 'lyric').toLowerCase().replace(/[^a-z]/g, '').slice(0, 14) || 'lyric';
    const font = J.fontsOf(env.st, ['mono'])[0];
    env.draw({ text: name + (P.v % 2 ? '.mp3' : '.wav'), font, size: fs, x: x0 + barH * 0.45, y: y0 + barH / 2, align: 'left', color: barTxt, alpha: a * s, ghost: false });
    for (let i = 0; i < 3; i++) {                                       // bubble buttons
      const bx = x1 - barH * (0.55 + i * 0.72), br = barH * 0.24;
      env.circle(bx, y0 + barH / 2, br, J.mix(sc.bg, '#FFFFFF', 0.82), J.mix(sc.bg, '#000000', 0.3), Math.max(1, 1.2 * u), a, false);
    }
    if (P.v % 2 === 0) {                                                // loading bar under the window
      const lh = M * 0.022, ly = Math.min(H - m - lh, y1 + M * 0.025), lw = w * 0.62, lx = cx - lw / 2;
      const prog = J.clamp(env.lt / Math.max(0.5, env.cut.dur * 0.85));
      env.rrect(lx, ly, lw, lh, lh / 2, J.mix(sc.bg, sc.fg, 0.12), a, false, J.mix(sc.bg, sc.fg, 0.35), Math.max(1, 1.2 * u));
      const segs = Math.floor(prog * 14);
      for (let i = 0; i < segs; i++) env.rrect(lx + lh * 0.25 + i * (lw - lh * 0.5) / 14, ly + lh * 0.2, (lw - lh * 0.5) / 14 - 3 * u, lh * 0.6, lh * 0.2, sc.accent2, a, false);
    }
    const tw = (P.n | 0) + 1;                                           // sparkles ✦ near the corners
    const corners = [[x0, y0], [x1, y1], [x1, y0], [x0, y1]];
    for (let i = 0; i < Math.min(3, tw + 1); i++) {
      const [sx, sy] = corners[i], ph = env.ltb * 3 + i * 2.1, k2 = (0.6 + 0.4 * Math.sin(ph)) * J.clamp((env.lt - 0.2 - i * 0.1) / 0.3) * o;
      if (k2 <= 0) continue;
      const R = M * 0.028 * k2, rr = R * 0.22, col = i % 2 ? sc.accent : sc.accent2;
      env.poly([[sx, sy - R], [sx + rr, sy - rr], [sx + R, sy], [sx + rr, sy + rr], [sx, sy + R], [sx - rr, sy + rr], [sx - R, sy], [sx - rr, sy - rr]], col, k2, false);
    }
  },
}, 'zr_y2k');

/* ======================================================================= グラスモーフィズム — すりガラス (layout)
   soft coloured light orbs drift behind a frosted-glass card: inside the card they are blurred (when filters are
   allowed), the card has a hairline white edge and a top highlight, and the lyric sits on it. */
J.register('layout', 'zrGlassCard', {
  name: 'すりガラス', tags: ['calm', 'emotional', 'editorial', 'pop'], w: 0.8, treat: 'safe', ae: 'pill', fits: n => n >= 1 && n <= 24,
  enterBias: { blur: 2, wipe: 1.3, type: 1.1, cut: 1.1, slice: 0.3, assemble: 0.4, spin: 0.2, drop: 0.4, scramble: 0.3 },
  plan(rng, cut, st) {
    return { font: rng.pick(fontsOf(st, ['display', 'body'])), orbs: rng.int(3, 4), ph: rng.range(0, 6.28), off: rng.pick([0, 0, -1, 1]),
      chip: rng.chance(0.5), rad: rng.range(0.03, 0.055) };
  },
  render(env) {
    const { W, H, sc, ctx } = env, P = env.cut.params, M = Math.min(W, H), u = M / 1080;
    const text = String(env.cut.text || '').trim();
    if (!text) return null;
    const portrait = H > W;
    const body = wrap(text, portrait ? 7 : 12);
    const size = Math.min(J.fitSize(body, P.font, W * (portrait ? 0.68 : 0.6), M * 0.26, { lead: 1.3, track: 0.03 }), M * 0.12);
    const meas = J.measure({ text: body, font: P.font, size, lead: 1.3, track: 0.03 });
    const cw = meas.w + M * 0.16, ch = meas.h + M * 0.13;
    const cx = W / 2 + (portrait ? 0 : P.off * W * 0.06), cy = H / 2;
    const k = inE(env, 0.5) * outK(env), s = 0.965 + 0.035 * k;
    const cols = [sc.accent, sc.accent2, sc.sub, sc.ghostA || sc.accent];
    const orbs = [];
    for (let i = 0; i < P.orbs; i++) {
      const ang = P.ph + i * J.TAU / P.orbs + 0.35 * Math.sin(env.ltb * 0.35 + i * 1.7);
      const dist = Math.max(cw, ch) * (0.38 + 0.12 * J.r(env.cut.seed, i, 5));
      orbs.push({ x: cx + Math.cos(ang) * dist * 1.1, y: cy + Math.sin(ang) * dist * 0.75, r: M * (0.17 + 0.1 * J.r(env.cut.seed, i, 6)), c: cols[i % cols.length] });
    }
    const drawOrbs = (mul) => {
      for (const b of orbs) {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, J.rgba(b.c, 0.85 * mul)); g.addColorStop(0.55, J.rgba(b.c, 0.35 * mul)); g.addColorStop(1, J.rgba(b.c, 0));
        ctx.fillStyle = g; ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      }
    };
    const x0 = cx - cw * s / 2, y0 = cy - ch * s / 2, R = M * P.rad;
    if (env.pass === 'main') {
      const oa = J.clamp(env.lt / 0.6) * outK(env);
      ctx.save(); drawOrbs(oa); ctx.restore();
      if (k > 0.002) {
        ctx.save();
        rrPath(ctx, x0, y0, cw * s, ch * s, R); ctx.clip();
        if (env.allowFilter) { ctx.filter = `blur(${Math.max(1, M * 0.03 * env.scale).toFixed(1)}px)`; drawOrbs(oa * 1.1); ctx.filter = 'none'; }
        ctx.globalAlpha = k;
        ctx.fillStyle = dark(env) ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.38)'; ctx.fillRect(x0, y0, cw * s, ch * s);
        const hl = ctx.createLinearGradient(0, y0, 0, y0 + ch * s * 0.6); hl.addColorStop(0, 'rgba(255,255,255,0.22)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = hl; ctx.fillRect(x0, y0, cw * s, ch * s);
        ctx.restore();
        ctx.save(); ctx.globalAlpha = k;
        rrPath(ctx, x0, y0, cw * s, ch * s, R); ctx.strokeStyle = dark(env) ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1, 1.6 * u); ctx.stroke();
        ctx.restore();
      }
    }
    let chipBB = null;
    if (P.chip && k > 0.5) {
      const fs = Math.max(12 * u, M * 0.02), lab = '♪ now playing', font = J.fontsOf(env.st, ['mono'])[0];
      const mw = J.measure({ text: lab, font, size: fs, track: 0.08 }).w, px = x0 + M * 0.035, py = y0 + M * 0.04, q = inE(env, 0.3, 0.25) * outK(env);
      env.rrect(px, py - fs * 0.9, mw + fs * 1.6, fs * 1.8, fs * 0.9, dark(env) ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.5)', q, false);
      env.draw({ text: lab, font, size: fs, track: 0.08, x: px + fs * 0.8, y: py, align: 'left', color: sc.fg, alpha: q * 0.85, ghost: false });
      chipBB = box(px, py - fs, px + mw + fs * 1.6, py + fs);
    }
    const bb = J.mainDraw(env, { text: body, font: P.font, size, x: cx, y: cy + (P.chip ? M * 0.012 : 0), lead: 1.3, track: 0.03, color: sc.fg });
    return union(union(bb, box(x0, y0, x0 + cw * s, y0 + ch * s)), chipBB);
  },
}, 'zr_glass');

/* ======================================================================= styles (配色セット) */
const ENT = { cut: 1.1 }, EXI = { cut: 1.1 };
const S = {
  zrRetro: {
    name: 'ドット8bit', desc: '濃紺と原色・ドット文字・走査線（レトロゲーム）', moods: ['pop', 'graphic', 'glitch'], pack: 'zr_retro',
    schemes: [
      { bg: '#101034', fg: '#FFFFFF', sub: '#A8B4FF', accent: '#FCD000', accent2: '#3CBCFC', ink: '#E4004C', dim: '#1C1C4C', ghostA: '#E4004C', ghostB: '#3CBCFC' },
      { bg: '#0F380F', fg: '#9BBC0F', sub: '#8BAC0F', accent: '#CADC9F', accent2: '#8BAC0F', ink: '#306230', dim: '#1A4A1A', ghostA: '#306230', ghostB: '#8BAC0F' },
      { bg: '#000000', fg: '#FCFCFC', sub: '#BCBCBC', accent: '#F83800', accent2: '#00B800', ink: '#F83800', dim: '#141414', ghostA: '#F83800', ghostB: '#0078F8' },
    ],
    fonts: { display: ['dot', 'zenkaku'], serif: ['dot'], body: ['dot'], mono: ['dot', 'mono'] },
    texture: { grain: 0.1, paper: 0, scan: 0.7 }, ghost: 0.35,
    bias: { layout: { zrRpgWindow: 3, tile: 1.2, center: 1.1, huge: 1.1 }, enter: Object.assign({}, ENT, { type: 1.8, flicker: 1.3, cut: 1.4, blur: 0.3 }), exit: Object.assign({}, EXI, { cut: 1.5, blur: 0.3 }),
      bg: { checker: 1.3, retroGrid: 0.8 }, fx: {} },
    decor: { counter: 0.8, dots: 1 }, hud: false, glow: 0.4,
  },
  zrCyber: {
    name: 'ネオン・サイバー', desc: '黒と蛍光マゼンタ/シアン・発光・看板（サイバーパンク）', moods: ['glitch', 'graphic', 'emotional'], pack: 'zr_cyber',
    schemes: [
      { bg: '#07060F', fg: '#F2F7FF', sub: '#7A86B8', accent: '#FF2A6D', accent2: '#05D9E8', ink: '#05D9E8', dim: '#15132A', ghostA: '#FF2A6D', ghostB: '#05D9E8', grad: ['#FF2A6D', '#05D9E8'] },
      { bg: '#0A0F14', fg: '#E8FFF6', sub: '#6B8A86', accent: '#F9F002', accent2: '#00FF9F', ink: '#00FF9F', dim: '#14202A', ghostA: '#F9F002', ghostB: '#00B8FF', grad: ['#F9F002', '#00FF9F'] },
      { bg: '#12071F', fg: '#FFE9FB', sub: '#9C7BB8', accent: '#C34BFF', accent2: '#FF3864', ink: '#FF3864', dim: '#1E0F33', ghostA: '#C34BFF', ghostB: '#2DE2E6', grad: ['#C34BFF', '#FF3864'] },
    ],
    fonts: { display: ['gothic_black', 'zenkaku', 'dela'], serif: ['mincho_black'], body: ['gothic_med'], mono: ['mono'] },
    texture: { grain: 0.35, paper: 0, scan: 0.35 }, ghost: 1.1, glitchBoost: 1.2,
    bias: { layout: { huge: 1.3, condensed: 1.3, vcols: 1.2, diag: 1.1 }, enter: Object.assign({}, ENT, { slice: 1.4, flicker: 1.4, scramble: 1.3 }), exit: Object.assign({}, EXI, { glitch: 1.5, slice: 1.3 }), bg: {}, fx: {} },
    decor: { zrNeonSign: 2.2, barcode: 1, bars: 0.8 }, hud: true, glow: 1.5,
  },
  zrY2k: {
    name: 'Y2Kクローム', desc: '銀とパステル・光沢・ウィンドウ（Y2K）', moods: ['pop', 'graphic'], pack: 'zr_y2k',
    schemes: [
      { bg: '#E4E8F2', fg: '#1B1F3B', sub: '#5A6187', accent: '#7B5CFF', accent2: '#00B4F0', ink: '#FF4FA3', dim: '#D3D8E6', ghostA: '#FF4FA3', ghostB: '#00B4F0', grad: ['#9AA6FF', '#7FE7FF'] },
      { bg: '#101426', fg: '#EAF2FF', sub: '#8E9AC4', accent: '#B4FF39', accent2: '#FF4FD8', ink: '#FF4FD8', dim: '#1A2038', ghostA: '#FF4FD8', ghostB: '#39D0FF', grad: ['#C0C8E0', '#6A7AB0'] },
      { bg: '#FFD6F0', fg: '#2A1A4A', sub: '#7A5A9A', accent: '#2A6BFF', accent2: '#FF3FA4', ink: '#2A1A4A', dim: '#F7C4E6', ghostA: '#2A6BFF', ghostB: '#FF3FA4', grad: ['#FF8FD0', '#8FB6FF'] },
    ],
    fonts: { display: ['rampart', 'zenkaku', 'round'], serif: ['round'], body: ['round', 'gothic_med'], mono: ['mono'] },
    texture: { grain: 0.15, paper: 0, scan: 0.1 }, ghost: 0.6, useGrad: true,
    bias: { layout: { pill: 1.4, mixed: 1.2, wave: 1.2 }, enter: Object.assign({}, ENT, { pop: 1.5, zoom: 1.3 }), exit: Object.assign({}, EXI, { shrink: 1.3, scatter: 1.1 }), bg: { checker: 1.1 }, fx: {} },
    decor: { zrY2kWindow: 2.4, sparks: 1, shapes: 0.8 }, hud: false, glow: 0.8,
  },
  zrGlass: {
    name: 'グラス', desc: '深い青紫と光の玉・すりガラス（グラスモーフィズム）', moods: ['calm', 'emotional', 'editorial'], pack: 'zr_glass',
    schemes: [
      { bg: '#1B1340', fg: '#FFFFFF', sub: '#C9C3F0', accent: '#7FD8FF', accent2: '#FF9AD5', ink: '#FFFFFF', dim: '#251B55', ghostA: '#7FD8FF', ghostB: '#FF9AD5', grad: ['#7FD8FF', '#FF9AD5'] },
      { bg: '#0E2A3A', fg: '#F2FBFF', sub: '#A9CAD8', accent: '#5CF2C8', accent2: '#5C8CFF', ink: '#F2FBFF', dim: '#143648', ghostA: '#5CF2C8', ghostB: '#5C8CFF', grad: ['#5CF2C8', '#5C8CFF'] },
      { bg: '#DDE5F6', fg: '#1E2240', sub: '#55608A', accent: '#6C7BFF', accent2: '#FF7EB3', ink: '#1E2240', dim: '#CCD6EC', ghostA: '#6C7BFF', ghostB: '#FF7EB3', grad: ['#6C7BFF', '#FF7EB3'] },
    ],
    fonts: { display: ['gothic_bold', 'round', 'gothic_med'], serif: ['mincho'], body: ['gothic_light', 'gothic_med'], mono: ['mono'] },
    texture: { grain: 0.12, paper: 0, scan: 0 }, ghost: 0.3,
    bias: { layout: { zrGlassCard: 3, center: 1.2, stack: 1.1 }, enter: Object.assign({}, ENT, { blur: 1.8, wipe: 1.2, type: 1.1 }), exit: Object.assign({}, EXI, { blur: 1.8, drift: 1.2 }), bg: {}, fx: {} },
    decor: { rings: 0.8, leaders: 0.6 }, hud: false, glow: 1,
  },
};
for (const [k, v] of Object.entries(S)) {
  if (J.STYLES[k]) continue;
  J.STYLES[k] = v;
  if (!J.STYLE_ORDER.includes(k)) J.STYLE_ORDER.push(k);
}

/* ======================================================================= おまかせのテーマ
   a theme with `pack` keeps that pack's parts and style in (J.omakase) and turns 追加分 on */
if (J.THEMES) {
  Object.assign(J.THEMES, {
    zrRetro: { name: 'レトロゲーム', moods: ['pop', 'graphic', 'glitch'], pack: 'zr_retro' },
    zrCyber: { name: 'サイバーパンク', moods: ['glitch', 'graphic', 'emotional'], pack: 'zr_cyber' },
    zrY2k:   { name: 'Y2K', moods: ['pop', 'graphic'], pack: 'zr_y2k' },
    zrGlass: { name: 'グラスモーフィズム', moods: ['calm', 'emotional', 'editorial'], pack: 'zr_glass' },
  });
  for (const k of ['zrRetro', 'zrCyber', 'zrY2k', 'zrGlass']) if (!J.THEME_ORDER.includes(k)) J.THEME_ORDER.push(k);
}
})();
