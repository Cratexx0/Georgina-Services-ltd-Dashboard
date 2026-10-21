import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertCircle,
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
  Users,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import adminApiService from "@/contexts/adminApiService";

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

type Range = "7d" | "30d" | "all" | "custom";

interface Filters {
  range: Range;
  from: string;
  to: string;
  category: string;
  status: string;
  search: string;
}

const DEFAULT_FILTERS: Filters = { range: "30d", from: "", to: "", category: "ALL", status: "ALL", search: "" };

interface RawItem {
  id: number | string;
  orderId: number | string;
  productId: number | string;
  productName?: string;
  quantity: number | string;
  price: number | string;
  createdAt?: string;
  order?: {
    id: number | string;
    orderNumber?: string;
    userId?: number | string;
    status?: string;
    totalAmount?: number | string;
    createdAt?: string;
    user?: { id: number | string; name?: string; email?: string };
  };
  product?: any;
}

interface Order {
  id: string;
  number: string;
  status: string;
  total: number;
  createdAt: Date;
  userId: string;
  customer: string;
  email: string;
  units: number;
  items: RawItem[];
}

const DAY = 86_400_000;
const LOW_STOCK = 10;
const CONFIRMED = new Set(["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED", "CONFIRMED"]);
const CANCELLED = new Set(["CANCELLED", "FAILED", "REFUNDED"]);

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#f59e0b",
  PAID: "#10b981",
  CONFIRMED: "#10b981",
  PROCESSING: "#3b82f6",
  SHIPPED: "#6366f1",
  DELIVERED: "#14b8a6",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
  FAILED: "#ef4444",
  REFUNDED: "#94a3b8",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};
const norm = (s: unknown) => String(s ?? "").toUpperCase();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const dayStart = (t: number) => Math.floor(t / DAY) * DAY;
const pct = (cur: number, prev: number): number | null => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
const round2 = (n: number) => Math.round(n * 100) / 100;

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n || 0);
const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);
const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const toArray = (v: any, key?: string): any[] => {
  if (Array.isArray(v)) return v;
  if (key && Array.isArray(v?.[key])) return v[key];
  if (Array.isArray(v?.data)) return v.data;
  if (key && Array.isArray(v?.data?.[key])) return v.data[key];
  return [];
};

/** Accepts either flat order items (each with a nested `order`) or full orders (each with `items`) and returns flat items. */
function toItems(res: any): RawItem[] {
  const rows = toArray(res, "orders").length ? toArray(res, "orders") : toArray(res, "orderItems");
  if (!rows.length) return [];
  if (rows[0]?.order) return rows as RawItem[];
  if (Array.isArray(rows[0]?.items)) {
    return rows.flatMap((o: any) =>
      (o.items as any[]).map((it) => ({
        ...it,
        orderId: it.orderId ?? o.id,
        createdAt: it.createdAt ?? o.createdAt,
        order: { ...o, items: undefined },
      }))
    );
  }
  return rows as RawItem[];
}

function buildOrders(items: RawItem[]): Order[] {
  const map = new Map<string, Order>();
  items.forEach((it) => {
    const key = String(it.orderId);
    let o = map.get(key);
    if (!o) {
      o = {
        id: key,
        number: it.order?.orderNumber || `#${key}`,
        status: norm(it.order?.status || "PENDING"),
        total: num(it.order?.totalAmount),
        createdAt: new Date(it.order?.createdAt || it.createdAt || Date.now()),
        userId: String(it.order?.userId ?? it.order?.user?.id ?? ""),
        customer: it.order?.user?.name || "Unknown customer",
        email: it.order?.user?.email || "",
        units: 0,
        items: [],
      };
      map.set(key, o);
    }
    o.units += num(it.quantity);
    o.items.push(it);
  });
  return Array.from(map.values());
}

function summarize(orders: Order[], excludeCancelled: boolean) {
  const live = excludeCancelled ? orders.filter((o) => !CANCELLED.has(o.status)) : orders;
  const gross = live.reduce((s, o) => s + o.total, 0);
  const paid = live.filter((o) => CONFIRMED.has(o.status)).reduce((s, o) => s + o.total, 0);
  const pending = live.filter((o) => o.status === "PENDING").reduce((s, o) => s + o.total, 0);
  return { count: live.length, gross, paid, pending, aov: live.length ? gross / live.length : 0 };
}

/* ------------------------------------------------------------------ */
/* Data shaping                                                        */
/* ------------------------------------------------------------------ */

interface Raw {
  items: RawItem[];
  products: any[];
  users: any[];
}

function buildView(raw: Raw, f: Filters) {
  const now = Date.now();
  const q = f.search.trim().toLowerCase();
  const productsById = new Map<string, any>(raw.products.map((p) => [String(p.id), p]));
  const catOf = (it: RawItem) =>
    String(it.product?.categoryLevel1 || productsById.get(String(it.productId))?.categoryLevel1 || "uncategorised");

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

  const all = buildOrders(raw.items).filter(passes);
  const inRange = all.filter((o) => {
    const t = o.createdAt.getTime();
    return t >= start && t <= end;
  });
  const prevOrders = bounded
    ? all.filter((o) => {
        const t = o.createdAt.getTime();
        return t >= start - span && t < start;
      })
    : [];

  const excl = f.status === "ALL";
  const cur = summarize(inRange, excl);
  const prev = summarize(prevOrders, excl);
  const live = excl ? inRange.filter((o) => !CANCELLED.has(o.status)) : inRange;
  const liveItems = live.flatMap(scoped);

  /* revenue by day: paid vs awaiting payment */
  const minT = inRange.length ? Math.min(...inRange.map((o) => o.createdAt.getTime())) : Infinity;
  const last = dayStart(Math.min(end, now));
  let first = bounded ? dayStart(start) : Math.min(dayStart(now - 6 * DAY), isFinite(minT) ? dayStart(minT) : Infinity);
  first = Math.max(first, last - 89 * DAY);
  const buckets = new Map<number, { label: string; paid: number; pending: number; orders: number }>();
  for (let t = first; t <= last; t += DAY) buckets.set(t, { label: fmtDate(new Date(t)), paid: 0, pending: 0, orders: 0 });
  live.forEach((o) => {
    const b = buckets.get(dayStart(o.createdAt.getTime()));
    if (!b) return;
    b.orders += 1;
    if (CONFIRMED.has(o.status)) b.paid += o.total;
    else b.pending += o.total;
  });
  const daily = Array.from(buckets.values()).map((b) => ({ ...b, paid: round2(b.paid), pending: round2(b.pending) }));

  /* status breakdown */
  const statusMap = new Map<string, number>();
  inRange.forEach((o) => statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1));
  const statuses = Array.from(statusMap.entries())
    .map(([name, count]) => ({ name, count, color: STATUS_COLOR[name] || "#94a3b8" }))
    .sort((a, b) => b.count - a.count);

  /* top products */
  const prodMap = new Map<string, { name: string; units: number }>();
  liveItems.forEach((it) => {
    const k = String(it.productId);
    const e = prodMap.get(k) || { name: it.productName || "Unknown", units: 0 };
    e.units += num(it.quantity);
    prodMap.set(k, e);
  });
  const topProducts = Array.from(prodMap.values())
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  /* customers */
  const customers = raw.users.filter((u) => norm(u.role) !== "ADMIN");
  const activeCustomers = new Set(live.map((o) => o.userId)).size;

  /* inventory */
  const products = raw.products.filter((p) => {
    if (f.category !== "ALL" && String(p.categoryLevel1 || "uncategorised") !== f.category) return false;
    if (q && !String(p.name || "").toLowerCase().includes(q)) return false;
    return true;
  });
  const stock = (p: any) => num(p.stock);
  const outOfStock = products.filter((p) => stock(p) <= 0);
  const lowStock = products.filter((p) => stock(p) > 0 && stock(p) < LOW_STOCK);
  const stockAlerts = [...lowStock.sort((a, b) => stock(a) - stock(b)), ...outOfStock]
    .map((p) => ({
      id: p.id,
      name: p.name,
      stock: stock(p),
      hot: !!(p.isFeatured || p.isTrending || p.isNewArrival),
    }))
    .sort((a, b) => Number(b.hot) - Number(a.hot) || a.stock - b.stock)
    .slice(0, 6);

  const recent = [...inRange].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 6);

  const suspectLines = liveItems.filter((it) => {
    const p = it.product ?? productsById.get(String(it.productId));
    if (!p) return false;
    const price = num(it.price);
    const disc = num(p.discount);
    return price === 0 || (disc > 0 && price === disc);
  }).length;

  return {
    cur,
    prev,
    hasPrev: bounded,
    daily,
    statuses,
    topProducts,
    recent,
    stockAlerts,
    totalProducts: products.length,
    outOfStock: outOfStock.length,
    lowStock: lowStock.length,
    totalCustomers: customers.length,
    activeCustomers,
    suspectLines,
    liveLines: liveItems.length,
    orderCount: inRange.length,
  };
}

/* ------------------------------------------------------------------ */
/* UI pieces                                                           */
/* ------------------------------------------------------------------ */

function Delta({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center font-medium ${up ? "text-emerald-600" : "text-red-600"}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function StatCard({
  title,
  value,
  sub,
  delta,
  icon: Icon,
  isLoading,
}: {
  title: string;
  value: string;
  sub?: string;
  delta?: number | null;
  icon: React.ComponentType<{ className?: string }>;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <div className="mb-2 h-8 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Delta value={delta} />
              {sub && <span>{sub}</span>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message, onRetry, height = 260 }: { message: string; onRetry?: () => void; height?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center" style={{ height }}>
      <AlertCircle className="h-10 w-10 text-muted-foreground" />
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}

const controlCls = "h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40";

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

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLOR[status] || "#94a3b8";
  return (
    <Badge variant="outline" style={{ borderColor: `${c}66`, backgroundColor: `${c}1a`, color: c }}>
      {cap(status)}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [raw, setRaw] = useState<Raw | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const setFilter = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [itemsRes, productsRes, usersRes] = await Promise.all([
        // Order items carry the nested order + user; fall back to full orders if that endpoint fails.
        (adminApiService.getOrderItems() as Promise<any>).catch(() => (adminApiService.getOrders() as Promise<any>)),
        adminApiService.getProducts() as Promise<any>,
        (adminApiService.getUsers() as Promise<any>).catch(() => []),
      ]);

      setRaw({
        items: toItems(itemsRes),
        products: toArray(productsRes, "products"),
        users: toArray(usersRes, "users"),
      });
    } catch (err: any) {
      console.error("Failed to fetch dashboard data:", err);
      setError(err?.message || "Failed to load dashboard data. Please check your connection.");
      toast({
        variant: "destructive",
        title: "Error loading dashboard",
        description: "Could not fetch dashboard data. Please check your connection.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const view = useMemo(() => (raw ? buildView(raw, filters) : null), [raw, filters]);

  const options = useMemo(() => {
    const cats = new Set<string>();
    const statuses = new Set<string>();
    raw?.products.forEach((p) => cats.add(String(p.categoryLevel1 || "uncategorised")));
    raw?.items.forEach((i) => i.order?.status && statuses.add(norm(i.order.status)));
    return { categories: Array.from(cats).sort(), statuses: Array.from(statuses).sort() };
  }, [raw]);

  const chips: { key: string; text: string; clear: () => void }[] = [];
  if (filters.range === "custom" && (filters.from || filters.to))
    chips.push({ key: "r", text: `${filters.from || "…"} → ${filters.to || "today"}`, clear: () => setFilter({ range: "30d", from: "", to: "" }) });
  else if (filters.range === "7d" || filters.range === "all")
    chips.push({ key: "r", text: filters.range === "7d" ? "Last 7 days" : "All time", clear: () => setFilter({ range: "30d" }) });
  if (filters.category !== "ALL") chips.push({ key: "c", text: `Category: ${cap(filters.category)}`, clear: () => setFilter({ category: "ALL" }) });
  if (filters.status !== "ALL") chips.push({ key: "s", text: `Status: ${cap(filters.status)}`, clear: () => setFilter({ status: "ALL" }) });
  if (filters.search.trim()) chips.push({ key: "q", text: `Search: “${filters.search.trim()}”`, clear: () => setFilter({ search: "" }) });

  if (error && !raw) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Welcome to your e-commerce admin dashboard</p>
        </div>
        <EmptyState message={error} onRetry={fetchDashboardData} height={350} />
      </div>
    );
  }

  const v = view;
  const d = (a?: number, b?: number) => (v?.hasPrev && a !== undefined && b !== undefined ? pct(a, b) : undefined);
  const periodLabel =
    filters.range === "7d" ? "vs previous 7 days" : filters.range === "30d" ? "vs previous 30 days" : filters.range === "custom" ? "vs previous period" : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back{user?.name ? `, ${user.name}` : ""} 👋</p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" disabled={isLoading} className="self-start sm:self-auto">
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
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

            {(chips.length > 0 || filters.range !== "30d") && (
              <button onClick={resetFilters} className="h-9 rounded-md px-3 text-sm text-muted-foreground underline-offset-2 hover:underline">
                Reset
              </button>
            )}
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <FilterChip key={c.key} text={c.text} onClear={c.clear} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warnings */}
      {v && v.suspectLines > 0 && (
        <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {v.suspectLines} of {v.liveLines} order lines have a saved price of 0 or equal to the discount amount, so item-level revenue can't be
            trusted. Totals below use each order's total amount.
          </span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Revenue"
          value={money(v?.cur.gross ?? 0)}
          delta={d(v?.cur.gross, v?.prev.gross)}
          sub={v ? `${money(v.cur.paid)} paid` : undefined}
          icon={DollarSign}
          isLoading={isLoading || !v}
        />
        <StatCard
          title="Orders"
          value={String(v?.cur.count ?? 0)}
          delta={d(v?.cur.count, v?.prev.count)}
          sub={periodLabel || undefined}
          icon={ShoppingCart}
          isLoading={isLoading || !v}
        />
        <StatCard
          title="Avg. order value"
          value={money(v?.cur.aov ?? 0)}
          delta={d(v?.cur.aov, v?.prev.aov)}
          icon={Receipt}
          isLoading={isLoading || !v}
        />
        <StatCard
          title="Awaiting payment"
          value={money(v?.cur.pending ?? 0)}
          sub={v && v.cur.gross > 0 ? `${((v.cur.pending / v.cur.gross) * 100).toFixed(0)}% of revenue` : undefined}
          icon={Clock}
          isLoading={isLoading || !v}
        />
        <StatCard
          title="Customers"
          value={String(v?.totalCustomers ?? 0)}
          sub={v ? `${v.activeCustomers} ordering` : undefined}
          icon={Users}
          isLoading={isLoading || !v}
        />
        <StatCard
          title="Products"
          value={String(v?.totalProducts ?? 0)}
          sub={v ? `${v.outOfStock} out · ${v.lowStock} low` : undefined}
          icon={Package}
          isLoading={isLoading || !v}
        />
      </div>

      {/* Chart + recent orders */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Revenue overview</CardTitle>
            <CardDescription>Daily order value, split into paid and awaiting payment</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {isLoading || !v ? (
              <div className="flex h-[320px] items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : v.daily.some((x) => x.paid + x.pending > 0) ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={v.daily}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} fontSize={12} />
                  <YAxis tickFormatter={(x) => `$${compact(x)}`} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip formatter={(val: any, n: any) => [money(num(val)), n]} />
                  <Legend />
                  <Bar dataKey="paid" name="Paid" stackId="a" fill="#10b981" />
                  <Bar dataKey="pending" name="Awaiting payment" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No revenue for these filters. Try a wider period or reset the filters." height={320} />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>{isLoading || !v ? "Loading orders…" : `${v.orderCount} order${v.orderCount === 1 ? "" : "s"} match your filters`}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || !v ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="h-6 w-16 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : v.recent.length ? (
              <div className="space-y-4">
                {v.recent.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium leading-none">{o.customer}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {o.number} · {fmtDate(o.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={o.status} />
                      <span className="text-sm font-medium">{money(o.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No orders match these filters." height={260} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Order status</CardTitle>
            <CardDescription>Click a status to filter</CardDescription>
          </CardHeader>
          <CardContent>
            {!v ? (
              <div className="h-40 animate-pulse rounded bg-muted" />
            ) : v.statuses.length ? (
              <div className="space-y-3">
                {v.statuses.map((s) => {
                  const total = v.statuses.reduce((a, b) => a + b.count, 0);
                  return (
                    <button key={s.name} onClick={() => setFilter({ status: s.name })} className="block w-full text-left">
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{cap(s.name)}</span>
                        <span className="text-muted-foreground">
                          {s.count} · {((s.count / total) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${(s.count / total) * 100}%`, backgroundColor: s.color }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState message="No orders match." height={160} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Best sellers</CardTitle>
            <CardDescription>Top products by units sold</CardDescription>
          </CardHeader>
          <CardContent>
            {!v ? (
              <div className="h-40 animate-pulse rounded bg-muted" />
            ) : v.topProducts.length ? (
              <div className="space-y-3">
                {v.topProducts.map((p, i) => {
                  const max = v.topProducts[0].units || 1;
                  return (
                    <div key={p.name + i}>
                      <div className="mb-1 flex justify-between gap-2 text-sm">
                        <span className="truncate">{p.name}</span>
                        <span className="shrink-0 text-muted-foreground">{p.units} sold</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(p.units / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState message="No sales match." height={160} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock alerts</CardTitle>
            <CardDescription>Featured, trending and new products come first</CardDescription>
          </CardHeader>
          <CardContent>
            {!v ? (
              <div className="h-40 animate-pulse rounded bg-muted" />
            ) : v.stockAlerts.length ? (
              <div className="space-y-2">
                {v.stockAlerts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      {p.hot && <p className="text-xs text-muted-foreground">Promoted on storefront</p>}
                    </div>
                    <Badge variant={p.stock <= 0 ? "destructive" : "outline"} className="shrink-0">
                      {p.stock <= 0 ? "Out of stock" : `${p.stock} left`}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="Stock looks healthy." height={160} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}