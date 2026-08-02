"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import readXlsxFile from "read-excel-file/browser";
import {
  BarChart3,
  Box,
  Calculator,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileSpreadsheet,
  LogOut,
  Menu,
  Moon,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShoppingCart,
  Sun,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { apiFetch } from "@/lib/api";
import { formatUsd, formatVes, toNumber, usdToVes } from "@/lib/money";
import { getBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { AppRole, Product, ProductInput, Profile } from "@/lib/types";

type View = "prices" | "sale" | "products" | "stock" | "import" | "reports" | "users" | "settings";
type ExchangeRate = { rate: number | null; source: string; reference_at: string | null; fetched_at: string | null; is_manual: boolean };
type CartLine = { product: Product; quantity: number };

const nav: Array<{ id: View; label: string; icon: typeof Search; roles?: AppRole[] }> = [
  { id: "prices", label: "Consultar precio", icon: Search },
  { id: "sale", label: "Nueva venta", icon: ShoppingCart, roles: ["admin", "cashier"] },
  { id: "products", label: "Productos", icon: Box },
  { id: "stock", label: "Inventario", icon: Warehouse, roles: ["admin", "stock"] },
  { id: "import", label: "Importar", icon: FileSpreadsheet, roles: ["admin", "stock"] },
  { id: "reports", label: "Reportes", icon: BarChart3, roles: ["admin"] },
  { id: "users", label: "Usuarios", icon: Users, roles: ["admin"] },
  { id: "settings", label: "Configuración", icon: Settings, roles: ["admin"] },
];

function roleName(role: AppRole): string {
  return { admin: "Administrador", cashier: "Caja", stock: "Inventario" }[role];
}

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="banner banner-error" role="alert">
      <span>{message}</span><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
    </div>
  );
}

function SetupPending() {
  return (
    <main className="center-page">
      <section className="setup-card">
        <div className="brand-mark"><span>V</span></div>
        <h1>Configuración pendiente</h1>
        <p>Defina las variables públicas de Supabase en Vercel para conectar la aplicación.</p>
        <code>NEXT_PUBLIC_SUPABASE_URL</code>
        <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>
      </section>
    </main>
  );
}

function AuthScreen() {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const supabase = getBrowserSupabase();
      if (register) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, store_name: storeName } },
        });
        if (error) throw error;
        setMessage("Cuenta creada. Confirme el correo si la verificación está activa.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible autenticar.");
    } finally { setBusy(false); }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="flag-stripe yellow" /><div className="flag-stripe blue" /><div className="flag-stripe red" />
        <div className="auth-copy">
          <div className="brand-mark brand-mark-large"><span>V</span></div>
          <h1>Vevntas</h1><p>Ventas simples, control total.</p>
        </div>
      </section>
      <section className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <div><span className="eyebrow">ACCESO SEGURO</span><h2>{register ? "Crear tienda" : "Bienvenido"}</h2><p>{register ? "Registre el primer administrador." : "Ingrese a su punto de venta."}</p></div>
          {register && <><label>Nombre completo<input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></label><label>Nombre de la tienda<input required value={storeName} onChange={(e) => setStoreName(e.target.value)} /></label></>}
          <label>Correo electrónico<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Contraseña<input type="password" minLength={8} required autoComplete={register ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {message && <div className="inline-message">{message}</div>}
          <button className="button primary full" disabled={busy}>{busy ? "Procesando…" : register ? "Crear cuenta" : "Ingresar"}</button>
          <button type="button" className="text-button" onClick={() => { setRegister(!register); setMessage(""); }}>{register ? "Ya tengo una cuenta" : "Crear la primera cuenta"}</button>
        </form>
      </section>
    </main>
  );
}

function PriceView({ products, rate, canSeeCost }: { products: Product[]; rate: number; canSeeCost: boolean }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products.slice(0, 8);
    return products.filter((p) => [p.code, p.barcode, p.name, p.category].some((v) => v?.toLowerCase().includes(term))).slice(0, 12);
  }, [products, search]);

  return (
    <div className="view-grid price-layout">
      <section className="panel search-panel">
        <div className="panel-heading"><div><span className="eyebrow">FUNCIÓN PRINCIPAL</span><h2>Consulta de precio</h2><p>Busque por nombre, código o código de barras.</p></div><Calculator className="heading-icon" /></div>
        <div className="search-box"><Search size={22} /><input autoFocus placeholder="Ej.: arroz, 00125 o escanee el código" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="result-list">
          {results.map((product) => <button key={product.id} className={`result-row ${selected?.id === product.id ? "active" : ""}`} onClick={() => setSelected(product)}><div><strong>{product.name}</strong><span>{product.code}{product.category ? ` · ${product.category}` : ""}</span></div><div className="result-price"><strong>{formatUsd(product.sale_price_usd)}</strong><span>{rate > 0 ? formatVes(usdToVes(product.sale_price_usd, rate)) : "Sin tasa"}</span></div><ChevronRight size={18} /></button>)}
          {!results.length && <div className="empty-state"><Search size={28} /><p>No se encontraron productos.</p></div>}
        </div>
      </section>
      <aside className="panel product-spotlight">
        {selected ? <>
          <div className="spotlight-code">{selected.code}</div><h2>{selected.name}</h2><p>{selected.category || "Sin categoría"} · {selected.unit}</p>
          <div className="price-card primary-price"><span>Precio de venta</span><strong>{formatUsd(selected.sale_price_usd)}</strong><b>{rate > 0 ? formatVes(usdToVes(selected.sale_price_usd, rate)) : "Configure la tasa VES"}</b></div>
          {canSeeCost && <div className="price-card cost-price"><span>Costo de compra</span><strong>{formatUsd(selected.purchase_price_usd || 0)}</strong><b>{rate > 0 ? formatVes(usdToVes(selected.purchase_price_usd || 0, rate)) : "—"}</b></div>}
          <div className="stock-line"><span>Existencia disponible</span><strong>{selected.stock_quantity} {selected.unit}</strong></div>
        </> : <div className="empty-state tall"><CircleDollarSign size={48} /><h3>Seleccione un producto</h3><p>El precio en dólares y bolívares aparecerá aquí.</p></div>}
      </aside>
    </div>
  );
}

function SaleView({ products, rate, reload }: { products: Product[]; rate: number; reload: () => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [currency, setCurrency] = useState<"USD" | "VES">("USD");
  const [method, setMethod] = useState<"cash" | "mobile_payment" | "transfer" | "card" | "other">("cash");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const totalUsd = cart.reduce((sum, line) => sum + line.product.sale_price_usd * line.quantity, 0);
  const totalVes = usdToVes(totalUsd, rate);
  const matches = products.filter((p) => p.stock_quantity > 0 && (!query || `${p.code} ${p.name} ${p.barcode || ""}`.toLowerCase().includes(query.toLowerCase()))).slice(0, 8);

  function add(product: Product) {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) return current.map((line) => line.product.id === product.id ? { ...line, quantity: Math.min(line.quantity + 1, product.stock_quantity) } : line);
      return [...current, { product, quantity: 1 }];
    });
  }
  function quantity(id: string, value: number) {
    setCart((current) => current.map((line) => line.product.id === id ? { ...line, quantity: Math.max(1, Math.min(value, line.product.stock_quantity)) } : line));
  }
  async function finish() {
    if (!cart.length || rate <= 0) return;
    setBusy(true); setMessage("");
    try {
      await apiFetch<{ data: { id: string } }>("/api/sales", { method: "POST", body: JSON.stringify({
        items: cart.map((line) => ({ product_id: line.product.id, quantity: line.quantity })),
        payments: [{ method, currency, amount: currency === "USD" ? totalUsd : totalVes }],
      }) });
      setCart([]); setMessage("Venta registrada correctamente."); await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Error al registrar la venta."); }
    finally { setBusy(false); }
  }

  return <div className="view-grid sale-layout">
    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">PUNTO DE VENTA</span><h2>Nueva venta</h2><p>Seleccione productos disponibles.</p></div><ShoppingCart className="heading-icon" /></div>
      <div className="search-box"><Search size={20} /><input placeholder="Buscar producto" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      <div className="product-grid">{matches.map((p) => <button key={p.id} className="product-tile" onClick={() => add(p)}><div className="tile-icon"><Box /></div><strong>{p.name}</strong><span>{p.code} · Stock {p.stock_quantity}</span><b>{formatUsd(p.sale_price_usd)}</b></button>)}</div>
    </section>
    <aside className="panel checkout"><div className="panel-heading compact"><div><h2>Carrito</h2><p>{cart.length} producto(s)</p></div></div>
      <div className="cart-lines">{cart.map((line) => <div className="cart-line" key={line.product.id}><div><strong>{line.product.name}</strong><span>{formatUsd(line.product.sale_price_usd)} c/u</span></div><input type="number" min={1} max={line.product.stock_quantity} value={line.quantity} onChange={(e) => quantity(line.product.id, Number(e.target.value))} /><button className="icon-button" onClick={() => setCart((c) => c.filter((x) => x.product.id !== line.product.id))}><X size={17} /></button></div>)}{!cart.length && <div className="empty-state"><ShoppingCart size={30} /><p>El carrito está vacío.</p></div>}</div>
      <div className="checkout-total"><span>Total</span><strong>{formatUsd(totalUsd)}</strong><b>{rate > 0 ? formatVes(totalVes) : "Sin tasa"}</b></div>
      <div className="form-row"><label>Moneda<select value={currency} onChange={(e) => setCurrency(e.target.value as "USD" | "VES")}><option value="USD">Dólar (USD)</option><option value="VES">Bolívar (VES)</option></select></label><label>Pago<select value={method} onChange={(e) => setMethod(e.target.value as typeof method)}><option value="cash">Efectivo</option><option value="mobile_payment">Pago móvil</option><option value="transfer">Transferencia</option><option value="card">Tarjeta</option><option value="other">Otro</option></select></label></div>
      {message && <div className="inline-message">{message}</div>}<button className="button primary full" disabled={busy || !cart.length || rate <= 0} onClick={finish}>{busy ? "Registrando…" : "Finalizar venta"}</button>
    </aside>
  </div>;
}

const emptyProduct: ProductInput = { code: "", name: "", barcode: "", category: "", unit: "UNIDAD", sale_price_usd: 0, purchase_price_usd: 0, stock_quantity: 0, minimum_stock: 0 };

function ProductsView({ products, canEdit, reload }: { products: Product[]; canEdit: boolean; reload: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false); const [form, setForm] = useState<ProductInput>(emptyProduct); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function save(event: FormEvent) { event.preventDefault(); setBusy(true); setMessage(""); try { await apiFetch("/api/products", { method: "POST", body: JSON.stringify(form) }); setForm(emptyProduct); setShowForm(false); await reload(); } catch (e) { setMessage(e instanceof Error ? e.message : "Error al guardar."); } finally { setBusy(false); } }
  const set = (key: keyof ProductInput, value: string | number) => setForm((f) => ({ ...f, [key]: value }));
  return <section className="panel"><div className="panel-heading"><div><span className="eyebrow">CATÁLOGO</span><h2>Productos</h2><p>{products.length} productos activos.</p></div>{canEdit && <button className="button primary" onClick={() => setShowForm(!showForm)}><Plus size={18} />Nuevo producto</button>}</div>
    {showForm && <form className="product-form" onSubmit={save}><label>Código<input required value={form.code} onChange={(e) => set("code", e.target.value)} /></label><label>Nombre<input required value={form.name} onChange={(e) => set("name", e.target.value)} /></label><label>Código de barras<input value={form.barcode || ""} onChange={(e) => set("barcode", e.target.value)} /></label><label>Categoría<input value={form.category || ""} onChange={(e) => set("category", e.target.value)} /></label><label>Unidad<input value={form.unit || ""} onChange={(e) => set("unit", e.target.value)} /></label><label>Precio venta USD<input type="number" step="0.01" min="0" value={form.sale_price_usd} onChange={(e) => set("sale_price_usd", Number(e.target.value))} /></label><label>Costo compra USD<input type="number" step="0.01" min="0" value={form.purchase_price_usd} onChange={(e) => set("purchase_price_usd", Number(e.target.value))} /></label><label>Existencia inicial<input type="number" step="0.001" min="0" value={form.stock_quantity || 0} onChange={(e) => set("stock_quantity", Number(e.target.value))} /></label><label>Stock mínimo<input type="number" step="0.001" min="0" value={form.minimum_stock || 0} onChange={(e) => set("minimum_stock", Number(e.target.value))} /></label><div className="form-actions">{message && <span>{message}</span>}<button className="button primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div></form>}
    <div className="table-wrap"><table><thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Venta USD</th>{canEdit && <th>Compra USD</th>}<th>Existencia</th><th>Estado</th></tr></thead><tbody>{products.map((p) => <tr key={p.id}><td><code>{p.code}</code></td><td><strong>{p.name}</strong><small>{p.barcode || "Sin código de barras"}</small></td><td>{p.category || "—"}</td><td>{formatUsd(p.sale_price_usd)}</td>{canEdit && <td>{formatUsd(p.purchase_price_usd || 0)}</td>}<td>{p.stock_quantity} {p.unit}</td><td><span className={`badge ${p.stock_quantity <= p.minimum_stock ? "danger" : "success"}`}>{p.stock_quantity <= p.minimum_stock ? "Stock bajo" : "Disponible"}</span></td></tr>)}</tbody></table></div>
  </section>;
}

function StockView({ products, reload }: { products: Product[]; reload: () => Promise<void> }) {
  const [productId, setProductId] = useState(""); const [delta, setDelta] = useState(0); const [reason, setReason] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setMessage(""); try { await apiFetch("/api/stock", { method: "POST", body: JSON.stringify({ product_id: productId, quantity_delta: delta, reason }) }); setDelta(0); setReason(""); setMessage("Existencia actualizada."); await reload(); } catch (error) { setMessage(error instanceof Error ? error.message : "Error al ajustar."); } finally { setBusy(false); } }
  const low = products.filter((p) => p.stock_quantity <= p.minimum_stock);
  return <div className="view-grid stock-layout"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">CONTROL</span><h2>Ajuste de inventario</h2><p>Registre entradas o correcciones con motivo.</p></div><Warehouse className="heading-icon" /></div><form className="stack-form" onSubmit={submit}><label>Producto<select required value={productId} onChange={(e) => setProductId(e.target.value)}><option value="">Seleccione</option>{products.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name} (actual: {p.stock_quantity})</option>)}</select></label><label>Cantidad del movimiento<input type="number" step="0.001" required value={delta} onChange={(e) => setDelta(Number(e.target.value))} /><small>Use positivo para entrada y negativo para salida.</small></label><label>Motivo<textarea required minLength={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: recepción de mercancía" /></label>{message && <div className="inline-message">{message}</div>}<button className="button primary" disabled={busy || !productId || delta === 0}>{busy ? "Procesando…" : "Registrar movimiento"}</button></form></section><aside className="panel"><div className="panel-heading compact"><div><h2>Alertas de stock</h2><p>{low.length} producto(s) requieren atención.</p></div></div><div className="alert-list">{low.map((p) => <div className="alert-row" key={p.id}><PackagePlus /><div><strong>{p.name}</strong><span>{p.stock_quantity} disponibles · mínimo {p.minimum_stock}</span></div></div>)}{!low.length && <div className="empty-state"><Warehouse size={32} /><p>Todos los niveles están saludables.</p></div>}</div></aside></div>;
}

const headerAliases: Record<string, keyof ProductInput> = {
  codigo: "code", código: "code", code: "code", producto: "name", nombre: "name", name: "name", barras: "barcode", barcode: "barcode", categoria: "category", categoría: "category", category: "category", unidad: "unit", unit: "unit", precio_venta_usd: "sale_price_usd", venta_usd: "sale_price_usd", sale_price_usd: "sale_price_usd", costo_compra_usd: "purchase_price_usd", compra_usd: "purchase_price_usd", purchase_price_usd: "purchase_price_usd", existencia: "stock_quantity", stock: "stock_quantity", stock_quantity: "stock_quantity", stock_minimo: "minimum_stock", mínimo: "minimum_stock", minimum_stock: "minimum_stock",
};

function ImportView({ reload }: { reload: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null); const [rows, setRows] = useState<ProductInput[]>([]); const [updateStock, setUpdateStock] = useState(false); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function parse(selected: File | null) { setFile(selected); setRows([]); setMessage(""); if (!selected) return; if (selected.size > 5 * 1024 * 1024) { setMessage("El archivo supera 5 MB."); return; } try { const sheet = await readXlsxFile(selected); if (sheet.length < 2) throw new Error("La hoja no contiene filas de productos."); const headers = sheet[0].map((cell) => String(cell || "").trim().toLowerCase().replaceAll(" ", "_")); const parsed = sheet.slice(1).filter((r) => r.some((v) => v != null && v !== "")).map((r) => { const record: Partial<ProductInput> = {}; headers.forEach((h, i) => { const key = headerAliases[h]; if (!key) return; const value = r[i]; if (["sale_price_usd", "purchase_price_usd", "stock_quantity", "minimum_stock"].includes(key)) (record as Record<string, unknown>)[key] = toNumber(value); else (record as Record<string, unknown>)[key] = value == null ? "" : String(value).trim(); }); return { ...emptyProduct, ...record }; }); setRows(parsed); } catch (e) { setMessage(e instanceof Error ? e.message : "No fue posible leer el archivo."); } }
  async function send() { if (!file || !rows.length) return; setBusy(true); setMessage(""); try { await apiFetch("/api/imports/products", { method: "POST", body: JSON.stringify({ file_name: file.name, update_stock: updateStock, rows }) }); setMessage(`${rows.length} productos procesados.`); setFile(null); setRows([]); await reload(); } catch (e) { setMessage(e instanceof Error ? e.message : "Error en la importación."); } finally { setBusy(false); } }
  return <section className="panel"><div className="panel-heading"><div><span className="eyebrow">CARGA MASIVA</span><h2>Importar productos</h2><p>Archivo XLSX de hasta 5 MB y 5.000 filas.</p></div><FileSpreadsheet className="heading-icon" /></div><div className="import-zone"><input id="xlsx" type="file" accept=".xlsx" onChange={(e) => parse(e.target.files?.[0] || null)} /><label htmlFor="xlsx"><FileSpreadsheet size={38} /><strong>{file ? file.name : "Seleccione una planilla XLSX"}</strong><span>Código, nombre, precio, costo, existencia y stock mínimo.</span></label></div><label className="check-line"><input type="checkbox" checked={updateStock} onChange={(e) => setUpdateStock(e.target.checked)} />Actualizar la existencia de productos ya registrados</label>{rows.length > 0 && <div className="preview"><strong>Vista previa: {rows.length} filas</strong><div className="table-wrap"><table><thead><tr><th>Código</th><th>Nombre</th><th>Venta USD</th><th>Compra USD</th><th>Stock</th></tr></thead><tbody>{rows.slice(0, 8).map((r, i) => <tr key={`${r.code}-${i}`}><td>{r.code}</td><td>{r.name}</td><td>{r.sale_price_usd}</td><td>{r.purchase_price_usd}</td><td>{r.stock_quantity}</td></tr>)}</tbody></table></div></div>}{message && <div className="inline-message">{message}</div>}<button className="button primary" disabled={busy || !rows.length} onClick={send}>{busy ? "Importando…" : `Importar ${rows.length || ""} productos`}</button></section>;
}

function ReportsView({ products }: { products: Product[] }) {
  const inventorySale = products.reduce((s, p) => s + p.stock_quantity * p.sale_price_usd, 0); const inventoryCost = products.reduce((s, p) => s + p.stock_quantity * (p.purchase_price_usd || 0), 0); const low = products.filter((p) => p.stock_quantity <= p.minimum_stock).length;
  return <><div className="metric-grid"><div className="metric-card"><Box /><span>Productos activos</span><strong>{products.length}</strong></div><div className="metric-card"><CircleDollarSign /><span>Valor de venta del stock</span><strong>{formatUsd(inventorySale)}</strong></div><div className="metric-card"><ClipboardList /><span>Costo estimado del stock</span><strong>{formatUsd(inventoryCost)}</strong></div><div className="metric-card"><Warehouse /><span>Alertas de mínimo</span><strong>{low}</strong></div></div><section className="panel"><div className="panel-heading"><div><h2>Resumen de inventario</h2><p>Indicadores calculados con los datos actuales.</p></div></div><div className="report-bars">{products.slice().sort((a,b) => b.stock_quantity - a.stock_quantity).slice(0,10).map((p) => <div className="bar-row" key={p.id}><span>{p.name}</span><div><i style={{ width: `${Math.min(100, p.stock_quantity / Math.max(1, ...products.map((x) => x.stock_quantity)) * 100)}%` }} /></div><b>{p.stock_quantity}</b></div>)}</div></section></>;
}

function SettingsView({ rate, reload }: { rate: ExchangeRate; reload: () => Promise<void> }) {
  const [value, setValue] = useState(rate.rate || 0); const [source, setSource] = useState(rate.source || "MANUAL"); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function save(e: FormEvent) { e.preventDefault(); setBusy(true); try { await apiFetch("/api/exchange-rate", { method: "POST", body: JSON.stringify({ rate: value, source }) }); setMessage("Tasa actualizada."); await reload(); } catch (error) { setMessage(error instanceof Error ? error.message : "Error al guardar."); } finally { setBusy(false); } }
  return <div className="view-grid settings-layout"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">MONEDAS</span><h2>Tasa USD → VES</h2><p>La tasa queda registrada en cada venta para conservar el histórico.</p></div><RefreshCw className="heading-icon" /></div><form className="stack-form" onSubmit={save}><label>Bolívares por 1 USD<input type="number" min="0.000001" step="0.000001" required value={value} onChange={(e) => setValue(Number(e.target.value))} /></label><label>Fuente<input required value={source} onChange={(e) => setSource(e.target.value)} placeholder="BCV o MANUAL" /></label>{message && <div className="inline-message">{message}</div>}<button className="button primary" disabled={busy}>{busy ? "Guardando…" : "Guardar nueva tasa"}</button></form></section><aside className="panel"><h3>Tasa vigente</h3><div className="rate-display"><span>1 USD</span><strong>{rate.rate ? `${rate.rate.toLocaleString("es-VE")} VES` : "Sin configurar"}</strong><small>Fuente: {rate.source || "—"}</small></div></aside></div>;
}

function Placeholder({ type }: { type: "users" }) { return <section className="panel"><div className="empty-state tall"><Users size={44} /><h2>Gestión de usuarios</h2><p>La base ya soporta perfiles Administrador, Caja e Inventario. La invitación administrativa queda reservada para la siguiente iteración.</p></div></section>; }

export function VevntasApp() {
  const [session, setSession] = useState<Session | null>(null); const [profile, setProfile] = useState<Profile | null>(null); const [products, setProducts] = useState<Product[]>([]); const [rate, setRate] = useState<ExchangeRate>({ rate: null, source: "Sin configurar", reference_at: null, fetched_at: null, is_manual: false }); const [view, setView] = useState<View>("prices"); const [dark, setDark] = useState(false); const [menu, setMenu] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const configured = isSupabaseConfigured();

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [productResponse, rateResponse] = await Promise.all([
        apiFetch<{ data: Product[]; profile: Profile }>("/api/products"),
        apiFetch<{ data: ExchangeRate }>("/api/exchange-rate"),
      ]);
      setProducts(productResponse.data); setProfile(productResponse.profile); setRate(rateResponse.data);
    } catch (e) { setError(e instanceof Error ? e.message : "No fue posible cargar los datos."); }
  }, []);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    const supabase = getBrowserSupabase();
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); if (!nextSession) { setProfile(null); setProducts([]); } });
    return () => data.subscription.unsubscribe();
  }, [configured]);
  useEffect(() => { if (session) void loadData(); }, [session, loadData]);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);

  if (!configured) return <SetupPending />;
  if (loading) return <main className="center-page"><div className="loader" /><p>Cargando Vevntas…</p></main>;
  if (!session) return <AuthScreen />;
  if (!profile) return <main className="center-page"><div className="loader" /><p>Preparando su tienda…</p>{error && <ErrorBanner message={error} onClose={() => setError("")} />}</main>;

  const visibleNav = nav.filter((item) => !item.roles || item.roles.includes(profile.role));
  const current = visibleNav.find((item) => item.id === view) || visibleNav[0];
  const canEditStock = profile.role === "admin" || profile.role === "stock";

  return <div className="app-shell">
    <aside className={`sidebar ${menu ? "open" : ""}`}><div className="sidebar-brand"><div className="brand-mark"><span>V</span></div><div><strong>Vevntas</strong><small>Control comercial</small></div><button className="icon-button mobile-only" onClick={() => setMenu(false)}><X /></button></div><nav>{visibleNav.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setMenu(false); }}><Icon size={20} /><span>{item.label}</span></button>; })}</nav><div className="sidebar-footer"><div className="user-card"><div className="avatar">{profile.full_name.slice(0,2).toUpperCase()}</div><div><strong>{profile.full_name}</strong><small>{roleName(profile.role)}</small></div></div><button className="nav-logout" onClick={() => getBrowserSupabase().auth.signOut()}><LogOut size={19} />Cerrar sesión</button></div></aside>
    {menu && <button className="scrim" aria-label="Cerrar menú" onClick={() => setMenu(false)} />}
    <main className="main-area"><header className="topbar"><button className="icon-button mobile-only" onClick={() => setMenu(true)}><Menu /></button><div><span className="eyebrow">VEVNTAS</span><h1>{current.label}</h1></div><div className="topbar-actions"><div className={`rate-pill ${rate.rate ? "" : "warning"}`}><span>USD / VES</span><strong>{rate.rate ? rate.rate.toLocaleString("es-VE", { maximumFractionDigits: 6 }) : "Sin tasa"}</strong></div><button className="icon-button" onClick={() => setDark(!dark)} aria-label="Cambiar tema">{dark ? <Sun /> : <Moon />}</button></div></header><div className="content">{error && <ErrorBanner message={error} onClose={() => setError("")} />}{view === "prices" && <PriceView products={products} rate={rate.rate || 0} canSeeCost={canEditStock} />}{view === "sale" && <SaleView products={products} rate={rate.rate || 0} reload={loadData} />}{view === "products" && <ProductsView products={products} canEdit={canEditStock} reload={loadData} />}{view === "stock" && <StockView products={products} reload={loadData} />}{view === "import" && <ImportView reload={loadData} />}{view === "reports" && <ReportsView products={products} />}{view === "users" && <Placeholder type="users" />}{view === "settings" && <SettingsView rate={rate} reload={loadData} />}</div></main>
  </div>;
}
