// import { useState, useEffect } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import AsyncImageLoader from "@/components/AsyncImageLoader";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Separator } from "@/components/ui/separator";
// import { Textarea } from "@/components/ui/textarea";
// import { Label } from "@/components/ui/label";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";
// import {
//   ArrowLeft,
//   Package,
//   Clock,
//   CheckCircle,
//   XCircle,
//   Truck,
//   CreditCard,
//   DollarSign,
//   User,
//   MapPin,
//   Mail,
//   Calendar,
//   FileText,
//   Printer,
//   Download,
//   Trash2,
//   RefreshCw,
//   AlertCircle,
//   ShoppingBag,
//   Tag,
//   Hash,
//   Percent
// } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";
// import adminApiService from "@/contexts/adminApiService";

// // Define interfaces based on the actual raw API response
// interface RawOrderItem {
//   id: number;
//   orderId: number;
//   productId: number;
//   productName: string;
//   image: string; // API returns singular 'image', not 'images'
//   quantity: number;
//   price: number;
//   createdAt: string;
//   updatedAt: string;
//   product?: {
//     id: number;
//     name: string;
//     price: string;
//     images: string[];
//   };
// }

// interface RawOrderUser {
//   id: number;
//   name: string;
//   email: string;
// }

// interface RawApiOrder {
//   id: number;
//   userId: number;
//   status: string;
//   totalAmount: number;
//   paymentIntentId: string | null;
//   paymentMethod: string;
//   shippingAddress: string;
//   orderNumber?: string;
//   createdAt: string;
//   updatedAt: string;
//   user: RawOrderUser;
//   items: RawOrderItem[];
//   // Optional breakdown fields that may come from API
//   tax?: number;
//   shippingCost?: number;
//   discount?: number;
//   subtotal?: number;
// }

// // Our UI Order type
// interface Order {
//   id: string;
//   displayId: string;
//   orderNumber?: string;
//   customerName: string;
//   customerEmail: string;
//   status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'failed';
//   paymentStatus: 'paid' | 'unpaid' | 'refunded';
//   total: number;
//   items: RawOrderItem[];
//   createdAt: string;
//   updatedAt: string;
//   shippingAddress: string;
//   paymentMethod: string;
//   userId: number;
//   subtotal?: number;
//   tax?: number;
//   shippingCost?: number;
//   discount?: number;
//   notes?: string;
// }

// export default function OrderDetailsPage() {
//   const { orderId } = useParams<{ orderId: string }>();
//   const navigate = useNavigate();
//   const [order, setOrder] = useState<Order | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [updatingStatus, setUpdatingStatus] = useState(false);
//   const [statusDialogOpen, setStatusDialogOpen] = useState(false);
//   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
//   const [newStatus, setNewStatus] = useState<Order['status']>('pending');
//   const { toast } = useToast();


//   const fetchOrderData = async () => {
//     if (!orderId) return;
    
//     try {
//       setIsLoading(true);
//       setError(null);
      

//       const response = await adminApiService.getOrders() as any;

//       console.log('🔍 Raw API Response:', response);
      
//       let rawOrdersData: RawApiOrder[] = [];
      
//       if (response && typeof response === 'object') {
//         if (response.data && Array.isArray(response.data)) {
//           rawOrdersData = response.data as RawApiOrder[];
//         } else if (response.orders && Array.isArray(response.orders)) {
//           rawOrdersData = response.orders as RawApiOrder[];
//         } else if (Array.isArray(response)) {
//           rawOrdersData = response as RawApiOrder[];
//           // eslint-disable-next-line no-dupe-else-if
//         } else if (response.success && response.data && Array.isArray(response.data)) {
//           rawOrdersData = response.data as RawApiOrder[];
//         }
//       }
      
//       // Find the order by ID (strip the ORD- prefix if present)
//       const numericOrderId = orderId.replace('ORD-', '');
//       const rawOrder = rawOrdersData.find(order => 
//         order.id.toString() === numericOrderId || 
//         `ORD-${order.id.toString().padStart(4, '0')}` === orderId
//       );
      
//       if (!rawOrder) {
//         throw new Error('Order not found');
//       }
      
//       // Transform to UI format
//       const calculatedSubtotal = rawOrder.subtotal || calculateSubtotal(rawOrder.items);
//       const totalAmount = rawOrder.totalAmount || 0;

//       // Calculate tax as the difference between total and subtotal
//       // Formula: Total = Subtotal + Tax + Shipping - Discount
//       // Therefore: Tax = Total - Subtotal - Shipping + Discount
//       const calculatedTax = totalAmount - calculatedSubtotal - (rawOrder.shippingCost || 0) + (rawOrder.discount || 0);

//       const transformedOrder: Order = {
//         id: rawOrder.id.toString(),
//         displayId: `ORD-${rawOrder.id.toString().padStart(4, '0')}`,
//         orderNumber: rawOrder.orderNumber,
//         customerName: rawOrder.user?.name || 'Unknown Customer',
//         customerEmail: rawOrder.user?.email || 'No email',
//         status: mapApiStatusToUiStatus(rawOrder.status),
//         paymentStatus: determinePaymentStatus(rawOrder),
//         total: totalAmount,
//         items: rawOrder.items || [],
//         createdAt: rawOrder.createdAt,
//         updatedAt: rawOrder.updatedAt,
//         shippingAddress: rawOrder.shippingAddress,
//         paymentMethod: rawOrder.paymentMethod,
//         userId: rawOrder.userId,
//         subtotal: calculatedSubtotal,
//         // Use API-provided tax if available, otherwise calculate from total-subtotal difference
//         // Only show calculated tax if it's a positive value
//         tax: rawOrder.tax !== undefined ? rawOrder.tax : (calculatedTax > 0 ? calculatedTax : undefined),
//         shippingCost: rawOrder.shippingCost,
//         discount: rawOrder.discount,
//         notes: undefined // Will be populated from API if available
//       };

      
//       setOrder(transformedOrder);

      
//     } catch (err) {
//       setError('Failed to load order details. The order may not exist.');
//       toast({
//         variant: "destructive",
//         title: "Error loading order",
//         description: "Could not fetch order data.",
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchOrderData();
//   }, [orderId]);

//   // Helper functions
//   const mapApiStatusToUiStatus = (apiStatus: string): Order['status'] => {
//     switch (apiStatus.toLowerCase()) {
//       case 'pending':
//       case 'confirmed':
//       case 'processing':
//       case 'shipped':
//       case 'delivered':
//       case 'cancelled':
//       case 'returned':
//       case 'failed':
//         return apiStatus.toLowerCase() as Order['status'];
//       default:
//         return 'pending';
//     }
//   };


 

// const determinePaymentStatus = (rawOrder: RawApiOrder): Order['paymentStatus'] => {
//   // Check the actual order status to determine if payment was completed
//   const orderStatus = rawOrder.status.toLowerCase();
  
//   // These statuses mean payment was successful
//   if (orderStatus === 'paid' || 
//       orderStatus === 'confirmed' || 
//       orderStatus === 'processing' || 
//       orderStatus === 'shipped' || 
//       orderStatus === 'delivered') {
//     return 'paid';
//   }
  
//   // Refunded status
//   if (orderStatus === 'refunded' || orderStatus === 'returned') {
//     return 'refunded';
//   }
  
//   // All other statuses (pending, failed, cancelled, expired) mean unpaid
//   return 'unpaid';
// };


//   const calculateSubtotal = (items: RawOrderItem[]): number => {
//     return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
//   };


//   const getStatusBadge = (status: string) => {
//     switch (status) {
//       case "confirmed":
//         return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Order Confirmed</Badge>;
//       case "processing":
//         return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">Being Prepared</Badge>;
//       case "shipped":
//         return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Handed to Courier</Badge>;
//       case "delivered":
//         return <Badge className="bg-green-100 text-green-800 border-green-200">Completed Successfully</Badge>;
//       case "pending":
//         return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
//       case "cancelled":
//         return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
//       case "returned":
//         return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Returned After Delivery</Badge>;
//       case "failed":
//         return <Badge className="bg-red-100 text-red-800 border-red-200">System/Fulfillment Failure</Badge>;
//       default:
//         return <Badge className="capitalize">{status}</Badge>;
//     }
//   };
  
//   const getPaymentStatusBadge = (status: string) => {
//     switch (status) {
//       case "paid":
//         return <Badge className="bg-green-100 text-green-800 border-green-200 capitalize">{status}</Badge>;
//       case "unpaid":
//         return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 capitalize">{status}</Badge>;
//       case "refunded":
//         return <Badge variant="outline" className="text-gray-600 border-gray-300 capitalize">{status}</Badge>;
//       default:
//         return <Badge className="capitalize">{status}</Badge>;
//     }
//   };

//   const getStatusIcon = (status: string) => {
//     switch (status) {
//       case "confirmed":
//         return <CheckCircle className="h-5 w-5 text-blue-600" />;
//       case "processing":
//         return <RefreshCw className="h-5 w-5 text-indigo-600" />;
//       case "shipped":
//         return <Truck className="h-5 w-5 text-purple-600" />;
//       case "delivered":
//         return <CheckCircle className="h-5 w-5 text-green-600" />;
//       case "pending":
//         return <Clock className="h-5 w-5 text-yellow-600" />;
//       case "cancelled":
//         return <XCircle className="h-5 w-5 text-red-600" />;
//       case "returned":
//         return <RefreshCw className="h-5 w-5 text-orange-600" />;
//       case "failed":
//         return <AlertCircle className="h-5 w-5 text-red-600" />;
//       default:
//         return <Clock className="h-5 w-5 text-gray-600" />;
//     }
//   };

//   const getPaymentIcon = (status: string) => {
//     switch (status) {
//       case "paid":
//         return <DollarSign className="h-5 w-5 text-green-600" />;
//       case "unpaid":
//         return <CreditCard className="h-5 w-5 text-yellow-600" />;
//       case "refunded":
//         return <RefreshCw className="h-5 w-5 text-gray-600" />;
//       default:
//         return <CreditCard className="h-5 w-5 text-gray-600" />;
//     }
//   };

//   // Handler functions
//   const handleStatusUpdate = async () => {
//     if (!order) return;
    
//     setUpdatingStatus(true);
//     try {
//       // Call the backend API to update the order status
//       await adminApiService.updateOrderStatus(order.id, newStatus);
      
//       // Update local state
//       setOrder({...order, status: newStatus, updatedAt: new Date().toISOString()});
      
//       toast({
//         title: "Order status updated",
//         description: `Order ${order.displayId} is now ${newStatus}`
//       });
//       setStatusDialogOpen(false);
//     } catch (err) {
//       console.error('Failed to update order status:', err);
//       toast({
//         variant: "destructive",
//         title: "Error updating order",
//         description: "Could not update order status. Please try again.",
//       });
//     } finally {
//       setUpdatingStatus(false);
//     }
//   };

//   const handlePrintInvoice = () => {
//     window.print();
//   };

//   const handleDeleteOrder = async () => {
//     if (!order) return;
    
//     try {
//       // Call the backend API to delete the order
//       await adminApiService.deleteOrder(order.id);
      
//       toast({
//         title: "Order deleted",
//         description: `Order ${order.displayId} has been deleted.`
//       });
//       navigate('/orders');
//     } catch (err) {
//       console.error('Failed to delete order:', err);
//       toast({
//         variant: "destructive",
//         title: "Error deleting order",
//         description: "Could not delete order. Please try again.",
//       });
//     }
//   };

//   const formatDate = (dateString: string) => {
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-US', {
//       year: 'numeric',
//       month: 'long',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   const calculateItemTotal = (item: RawOrderItem) => {
//     return (item.price || 0) * (item.quantity || 0);
//   };

//   // Loading state
//   if (isLoading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
//         <div className="container mx-auto py-8 px-4">
//           {/* Skeleton Header */}
//           <div className="flex items-center gap-4 mb-8">
//             <div className="h-10 w-10 bg-muted rounded-lg animate-pulse" />
//             <div className="space-y-2 flex-1">
//               <div className="h-8 bg-muted rounded-lg animate-pulse w-64" />
//               <div className="h-4 bg-muted rounded animate-pulse w-48" />
//             </div>
//             <div className="hidden md:flex gap-2">
//               <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
//               <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
//             </div>
//           </div>

//           {/* Skeleton Cards */}
//           <div className="space-y-6">
//             {/* Summary Skeleton */}
//             <Card className="border-2 shadow-lg">
//               <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
//                 <div className="space-y-3">
//                   <div className="h-6 bg-muted rounded-lg animate-pulse w-48" />
//                   <div className="h-4 bg-muted rounded animate-pulse w-64" />
//                 </div>
//               </CardHeader>
//               <CardContent className="pt-6">
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                   {[1, 2, 3, 4].map((i) => (
//                     <div key={i} className="space-y-3 p-4 rounded-lg border animate-pulse">
//                       <div className="h-10 bg-muted rounded-lg w-full" />
//                       <div className="h-16 bg-muted rounded w-full" />
//                     </div>
//                   ))}
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Content Skeleton */}
//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//               <div className="lg:col-span-2 space-y-6">
//                 <Card className="shadow-md">
//                   <CardHeader>
//                     <div className="h-6 bg-muted rounded-lg animate-pulse w-40" />
//                   </CardHeader>
//                   <CardContent className="space-y-4">
//                     {[1, 2, 3].map((i) => (
//                       <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
//                     ))}
//                   </CardContent>
//                 </Card>
//               </div>
//               <div className="space-y-6">
//                 {[1, 2].map((i) => (
//                   <Card key={i} className="shadow-md">
//                     <CardHeader>
//                       <div className="h-6 bg-muted rounded-lg animate-pulse w-32" />
//                     </CardHeader>
//                     <CardContent>
//                       <div className="space-y-3">
//                         <div className="h-10 bg-muted rounded animate-pulse" />
//                         <div className="h-10 bg-muted rounded animate-pulse" />
//                       </div>
//                     </CardContent>
//                   </Card>
//                 ))}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Error state
//   if (error || !order) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
//         <div className="container mx-auto py-8 px-4">
//           <div className="flex items-center gap-4 mb-8">
//             <Button
//               variant="outline"
//               size="icon"
//               onClick={() => navigate('/admin/orders')}
//               className="hover:bg-primary hover:text-primary-foreground transition-colors"
//             >
//               <ArrowLeft className="h-4 w-4" />
//             </Button>
//             <div>
//               <h1 className="text-2xl font-bold">Order Not Found</h1>
//               <p className="text-sm text-muted-foreground">Unable to load order details</p>
//             </div>
//           </div>

//           <Card className="border-2 shadow-xl max-w-2xl mx-auto">
//             <CardContent className="flex flex-col items-center justify-center py-16 px-6">
//               <div className="relative mb-6">
//                 <div className="absolute inset-0 bg-red-100 dark:bg-red-900/20 rounded-full blur-2xl opacity-50"></div>
//                 <div className="relative bg-red-50 dark:bg-red-900/30 p-6 rounded-full">
//                   <AlertCircle className="h-16 w-16 text-red-500" />
//                 </div>
//               </div>

//               <h2 className="text-2xl font-bold mb-3">Order Not Found</h2>
//               <p className="text-muted-foreground text-center mb-6 max-w-md">
//                 {error || "The order you're looking for doesn't exist or has been removed from the system."}
//               </p>

//               <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
//                 <Button
//                   onClick={() => navigate('/admin/orders')}
//                   className="flex-1"
//                 >
//                   <ArrowLeft className="mr-2 h-4 w-4" />
//                   Back to Orders
//                 </Button>
//                 <Button
//                   variant="outline"
//                   onClick={() => window.location.reload()}
//                   className="flex-1"
//                 >
//                   <RefreshCw className="mr-2 h-4 w-4" />
//                   Try Again
//                 </Button>
//               </div>

//               <div className="mt-8 p-4 bg-muted/50 rounded-lg w-full max-w-md">
//                 <p className="text-sm text-muted-foreground text-center">
//                   <strong>Need help?</strong> Contact support if you believe this is an error.
//                 </p>
//               </div>
//             </CardContent>
//           </Card>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900">
//       <div className="container mx-auto py-8 px-4">
//         {/* Breadcrumb Navigation */}
//         <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
//           <Button
//             variant="ghost"
//             size="sm"
//             onClick={() => navigate('/admin/orders')}
//             className="hover:text-foreground"
//           >
//             Orders
//           </Button>
//           <span>/</span>
//           <span className="text-foreground font-medium">
//             {order.orderNumber || order.displayId}
//           </span>
//         </div>

//         {/* Header */}
//         <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
//           <div className="flex items-start gap-4">
//             <Button
//               variant="outline"
//               size="icon"
//               onClick={() => navigate(-1)}
//               className="hover:bg-primary hover:text-primary-foreground transition-colors shrink-0 mt-1"
//             >
//               <ArrowLeft className="h-4 w-4" />
//             </Button>
//             <div className="space-y-2">
//               <div className="flex items-center gap-3 flex-wrap">
//                 <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
//                   Order Details
//                 </h1>
//               </div>
//               <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-muted-foreground">

//                 <span className="hidden sm:inline">•</span>
//                 <div className="flex items-center gap-2">
//                   <Calendar className="h-4 w-4" />
//                   <span>Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
//                     month: 'short',
//                     day: 'numeric',
//                     year: 'numeric'
//                   })}</span>
//                 </div>
//               </div>
//             </div>
//           </div>
//           <div className="flex items-center gap-2 flex-wrap">
//             <Button
//               variant="outline"
//               onClick={handlePrintInvoice}
//               className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-blue-950 transition-colors"
//             >
//               <Printer className="h-4 w-4 mr-2" />
//               Print
//             </Button>
//             <Button
//               variant="outline"
//               className="hover:bg-green-50 hover:text-green-600 hover:border-green-200 dark:hover:bg-green-950 transition-colors"
//             >
//               <Download className="h-4 w-4 mr-2" />
//               Export
//             </Button>
//             <Button
//               onClick={() => {
//                 setNewStatus(order.status);
//                 setStatusDialogOpen(true);
//               }}
//               className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30"
//             >
//               <RefreshCw className="h-4 w-4 mr-2" />
//               Update Status
//             </Button>
//             <Button
//               variant="outline"
//               onClick={() => setDeleteDialogOpen(true)}
//               className="text-red-600 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950 transition-colors"
//             >
//               <Trash2 className="h-4 w-4 mr-2" />
//               Delete
//             </Button>
//           </div>
//         </div>

//         <div className="grid gap-6">
//           {/* Order Summary */}
//           <Card className="border-2 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
//             <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-1.5"></div>
//             <CardHeader className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 pb-6">
//               <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
//                 <div className="space-y-3">
//                   <div className="flex items-center gap-3">
//                     <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg">
//                       <Package className="h-5 w-5 text-white" />
//                     </div>
//                     <CardTitle className="text-2xl">Order Summary</CardTitle>
//                   </div>
//                   <CardDescription className="text-sm flex items-center gap-2">
//                     <Clock className="h-4 w-4" />
//                     Last updated: {formatDate(order.updatedAt)}
//                   </CardDescription>
//                 </div>
//                 <div className="flex flex-wrap items-center gap-3">
//                   <div className="flex items-center gap-2 bg-white dark:bg-gray-900 px-4 py-2.5 rounded-xl border-2 shadow-sm hover:shadow-md transition-shadow">
//                     {getStatusIcon(order.status)}
//                     {getStatusBadge(order.status)}
//                   </div>
//                   <div className="flex items-center gap-2 bg-white dark:bg-gray-900 px-4 py-2.5 rounded-xl border-2 shadow-sm hover:shadow-md transition-shadow">
//                     {getPaymentIcon(order.paymentStatus)}
//                     {getPaymentStatusBadge(order.paymentStatus)}
//                   </div>
//                 </div>
//               </div>
//             </CardHeader>
//             <CardContent className="pt-6">
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                 {/* Customer Info */}
//                 <div className="group relative overflow-hidden rounded-xl border-2 bg-gradient-to-br from-blue-50 via-white to-blue-50/30 dark:from-blue-950/20 dark:via-gray-900 dark:to-blue-950/10 p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
//                   <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
//                   <div className="relative space-y-4">
//                     <div className="flex items-center gap-3">
//                       <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
//                         <User className="h-5 w-5 text-white" />
//                       </div>
//                       <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100">Customer</h3>
//                     </div>
//                     <div className="space-y-3">
//                       <div className="space-y-2">
//                         <p className="font-bold text-lg text-foreground">{order.customerName}</p>
//                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
//                           <Mail className="h-3.5 w-3.5 flex-shrink-0" />
//                           <span className="truncate">{order.customerEmail}</span>
//                         </div>
//                       </div>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         className="w-full text-xs hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:hover:bg-blue-950 transition-colors"
//                         onClick={() => navigate(`#`)}
//                       >
//                         <User className="h-3 w-3 mr-1.5" />
//                         View Details
//                       </Button>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Shipping Info */}
//                 <div className="group relative overflow-hidden rounded-xl border-2 bg-gradient-to-br from-green-50 via-white to-green-50/30 dark:from-green-950/20 dark:via-gray-900 dark:to-green-950/10 p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
//                   <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>
//                   <div className="relative space-y-4">
//                     <div className="flex items-center gap-3">
//                       <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/30">
//                         <Truck className="h-5 w-5 text-white" />
//                       </div>
//                       <h3 className="text-sm font-bold text-green-900 dark:text-green-100">Shipping</h3>
//                     </div>
//                     <div className="space-y-2.5">
//                       <p className="font-bold text-sm">Delivery Address</p>
//                       <div className="flex items-start gap-2 text-sm text-muted-foreground">
//                         <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
//                         <span className="break-words line-clamp-2">{order.shippingAddress}</span>
//                       </div>
//                       <div className="flex items-center gap-2 text-xs bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-md w-fit">
//                         <CreditCard className="h-3 w-3" />
//                         <span>{order.paymentMethod || 'Not specified'}</span>
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Order Timeline */}
//                 <div className="group relative overflow-hidden rounded-xl border-2 bg-gradient-to-br from-purple-50 via-white to-purple-50/30 dark:from-purple-950/20 dark:via-gray-900 dark:to-purple-950/10 p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
//                   <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
//                   <div className="relative space-y-4">
//                     <div className="flex items-center gap-3">
//                       <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30">
//                         <Calendar className="h-5 w-5 text-white" />
//                       </div>
//                       <h3 className="text-sm font-bold text-purple-900 dark:text-purple-100">Timeline</h3>
//                     </div>
//                     <div className="space-y-3">
//                       <div>
//                         <p className="text-xs text-muted-foreground mb-1">Created</p>
//                         <p className="font-semibold text-sm">{new Date(order.createdAt).toLocaleDateString('en-US', {
//                           month: 'short',
//                           day: 'numeric',
//                           year: 'numeric'
//                         })}</p>
//                         <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString('en-US', {
//                           hour: '2-digit',
//                           minute: '2-digit'
//                         })}</p>
//                       </div>
//                       <Separator />
//                       <div>
//                         <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
//                         <p className="font-semibold text-sm">{new Date(order.updatedAt).toLocaleDateString('en-US', {
//                           month: 'short',
//                           day: 'numeric',
//                           year: 'numeric'
//                         })}</p>
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Order Stats */}
//                 <div className="group relative overflow-hidden rounded-xl border-2 bg-gradient-to-br from-orange-50 via-white to-orange-50/30 dark:from-orange-950/20 dark:via-gray-900 dark:to-orange-950/10 p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
//                   <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl"></div>
//                   <div className="relative space-y-4">
//                     <div className="flex items-center gap-3">
//                       <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
//                         <DollarSign className="h-5 w-5 text-white" />
//                       </div>
//                       <h3 className="text-sm font-bold text-orange-900 dark:text-orange-100">Amount</h3>
//                     </div>
//                     <div className="space-y-3">
//                       <div>
//                         <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
//                         <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
//                           ${(order.total ?? 0).toFixed(2)}
//                         </p>
//                       </div>
//                       <div className="space-y-2 pt-2 border-t">
//                         <div className="flex justify-between text-xs">
//                           <span className="text-muted-foreground">Items:</span>
//                           <span className="font-bold">{order.items.flatMap(item=> item.quantity)}</span>
//                         </div>
//                         <div className="flex justify-between text-xs">
//                           <span className="text-muted-foreground">Subtotal:</span>
//                           <span className="font-bold">${(order.subtotal ?? order.total ?? 0).toFixed(2)}</span>
//                         </div>
//                         {order.orderNumber && (
//                           <div className="flex items-center gap-1 text-xs bg-orange-50 dark:bg-orange-950/30 px-2 py-1 rounded-md">
//                             <Hash className="h-3 w-3" />
//                             <span className="font-mono font-semibold truncate">{order.orderNumber}</span>
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Main Content */}
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//             {/* Left Column - Order Items & Notes */}
//             <div className="lg:col-span-2 space-y-6">
//               {/* Order Items */}
//               <Card className="shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
//                 <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1"></div>
//                 <CardHeader className="bg-gradient-to-r from-indigo-50/30 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/20">
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <CardTitle className="flex items-center gap-2 text-xl">
//                         <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
//                           <ShoppingBag className="h-5 w-5 text-white" />
//                         </div>
//                         Order Items
//                       </CardTitle>
//                       <CardDescription className="mt-2">
//                         {order.items.length} {order.items.length === 1 ? 'item' : 'items'} in this order
//                       </CardDescription>
//                     </div>
//                     <Badge variant="secondary" className="text-lg px-4 py-2 font-bold">
//                       {order.items.length}
//                     </Badge>
//                   </div>
//                 </CardHeader>
//                 <CardContent className="p-0">
//                   <div className="overflow-x-auto">
//                     <Table>
//                       <TableHeader className="bg-muted/50">
//                         <TableRow>
//                           <TableHead className="font-bold">Product</TableHead>
//                           <TableHead className="text-center font-bold">Quantity</TableHead>
//                           <TableHead className="text-right font-bold">Unit Price</TableHead>
//                           <TableHead className="text-right font-bold">Total</TableHead>
//                         </TableRow>
//                       </TableHeader>
//                       <TableBody>
//                         {order.items.length > 0 ? (
//                           order.items.map((item, index) => (
//                             <TableRow
//                               key={item.id}
//                               className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 dark:hover:from-blue-950/20 dark:hover:to-indigo-950/20 transition-all duration-200"
//                             >
//                               <TableCell className="py-4">
//                                 <div className="flex items-center gap-4">
//                                   <div className="relative">
//                                     <div className="h-14 w-14 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow overflow-hidden">
//                                       <AsyncImageLoader
//                                         src={item.image || (item.product?.images && item.product.images[0]) || ''}
//                                         alt={item.productName || 'Product image'}
//                                         className="h-full w-full object-cover rounded-lg"
//                                       />
//                                     </div>
//                                     <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
//                                       {index + 1}
//                                     </div>
//                                   </div>
//                                   <div className="flex-1 min-w-0">
//                                     <p className="font-semibold text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
//                                       {item.productName}
//                                     </p>
//                                   </div>
//                                 </div>
//                               </TableCell>
//                               <TableCell className="text-center">
//                                 <Badge variant="secondary" className="px-8 py-2 text-base font-bold bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border-0">
//                                   ×{item.quantity}
//                                 </Badge>
//                               </TableCell>
//                               <TableCell className="text-right">
//                                 <div className="font-semibold text-base">
//                                   ${(item.price || 0).toFixed(2)}
//                                 </div>
//                                 <div className="text-xs text-muted-foreground">per unit</div>
//                               </TableCell>
//                               <TableCell className="text-right">
//                                 <div className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
//                                   ${calculateItemTotal(item).toFixed(2)}
//                                 </div>
//                               </TableCell>
//                             </TableRow>
//                           ))
//                         ) : (
//                           <TableRow>
//                             <TableCell colSpan={4} className="text-center py-12">
//                               <div className="flex flex-col items-center">
//                                 <div className="p-4 rounded-full bg-muted mb-4">
//                                   <Package className="h-12 w-12 text-muted-foreground" />
//                                 </div>
//                                 <p className="text-lg font-semibold mb-1">No items found</p>
//                                 <p className="text-sm text-muted-foreground">
//                                   This order doesn't contain any items
//                                 </p>
//                               </div>
//                             </TableCell>
//                           </TableRow>
//                         )}
//                       </TableBody>
//                     </Table>
//                   </div>
//                 </CardContent>
//                 {order.items.length > 0 && (
//                   <CardFooter className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-t py-4">
//                     <div className="flex items-center justify-between w-full">
//                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
//                         <ShoppingBag className="h-4 w-4" />
//                         <span>Total Items: {order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
//                       </div>
//                       <div className="text-right">
//                         <p className="text-sm text-muted-foreground mb-1">Subtotal</p>
//                         <p className="text-xl font-bold">${(order.subtotal || order.total).toFixed(2)}</p>
//                       </div>
//                     </div>
//                   </CardFooter>
//                 )}
//               </Card>

//               {/* Order Notes */}
//               {order.notes && (
//                 <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
//                   <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-1"></div>
//                   <CardHeader className="bg-gradient-to-r from-amber-50/30 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/20">
//                     <CardTitle className="flex items-center gap-2">
//                       <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
//                         <FileText className="h-5 w-5 text-white" />
//                       </div>
//                       Order Notes
//                     </CardTitle>
//                     <CardDescription>Special instructions or remarks</CardDescription>
//                   </CardHeader>
//                   <CardContent className="pt-6">
//                     <div className="p-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-amber-500">
//                       <p className="text-sm leading-relaxed">{order.notes}</p>
//                     </div>
//                   </CardContent>
//                 </Card>
//               )}
//             </div>

//             {/* Right Column - Order Summary & Actions */}
//             <div className="space-y-6">
//               {/* Order Totals */}
//               <Card className="shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
//                 <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-1"></div>
//                 <CardHeader className="bg-gradient-to-r from-green-50/30 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/20">
//                   <CardTitle className="flex items-center gap-2 text-xl">
//                     <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
//                       <DollarSign className="h-5 w-5 text-white" />
//                     </div>
//                     Order Totals
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent className="pt-6">
//                   <div className="space-y-4">
//                     <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
//                       <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
//                       <span className="font-bold text-base">${(order.subtotal || order.total).toFixed(2)}</span>
//                     </div>
//                     {order.shippingCost && order.shippingCost > 0 && (
//                       <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
//                         <div className="flex items-center gap-2">
//                           <Truck className="h-4 w-4 text-blue-600" />
//                           <span className="text-sm font-medium text-muted-foreground">Shipping</span>
//                         </div>
//                         <span className="font-bold text-sm">${order.shippingCost.toFixed(2)}</span>
//                       </div>
//                     )}
//                     {order.tax && order.tax > 0 && (
//                       <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
//                         <div className="flex items-center gap-2">
//                           <Percent className="h-4 w-4 text-amber-600" />
//                           <span className="text-sm font-medium text-muted-foreground">Tax</span>
//                         </div>
//                         <span className="font-bold text-sm">${order.tax.toFixed(2)}</span>
//                       </div>
//                     )}
//                     {order.discount && order.discount > 0 && (
//                       <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-800/20 border border-green-200 dark:border-green-800">
//                         <div className="flex items-center gap-2">
//                           <Tag className="h-4 w-4 text-green-600" />
//                           <span className="text-sm font-medium text-muted-foreground">Discount</span>
//                         </div>
//                         <span className="font-bold text-base text-green-600">-${order.discount.toFixed(2)}</span>
//                       </div>
//                     )}
//                     <Separator className="my-4" />
//                     <div className="flex justify-between items-center p-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/30">
//                       <span className="text-white font-bold text-lg">Total</span>
//                       <span className="text-white font-bold text-2xl">${order.total.toFixed(2)}</span>
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Update Status Dialog */}
//       <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
//         <DialogContent className="sm:max-w-[500px]">
//           <DialogHeader>
//             <DialogTitle className="text-2xl flex items-center gap-2">
//               <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
//                 <RefreshCw className="h-5 w-5 text-white" />
//               </div>
//               Update Order Status
//             </DialogTitle>
//             <DialogDescription className="text-base">
//               Change the status of order <span className="font-mono font-bold text-foreground">{order.displayId}</span>
//             </DialogDescription>
//           </DialogHeader>
//           <div className="space-y-6 py-4">
//             <div className="space-y-3">
//               <Label htmlFor="status" className="text-base font-semibold">Select New Status</Label>
//               <Select value={newStatus} onValueChange={(value) => setNewStatus(value as Order['status'])}>
//                 <SelectTrigger className="h-12 text-base border-2">
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="pending" className="py-3">
//                     <div className="flex items-center gap-3">
//                       <div className="p-1.5 rounded-md bg-yellow-100 dark:bg-yellow-900/30">
//                         <Clock className="h-4 w-4 text-yellow-600" />
//                       </div>
//                       <div>
//                         <div className="font-semibold">Pending</div>
//                         <div className="text-xs text-muted-foreground">Order awaiting confirmation</div>
//                       </div>
//                     </div>
//                   </SelectItem>
//                   <SelectItem value="confirmed" className="py-3">
//                     <div className="flex items-center gap-3">
//                       <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
//                         <CheckCircle className="h-4 w-4 text-blue-600" />
//                       </div>
//                       <div>
//                         <div className="font-semibold">Confirmed</div>
//                         <div className="text-xs text-muted-foreground">Order has been confirmed</div>
//                       </div>
//                     </div>
//                   </SelectItem>
//                   <SelectItem value="processing" className="py-3">
//                     <div className="flex items-center gap-3">
//                       <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-900/30">
//                         <RefreshCw className="h-4 w-4 text-indigo-600" />
//                       </div>
//                       <div>
//                         <div className="font-semibold">Processing</div>
//                         <div className="text-xs text-muted-foreground">Order is being prepared</div>
//                       </div>
//                     </div>
//                   </SelectItem>
//                   <SelectItem value="shipped" className="py-3">
//                     <div className="flex items-center gap-3">
//                       <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30">
//                         <Truck className="h-4 w-4 text-purple-600" />
//                       </div>
//                       <div>
//                         <div className="font-semibold">Shipped</div>
//                         <div className="text-xs text-muted-foreground">Order is on the way</div>
//                       </div>
//                     </div>
//                   </SelectItem>
//                   <SelectItem value="delivered" className="py-3">
//                     <div className="flex items-center gap-3">
//                       <div className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/30">
//                         <CheckCircle className="h-4 w-4 text-green-600" />
//                       </div>
//                       <div>
//                         <div className="font-semibold">Delivered</div>
//                         <div className="text-xs text-muted-foreground">Order successfully delivered</div>
//                       </div>
//                     </div>
//                   </SelectItem>
//                   <SelectItem value="cancelled" className="py-3">
//                     <div className="flex items-center gap-3">
//                       <div className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/30">
//                         <XCircle className="h-4 w-4 text-red-600" />
//                       </div>
//                       <div>
//                         <div className="font-semibold">Cancelled</div>
//                         <div className="text-xs text-muted-foreground">Order has been cancelled</div>
//                       </div>
//                     </div>
//                   </SelectItem>
//                   <SelectItem value="returned" className="py-3">
//                     <div className="flex items-center gap-3">
//                       <div className="p-1.5 rounded-md bg-orange-100 dark:bg-orange-900/30">
//                         <RefreshCw className="h-4 w-4 text-orange-600" />
//                       </div>
//                       <div>
//                         <div className="font-semibold">Returned</div>
//                         <div className="text-xs text-muted-foreground">Order has been returned</div>
//                       </div>
//                     </div>
//                   </SelectItem>
//                   <SelectItem value="failed" className="py-3">
//                     <div className="flex items-center gap-3">
//                       <div className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/30">
//                         <AlertCircle className="h-4 w-4 text-red-600" />
//                       </div>
//                       <div>
//                         <div className="font-semibold">Failed</div>
//                         <div className="text-xs text-muted-foreground">Order processing failed</div>
//                       </div>
//                     </div>
//                   </SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//             <div className="space-y-3">
//               <Label htmlFor="status-notes" className="text-base font-semibold">Status Notes (Optional)</Label>
//               <Textarea
//                 id="status-notes"
//                 placeholder="Add any notes about this status change..."
//                 className="min-h-[100px] resize-none border-2"
//               />
//               <p className="text-xs text-muted-foreground">These notes will be saved in the order history.</p>
//             </div>
//           </div>
//           <DialogFooter className="gap-2">
//             <Button variant="outline" onClick={() => setStatusDialogOpen(false)} className="flex-1 sm:flex-none">
//               Cancel
//             </Button>
//             <Button
//               onClick={handleStatusUpdate}
//               disabled={updatingStatus}
//               className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
//             >
//               {updatingStatus ? (
//                 <>
//                   <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
//                   Updating...
//                 </>
//               ) : (
//                 <>
//                   <CheckCircle className="h-4 w-4 mr-2" />
//                   Update Status
//                 </>
//               )}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Delete Confirmation Dialog */}
//       <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
//         <AlertDialogContent className="sm:max-w-[500px]">
//           <AlertDialogHeader>
//             <div className="flex items-center gap-3 mb-2">
//               <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
//                 <AlertCircle className="h-6 w-6 text-red-600" />
//               </div>
//               <AlertDialogTitle className="text-2xl">Delete Order?</AlertDialogTitle>
//             </div>
//             <AlertDialogDescription className="text-base space-y-3 pt-2">
//               <p>
//                 You are about to <span className="font-bold text-red-600">permanently delete</span> order{' '}
//                 <span className="font-mono font-bold text-foreground">{order.displayId}</span>.
//               </p>
//               <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900">
//                 <p className="font-semibold text-red-900 dark:text-red-100 mb-2">⚠️ Warning:</p>
//                 <ul className="text-sm text-red-800 dark:text-red-200 space-y-1 list-disc list-inside">
//                   <li>This action cannot be undone</li>
//                   <li>All order data will be permanently removed</li>
//                   <li>Order history will be lost</li>
//                   <li>Customer records will be affected</li>
//                 </ul>
//               </div>
//               <p className="text-sm">
//                 Are you absolutely sure you want to proceed?
//               </p>
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter className="gap-2 sm:gap-2">
//             <AlertDialogCancel className="flex-1 sm:flex-none">
//               Cancel
//             </AlertDialogCancel>
//             <AlertDialogAction
//               onClick={handleDeleteOrder}
//               className="flex-1 sm:flex-none bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
//             >
//               <Trash2 className="h-4 w-4 mr-2" />
//               Delete Permanently
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </div>
//   );
// }

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AsyncImageLoader from "@/components/AsyncImageLoader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Package,
  CreditCard,
  Mail,
  MapPin,
  Printer,
  Download,
  Trash2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import adminApiService from "@/contexts/adminApiService";

// Safely convert API values (which may be strings like "12.50") to numbers
const toNumber = (value: unknown): number => {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
};

// Same as toNumber, but keeps "not provided" as undefined
const toOptionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  return toNumber(value);
};

// Define interfaces based on the actual raw API response
interface RawOrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  image: string; // API returns singular 'image', not 'images'
  quantity: number | string; // decimals/ints may arrive as strings
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
  totalAmount: number | string;
  paymentIntentId: string | null;
  paymentMethod: string;
  shippingAddress: string;
  orderNumber?: string;
  createdAt: string;
  updatedAt: string;
  user: RawOrderUser;
  items: RawOrderItem[];
  // Optional breakdown fields that may come from API
  tax?: number | string;
  shippingCost?: number | string;
  discount?: number | string;
  subtotal?: number | string;
}

// UI item type: numeric fields are guaranteed to be numbers
interface OrderItem extends Omit<RawOrderItem, 'price' | 'quantity'> {
  price: number;
  quantity: number;
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
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  shippingAddress: string;
  paymentMethod: string;
  userId: number;
  subtotal?: number;
  tax?: number;
  shippingCost?: number;
  discount?: number;
  notes?: string;
}

const STATUS_OPTIONS: { value: Order['status']; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
  { value: 'failed', label: 'Failed' },
];

// Small label/value row used in the side cards
const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 text-sm">
    <span className="text-muted-foreground shrink-0">{label}</span>
    <span className="text-right font-medium break-words min-w-0">{children}</span>
  </div>
);

export default function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<Order['status']>('pending');
  const { toast } = useToast();


  const fetchOrderData = async () => {
    if (!orderId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      

      const response = await adminApiService.getOrders() as any;

      let rawOrdersData: RawApiOrder[] = [];
      
      if (response && typeof response === 'object') {
        if (response.data && Array.isArray(response.data)) {
          rawOrdersData = response.data as RawApiOrder[];
        } else if (response.orders && Array.isArray(response.orders)) {
          rawOrdersData = response.orders as RawApiOrder[];
        } else if (Array.isArray(response)) {
          rawOrdersData = response as RawApiOrder[];
        }
      }
      
      // Find the order by ID (strip the ORD- prefix if present)
      const numericOrderId = orderId.replace('ORD-', '');
      const rawOrder = rawOrdersData.find(order => 
        order.id.toString() === numericOrderId || 
        `ORD-${order.id.toString().padStart(4, '0')}` === orderId
      );
      
      if (!rawOrder) {
        throw new Error('Order not found');
      }
      
      // Normalize items so price and quantity are always numbers
      const normalizedItems: OrderItem[] = (rawOrder.items || []).map((item) => ({
        ...item,
        price: toNumber(item.price),
        quantity: toNumber(item.quantity),
      }));

      // Transform to UI format
      const apiSubtotal = toOptionalNumber(rawOrder.subtotal);
      const calculatedSubtotal = apiSubtotal || calculateSubtotal(normalizedItems);
      const totalAmount = toNumber(rawOrder.totalAmount);
      const shippingCost = toOptionalNumber(rawOrder.shippingCost);
      const discount = toOptionalNumber(rawOrder.discount);
      const apiTax = toOptionalNumber(rawOrder.tax);

      // Total = Subtotal + Tax + Shipping - Discount
      // Therefore: Tax = Total - Subtotal - Shipping + Discount
      const calculatedTax = totalAmount - calculatedSubtotal - (shippingCost || 0) + (discount || 0);

      const transformedOrder: Order = {
        id: rawOrder.id.toString(),
        displayId: `ORD-${rawOrder.id.toString().padStart(4, '0')}`,
        orderNumber: rawOrder.orderNumber,
        customerName: rawOrder.user?.name || 'Unknown Customer',
        customerEmail: rawOrder.user?.email || 'No email',
        status: mapApiStatusToUiStatus(rawOrder.status),
        paymentStatus: determinePaymentStatus(rawOrder),
        total: totalAmount,
        items: normalizedItems,
        createdAt: rawOrder.createdAt,
        updatedAt: rawOrder.updatedAt,
        shippingAddress: rawOrder.shippingAddress,
        paymentMethod: rawOrder.paymentMethod,
        userId: rawOrder.userId,
        subtotal: calculatedSubtotal,
        // Use API-provided tax if available, otherwise derive it (only if positive)
        tax: apiTax !== undefined ? apiTax : (calculatedTax > 0 ? calculatedTax : undefined),
        shippingCost,
        discount,
        notes: undefined // Will be populated from API if available
      };

      setOrder(transformedOrder);

    } catch (err) {
      setError('Failed to load order details. The order may not exist.');
      toast({
        variant: "destructive",
        title: "Error loading order",
        description: "Could not fetch order data.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderData();
  }, [orderId]);

  // Helper functions
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
      default:
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

  const calculateSubtotal = (items: OrderItem[]): number => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

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

  // Handler functions
  const handleStatusUpdate = async () => {
    if (!order) return;
    
    setUpdatingStatus(true);
    try {
      // Call the backend API to update the order status
      await adminApiService.updateOrderStatus(order.id, newStatus);
      
      // Update local state
      setOrder({...order, status: newStatus, updatedAt: new Date().toISOString()});
      
      toast({
        title: "Order status updated",
        description: `Order ${order.displayId} is now ${newStatus}`
      });
      setStatusDialogOpen(false);
    } catch (err) {
      console.error('Failed to update order status:', err);
      toast({
        variant: "destructive",
        title: "Error updating order",
        description: "Could not update order status. Please try again.",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleDeleteOrder = async () => {
    if (!order) return;
    
    try {
      // Call the backend API to delete the order
      await adminApiService.deleteOrder(order.id);
      
      toast({
        title: "Order deleted",
        description: `Order ${order.displayId} has been deleted.`
      });
      navigate('/admin/orders');
    } catch (err) {
      console.error('Failed to delete order:', err);
      toast({
        variant: "destructive",
        title: "Error deleting order",
        description: "Could not delete order. Please try again.",
      });
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateItemTotal = (item: OrderItem) => {
    return (item.price || 0) * (item.quantity || 0);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-muted rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-7 bg-muted rounded animate-pulse w-48" />
              <div className="h-4 bg-muted rounded animate-pulse w-32" />
            </div>
          </div>
          <div className="h-10 w-40 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="h-5 bg-muted rounded animate-pulse w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-muted rounded animate-pulse" />
              ))}
            </CardContent>
          </Card>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-5 bg-muted rounded animate-pulse w-28" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/admin/orders')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Order Details</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Order not found</p>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              {error || "The order you're looking for doesn't exist or has been removed."}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/admin/orders')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Orders
              </Button>
              <Button onClick={fetchOrderData}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalItemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const displaySubtotal = order.subtotal || order.total;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/admin/orders')}
            className="print:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to orders</span>
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight">
                {order.orderNumber || order.displayId}
              </h1>
              {getStatusBadge(order.status)}
              {getPaymentStatusBadge(order.paymentStatus)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Placed on {formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap print:hidden">
          <Button variant="outline" onClick={handlePrintInvoice}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setNewStatus(order.status);
              setStatusDialogOpen(true);
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Update Status
          </Button>
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: items + notes */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Order Items</CardTitle>
              <CardDescription>
                {order.items.length} {order.items.length === 1 ? 'product' : 'products'} · {totalItemCount} {totalItemCount === 1 ? 'unit' : 'units'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.length > 0 ? (
                      order.items.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <AsyncImageLoader
                                src={item.image || (item.product?.images && item.product.images[0]) || ''}
                                alt={item.productName || 'Product image'}
                                className="h-12 w-12 object-cover rounded-md border shrink-0"
                              />
                              <span className="font-medium">{item.productName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">
                            ${calculateItemTotal(item).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10">
                          <div className="flex flex-col items-center">
                            <Package className="h-10 w-10 text-muted-foreground mb-2" />
                            <p className="text-lg font-medium">No items found</p>
                            <p className="text-sm text-muted-foreground">
                              This order doesn't contain any items
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {order.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Order Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: totals, customer, shipping */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Subtotal">${displaySubtotal.toFixed(2)}</InfoRow>
              {(order.shippingCost ?? 0) > 0 && (
                <InfoRow label="Shipping">${(order.shippingCost ?? 0).toFixed(2)}</InfoRow>
              )}
              {(order.tax ?? 0) > 0 && (
                <InfoRow label="Tax">${(order.tax ?? 0).toFixed(2)}</InfoRow>
              )}
              {(order.discount ?? 0) > 0 && (
                <InfoRow label="Discount">-${(order.discount ?? 0).toFixed(2)}</InfoRow>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-bold">${order.total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{order.customerName}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate" title={order.customerEmail}>{order.customerEmail}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Shipping & Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Delivery address</p>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="break-words">{order.shippingAddress || 'Not specified'}</span>
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Payment method</p>
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="capitalize">{order.paymentMethod || 'Not specified'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Created">{formatDateTime(order.createdAt)}</InfoRow>
              <InfoRow label="Last updated">{formatDateTime(order.updatedAt)}</InfoRow>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Change the status of order <span className="font-mono font-medium text-foreground">{order.displayId}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="status">New status</Label>
            <Select value={newStatus} onValueChange={(value) => setNewStatus(value as Order['status'])}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={updatingStatus || newStatus === order.status}>
              {updatingStatus ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Status'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
            <AlertDialogDescription>
              Order <span className="font-mono font-medium text-foreground">{order.displayId}</span> will be permanently
              deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}