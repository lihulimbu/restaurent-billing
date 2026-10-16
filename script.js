/* ============================================================
   RESTAURANT BILLING — SINGLE FRONTEND SCRIPT
   ------------------------------------------------------------
   Phase 1: Frontend only, mock data + localStorage persistence.
   Phase 2: Firebase Realtime Database integration (see TODO markers).
   Phase 3: Firebase Authentication and role-based access control.
   ------------------------------------------------------------
   Sections:
     1.  Config
     2.  Constants and Defaults
     3.  Mock Data (Phase 1 only)
     4.  State
     5.  Storage Layer (localStorage — Phase 1 only)
     6.  Utilities
     7.  Toast and Confirm
     8.  Modal Handling
     9.  Auth (Phase 1 stub — Phase 3 real)
     10. Router
     11. View: Billing
     12. View: Invoices
     13. View: Menu
     14. View: Reports
     15. View: Settings
     16. Invoice Rendering
     17. Print
     18. Boot
     19. Console Test Helpers (Phase 1 only — remove in Phase 5)
   ============================================================ */


/* ============================================================
   1. CONFIG
   ------------------------------------------------------------
   Phase 2: Replace placeholder with real values.
   Phase 3: Wire Firebase Auth + RTDB.
   ============================================================ */
const CONFIG = {
  // Firebase — will be filled in Phase 2
  firebase: {
    apiKey:            '',
    authDomain:        '',
    databaseURL:       '',
    projectId:         '',
    storageBucket:     '',
    messagingSenderId: '',
    appId:             ''
  },
  // Cloudflare Worker base URL — will be filled in Phase 3
  workerURL: '',
  // Restaurant identifier for multi-tenant data separation
  restaurantId: 'default-restaurant',
  // Phase 1 flag — set to true to force demo mode regardless of Firebase config
  forceDemoMode: true
};


/* ============================================================
   2. CONSTANTS AND DEFAULTS
   ============================================================ */

// Owner-editable defaults. All values can be changed via Settings.
// Placeholder format uses [BRACKETS] so it's obvious what must be filled.
const DEFAULT_SETTINGS = {
  // Restaurant profile — OWNER FILLS THESE IN SETTINGS
  bizName:       '[YOUR RESTAURANT NAME]',
  bizTagline:    '[YOUR TAGLINE]',
  address:       '[YOUR ADDRESS]',
  phone:         '[YOUR PHONE]',
  email:         '[YOUR EMAIL]',
  gstin:         '[YOUR GSTIN]',
  fssai:         '[YOUR FSSAI NUMBER]',

  // Tax
  cgstRate: 2.5,
  sgstRate: 2.5,
  taxInclusive: false,     // false = tax added on top of price

  // Custom taxes and charges (each { id, name, rate, type, enabled })
  // type: 'percent' | 'flat'
  customTaxes: [],

  // Invoice
  invoiceTitle:   'TAX INVOICE',
  invoicePrefix:  'INV',
  invoiceCounter: 1,
  currencySymbol: '\u20B9',   // Rupee sign

  // Printing
  printSize: 'a4',            // 'a4' | '80mm' | '58mm'

  // Editable field labels
  customerLabel:       'Bill To',
  tableLabel:          'Table',
  orderTypeLabel:      'Order Type',
  subtotalLabel:       'Subtotal',
  discountLabel:       'Discount',
  taxableLabel:        'Taxable Amount',
  cgstLabel:           'CGST',
  sgstLabel:           'SGST',
  roundOffLabel:       'Round Off',
  grandTotalLabel:     'Grand Total',
  amountInWordsLabel:  'Amount in Words',

  // Messages and notes
  headerNote:       '',
  footerNote:       'Thank you. Please visit again.',
  bottomNote:       'This is a computer-generated invoice.',
  termsText:        '[YOUR TERMS AND CONDITIONS]',

  // Display toggles
  showTerms:           true,
  showGstin:           true,
  showFssai:           true,
  showAmountInWords:   true,

  // App-level preferences
  dateFormat: 'dd-MMM-yyyy'   // 'dd-MMM-yyyy' | 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd'
};

// Category order in dropdowns
const DEFAULT_CATEGORY_ORDER = [
  'Starters', 'Main Course', 'Breads', 'Rice', 'Beverages', 'Desserts'
];

// Order types
const ORDER_TYPES = [
  { value: 'dine-in',      label: 'Dine-in' },
  { value: 'takeaway',     label: 'Takeaway' },
  { value: 'delivery',     label: 'Delivery' },
  { value: 'room-service', label: 'Room Service' }
];

// View metadata for topbar title/subtitle
const VIEW_META = {
  billing:   { title: 'Billing',   subtitle: 'Create a new invoice' },
  invoices:  { title: 'Invoices',  subtitle: 'View, search and reprint past invoices' },
  menu:      { title: 'Menu',      subtitle: 'Manage food items, categories and prices' },
  reports:   { title: 'Reports',   subtitle: 'Sales, income and item performance' },
  settings:  { title: 'Settings',  subtitle: 'Configure business, tax, invoice and print options' }
};


/* ============================================================
   3. MOCK DATA (PHASE 1 ONLY)
   ------------------------------------------------------------
   Phase 2: Remove this block. Data will come from Firebase RTDB.
   ============================================================ */
const MOCK_MENU = [
  { id: 'ST01', name: 'Paneer Tikka',        category: 'Starters',    price: 280, taxRate: 5, veg: true,  available: true },
  { id: 'ST02', name: 'Chicken Tikka',       category: 'Starters',    price: 320, taxRate: 5, veg: false, available: true },
  { id: 'ST03', name: 'Veg Manchurian',      category: 'Starters',    price: 220, taxRate: 5, veg: true,  available: true },
  { id: 'ST04', name: 'Chilli Paneer',       category: 'Starters',    price: 260, taxRate: 5, veg: true,  available: true },
  { id: 'MC01', name: 'Butter Chicken',      category: 'Main Course', price: 380, taxRate: 5, veg: false, available: true },
  { id: 'MC02', name: 'Paneer Butter Masala',category: 'Main Course', price: 320, taxRate: 5, veg: true,  available: true },
  { id: 'MC03', name: 'Dal Makhani',         category: 'Main Course', price: 260, taxRate: 5, veg: true,  available: true },
  { id: 'MC04', name: 'Chicken Biryani',     category: 'Main Course', price: 340, taxRate: 5, veg: false, available: true },
  { id: 'MC05', name: 'Veg Biryani',         category: 'Main Course', price: 260, taxRate: 5, veg: true,  available: true },
  { id: 'BR01', name: 'Butter Naan',         category: 'Breads',      price: 60,  taxRate: 5, veg: true,  available: true },
  { id: 'BR02', name: 'Garlic Naan',         category: 'Breads',      price: 80,  taxRate: 5, veg: true,  available: true },
  { id: 'BR03', name: 'Tandoori Roti',       category: 'Breads',      price: 40,  taxRate: 5, veg: true,  available: true },
  { id: 'RC01', name: 'Jeera Rice',          category: 'Rice',        price: 180, taxRate: 5, veg: true,  available: true },
  { id: 'RC02', name: 'Steamed Rice',        category: 'Rice',        price: 120, taxRate: 5, veg: true,  available: true },
  { id: 'BV01', name: 'Masala Chai',         category: 'Beverages',   price: 50,  taxRate: 5, veg: true,  available: true },
  { id: 'BV02', name: 'Cold Coffee',         category: 'Beverages',   price: 120, taxRate: 5, veg: true,  available: true },
  { id: 'BV03', name: 'Fresh Lime Soda',     category: 'Beverages',   price: 90,  taxRate: 5, veg: true,  available: true },
  { id: 'BV04', name: 'Sweet Lassi',         category: 'Beverages',   price: 100, taxRate: 5, veg: true,  available: true },
  { id: 'BV05', name: 'Mineral Water',       category: 'Beverages',   price: 30,  taxRate: 5, veg: true,  available: true },
  { id: 'DS01', name: 'Gulab Jamun (2 pc)',  category: 'Desserts',    price: 100, taxRate: 5, veg: true,  available: true },
  { id: 'DS02', name: 'Rasmalai (2 pc)',     category: 'Desserts',    price: 140, taxRate: 5, veg: true,  available: true },
  { id: 'DS03', name: 'Vanilla Ice Cream',   category: 'Desserts',    price: 90,  taxRate: 5, veg: true,  available: true },
  { id: 'DS04', name: 'Chocolate Brownie',   category: 'Desserts',    price: 160, taxRate: 5, veg: true,  available: true }
];


/* ============================================================
   4. STATE
   ------------------------------------------------------------
   Single source of truth for the current session.
   Phase 2: These arrays will be populated from Firebase listeners.
   ============================================================ */
const state = {
  // Auth
  user: null,               // { uid, email, name, role }
  isDemoMode: false,

  // Data
  settings: { ...DEFAULT_SETTINGS },
  menu: [],                 // array of item objects
  invoices: [],             // array of invoice objects

  // Current session
  currentView: 'billing',
  cart: [],                 // array of { id, name, price, taxRate, qty, custom }
  currentOrder: {
    customer: '',
    phone: '',
    table: '',
    orderType: 'dine-in'
  },
  discount: { type: 'percent', value: 0 },   // 'percent' | 'flat'
  activeCategoryFilter: 'All',
  menuSearchTerm: '',
  currentInvoice: null,     // invoice being previewed
  pendingConfirm: null      // callback for confirm modal
};


/* ============================================================
   5. STORAGE LAYER (PHASE 1 ONLY)
   ------------------------------------------------------------
   Phase 2: Replace with Firebase Realtime Database reads/writes.
   ============================================================ */
const STORAGE_KEYS = {
  settings: 'rb_settings',
  menu:     'rb_menu',
  invoices: 'rb_invoices',
  demoMode: 'rb_demo_mode'
};

const Storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  },
  clearAll() {
    Object.values(STORAGE_KEYS).forEach(k => this.remove(k));
  }
};


/* ============================================================
   6. UTILITIES
   ============================================================ */

function $(selector, root = document) { return root.querySelector(selector); }
function $$(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function fmtMoney(amount, withSymbol = true) {
  const symbol = withSymbol ? (state.settings.currencySymbol || '\u20B9') : '';
  const n = Number(amount || 0);
  const formatted = n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return symbol + formatted;
}

function fmtMoneyShort(amount) {
  const symbol = state.settings.currencySymbol || '\u20B9';
  const n = Math.round(Number(amount || 0));
  return symbol + n.toLocaleString('en-IN');
}

function fmtDate(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mon = months[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd}-${mon}-${yyyy}`;
}

function fmtTime(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2,'0')}:${m} ${ampm}`;
}

function fmtDateTime(dateInput) {
  return `${fmtDate(dateInput)} ${fmtTime(dateInput)}`;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function monthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function yearISO() {
  return String(new Date().getFullYear());
}

function isSameDay(dateA, dateB) {
  const a = new Date(dateA), b = new Date(dateB);
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function isSameMonth(dateInput, yyyyMm) {
  const d = new Date(dateInput);
  const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  return ym === yyyyMm;
}

function isSameYear(dateInput, yyyy) {
  return String(new Date(dateInput).getFullYear()) === String(yyyy);
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function numberToWords(num) {
  num = Math.round(Number(num) || 0);
  if (num === 0) return 'Zero';
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
    'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const inWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n/10)] + (n%10 ? ' ' + a[n%10] : '');
    if (n < 1000) return a[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + inWords(n%100) : '');
    if (n < 100000) return inWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + inWords(n%1000) : '');
    if (n < 10000000) return inWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + inWords(n%100000) : '');
    return inWords(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + inWords(n%10000000) : '');
  };
  return inWords(num) + ' Rupees Only';
}

function debounce(fn, delay = 200) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), delay);
  };
}

function nextInvoiceNumber() {
  const s = state.settings;
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const counter = String(s.invoiceCounter || 1).padStart(4, '0');
  const prefix = s.invoicePrefix || 'INV';
  return `${prefix}-${ymd}-${counter}`;
}


/* ============================================================
   7. TOAST AND CONFIRM
   ============================================================ */

function toast(message, type = 'info', duration = 2400) {
  const root = $('#toastRoot');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    setTimeout(() => el.remove(), 200);
  }, duration);
}

function confirmDialog({ title = 'Are you sure?', message = 'This action cannot be undone.', confirmLabel = 'Confirm', danger = true } = {}) {
  return new Promise(resolve => {
    const modal = $('#confirmModal');
    $('#confirmTitle').textContent = title;
    $('#confirmMessage').textContent = message;
    const yesBtn = $('#confirmYesBtn');
    yesBtn.textContent = confirmLabel;
    yesBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
    modal.classList.remove('hidden');

    const cleanup = () => {
      modal.classList.add('hidden');
      state.pendingConfirm = null;
      yesBtn.onclick = null;
    };

    state.pendingConfirm = () => { cleanup(); resolve(true); };
    yesBtn.onclick = state.pendingConfirm;

    $$('[data-close-confirm]', modal).forEach(el => {
      el.onclick = () => { cleanup(); resolve(false); };
    });
  });
}


/* ============================================================
   8. MODAL HANDLING
   ============================================================ */

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function bindModalCloseButtons() {
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-close-modal]')) {
      const modal = e.target.closest('.modal');
      if (modal) modal.classList.add('hidden');
    }
    if (e.target.matches('[data-close-confirm]') && !state.pendingConfirm) {
      closeModal('confirmModal');
    }
  });
}


/* ============================================================
   9. AUTH (PHASE 1 STUB — PHASE 3 REAL)
   ------------------------------------------------------------
   Phase 1: "Sign in" button works in demo mode only.
   Phase 3: Firebase Authentication integration.
   ============================================================ */

function isDemoMode() {
  return CONFIG.forceDemoMode || state.isDemoMode;
}

async function handleLogin(email, password) {
  // TODO: PHASE 3 — replace with firebase.auth().signInWithEmailAndPassword
  if (!email || !password) {
    throw new Error('Email and password required.');
  }
  // Phase 1: accept any non-empty credentials as demo
  state.user = {
    uid: 'demo_' + Date.now(),
    email,
    name: 'Demo User',
    role: 'admin'
  };
  state.isDemoMode = true;
  Storage.set(STORAGE_KEYS.demoMode, true);
  return state.user;
}

async function handleDemoLogin() {
  state.user = {
    uid: 'demo_' + Date.now(),
    email: 'demo@example.com',
    name: 'Demo Administrator',
    role: 'admin'
  };
  state.isDemoMode = true;
  Storage.set(STORAGE_KEYS.demoMode, true);
  return state.user;
}

async function handleLogout() {
  // TODO: PHASE 3 — firebase.auth().signOut()
  state.user = null;
  state.isDemoMode = false;
  Storage.remove(STORAGE_KEYS.demoMode);
  showLoginScreen();
}


/* ============================================================
   10. ROUTER
   ============================================================ */

function setActiveNav(view) {
  $$('.sidebar-link').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
}

function updateTopbar(view) {
  const meta = VIEW_META[view] || VIEW_META.billing;
  $('#pageTitle').textContent = meta.title;
  $('#pageSubtitle').textContent = meta.subtitle;
}

function navigateTo(view) {
  if (!VIEW_META[view]) view = 'billing';
  state.currentView = view;
  setActiveNav(view);
  updateTopbar(view);
  renderView();
  window.location.hash = view;
}

function renderView() {
  const container = $('#viewContainer');
  if (!container) return;
  container.innerHTML = '';
  switch (state.currentView) {
    case 'billing':   renderBillingView(container);   break;
    case 'invoices':  renderInvoicesView(container);  break;
    case 'menu':      renderMenuView(container);      break;
    case 'reports':   renderReportsView(container);   break;
    case 'settings':  renderSettingsView(container);  break;
    default:          renderBillingView(container);
  }
}

function bindSidebarNavigation() {
  $$('.sidebar-link').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.view));
  });
}

function bindHashRouting() {
  window.addEventListener('hashchange', () => {
    const view = window.location.hash.replace('#', '') || 'billing';
    if (view !== state.currentView) navigateTo(view);
  });
}


/* ============================================================
   11. VIEW: BILLING
   ============================================================ */

function renderBillingView(root) {
  const menu = state.menu.filter(m => m.available);
  const categories = ['All', ...new Set(menu.map(m => m.category))];

  root.innerHTML = `
    <div class="billing-layout fade-in">
      <!-- Left: item selection -->
      <div class="billing-left">

        <!-- Add item panel -->
        <div class="card card-padded">
          <h3 class="card-title mb-3">Add Item</h3>

          <div class="billing-add-row">
            <select id="billingItemSelect" class="form-select" aria-label="Select menu item">
              <option value="">— Select item from menu —</option>
              ${categories.filter(c => c !== 'All').map(cat => `
                <optgroup label="${esc(cat)}">
                  ${menu.filter(m => m.category === cat).map(m => `
                    <option value="${esc(m.id)}">${esc(m.name)} — ${fmtMoney(m.price)}</option>
                  `).join('')}
                </optgroup>
              `).join('')}
            </select>
            <input id="billingItemQty" type="number" min="1" value="1" class="form-input" style="max-width:90px" aria-label="Quantity" />
            <button type="button" class="btn btn-primary" id="billingAddBtn">
              <svg class="icon-sm"><use href="#i-plus"/></svg>
              Add
            </button>
          </div>

          <div class="mt-3">
            <button type="button" class="btn btn-ghost btn-sm" id="billingCustomToggle">
              <svg class="icon-xs"><use href="#i-plus"/></svg>
              Add custom item
            </button>
          </div>

          <div id="billingCustomForm" class="hidden mt-3">
            <div class="card card-padded" style="background: var(--color-surface-2); border-style: dashed;">
              <p class="text-xs text-uppercase text-muted mb-2">Custom item</p>
              <div class="custom-item-row">
                <input id="customName" class="form-input" placeholder="Item name" />
                <input id="customPrice" type="number" min="0" step="0.01" class="form-input" placeholder="Price" />
                <input id="customTax" type="number" min="0" step="0.5" value="5" class="form-input" placeholder="GST %" />
                <button type="button" class="btn btn-soft" id="customAddBtn">Add</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick menu -->
        <div class="card card-padded mt-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="card-title">Quick Menu</h3>
            <div class="relative">
              <svg class="icon-xs" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--color-text-muted)"><use href="#i-search"/></svg>
              <input id="menuSearchInput" class="form-input" style="padding-left:32px;width:200px" placeholder="Search..." />
            </div>
          </div>

          <div class="quick-cats" id="quickCats">
            ${categories.map(c => `
              <button type="button" class="cat-btn ${c === 'All' ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>
            `).join('')}
          </div>

          <div class="quick-grid" id="quickGrid">
            ${menu.map(m => `
              <button type="button" class="menu-tile" data-menu-id="${esc(m.id)}">
                <span class="badge ${m.veg ? 'badge-veg' : 'badge-nonveg'}">${m.veg ? 'VEG' : 'NON'}</span>
                <span class="menu-tile-name">${esc(m.name)}</span>
                <span class="menu-tile-price mono">${fmtMoney(m.price)}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Right: cart -->
      <div class="billing-right">
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Current Order</h3>
              <p class="card-subtitle">Review items before invoice</p>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" id="cartClearBtn">
              <svg class="icon-xs"><use href="#i-trash"/></svg>
              Clear
            </button>
          </div>
          <div class="cart-body" id="cartBody"></div>
          <div class="card-footer" style="flex-direction: column; align-items: stretch; gap: 12px; padding: 16px;">
            <div id="cartTotals" class="cart-totals"></div>
            <button type="button" class="btn btn-primary btn-block" id="generateInvoiceBtn">
              <svg class="icon-sm"><use href="#i-receipt"/></svg>
              Generate Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  bindBillingEvents();
  renderCart();
}

function bindBillingEvents() {
  // Add item from dropdown
  $('#billingAddBtn').addEventListener('click', () => {
    const sel = $('#billingItemSelect');
    const qty = parseInt($('#billingItemQty').value, 10) || 1;
    if (!sel.value) return toast('Select an item first', 'warning');
    const item = state.menu.find(m => m.id === sel.value);
    if (!item) return;
    for (let i = 0; i < qty; i++) addToCart(item);
    sel.value = '';
    $('#billingItemQty').value = 1;
    sel.focus();
    toast(`${item.name} added`, 'success', 1400);
  });

  // Custom form toggle
  $('#billingCustomToggle').addEventListener('click', () => {
    $('#billingCustomForm').classList.toggle('hidden');
  });

  // Add custom item
  $('#customAddBtn').addEventListener('click', () => {
    const name = $('#customName').value.trim();
    const price = parseFloat($('#customPrice').value);
    const tax = parseFloat($('#customTax').value) || 5;
    if (!name || isNaN(price) || price < 0) return toast('Enter valid name and price', 'warning');
    addCustomToCart(name, price, tax);
    $('#customName').value = '';
    $('#customPrice').value = '';
    $('#customTax').value = 5;
    $('#customName').focus();
    toast(`${name} added`, 'success', 1400);
  });

  // Quick menu — add on click
  $('#quickGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-menu-id]');
    if (!btn) return;
    const item = state.menu.find(m => m.id === btn.dataset.menuId);
    if (item) addToCart(item);
  });

  // Category filter
  $('#quickCats').addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    $$('#quickCats .cat-btn').forEach(b => b.classList.toggle('active', b === btn));
    state.activeCategoryFilter = btn.dataset.cat;
    applyQuickFilter();
  });

  // Search
  $('#menuSearchInput').addEventListener('input', debounce((e) => {
    state.menuSearchTerm = e.target.value.trim().toLowerCase();
    applyQuickFilter();
  }, 120));

  // Clear cart
  $('#cartClearBtn').addEventListener('click', async () => {
    if (!state.cart.length) return;
    const ok = await confirmDialog({
      title: 'Clear current order?',
      message: 'All items in the current order will be removed.',
      confirmLabel: 'Clear'
    });
    if (ok) {
      state.cart = [];
      state.discount = { type: 'percent', value: 0 };
      state.currentOrder = { customer: '', phone: '', table: '', orderType: 'dine-in' };
      renderCart();
      toast('Order cleared', 'success', 1400);
    }
  });

  // Generate invoice
  $('#generateInvoiceBtn').addEventListener('click', generateInvoice);
}

function applyQuickFilter() {
  const cat = state.activeCategoryFilter;
  const term = state.menuSearchTerm;
  $$('#quickGrid .menu-tile').forEach(tile => {
    const item = state.menu.find(m => m.id === tile.dataset.menuId);
    if (!item) return;
    const catMatch = cat === 'All' || item.category === cat;
    const termMatch = !term || item.name.toLowerCase().includes(term);
    tile.classList.toggle('hidden', !(catMatch && termMatch));
  });
}


/* ============================================================
   CART LOGIC
   ============================================================ */

function addToCart(item) {
  const existing = state.cart.find(c => c.id === item.id && !c.custom);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({
      id: item.id,
      name: item.name,
      price: item.price,
      taxRate: item.taxRate ?? 5,
      qty: 1,
      custom: false
    });
  }
  renderCart();
}

function addCustomToCart(name, price, taxRate) {
  const id = 'CUSTOM_' + uid();
  state.cart.push({
    id,
    name,
    price,
    taxRate,
    qty: 1,
    custom: true
  });
  renderCart();
}

function updateCartQty(id, delta) {
  const item = state.cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    state.cart = state.cart.filter(c => c.id !== id);
  }
  renderCart();
}

function removeCartItem(id) {
  state.cart = state.cart.filter(c => c.id !== id);
  renderCart();
}

function calculateCartTotals() {
  const subtotal = state.cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  // Discount
  let discountAmount = 0;
  if (state.discount.type === 'percent') {
    discountAmount = subtotal * (state.discount.value / 100);
  } else {
    discountAmount = Math.min(state.discount.value, subtotal);
  }
  const taxableAmount = subtotal - discountAmount;

  // GST (split CGST + SGST per line item)
  let cgst = 0, sgst = 0;
  state.cart.forEach(i => {
    const line = i.price * i.qty;
    const lineDiscount = subtotal > 0 ? (line / subtotal) * discountAmount : 0;
    const lineTaxable = line - lineDiscount;
    cgst += lineTaxable * ((i.taxRate / 2) / 100);
    sgst += lineTaxable * ((i.taxRate / 2) / 100);
  });

  // Custom taxes
  let customTaxTotal = 0;
  state.settings.customTaxes
    .filter(t => t.enabled)
    .forEach(t => {
      if (t.type === 'percent') customTaxTotal += taxableAmount * (t.rate / 100);
      else customTaxTotal += t.rate;
    });

  const grandBeforeRound = taxableAmount + cgst + sgst + customTaxTotal;
  const rounded = Math.round(grandBeforeRound);
  const roundOff = rounded - grandBeforeRound;

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    cgst,
    sgst,
    customTaxTotal,
    total: grandBeforeRound,
    rounded,
    roundOff
  };
}

function renderCart() {
  const body = $('#cartBody');
  const totals = $('#cartTotals');
  if (!body || !totals) return;

  const t = calculateCartTotals();

  if (!state.cart.length) {
    body.innerHTML = `
      <div class="table-empty">
        <div class="table-empty-icon">
          <svg class="icon" style="width:20px;height:20px"><use href="#i-receipt"/></svg>
        </div>
        <p>No items yet</p>
        <p class="text-xs mt-1">Add items from the menu or use custom item</p>
      </div>
    `;
  } else {
    body.innerHTML = state.cart.map(i => `
      <div class="cart-item">
        <div class="cart-item-head">
          <div class="cart-item-name">
            ${esc(i.name)}
            ${i.custom ? '<span class="badge badge-custom ml-1">CUSTOM</span>' : ''}
          </div>
          <div class="cart-item-total mono">${fmtMoney(i.price * i.qty)}</div>
        </div>
        <div class="cart-item-foot">
          <div class="qty-stepper">
            <button type="button" class="qty-btn" data-cart-dec="${esc(i.id)}" aria-label="Decrease">
              <svg class="icon-xs"><use href="#i-minus"/></svg>
            </button>
            <span class="qty-value mono">${i.qty}</span>
            <button type="button" class="qty-btn" data-cart-inc="${esc(i.id)}" aria-label="Increase">
              <svg class="icon-xs"><use href="#i-plus"/></svg>
            </button>
          </div>
          <div class="cart-item-meta text-xs text-muted mono">
            ${fmtMoney(i.price)} × ${i.qty}
          </div>
          <button type="button" class="icon-btn danger" data-cart-rm="${esc(i.id)}" aria-label="Remove">
            <svg class="icon-xs"><use href="#i-trash"/></svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  // Order info fields
  const orderInfo = `
    <div class="order-info-grid">
      <input class="form-input" data-order-field="table" placeholder="Table #" value="${esc(state.currentOrder.table)}" />
      <select class="form-select" data-order-field="orderType">
        ${ORDER_TYPES.map(o => `
          <option value="${o.value}" ${state.currentOrder.orderType === o.value ? 'selected' : ''}>${o.label}</option>
        `).join('')}
      </select>
      <input class="form-input" data-order-field="customer" placeholder="Customer name (optional)" value="${esc(state.currentOrder.customer)}" />
      <input class="form-input" data-order-field="phone" placeholder="Phone (optional)" value="${esc(state.currentOrder.phone)}" />
    </div>
  `;

  // Discount control
  const discountControl = state.cart.length ? `
    <div class="discount-row">
      <span class="text-xs text-uppercase text-muted">Discount</span>
      <div class="discount-toggle">
        <button type="button" class="${state.discount.type === 'percent' ? 'active' : ''}" data-disc-type="percent">%</button>
        <button type="button" class="${state.discount.type === 'flat' ? 'active' : ''}" data-disc-type="flat">${state.settings.currencySymbol || '₹'}</button>
      </div>
      <input type="number" min="0" step="0.01" class="form-input mono" id="discountValue" value="${state.discount.value}" />
    </div>
  ` : '';

  // Totals block
  const totalsBlock = state.cart.length ? `
    ${orderInfo}
    ${discountControl}
    <div class="totals-list">
      <div class="totals-row"><span>${esc(state.settings.subtotalLabel)}</span><span class="mono">${fmtMoney(t.subtotal)}</span></div>
      ${t.discountAmount > 0 ? `<div class="totals-row discount"><span>${esc(state.settings.discountLabel)}</span><span class="mono">- ${fmtMoney(t.discountAmount)}</span></div>` : ''}
      <div class="totals-row"><span>${esc(state.settings.taxableLabel)}</span><span class="mono">${fmtMoney(t.taxableAmount)}</span></div>
      <div class="totals-row sub"><span>${esc(state.settings.cgstLabel)} @ ${state.settings.cgstRate}%</span><span class="mono">${fmtMoney(t.cgst)}</span></div>
      <div class="totals-row sub"><span>${esc(state.settings.sgstLabel)} @ ${state.settings.sgstRate}%</span><span class="mono">${fmtMoney(t.sgst)}</span></div>
      ${state.settings.customTaxes.filter(x => x.enabled).map(ct => `
        <div class="totals-row sub"><span>${esc(ct.name)}${ct.type === 'percent' ? ` @ ${ct.rate}%` : ''}</span><span class="mono">${fmtMoney(ct.type === 'percent' ? t.taxableAmount * (ct.rate/100) : ct.rate)}</span></div>
      `).join('')}
      ${Math.abs(t.roundOff) > 0.001 ? `<div class="totals-row sub"><span>${esc(state.settings.roundOffLabel)}</span><span class="mono">${t.roundOff > 0 ? '+' : ''}${fmtMoney(t.roundOff)}</span></div>` : ''}
      <div class="totals-grand">
        <span>${esc(state.settings.grandTotalLabel)}</span>
        <span class="mono">${fmtMoney(t.rounded)}</span>
      </div>
    </div>
  ` : '';

  totals.innerHTML = totalsBlock;

  // Bind cart events
  body.querySelectorAll('[data-cart-inc]').forEach(b => b.addEventListener('click', () => updateCartQty(b.dataset.cartInc, 1)));
  body.querySelectorAll('[data-cart-dec]').forEach(b => b.addEventListener('click', () => updateCartQty(b.dataset.cartDec, -1)));
  body.querySelectorAll('[data-cart-rm]').forEach(b => b.addEventListener('click', () => removeCartItem(b.dataset.cartRm)));

  // Bind order info
  totals.querySelectorAll('[data-order-field]').forEach(el => {
    el.addEventListener('input', () => {
      state.currentOrder[el.dataset.orderField] = el.value;
    });
    el.addEventListener('change', () => {
      state.currentOrder[el.dataset.orderField] = el.value;
    });
  });

  // Bind discount
  totals.querySelectorAll('[data-disc-type]').forEach(b => {
    b.addEventListener('click', () => {
      state.discount.type = b.dataset.discType;
      renderCart();
    });
  });
  const discVal = totals.querySelector('#discountValue');
  if (discVal) {
    discVal.addEventListener('input', () => {
      state.discount.value = parseFloat(discVal.value) || 0;
      // Re-render only totals to avoid losing focus
      const t2 = calculateCartTotals();
      const totalsList = totals.querySelector('.totals-list');
      if (totalsList) {
        // Cheap update: re-render cart is safer for consistency
        renderCart();
      }
    });
  }
}


/* ============================================================
   12. VIEW: INVOICES
   ============================================================ */

function renderInvoicesView(root) {
  const invoices = [...state.invoices].sort((a, b) => new Date(b.date) - new Date(a.date));

  root.innerHTML = `
    <div class="fade-in">
      <div class="reports-kpis mb-4">
        ${kpiCard('Total Invoices', invoices.length, 'i-receipt')}
        ${kpiCard('Total Sales', fmtMoneyShort(invoices.reduce((s, i) => s + i.totals.rounded, 0)), 'i-reports')}
        ${kpiCard('Today', invoices.filter(i => isSameDay(i.date, new Date())).length, 'i-calendar')}
        ${kpiCard('Items Sold', invoices.reduce((s, i) => s + i.items.reduce((x, it) => x + it.qty, 0), 0), 'i-menu')}
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">All Invoices</h3>
            <p class="card-subtitle">Click a row to preview or reprint</p>
          </div>
          <input id="invoiceSearch" class="form-input" style="max-width:240px" placeholder="Search invoice no., customer..." />
        </div>
        <div class="table-scroll">
          <table class="table" id="invoicesTable">
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Date and Time</th>
                <th>Customer</th>
                <th>Items</th>
                <th class="text-right">Total</th>
                <th class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              ${invoices.length ? invoices.map(inv => `
                <tr data-invoice-id="${esc(inv.id)}">
                  <td class="mono">${esc(inv.number)}</td>
                  <td>${fmtDateTime(inv.date)}</td>
                  <td>${esc(inv.orderInfo.customer || 'Walk-in')}</td>
                  <td>${inv.items.length}</td>
                  <td class="text-right mono">${fmtMoney(inv.totals.rounded)}</td>
                  <td class="text-right">
                    <button type="button" class="btn btn-ghost btn-sm" data-view-invoice="${esc(inv.id)}">View</button>
                  </td>
                </tr>
              `).join('') : `
                <tr><td colspan="6" class="table-empty">No invoices yet</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll('[data-view-invoice]').forEach(btn => {
    btn.addEventListener('click', () => {
      const inv = state.invoices.find(i => i.id === btn.dataset.viewInvoice);
      if (inv) showInvoiceModal(inv);
    });
  });

  const searchEl = $('#invoiceSearch');
  searchEl?.addEventListener('input', debounce(() => {
    const q = searchEl.value.trim().toLowerCase();
    $$('#invoicesTable tbody tr').forEach(row => {
      row.classList.toggle('hidden', q && !row.textContent.toLowerCase().includes(q));
    });
  }, 120));
}

function kpiCard(label, value, iconId) {
  return `
    <div class="kpi-card">
      <div class="kpi-head">
        <span class="kpi-label">${esc(label)}</span>
        <span class="kpi-icon"><svg class="icon-sm"><use href="#${iconId}"/></svg></span>
      </div>
      <div class="kpi-value">${value}</div>
    </div>
  `;
}


/* ============================================================
   13. VIEW: MENU
   ============================================================ */

function renderMenuView(root) {
  const items = state.menu;

  root.innerHTML = `
    <div class="fade-in">
      <div class="flex items-center justify-between mb-4">
        <div class="relative">
          <svg class="icon-xs" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--color-text-muted)"><use href="#i-search"/></svg>
          <input id="menuSearchFull" class="form-input" style="padding-left:32px;width:260px" placeholder="Search items..." />
        </div>
        <button type="button" class="btn btn-primary" id="addMenuItemBtn">
          <svg class="icon-sm"><use href="#i-plus"/></svg>
          Add Item
        </button>
      </div>

      <div class="card">
        <div class="table-scroll">
          <table class="table" id="menuTable">
            <thead>
              <tr>
                <th>Code</th>
                <th>Item</th>
                <th>Category</th>
                <th class="text-right">Price</th>
                <th class="text-center">Type</th>
                <th class="text-center">Available</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${items.length ? items.map(m => `
                <tr data-item-id="${esc(m.id)}">
                  <td class="mono">${esc(m.id)}</td>
                  <td class="font-medium">${esc(m.name)}</td>
                  <td>${esc(m.category)}</td>
                  <td class="text-right mono">${fmtMoney(m.price)}</td>
                  <td class="text-center">
                    <span class="badge ${m.veg ? 'badge-veg' : 'badge-nonveg'}">${m.veg ? 'VEG' : 'NON-VEG'}</span>
                  </td>
                  <td class="text-center">
                    <span class="badge ${m.available ? 'badge-success' : 'badge-neutral'}">${m.available ? 'Yes' : 'No'}</span>
                  </td>
                  <td class="text-right">
                    <button type="button" class="icon-btn" data-edit-item="${esc(m.id)}" aria-label="Edit">
                      <svg class="icon-xs"><use href="#i-edit"/></svg>
                    </button>
                    <button type="button" class="icon-btn danger" data-delete-item="${esc(m.id)}" aria-label="Delete">
                      <svg class="icon-xs"><use href="#i-trash"/></svg>
                    </button>
                  </td>
                </tr>
              `).join('') : `
                <tr><td colspan="7" class="table-empty">No items. Add your first item.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  $('#addMenuItemBtn').addEventListener('click', () => openMenuItemModal(null));
  root.querySelectorAll('[data-edit-item]').forEach(b => {
    b.addEventListener('click', () => {
      const item = state.menu.find(m => m.id === b.dataset.editItem);
      if (item) openMenuItemModal(item);
    });
  });
  root.querySelectorAll('[data-delete-item]').forEach(b => {
    b.addEventListener('click', async () => {
      const item = state.menu.find(m => m.id === b.dataset.deleteItem);
      if (!item) return;
      const ok = await confirmDialog({
        title: 'Delete menu item?',
        message: `"${item.name}" will be permanently removed.`,
        confirmLabel: 'Delete'
      });
      if (ok) {
        state.menu = state.menu.filter(m => m.id !== item.id);
        persistMenu();
        renderMenuView(root);
        toast('Item deleted', 'success');
      }
    });
  });

  $('#menuSearchFull')?.addEventListener('input', debounce((e) => {
    const q = e.target.value.trim().toLowerCase();
    $$('#menuTable tbody tr').forEach(row => {
      row.classList.toggle('hidden', q && !row.textContent.toLowerCase().includes(q));
    });
  }, 120));
}

function openMenuItemModal(item) {
  const isNew = !item;
  const m = item || {
    id: '',
    name: '',
    category: 'Main Course',
    price: 0,
    taxRate: 5,
    veg: true,
    available: true
  };

  // Build modal dynamically
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content modal-content-md" style="margin:auto;">
      <div class="modal-header">
        <h3 class="modal-title">${isNew ? 'Add Menu Item' : 'Edit Menu Item'}</h3>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Item Code</label>
            <input id="miId" class="form-input mono" value="${esc(m.id)}" placeholder="e.g. MC01" />
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <input id="miCategory" class="form-input" value="${esc(m.category)}" placeholder="e.g. Main Course" list="catList" />
            <datalist id="catList">
              ${DEFAULT_CATEGORY_ORDER.map(c => `<option value="${esc(c)}"></option>`).join('')}
            </datalist>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Item Name</label>
          <input id="miName" class="form-input" value="${esc(m.name)}" placeholder="Item name" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Price</label>
            <input id="miPrice" type="number" min="0" step="0.01" class="form-input mono" value="${m.price}" />
          </div>
          <div class="form-group">
            <label class="form-label">GST %</label>
            <input id="miTax" type="number" min="0" step="0.5" class="form-input mono" value="${m.taxRate}" />
          </div>
        </div>

        <div class="flex gap-4 mt-2">
          <label class="form-checkbox"><input type="checkbox" id="miVeg" ${m.veg ? 'checked' : ''} /> Vegetarian</label>
          <label class="form-checkbox"><input type="checkbox" id="miAvailable" ${m.available ? 'checked' : ''} /> Available</label>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" data-close>Cancel</button>
        <button type="button" class="btn btn-primary" id="miSave">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('[data-close]').addEventListener('click', close);
  modal.querySelector('.modal-overlay').addEventListener('click', close);

  modal.querySelector('#miSave').addEventListener('click', () => {
    const id = modal.querySelector('#miId').value.trim() || uid('IT');
    const name = modal.querySelector('#miName').value.trim();
    const category = modal.querySelector('#miCategory').value.trim() || 'Uncategorized';
    const price = parseFloat(modal.querySelector('#miPrice').value) || 0;
    const taxRate = parseFloat(modal.querySelector('#miTax').value) || 0;
    const veg = modal.querySelector('#miVeg').checked;
    const available = modal.querySelector('#miAvailable').checked;

    if (!name) return toast('Item name is required', 'warning');

    const newItem = { id, name, category, price, taxRate, veg, available };

    if (isNew) {
      if (state.menu.some(x => x.id === id)) return toast('Item code already exists', 'danger');
      state.menu.push(newItem);
    } else {
      const idx = state.menu.findIndex(x => x.id === m.id);
      if (idx >= 0) state.menu[idx] = newItem;
    }
    persistMenu();
    close();
    renderMenuView($('#viewContainer'));
    toast(isNew ? 'Item added' : 'Item updated', 'success');
  });
}

function persistMenu() {
  // TODO: PHASE 2 — replace with Firebase RTDB write
  Storage.set(STORAGE_KEYS.menu, state.menu);
}


/* ============================================================
   14. VIEW: REPORTS
   ============================================================ */

function renderReportsView(root) {
  const preset = state._reportPreset || 'today';
  const range = getReportRange(preset, state._customStart, state._customEnd);

  root.innerHTML = `
    <div class="fade-in">
      <div class="card card-padded mb-4">
        <div class="reports-filters">
          <button type="button" class="btn ${preset === 'today' ? 'btn-secondary' : 'btn-ghost'} btn-sm" data-preset="today">Today</button>
          <button type="button" class="btn ${preset === 'week' ? 'btn-secondary' : 'btn-ghost'} btn-sm" data-preset="week">Last 7 Days</button>
          <button type="button" class="btn ${preset === 'month' ? 'btn-secondary' : 'btn-ghost'} btn-sm" data-preset="month">This Month</button>
          <button type="button" class="btn ${preset === 'year' ? 'btn-secondary' : 'btn-ghost'} btn-sm" data-preset="year">This Year</button>
          <button type="button" class="btn ${preset === 'all' ? 'btn-secondary' : 'btn-ghost'} btn-sm" data-preset="all">All Time</button>
          <button type="button" class="btn ${preset === 'custom' ? 'btn-secondary' : 'btn-ghost'} btn-sm" data-preset="custom">Custom</button>
        </div>
        <div id="customRangeRow" class="mt-3 ${preset === 'custom' ? '' : 'hidden'}">
          <div class="flex gap-3 items-center">
            <input type="date" id="reportStartDate" class="form-input" style="max-width:180px" value="${state._customStart || todayISO()}" />
            <span class="text-muted text-sm">to</span>
            <input type="date" id="reportEndDate" class="form-input" style="max-width:180px" value="${state._customEnd || todayISO()}" />
            <button type="button" class="btn btn-primary btn-sm" id="applyCustomRange">Apply</button>
          </div>
        </div>
      </div>

      <div id="reportContent"></div>
    </div>
  `;

  root.querySelectorAll('[data-preset]').forEach(b => {
    b.addEventListener('click', () => {
      state._reportPreset = b.dataset.preset;
      if (b.dataset.preset === 'custom') {
        $('#customRangeRow').classList.remove('hidden');
      } else {
        renderReportsView(root);
      }
    });
  });

  $('#applyCustomRange')?.addEventListener('click', () => {
    state._customStart = $('#reportStartDate').value;
    state._customEnd = $('#reportEndDate').value;
    renderReportsView(root);
  });

  renderReportContent(range);
}

function getReportRange(preset, customStart, customEnd) {
  const now = new Date();
  let start = new Date(now), end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (preset === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (preset === 'week') {
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (preset === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (preset === 'year') {
    start = new Date(now.getFullYear(), 0, 1);
  } else if (preset === 'all') {
    start = new Date(2000, 0, 1);
  } else if (preset === 'custom') {
    start = customStart ? new Date(customStart + 'T00:00:00') : new Date(now);
    end = customEnd ? new Date(customEnd + 'T23:59:59') : new Date(now);
  }
  return { start, end };
}

function filterInvoicesByRange(range) {
  return state.invoices.filter(inv => {
    const d = new Date(inv.date);
    return d >= range.start && d <= range.end;
  });
}

function renderReportContent(range) {
  const root = $('#reportContent');
  if (!root) return;

  const invoices = filterInvoicesByRange(range);
  const totalSales = invoices.reduce((s, i) => s + i.totals.rounded, 0);
  const totalDiscount = invoices.reduce((s, i) => s + i.totals.discountAmount, 0);
  const totalCgst = invoices.reduce((s, i) => s + i.totals.cgst, 0);
  const totalSgst = invoices.reduce((s, i) => s + i.totals.sgst, 0);
  const totalItems = invoices.reduce((s, i) => s + i.items.reduce((x, it) => x + it.qty, 0), 0);

  // Item aggregation
  const itemMap = {};
  invoices.forEach(inv => inv.items.forEach(it => {
    if (!itemMap[it.name]) itemMap[it.name] = { name: it.name, qty: 0, revenue: 0 };
    itemMap[it.name].qty += it.qty;
    itemMap[it.name].revenue += it.price * it.qty;
  }));
  const itemList = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue);

  // Category aggregation (if available on items)
  const catMap = {};
  invoices.forEach(inv => inv.items.forEach(it => {
    const cat = it.category || 'Uncategorized';
    if (!catMap[cat]) catMap[cat] = { qty: 0, revenue: 0 };
    catMap[cat].qty += it.qty;
    catMap[cat].revenue += it.price * it.qty;
  }));
  const catList = Object.entries(catMap).map(([name, v]) => ({ name, ...v })).sort((a,b) => b.revenue - a.revenue);

  root.innerHTML = `
    <div class="reports-kpis mb-4">
      ${kpiCard('Total Sales', fmtMoneyShort(totalSales), 'i-reports')}
      ${kpiCard('Invoices', invoices.length, 'i-receipt')}
      ${kpiCard('Items Sold', totalItems, 'i-menu')}
      ${kpiCard('Avg Invoice', invoices.length ? fmtMoneyShort(totalSales / invoices.length) : fmtMoneyShort(0), 'i-percent')}
    </div>

    <div class="reports-row mb-4">
      <div class="card card-padded">
        <h4 class="card-title mb-3">Breakdown</h4>
        <div class="totals-list">
          <div class="totals-row"><span>Gross Sales</span><span class="mono">${fmtMoney(totalSales)}</span></div>
          <div class="totals-row"><span>Discounts</span><span class="mono">${fmtMoney(totalDiscount)}</span></div>
          <div class="totals-row sub"><span>CGST</span><span class="mono">${fmtMoney(totalCgst)}</span></div>
          <div class="totals-row sub"><span>SGST</span><span class="mono">${fmtMoney(totalSgst)}</span></div>
          <div class="totals-grand"><span>Net Sales</span><span class="mono">${fmtMoney(totalSales)}</span></div>
        </div>
      </div>

      <div class="card card-padded">
        <h4 class="card-title mb-3">Top Items</h4>
        ${itemList.length ? `
          <div class="top-items">
            ${itemList.slice(0, 6).map((it, i) => `
              <div class="top-item">
                <span class="top-rank">${i + 1}</span>
                <span class="top-name truncate">${esc(it.name)}</span>
                <span class="top-qty text-xs text-muted mono">${it.qty} sold</span>
                <span class="top-rev mono">${fmtMoney(it.revenue)}</span>
              </div>
            `).join('')}
          </div>
        ` : `<p class="text-muted text-sm">No sales in this period</p>`}
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h4 class="card-title">Invoices in Period</h4>
      </div>
      <div class="table-scroll">
        <table class="table">
          <thead>
            <tr>
              <th>Invoice No.</th>
              <th>Date</th>
              <th>Customer</th>
              <th class="text-right">Items</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoices.length ? invoices.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(inv => `
              <tr>
                <td class="mono">${esc(inv.number)}</td>
                <td>${fmtDateTime(inv.date)}</td>
                <td>${esc(inv.orderInfo.customer || 'Walk-in')}</td>
                <td class="text-right">${inv.items.length}</td>
                <td class="text-right mono">${fmtMoney(inv.totals.rounded)}</td>
              </tr>
            `).join('') : `<tr><td colspan="5" class="table-empty">No invoices in this range</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}


/* ============================================================
   15. VIEW: SETTINGS
   ============================================================ */

function renderSettingsView(root) {
  const s = state.settings;

  root.innerHTML = `
    <div class="fade-in settings-layout">

      <!-- Business info -->
      <div class="card card-padded">
        <h3 class="card-title mb-4">Business Information</h3>
        <div class="form-row">
          ${settingsField('bizName', 'Restaurant Name', s.bizName)}
          ${settingsField('bizTagline', 'Tagline', s.bizTagline)}
          ${settingsField('phone', 'Phone', s.phone)}
          ${settingsField('email', 'Email', s.email)}
        </div>
        <div class="form-group">
          <label class="form-label">Address</label>
          <input id="s_address" class="form-input" value="${esc(s.address)}" />
        </div>
        <div class="form-row">
          ${settingsField('gstin', 'GSTIN', s.gstin)}
          ${settingsField('fssai', 'FSSAI Number', s.fssai)}
        </div>
      </div>

      <!-- Tax -->
      <div class="card card-padded mt-4">
        <h3 class="card-title mb-4">Tax Configuration</h3>
        <div class="form-row">
          ${settingsField('cgstRate', 'CGST %', s.cgstRate, 'number')}
          ${settingsField('sgstRate', 'SGST %', s.sgstRate, 'number')}
        </div>
        <label class="form-checkbox mt-2">
          <input type="checkbox" id="s_taxInclusive" ${s.taxInclusive ? 'checked' : ''} />
          Prices are tax inclusive
        </label>
      </div>

      <!-- Invoice -->
      <div class="card card-padded mt-4">
        <h3 class="card-title mb-4">Invoice Header and Footer</h3>
        <div class="form-row">
          ${settingsField('invoiceTitle', 'Invoice Title', s.invoiceTitle)}
          ${settingsField('invoicePrefix', 'Invoice Prefix', s.invoicePrefix)}
          ${settingsField('invoiceCounter', 'Next Invoice Number', s.invoiceCounter, 'number')}
          ${settingsField('currencySymbol', 'Currency Symbol', s.currencySymbol)}
        </div>
        <div class="form-group">
          <label class="form-label">Header Note</label>
          <input id="s_headerNote" class="form-input" value="${esc(s.headerNote)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Thank You Message</label>
          <input id="s_footerNote" class="form-input" value="${esc(s.footerNote)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Bottom Note</label>
          <input id="s_bottomNote" class="form-input" value="${esc(s.bottomNote)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Terms and Conditions</label>
          <textarea id="s_termsText" class="form-textarea">${esc(s.termsText)}</textarea>
        </div>
      </div>

      <!-- Field labels -->
      <div class="card card-padded mt-4">
        <h3 class="card-title mb-1">Invoice Field Labels</h3>
        <p class="card-subtitle mb-4">Labels shown on the printed invoice</p>
        <div class="form-row">
          ${settingsField('customerLabel', 'Customer Label', s.customerLabel)}
          ${settingsField('tableLabel', 'Table Label', s.tableLabel)}
          ${settingsField('orderTypeLabel', 'Order Type Label', s.orderTypeLabel)}
          ${settingsField('subtotalLabel', 'Subtotal Label', s.subtotalLabel)}
          ${settingsField('discountLabel', 'Discount Label', s.discountLabel)}
          ${settingsField('taxableLabel', 'Taxable Amount Label', s.taxableLabel)}
          ${settingsField('cgstLabel', 'CGST Label', s.cgstLabel)}
          ${settingsField('sgstLabel', 'SGST Label', s.sgstLabel)}
          ${settingsField('roundOffLabel', 'Round Off Label', s.roundOffLabel)}
          ${settingsField('grandTotalLabel', 'Grand Total Label', s.grandTotalLabel)}
          ${settingsField('amountInWordsLabel', 'Amount in Words Label', s.amountInWordsLabel)}
        </div>
      </div>

      <!-- Display toggles -->
      <div class="card card-padded mt-4">
        <h3 class="card-title mb-4">Display Options</h3>
        <div class="flex gap-4 flex-wrap">
          <label class="form-checkbox"><input type="checkbox" id="s_showTerms" ${s.showTerms ? 'checked' : ''} /> Show Terms</label>
          <label class="form-checkbox"><input type="checkbox" id="s_showGstin" ${s.showGstin ? 'checked' : ''} /> Show GSTIN</label>
          <label class="form-checkbox"><input type="checkbox" id="s_showFssai" ${s.showFssai ? 'checked' : ''} /> Show FSSAI</label>
          <label class="form-checkbox"><input type="checkbox" id="s_showAmountInWords" ${s.showAmountInWords ? 'checked' : ''} /> Show Amount in Words</label>
        </div>
      </div>

      <!-- Printing -->
      <div class="card card-padded mt-4">
        <h3 class="card-title mb-4">Printing Preferences</h3>
        <div class="form-group" style="max-width:280px">
          <label class="form-label">Print Size</label>
          <select id="s_printSize" class="form-select">
            <option value="a4"   ${s.printSize === 'a4'   ? 'selected' : ''}>A4 Paper</option>
            <option value="80mm" ${s.printSize === '80mm' ? 'selected' : ''}>80mm Thermal</option>
            <option value="58mm" ${s.printSize === '58mm' ? 'selected' : ''}>58mm Thermal</option>
          </select>
        </div>
      </div>

      <!-- Custom taxes -->
      <div class="card card-padded mt-4">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="card-title">Additional Taxes and Charges</h3>
            <p class="card-subtitle">Service charge, packaging, or other custom charges</p>
          </div>
          <button type="button" class="btn btn-soft btn-sm" id="addCustomTaxBtn">
            <svg class="icon-xs"><use href="#i-plus"/></svg>
            Add
          </button>
        </div>
        <div id="customTaxesList">
          ${s.customTaxes.length ? s.customTaxes.map(ct => renderCustomTaxRow(ct)).join('') : '<p class="text-muted text-sm">No custom taxes or charges</p>'}
        </div>
      </div>

      <!-- Actions -->
      <div class="settings-actions">
        <button type="button" class="btn btn-danger" id="resetDataBtn">Reset All Data</button>
        <button type="button" class="btn btn-primary" id="saveSettingsBtn">Save Settings</button>
      </div>
    </div>
  `;

  bindSettingsEvents(root);
}

function settingsField(key, label, value, type = 'text') {
  return `
    <div class="form-group">
      <label class="form-label">${esc(label)}</label>
      <input id="s_${key}" type="${type}" class="form-input" value="${esc(value ?? '')}" />
    </div>
  `;
}

function renderCustomTaxRow(ct) {
  return `
    <div class="custom-tax-row" data-tax-id="${esc(ct.id)}">
      <input class="form-input" data-tax-field="name" value="${esc(ct.name)}" placeholder="Tax name" />
      <select class="form-select" data-tax-field="type">
        <option value="percent" ${ct.type === 'percent' ? 'selected' : ''}>Percent</option>
        <option value="flat"    ${ct.type === 'flat'    ? 'selected' : ''}>Flat</option>
      </select>
      <input type="number" class="form-input mono" data-tax-field="rate" value="${ct.rate}" />
      <label class="form-checkbox"><input type="checkbox" data-tax-field="enabled" ${ct.enabled ? 'checked' : ''} /> Enabled</label>
      <button type="button" class="icon-btn danger" data-tax-remove="${esc(ct.id)}" aria-label="Remove">
        <svg class="icon-xs"><use href="#i-trash"/></svg>
      </button>
    </div>
  `;
}

function bindSettingsEvents(root) {
  // Add custom tax
  $('#addCustomTaxBtn').addEventListener('click', () => {
    state.settings.customTaxes.push({
      id: uid('tax'),
      name: 'Service Charge',
      type: 'percent',
      rate: 5,
      enabled: true
    });
    renderSettingsView(root);
  });

  // Remove custom tax
  root.querySelectorAll('[data-tax-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.settings.customTaxes = state.settings.customTaxes.filter(t => t.id !== btn.dataset.taxRemove);
      renderSettingsView(root);
    });
  });

  // Live update custom tax fields
  root.querySelectorAll('.custom-tax-row').forEach(row => {
    const id = row.dataset.taxId;
    row.querySelectorAll('[data-tax-field]').forEach(el => {
      el.addEventListener('input', () => {
        const tax = state.settings.customTaxes.find(t => t.id === id);
        if (!tax) return;
        const field = el.dataset.taxField;
        if (field === 'enabled') tax.enabled = el.checked;
        else if (field === 'rate') tax.rate = parseFloat(el.value) || 0;
        else tax[field] = el.value;
      });
      el.addEventListener('change', () => {
        const tax = state.settings.customTaxes.find(t => t.id === id);
        if (!tax) return;
        const field = el.dataset.taxField;
        if (field === 'enabled') tax.enabled = el.checked;
      });
    });
  });

  // Save
  $('#saveSettingsBtn').addEventListener('click', () => {
    const get = (id) => $(id)?.value ?? '';
    const getNum = (id) => parseFloat($(id)?.value) || 0;
    const getBool = (id) => !!$(id)?.checked;

    state.settings.bizName        = get('#s_bizName');
    state.settings.bizTagline     = get('#s_bizTagline');
    state.settings.phone          = get('#s_phone');
    state.settings.email          = get('#s_email');
    state.settings.address        = get('#s_address');
    state.settings.gstin          = get('#s_gstin');
    state.settings.fssai          = get('#s_fssai');
    state.settings.cgstRate       = getNum('#s_cgstRate');
    state.settings.sgstRate       = getNum('#s_sgstRate');
    state.settings.taxInclusive   = getBool('#s_taxInclusive');
    state.settings.invoiceTitle   = get('#s_invoiceTitle');
    state.settings.invoicePrefix  = get('#s_invoicePrefix');
    state.settings.invoiceCounter = parseInt(get('#s_invoiceCounter'), 10) || 1;
    state.settings.currencySymbol = get('#s_currencySymbol') || '\u20B9';
    state.settings.headerNote     = get('#s_headerNote');
    state.settings.footerNote     = get('#s_footerNote');
    state.settings.bottomNote     = get('#s_bottomNote');
    state.settings.termsText      = get('#s_termsText');

    state.settings.customerLabel      = get('#s_customerLabel');
    state.settings.tableLabel         = get('#s_tableLabel');
    state.settings.orderTypeLabel     = get('#s_orderTypeLabel');
    state.settings.subtotalLabel      = get('#s_subtotalLabel');
    state.settings.discountLabel      = get('#s_discountLabel');
    state.settings.taxableLabel       = get('#s_taxableLabel');
    state.settings.cgstLabel          = get('#s_cgstLabel');
    state.settings.sgstLabel          = get('#s_sgstLabel');
    state.settings.roundOffLabel      = get('#s_roundOffLabel');
    state.settings.grandTotalLabel    = get('#s_grandTotalLabel');
    state.settings.amountInWordsLabel = get('#s_amountInWordsLabel');

    state.settings.showTerms         = getBool('#s_showTerms');
    state.settings.showGstin         = getBool('#s_showGstin');
    state.settings.showFssai         = getBool('#s_showFssai');
    state.settings.showAmountInWords = getBool('#s_showAmountInWords');

    state.settings.printSize = get('#s_printSize');

    persistSettings();
    applySettingsToUI();
    toast('Settings saved', 'success');
  });

  // Reset
  $('#resetDataBtn').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Reset all data?',
      message: 'This will permanently delete all invoices, menu items and settings.',
      confirmLabel: 'Reset Everything'
    });
    if (!ok) return;
    Storage.clearAll();
    location.reload();
  });
}

function persistSettings() {
  // TODO: PHASE 2 — replace with Firebase RTDB write
  Storage.set(STORAGE_KEYS.settings, state.settings);
}

function applySettingsToUI() {
  const s = state.settings;
  document.title = `Restaurant Billing — ${s.bizName}`;
  const loginBizName = $('#loginBizName');
  if (loginBizName) loginBizName.textContent = s.bizName;
  const sidebarBizName = $('#sidebarBizName');
  if (sidebarBizName) sidebarBizName.textContent = s.bizName;
  const sidebarBizSub = $('#sidebarBizSub');
  if (sidebarBizSub) sidebarBizSub.textContent = s.bizTagline || 'Billing System';
  const loginFooter = $('#loginFooter');
  if (loginFooter) loginFooter.textContent = `${s.bizName} · ${s.phone}`;
}


/* ============================================================
   16. INVOICE RENDERING
   ============================================================ */

function generateInvoice() {
  if (!state.cart.length) return toast('Add items to cart first', 'warning');
  const totals = calculateCartTotals();
  const now = new Date();
  const invoiceNumber = nextInvoiceNumber();
  const invoiceId = uid('inv');

  const invoice = {
    id: invoiceId,
    number: invoiceNumber,
    date: now.toISOString(),
    items: JSON.parse(JSON.stringify(state.cart)),
    totals: JSON.parse(JSON.stringify(totals)),
    orderInfo: { ...state.currentOrder },
    discount: { ...state.discount },
    settingsSnapshot: JSON.parse(JSON.stringify(state.settings))
  };

  // Save
  state.invoices.unshift(invoice);
  state.settings.invoiceCounter = (state.settings.invoiceCounter || 1) + 1;
  persistInvoices();
  persistSettings();

  state.cart = [];
  state.discount = { type: 'percent', value: 0 };
  state.currentOrder = { customer: '', phone: '', table: '', orderType: 'dine-in' };

  showInvoiceModal(invoice);
  renderCart();
  toast('Invoice generated', 'success');
}

function persistInvoices() {
  // TODO: PHASE 2 — replace with Firebase RTDB write
  Storage.set(STORAGE_KEYS.invoices, state.invoices);
}

function showInvoiceModal(invoice) {
  state.currentInvoice = invoice;
  const preview = $('#invoicePreview');
  if (!preview) return;
  preview.innerHTML = renderInvoiceHTML(invoice, 'screen');
  openModal('invoiceModal');
}

function renderInvoiceHTML(invoice, mode) {
  const s = invoice.settingsSnapshot || state.settings;
  const t = invoice.totals;
  const oi = invoice.orderInfo;
  const d = new Date(invoice.date);

  const meta = `
    <div class="inv-meta">
      <div>
        <div class="inv-label">Invoice No.</div>
        <div class="inv-value mono">${esc(invoice.number)}</div>
      </div>
      <div>
        <div class="inv-label">Date and Time</div>
        <div class="inv-value">${fmtDate(d)}, ${fmtTime(d)}</div>
      </div>
      <div>
        <div class="inv-label">${esc(s.orderTypeLabel)}</div>
        <div class="inv-value" style="text-transform:capitalize">${esc((oi.orderType || 'dine-in').replace('-', ' '))}</div>
      </div>
    </div>
    <div class="inv-meta inv-meta-2">
      <div>
        <div class="inv-label">${esc(s.customerLabel)}</div>
        <div class="inv-value">${esc(oi.customer || 'Walk-in Customer')}</div>
        ${oi.phone ? `<div class="text-xs text-muted mono">${esc(oi.phone)}</div>` : ''}
      </div>
      <div style="text-align:right">
        ${oi.table ? `<div class="inv-label">${esc(s.tableLabel)}</div><div class="inv-value">Table #${esc(oi.table)}</div>` : ''}
      </div>
    </div>
  `;

  const itemsRows = invoice.items.map((it, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${esc(it.name)}${it.custom ? ' <span class="badge badge-custom">CUSTOM</span>' : ''}</td>
      <td class="num">${it.qty}</td>
      <td class="num">${fmtMoney(it.price)}</td>
      <td class="num">${fmtMoney(it.price * it.qty)}</td>
    </tr>
  `).join('');

  const totalsRows = `
    <div class="inv-row"><span>${esc(s.subtotalLabel)}</span><span class="mono">${fmtMoney(t.subtotal)}</span></div>
    ${t.discountAmount > 0 ? `<div class="inv-row discount"><span>${esc(s.discountLabel)}</span><span class="mono">- ${fmtMoney(t.discountAmount)}</span></div>` : ''}
    <div class="inv-row"><span>${esc(s.taxableLabel)}</span><span class="mono">${fmtMoney(t.taxableAmount)}</span></div>
    <div class="inv-row sub"><span>${esc(s.cgstLabel)} @ ${s.cgstRate}%</span><span class="mono">${fmtMoney(t.cgst)}</span></div>
    <div class="inv-row sub"><span>${esc(s.sgstLabel)} @ ${s.sgstRate}%</span><span class="mono">${fmtMoney(t.sgst)}</span></div>
    ${s.customTaxes.filter(x => x.enabled).map(ct => `
      <div class="inv-row sub"><span>${esc(ct.name)}${ct.type === 'percent' ? ` @ ${ct.rate}%` : ''}</span><span class="mono">${fmtMoney(ct.type === 'percent' ? t.taxableAmount * (ct.rate/100) : ct.rate)}</span></div>
    `).join('')}
    ${Math.abs(t.roundOff) > 0.001 ? `<div class="inv-row sub"><span>${esc(s.roundOffLabel)}</span><span class="mono">${t.roundOff > 0 ? '+' : ''}${fmtMoney(t.roundOff)}</span></div>` : ''}
    <div class="inv-grand">
      <span class="inv-grand-label">${esc(s.grandTotalLabel)}</span>
      <span class="inv-grand-value">${fmtMoney(t.rounded)}</span>
    </div>
  `;

  const words = s.showAmountInWords ? `
    <div class="inv-words">
      <div class="inv-label">${esc(s.amountInWordsLabel)}</div>
      <p>${esc(numberToWords(t.rounded))}</p>
    </div>
  ` : '<div></div>';

  const terms = s.showTerms && s.termsText ? `
    <div class="inv-terms">
      <div class="inv-terms-title">Terms and Conditions</div>
      <p>${esc(s.termsText)}</p>
    </div>
  ` : '';

  return `
    <div class="inv-head">
      <div class="inv-biz-name">${esc(s.bizName)}</div>
      ${s.bizTagline ? `<div class="inv-biz-tag">${esc(s.bizTagline)}</div>` : ''}
      <div class="inv-biz-meta">
        ${esc(s.address)}<br>
        Phone: ${esc(s.phone)}${s.email ? ` &middot; Email: ${esc(s.email)}` : ''}
        ${s.showGstin && s.gstin ? `<br>GSTIN: <span class="mono">${esc(s.gstin)}</span>` : ''}
        ${s.showFssai && s.fssai ? ` &middot; FSSAI: <span class="mono">${esc(s.fssai)}</span>` : ''}
      </div>
    </div>

    <div class="inv-title"><span>${esc(s.invoiceTitle)}</span></div>

    ${meta}

    <table>
      <thead>
        <tr>
          <th style="width:32px">#</th>
          <th>Item</th>
          <th class="num" style="width:60px">Qty</th>
          <th class="num" style="width:90px">Rate</th>
          <th class="num" style="width:110px">Amount</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div class="inv-totals-wrap">
      ${words}
      <div class="inv-totals">${totalsRows}</div>
    </div>

    ${terms}

    <div class="inv-footer">
      ${s.headerNote ? `<div class="inv-footer-head">${esc(s.headerNote)}</div>` : ''}
      <div class="inv-footer-note">${esc(s.footerNote)}</div>
      <div class="inv-footer-sub">${esc(s.bottomNote)}</div>
    </div>
  `;
}


/* ============================================================
   17. PRINT
   ============================================================ */

function printCurrentInvoice() {
  if (!state.currentInvoice) return;
  const html = renderInvoiceHTML(state.currentInvoice, 'print');
  const printArea = $('#printArea');
  if (!printArea) return;
  printArea.className = 'print-area';
  const size = state.settings.printSize || 'a4';
  printArea.classList.add(`print-${size}`);
  printArea.innerHTML = html;
  window.print();
}

function downloadCurrentInvoice() {
  // Phase 1: simple text-based download. Phase 4: PDF via Worker.
  if (!state.currentInvoice) return;
  const inv = state.currentInvoice;
  const s = inv.settingsSnapshot || state.settings;
  const lines = [
    s.bizName,
    s.bizTagline || '',
    s.address || '',
    `Phone: ${s.phone || ''}`,
    s.showGstin && s.gstin ? `GSTIN: ${s.gstin}` : '',
    '',
    `Invoice: ${inv.number}`,
    `Date: ${fmtDateTime(inv.date)}`,
    `Customer: ${inv.orderInfo.customer || 'Walk-in'}`,
    '',
    'Items:',
    ...inv.items.map(i => `  ${i.name} x ${i.qty} @ ${fmtMoney(i.price)} = ${fmtMoney(i.price * i.qty)}`),
    '',
    `Subtotal: ${fmtMoney(inv.totals.subtotal)}`,
    `Discount: ${fmtMoney(inv.totals.discountAmount)}`,
    `CGST: ${fmtMoney(inv.totals.cgst)}`,
    `SGST: ${fmtMoney(inv.totals.sgst)}`,
    `Total: ${fmtMoney(inv.totals.rounded)}`,
    '',
    s.footerNote || ''
  ].filter(Boolean).join('\n');

  const blob = new Blob([lines], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${inv.number}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}


/* ============================================================
   18. BOOT
   ============================================================ */

function loadFromStorage() {
  const s = Storage.get(STORAGE_KEYS.settings);
  if (s) state.settings = { ...DEFAULT_SETTINGS, ...s };

  const m = Storage.get(STORAGE_KEYS.menu);
  state.menu = Array.isArray(m) && m.length ? m : JSON.parse(JSON.stringify(MOCK_MENU));

  const inv = Storage.get(STORAGE_KEYS.invoices);
  state.invoices = Array.isArray(inv) ? inv : [];

  const demo = Storage.get(STORAGE_KEYS.demoMode);
  if (demo) state.isDemoMode = true;
}

function showLoginScreen() {
  $('#view-login').classList.remove('hidden');
  $('#app').classList.add('hidden');
}

function showApp() {
  $('#view-login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  applySettingsToUI();
  updateClock();
  navigateTo(window.location.hash.replace('#', '') || 'billing');
}

function updateClock() {
  const el = $('#liveClock');
  if (!el) return;
  el.textContent = fmtDateTime(new Date());
}

function updateConnStatus() {
  const dot = $('#connDot');
  const text = $('#connText');
  if (!dot || !text) return;
  if (state.isDemoMode || CONFIG.forceDemoMode) {
    dot.className = 'conn-dot warning';
    text.textContent = 'Demo Mode';
  } else if (CONFIG.firebase.apiKey) {
    dot.className = 'conn-dot success';
    text.textContent = 'Connected';
  } else {
    dot.className = 'conn-dot';
    text.textContent = 'Offline';
  }
}

function bindLoginEvents() {
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;
    const err = $('#loginError');
    err.classList.add('hidden');
    try {
      await handleLogin(email, password);
      showApp();
      toast('Signed in', 'success');
    } catch (ex) {
      err.textContent = ex.message || 'Sign-in failed';
      err.classList.remove('hidden');
    }
  });

  $('#demoModeBtn').addEventListener('click', async () => {
    await handleDemoLogin();
    showApp();
    toast('Demo mode active', 'info');
  });

  $('#logoutBtn').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Sign out?',
      message: 'You will be returned to the login screen.',
      confirmLabel: 'Sign Out'
    });
    if (ok) handleLogout();
  });
}

function bindInvoiceModalEvents() {
  $('#invoicePrintBtn').addEventListener('click', printCurrentInvoice);
  $('#invoiceDownloadBtn').addEventListener('click', downloadCurrentInvoice);
  $('#invoiceCloseBtn').addEventListener('click', () => closeModal('invoiceModal'));
  $('#invoiceModal .modal-overlay').addEventListener('click', () => closeModal('invoiceModal'));
}

function boot() {
  loadFromStorage();
  bindModalCloseButtons();
  bindSidebarNavigation();
  bindHashRouting();
  bindLoginEvents();
  bindInvoiceModalEvents();
  updateConnStatus();
  applySettingsToUI();

  setInterval(updateClock, 1000);

  // If previously in demo mode, jump straight to app
  if (state.isDemoMode || CONFIG.forceDemoMode) {
    showApp();
  } else {
    showLoginScreen();
  }

  // Expose a small API for console testing
  window.__RB = {
    state,
    CONFIG,
    DEFAULT_SETTINGS,
    addToCart,
    addCustomToCart,
    calculateCartTotals,
    generateInvoice,
    renderInvoiceHTML,
    numberToWords,
    fmtMoney,
    fmtDate,
    fmtTime,
    toast,
    navigateTo
  };

  console.log('[Restaurant Billing] Boot complete. Phase 1 demo mode.');
}

document.addEventListener('DOMContentLoaded', boot);


/* ============================================================
   19. CONSOLE TEST HELPERS (PHASE 1 ONLY)
   ------------------------------------------------------------
   Phase 5: remove this section after full integration testing.
   ============================================================ */
window.__RBTests = {
  pass: 0, fail: 0, warn: 0, results: [],
  ok(label) { this.pass++; this.results.push({ status: 'PASS', label }); },
  no(label, detail) { this.fail++; this.results.push({ status: 'FAIL', label, detail }); },
  warnMsg(label, detail) { this.warn++; this.results.push({ status: 'WARN', label, detail }); },
  reset() { this.pass = 0; this.fail = 0; this.warn = 0; this.results = []; },
  report(title) {
    console.log('\n============================================');
    console.log(title);
    console.log('============================================');
    const fails = this.results.filter(r => r.status === 'FAIL');
    const warns = this.results.filter(r => r.status === 'WARN');
    if (fails.length) {
      console.log('\nFAILED:');
      fails.forEach(r => console.log('  X', r.label, r.detail ? '-> ' + JSON.stringify(r.detail) : ''));
    }
    if (warns.length) {
      console.log('\nWARNINGS:');
      warns.forEach(r => console.log('  !', r.label, r.detail ? '-> ' + JSON.stringify(r.detail) : ''));
    }
    console.log('\nPASSED:', this.pass);
    console.log('FAILED:', this.fail);
    console.log('WARNINGS:', this.warn);
    console.log('============================================\n');
    return { passed: this.pass, failed: this.fail, warned: this.warn, results: this.results };
  }
};
