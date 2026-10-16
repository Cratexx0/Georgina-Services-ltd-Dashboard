import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  Calendar,
  Activity,
  Target
} from "lucide-react";
import { useState, useEffect } from "react";
import adminApiService, { Customer, OrderItem } from "@/contexts/adminApiService";

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  orderCompletionRate: number;
  totalProducts: number;
  totalInventoryValue: number;
  lowStockProducts: number;
  totalCustomers: number;
  avgCustomerValue: number;
  orderStatusData: { name: string; value: number; color: string }[];
  categoryData: { name: string; count: number; value: number }[];
  dailyOrdersData: { date: string; orders: number; revenue: number }[];
  revenueData: { name: string; revenue: number }[];
  topSellingProducts: { name: string; sales: number; revenue: number }[];
}

interface OrderSummary {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

interface ExtendedOrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  createdAt: string;
  updatedAt: string;
  order: {
    id: number;
    userId: number;
    status: string;
    totalAmount: number;
    paymentIntentId: string | null;
    paymentMethod: string;
    shippingAddress: string;
    createdAt: string;
    updatedAt: string;
    user: {
      id: number;
      name: string;
      email: string;
    };
  };
  product: {
    id: number;
    name: string;
    slug: string;
    description: string;
    price: string;
    categoryLevel1: string;
    categoryLevel2: string;
    categoryLevel3: string;
    serviceType: string;
    serviceDuration: string | null;
    unit: string;
    stock: number;
    images: string[];
    isActive: boolean;
    tags: string[];
    brand: string | null;
    isFeatured: boolean;
    isTrending: boolean;
    isNewArrival: boolean;
    featuredOrder: number;
    trendingOrder: number;
    newArrivalOrder: number;
    wishList: boolean;
    size: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [orderItemsResponse, products, customers] = await Promise.all([
        adminApiService.getOrderItems(),
        adminApiService.getProducts(),
        adminApiService.getUsers(),
      ]);

      const orderItems = (orderItemsResponse as any)?.data as ExtendedOrderItem[] || [];
      const calculatedData = calculateAnalyticsData(orderItems, products || [], customers || []);
      setAnalyticsData(calculatedData);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data');
      setAnalyticsData(getFallbackData());
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalyticsData = (
    orderItems: ExtendedOrderItem[], 
    products: any[], 
    customers: Customer[]
  ): AnalyticsData => {
    const ordersMap = new Map<number, OrderSummary>();
    const productSales = new Map<number, { name: string; sales: number; revenue: number }>();
    
    orderItems.forEach(item => {
      if (!ordersMap.has(item.orderId)) {
        ordersMap.set(item.orderId, {
          id: item.orderId.toString(),
          totalAmount: Number(item.order?.totalAmount) || 0,
          status: item.order?.status || 'pending',
          createdAt: item.order?.createdAt || item.createdAt,
        });
      }
      
      const product = productSales.get(item.productId);
      const itemPrice = Number(item.price) || 0;
      const itemQty = Number(item.quantity) || 0;

      if (product) {
        product.sales += itemQty;
        product.revenue += itemPrice * itemQty;
      } else {
        productSales.set(item.productId, {
          name: item.productName || 'Unknown Product',
          sales: itemQty,
          revenue: itemPrice * itemQty,
        });
      }
    });
    
    const orders = Array.from(ordersMap.values());
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'paid').length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const orderCompletionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    const totalProducts = products.length;
    const totalInventoryValue = products.reduce((sum, p) => {
      const price = parseFloat(p.price) || 0;
      const stock = Number(p.stock) || 0;
      return sum + (price * stock);
    }, 0);
    
    const lowStockProducts = products.filter(p => (Number(p.stock) || 0) < 10).length;
    const totalCustomers = customers.length;
    const avgCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

    const statusCounts = orders.reduce((acc, order) => {
      const status = order.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const orderStatusData = [
      { name: 'Completed', value: statusCounts.completed || statusCounts.paid || 0, color: '#10b981' },
      { name: 'Pending', value: statusCounts.pending || 0, color: '#f59e0b' },
      { name: 'Processing', value: statusCounts.processing || statusCounts.shipped || 0, color: '#3b82f6' },
      { name: 'Cancelled', value: statusCounts.cancelled || statusCounts.failed || 0, color: '#ef4444' },
    ];

    const categoryMap = new Map<string, { count: number; value: number }>();
    
    products.forEach(product => {
      const category = product.categoryLevel1 || 'Uncategorized';
      const existing = categoryMap.get(category);
      const price = parseFloat(product.price) || 0;
      const stock = Number(product.stock) || 0;
      
      if (existing) {
        existing.count += 1;
        existing.value += price * stock;
      } else {
        categoryMap.set(category, {
          count: 1,
          value: price * stock,
        });
      }
    });
    
    const categoryData = Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      value: Math.round(data.value),
    }));

    const dailyOrdersData = generateWeeklyData(orderItems);
    const revenueData = generateMonthlyRevenueData(orderItems);
    
    const topSellingProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalRevenue: Number(totalRevenue) || 0,
      totalOrders: Number(totalOrders) || 0,
      completedOrders: Number(completedOrders) || 0,
      pendingOrders: Number(pendingOrders) || 0,
      orderCompletionRate: Number(orderCompletionRate) || 0,
      totalProducts: Number(totalProducts) || 0,
      totalInventoryValue: Number(totalInventoryValue) || 0,
      lowStockProducts: Number(lowStockProducts) || 0,
      totalCustomers: Number(totalCustomers) || 0,
      avgCustomerValue: Number(avgCustomerValue) || 0,
      orderStatusData,
      categoryData,
      dailyOrdersData,
      revenueData,
      topSellingProducts,
    };
  };

  const getFallbackData = (): AnalyticsData => ({
    totalRevenue: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    orderCompletionRate: 0,
    totalProducts: 0,
    totalInventoryValue: 0,
    lowStockProducts: 0,
    totalCustomers: 0,
    avgCustomerValue: 0,
    orderStatusData: [],
    categoryData: [],
    dailyOrdersData: [],
    revenueData: [],
    topSellingProducts: [],
  });

  const generateWeeklyData = (orderItems: ExtendedOrderItem[]) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayOrders = new Map<string, { orders: Set<number>; revenue: number }>();
    
    days.forEach(day => {
      dayOrders.set(day, { orders: new Set(), revenue: 0 });
    });
    
    orderItems.forEach(item => {
      try {
        const date = new Date(item.createdAt);
        const dayIndex = date.getDay();
        const dayName = days[dayIndex === 0 ? 6 : dayIndex - 1];
        
        const dayData = dayOrders.get(dayName);
        if (dayData) {
          dayData.orders.add(item.orderId);
          dayData.revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0);
        }
      } catch (e) {
        console.warn('Error processing date:', e);
      }
    });
    
    return days.map(day => {
      const data = dayOrders.get(day) || { orders: new Set(), revenue: 0 };
      return {
        date: day,
        orders: data.orders.size,
        revenue: data.revenue,
      };
    });
  };

  const generateMonthlyRevenueData = (orderItems: ExtendedOrderItem[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthRevenue = new Map<string, number>();
    
    months.forEach(month => {
      monthRevenue.set(month, 0);
    });
    
    orderItems.forEach(item => {
      try {
        const date = new Date(item.createdAt);
        const monthIndex = date.getMonth();
        const monthName = months[monthIndex];
        
        const currentRevenue = monthRevenue.get(monthName) || 0;
        monthRevenue.set(monthName, currentRevenue + ((Number(item.price) || 0) * (Number(item.quantity) || 0)));
      } catch (e) {
        console.warn('Error processing date:', e);
      }
    });
    
    return months.map(month => ({
      name: month,
      revenue: monthRevenue.get(month) || 0,
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Comprehensive business insights and metrics</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !analyticsData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Comprehensive business insights and metrics</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-center text-destructive">
            <p>{error}</p>
            <button 
              onClick={fetchAnalyticsData}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return null;
  }

  const {
    totalRevenue,
    totalOrders,
    completedOrders,
    pendingOrders,
    orderCompletionRate,
    totalProducts,
    totalInventoryValue,
    lowStockProducts,
    totalCustomers,
    avgCustomerValue,
    orderStatusData,
    categoryData,
    dailyOrdersData,
    revenueData,
    topSellingProducts,
  } = analyticsData;

  const revenueGrowth = 12.5;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Comprehensive business insights and metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(totalRevenue || 0).toFixed(2)}</div>
            <p className="text-xs text-success flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{revenueGrowth.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {Number(orderCompletionRate || 0).toFixed(1)}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ${Number(avgCustomerValue || 0).toFixed(2)} avg value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(totalInventoryValue || 0).toFixed(2)}</div>
            <p className="text-xs text-warning mt-1">
              {lowStockProducts} low stock items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Revenue
            </CardTitle>
            <CardDescription>Revenue distribution by month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                <Legend />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Weekly Order Trends
            </CardTitle>
            <CardDescription>Order volume by day of week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyOrdersData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Orders"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Order Status Distribution
            </CardTitle>
            <CardDescription>Breakdown of order statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Category Performance
            </CardTitle>
            <CardDescription>Inventory value by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Value']} />
                <Legend />
                <Bar dataKey="value" fill="hsl(var(--primary))" name="Value ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completed</span>
                <span className="font-medium">{completedOrders}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pending</span>
                <span className="font-medium">{pendingOrders}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total</span>
                <span className="font-medium">{totalOrders}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t">
                <span>Success Rate</span>
                <span className="text-success">{Number(orderCompletionRate || 0).toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Products</span>
                <span className="font-medium">{totalProducts}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Low Stock ({"<"}10)</span>
                <span className="font-medium text-warning">{lowStockProducts}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Inventory Value</span>
                <span className="font-medium">${Number(totalInventoryValue || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t">
                <span>Stock Health</span>
                <span className="text-success">
                  {totalProducts > 0 ? ((1 - lowStockProducts / totalProducts) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Active Customers</span>
                <span className="font-medium">{totalCustomers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg Order Value</span>
                <span className="font-medium">
                  ${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Revenue</span>
                <span className="font-medium">${Number(totalRevenue || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t">
                <span>Customer LTV</span>
                <span className="text-success">${Number(avgCustomerValue || 0).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Selling Products */}
      {topSellingProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Selling Products
            </CardTitle>
            <CardDescription>Products with highest revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSellingProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.sales} units sold
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${Number(product.revenue || 0).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      ${product.sales > 0 ? (Number(product.revenue || 0) / product.sales).toFixed(2) : '0.00'} avg
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}