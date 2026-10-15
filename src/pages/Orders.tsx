

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AsyncImageLoader from "@/components/AsyncImageLoader";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  ShoppingCart,
  BanknoteIcon,
  CreditCard,
  RefreshCw,
  AlertCircle,
  Package,
  Clock,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import adminApiService from "@/contexts/adminApiService";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

// Safely convert API values (which may be strings like "12.50") to numbers
const toNumber = (value: unknown): number => {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
};

// Define interfaces based on the actual raw API response
interface RawOrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  image: string; // API returns singular 'image', not 'images'
  quantity: number;
  price: number | string; // decimals may arrive as strings
  createdAt: string;
  updatedAt: string;
  product?: {
    id: number;
    name: string;
    price: string;
    images: string[];
  };
}

interface RawOrderUser {
  id: number;
  name: string;
  email: string;
}

interface RawApiOrder {
  id: number;
  userId: number;
  status: string;
  totalAmount: number | string; // decimals may arrive as strings
  paymentIntentId: string | null;
  paymentMethod: string;
  shippingAddress: string;
  orderNumber?: string;
  createdAt: string;
  updatedAt: string;
  user: RawOrderUser;
  items: RawOrderItem[];
}

// Our UI Order type
interface Order {
  id: string;
  displayId: string;
  orderNumber?: string;
  customerName: string;
  customerEmail: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'failed';
  paymentStatus: 'paid' | 'unpaid' | 'refunded';
  total: number;
  items: RawOrderItem[];
  createdAt: string;
  updatedAt: string;
  shippingAddress: string;
  paymentMethod: string;
  userId: number;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  // Map API order status to our UI status
  const mapApiStatusToUiStatus = (apiStatus: string): Order['status'] => {
    switch (apiStatus.toLowerCase()) {
      case 'pending':
      case 'confirmed':
      case 'processing':
      case 'shipped':
      case 'delivered':
      case 'cancelled':
      case 'returned':
      case 'failed':
        return apiStatus.toLowerCase() as Order['status'];
      case 'paid':
      case 'completed':
        // Map 'paid' and 'completed' to 'delivered' as they indicate order fulfillment
        return 'delivered';
      default:
        console.warn(`Unknown order status: ${apiStatus}, defaulting to 'pending'`);
        return 'pending';
    }
  };

  const determinePaymentStatus = (rawOrder: RawApiOrder): Order['paymentStatus'] => {
    // Check the actual order status to determine if payment was completed
    const orderStatus = rawOrder.status.toLowerCase();
    
    // These statuses mean payment was successful
    if (orderStatus === 'paid' || 
        orderStatus === 'confirmed' || 
        orderStatus === 'processing' || 
        orderStatus === 'shipped' || 
        orderStatus === 'delivered') {
      return 'paid';
    }
    
    // Refunded status
    if (orderStatus === 'refunded' || orderStatus === 'returned') {
      return 'refunded';
    }
    
    // All other statuses (pending, failed, cancelled, expired) mean unpaid
    return 'unpaid';
  };

  // Transform raw API order to UI order
  const transformRawOrderToUiOrder = (rawOrder: RawApiOrder): Order => {
    return {
      id: rawOrder.id.toString(),
      displayId: `ORD-${rawOrder.id.toString().padStart(4, '0')}`,
      orderNumber: rawOrder.orderNumber,
      customerName: rawOrder.user?.name || 'Unknown Customer',
      customerEmail: rawOrder.user?.email || 'No email',
      status: mapApiStatusToUiStatus(rawOrder.status),
      paymentStatus: determinePaymentStatus(rawOrder),
      total: toNumber(rawOrder.totalAmount),
      items: rawOrder.items || [],
      createdAt: rawOrder.createdAt,
      updatedAt: rawOrder.updatedAt,
      shippingAddress: rawOrder.shippingAddress,
      paymentMethod: rawOrder.paymentMethod,
      userId: rawOrder.userId
    };
  };

  // Fetch orders data from API and transform it
  const fetchOrdersData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch orders from API
      const response = await adminApiService.getOrders() as any;
      
      // Extract the raw orders data from the response
      let rawOrdersData: RawApiOrder[] = [];
      
      if (response && typeof response === 'object') {
        // Check if response has a 'data' property (array)
        if (response.data && Array.isArray(response.data)) {
          rawOrdersData = response.data as RawApiOrder[];
        } 
        // Check if response has an 'orders' property (array)
        else if (response.orders && Array.isArray(response.orders)) {
          rawOrdersData = response.orders as RawApiOrder[];
        }
        // If response is directly an array of orders
        else if (Array.isArray(response)) {
          rawOrdersData = response as RawApiOrder[];
        }
      }
      
      // Transform raw API data to our UI format
      const transformedOrders: Order[] = rawOrdersData.map(transformRawOrderToUiOrder);
      
      setOrders(transformedOrders);
      
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load orders. Please try again.');
      toast({
        variant: "destructive",
        title: "Error loading orders",
        description: "Could not fetch orders data.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersData();
  }, []);

  const filteredOrders = orders.filter((order) => {
    // Search filter - include shipping address in search
    const matchesSearch = 
      (order.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (order.customerEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (order.displayId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (order.shippingAddress?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    // Payment filter
    const matchesPayment = paymentFilter === "all" || order.paymentStatus === paymentFilter;
    
    return matchesSearch && matchesStatus && matchesPayment;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, paymentFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Confirmed</Badge>;
      case "processing":
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">Processing</Badge>;
      case "shipped":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Shipped</Badge>;
      case "delivered":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Delivered</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
      case "returned":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Returned</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Failed</Badge>;
      default:
        return <Badge className="capitalize">{status}</Badge>;
    }
  };
  
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800 border-green-200 capitalize">{status}</Badge>;
      case "unpaid":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 capitalize">{status}</Badge>;
      case "refunded":
        return <Badge variant="outline" className="text-gray-600 border-gray-300 capitalize">{status}</Badge>;
      default:
        return <Badge className="capitalize">{status}</Badge>;
    }
  };

  // Calculate stats (order.total is guaranteed to be a number after transform)
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + toNumber(order.total), 0);
  const paidOrders = filteredOrders.filter(o => o.paymentStatus === 'paid').length;
  const completedOrders = filteredOrders.filter(o => o.status === 'delivered').length;
  const avgOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;

  const SkeletonRow = () => (
    <TableRow>
      <TableCell>
        <div className="h-4 bg-muted rounded animate-pulse w-20" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 bg-muted rounded animate-pulse" />
          <div className="h-10 w-10 bg-muted rounded animate-pulse" />
          <div className="h-10 w-10 bg-muted rounded animate-pulse" />
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-24" />
          <div className="h-3 bg-muted rounded animate-pulse w-32" />
        </div>
      </TableCell>
      <TableCell>
        <div className="h-4 bg-muted rounded animate-pulse w-16" />
      </TableCell>
      <TableCell>
        <div className="h-6 bg-muted rounded animate-pulse w-20" />
      </TableCell>
      <TableCell>
        <div className="h-6 bg-muted rounded animate-pulse w-16" />
      </TableCell>
      <TableCell>
        <div className="h-4 bg-muted rounded animate-pulse w-12 ml-auto" />
      </TableCell>
      <TableCell>
        <div className="h-9 bg-muted rounded animate-pulse w-10 ml-auto" />
      </TableCell>
    </TableRow>
  );

  if (error && orders.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <Button onClick={fetchOrdersData} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Failed to load orders</p>
            <p className="text-muted-foreground text-center mb-4">{error}</p>
            <Button onClick={fetchOrdersData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <Button onClick={fetchOrdersData} variant="outline" disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <div className="h-8 bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 bg-muted rounded animate-pulse" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{filteredOrders.length}</div>
                <p className="text-xs text-muted-foreground">
                  {completedOrders} completed
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <BanknoteIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <div className="h-8 bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 bg-muted rounded animate-pulse" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  From {paidOrders} paid orders
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <div className="h-8 bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 bg-muted rounded animate-pulse" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">${avgOrderValue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  Per order average
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <div className="h-8 bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 bg-muted rounded animate-pulse" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {filteredOrders.filter(o => o.status === 'pending').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting processing
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Order Management</CardTitle>
          <CardDescription>Manage and track customer orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, order ID, or shipping address..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter} disabled={isLoading}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={paymentFilter} onValueChange={setPaymentFilter} disabled={isLoading}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Show skeleton loading rows
                Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonRow key={index} />
                ))
              ) : paginatedOrders.length > 0 ? (
                paginatedOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Link 
                        to={`/admin/orders/${order.displayId}`} 
                        className="hover:underline text-blue-600 hover:text-blue-800"
                      >
                        {order.orderNumber || order.displayId}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {order.items && order.items.length > 0 ? (
                          <>
                            {order.items.slice(0, 3).map((item) => (
                              <div key={item.id} className="relative">
                                <AsyncImageLoader
                                  src={item.image || (item.product?.images && item.product.images[0]) || ''}
                                  alt={item.productName || 'Product image'}
                                  className="h-10 w-10 object-cover rounded-md border"
                                />
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <div className="h-10 w-10 flex items-center justify-center bg-muted rounded-md border text-xs font-medium">
                                +{order.items.length - 3}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="h-10 w-10 flex items-center justify-center bg-muted rounded-md border">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[180px]">
                        <div className="font-medium truncate" title={order.customerName}>{order.customerName}</div>
                        <div className="text-sm text-muted-foreground truncate" title={order.customerEmail}>
                          {order.customerEmail}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{getPaymentStatusBadge(order.paymentStatus)}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${toNumber(order.total).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link 
                        to={`/admin/orders/${order.displayId}`} 
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <div className="flex flex-col items-center">
                      <Package className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-lg font-medium">No orders found</p>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm || statusFilter !== 'all' || paymentFilter !== 'all' 
                          ? "Try adjusting your filters or search terms" 
                          : "Orders will appear here once customers start purchasing"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {paginatedOrders.length > 0 && (
            <div className="flex justify-between items-center py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
              </div>
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}