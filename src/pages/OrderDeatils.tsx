import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
	const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
	return Number.isFinite(n) ? n : 0;
};

// Same as toNumber, but keeps "not provided" as undefined
const toOptionalNumber = (value: unknown): number | undefined => {
	if (value === undefined || value === null || value === "") return undefined;
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
interface OrderItem extends Omit<RawOrderItem, "price" | "quantity"> {
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
	status:
		| "pending"
		| "confirmed"
		| "processing"
		| "shipped"
		| "delivered"
		| "cancelled"
		| "returned"
		| "failed";
	paymentStatus: "paid" | "unpaid" | "refunded";
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

const STATUS_OPTIONS: { value: Order["status"]; label: string }[] = [
	{ value: "pending", label: "Pending" },
	{ value: "confirmed", label: "Confirmed" },
	{ value: "processing", label: "Processing" },
	{ value: "shipped", label: "Shipped" },
	{ value: "delivered", label: "Delivered" },
	{ value: "cancelled", label: "Cancelled" },
	{ value: "returned", label: "Returned" },
	{ value: "failed", label: "Failed" },
];

// Small label/value row used in the side cards
const InfoRow = ({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) => (
	<div className="flex items-start justify-between gap-4 text-sm">
		<span className="text-muted-foreground shrink-0">{label}</span>
		<span className="text-right font-medium break-words min-w-0">
			{children}
		</span>
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
	const [newStatus, setNewStatus] = useState<Order["status"]>("pending");
	const { toast } = useToast();

	const fetchOrderData = async () => {
		if (!orderId) return;

		try {
			setIsLoading(true);
			setError(null);

			const response = (await adminApiService.getOrders()) as any;

			let rawOrdersData: RawApiOrder[] = [];

			if (response && typeof response === "object") {
				if (response.data && Array.isArray(response.data)) {
					rawOrdersData = response.data as RawApiOrder[];
				} else if (response.orders && Array.isArray(response.orders)) {
					rawOrdersData = response.orders as RawApiOrder[];
				} else if (Array.isArray(response)) {
					rawOrdersData = response as RawApiOrder[];
				}
			}

			// Find the order by ID (strip the ORD- prefix if present)
			const numericOrderId = orderId.replace("ORD-", "");
			const rawOrder = rawOrdersData.find(
				(order) =>
					order.id.toString() === numericOrderId ||
					`ORD-${order.id.toString().padStart(4, "0")}` === orderId,
			);

			if (!rawOrder) {
				throw new Error("Order not found");
			}

			// Normalize items so price and quantity are always numbers
			const normalizedItems: OrderItem[] = (rawOrder.items || []).map(
				(item) => ({
					...item,
					price: toNumber(item.price),
					quantity: toNumber(item.quantity),
				}),
			);

			// Transform to UI format
			const apiSubtotal = toOptionalNumber(rawOrder.subtotal);
			const calculatedSubtotal =
				apiSubtotal || calculateSubtotal(normalizedItems);
			const totalAmount = toNumber(rawOrder.totalAmount);
			const shippingCost = toOptionalNumber(rawOrder.shippingCost);
			const discount = toOptionalNumber(rawOrder.discount);
			const apiTax = toOptionalNumber(rawOrder.tax);

			// Total = Subtotal + Tax + Shipping - Discount
			// Therefore: Tax = Total - Subtotal - Shipping + Discount
			const calculatedTax =
				totalAmount -
				calculatedSubtotal -
				(shippingCost || 0) +
				(discount || 0);

			const transformedOrder: Order = {
				id: rawOrder.id.toString(),
				displayId: `ORD-${rawOrder.id.toString().padStart(4, "0")}`,
				orderNumber: rawOrder.orderNumber,
				customerName: rawOrder.user?.name || "Unknown Customer",
				customerEmail: rawOrder.user?.email || "No email",
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
				tax:
					apiTax !== undefined
						? apiTax
						: calculatedTax > 0
							? calculatedTax
							: undefined,
				shippingCost,
				discount,
				notes: undefined, // Will be populated from API if available
			};

			setOrder(transformedOrder);
		} catch (err) {
			setError("Failed to load order details. The order may not exist.");
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
	const mapApiStatusToUiStatus = (apiStatus: string): Order["status"] => {
		switch (apiStatus.toLowerCase()) {
			case "pending":
			case "confirmed":
			case "processing":
			case "shipped":
			case "delivered":
			case "cancelled":
			case "returned":
			case "failed":
				return apiStatus.toLowerCase() as Order["status"];
			default:
				return "pending";
		}
	};

	const determinePaymentStatus = (
		rawOrder: RawApiOrder,
	): Order["paymentStatus"] => {
		// Check the actual order status to determine if payment was completed
		const orderStatus = rawOrder.status.toLowerCase();

		// These statuses mean payment was successful
		if (
			orderStatus === "paid" ||
			orderStatus === "confirmed" ||
			orderStatus === "processing" ||
			orderStatus === "shipped" ||
			orderStatus === "delivered"
		) {
			return "paid";
		}

		// Refunded status
		if (orderStatus === "refunded" || orderStatus === "returned") {
			return "refunded";
		}

		// All other statuses (pending, failed, cancelled, expired) mean unpaid
		return "unpaid";
	};

	const calculateSubtotal = (items: OrderItem[]): number => {
		return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "confirmed":
				return (
					<Badge className="bg-blue-100 text-blue-800 border-blue-200">
						Confirmed
					</Badge>
				);
			case "processing":
				return (
					<Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
						Processing
					</Badge>
				);
			case "shipped":
				return (
					<Badge className="bg-purple-100 text-purple-800 border-purple-200">
						Shipped
					</Badge>
				);
			case "delivered":
				return (
					<Badge className="bg-green-100 text-green-800 border-green-200">
						Delivered
					</Badge>
				);
			case "pending":
				return (
					<Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
						Pending
					</Badge>
				);
			case "cancelled":
				return (
					<Badge className="bg-red-100 text-red-800 border-red-200">
						Cancelled
					</Badge>
				);
			case "returned":
				return (
					<Badge className="bg-orange-100 text-orange-800 border-orange-200">
						Returned
					</Badge>
				);
			case "failed":
				return (
					<Badge className="bg-red-100 text-red-800 border-red-200">
						Failed
					</Badge>
				);
			default:
				return <Badge className="capitalize">{status}</Badge>;
		}
	};

	const getPaymentStatusBadge = (status: string) => {
		switch (status) {
			case "paid":
				return (
					<Badge className="bg-green-100 text-green-800 border-green-200 capitalize">
						{status}
					</Badge>
				);
			case "unpaid":
				return (
					<Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 capitalize">
						{status}
					</Badge>
				);
			case "refunded":
				return (
					<Badge
						variant="outline"
						className="text-gray-600 border-gray-300 capitalize"
					>
						{status}
					</Badge>
				);
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
			setOrder({
				...order,
				status: newStatus,
				updatedAt: new Date().toISOString(),
			});

			toast({
				title: "Order status updated",
				description: `Order ${order.displayId} is now ${newStatus}`,
			});
			setStatusDialogOpen(false);
		} catch (err) {
			console.error("Failed to update order status:", err);
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
				description: `Order ${order.displayId} has been deleted.`,
			});
			navigate(-1);
		} catch (err) {
			console.error("Failed to delete order:", err);
			toast({
				variant: "destructive",
				title: "Error deleting order",
				description: "Could not delete order. Please try again.",
			});
		}
	};

	const formatDateTime = (dateString: string) => {
		return new Date(dateString).toLocaleString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
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
					<Button variant="outline" size="icon" onClick={() => navigate(-1)}>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<h1 className="text-3xl font-bold tracking-tight">Order Details</h1>
				</div>
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
						<p className="text-lg font-medium mb-2">Order not found</p>
						<p className="text-muted-foreground text-center mb-4 max-w-md">
							{error ||
								"The order you're looking for doesn't exist or has been removed."}
						</p>
						<div className="flex gap-2">
							<Button variant="outline" onClick={() => navigate(-1)}>
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

	const totalItemCount = order.items.reduce(
		(sum, item) => sum + item.quantity,
		0,
	);
	const displaySubtotal = order.subtotal || order.total;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="flex items-center gap-4">
					<Button
						variant="outline"
						size="icon"
						onClick={() => navigate(-1)}
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
								{order.items.length}{" "}
								{order.items.length === 1 ? "product" : "products"} ·{" "}
								{totalItemCount} {totalItemCount === 1 ? "unit" : "units"}
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
																src={
																	item.image ||
																	(item.product?.images &&
																		item.product.images[0]) ||
																	""
																}
																alt={item.productName || "Product image"}
																className="h-12 w-12 object-cover rounded-md border shrink-0"
															/>
															<span className="font-medium">
																{item.productName}
															</span>
														</div>
													</TableCell>
													<TableCell className="text-center">
														{item.quantity}
													</TableCell>
													<TableCell className="text-right">
														${item.price.toFixed(2)}
													</TableCell>
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
														<p className="text-lg font-medium">
															No items found
														</p>
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
								<InfoRow label="Shipping">
									${(order.shippingCost ?? 0).toFixed(2)}
								</InfoRow>
							)}
							{(order.tax ?? 0) > 0 && (
								<InfoRow label="Tax">${(order.tax ?? 0).toFixed(2)}</InfoRow>
							)}
							{(order.discount ?? 0) > 0 && (
								<InfoRow label="Discount">
									-${(order.discount ?? 0).toFixed(2)}
								</InfoRow>
							)}
							<Separator />
							<div className="flex items-center justify-between">
								<span className="font-semibold">Total</span>
								<span className="text-2xl font-bold">
									${order.total.toFixed(2)}
								</span>
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
								<span className="truncate" title={order.customerEmail}>
									{order.customerEmail}
								</span>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-lg">Shipping & Payment</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-1">
								<p className="text-sm text-muted-foreground">
									Delivery address
								</p>
								<div className="flex items-start gap-2 text-sm">
									<MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
									<span className="break-words">
										{order.shippingAddress || "Not specified"}
									</span>
								</div>
							</div>
							<Separator />
							<div className="space-y-1">
								<p className="text-sm text-muted-foreground">Payment method</p>
								<div className="flex items-center gap-2 text-sm">
									<CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
									<span className="capitalize">
										{order.paymentMethod || "Not specified"}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-lg">Timeline</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<InfoRow label="Created">
								{formatDateTime(order.createdAt)}
							</InfoRow>
							<InfoRow label="Last updated">
								{formatDateTime(order.updatedAt)}
							</InfoRow>
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
							Change the status of order{" "}
							<span className="font-mono font-medium text-foreground">
								{order.displayId}
							</span>
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2 py-2">
						<Label htmlFor="status">New status</Label>
						<Select
							value={newStatus}
							onValueChange={(value) => setNewStatus(value as Order["status"])}
						>
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
						<Button
							variant="outline"
							onClick={() => setStatusDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleStatusUpdate}
							disabled={updatingStatus || newStatus === order.status}
						>
							{updatingStatus ? (
								<>
									<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
									Updating...
								</>
							) : (
								"Update Status"
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
							Order{" "}
							<span className="font-mono font-medium text-foreground">
								{order.displayId}
							</span>{" "}
							will be permanently deleted. This action cannot be undone.
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
