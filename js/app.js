/* ═══════════════════════════════════════════════════════════
   METAFORGE — App Controller
   - Portal switching
   - Filter chips
   - Reactive tilt + scan
   - Forge Queue (cart) state
   - Toast notifications
   - Reveal-on-scroll
   ═══════════════════════════════════════════════════════════ */

/* ───────────── Catalog ───────────── */
const CATALOG = [
  // L1L B0TZ — retro-futuristic salvage units
  { id: 'lb-001', archive: 'l1lbotz', sku: 'LB-001', name: 'TV-HEAD UNIT 01',  price: 89,  edition: '01 / 24' },
  { id: 'lb-002', archive: 'l1lbotz', sku: 'LB-002', name: 'RUST PROPHET',     price: 94,  edition: '02 / 24' },
  { id: 'lb-003', archive: 'l1lbotz', sku: 'LB-003', name: 'ANTENNA SAINT',    price: 119, edition: '03 / 24' },
  { id: 'lb-004', archive: 'l1lbotz', sku: 'LB-004', name: 'STATIC PILGRIM',   price: 99,  edition: '04 / 24' },
  { id: 'lb-005', archive: 'l1lbotz', sku: 'LB-005', name: 'SIGNAL SCAVENGER', price: 109, edition: '05 / 24' },
  { id: 'lb-006', archive: 'l1lbotz', sku: 'LB-006', name: 'CRT MENDICANT',    price: 129, edition: '06 / 24' },

  // XNORMIES — gritty disruptive pixel-art figures
  { id: 'xn-001', archive: 'xnormies', sku: 'XN-001', name: 'NORMIE / 8-BIT',   price: 79,  edition: '01 / 18' },
  { id: 'xn-002', archive: 'xnormies', sku: 'XN-002', name: 'OFFLINE OPHELIA',  price: 84,  edition: '02 / 18' },
  { id: 'xn-003', archive: 'xnormies', sku: 'XN-003', name: 'GRAYBLOCK ANTON', price: 89,  edition: '03 / 18' },
  { id: 'xn-004', archive: 'xnormies', sku: 'XN-004', name: 'BUFFER OVERFLOW', price: 99,  edition: '04 / 18' },
  { id: 'xn-005', archive: 'xnormies', sku: 'XN-005', name: 'NULL POINTER',    price: 79,  edition: '05 / 18' },
  { id: 'xn-006', archive: 'xnormies', sku: 'XN-006', name: 'GHOST IN BIT',    price: 109, edition: '06 / 18' },
];

const ARCHIVE_LABELS = {
  all: 'All Units',
  l1lbotz: 'L1L B0TZ',
  xnormies: 'XNORMIES',
};

/* ───────────── Cart State ───────────── */
const FORGE_FEE_PCT = 0.08; // 8% forge/fulfillment fee

const cart = {
  items: new Map(), // id -> { item, qty }

  add(item) {
    const cur = this.items.get(item.id);
    this.items.set(item.id, { item, qty: (cur?.qty ?? 0) + 1 });
    this.emit();
  },

  remove(id) {
    this.items.delete(id);
    this.emit();
  },

  setQty(id, qty) {
    if (qty <= 0) return this.remove(id);
    const cur = this.items.get(id);
    if (cur) {
      cur.qty = qty;
      this.emit();
    }
  },

  count() {
    let n = 0;
    for (const { qty } of this.items.values()) n += qty;
    return n;
  },

  subtotal() {
    let s = 0;
    for (const { item, qty } of this.items.values()) s += item.price * qty;
    return s;
  },

  fee() { return this.subtotal() * FORGE_FEE_PCT; },
  total() { return this.subtotal() + this.fee(); },

  payload() {
    return {
      currency: 'USD',
      items: [...this.items.values()].map(({ item, qty }) => ({
        sku: item.sku,
        id: item.id,
        name: item.name,
        archive: item.archive,
        edition: item.edition,
        unit_price: item.price,
        qty,
        line_total: +(item.price * qty).toFixed(2),
      })),
      subtotal: +this.subtotal().toFixed(2),
      forge_fee: +this.fee().toFixed(2),
      total: +this.total().toFixed(2),
      shipping_hook: '/api/forge/fulfillment',
      checkout_hook: '/api/forge/checkout',
    };
  },

  emit() {
    renderDrawer();
    document.getElementById('cart-count').textContent = this.count();
  },
};

/* ───────────── Currency ───────────── */
const fmt = (n) => `$${n.toFixed(2)}`;

/* ───────────── Render Gallery ───────────── */
const grid = document.getElementById('grid');
const galleryTitle = document.getElementById('gallery-title');

function renderGallery(filter = 'all') {
  galleryTitle.textContent = ARCHIVE_LABELS[filter] ?? 'All Units';
  document.body.dataset.archive = filter;

  const items = filter === 'all'
    ? CATALOG
    : CATALOG.filter(i => i.archive === filter);

  grid.innerHTML = items.map(item => `
    <article class="card reveal" data-archive="${item.archive}" data-id="${item.id}">
      <div class="card-inner">
        <div class="card-media">
          <div class="card-meta">
            <span>${item.sku}</span>
            <span>${item.edition}</span>
          </div>
          <div class="card-render">
            <div class="card-render-mark"><span>${item.archive === 'l1lbotz' ? '◐' : '▣'}</span></div>
          </div>
          <div class="card-overlay"></div>
          <div class="card-scan"></div>
        </div>
        <div class="card-info">
          <span class="card-archive">// ${ARCHIVE_LABELS[item.archive].toUpperCase()}</span>
          <span class="card-name">${item.name}</span>
          <span class="card-price">${fmt(item.price)} USD</span>
          <button class="forge-btn" data-add="${item.id}">
            <span>INITIATE FORGE</span>
            <svg viewBox="0 0 24 24" width="12" height="12"><path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    </article>
  `).join('');

  bindCards();
  observeReveal();
}

/* ───────────── Card interactions (tilt + scan + add) ───────────── */
function bindCards() {
  document.querySelectorAll('.card').forEach(card => {
    const inner = card.querySelector('.card-inner');
    const overlay = card.querySelector('.card-overlay');

    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const px = x / r.width;
      const py = y / r.height;
      const rx = (py - 0.5) * -10; // tilt X
      const ry = (px - 0.5) *  12; // tilt Y
      inner.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
      overlay.style.setProperty('--mx', `${px * 100}%`);
      overlay.style.setProperty('--my', `${py * 100}%`);
    });

    card.addEventListener('mouseleave', () => {
      inner.style.transform = '';
    });

    const btn = card.querySelector('.forge-btn');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.dataset.add;
      const item = CATALOG.find(i => i.id === id);
      if (!item) return;
      cart.add(item);
      btn.classList.add('in');
      btn.querySelector('span').textContent = 'FORGED ✓';
      setTimeout(() => {
        btn.classList.remove('in');
        btn.querySelector('span').textContent = 'INITIATE FORGE';
      }, 1400);
      toast(`${item.name} added to forge queue`);
      pulseCartBtn();
    });
  });
}

/* ───────────── Drawer Render ───────────── */
const drawerList = document.getElementById('drawer-list');
const drawerEmpty = document.getElementById('drawer-empty');
const checkoutBtn = document.getElementById('checkout');

function renderDrawer() {
  const entries = [...cart.items.values()];

  if (entries.length === 0) {
    drawerEmpty.hidden = false;
    drawerList.innerHTML = '';
    checkoutBtn.disabled = true;
  } else {
    drawerEmpty.hidden = true;
    drawerList.innerHTML = entries.map(({ item, qty }) => `
      <li class="drawer-item" data-id="${item.id}">
        <div class="drawer-item-thumb">${item.archive === 'l1lbotz' ? '◐' : '▣'}</div>
        <div>
          <div class="drawer-item-name">${item.name}</div>
          <div class="drawer-item-meta">${item.sku} · ${item.edition}</div>
          <div class="drawer-item-controls">
            <button class="qty-btn" data-act="dec" data-id="${item.id}">−</button>
            <span class="qty-val">${qty}</span>
            <button class="qty-btn" data-act="inc" data-id="${item.id}">+</button>
          </div>
        </div>
        <div class="drawer-item-side">
          <span class="drawer-item-price">${fmt(item.price * qty)}</span>
          <button class="drawer-item-remove" data-act="rm" data-id="${item.id}">REMOVE</button>
        </div>
      </li>
    `).join('');
    checkoutBtn.disabled = false;
  }

  document.getElementById('cart-subtotal').textContent = fmt(cart.subtotal());
  document.getElementById('cart-fee').textContent     = fmt(cart.fee());
  document.getElementById('cart-total').textContent   = fmt(cart.total());
}

drawerList.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const { act, id } = btn.dataset;
  const cur = cart.items.get(id);
  if (!cur) return;
  if (act === 'inc') cart.setQty(id, cur.qty + 1);
  if (act === 'dec') cart.setQty(id, cur.qty - 1);
  if (act === 'rm')  cart.remove(id);
});

/* ───────────── Drawer Open/Close ───────────── */
const drawer = document.getElementById('drawer');
const veil = document.getElementById('drawer-veil');

function openDrawer()  { drawer.classList.add('open'); veil.classList.add('open'); }
function closeDrawer() { drawer.classList.remove('open'); veil.classList.remove('open'); }

document.getElementById('open-cart').addEventListener('click', openDrawer);
document.getElementById('close-cart').addEventListener('click', closeDrawer);
veil.addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

/* ───────────── Checkout payload ───────────── */
checkoutBtn.addEventListener('click', () => {
  const payload = cart.payload();
  console.group('%cMETAFORGE // CHECKOUT PAYLOAD', 'color:#6effb0;font-weight:700');
  console.log(payload);
  console.groupEnd();
  toast('Payload secured · Stripe handoff ready');
  // Ready to POST to /api/forge/checkout
});

/* ───────────── Cart button pulse ───────────── */
const cartBtn = document.getElementById('open-cart');
function pulseCartBtn() {
  cartBtn.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.06)' },
      { transform: 'scale(1)' },
    ],
    { duration: 320, easing: 'cubic-bezier(.22,.8,.2,1)' }
  );
}

/* ───────────── Portal switching ───────────── */
document.querySelectorAll('[data-portal]').forEach(portal => {
  portal.addEventListener('click', () => {
    const archive = portal.dataset.archive;
    renderGallery(archive);
    document.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.filter === archive);
    });
    document.getElementById('gallery').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ───────────── Filter chips ───────────── */
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const filter = chip.dataset.filter;
    document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
    renderGallery(filter);
  });
});

/* ───────────── Toast ───────────── */
const toastEl = document.getElementById('toast');
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

/* ───────────── Reveal on scroll ───────────── */
const io = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      en.target.classList.add('in');
      io.unobserve(en.target);
    }
  });
}, { threshold: 0.12 });

function observeReveal() {
  document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
}

document.querySelectorAll('.section-head, h2, .portal, .manifest').forEach(el => {
  el.classList.add('reveal');
});

/* ───────────── Hero logo parallax tilt ───────────── */
const heroMark = document.getElementById('hero-mark');
if (heroMark) {
  document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 14;
    const y = (e.clientY / window.innerHeight - 0.5) * -10;
    heroMark.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
  });
}

/* ───────────── Blueprint canvas (subtle moving particles) ───────────── */
(function bpCanvas() {
  const canvas = document.getElementById('bp-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, particles;
  const COUNT = 36;

  function resize() {
    w = canvas.width = window.innerWidth * devicePixelRatio;
    h = canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }

  function init() {
    particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3 * devicePixelRatio,
      vy: (Math.random() - 0.5) * 0.3 * devicePixelRatio,
      r: (Math.random() * 1.5 + 0.5) * devicePixelRatio,
    }));
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);

    // Connections
    ctx.strokeStyle = 'rgba(180,200,240,0.06)';
    ctx.lineWidth = 1 * devicePixelRatio;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 180 * devicePixelRatio) {
          ctx.globalAlpha = 1 - dist / (180 * devicePixelRatio);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;

    // Dots
    ctx.fillStyle = 'rgba(180,200,240,0.4)';
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(frame);
  }

  resize();
  init();
  frame();
  window.addEventListener('resize', () => { resize(); init(); });
})();

/* ───────────── Init ───────────── */
renderGallery('all');
renderDrawer();
observeReveal();

console.log('%cMETAFORGE // v1.0 forged in motion', 'color:#cdd7eb;font-family:monospace;letter-spacing:2px');
