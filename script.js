/* ===== CONFIG ===== */
const WHATSAPP_NUMBER = '5493813879138';

/* ===== PRODUCT DATA ===== */
let products = getProducts();

/* ===== IMAGE GENERATORS ===== */
function getProductImage(product) {
  if (product.image) return product.image;
  const color = product.color || '#E5E0D5';
  const fg = darkenColor(color);
  const initial = product.name.charAt(0);
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Cdefs%3E%3Cpattern id='dots' x='0' y='0' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='20' cy='20' r='1.5' fill='%23${fg.slice(1)}' opacity='0.12'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='400' height='400' fill='%23${color.slice(1)}'/%3E%3Crect width='400' height='400' fill='url(%23dots)'/%3E%3Ctext x='200' y='270' font-family='Georgia%2Cserif' font-size='200' font-weight='700' text-anchor='middle' fill='%23${fg.slice(1)}' opacity='0.7'%3E${initial}%3C/text%3E%3C/svg%3E`;
}

function darkenColor(hex) {
  const r = Math.max(0, parseInt(hex.slice(1,3), 16) - 60);
  const g = Math.max(0, parseInt(hex.slice(3,5), 16) - 60);
  const b = Math.max(0, parseInt(hex.slice(5,7), 16) - 60);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

/* ===== STATE ===== */
let cart = loadCart();

/* ===== DOM REFS ===== */
const productsGrid = document.getElementById('productsGrid');
const cartEl = document.getElementById('cart');
const cartOverlay = document.getElementById('cartOverlay');
const cartBtn = document.getElementById('cartBtn');
const cartBadge = document.getElementById('cartBadge');
const cartClose = document.getElementById('cartClose');
const cartBody = document.getElementById('cartBody');
const cartItems = document.getElementById('cartItems');
const cartFooter = document.getElementById('cartFooter');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const checkoutForm = document.getElementById('checkoutForm');
const checkoutSummary = document.getElementById('checkoutSummary');
const orderBtn = document.getElementById('orderBtn');
const toast = document.getElementById('toast');
const header = document.getElementById('header');

let activeCategory = 'all';

/* ===== RENDER PRODUCTS ===== */
function renderProducts() {
  const filtered = activeCategory === 'all'
    ? products
    : products.filter(p => p.category === activeCategory);

  if (filtered.length === 0) {
    productsGrid.innerHTML = `<p class="products__empty">No hay productos en esta categoría.</p>`;
    return;
  }

  productsGrid.innerHTML = filtered.map((p, i) => `
    <div class="product-card ${p.category === 'panaderia' ? 'product-card--bakery' : ''}" style="animation-delay: ${i * 0.08}s">
      <div class="product-card__image-wrap">
        <img
          class="product-card__image"
          src="${getProductImage(p)}"
          alt="${p.name}"
          loading="lazy"
        />
        ${p.category === 'panaderia' ? '<img class="product-card__badge" src="sin-tacc.png" alt="Sin TACC" />' : ''}
      </div>
      <div class="product-card__body">
        <h3 class="product-card__name">${p.name}</h3>
        <p class="product-card__desc">${p.desc}</p>
        <div class="product-card__price">$${formatPrice(p.price)}</div>
        <div class="product-card__actions">
          <div class="qty-selector">
            <button class="qty-selector__btn" data-id="${p.id}" data-action="dec">−</button>
            <span class="qty-selector__value" data-id="${p.id}">${getQty(p.id)}</span>
            <button class="qty-selector__btn" data-id="${p.id}" data-action="inc">+</button>
          </div>
          <button class="product-card__add-btn" data-id="${p.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Agregar
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function getQty(id) {
  const item = cart.find(c => c.id === id);
  return item ? item.qty : 0;
}

/* ===== CART ===== */
function loadCart() {
  try {
    const saved = localStorage.getItem('kawsay_cart');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => products.some(p => p.id === item.id));
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem('kawsay_cart', JSON.stringify(cart));
}

function addToCart(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  const existing = cart.find(c => c.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, qty: 1 });
  }
  saveCart();
  updateUI();
  showToast(`${product.name} agregado al carrito`);
  animateAddBtn(id);
}

function updateQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(c => c.id !== id);
  }
  saveCart();
  updateUI();
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  saveCart();
  updateUI();
}

function getTotal() {
  return cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.id);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);
}

function getTotalFormatted() {
  return `$${formatPrice(getTotal())}`;
}

function formatPrice(price) {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/* ===== UI UPDATES ===== */
function updateUI() {
  updateBadge();
  updateProductsQty();
  renderCartItems();
  updateCartVisibility();
  updateCheckoutSummary();
}

function updateBadge() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  cartBadge.textContent = count;
  cartBadge.style.display = count > 0 ? 'flex' : 'none';
}

function updateProductsQty() {
  document.querySelectorAll('.qty-selector__value').forEach(el => {
    const id = parseInt(el.dataset.id);
    el.textContent = getQty(id);
  });
}

function renderCartItems() {
  if (cart.length === 0) {
    cartItems.innerHTML = '';
    cartBody.innerHTML = `
      <div class="cart__empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#B7C77A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        <p>Tu carrito está vacío</p>
      </div>
    `;
    return;
  }

  cartBody.innerHTML = '';
  cartBody.appendChild(cartItems);

  cartItems.innerHTML = cart.map(item => {
    const product = products.find(p => p.id === item.id);
    if (!product) return '';
    const subtotal = product.price * item.qty;
    return `
      <div class="cart-item">
        <img class="cart-item__img" src="${getProductImage(product)}" alt="${product.name}" />
        <div class="cart-item__info">
          <div class="cart-item__name">${product.name}</div>
          <div class="cart-item__price">$${formatPrice(subtotal)}</div>
          <div class="cart-item__qty">
            <button class="cart-item__qty-btn" data-id="${item.id}" data-action="dec">−</button>
            <span class="cart-item__qty-val">${item.qty}</span>
            <button class="cart-item__qty-btn" data-id="${item.id}" data-action="inc">+</button>
          </div>
        </div>
        <button class="cart-item__remove" data-id="${item.id}" aria-label="Remove item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
  }).join('');

  cartTotal.textContent = getTotalFormatted();
}

function updateCartVisibility() {
  const hasItems = cart.length > 0;
  cartFooter.style.display = hasItems ? 'block' : 'none';
}

function updateCheckoutSummary() {
  if (cart.length === 0) {
    checkoutSummary.innerHTML = `<p class="checkout__summary-empty">Aún no seleccionaste productos. Agregá productos desde la <a href="#products">sección de productos</a>.</p>`;
    return;
  }

  const itemsHTML = cart.map(item => {
    const product = products.find(p => p.id === item.id);
    if (!product) return '';
    return `<div class="checkout__summary-item"><span>${item.qty}x ${product.name}</span><span>$${formatPrice(product.price * item.qty)}</span></div>`;
  }).join('');

  checkoutSummary.innerHTML = `
    ${itemsHTML}
    <div class="checkout__summary-total"><span>Total</span><span>${getTotalFormatted()}</span></div>
  `;
}

/* ===== CART TOGGLE ===== */
function openCart() {
  cartEl.classList.add('active');
  cartOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  cartEl.classList.remove('active');
  cartOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

/* ===== WHATSAPP ===== */
function generateWhatsAppMessage(name, phone) {
  const lines = [];
  lines.push('¡Hola! Quiero hacer un pedido.');
  lines.push('');
  lines.push(`Nombre: ${name}`);
  lines.push(`Teléfono: ${phone}`);
  lines.push('');
  lines.push('Pedido:');
  lines.push('');
  cart.forEach(item => {
    const product = products.find(p => p.id === item.id);
    if (product) {
      lines.push(`* ${item.qty}x ${product.name}`);
    }
  });
  lines.push('');
  lines.push(`Total: $${formatPrice(getTotal())}`);
  lines.push('');
  lines.push('Me gustaría coordinar el pago y la entrega.');
  return lines.join('\n');
}

function orderViaWhatsApp(name, phone) {
  const message = generateWhatsAppMessage(name, phone);
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`, '_blank');
  showToast('Abriendo WhatsApp...');
}

/* ===== TOAST ===== */
let toastTimeout;

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2600);
}

/* ===== ANIMATIONS ===== */
function animateAddBtn(id) {
  const btn = document.querySelector(`.product-card__add-btn[data-id="${id}"]`);
  if (!btn) return;
  btn.classList.add('added');
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    Agregado
  `;
  setTimeout(() => {
    btn.classList.remove('added');
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Agregar
    `;
  }, 1500);
}

/* ===== ADMIN ===== */
let adminEditingId = null;
let adminImageData = null;
let adminSelectedColor = '';

const adminOverlay = document.getElementById('adminOverlay');
const adminModal = document.getElementById('adminModal');
const adminClose = document.getElementById('adminClose');
const adminFooterBtn = document.getElementById('adminFooterBtn');
const adminPinView = document.getElementById('adminPinView');
const adminDashboardView = document.getElementById('adminDashboardView');
const adminFormView = document.getElementById('adminFormView');
const adminPinInput = document.getElementById('adminPinInput');
const adminPinBtn = document.getElementById('adminPinBtn');
const adminPinError = document.getElementById('adminPinError');
const adminTableBody = document.getElementById('adminTableBody');
const adminEmpty = document.getElementById('adminEmpty');
const adminAddBtn = document.getElementById('adminAddBtn');
const adminForm = document.getElementById('adminForm');
const adminFormTitle = document.getElementById('adminFormTitle');
const adminFormName = document.getElementById('adminFormName');
const adminFormDesc = document.getElementById('adminFormDesc');
const adminFormPrice = document.getElementById('adminFormPrice');
const adminFormSubmit = document.getElementById('adminFormSubmit');
const adminFormCancel = document.getElementById('adminFormCancel');
const adminFormImage = document.getElementById('adminFormImage');
const adminUploadPreview = document.getElementById('adminUploadPreview');
const adminImageRemove = document.getElementById('adminImageRemove');
const adminColorPicker = document.getElementById('adminColorPicker');

function getAdminCategory() {
  const checked = document.querySelector('input[name="category"]:checked');
  return checked ? checked.value : 'fruta';
}

function setAdminCategory(val) {
  document.querySelectorAll('input[name="category"]').forEach(r => r.checked = r.value === val);
}

function openAdmin() {
  adminOverlay.classList.add('active');
  adminModal.classList.add('active');
  showAdminView('pin');
  adminPinInput.value = '';
  adminPinError.classList.remove('show');
  adminPinInput.focus();
  document.body.style.overflow = 'hidden';
}

function closeAdmin() {
  adminOverlay.classList.remove('active');
  adminModal.classList.remove('active');
  document.body.style.overflow = '';
}

function showAdminView(view) {
  adminPinView.style.display = view === 'pin' ? '' : 'none';
  adminDashboardView.style.display = view === 'dashboard' ? '' : 'none';
  adminFormView.style.display = view === 'form' ? '' : 'none';
}

function renderAdminTable() {
  products = getProducts();
  if (products.length === 0) {
    adminTableBody.innerHTML = '';
    adminEmpty.style.display = 'block';
    return;
  }
  adminEmpty.style.display = 'none';
  adminTableBody.innerHTML = products.map(p => `
    <tr>
      <td><img class="admin-table__img" src="${getProductImage(p)}" alt="${p.name}" /></td>
      <td class="admin-table__name">${p.name}</td>
      <td class="admin-table__price">$${formatPrice(p.price)}</td>
      <td>
        <div class="admin-table__actions">
          <button class="admin-table__btn admin-table__btn--edit" data-id="${p.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar
          </button>
          <button class="admin-table__btn admin-table__btn--delete" data-id="${p.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function resetAdminForm() {
  adminFormName.value = '';
  adminFormDesc.value = '';
  adminFormPrice.value = '';
  adminFormImage.value = '';
  adminImageData = null;
  adminEditingId = null;
  adminSelectedColor = '';
  adminFormTitle.textContent = 'Agregar Producto';
  adminFormSubmit.textContent = 'Guardar Producto';
  updateAdminUploadPreview();
  resetAdminColorSwatches();
  setAdminCategory('fruta');
}

function resetAdminColorSwatches() {
  document.querySelectorAll('.admin-colors__swatch').forEach(s => s.classList.remove('active'));
  adminColorPicker.value = '#B7C77A';
}

function updateAdminUploadPreview() {
  if (adminImageData) {
    adminUploadPreview.innerHTML = `<img src="${adminImageData}" alt="Preview" />`;
    adminImageRemove.style.display = 'inline';
  } else {
    adminUploadPreview.innerHTML = `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#B7C77A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      <span>Sin imagen</span>
    `;
    adminImageRemove.style.display = 'none';
  }
}

function openAdminForm(product) {
  showAdminView('form');
  resetAdminForm();
  if (product) {
    adminEditingId = product.id;
    adminFormTitle.textContent = 'Editar Producto';
    adminFormSubmit.textContent = 'Guardar Cambios';
    adminFormName.value = product.name;
    adminFormDesc.value = product.desc;
    adminFormPrice.value = product.price;
    adminImageData = product.image || null;
    adminSelectedColor = product.color || '#B7C77A';
    setAdminCategory(product.category || 'fruta');
    updateAdminUploadPreview();
    document.querySelectorAll('.admin-colors__swatch').forEach(s => {
      if (s.dataset.color === product.color) s.classList.add('active');
    });
    adminColorPicker.value = product.color || '#B7C77A';
  }
}

function reloadProductsAndUI() {
  products = getProducts();
  renderProducts();
  updateUI();
}

/* ===== EVENT DELEGATION ===== */
document.addEventListener('click', async e => {
  const addBtn = e.target.closest('.product-card__add-btn');
  if (addBtn) {
    const id = parseInt(addBtn.dataset.id);
    addToCart(id);
    return;
  }

  const qtyBtn = e.target.closest('.qty-selector__btn');
  if (qtyBtn) {
    const id = parseInt(qtyBtn.dataset.id);
    updateQty(id, qtyBtn.dataset.action === 'inc' ? 1 : -1);
    return;
  }

  const cartQtyBtn = e.target.closest('.cart-item__qty-btn');
  if (cartQtyBtn) {
    const id = parseInt(cartQtyBtn.dataset.id);
    updateQty(id, cartQtyBtn.dataset.action === 'inc' ? 1 : -1);
    return;
  }

  const removeBtn = e.target.closest('.cart-item__remove');
  if (removeBtn) {
    const id = parseInt(removeBtn.dataset.id);
    removeFromCart(id);
    return;
  }

  const editBtn = e.target.closest('.admin-table__btn--edit');
  if (editBtn) {
    const id = parseInt(editBtn.dataset.id);
    const product = products.find(p => p.id === id);
    if (product) openAdminForm(product);
  }

  const deleteBtn = e.target.closest('.admin-table__btn--delete');
  if (deleteBtn) {
    const id = parseInt(deleteBtn.dataset.id);
    const product = products.find(p => p.id === id);
    if (product && confirm(`¿Eliminar "${product.name}"?`)) {
      await deleteProduct(id);
      reloadProductsAndUI();
      renderAdminTable();
      showToast(`${product.name} eliminado`);
    }
  }

  const colorSwatch = e.target.closest('.admin-colors__swatch');
  if (colorSwatch) {
    document.querySelectorAll('.admin-colors__swatch').forEach(s => s.classList.remove('active'));
    colorSwatch.classList.add('active');
    if (colorSwatch.dataset.color === 'custom') {
      adminColorPicker.click();
    } else {
      adminSelectedColor = colorSwatch.dataset.color;
      adminColorPicker.value = colorSwatch.dataset.color;
    }
  }
});

adminColorPicker.addEventListener('input', () => {
  adminSelectedColor = adminColorPicker.value;
  document.querySelectorAll('.admin-colors__swatch').forEach(s => s.classList.remove('active'));
});

adminFormImage.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    adminImageData = ev.target.result;
    updateAdminUploadPreview();
  };
  reader.readAsDataURL(file);
});

adminImageRemove.addEventListener('click', () => {
  adminImageData = null;
  adminFormImage.value = '';
  updateAdminUploadPreview();
});

adminForm.addEventListener('submit', async e => {
  e.preventDefault();
  const name = adminFormName.value.trim();
  const desc = adminFormDesc.value.trim();
  const price = parseInt(adminFormPrice.value);

  if (!name || !desc || !price) {
    showToast('Completá todos los campos');
    return;
  }

  const data = {
    name,
    desc,
    price,
    image: adminImageData || '',
    color: adminSelectedColor || '#B7C77A',
    category: getAdminCategory()
  };

  if (adminEditingId) {
    await updateProduct(adminEditingId, data);
    showToast('Producto actualizado');
  } else {
    await addProduct(data);
    showToast('Producto agregado');
  }

  reloadProductsAndUI();
  renderAdminTable();
  showAdminView('dashboard');
});

adminPinBtn.addEventListener('click', () => {
  if (adminPinInput.value === ADMIN_PIN) {
    adminPinError.classList.remove('show');
    renderAdminTable();
    showAdminView('dashboard');
  } else {
    adminPinError.classList.add('show');
    adminPinInput.value = '';
    adminPinInput.focus();
  }
});

adminPinInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') adminPinBtn.click();
});

adminAddBtn.addEventListener('click', () => openAdminForm(null));

adminFormCancel.addEventListener('click', () => {
  renderAdminTable();
  showAdminView('dashboard');
});

adminFooterBtn.addEventListener('click', openAdmin);
adminOverlay.addEventListener('click', closeAdmin);
adminClose.addEventListener('click', closeAdmin);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (adminModal.classList.contains('active')) {
      if (adminFormView.style.display !== 'none') {
        renderAdminTable();
        showAdminView('dashboard');
      } else {
        closeAdmin();
      }
    } else {
      closeCart();
    }
  }
});

/* ===== HEADER SCROLL ===== */
function handleScroll() {
  header.classList.toggle('header--scrolled', window.scrollY > 60);
}

/* ===== EVENT LISTENERS ===== */
cartBtn.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

checkoutBtn.addEventListener('click', () => {
  closeCart();
  document.getElementById('checkout').scrollIntoView({ behavior: 'smooth' });
});

checkoutForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('fullName').value.trim();
  const phone = document.getElementById('phone').value.trim();

  if (!name) {
    showToast('Por favor ingresá tu nombre');
    return;
  }
  if (!phone) {
    showToast('Por favor ingresá tu teléfono');
    return;
  }
  if (cart.length === 0) {
    showToast('Tu carrito está vacío');
    return;
  }

  orderViaWhatsApp(name, phone);
});

window.addEventListener('scroll', handleScroll, { passive: true });

/* ===== CATEGORY TABS ===== */
document.addEventListener('click', e => {
  const tab = e.target.closest('.products__tab');
  if (!tab) return;
  document.querySelectorAll('.products__tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  activeCategory = tab.dataset.category;
  document.getElementById('productsSub').classList.toggle('show', activeCategory === 'panaderia');
  renderProducts();
});

/* ===== INIT ===== */
renderProducts();
updateUI();
syncProducts().then(p => {
  products = p;
  cart = loadCart();
  saveCart();
  renderProducts();
  updateUI();
});
