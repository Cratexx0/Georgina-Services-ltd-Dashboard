import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { lazy, Suspense } from "react";

// Lazy load pages for code splitting
const Dashboard = lazy(() => import("@/pages/Dashboard.tsx"));
const Products = lazy(() => import("@/pages/Products.tsx"));
const Orders = lazy(() => import("@/pages/Orders.tsx"));

const Analytics = lazy(() => import("@/pages/Analytics.tsx"));
const Settings = lazy(() => import("@/pages/Settings.tsx"));
const Categories = lazy(() => import("@/pages/Categories.tsx"));

const ContactMessagesAdmin = lazy(() => import("@/pages/Contacts.tsx"));
const ProductDetails = lazy(() => import("@/pages/ProductDetails.tsx"));
const ProductEdit = lazy(() => import("@/pages/ProductEdit.tsx"));
const Customers = lazy(() => import("@/pages/Customer.tsx"));
const OrderDetailsPage = lazy(() => import("@/pages/OrderDeatils.tsx"));
const Reviews = lazy(() => import("@/pages/Review.tsx"));

const queryClient = new QueryClient();

const App = () => (
	<QueryClientProvider client={queryClient}>
		<ThemeProvider>
			<AuthProvider>
				<TooltipProvider>
					<Toaster />
					<Sonner />
					<BrowserRouter>
						<Suspense
							fallback={
								<div className="flex items-center justify-center min-h-screen">
									<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
								</div>
							}
						>
							<Routes>
								{/* Public Routes */}
								<Route path="/" element={<Login />} />
								<Route path="/login" element={<Login />} />

								{/* Protected Dashboard Routes */}
								<Route element={<ProtectedRoute />}>
									<Route element={<DashboardLayout />}>
										<Route path="/dashboard" element={<Dashboard />} />
										<Route path="/products" element={<Products />} />
										<Route path="/admin/products" element={<Products />} />
										<Route
											path="/admin/products/:id"
											element={<ProductDetails />}
										/>
										<Route
											path="/admin/products/:id/edit"
											element={<ProductEdit />}
										/>
										<Route path="/review" element={<Reviews />} />
										<Route path="/products/:id" element={<ProductDetails />} />
										<Route path="/categories" element={<Categories />} />
										<Route path="/orders" element={<Orders />} />
										<Route
											path="/orders/:orderId"
											element={<OrderDetailsPage />}
										/>
										<Route
											path="/contacts"
											element={<ContactMessagesAdmin />}
										/>
										<Route path="/users" element={<Customers />} />
										<Route path="/analytics" element={<Analytics />} />
										<Route path="/settings" element={<Settings />} />
									</Route>
								</Route>

								{/* Redirect root to login for unauthenticated users */}
								<Route path="/home" element={<Navigate to="/" replace />} />
								<Route
									path="/admin"
									element={<Navigate to="/dashboard" replace />}
								/>

								{/* Catch all - redirect to login */}
								<Route path="*" element={<NotFound />} />
							</Routes>
						</Suspense>
					</BrowserRouter>
				</TooltipProvider>
			</AuthProvider>
		</ThemeProvider>
	</QueryClientProvider>
);

export default App;
