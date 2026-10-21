import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  DollarSign,
  Filter,
  Package,
  Receipt,
  RefreshCw,
  Search,
  ShoppingCart,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import adminApiService from "@/contexts/adminApiService";

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

type Range = "7d" | "30d" | "all" | "custom";
type StockFilter = "ALL" | "in" | "low" | "out";

interface Filters {
  range: Range;
  from: string; // yyyy-mm-dd (custom range)
  to: string; // yyyy-mm-dd (custom range)
  category: string; // "ALL" or a category name
  status: string; // "ALL" or an order status (uppercase)
  stock: StockFilter;
  search: string;
}

const DEFAULT_FILTERS: Filters = {
  range: "all",
  from: "",
  to: "",
  category: "ALL",
  status: "ALL",
  stock: "ALL",
  search: "",
};

interface RawItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  quantity: number | string;
  price: number | string;
  createdAt: string;
  order?: {
    id: number;
    orderNumber?: string;
    userId: number;
    status: string;
    totalAmount: number | string;
    createdAt: string;
    user?: { id: number; name: string; email: string };
  };
  product?: any;
}

interface Raw {
  items: RawItem[];
  products: any[];
  users: any[];
}

interface Order {
  id: number;
  number: string;
  status: string;
  total: number;
  createdAt: Date;
  userId: number;
  customer: string;
  email: string;
  units: number;
  items: RawItem[];
}

const DAY = 86_400_000;
const LOW_STOCK = 10;

const CONFIRMED = new Set(["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED"]);
const CANCELLED = new Set(["CANCELLED", "FAILED", "REFUNDED"]);

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#f59e0b",
  PAID: "#10b981",
  PROCESSING: "#3b82f6",
  SHIPPED: "#6366f1",
  DELIVERED: "#14b8a6",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
  FAILED: "#ef4444",
  REFUNDED: "#94a3b8",
};

const PRIMARY = "hsl(var(--primary))";
const GREEN = "#10b981";
const AMBER = "#f59e0b";
const RED = "#ef4444";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const num = (v: unknown) => Number(v) || 0;
const round2 = (n: number) => Math.round(n * 100) / 100;

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n || 0);

const compact = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);

const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const toArray = (v: any, key?: string): any[] => {
  if (Array.isArray(v)) return v;
  if (key && Array.isArray(v?.[key])) return v[key];
  if (Array.isArray(v?.data)) return v.data;
  return [];
};

const pct = (cur: number, prev: number): number | null => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
const dayStart = (t: number) => Math.floor(t / DAY) * DAY;
const norm = (s: unknown) => String(s ?? "").toUpperCase();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/* ------------------------------------------------------------------ */
/* Data shaping                                                        */
/* ------------------------------------------------------------------ */

function buildOrders(items: RawItem[]): Order[] {
  const map = new Map<number, Order>();
  items.forEach((it) => {
    let o = map.get(it.orderId);
    if (!o) {
      o = {
        id: it.orderId,
        number: it.order?.orderNumber || `#${it.orderId}`,
        status: norm(it.order?.status || "PENDING"),
        total: num(it.order?.totalAmount),
        createdAt: new Date(it.order?.createdAt || it.createdAt),
        userId: it.order?.userId ?? 0,
        customer: it.order?.user?.name || "Unknown",
        email: it.order?.user?.email || "",
        units: 0,
        items: [],
      };
      map.set(it.orderId, o);
    }
    o.units += num(it.quantity);
    o.items.push(it);
  });
  return Array.from(map.values());
}

function summarize(orders: Order[], excludeCancelled: boolean) {
  const live = excludeCancelled ? orders.filter((o) => !CANCELLED.has(o.status)) : orders;
  const gross = live.reduce((s, o) => s + o.total, 0);
  const confirmed = live.filter((o) => CONFIRMED.has(o.status)).reduce((s, o) => s + o.total, 0);
  const pending = live.filter((o) => o.status === "PENDING").reduce((s, o) => s + o.total, 0);
  return {
    count: live.length,
    gross,
    confirmed,
    pending,
    aov: live.length ? gross / live.length : 0,
    units: live.reduce((s, o) => s + o.units, 0),
  };
}

function isSuspect(it: RawItem, productsById: Map<number, any>) {
  const p = it.product ?? productsById.get(it.productId);
  if (!p) return false;
  const price = num(it.price);
  const disc = num(p.discount);
  return (
    price === 0 ||
    (disc > 0 && price === disc) ||
    (!!it.productName && !!p.name && it.productName !== p.name)
  );
}

function buildView(raw: Raw, f: Filters) {
  const now = Date.now();
  const q = f.search.trim().toLowerCase();
  const productsById = new Map<number, any>(raw.products.map((p) => [p.id, p]));
  const catOf = (it: RawItem): string =>
    String(it.product?.categoryLevel1 || productsById.get(it.productId)?.categoryLevel1 || "uncategorised");

  /* ---- date window ---- */
  let start = 0;
  let end = now;
  if (f.range === "7d") start = now - 7 * DAY;
  else if (f.range === "30d") start = now - 30 * DAY;
  else if (f.range === "custom") {
    if (f.from) start = new Date(`${f.from}T00:00:00`).getTime();
    if (f.to) end = new Date(`${f.to}T23:59:59.999`).getTime();
  }
  if (end < start) [start, end] = [end, start];
  const bounded = start > 0;
  const span = end - start;

  /* ---- order-level filters (status / category / search) ---- */
  const passes = (o: Order) => {
    if (f.status !== "ALL" && o.status !== f.status) return false;
    if (f.category !== "ALL" && !o.items.some((i) => catOf(i) === f.category)) return false;
    if (q) {
      const hit =
        o.number.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.items.some((i) => (i.productName || "").toLowerCase().includes(q));
      if (!hit) return false;
    }
    return true;
  };
  const scoped = (o: Order) => (f.category === "ALL" ? o.items : o.items.filter((i) => catOf(i) === f.category));

  const allOrders = buildOrders(raw.items);
  const matching = allOrders.filter(passes);
  const inRange = matching.filter((o) => {
    const t = o.createdAt.getTime();
    return t >= start && t <= end;
  });
  const prevOrders = bounded
    ? matching.filter((o) => {
        const t = o.createdAt.getTime();
        return t >= start - span && t < start;
      })
    : [];

  // When the user picks a specific status (e.g. Cancelled) show it, otherwise hide dead orders from money metrics.
  const excl = f.status === "ALL";
  const cur = summarize(inRange, excl);
  const prev = summarize(prevOrders, excl);
  const hasPrev = bounded;

  const liveOrders = excl ? inRange.filter((o) => !CANCELLED.has(o.status)) : inRange;
  const liveItems = liveOrders.flatMap(scoped);

  /* ---- daily trend ---- */
  const minT = inRange.length ? Math.min(...inRange.map((o) => o.createdAt.getTime())) : Infinity;
  const last = dayStart(Math.min(end, now));
  let first = bounded ? dayStart(start) : Math.min(dayStart(now - 6 * DAY), isFinite(minT) ? dayStart(minT) : Infinity);
  first = Math.max(first, last - 89 * DAY);
  const buckets = new Map<number, { label: string; value: number; paid: number; orders: number }>();
  for (let t = first; t <= last; t += DAY) {
    buckets.set(t, { label: fmtDate(new Date(t)), value: 0, paid: 0, orders: 0 });
  }
  liveOrders.forEach((o) => {
    const b = buckets.get(dayStart(o.createdAt.getTime()));
    if (!b) return;
    b.value += o.total;
    b.orders += 1;
    if (CONFIRMED.has(o.status)) b.paid += o.total;
  });
  const daily = Array.from(buckets.values()).map((b) => ({ ...b, value: round2(b.value), paid: round2(b.paid) }));

  /* ---- order status ---- */
  const statusMap = new Map<string, number>();
  inRange.forEach((o) => statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1));
  const statusData = Array.from(statusMap.entries()).map(([name, value]) => ({
    name,
    value,
    color: STATUS_COLOR[name] || "#94a3b8",
  }));

  /* ---- top products ---- */
  const prodMap = new Map<number, { name: string; units: number; revenue: number }>();
  liveItems.forEach((it) => {
    const e = prodMap.get(it.productId) || { name: it.productName || "Unknown", units: 0, revenue: 0 };
    e.units += num(it.quantity);
    e.revenue += num(it.price) * num(it.quantity);
    prodMap.set(it.productId, e);
  });
  const topProducts = Array.from(prodMap.values())
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, 6)
    .map((p) => ({ ...p, revenue: round2(p.revenue) }));

  /* ---- customers ---- */
  const customers = raw.users.filter((u) => norm(u.role) !== "ADMIN");
  const custMap = new Map<number, { name: string; email: string; orders: number; spend: number }>();
  liveOrders.forEach((o) => {
    const e = custMap.get(o.userId) || { name: o.customer, email: o.email, orders: 0, spend: 0 };
    e.orders += 1;
    e.spend += o.total;
    custMap.set(o.userId, e);
  });
  const topCustomers = Array.from(custMap.values())
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5);
  const activeCustomers = custMap.size;
  const repeatCustomers = Array.from(custMap.values()).filter((c) => c.orders > 1).length;
  const newCustomers = customers.filter((u) => {
    const t = new Date(u.createdAt).getTime();
    return t >= start && t <= end;
  }).length;

  /* ---- inventory (category / stock / search filters) ---- */
  const stock = (p: any) => num(p.stock);
  const products = raw.products.filter((p) => {
    if (f.category !== "ALL" && String(p.categoryLevel1 || "uncategorised") !== f.category) return false;
    if (q && !String(p.name || "").toLowerCase().includes(q)) return false;
    if (f.stock === "in" && !(stock(p) > 0)) return false;
    if (f.stock === "low" && !(stock(p) > 0 && stock(p) < LOW_STOCK)) return false;
    if (f.stock === "out" && !(stock(p) <= 0)) return false;
    return true;
  });
  const outOfStock = products.filter((p) => stock(p) <= 0);
  const lowStock = products.filter((p) => stock(p) > 0 && stock(p) < LOW_STOCK);
  const healthy = products.filter((p) => stock(p) >= LOW_STOCK);
  const inventoryValue = products.reduce((s, p) => s + num(p.price) * stock(p), 0);
  const stockData = [
    { name: `Healthy (${LOW_STOCK}+)`, value: healthy.length, color: GREEN },
    { name: `Low (1–${LOW_STOCK - 1})`, value: lowStock.length, color: AMBER },
    { name: "Out of stock", value: outOfStock.length, color: RED },
  ].filter((d) => d.value > 0);

  const restock = outOfStock
    .map((p) => {
      const flags = [p.isFeatured && "Featured", p.isTrending && "Trending", p.isNewArrival && "New"].filter(Boolean) as string[];
      return {
        id: p.id,
        name: p.name,
        price: num(p.price),
        flags,
        score: (p.isFeatured ? 2 : 0) + (p.isTrending ? 2 : 0) + (p.isNewArrival ? 1 : 0),
      };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  /* ---- categories ---- */
  const catMap = new Map<string, { name: string; inStock: number; outOfStock: number; stockValue: number; units: number }>();
  products.forEach((p) => {
    const name = String(p.categoryLevel1 || "uncategorised");
    const e = catMap.get(name) || { name, inStock: 0, outOfStock: 0, stockValue: 0, units: 0 };
    if (stock(p) > 0) e.inStock += 1;
    else e.outOfStock += 1;
    e.stockValue += num(p.price) * stock(p);
    catMap.set(name, e);
  });
  liveItems.forEach((it) => {
    const e = catMap.get(catOf(it));
    if (e) e.units += num(it.quantity);
  });
  const categories = Array.from(catMap.values()).map((c) => ({ ...c, stockValue: Math.round(c.stockValue) }));

  /* ---- data quality ---- */
  const suspectLines = liveItems.filter((it) => isSuspect(it, productsById)).length;

  const recent = [...inRange].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 6);

  return {
    cur,
    prev,
    hasPrev,
    daily,
    statusData,
    topProducts,
    topCustomers,
    totalCustomers: customers.length,
    activeCustomers,
    repeatCustomers,
    newCustomers,
    totalProducts: products.length,
    outOfStock: outOfStock.length,
    lowStock: lowStock.length,
    inventoryValue,
    stockData,
    restock,
    categories,
    suspectLines,
    liveLineCount: liveItems.length,
    pendingCount: inRange.filter((o) => o.status === "PENDING").length,
    recent,
    orderCount: inRange.length,
  };
}

/* ------------------------------------------------------------------ */
/* Small UI pieces                                                     */
/* ------------------------------------------------------------------ */

function Delta({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center text-xs font-medium ${up ? "text-emerald-600" : "text-red-600"}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function Kpi({
  title,
  value,
  sub,
  icon: Icon,
  delta,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  delta?: number | null;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {delta !== undefined && <Delta value={delta} />}
          {sub && <span>{sub}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const Empty = ({ text }: { text: string }) => (
  <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">{text}</div>
);

function StatusChip({ status }: { status: string }) {
  const c = STATUS_COLOR[status] || "#94a3b8";
  return (
    <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${c}22`, color: c }}>
      {cap(status)}
    </span>
  );
}

const controlCls =
  "h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function FilterChip({ text, onClear }: { text: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs">
      {text}
      <button onClick={onClear} aria-label={`Remove filter ${text}`} className="rounded-full hover:bg-background">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Analytics() {
  const [raw, setRaw] = useState<Raw | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const setFilter = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [itemsRes, productsRes, usersRes] = await Promise.all([
        adminApiService.getOrderItems() as Promise<any>,
        adminApiService.getProducts() as Promise<any>,
        adminApiService.getUsers() as Promise<any>,
      ]);
      setRaw({
        items: toArray(itemsRes),
        products: toArray(productsRes, "products"),
        users: toArray(usersRes, "users"),
      });
      setUpdatedAt(new Date());
    } catch (err) {
      console.error("Error fetching analytics data:", err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const view = useMemo(() => (raw ? buildView(raw, filters) : null), [raw, filters]);

  // Options for the dropdowns, taken from the data itself.
  const options = useMemo(() => {
    const cats = new Set<string>();
    const statuses = new Set<string>();
    raw?.products.forEach((p) => cats.add(String(p.categoryLevel1 || "uncategorised")));
    raw?.items.forEach((i) => {
      if (i.order?.status) statuses.add(norm(i.order.status));
    });
    return { categories: Array.from(cats).sort(), statuses: Array.from(statuses).sort() };
  }, [raw]);

  const activeChips: { key: string; text: string; clear: () => void }[] = [];
  if (filters.range === "custom" && (filters.from || filters.to))
    activeChips.push({
      key: "range",
      text: `${filters.from || "…"} → ${filters.to || "today"}`,
      clear: () => setFilter({ range: "all", from: "", to: "" }),
    });
  else if (filters.range === "7d" || filters.range === "30d")
    activeChips.push({
      key: "range",
      text: filters.range === "7d" ? "Last 7 days" : "Last 30 days",
      clear: () => setFilter({ range: "all" }),
    });
  if (filters.category !== "ALL")
    activeChips.push({ key: "cat", text: `Category: ${cap(filters.category)}`, clear: () => setFilter({ category: "ALL" }) });
  if (filters.status !== "ALL")
    activeChips.push({ key: "status", text: `Status: ${cap(filters.status)}`, clear: () => setFilter({ status: "ALL" }) });
  if (filters.stock !== "ALL")
    activeChips.push({
      key: "stock",
      text: `Stock: ${filters.stock === "in" ? "In stock" : filters.stock === "low" ? "Low" : "Out of stock"}`,
      clear: () => setFilter({ stock: "ALL" }),
    });
  if (filters.search.trim())
    activeChips.push({ key: "q", text: `Search: “${filters.search.trim()}”`, clear: () => setFilter({ search: "" }) });

  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Sales, customers and stock at a glance
          {updatedAt && <> · updated {updatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</>}
        </p>
      </div>
      <button
        onClick={load}
        disabled={loading}
        className="inline-flex items-center gap-1 self-start rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50 sm:self-auto"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        Refresh
      </button>
    </div>
  );

  const filterBar = (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1 self-center text-sm font-medium">
            <Filter className="h-4 w-4" /> Filters
          </div>

          <Field label="Period">
            <div className="inline-flex h-9 rounded-md border p-0.5">
              {(
                [
                  ["7d", "7 days"],
                  ["30d", "30 days"],
                  ["all", "All time"],
                  ["custom", "Custom"],
                ] as [Range, string][]
              ).map(([r, label]) => (
                <button
                  key={r}
                  onClick={() => setFilter({ range: r })}
                  className={`rounded px-3 text-sm transition-colors ${
                    filters.range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          {filters.range === "custom" && (
            <>
              <Field label="From">
                <input
                  type="date"
                  className={controlCls}
                  value={filters.from}
                  max={filters.to || undefined}
                  onChange={(e) => setFilter({ from: e.target.value })}
                />
              </Field>
              <Field label="To">
                <input
                  type="date"
                  className={controlCls}
                  value={filters.to}
                  min={filters.from || undefined}
                  onChange={(e) => setFilter({ to: e.target.value })}
                />
              </Field>
            </>
          )}

          <Field label="Category">
            <select className={controlCls} value={filters.category} onChange={(e) => setFilter({ category: e.target.value })}>
              <option value="ALL">All categories</option>
              {options.categories.map((c) => (
                <option key={c} value={c}>
                  {cap(c)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Order status">
            <select className={controlCls} value={filters.status} onChange={(e) => setFilter({ status: e.target.value })}>
              <option value="ALL">All statuses</option>
              {options.statuses.map((s) => (
                <option key={s} value={s}>
                  {cap(s)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Stock level">
            <select
              className={controlCls}
              value={filters.stock}
              onChange={(e) => setFilter({ stock: e.target.value as StockFilter })}
            >
              <option value="ALL">All stock levels</option>
              <option value="in">In stock</option>
              <option value="low">Low (under {LOW_STOCK})</option>
              <option value="out">Out of stock</option>
            </select>
          </Field>

          <Field label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className={`${controlCls} w-56 pl-8`}
                placeholder="Order, customer, product…"
                value={filters.search}
                onChange={(e) => setFilter({ search: e.target.value })}
              />
            </div>
          </Field>

          {activeChips.length > 0 && (
            <button onClick={resetFilters} className="h-9 rounded-md px-3 text-sm text-muted-foreground underline-offset-2 hover:underline">
              Reset all
            </button>
          )}
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeChips.map((c) => (
              <FilterChip key={c.key} text={c.text} onClear={c.clear} />
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Period, status and search apply to orders. Category applies to orders containing that category and to inventory. Stock level applies to
          inventory only.
        </p>
      </CardContent>
    </Card>
  );

  if (loading && !view) {
    return (
      <div className="space-y-6">
        {header}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!view) {
    return (
      <div className="space-y-6">
        {header}
        <div className="flex h-64 flex-col items-center justify-center text-destructive">
          <p>{error || "No data"}</p>
          <button onClick={load} className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const v = view;
  const d = (a: number, b: number) => (v.hasPrev ? pct(a, b) : undefined);
  const paidRate = v.cur.gross > 0 ? (v.cur.confirmed / v.cur.gross) * 100 : 0;
  const noOrders = v.orderCount === 0;

  const alerts: { tone: "amber" | "red"; text: string }[] = [];
  if (v.suspectLines > 0)
    alerts.push({
      tone: "red",
      text: `${v.suspectLines} of ${v.liveLineCount} order lines look mis-priced (price saved as 0, equal to the discount, or a different product name). Product revenue figures are unreliable until checkout is fixed.`,
    });
  if (v.restock.length > 0)
    alerts.push({
      tone: "amber",
      text: `${v.restock.length}+ featured, trending or new products are out of stock. Customers see them on the storefront but can't buy them.`,
    });
  if (v.pendingCount > 0)
    alerts.push({
      tone: "amber",
      text: `${v.pendingCount} order${v.pendingCount > 1 ? "s" : ""} still pending, worth ${money(v.cur.pending)}.`,
    });

  return (
    <div className="space-y-6">
      {header}
      {filterBar}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error} — showing last loaded data.</div>
      )}

      {noOrders && activeChips.length > 0 && (
        <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <span>No orders match these filters. Inventory sections still reflect your category, stock and search filters.</span>
          <button onClick={resetFilters} className="font-medium underline">
            Reset filters
          </button>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-3">
          {alerts.map((a, i) => (
            <div
              key={i}
              className={`flex gap-2 rounded-lg border p-3 text-sm ${
                a.tone === "red" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{a.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Kpi
          title="Order value"
          value={money(v.cur.gross)}
          icon={DollarSign}
          delta={d(v.cur.gross, v.prev.gross)}
          sub={`${money(v.cur.confirmed)} paid`}
        />
        <Kpi
          title="Orders"
          value={String(v.cur.count)}
          icon={ShoppingCart}
          delta={d(v.cur.count, v.prev.count)}
          sub={`${v.cur.units} units`}
        />
        <Kpi
          title="Avg. order value"
          value={money(v.cur.aov)}
          icon={Receipt}
          delta={d(v.cur.aov, v.prev.aov)}
          sub={filters.status === "ALL" ? "excl. cancelled" : undefined}
        />
        <Kpi title="Awaiting payment" value={money(v.cur.pending)} icon={Clock} sub={`${paidRate.toFixed(0)}% of value paid`} />
        <Kpi
          title="Customers"
          value={String(v.totalCustomers)}
          icon={Users}
          sub={`${v.activeCustomers} ordered · ${v.newCustomers} new`}
        />
        <Kpi
          title="Repeat customers"
          value={v.activeCustomers ? `${((v.repeatCustomers / v.activeCustomers) * 100).toFixed(0)}%` : "0%"}
          icon={TrendingUp}
          sub={`${v.repeatCustomers} of ${v.activeCustomers} ordering`}
        />
        <Kpi title="Inventory value" value={money(v.inventoryValue)} icon={Package} sub={`${v.totalProducts} products`} />
        <Kpi
          title="Out of stock"
          value={`${v.outOfStock}/${v.totalProducts}`}
          icon={AlertTriangle}
          sub={`${v.lowStock} more running low`}
        />
      </div>

      {/* Trend + status */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Sales trend"
          description="Daily order value, paid revenue and order count"
          icon={Activity}
        >
          {v.daily.some((x) => x.orders > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={v.daily}>
                <defs>
                  <linearGradient id="gValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} fontSize={12} />
                <YAxis yAxisId="l" tickFormatter={(x) => `$${compact(x)}`} tickLine={false} axisLine={false} fontSize={12} />
                <YAxis yAxisId="r" orientation="right" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip formatter={(val: any, n: any) => [n === "Orders" ? val : money(val), n]} />
                <Legend />
                <Area yAxisId="l" type="monotone" dataKey="value" name="Order value" stroke="#6366f1" fill="url(#gValue)" strokeWidth={2} />
                <Area yAxisId="l" type="monotone" dataKey="paid" name="Paid" stroke={GREEN} fill="none" strokeWidth={2} />
                <Line yAxisId="r" type="monotone" dataKey="orders" name="Orders" stroke={AMBER} strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <Empty text="No orders in this period" />
          )}
        </ChartCard>

        <ChartCard title="Order status" description="Click a slice to filter by that status" icon={Target}>
          {v.statusData.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={v.statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  style={{ cursor: "pointer" }}
                  onClick={(entry: any) => entry?.name && setFilter({ status: entry.name })}
                >
                  {v.statusData.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend formatter={(value: string) => cap(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty text="No orders match" />
          )}
        </ChartCard>
      </div>

      {/* Products + stock */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard className="lg:col-span-2" title="Best sellers" description="Top products by units sold" icon={TrendingUp}>
          {v.topProducts.length ? (
            <ResponsiveContainer width="100%" height={Math.max(220, v.topProducts.length * 46)}>
              <BarChart data={v.topProducts} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis type="category" dataKey="name" width={170} fontSize={12} tickLine={false} />
                <Tooltip
                  formatter={(val: any, n: any, p: any) => [n === "Units sold" ? `${val} (${money(p.payload.revenue)} recorded)` : val, n]}
                />
                <Bar dataKey="units" name="Units sold" fill={PRIMARY} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty text="No sales match these filters" />
          )}
        </ChartCard>

        <ChartCard title="Stock health" description={`Low stock = under ${LOW_STOCK} units`} icon={Package}>
          {v.stockData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={v.stockData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {v.stockData.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty text="No products match" />
          )}
        </ChartCard>
      </div>

      {/* Categories + restock */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Stock by category" description="Products in stock vs out of stock" icon={Package}>
          {v.categories.length ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={v.categories}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickFormatter={(s: string) => cap(s)} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="inStock" name="In stock" stackId="a" fill={GREEN} />
                  <Bar dataKey="outOfStock" name="Out of stock" stackId="a" fill={RED} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 divide-y text-sm">
                {v.categories.map((c) => (
                  <div key={c.name} className="flex justify-between py-1.5">
                    <span className="capitalize">{c.name}</span>
                    <span className="text-muted-foreground">
                      {c.units} sold · {money(c.stockValue)} in stock
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty text="No products match" />
          )}
        </ChartCard>

        <ChartCard
          title="Restock priority"
          description="Out-of-stock products that are featured, trending or new"
          icon={AlertTriangle}
        >
          {v.restock.length ? (
            <div className="space-y-2">
              {v.restock.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.flags.join(" · ")}</p>
                  </div>
                  <span className="text-sm font-semibold">{money(p.price)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="Nothing urgent for the current filters" />
          )}
        </ChartCard>
      </div>

      {/* Tables */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard className="lg:col-span-2" title="Recent orders" icon={ShoppingCart}>
          {v.recent.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 font-medium">Order</th>
                    <th className="py-2 font-medium">Customer</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium">Date</th>
                    <th className="py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {v.recent.map((o) => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{o.number}</td>
                      <td className="py-2">{o.customer}</td>
                      <td className="py-2">
                        <StatusChip status={o.status} />
                      </td>
                      <td className="py-2 text-muted-foreground">{fmtDate(o.createdAt)}</td>
                      <td className="py-2 text-right font-medium">{money(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="No orders match these filters" />
          )}
        </ChartCard>

        <ChartCard title="Top customers" description="By order value" icon={Users}>
          {v.topCustomers.length ? (
            <div className="space-y-3">
              {v.topCustomers.map((c) => (
                <div key={c.email || c.name} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.orders} order{c.orders > 1 ? "s" : ""} · {c.email}
                    </p>
                  </div>
                  <span className="font-semibold">{money(c.spend)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="No customer orders match" />
          )}
        </ChartCard>
      </div>
    </div>
  );
}