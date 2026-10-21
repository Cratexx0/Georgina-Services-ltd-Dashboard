
import { API_BASE_URL } from "@/lib/api";

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  contact?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'booking' | 'contact' | 'product' | 'system' | 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

export interface CleaningService {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  duration: number;
  features: string[];
  icon?: string;
  category: 'residential' | 'commercial' | 'specialized';
  status: 'active' | 'inactive';
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CleaningBooking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceType: string;
  selectedFeatures?: string[]; // NEW: Added to match backend
  address: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  paymentIntentId?: string | null; // NEW: Added to match backend payment flow
  paymentStatus?: 'pending' | 'completed' | 'failed' | 'refunded'; // NEW: Explicit payment status from backend
  paidAmount?: number; // NEW: Actual amount paid
  userId?: number; // NEW: User who made the booking
  notes?: string;
  specialInstructions?: string;
  bookingReference?: string;
  createdAt: string;
  updatedAt: string;
}


export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  categoryLevel1: string;
  categoryLevel2: string;
  categoryLevel3: string;
  serviceType: 'physical' | 'digital';
  serviceDuration: string | null;
  unit: string;
  stock: number;
  images: string[];
  isActive: boolean;
  tags: string[];
  brand: string | null;
  createdAt: string;
  updatedAt: string;

  // ADD THESE NEW FIELDS:
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  featuredOrder: number;
  trendingOrder: number;
  newArrivalOrder: number;
}

export interface SpecialProductsResponse {
  products: Product[];
  analytics?: {
    totalFeatured: number;
    totalTrending: number;
    totalNewArrivals: number;
    activeFeatured: number;
    activeTrending: number;
    activeNewArrivals: number;
  };
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalProducts: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface BulkSpecialUpdate {
  products: Array<{
    productId: string;
    updates: {
      isFeatured?: boolean;
      isTrending?: boolean;
      isNewArrival?: boolean;
      featuredOrder?: number;
      trendingOrder?: number;
      newArrivalOrder?: number;
    };
  }>;
}

export interface BulkUpdateResponse {
  results: Array<{ productId: string; success: boolean }>;
  errors: Array<{ productId: string; error: string }>;
  message: string;
}

interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'shipped' | 'delivered';
  paymentStatus: 'paid' | 'unpaid' | 'refunded';
  total: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  level: number;
  parentId?: string;
  description?: string;
  image?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  categoryId: string;
  image?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  password?: string | null;
  contact?: string | null;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
}
export interface AuthResponse {
  token: string;
  user: User;
  admin?: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  orders?: Order[];
}

export interface OrdersResponse {
  orders: Order[];
  data?: Order[];
}

// Error that keeps the HTTP status so callers can react to specific codes (e.g. 404)
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// Pulls a readable message out of whatever shape an error response has:
// { message }, { error: "..." }, { error: { message } }, { errors: [...] },
// or a non-JSON body such as an HTML error page.
const extractErrorMessage = async (response: Response): Promise<{ message: string; details: unknown }> => {
  const fallback = `HTTP error! status: ${response.status}`;

  let raw = '';
  try {
    raw = await response.text();
  } catch {
    return { message: fallback, details: null };
  }
  if (!raw) return { message: fallback, details: null };

  try {
    const data = JSON.parse(raw);
    const errors = Array.isArray(data?.errors)
      ? data.errors.map((e: any) => e?.message || e?.msg || String(e)).join(', ')
      : data?.errors?.message;
    const candidate =
      data?.message ||
      (typeof data?.error === 'string' ? data.error : data?.error?.message) ||
      errors ||
      data?.msg;

    if (candidate) {
      return { message: typeof candidate === 'string' ? candidate : JSON.stringify(candidate), details: data };
    }
    // JSON, but with no recognisable message field: show the body so it can be diagnosed
    return { message: `${fallback} - ${raw.slice(0, 200)}`, details: data };
  } catch {
    const text = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
    return { message: text ? `${fallback} - ${text}` : fallback, details: raw.slice(0, 500) };
  }
};

export const AUTH_EXPIRED_EVENT = "admin-auth-expired";

class AdminApiService {
  private baseUrl: string;
  private token: string | null = null;

  // The notifications routes are not available on every server deployment.
  // After a 404 we stop calling them for the rest of the session instead of
  // retrying (and logging an error) every time a component mounts or polls.
  private notificationsAvailable = true;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('e-commerce-admin-token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('e-commerce-admin-token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('e-commerce-admin-token');
  }

  private async request(
    endpoint: string,
    options: RequestInit = {},
    requestOptions: { silent?: boolean } = {}
  ) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // headers go last so the auth header is never dropped by `...options`
    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        this.clearToken();
        localStorage.removeItem('e-commerce-admin-user');
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
        throw new ApiError('Authentication failed. Please login again.', 401);
      }

      if (!response.ok) {
        const { message, details } = await extractErrorMessage(response);
        throw new ApiError(message, response.status, details);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return {};
    } catch (error) {
      if (!requestOptions.silent) {
        console.error('API request failed:', error);
      }
      throw error;
    }
  }

  private async requestWithFormData(
      endpoint: string,
      formData: FormData,
      method = 'POST',
      options?: { invalidate?: () => void | Promise<void> }
  ) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: formData,
      });

      if (response.status === 401) {
        this.clearToken();
        localStorage.removeItem('e-commerce-admin-user');
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
        throw new ApiError('Authentication failed. Please login again.', 401);
      }

      if (!response.ok) {
        const { message, details } = await extractErrorMessage(response);
        throw new ApiError(message, response.status, details);
      }

      const contentType = response.headers.get('content-type');
      let result;
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        result = {};
      }

      // Call invalidation callback after successful request
      // (was `options?.invalidate()`, which called the function in the condition
      // and threw when `options` was passed without an `invalidate` callback)
      if (options?.invalidate) {
        try {
          await options.invalidate();
        } catch (e) {
          console.warn('requestWithFormData invalidate handler error:', e);
        }
      }

      return result;
    } catch (error) {
      console.error('API request failed:', error);
      if (error instanceof ApiError && error.details) {
        console.error('Server response body:', error.details);
      }
      throw error;
    }
  }

  // Notification requests degrade gracefully when the server has no notifications routes
  private async notificationsRequest(endpoint: string, fallback: any, options: RequestInit = {}) {
    if (!this.notificationsAvailable) return fallback;

    try {
      return await this.request(endpoint, options, { silent: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        this.notificationsAvailable = false;
        console.warn(
          `Notifications API not found (${endpoint}). Notifications are disabled until the page is reloaded.`
        );
        return fallback;
      }
      console.error('API request failed:', error);
      throw error;
    }
  }


  async getAdminSpecialProducts(params?: {
    type?: 'featured' | 'trending' | 'new-arrivals';
    limit?: number;
    page?: number;
    search?: string;
  }): Promise<SpecialProductsResponse> {
    const queryParams = new URLSearchParams();

    if (params?.type) queryParams.append('type', params.type);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    const endpoint = `/api/admin/products/special${queryString ? `?${queryString}` : ''}`;


    return this.request(endpoint);
  }

  /**
   * Get products not in any special categories (for adding new ones)
   */
  async getProductsNotInSpecialCategories(params?: {
    limit?: number;
    page?: number;
    search?: string;
  }): Promise<{ products: Product[]; pagination: any }> {
    const queryParams = new URLSearchParams();

    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    const endpoint = `/api/admin/products/special/available${queryString ? `?${queryString}` : ''}`;


    return this.request(endpoint);
  }

  /**
   * Update a product's special categories
   */
  async updateProductSpecialCategories(
      productId: string,
      updates: {
        isFeatured?: boolean;
        isTrending?: boolean;
        isNewArrival?: boolean;
        featuredOrder?: number;
        trendingOrder?: number;
        newArrivalOrder?: number;
      }
  ): Promise<{ product: Product; message: string }> {
    const endpoint = `/api/admin/products/special/${productId}`;

    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Bulk update special categories for multiple products
   */
  async bulkUpdateSpecialCategories(
      updates: BulkSpecialUpdate
  ): Promise<BulkUpdateResponse> {
    const endpoint = '/api/admin/products/special/bulk/update';

    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }


// user routes



  async getFeaturedProducts(limit?: number): Promise<Product[]> {
    const endpoint = `/api/products/special/featured${limit ? `?limit=${limit}` : ''}`;
    const response = await this.request(endpoint);
    return response.products || [];
  }

  /**
   * Get trending products (public endpoint)
   */
  async getTrendingProducts(limit?: number): Promise<Product[]> {
    const endpoint = `/api/products/special/trending${limit ? `?limit=${limit}` : ''}`;
    const response = await this.request(endpoint);
    return response.products || [];
  }

  /**
   * Get new arrivals (public endpoint)
   */
  async getNewArrivals(params?: { limit?: number; days?: number }): Promise<Product[]> {
    const queryParams = new URLSearchParams();

    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.days) queryParams.append('days', params.days.toString());

    const queryString = queryParams.toString();
    const endpoint = `/api/products/special/new-arrivals${queryString ? `?${queryString}` : ''}`;

    const response = await this.request(endpoint);
    return response.products || [];
  }


  async bulkAddToFeatured(productIds: string[]): Promise<BulkUpdateResponse> {
    const updates = {
      products: productIds.map(id => ({
        productId: id,
        updates: { isFeatured: true }
      }))
    };
    return this.bulkUpdateSpecialCategories(updates);
  }

  /**
   * Bulk add products to trending category
   */
  async bulkAddToTrending(productIds: string[]): Promise<BulkUpdateResponse> {
    const updates = {
      products: productIds.map(id => ({
        productId: id,
        updates: { isTrending: true }
      }))
    };
    return this.bulkUpdateSpecialCategories(updates);
  }

  /**
   * Bulk add products to new arrivals category
   */
  async bulkAddToNewArrivals(productIds: string[]): Promise<BulkUpdateResponse> {
    const updates = {
      products: productIds.map(id => ({
        productId: id,
        updates: { isNewArrival: true }
      }))
    };
    return this.bulkUpdateSpecialCategories(updates);
  }

  /**
   * Bulk remove products from all special categories
   */
  async bulkRemoveFromSpecialCategories(productIds: string[]): Promise<BulkUpdateResponse> {
    const updates = {
      products: productIds.map(id => ({
        productId: id,
        updates: {
          isFeatured: false,
          isTrending: false,
          isNewArrival: false
        }
      }))
    };
    return this.bulkUpdateSpecialCategories(updates);
  }

  // 🔐 AUTHENTICATION
  async login(email: string, password: string) {
    const data = await this.request('/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.token) {
      this.setToken(data.token);
    }

    return data;
  }

  async register(name: string, email: string, password: string, contact: string) {
    return this.request('/api/auth/admin/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, contact }),
    });
  }

  async getUserInfo(userId: string) {
    return this.request(`/api/auth/userinfo/${userId}`);
  }

  // 👥 USER MANAGEMENT
  async getUsers() {
    return this.request('/api/user/getUsers');
  }

  async getUserById(id: string) {
    return this.request(`/api/user/getUser/${id}`);
  }

  async createUser(userData: any) {
    return this.request('/api/user/create', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: any) {
    return this.request(`/api/user/update/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/api/user/delete/${id}`, {
      method: 'DELETE',
    });
  }

  // 🛍️ PRODUCT MANAGEMENT
  async getProducts() {
    const response = await this.request('/api/admin/products');
    return response.products || [];
  }

  async getProductById(id: string) {
    return this.request(`/api/admin/products/${id}`);
  }

  async createProduct(
      productData: FormData,
      options?: { invalidate?: () => void | Promise<void> }
  ) {
    return this.requestWithFormData('/api/admin/products', productData, 'POST', options);
  }

  async updateProduct(
      id: string,
      productData: FormData,
      options?: { invalidate?: () => void | Promise<void> }
  ) {
    return this.requestWithFormData(`/api/admin/products/${id}`, productData, 'PUT', options);
  }

  async deleteProduct(id: string) {
    return this.request(`/api/admin/products/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleProductStatus(id: string) {
    return this.request(`/api/admin/products/${id}/toggle-status`, {
      method: 'PATCH',
    });
  }




  // Add to your existing adminApiService class - CORRECTED ENDPOINTS

// Enhanced category deletion with options
  async deleteCategory(id: string, options?: {
    deleteSubcategories?: boolean;
    moveToParent?: boolean | 'root';
  }): Promise<{
    message: string;
    deletedCategory?: any;
    deletedSubcategories?: number;
    totalDeleted?: number;
    movedSubcategories?: number;
    newParent?: any;
    promotedToLevel?: number;
  }> {
    const queryParams = new URLSearchParams();

    if (options?.deleteSubcategories) {
      queryParams.append('deleteSubcategories', 'true');
    }

    if (options?.moveToParent === true) {
      queryParams.append('moveToParent', 'true');
    } else if (options?.moveToParent === 'root') {
      queryParams.append('moveToParent', 'root');
    }

    const queryString = queryParams.toString();
    const endpoint = `/api/admin/categories/${id}${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

// Bulk delete subcategories
  async deleteSubcategories(parentId: string): Promise<{
    message: string;
    deletedCount: number;
    parentCategory: any;
  }> {
    return this.request(`/api/admin/categories/${parentId}/subcategories`, {
      method: 'DELETE',
    });
  }

// Delete specific subcategory
  async deleteSubcategory(parentId: string, subcategoryId: string): Promise<{
    message: string;
    deletedSubcategory: any;
    parentCategory: any;
  }> {
    return this.request(`/api/admin/categories/${parentId}/subcategories/${subcategoryId}`, {
      method: 'DELETE',
    });
  }

// Safe delete with archive option
  async safeDeleteCategory(id: string, permanent: boolean = false): Promise<{
    message: string;
    archived?: boolean;
    permanentlyDeleted?: boolean;
    category?: any;
  }> {
    const endpoint = `/api/admin/categories/${id}/safe${permanent ? '?permanent=true' : ''}`;
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // 📦 CATEGORY MANAGEMENT
  async getCategories() {
    return this.request('/api/categories');
  }

  async getCategoryById(id: string) {
    return this.request(`/api/categories/${id}`);
  }

  async getCategoryTree() {
    return this.request('/api/categories-tree');
  }

  async createCategory(categoryData: any) {
    return this.request('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  }

  async updateCategory(id: string, categoryData: any) {
    return this.request(`/api/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
  }


  async getCategoriesByLevel(level: number) {
    return this.request(`/api/categories/level/${level}`);
  }

  async getCategoriesByParent(parentId: string) {
    return this.request(`/api/categories/parent/${parentId}`);
  }

  async getCategoryChildren(id: string) {
    return this.request(`/api/categories/${id}/children`);
  }

  async bulkCreateCategories(categoriesData: any) {
    return this.request('/api/admin/categories/bulk', {
      method: 'POST',
      body: JSON.stringify(categoriesData),
    });
  }

  // 📊 ORDERS
  async getOrders(): Promise<Order[]> {
    // Errors now propagate so the Orders page can show its error state and Retry button.
    // Before, a failure was swallowed and the function returned undefined (an empty list).
    const response = await this.request('/api/admin/orders');
    return response.orders || response.data || [];
  }

  async getAdminOrders(): Promise<{ orders: Order[] }> {
    const response = await this.request('/api/admin/orders');
    return response;
  }

  async getOrderById(id: string): Promise<Order> {
    const response = await this.request(`/api/admin/orders/${id}`);
    return response.data || response;
  }

  async updateOrderStatus(id: string, status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'failed'): Promise<{ success: boolean; data: Order }> {
    return this.request(`/api/admin/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async deleteOrder(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/admin/orders/${id}`, {
      method: 'DELETE',
    });
  }

  async getOrderStats(): Promise<{
    success: boolean;
    data: {
      totalOrders: number;
      pendingOrders: number;
      completedOrders: number;
      totalRevenue: number;
    };
  }> {
    return this.request('/api/admin/orders-stats');
  }

  async getOrderItems() {
    return this.request('/api/admin/order-items');
  }

  async getOrderItemById(id: string) {
    return this.request(`/api/admin/order-items/${id}`);
  }

  async createOrderItem(orderItemData: any) {
    return this.request('/api/admin/order-items', {
      method: 'POST',
      body: JSON.stringify(orderItemData),
    });
  }

  async updateOrderItem(id: string, orderItemData: any) {
    return this.request(`/api/admin/order-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orderItemData),
    });
  }

  async deleteOrderItem(id: string) {
    return this.request(`/api/admin/order-items/${id}`, {
      method: 'DELETE',
    });
  }

  // 🧹 CLEANING SERVICES
  // async getAdminCleaningBookings() {
  //   return this.request('/api/admin/bookings');
  // }

  // async createAdminCleaningBooking(bookingData: any) {
  //   return this.request('/api/admin/bookings', {
  //     method: 'POST',
  //     body: JSON.stringify(bookingData),
  //   });
  // }

  // async updateAdminCleaningBooking(id: string | number, bookingData: any) {
  //   const bookingId = typeof id === 'string' ? parseInt(id, 10) : id;

  //   return this.request(`/api/admin/bookings/${bookingId}`, {
  //     method: 'PUT',
  //     body: JSON.stringify(bookingData),
  //   });
  // }

  // async deleteAdminCleaningBooking(id: string) {
  //   return this.request(`/api/admin/bookings/${id}`, {
  //     method: 'DELETE',
  //   });
  // }

  // async createUserCleaningBooking(bookingData: any) {
  //   return this.request('/api/bookings', {
  //     method: 'POST',
  //     body: JSON.stringify(bookingData),
  //   });
  // }

  // // 👤 CUSTOMERS
  // async getCustomers(): Promise<Customer[]> {
  //   try {
  //     const response = await this.request('/api/customers');
  //     return response.data || response || [];
  //   } catch (error) {
  //     console.warn('Customers endpoint not available, using fallback data:', error);
  //     return this.getFallbackCustomers();
  //   }
  // }

  // async getCustomerById(id: string) {
  //   return this.request(`/api/customers/${id}`);
  // }

  // async createCustomer(customerData: any) {
  //   return this.request('/api/customers', {
  //     method: 'POST',
  //     body: JSON.stringify(customerData),
  //   });
  // }

  // async updateCustomer(id: string, customerData: any) {
  //   return this.request(`/api/customers/${id}`, {
  //     method: 'PUT',
  //     body: JSON.stringify(customerData),
  //   });
  // }

  // async deleteCustomer(id: string) {
  //   return this.request(`/api/customers/${id}`, {
  //     method: 'DELETE',
  //   });
  // }

  // 💰 PAYMENTS
  async createPaymentIntent(paymentData: any) {
    return this.request('/api/payment', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async confirmPayment(confirmationData: any) {
    return this.request('/api/confirm-payment', {
      method: 'POST',
      body: JSON.stringify(confirmationData),
    });
  }

  // 📊 ANALYTICS
  async getDashboardStats() {
    return this.request('/api/admin/analytics/dashboard-stats');
  }

  async getSalesReport(startDate: string, endDate: string) {
    return this.request(`/api/admin/analytics/sales-report?startDate=${startDate}&endDate=${endDate}`);
  }

  // 📧 CONTACT MESSAGES
  async submitContactForm(contactData: ContactFormData) {
    return this.request('/api/contact', {
      method: 'POST',
      body: JSON.stringify(contactData),
    });
  }

  async getAllContactMessages(): Promise<ContactMessage[]> {
    const response = await this.request('/api/admin/contact/messages');
    return response || [];
  }

  async getContactMessageById(id: string): Promise<ContactMessage> {
    return this.request(`/api/admin/contact/messages/${id}`);
  }

  async deleteContactMessage(id: string) {
    return this.request(`/api/admin/contact/messages/${id}`, {
      method: 'DELETE',
    });
  }




  // ⭐ REVIEW MANAGEMENT
  async getAllReviews(params?: {
    page?: number;
    limit?: number;
    productId?: string;
    userId?: string;
    rating?: number;
    isApproved?: boolean;
    verifiedPurchase?: boolean;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    const endpoint = `/api/admin/reviews${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }

  async replyToReview(reviewId: string, reply: string) {
    return this.request(`/api/reviews/${reviewId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply }),
    });
  }

  async updateReviewStatus(reviewId: string, isApproved: boolean) {
    return this.request(`/api/admin/reviews/${reviewId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isApproved }),
    });
  }

  async deleteReview(reviewId: string) {
    return this.request(`/api/admin/reviews/${reviewId}`, {
      method: 'DELETE',
    });
  }

  // 🔐 PASSWORD MANAGEMENT
  async changePassword(currentPassword: string, newPassword: string): Promise<{
    success: boolean;
    message: string;
    admin?: User;
  }> {
    return this.request('/api/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // 🧹 CLEANING SERVICES
  async getCleaningServices(): Promise<CleaningService[]> {
    const response = await this.request('/api/admin/services');
    if (response.data && response.data.services) {
      return response.data.services;
    } else if (response.services) {
      return response.services;
    } else if (Array.isArray(response)) {
      return response;
    } else if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  async createCleaningService(serviceData: any): Promise<{ data: CleaningService }> {
    return this.request('/api/admin/services', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });
  }

  async updateCleaningService(id: string, serviceData: any): Promise<{ data: CleaningService }> {
    return this.request(`/api/admin/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(serviceData),
    });
  }

  async updateCleaningServiceStatus(id: string, status: 'active' | 'inactive'): Promise<{ data: CleaningService }> {
    return this.request(`/api/admin/services/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteCleaningService(id: string): Promise<{ message: string }> {
    return this.request(`/api/admin/services/${id}`, {
      method: 'DELETE',
    });
  }

  async getActiveCleaningServices(): Promise<CleaningService[]> {
    const response = await this.request('/api/admin/services/active');
    if (response.data && response.data.services) {
      return response.data.services;
    } else if (response.services) {
      return response.services;
    } else if (Array.isArray(response)) {
      return response;
    } else if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  async getCleaningServiceById(id: string): Promise<{ data: CleaningService }> {
    return this.request(`/api/admin/services/${id}`);
  }

  async getServiceStats(): Promise<any> {
    return this.request('/api/admin/services/stats');
  }

  async reorderServices(orderUpdates: Array<{ id: string; displayOrder: number }>): Promise<{ message: string }> {
    return this.request('/api/admin/services/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ orderUpdates }),
    });
  }

  private getFallbackCustomers(): Customer[] {
    return [
      {
        id: 1,
        name: 'John Doe',
        email: 'john.doe@example.com',
        contact: '+1234567890',
        role:"admin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        contact: '+0987654321',
        role:"user",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 3,
        name: 'Bob Johnson',
        email: 'bob.johnson@example.com',
        contact: '+1122334455',
        role:"user",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }
}

export const adminApiService = new AdminApiService(API_BASE_URL);
export default adminApiService;