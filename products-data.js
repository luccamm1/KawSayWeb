const ADMIN_PIN = '2210';

const SUPABASE_URL = 'https://qdtszwhakgtioazjouho.supabase.co/rest/v1';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkdHN6d2hha2d0aW9hempvdWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjU5MDYsImV4cCI6MjA5NTY0MTkwNn0.l6EMZXxpFhyiEZjY9SXGAYOr4r5j0cvNan_f30bVwFs';

function getDefaultProducts() {
  return [
    { id: 1,  name: 'Frutilla',      desc: 'Frutillas enteras congeladas, dulces y jugosas. Perfectas para smoothies, postres y toppings.',              price: 8500,  image: '', color: '#E8B4B4', category: 'fruta' },
    { id: 2,  name: 'Mango',         desc: 'Trozos de mango dorado congelados en su punto óptimo de dulzor. Ideales para smoothies tropicales y bowls.', price: 9000,  image: '', color: '#F5D7A3', category: 'fruta' },
    { id: 3,  name: 'Kiwi',          desc: 'Rodajas de kiwi verde repletas de vitamina C. Un toque refrescante para cualquier mezcla.',                price: 10000, image: '', color: '#C5E0B4', category: 'fruta' },
    { id: 4,  name: 'Durazno',       desc: 'Trozos de durazno dulce congelados frescos. Ideales para postres, smoothies y comidas para bebés.',         price: 8000,  image: '', color: '#FAD7B5', category: 'fruta' },
    { id: 5,  name: 'Brócoli',       desc: 'Flores de brócoli frescos, blanqueados y congelados. Listos para cocinar al vapor o saltear.',              price: 6500,  image: '', color: '#B5D6A7', category: 'verdura' },
    { id: 6,  name: 'Mix de Frutos Rojos', desc: 'Una mezcla de frutillas, arándanos, frambuesas y moras. Perfecta para cualquier ocasión.',            price: 12000, image: '', color: '#D4A5B9', category: 'fruta' },
    { id: 7,  name: 'Pan sin TACC',    desc: 'Pan de molde sin gluten, esponjoso y delicioso. Ideal para tostadas y sándwiches.',                        price: 4500,  image: '', color: '#E8D5B7', category: 'panaderia' },
    { id: 8,  name: 'Prepizza sin TACC', desc: 'Base de pizza sin gluten lista para hornear. Agregá tus ingredientes favoritos.',                      price: 3800,  image: '', color: '#F0DCA8', category: 'panaderia' },
    { id: 9,  name: 'Budín sin TACC',  desc: 'Budín de vainilla sin gluten, húmedo y suave. Perfecto para la merienda.',                               price: 5200,  image: '', color: '#F5E6C8', category: 'panaderia' }
  ];
}

function readLocalProducts() {
  try {
    const saved = localStorage.getItem('kawsay_products');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return null;
}

function writeLocalProducts(products) {
  localStorage.setItem('kawsay_products', JSON.stringify(products));
}

function getProducts() {
  const local = readLocalProducts();
  if (local) return local;
  const defaults = getDefaultProducts();
  writeLocalProducts(defaults);
  return defaults;
}

async function syncProducts() {
  try {
    const res = await fetch(`${SUPABASE_URL}/products?order=id.asc`, {
      headers: { apikey: SUPABASE_KEY, Accept: 'application/json' }
    });
    if (!res.ok) throw new Error('Supabase unavailable');
    const data = await res.json();
    if (data.length > 0) {
      writeLocalProducts(data);
      return data;
    }
    const local = readLocalProducts() || getDefaultProducts();
    for (const p of local) {
      const { id, created_at, ...rest } = p;
      await fetch(`${SUPABASE_URL}/products`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(rest)
      });
    }
    const res2 = await fetch(`${SUPABASE_URL}/products?order=id.asc`, {
      headers: { apikey: SUPABASE_KEY, Accept: 'application/json' }
    });
    const data2 = await res2.json();
    writeLocalProducts(data2);
    return data2;
  } catch {
    return getProducts();
  }
}

async function addProduct(product) {
  const { id, created_at, ...body } = product;
  try {
    const res = await fetch(`${SUPABASE_URL}/products?select=*`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      const created = await res.json();
      const row = Array.isArray(created) ? created[0] : created;
      const products = getProducts();
      products.push(row);
      writeLocalProducts(products);
      return products;
    }
  } catch {}
  const products = getProducts();
  product.id = Date.now();
  products.push(product);
  writeLocalProducts(products);
  return products;
}

async function updateProduct(id, data) {
  const { id: _, created_at, ...body } = data;
  try {
    const res = await fetch(`${SUPABASE_URL}/products?id=eq.${id}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Supabase update failed');
  } catch {}
  const products = getProducts();
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return null;
  products[idx] = { ...products[idx], ...body };
  writeLocalProducts(products);
  return products;
}

async function deleteProduct(id) {
  try {
    await fetch(`${SUPABASE_URL}/products?id=eq.${id}`, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_KEY }
    });
  } catch {}
  let products = getProducts();
  products = products.filter(p => p.id !== id);
  writeLocalProducts(products);
  return products;
}
