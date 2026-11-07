/* ============================================================
   JIZURA — MIDI: Standard MIDI File → note-on times (seconds)
   ============================================================ */
(() => {
'use strict';

/* parse a Standard MIDI File (format 0 / 1 / 2). Times come from the file's own tempo map
   (Set Tempo events; 120 BPM until the first one) or from SMPTE timing. Throws on files it cannot read. */
J.parseMidi = (buf) => {
  const d = new DataView(buf), N = buf.byteLength;
  const tag = o => (o + 4 <= N ? String.fromCharCode(d.getUint8(o), d.getUint8(o + 1), d.getUint8(o + 2), d.getUint8(o + 3)) : '');
  if (N < 14 || tag(0) !== 'MThd') throw new Error('not a MIDI file');
  const hlen = d.getUint32(4), format = d.getUint16(8), ntrk = d.getUint16(10), div = d.getUint16(12);
  const tempos = [], notes = [];
  let p = 8 + hlen, tr = 0;
  while (tr < ntrk && p + 8 <= N) {
    const len = d.getUint32(p + 4);
    if (tag(p) !== 'MTrk') { p += 8 + len; continue; }                       // unknown chunk: skip
    let q = p + 8, tick = 0, run = 0;
    const end = Math.min(N, q + len);
    p = q + len;
    const vlq = () => {
      let v = 0, b, n = 0;
      do { if (q >= end) throw new Error('truncated track'); b = d.getUint8(q++); v = v * 128 + (b & 0x7f); } while ((b & 0x80) && ++n < 4);
      return v;
    };
    while (q < end) {
      tick += vlq();
      if (q >= end) break;
      let st = d.getUint8(q);
      if (st & 0x80) { q++; if (st < 0xf0) run = st; else if (st < 0xff) run = 0; }
      else { if (!run) throw new Error('bad running status'); st = run; }
      if (st === 0xff) {                                                      // meta event
        if (q >= end) break;
        const type = d.getUint8(q++), l = vlq();
        if (type === 0x51 && l >= 3 && q + 3 <= end) {
          const us = (d.getUint8(q) << 16) | (d.getUint8(q + 1) << 8) | d.getUint8(q + 2);
          if (us > 0) tempos.push({ tick, us });
        }
        if (type === 0x2f) break;                                             // end of track
        q += l;
      } else if (st === 0xf0 || st === 0xf7) {                                // sysex
        const l = vlq(); q += l;                                              // (not `q += vlq()`: that reads q before vlq moves it)
      } else {                                                                // channel message
        const hi = st & 0xf0, a = d.getUint8(q++), b = hi === 0xc0 || hi === 0xd0 ? 0 : d.getUint8(q++);
        if (hi === 0x90 && b > 0) notes.push({ tick, key: a, vel: b, ch: st & 15, track: tr });   // note-on (velocity 0 = note-off)
      }
    }
    tr++;
  }
  if (!tr) throw new Error('no tracks');
  // ticks → seconds
  let toSec;
  if (div & 0x8000) {                                                         // SMPTE: frames per second × ticks per frame
    const fps = 256 - (div >> 8), tpf = div & 0xff;
    const rate = (fps === 29 ? 29.97 : fps) * (tpf || 1);
    toSec = tick => tick / rate;
  } else {
    const ppq = div || 480;
    tempos.sort((x, y) => x.tick - y.tick);
    toSec = tick => {
      let sec = 0, last = 0, us = 500000;
      for (const t of tempos) { if (t.tick >= tick) break; sec += (t.tick - last) * us / ppq / 1e6; last = t.tick; us = t.us; }
      return sec + (tick - last) * us / ppq / 1e6;
    };
  }
  const out = notes.map(n => ({ t: toSec(n.tick), key: n.key, vel: n.vel, ch: n.ch, track: n.track })).sort((x, y) => x.t - y.t);
  const t0 = tempos.find(t => t.tick === 0) || tempos[0];
  const bpm = div & 0x8000 ? 0 : +(60e6 / (t0 ? t0.us : 500000)).toFixed(2);
  return { format, tracks: tr, notes: out, bpm, tempoChanges: new Set(tempos.map(t => t.us)).size > 1 };
};

/* notes → cue times: notes that start together (a chord, or within `gap` seconds of the first one) count once */
J.midiCues = (notes, gap = 0.04) => {
  const cues = [];
  for (const n of notes) if (!cues.length || n.t - cues[cues.length - 1] > gap) cues.push(n.t);
  return cues;
};

})();
