/* ═══════════════════════════════════════════════════════════════
   Modular Block City · comportamientos (port a TypeScript de js/block-city.js)
   enter · rollTo · bindTilt · cursor · scene · obra
   Los toasts viven en composables/useToast.ts + components/ui/ToastHost.vue.
   ═══════════════════════════════════════════════════════════════ */

export const EASE = 'cubic-bezier(.22, 1, .36, 1)'
const NS = 'http://www.w3.org/2000/svg'

// Sin matchMedia (tests con jsdom) se comporta como un equipo táctil con movimiento reducido
const mq = (q: string): MediaQueryList =>
  typeof matchMedia === 'function'
    ? matchMedia(q)
    : ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList)
const mqReduce = mq('(prefers-reduced-motion: reduce)')
const mqFine = mq('(hover: hover) and (pointer: fine)')
export const reduced = () => mqReduce.matches
const D = (ms: number) => (reduced() ? Math.min(ms, 150) : ms) // duración (tope 150 ms en reducido)
const ST = (ms: number) => (reduced() ? 0 : ms) // retraso / cascada
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s)
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)]
const clamp = (v: number, a = -1, b = 1) => Math.max(a, Math.min(b, v))

interface AnimOpts { duration?: number; delay?: number; fill?: FillMode }
export function anim(el: Element | null, kf: Keyframe[], o: AnimOpts = {}) {
  if (!el || !('animate' in el)) return null
  return el.animate(kf, { duration: D(o.duration ?? 500), delay: ST(o.delay ?? 0), easing: EASE, fill: o.fill ?? 'backwards' })
}

/* ── Entrada en cascada (stagger 180 ms, tope 8 pasos) ─────── */
export function enter(root: ParentNode = document, { stagger = 180, max = 8 } = {}) {
  $$('[data-enter]', root)
    .filter((el) => el.offsetParent !== null && !el.dataset.entered)
    .forEach((el, i) => {
      el.dataset.entered = '1'
      anim(el, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: Math.min(i, max) * stagger })
    })
}

/* ── Contador que rueda: si sube, el nuevo entra desde arriba ─ */
export function rollTo(el: HTMLElement | null, val: number | string) {
  if (!el) return
  const v = String(val)
  const prev = el.dataset.v
  if (prev === v) return
  el.dataset.v = v
  const old = el.querySelector('.r-cur')
  const nu = document.createElement('span')
  nu.className = 'r-cur'
  nu.textContent = v
  if (prev === undefined || !old) { el.textContent = ''; el.append(nu); return }
  old.classList.remove('r-cur')
  el.append(nu)
  const d = parseFloat(v) >= parseFloat(prev) ? -100 : 100
  anim(nu, [{ transform: `translateY(${d}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 350 })
  const a = anim(old, [{ transform: 'none', opacity: 1 }, { transform: `translateY(${-d}%)`, opacity: 0 }], { duration: 350, fill: 'forwards' })
  if (a) a.onfinish = () => old.remove()
  else old.remove()
}

/* ── F4 · Cambio de estado: la pieza asienta (scale .97 → 1) ─ */
export function settle(el: Element | null) {
  anim(el, [{ transform: 'scale(.97)' }, { transform: 'none' }], { duration: 400 })
}

/* ── F2 · Bloques magnéticos ──────────────────────────────── */
type TiltEl = HTMLElement & { __sheen?: HTMLElement; __untilt?: () => void }
export function bindTilt(el: TiltEl, { amp = 6 } = {}) {
  if (el.__sheen) return
  const sheen = document.createElement('span')
  sheen.className = 'sheen'
  sheen.setAttribute('aria-hidden', 'true')
  el.append(sheen)
  el.__sheen = sheen
  let rect: DOMRect | null = null
  let raf = 0
  let px = 0
  let py = 0
  const can = (e: PointerEvent) => e.pointerType === 'mouse' && mqFine.matches && !reduced()
  const apply = () => {
    raf = 0
    const mag = Math.min(1, Math.hypot(px, py))
    const sh = Math.min(14, 8 + mag * 6).toFixed(1) // offset 8px → tope 14px
    el.classList.add('is-tilting')
    el.style.transition = 'transform 80ms linear, filter 80ms linear'
    el.style.transform = `perspective(800px) rotateX(${(-py * amp).toFixed(2)}deg) rotateY(${(px * amp).toFixed(2)}deg) translateY(-4px)`
    el.style.filter = `drop-shadow(0 ${sh}px 0 rgba(0,0,0,.09))`
    sheen.style.setProperty('--sx', `${(-px * 22).toFixed(1)}%`) // la luz va al lado opuesto
    sheen.style.setProperty('--sy', `${(-py * 22).toFixed(1)}%`)
    sheen.style.setProperty('--so', (0.35 + 0.45 * mag).toFixed(2))
  }
  const onEnter = (e: PointerEvent) => { if (can(e)) rect = el.getBoundingClientRect() }
  const onMove = (e: PointerEvent) => {
    if (!can(e)) return
    if (!rect) rect = el.getBoundingClientRect()
    px = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1)
    py = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1)
    if (!raf) raf = requestAnimationFrame(apply)
  }
  const onLeave = () => {
    cancelAnimationFrame(raf)
    raf = 0
    rect = null
    if (!el.classList.contains('is-tilting')) return
    el.classList.remove('is-tilting')
    el.style.transition = `transform 500ms ${EASE}, filter 500ms ${EASE}`
    el.style.transform = ''
    el.style.filter = ''
    sheen.style.setProperty('--sx', '0%')
    sheen.style.setProperty('--sy', '0%')
  }
  const onScroll = () => { rect = null }
  el.addEventListener('pointerenter', onEnter)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerleave', onLeave)
  addEventListener('scroll', onScroll, { passive: true })
  el.__untilt = () => {
    cancelAnimationFrame(raf)
    el.removeEventListener('pointerenter', onEnter)
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerleave', onLeave)
    removeEventListener('scroll', onScroll)
  }
}
export function unbindTilt(el: TiltEl) { el.__untilt?.() }

/* ── F5 · Cursor temático + grid de plano ─────────────────── */
const CURSOR_HTML = `
<div id="mbc-cursor" class="is-hidden" data-type="llana" aria-hidden="true">
  <svg class="cur cur-llana" viewBox="0 0 34 34"><path d="M3 3 L19 7.5 L23.5 20 L8 15 Z" fill="#F5E6A3" stroke="#2C2C2C" stroke-width="2.2" stroke-linejoin="round"/><path d="M9 7.5 L18.5 17" stroke="#2C2C2C" stroke-width="1.4" stroke-linecap="round" opacity=".45"/><path d="M21.5 18.5 L25 22" stroke="#2C2C2C" stroke-width="2.2" stroke-linecap="round"/><rect x="24.5" y="19.5" width="6" height="11" rx="3" transform="rotate(-45 27.5 25)" fill="#2C2C2C"/></svg>
  <svg class="cur cur-gancho" viewBox="0 0 34 34"><circle cx="17" cy="6" r="3.6" fill="none" stroke="#2C2C2C" stroke-width="2.4"/><rect x="12" y="9.5" width="10" height="6" rx="2" fill="#F2C4A8" stroke="#2C2C2C" stroke-width="2"/><path d="M17 15.5 V21 a5.5 5.5 0 1 1 -5.5 5.5" fill="none" stroke="#2C2C2C" stroke-width="2.8" stroke-linecap="round"/></svg>
  <svg class="cur cur-nivel" viewBox="0 0 34 34"><rect x="2" y="11" width="30" height="12" rx="4" fill="#C9B8E8" stroke="#2C2C2C" stroke-width="2"/><rect x="10.5" y="14" width="13" height="6" rx="3" fill="#FFFFFF" stroke="#2C2C2C" stroke-width="1.6"/><line x1="17" y1="13.5" x2="17" y2="20.5" stroke="#2C2C2C" stroke-width="1" opacity=".5"/><circle class="cur-bubble" cx="17" cy="17" r="2.2" fill="#B8E8D0" stroke="#2C2C2C" stroke-width="1.2"/></svg>
</div>
<div id="mbc-cursor-dot" class="is-hidden" aria-hidden="true"></div>`

export const cursor = (() => {
  let el: HTMLElement
  let dot: HTMLElement
  let bubble: SVGElement
  let x = 0, y = 0, tx = 0, ty = 0, raf = 0, seen = false, gridRaf = 0, rot = 0, started = false
  const root = document.documentElement
  const enabled = () => mqFine.matches && !reduced()
  const sync = () => root.classList.toggle('has-cursor', enabled())
  const ACTION = 'button, a[href], summary, select, label.chip, label.check, label.foto-pick, [role="button"], [data-cursor="gancho"]'
  const TEXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea'

  function tick() {
    x += (tx - x) * 0.18 // lerp 0.18 = asentamiento
    y += (ty - y) * 0.18
    el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.2 ? requestAnimationFrame(tick) : 0
  }
  function tiltGrid() {
    gridRaf = 0
    $$('.plano-grid').forEach((g) => { if (g.offsetParent !== null) g.style.transform = `rotate(${rot}deg)` })
    bubble.style.transform = `translateX(${(-rot * 2.4).toFixed(2)}px)`
  }
  function onMove(e: PointerEvent) {
    if (e.pointerType !== 'mouse' || !enabled()) return
    tx = e.clientX
    ty = e.clientY
    if (!seen) { x = tx; y = ty; seen = true; el.classList.remove('is-hidden'); dot.classList.remove('is-hidden') }
    dot.style.transform = `translate3d(${tx}px, ${ty}px, 0)`
    const t = e.target instanceof Element ? e.target : null
    let type = 'llana'
    let hidden = false
    if (t) {
      if (t.closest(TEXT)) hidden = true
      else if (t.closest(ACTION)) type = 'gancho'
      else {
        const d = t.closest<HTMLElement>('[data-cursor]')
        if (d?.dataset.cursor) type = d.dataset.cursor
      }
    }
    if (el.dataset.type !== type) el.dataset.type = type
    el.classList.toggle('is-hidden', hidden)
    dot.classList.toggle('is-hidden', hidden)
    if (!raf) raf = requestAnimationFrame(tick)
    const nrot = +(clamp((tx / innerWidth) * 2 - 1) * 1.5).toFixed(2) // máx ±1.5°
    if (nrot !== rot) { rot = nrot; if (!gridRaf) gridRaf = requestAnimationFrame(tiltGrid) }
  }
  return {
    init() {
      if (started) return
      started = true
      document.body.insertAdjacentHTML('beforeend', CURSOR_HTML)
      el = $('#mbc-cursor')!
      dot = $('#mbc-cursor-dot')!
      bubble = $<SVGElement>('.cur-bubble', el)!
      sync()
      mqFine.addEventListener('change', sync)
      mqReduce.addEventListener('change', () => { sync(); if (reduced()) { rot = 0; tiltGrid() } })
      document.addEventListener('pointermove', onMove, { passive: true })
      document.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') el.classList.add('is-down') })
      document.addEventListener('pointerup', () => el.classList.remove('is-down'))
      root.addEventListener('mouseleave', () => { el.classList.add('is-hidden'); dot.classList.add('is-hidden') })
    },
    regrid() { if (started && enabled()) tiltGrid() },
  }
})()

/* ── F3 · Mini-escena de progreso ─────────────────────────────
   host: elemento vacío dentro de un .block de color (usa su --c)
   Devuelve { set(done, total, mode) }  mode: 'all' | 'diff' | 'none' */
export type SceneMode = 'all' | 'diff' | 'none'
export function scene(host: HTMLElement, { blocks: N = 12, cols: COLS = 3, label = 'Progreso' } = {}) {
  const BW = 20, BH = 11, GX = 2, GY = 2, X0 = 34, GROUND = 70
  const pos = (i: number) => { const c = i % COLS, r = Math.floor(i / COLS); return { x: X0 + c * (BW + GX), y: GROUND - (r + 1) * BH - r * GY } }
  let rects = ''
  let ticks = ''
  for (let i = 0; i < N; i++) { const p = pos(i); rects += `<rect class="sc-blk" x="${p.x}" y="${p.y}" width="${BW}" height="${BH}" rx="3"/>` }
  for (let x = 8; x < 116; x += 8) ticks += `<line class="sc-tick" x1="${x}" y1="72" x2="${x - 4}" y2="76"/>`
  host.classList.add('plate')
  host.innerHTML = `<svg viewBox="0 0 120 80" role="img" aria-label="">
    <line class="sc-ground" x1="4" y1="70.5" x2="116" y2="70.5"/>${ticks}${rects}
    <g class="sc-flag"><line x1="0" y1="0" x2="0" y2="-12" stroke="#2C2C2C" stroke-width="1.2"/><path d="M0 -12 L8 -9.5 L0 -7 Z" fill="#F5E6A3" stroke="#2C2C2C" stroke-width="1"/></g>
    <g class="sc-worker"><rect class="sc-body" x="-2.6" y="-9" width="5.2" height="9" rx="1.6"/><circle class="sc-head" cx="0" cy="-11.8" r="2.6"/><path class="sc-hat" d="M-3.3 -12.3 a3.3 3.3 0 0 1 6.6 0 z"/></g>
  </svg>`
  const svg = $<SVGSVGElement>('svg', host)!
  const els = $$<SVGRectElement>('.sc-blk', host)
  const worker = $<SVGGElement>('.sc-worker', host)!
  const flag = $<SVGGElement>('.sc-flag', host)!
  let n = 0
  let frac = 0
  return {
    set(done: number, total: number, mode: SceneMode = 'diff') {
      const f = total ? Math.min(1, done / total) : 0
      const nn = Math.round(f * N)
      const prev = mode === 'all' ? 0 : n
      els.forEach((r, i) => {
        const on = i < nn
        r.classList.toggle('on', on)
        if (on && mode !== 'none' && i >= prev) {
          r.getAnimations().forEach((a) => a.cancel())
          anim(r, [{ transform: 'translateY(-10px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500, delay: (i - prev) * 150 })
        }
      })
      let wx = 18
      let wy = GROUND // la figurita se para sobre el último bloque
      if (nn > 0) { const p = pos(nn - 1); wx = p.x + BW / 2; wy = p.y }
      worker.style.transitionDelay = mode === 'none' ? '0ms' : ST(Math.max(0, nn - prev - 1) * 150) + 'ms'
      worker.style.transform = `translate(${wx}px, ${wy}px)`
      if (f >= 1) { const p = pos(N - 1); flag.style.transform = `translate(${p.x + BW - 3}px, ${p.y}px)` }
      flag.classList.toggle('on', f >= 1)
      if (f >= 1 && frac < 1 && mode !== 'none') {
        host.classList.remove('pulse')
        void host.offsetWidth
        setTimeout(() => host.classList.add('pulse'), ST((nn - prev) * 150 + 200))
      }
      svg.setAttribute('aria-label', `${label}: ${done} de ${total} (${Math.round(f * 100)}%)`)
      n = nn
      frac = f
    },
  }
}

/* ── F1 · Edificio + grúa de fondo ────────────────────────────
   svg: <svg class="obra-bg" aria-hidden="true"> vacío
   Devuelve { set(frac), destroy() }                             */
export function obra(svg: SVGSVGElement, { cols = 8, rows = 10 } = {}) {
  const INK = '#2C2C2C'
  const PAL = ['#B8E8D0', '#C9B8E8', '#F2C4A8', '#BFE0F0']
  const G = { cols, bw: 56, bh: 40, gx: 4, gy: 4, x0: 902, ground: 860, total: cols * rows }
  const PIV = { x: 760, y: 150 }
  const TROLLEY = 470
  const hookPt = { x: 1230, y: 300 }
  const els: (SVGGElement | null)[] = []
  let count = 0, target = 0, ready = false, raf = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  const slot = (i: number) => { const col = i % G.cols, row = Math.floor(i / G.cols); return { col, row, x: G.x0 + col * (G.bw + G.gx), y: G.ground - (row + 1) * G.bh - row * G.gy } }
  const colorOf = (c: number, r: number) => PAL[(c * 3 + r * 2 + (r % 3 === 0 ? 1 : 0)) % 4]
  const zig = (x0: number, x1: number, yT: number, yB: number, s: number) => { let d = `M${x0} ${yB}`, up = true; for (let x = x0 + s; x <= x1; x += s) { d += ` L${x} ${up ? yT : yB}`; up = !up } return d }
  let mast = 'M744 830'
  let left = false
  for (let yy = 796; yy >= 150; yy -= 34) { mast += ` L${left ? 744 : 776} ${yy}`; left = !left }
  const top = G.ground - rows * (G.bh + G.gy)
  const scaffold = Array.from({ length: 5 }, (_, i) => `M884 ${Math.round(G.ground - ((i + 1) * (G.ground - top)) / 5)}H${G.x0 + cols * (G.bw + G.gx) + 2}`).join('')
  const city = ([[40, 600, 90], [150, 680, 70], [240, 540, 110], [380, 650, 80], [480, 720, 60], [1440, 620, 100], [1550, 690, 90]] as const)
    .map(([x, y, w], i) => `<rect x="${x}" y="${y}" width="${w}" height="${860 - y}" rx="10" fill="${PAL[(i + 1) % 4]}" opacity=".55"/>`).join('')
  svg.setAttribute('viewBox', '0 0 1600 900')
  svg.innerHTML = `<g>${city}</g>
    <rect x="-600" y="860" width="2800" height="80" fill="${INK}" opacity=".55"/>
    <g stroke="${INK}" stroke-width="2" fill="none" opacity=".55"><path d="M890 860V${top}M${G.x0 + cols * (G.bw + G.gx) - 2} 860V${top}${scaffold}"/></g>
    <g class="ob-blocks"></g>
    <g>
      <rect x="690" y="846" width="140" height="14" rx="4" fill="#C9B8E8" stroke="${INK}" stroke-width="3"/>
      <path d="M712 846 L744 818 H776 L808 846" fill="none" stroke="${INK}" stroke-width="3"/>
      <path d="M744 830V150M776 830V150" stroke="${INK}" stroke-width="4" fill="none"/>
      <path d="${mast}" stroke="${INK}" stroke-width="2" fill="none"/>
      <rect x="778" y="154" width="42" height="32" rx="7" fill="#BFE0F0" stroke="${INK}" stroke-width="3"/>
      <g class="ob-jib">
        <path d="M760 66 L1398 144 M760 66 L566 144" stroke="${INK}" stroke-width="2" fill="none"/>
        <rect x="560" y="142" width="840" height="16" rx="5" fill="#FFFFFF" stroke="${INK}" stroke-width="3"/>
        <path d="${zig(760, 1400, 144, 156, 20)} ${zig(560, 760, 144, 156, 20)}" stroke="${INK}" stroke-width="1.6" fill="none"/>
        <path d="M744 150 L760 62 L776 150 Z" fill="#F2C4A8" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <rect x="572" y="158" width="26" height="42" rx="5" fill="#C9B8E8" stroke="${INK}" stroke-width="3"/>
        <rect x="602" y="158" width="26" height="42" rx="5" fill="#B8E8D0" stroke="${INK}" stroke-width="3"/>
        <rect x="1219" y="157" width="22" height="10" rx="3" fill="${INK}"/>
      </g>
      <line class="ob-cable" stroke="${INK}" stroke-width="2.5"/>
      <g class="ob-hook"><rect x="-11" y="-2" width="22" height="12" rx="3" fill="${INK}"/><path d="M0 10 v10 a9 9 0 1 1 -9 9" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/></g>
    </g>
    <g class="ob-fly"></g>`
  const blocksL = $<SVGGElement>('.ob-blocks', svg)!
  const flyL = $<SVGGElement>('.ob-fly', svg)!
  const jib = $<SVGGElement>('.ob-jib', svg)!
  const cable = $<SVGLineElement>('.ob-cable', svg)!
  const hook = $<SVGGElement>('.ob-hook', svg)!

  function makeBlock(i: number) {
    const { x, y, col, row } = slot(i)
    const c = colorOf(col, row)
    const g = document.createElementNS(NS, 'g')
    g.innerHTML = `<rect x="${x + 8}" y="${y - 5}" width="14" height="7" rx="3" fill="${c}" stroke="${INK}" stroke-width="2"/>
      <rect x="${x}" y="${y}" width="${G.bw}" height="${G.bh}" rx="8" fill="${c}" stroke="${INK}" stroke-width="2.5"/>
      <rect x="${x + 18}" y="${y + 12}" width="20" height="16" rx="3" fill="${INK}" opacity=".3"/>`
    return g
  }
  /* brazo ±15° en 20 s · gancho sube/baja en 7 s · ambos senoidales */
  function pose(t: number) {
    const still = reduced()
    const th = still ? -0.05 : ((15 * Math.PI) / 180) * Math.sin((t * 2 * Math.PI) / 20000)
    const drop = still ? 110 : 90 + 40 * Math.sin((t * 2 * Math.PI) / 7000)
    jib.setAttribute('transform', `rotate(${((th * 180) / Math.PI).toFixed(3)} ${PIV.x} ${PIV.y})`)
    const tx = PIV.x + TROLLEY * Math.cos(th) - 17 * Math.sin(th)
    const ty = PIV.y + TROLLEY * Math.sin(th) + 17 * Math.cos(th)
    const hy = ty + drop
    cable.setAttribute('x1', tx.toFixed(1)); cable.setAttribute('y1', ty.toFixed(1))
    cable.setAttribute('x2', tx.toFixed(1)); cable.setAttribute('y2', hy.toFixed(1))
    hook.setAttribute('transform', `translate(${tx.toFixed(1)} ${hy.toFixed(1)})`)
    hookPt.x = tx
    hookPt.y = hy + 40
  }
  const loop = (t: number) => { pose(t); raf = document.hidden ? 0 : requestAnimationFrame(loop) }
  const start = () => { cancelAnimationFrame(raf); if (reduced()) pose(0); else raf = requestAnimationFrame(loop) }
  const onVisible = () => { if (!document.hidden && !raf) start() }
  const fit = () => {
    const portrait = innerWidth / innerHeight < 1
    svg.setAttribute('viewBox', portrait ? '540 30 900 870' : '0 0 1600 900')
    svg.setAttribute('preserveAspectRatio', portrait ? 'xMidYMax meet' : 'xMidYMax slice')
  }
  function add(i: number) {
    const g = makeBlock(i)
    const s = slot(i)
    els[i] = g
    if (!ready || reduced()) { blocksL.append(g); if (ready) anim(g, [{ opacity: 0 }, { opacity: 1 }], { duration: 150 }); return }
    flyL.append(g)
    const fx = hookPt.x - (s.x + G.bw / 2)
    const fy = hookPt.y - s.y
    const a = g.animate([
      { transform: `translate(${fx}px, ${fy}px)`, opacity: 0, easing: 'linear' },
      { transform: `translate(${fx}px, ${fy}px)`, opacity: 1, offset: 0.2, easing: EASE },
      { transform: 'translate(0px, 0px)', opacity: 1 },
    ], { duration: 1500, fill: 'backwards' }) // 300 ms colgando + 1.2 s de traslado
    a.onfinish = () => { if (els[i] === g) blocksL.append(g) }
  }
  function remove(i: number) {
    const g = els[i]
    els[i] = null
    if (!g) return
    const a = anim(g, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-24px)' }], { duration: 500, fill: 'forwards' })
    if (a) a.onfinish = () => g.remove()
    else g.remove()
  }
  function pump() {
    if (timer) return
    const step = () => {
      timer = null
      if (count < target) { add(count++); timer = setTimeout(step, ST(250) || 20) }
      else if (count > target) { remove(--count); timer = setTimeout(step, ST(180) || 20) }
    }
    step()
  }
  fit()
  start()
  addEventListener('resize', fit)
  document.addEventListener('visibilitychange', onVisible)
  mqReduce.addEventListener('change', start)
  return {
    total: G.total,
    /* primera llamada: coloca sin animar; siguientes: la grúa los trae */
    set(f: number) {
      target = Math.round(clamp(f, 0, 1) * G.total)
      if (!ready) { while (count < target) add(count++); ready = true }
      else pump()
      return target
    },
    destroy() {
      cancelAnimationFrame(raf)
      if (timer) clearTimeout(timer)
      removeEventListener('resize', fit)
      document.removeEventListener('visibilitychange', onVisible)
      mqReduce.removeEventListener('change', start)
    },
  }
}
