

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Plus, Edit, Trash2, Package, DollarSign, AlertTriangle,
  RefreshCw, AlertCircle, X, Eye, Calendar, Star, Zap, Clock,
  Filter, Check, Tag, Layers, Hash, Grid, List,
  Download, Upload, Copy, MoreVertical, BarChart3,
  TrendingUp, Users, ShoppingCart, Percent, Shield
} from "lucide-react";
import { Product } from "@/types";
import { useToast } from "@/hooks/use-toast";
import adminApiService from "@/contexts/adminApiService";
import { ImageUploadWithFile } from "@/lib/ImageLoader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

// Update the Product interface to include special category fields
interface ProductWithSpecial extends Omit<Product, 'size'> {
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  featuredOrder: number;
  trendingOrder: number;
  newArrivalOrder: number;
  size?: string | string[] | null;
  discountedPrice?: number; // Add this virtual field
   discount?: number; // Backend returns number (DECIMAL)
  weight?: string | number;
  wishList?: boolean;
  // Additional fields for detailed view
  sku?: string;
  dimensions?: string;
  rating?: number;
  reviewsCount?: number;
}

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  categoryLevel1: string;
  categoryLevel2: string;
  categoryLevel3: string;
  unit: string;
  stock: string;
  brand: string;
  tags: string[];
  isActive: boolean;
  image: File | string | null;

  // Size field
  size: string;

  // Additional fields
  sku: string;
  weight: string;
  discount: string;
  wishList: boolean;

  // Special category fields
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  featuredOrder: number;
  trendingOrder: number;
  newArrivalOrder: number;
}

interface Category {
  id: string;
  name: string;
  slug?: string;
  level: number;
  parentId?: string | null;
  children: Category[];
}

// Size Input Component
const SizeInput = ({
                     sizes,
                     onSizesChange,
                     disabled
                   }: {
  sizes: string;
  onSizesChange: (sizes: string) => void;
  disabled?: boolean;
}) => {
  const [inputValue, setInputValue] = useState('');
  const commonSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '32', '34', '36', '38', '40', '42', '44'];

  const currentSizes = sizes ? sizes.split(',').map(s => s.trim()).filter(s => s) : [];

  const addSize = (size: string) => {
    const cleanSize = size.trim().toUpperCase();
    if (cleanSize && !currentSizes.includes(cleanSize)) {
      const newSizes = [...currentSizes, cleanSize];
      onSizesChange(newSizes.join(','));
    }
    setInputValue('');
  };

  const removeSize = (sizeToRemove: string) => {
    const newSizes = currentSizes.filter(size => size !== sizeToRemove);
    onSizesChange(newSizes.join(','));
  };

  return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-xs">Available Sizes</Label>
          <div className="flex flex-wrap gap-1">
            {commonSizes.map((size) => (
                <Button
                    key={size}
                    type="button"
                    variant={currentSizes.includes(size) ? "default" : "outline"}
                    size="sm"
                    onClick={() => addSize(size)}
                    disabled={disabled}
                    className="h-7 text-xs"
                >
                  {size}
                </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 p-2 border rounded-md min-h-10 bg-background">
            {currentSizes.map((size, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1 text-xs py-1">
                  {size}
                  <button
                      type="button"
                      onClick={() => removeSize(size)}
                      className="ml-1 hover:text-destructive text-xs"
                      disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
            ))}
            <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addSize(inputValue);
                  }
                }}
                placeholder="Add custom size..."
                className="flex-1 outline-none bg-transparent text-sm min-w-20 placeholder:text-muted-foreground"
                disabled={disabled}
            />
          </div>
        </div>
      </div>
  );
};

// Tag Input Component
const TagInput = ({
                    tags,
                    onTagsChange,
                    disabled
                  }: {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
}) => {
  const [inputValue, setInputValue] = useState('');

  const addTag = (tag: string) => {
    const cleanTag = tag.trim();
    if (cleanTag && !tags.includes(cleanTag)) {
      onTagsChange([...tags, cleanTag]);
    }
    setInputValue('');
  };

  const removeTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 p-2 border rounded-md min-h-10 bg-background">
          {tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1 text-xs py-1">
                <Tag className="h-3 w-3" />
                {tag}
                <button
                    type="button"
                    onClick={() => removeTag(index)}
                    className="ml-1 hover:text-destructive text-xs"
                    disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
          ))}
          <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag(inputValue);
                }
              }}
              placeholder="Add tag..."
              className="flex-1 outline-none bg-transparent text-sm min-w-20 placeholder:text-muted-foreground"
              disabled={disabled}
          />
        </div>
      </div>
  );
};

// Product Analytics Card
const ProductAnalyticsCard = ({
                                title,
                                value,
                                icon: Icon,
                                description,
                                trend,
                                color
                              }: {
  title: string;
  value: string;
  icon: any;
  description: string;
  trend?: number;
  color?: string;
}) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color || 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend !== undefined && (
              <span className={`text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          )}
        </div>
      </CardContent>
    </Card>
);

// Quick Actions Component
const QuickActions = ({ onAction }: { onAction: (action: string) => void }) => (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => onAction('export')}>
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>
      <Button variant="outline" size="sm" onClick={() => onAction('import')}>
        <Upload className="mr-2 h-4 w-4" />
        Import
      </Button>
      <Button variant="outline" size="sm" onClick={() => onAction('duplicate')}>
        <Copy className="mr-2 h-4 w-4" />
        Duplicate
      </Button>
      <Button variant="outline" size="sm" onClick={() => onAction('bulk_edit')}>
        <Edit className="mr-2 h-4 w-4" />
        Bulk Edit
      </Button>
    </div>
);

// Product Details Modal Component
const ProductDetailsModal = ({
                               product,
                               open,
                               onOpenChange
                             }: {
  product: ProductWithSpecial | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { toast } = useToast();

  const getImageUrl = (imagePath: string | undefined) => {
    if (!imagePath) return "/placeholder.svg";
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8003';
    const filename = imagePath.split(/[\\/]/).pop();
    return `${BACKEND_URL}/uploads/products/${filename}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDisplayTags = (tags: any): string[] => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.filter(tag => typeof tag === 'string');
    if (typeof tags === 'string') {
      try {
        const parsed = JSON.parse(tags);
        if (Array.isArray(parsed)) return parsed.filter(tag => typeof tag === 'string');
      } catch {
        return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    }
    return [];
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    });
  };

  if (!product) return null;

  const displayTags = getDisplayTags(product.tags);
  const sizeArray = typeof product.size === 'string'
      ? product.size.split(',').map(s => s.trim()).filter(s => s)
      : Array.isArray(product.size) ? product.size : [];

  const discountPercentage = product.discount
      ? Math.round((parseFloat(product.discount.toString()) / 100) * parseFloat(product.price?.toString() || '0'))
      : 0;

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Details
            </DialogTitle>
            <DialogDescription>
              Complete information about {product.name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6">
            {/* Header with Image and Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Product Image */}
              <div className="md:col-span-1">
                <div className="relative aspect-square rounded-lg border overflow-hidden bg-muted">
                  <img
                      src={getImageUrl(product.images?.[0])}
                      alt={product.name}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                  />
                  {discountPercentage > 0 && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                        -{product.discount}%
                      </div>
                  )}
                </div>
              </div>

              {/* Basic Info */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{product.name}</h2>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={product.isActive ? "default" : "destructive"}>
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">
                          {product.sku || "No SKU"}
                        </Badge>
                        <Badge variant="secondary">
                          {product.categoryLevel1}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-green-600">
                        ${parseFloat(product.price?.toString() || '0').toFixed(2)}
                      </div>
                      {product.discount && (
                          <div className="text-lg text-red-600">
                            {product.discount}% OFF
                          </div>
                      )}
                    </div>
                  </div>

                  <p className="text-muted-foreground mt-3">{product.description || "No description available"}</p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Stock</div>
                    <div className={`text-lg font-semibold ${product.stock < 10 ? "text-red-600" : "text-green-600"}`}>
                      {product.stock} units
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Rating</div>
                    <div className="text-lg font-semibold">
                      {product.rating || 0} ⭐ ({product.reviewsCount || 0} reviews)
                    </div>
                  </div>
                </div>

                {/* Special Categories */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Special Categories</div>
                  <div className="flex gap-2">
                    {product.isFeatured && (
                        <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                    )}
                    {product.isTrending && (
                        <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">
                          <Zap className="h-3 w-3 mr-1" />
                          Trending
                        </Badge>
                    )}
                    {product.isNewArrival && (
                        <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
                          <Clock className="h-3 w-3 mr-1" />
                          New Arrival
                        </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs for Detailed Information */}
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="specifications">Specifications</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Product Information</Label>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Brand</span>
                        <span className="text-sm font-medium">{product.brand || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Unit</span>
                        <span className="text-sm font-medium capitalize">{product.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Discount</span>
                        <span className="text-sm font-medium">{product.discount || 0}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Sizes</Label>
                    {sizeArray.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {sizeArray.map((size, index) => (
                              <Badge key={index} variant="outline" className="text-sm">
                                {size}
                              </Badge>
                          ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No sizes specified</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="specifications" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Weight</span>
                      <span className="text-sm font-medium">{product.weight || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Dimensions</span>
                      <span className="text-sm font-medium">{product.dimensions || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="categories" className="space-y-4 pt-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Main Category</span>
                    <Badge variant="outline">{product.categoryLevel1}</Badge>
                  </div>
                  {product.categoryLevel2 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Subcategory</span>
                        <Badge variant="secondary">{product.categoryLevel2}</Badge>
                      </div>
                  )}
                  {product.categoryLevel3 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Sub-subcategory</span>
                        <Badge variant="outline">{product.categoryLevel3}</Badge>
                      </div>
                  )}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Full Category Path</div>
                    <div className="text-sm font-medium">
                      {[product.categoryLevel1, product.categoryLevel2, product.categoryLevel3]
                          .filter(Boolean)
                          .join(' → ')}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="metadata" className="space-y-4 pt-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="text-sm font-medium">{formatDate(product.createdAt)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Updated</span>
                    <span className="text-sm font-medium">{formatDate(product.updatedAt)}</span>
                  </div>
                  {displayTags.length > 0 && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-2">Tags</div>
                        <div className="flex flex-wrap gap-2">
                          {displayTags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                          ))}
                        </div>
                      </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                  variant="outline"
                  onClick={() => copyToClipboard(product.id)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy ID
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
  );
};

// Main Products Component
export default function Products() {
  const [products, setProducts] = useState<ProductWithSpecial[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithSpecial | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductWithSpecial | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("catalog");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    price: "",
    categoryLevel1: "",
    categoryLevel2: "",
    categoryLevel3: "",
    unit: "piece",
    stock: "0",
    brand: "",
    tags: [],
    isActive: true,
    image: null,
    size: "",
    sku: "",
    weight: "",
    discount: "",
    wishList: false,
    isFeatured: false,
    isTrending: false,
    isNewArrival: false,
    featuredOrder: 0,
    trendingOrder: 0,
    newArrivalOrder: 0,
  });

  const { toast } = useToast();
  const navigate = useNavigate();


  const unitOptions = ['piece', 'kg', 'g', 'ml', 'l', 'hour', 'day', 'month', 'set', 'pair'];
  const statusOptions = ['all', 'active', 'inactive', 'low-stock', 'no-stock'];

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setIsCategoriesLoading(true);
      const response = await fetch('api/categories-tree');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const categoriesData = await response.json();
      setCategories(categoriesData);
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
      toast({
        variant: "destructive",
        title: "Error loading categories",
        description: "Could not fetch categories.",
      });
    } finally {
      setIsCategoriesLoading(false);
    }
  };


const fetchProducts = async () => {
  try {
    setIsLoading(true);
    setError(null);
    const productsResponse = await adminApiService.getProducts();
    const productsList = productsResponse.products || productsResponse.data?.products || productsResponse || [];

    const productsWithDefaults = (Array.isArray(productsList) ? productsList : []).map(product => ({
      ...product,
      // Ensure all numeric fields are numbers
      price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
      discount: typeof product.discount === 'string' ? parseFloat(product.discount) : (product.discount || 0),
      stock: typeof product.stock === 'string' ? parseInt(product.stock) : product.stock,
      featuredOrder: typeof product.featuredOrder === 'string' ? parseInt(product.featuredOrder) : (product.featuredOrder || 0),
      trendingOrder: typeof product.trendingOrder === 'string' ? parseInt(product.trendingOrder) : (product.trendingOrder || 0),
      newArrivalOrder: typeof product.newArrivalOrder === 'string' ? parseInt(product.newArrivalOrder) : (product.newArrivalOrder || 0),
      
      // Boolean fields
      isFeatured: Boolean(product.isFeatured),
      isTrending: Boolean(product.isTrending),
      isNewArrival: Boolean(product.isNewArrival),
      isActive: product.isActive !== undefined ? Boolean(product.isActive) : true,
      wishList: Boolean(product.wishList),
      
      // Optional fields with defaults
      sku: product.sku || `SKU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      weight: product.weight || null,
      averageRating: product.averageRating || 0,
      totalReviews: product.totalReviews || 0,
      rating: product.rating || 0,
      reviewsCount: product.reviewsCount || 0,
    })) as ProductWithSpecial[];

    setProducts(productsWithDefaults);
  } catch (err) {
    console.error('Failed to fetch data:', err);
    setError('Failed to load data. Please try again.');
    toast({
      variant: "destructive",
      title: "Error loading data",
      description: "Could not fetch products.",
    });
  } finally {
    setIsLoading(false);
  }
};

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
        (product.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (product.categoryLevel1?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (product.brand?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (product.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (product.sku?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === "all" ? true :
        selectedStatus === "active" ? product.isActive :
            selectedStatus === "inactive" ? !product.isActive :
                selectedStatus === "low-stock" ? (product.stock || 0) < 10 :
                    selectedStatus === "no-stock" ? (product.stock || 0) === 0 : true;

    const matchesCategory = selectedCategory === "all" ? true :
        product.categoryLevel1 === selectedCategory ||
        product.categoryLevel2 === selectedCategory ||
        product.categoryLevel3 === selectedCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, selectedCategory]);

  // Analytics calculations
  const analytics = {
    totalProducts: filteredProducts.length,
    activeProducts: filteredProducts.filter(p => p.isActive).length,
    lowStock: filteredProducts.filter(p => (p.stock || 0) < 10 && (p.stock || 0) > 0).length,
    outOfStock: filteredProducts.filter(p => (p.stock || 0) === 0).length,
    featured: filteredProducts.filter(p => p.isFeatured).length,
    trending: filteredProducts.filter(p => p.isTrending).length,
    newArrivals: filteredProducts.filter(p => p.isNewArrival).length,
    totalValue: filteredProducts.reduce((sum, p) => {
      const price = parseFloat(p.price?.toString() || '0');
      const stock = parseInt(p.stock?.toString() || '0');
      return sum + (price * stock);
    }, 0),
    averagePrice: filteredProducts.length > 0 ?
        filteredProducts.reduce((sum, p) => sum + parseFloat(p.price?.toString() || '0'), 0) / filteredProducts.length : 0,
  };
  const handleViewProduct = (product: ProductWithSpecial) => {
    navigate(`/admin/products/${product.id}`);
  };




const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validation
  if (!formData.name || !formData.price || !formData.categoryLevel1) {
    toast({
      variant: "destructive",
      title: "Missing fields",
      description: "Please fill in all required fields (Name, Price, Category)"
    });
    return;
  }

  // Image validation for new products
  if (!editingProduct && !formData.image) {
    toast({
      variant: "destructive",
      title: "Image required",
      description: "Please select an image for the product"
    });
    return;
  }

  setIsSubmitting(true);
  
  try {
    const formDataObj = new FormData();
    
    // Basic fields
    formDataObj.append('name', formData.name);
    formDataObj.append('description', formData.description);
    formDataObj.append('price', formData.price);
    formDataObj.append('categoryLevel1', formData.categoryLevel1);
    
    // Optional category fields
    if (formData.categoryLevel2) {
      formDataObj.append('categoryLevel2', formData.categoryLevel2);
    }
    if (formData.categoryLevel3) {
      formDataObj.append('categoryLevel3', formData.categoryLevel3);
    }
    
    // Product details
    formDataObj.append('unit', formData.unit);
    formDataObj.append('stock', formData.stock);
    
    // Optional fields - only append if they have values
    if (formData.brand) formDataObj.append('brand', formData.brand);
    if (formData.sku) formDataObj.append('sku', formData.sku);
    if (formData.weight) formDataObj.append('weight', formData.weight);
    if (formData.discount) formDataObj.append('discount', formData.discount);
    
    // Size - send as comma-separated string
    if (formData.size) {
      formDataObj.append('size', formData.size);
    }
    
    // Tags - send as JSON string (BACKEND EXPECTS THIS)
    if (formData.tags && formData.tags.length > 0) {
      formDataObj.append('tags', JSON.stringify(formData.tags));
    } else {
      formDataObj.append('tags', JSON.stringify([]));
    }
    
    // Boolean fields (must be 'true' or 'false' strings for backend)
    formDataObj.append('isActive', formData.isActive.toString());
    formDataObj.append('isFeatured', formData.isFeatured.toString());
    formDataObj.append('isTrending', formData.isTrending.toString());
    formDataObj.append('isNewArrival', formData.isNewArrival.toString());
    formDataObj.append('wishList', formData.wishList.toString());
    
    // Order fields
    formDataObj.append('featuredOrder', formData.featuredOrder.toString());
    formDataObj.append('trendingOrder', formData.trendingOrder.toString());
    formDataObj.append('newArrivalOrder', formData.newArrivalOrder.toString());

    // Image - only append if it's a new file
    if (formData.image instanceof File) {
      formDataObj.append('image', formData.image);
    }

    console.log('📤 Submitting product data:');
    // Log FormData contents for debugging
    for (let [key, value] of formDataObj.entries()) {
      console.log(`  ${key}:`, value);
    }

    let result;
    if (editingProduct) {
      result = await adminApiService.updateProduct(editingProduct.id, formDataObj, {
        invalidate: () => fetchProducts()
      });
      
      toast({
        title: "Product updated",
        description: "Product has been updated successfully"
      });
    } else {
      result = await adminApiService.createProduct(formDataObj, {
        invalidate: () => fetchProducts()
      });
      
      toast({
        title: "Product added",
        description: "Product has been added successfully"
      });
    }

    // Reset form
    setFormData({
      name: "",
      description: "",
      price: "",
      categoryLevel1: "",
      categoryLevel2: "",
      categoryLevel3: "",
      unit: "piece",
      stock: "0",
      brand: "",
      tags: [],
      isActive: true,
      image: null,
      size: "",
      sku: "",
      weight: "",
      discount: "",
      wishList: false,
      isFeatured: false,
      isTrending: false,
      isNewArrival: false,
      featuredOrder: 0,
      trendingOrder: 0,
      newArrivalOrder: 0,
    });
    setEditingProduct(null);
    setDialogOpen(false);
    
  } catch (err: any) {
    console.error('❌ Failed to save product:', err);
    console.error('Error details:', {
      message: err.message,
      response: err.response,
      stack: err.stack
    });
    
    // More detailed error message
    let errorMessage = "Could not save the product. Please try again.";
    
    if (err.response?.data?.message) {
      errorMessage = err.response.data.message;
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    toast({
      variant: "destructive",
      title: "Error saving product",
      description: errorMessage,
    });
  } finally {
    setIsSubmitting(false);
  }
};

  const handleAddProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      categoryLevel1: "",
      categoryLevel2: "",
      categoryLevel3: "",
      unit: "piece",
      stock: "0",
      brand: "",
      tags: [],
      isActive: true,
      image: null,
      size: "",
      sku: `SKU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      weight: "",
      discount: "",
      wishList: false,
      isFeatured: false,
      isTrending: false,
      isNewArrival: false,
      featuredOrder: 0,
      trendingOrder: 0,
      newArrivalOrder: 0,
    });
    setDialogOpen(true);
  };

  // const handleEditProduct = (productToEdit: ProductWithSpecial) => {
  //   setEditingProduct(productToEdit);
  //   const convertTagsToArray = (tags: unknown): string[] => {
  //     if (!tags) return [];
  //     if (Array.isArray(tags)) {
  //       return tags.reduce<string[]>((acc, tag) => {
  //         if (typeof tag === 'string' && tag.trim()) acc.push(tag.trim());
  //         return acc;
  //       }, []);
  //     }
  //     if (typeof tags === 'string') {
  //       try {
  //         const parsed = JSON.parse(tags);
  //         if (Array.isArray(parsed)) {
  //           return parsed.reduce<string[]>((acc, tag) => {
  //             if (typeof tag === 'string' && tag.trim()) acc.push(tag.trim());
  //             return acc;
  //           }, []);
  //         }
  //       } catch {
  //         return tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
  //       }
  //     }
  //     return [];
  //   };

  //   const getSizeString = (size: any): string => {
  //     if (!size) return "";
  //     if (Array.isArray(size)) return size.filter(s => typeof s === 'string').join(',');
  //     if (typeof size === 'string') return size;
  //     return "";
  //   };

  //   setFormData({
  //     name: productToEdit.name,
  //     description: productToEdit.description || "",
  //     price: productToEdit.price.toString(),
  //     categoryLevel1: productToEdit.categoryLevel1 || "",
  //     categoryLevel2: productToEdit.categoryLevel2 || "",
  //     categoryLevel3: productToEdit.categoryLevel3 || "",
  //     unit: productToEdit.unit || "piece",
  //     stock: productToEdit.stock?.toString() || "0",
  //     brand: productToEdit.brand || "",
  //     tags: convertTagsToArray(productToEdit.tags),
  //     isActive: productToEdit.isActive !== undefined ? productToEdit.isActive : true,
  //     image: productToEdit.images?.[0] || "",
  //     size: getSizeString(productToEdit.size),
  //     sku: productToEdit.sku || `SKU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
  //     weight: (productToEdit.weight || "").toString(),
  //     discount: (productToEdit.discount || "").toString(),
  //     wishList: productToEdit.wishList || false,
  //     isFeatured: productToEdit.isFeatured || false,
  //     isTrending: productToEdit.isTrending || false,
  //     isNewArrival: productToEdit.isNewArrival || false,
  //     featuredOrder: productToEdit.featuredOrder || 0,
  //     trendingOrder: productToEdit.trendingOrder || 0,
  //     newArrivalOrder: productToEdit.newArrivalOrder || 0,
  //   });
  //   setDialogOpen(true);
  // };

const handleEditProduct = (productToEdit: ProductWithSpecial) => {
  setEditingProduct(productToEdit);
  
  const convertTagsToArray = (tags: unknown): string[] => {
    if (!tags) return [];
    if (Array.isArray(tags)) {
      return tags.reduce<string[]>((acc, tag) => {
        if (typeof tag === 'string' && tag.trim()) acc.push(tag.trim());
        return acc;
      }, []);
    }
    if (typeof tags === 'string') {
      try {
        const parsed = JSON.parse(tags);
        if (Array.isArray(parsed)) {
          return parsed.reduce<string[]>((acc, tag) => {
            if (typeof tag === 'string' && tag.trim()) acc.push(tag.trim());
            return acc;
          }, []);
        }
      } catch {
        return tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
      }
    }
    return [];
  };

  const getSizeString = (size: any): string => {
    if (!size) return "";
    if (Array.isArray(size)) return size.filter(s => typeof s === 'string').join(',');
    if (typeof size === 'string') return size;
    return "";
  };

  setFormData({
    name: productToEdit.name,
    description: productToEdit.description || "",
    price: productToEdit.price?.toString() || "",
    categoryLevel1: productToEdit.categoryLevel1 || "",
    categoryLevel2: productToEdit.categoryLevel2 || "",
    categoryLevel3: productToEdit.categoryLevel3 || "",
    unit: productToEdit.unit || "piece",
    stock: productToEdit.stock?.toString() || "0",
    brand: productToEdit.brand || "",
    tags: convertTagsToArray(productToEdit.tags),
    isActive: productToEdit.isActive !== undefined ? productToEdit.isActive : true,
    image: productToEdit.images?.[0] || "",
    size: getSizeString(productToEdit.size),
    sku: productToEdit.sku || `SKU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    weight: (productToEdit.weight || "").toString(),
    discount: (productToEdit.discount || 0).toString(), // Convert number to string
    wishList: productToEdit.wishList || false,
    isFeatured: productToEdit.isFeatured || false,
    isTrending: productToEdit.isTrending || false,
    isNewArrival: productToEdit.isNewArrival || false,
    featuredOrder: productToEdit.featuredOrder || 0,
    trendingOrder: productToEdit.trendingOrder || 0,
    newArrivalOrder: productToEdit.newArrivalOrder || 0,
  });
  setDialogOpen(true);
};

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;
    try {
      await adminApiService.deleteProduct(id);
      setProducts(products.filter((p) => p.id !== id));
      toast({ title: "Product deleted", description: "The product has been removed successfully" });
    } catch (err) {
      console.error('Failed to delete product:', err);
      toast({
        variant: "destructive",
        title: "Error deleting product",
        description: "Could not delete the product. Please try again.",
      });
    }
  };

  const handleToggleStatus = async (productToToggle: ProductWithSpecial) => {
    try {
      const formData = new FormData();
      formData.append('isActive', (!productToToggle.isActive).toString());

      const updatedProduct = await adminApiService.updateProduct(productToToggle.id, formData, {
        invalidate: () => fetchProducts()
      });

      const updatedProductWithSpecial = {
        ...updatedProduct,
        isFeatured: (updatedProduct as any).isFeatured ?? productToToggle.isFeatured,
        isTrending: (updatedProduct as any).isTrending ?? productToToggle.isTrending,
        isNewArrival: (updatedProduct as any).isNewArrival ?? productToToggle.isNewArrival,
        featuredOrder: (updatedProduct as any).featuredOrder ?? productToToggle.featuredOrder,
        trendingOrder: (updatedProduct as any).trendingOrder ?? productToToggle.trendingOrder,
        newArrivalOrder: (updatedProduct as any).newArrivalOrder ?? productToToggle.newArrivalOrder,
      } as ProductWithSpecial;
      setProducts(products.map((p) => p.id === productToToggle.id ? updatedProductWithSpecial : p));
      toast({
        title: `Product ${!productToToggle.isActive ? 'activated' : 'deactivated'}`,
        description: `Product has been ${!productToToggle.isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (err) {
      console.error('Failed to toggle product status:', err);
      toast({
        variant: "destructive",
        title: "Error updating product",
        description: "Could not update product status. Please try again.",
      });
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'export':
        toast({ title: "Export", description: "Export functionality coming soon" });
        break;
      case 'import':
        toast({ title: "Import", description: "Import functionality coming soon" });
        break;
      case 'duplicate':
        toast({ title: "Duplicate", description: "Duplicate functionality coming soon" });
        break;
      case 'bulk_edit':
        toast({ title: "Bulk Edit", description: "Bulk edit functionality coming soon" });
        break;
    }
  };

  const getImageUrl = (image?: string): string => {
    if (!image || !image.trim()) {
      return "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&h=500&fit=crop";
    }
    const clean = image.trim();
    if (clean.includes("cloudinary.com")) return clean;
    if (clean.includes("georgina-server-code.onrender.com/uploads/products/")) {
      const filename = clean.split("/").pop();
      return `https://res.cloudinary.com/dy0lpwemp/image/upload/v1762654150/georgina-products/${filename}`;
    }
    if (clean.startsWith("uploads/products/")) {
      const filename = clean.split("/").pop();
      return `https://res.cloudinary.com/dy0lpwemp/image/upload/v1762654150/georgina-products/${filename}`;
    }
    return clean;
  };

  // Get unique categories for filter
  const uniqueCategories = [...new Set(products.flatMap(p => [p.categoryLevel1, p.categoryLevel2, p.categoryLevel3].filter(Boolean)))];

  if (error && products.length === 0) {
    return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Products</h1>
            <Button onClick={fetchProducts} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Failed to load products</p>
              <p className="text-muted-foreground text-center mb-4">{error}</p>
              <Button onClick={fetchProducts}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
    );
  }

  const flattenCategories = (categories: Category[]): Category[] => {
    const flattened: Category[] = [];

    const flatten = (category: Category) => {
      flattened.push(category);
      if (category.children && category.children.length > 0) {
        category.children.forEach(child => flatten(child));
      }
    };

    categories.forEach(category => flatten(category));
    return flattened;
  };
  // Get all categories as a flat array
  const allCategories = flattenCategories(categories);

  // Get categories by level
  const getCategoriesByLevel = (level: number) => {
    return allCategories.filter(cat => cat.level === level);
  };

  // Get top-level categories (level 1)
  const topLevelCategories = getCategoriesByLevel(1);

  // Get level 2 categories
  const level2Categories = getCategoriesByLevel(2);

  // Get level 3 categories
  // const level3Categories = getCategoriesByLevel(3);

  // Get subcategories for a specific parent
  const getSubcategories = (parentId: string) => {
    return allCategories.filter(cat => cat.parentId === parentId);
  };
  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground">Manage your product catalog and inventory</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { fetchProducts(); fetchCategories(); }} variant="outline" disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {activeTab === "catalog" && (
                <Button onClick={handleAddProduct} disabled={isLoading}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
            )}
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ProductAnalyticsCard
              title="Total Products"
              value={analytics.totalProducts.toString()}
              icon={Package}
              description={`${analytics.activeProducts} active`}
              color="text-blue-500"
          />
          <ProductAnalyticsCard
              title="Inventory Value"
              value={`$${analytics.totalValue.toFixed(2)}`}
              icon={DollarSign}
              description={`Avg: $${analytics.averagePrice.toFixed(2)}`}
              color="text-green-500"
          />
          <ProductAnalyticsCard
              title="Stock Status"
              value={`${analytics.lowStock + analytics.outOfStock}`}
              icon={AlertTriangle}
              description={`${analytics.lowStock} low, ${analytics.outOfStock} out`}
              color="text-orange-500"
          />
          <ProductAnalyticsCard
              title="Special Categories"
              value={`${analytics.featured + analytics.trending + analytics.newArrivals}`}
              icon={Star}
              description={`${analytics.featured} featured, ${analytics.trending} trending`}
              color="text-purple-500"
          />
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="catalog" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Catalog
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Catalog Tab */}
          <TabsContent value="catalog" className="space-y-6">
            {/* Filters and Search */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                  <div className="flex flex-col md:flex-row gap-4 flex-1">
                    <div className="relative flex-1 md:max-w-sm">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                          placeholder="Search products by name, SKU, brand..."
                          className="pl-8"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          disabled={isLoading}
                      />
                    </div>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.replace('-', ' ').toUpperCase()}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {uniqueCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                        variant={viewMode === "grid" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === "list" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <QuickActions onAction={handleQuickAction} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products Table */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Product Catalog</CardTitle>
                    <CardDescription>{filteredProducts.length} products found</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    <span>Filtered results</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                      ))}
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <>
                      <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Sizes</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Special</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedProducts.map((product) => (
                            <TableRow key={product.id} className="hover:bg-muted/50">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <img
                                      src={getImageUrl(product.images?.[0])}
                                      alt={product.name}
                                      className="h-12 w-12 rounded object-cover border"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                                      }}
                                  />
                                  <div>
                                    <div
                                        className="font-medium cursor-pointer hover:text-blue-600 transition-colors"
                                        onClick={() => handleViewProduct(product)}
                                    >
                                      {product.name}
                                    </div>
                                    <div className="text-sm text-muted-foreground line-clamp-1">
                                      {product.brand && <span>{product.brand} • </span>}
                                      {product.description || "No description"}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-mono text-xs text-muted-foreground">
                                  {product.sku}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <Badge variant="outline">{product.categoryLevel1}</Badge>
                                  {product.categoryLevel2 && (
                                      <div className="text-xs text-muted-foreground">{product.categoryLevel2}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="space-y-1">
                                  <div>${product.price != null ? parseFloat(product.price.toString()).toFixed(2) : '0.00'}</div>
                                  {product.discount && product.discount > 0 && (
                                      <div className="text-xs text-red-600">
                                        {product.discount}% OFF
                                      </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                            <span className={product.stock < 10 ? "text-destructive font-medium" : ""}>
                              {product.stock}
                            </span>
                                  {product.stock < 10 && product.stock > 0 && (
                                      <div className="text-xs text-destructive">Low stock</div>
                                  )}
                                  {product.stock === 0 && (
                                      <div className="text-xs text-destructive">Out of stock</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {product.size ? (
                                    <div className="flex flex-wrap gap-1 max-w-24">
                                      {/* Safely get the first 2 sizes */}
                                      {(() => {
                                        if (typeof product.size === 'string') {
                                          const sizes = product.size.split(',').filter(s => s.trim());
                                          return sizes.slice(0, 2).map((size, index) => (
                                              <Badge key={index} variant="outline" className="text-xs">
                                                {size.trim()}
                                              </Badge>
                                          ));
                                        } else if (Array.isArray(product.size)) {
                                          const sizes = product.size.filter(s => s != null);
                                          return sizes.slice(0, 2).map((size, index) => (
                                              <Badge key={index} variant="outline" className="text-xs">
                                                {size}
                                              </Badge>
                                          ));
                                        }
                                        return null;
                                      })()}

                                      {/* Show "+ more" indicator */}
                                      {(() => {
                                        let sizeCount = 0;

                                        if (typeof product.size === 'string') {
                                          sizeCount = product.size.split(',').filter(s => s.trim()).length;
                                        } else if (Array.isArray(product.size)) {
                                          sizeCount = product.size.filter(s => s != null).length;
                                        }

                                        if (sizeCount > 2) {
                                          return (
                                              <span className="text-xs text-muted-foreground">
                                      +{sizeCount - 2} more
                                    </span>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>
                                ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={product.isActive ? 'default' : 'destructive'}>
                                  {product.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {product.isFeatured && (
                                      <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-xs">
                                        <Star className="h-3 w-3 mr-1" />
                                        F
                                      </Badge>
                                  )}
                                  {product.isTrending && (
                                      <Badge variant="default" className="bg-orange-500 hover:bg-orange-600 text-xs">
                                        <Zap className="h-3 w-3 mr-1" />
                                        T
                                      </Badge>
                                  )}
                                  {product.isNewArrival && (
                                      <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-xs">
                                        <Clock className="h-3 w-3 mr-1" />
                                        N
                                      </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => navigate(`/admin/products/${product.id}`)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleToggleStatus(product)}>
                                      {product.isActive ? 'Deactivate' : 'Activate'}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => handleDeleteProduct(product.id)}
                                        className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {/* Pagination */}
                    {paginatedProducts.length > 0 && (
                      <div className="flex justify-between items-center py-4 mt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Showing {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
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
                              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 7) {
                                  pageNum = i + 1;
                                } else if (currentPage <= 4) {
                                  pageNum = i + 1;
                                } else if (currentPage >= totalPages - 3) {
                                  pageNum = totalPages - 6 + i;
                                } else {
                                  pageNum = currentPage - 3 + i;
                                }
                                return (
                                  <PaginationItem key={pageNum}>
                                    <PaginationLink
                                      onClick={() => setCurrentPage(pageNum)}
                                      isActive={currentPage === pageNum}
                                      className="cursor-pointer"
                                    >
                                      {pageNum}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              })}
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
                  </>
                ) : (
                    <div className="text-center py-10">
                      <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-lg font-medium">No products found</p>
                      <p className="text-muted-foreground">
                        {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first product"}
                      </p>
                    </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Management</CardTitle>
                <CardDescription>Manage stock levels and inventory status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{analytics.lowStock}</div>
                        <p className="text-xs text-muted-foreground">Products with less than 10 units</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">{analytics.outOfStock}</div>
                        <p className="text-xs text-muted-foreground">Products with zero stock</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Healthy Stock</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {analytics.totalProducts - analytics.lowStock - analytics.outOfStock}
                        </div>
                        <p className="text-xs text-muted-foreground">Products with sufficient stock</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Analytics</CardTitle>
                <CardDescription>Performance metrics and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Special Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Featured</span>
                          <span className="font-bold">{analytics.featured}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Trending</span>
                          <span className="font-bold">{analytics.trending}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">New Arrivals</span>
                          <span className="font-bold">{analytics.newArrivals}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Pricing Stats</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Average Price</span>
                          <span className="font-bold">${analytics.averagePrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Highest Price</span>
                          <span className="font-bold">
                          ${Math.max(...filteredProducts.map(p => parseFloat(p.price?.toString() || '0'))).toFixed(2)}
                        </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Lowest Price</span>
                          <span className="font-bold">
                          ${Math.min(...filteredProducts.map(p => parseFloat(p.price?.toString() || '0'))).toFixed(2)}
                        </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Product Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {editingProduct ? "Update the product information" : "Add a new product to your catalog"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-1">
                <ImageUploadWithFile
                    onImageChange={(file, previewUrl) => {
                      setFormData({ ...formData, image: file });
                    }}
                    currentImage={
                      typeof formData.image === 'string' ? formData.image :
                          formData.image instanceof File ? '' :
                              formData.image || ''
                    }
                    className="h-40 overflow-y-scroll"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="text-xs">Product Name *</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Wireless Headphones"
                        className="h-9 text-sm"
                        required
                        disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sku" className="text-xs">SKU</Label>
                    <Input
                        id="sku"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="e.g., PROD-001"
                        className="h-9 text-sm"
                        disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description" className="text-xs">Description</Label>
                  <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe your product..."
                      rows={3}
                      className="min-h-[80px] text-sm"
                      disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="price" className="text-xs">Price *</Label>
                    <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                        className="h-9 text-sm"
                        required
                        disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="discount" className="text-xs">Discount (%)</Label>
                    <Input
                        id="discount"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.discount}
                        onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                        placeholder="0"
                        className="h-9 text-sm"
                        disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="stock" className="text-xs">Stock</Label>
                    <Input
                        id="stock"
                        type="number"
                        min="0"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        placeholder="0"
                        className="h-9 text-sm"
                        disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="unit" className="text-xs">Unit</Label>
                    <Select
                        value={formData.unit}
                        onValueChange={(value) => setFormData({ ...formData, unit: value })}
                        disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit.charAt(0).toUpperCase() + unit.slice(1)}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="brand" className="text-xs">Brand</Label>
                    <Input
                        id="brand"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        placeholder="Brand name"
                        className="h-9 text-sm"
                        disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="weight" className="text-xs">Weight</Label>
                    <Input
                        id="weight"
                        type="text"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        placeholder="e.g., 0.5kg, 500g"
                        className="h-9 text-sm"
                        disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-xs">Sizes (for clothing)</Label>
                    <SizeInput
                        sizes={formData.size}
                        onSizesChange={(newSizes) => setFormData({ ...formData, size: newSizes })}
                        disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tags" className="text-xs">Tags</Label>
                    <TagInput
                        tags={formData.tags}
                        onTagsChange={(newTags) => setFormData({ ...formData, tags: newTags })}
                        disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Category Selection */}
                <div className="grid gap-3">
                  <Label className="text-xs">Category *</Label>
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Select
                          value={formData.categoryLevel1}
                          onValueChange={(value) => setFormData({
                            ...formData,
                            categoryLevel1: value,
                            categoryLevel2: "",
                            categoryLevel3: ""
                          })}
                          disabled={isSubmitting || isCategoriesLoading}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={
                            isCategoriesLoading ? "Loading categories..." : "Select category"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {topLevelCategories.map((category) => (
                              <SelectItem key={category.id} value={category.name}>
                                {category.name}
                              </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.categoryLevel1 && (
                        <div className="grid gap-2">
                          <Label htmlFor="categoryLevel2" className="text-xs">Sub Category</Label>
                          <Select
                              value={formData.categoryLevel2}
                              onValueChange={(value) => setFormData({
                                ...formData,
                                categoryLevel2: value,
                                categoryLevel3: ""
                              })}
                              disabled={isSubmitting}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Select sub category" />
                            </SelectTrigger>
                            <SelectContent>
                              {getSubcategories(
                                  categories.find(cat => cat.name === formData.categoryLevel1)?.id || ''
                              ).map((subcategory) => (
                                  <SelectItem key={subcategory.id} value={subcategory.name}>
                                    {subcategory.name}
                                  </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                    )}

                    {formData.categoryLevel2 && (
                        <div className="grid gap-2">
                          <Label htmlFor="categoryLevel3" className="text-xs">Item</Label>
                          <Select
                              value={formData.categoryLevel3}
                              onValueChange={(value) => setFormData({
                                ...formData,
                                categoryLevel3: value
                              })}
                              disabled={isSubmitting}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {getSubcategories(
                                  level2Categories.find(cat => cat.name === formData.categoryLevel2)?.id || ''
                              ).map((subsubcategory) => (
                                  <SelectItem key={subsubcategory.id} value={subsubcategory.name}>
                                    {subsubcategory.name}
                                  </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                    )}
                  </div>
                </div>

                {/* Special Categories */}
                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-sm font-medium">Special Categories</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-3 p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="isFeatured" className="flex items-center gap-2 text-sm">
                          <Star className="h-4 w-4 text-yellow-500" />
                          Featured
                        </Label>
                        <Switch
                            id="isFeatured"
                            checked={formData.isFeatured}
                            onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                            disabled={isSubmitting}
                        />
                      </div>
                      {formData.isFeatured && (
                          <div className="grid gap-2">
                            <Label htmlFor="featuredOrder" className="text-xs">Display Order</Label>
                            <Input
                                id="featuredOrder"
                                type="number"
                                min="0"
                                value={formData.featuredOrder}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  featuredOrder: parseInt(e.target.value) || 0
                                })}
                                placeholder="0"
                                className="h-8 text-sm"
                                disabled={isSubmitting}
                            />
                          </div>
                      )}
                    </div>

                    <div className="space-y-3 p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="isTrending" className="flex items-center gap-2 text-sm">
                          <Zap className="h-4 w-4 text-orange-500" />
                          Trending
                        </Label>
                        <Switch
                            id="isTrending"
                            checked={formData.isTrending}
                            onCheckedChange={(checked) => setFormData({ ...formData, isTrending: checked })}
                            disabled={isSubmitting}
                        />
                      </div>
                      {formData.isTrending && (
                          <div className="grid gap-2">
                            <Label htmlFor="trendingOrder" className="text-xs">Display Order</Label>
                            <Input
                                id="trendingOrder"
                                type="number"
                                min="0"
                                value={formData.trendingOrder}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  trendingOrder: parseInt(e.target.value) || 0
                                })}
                                placeholder="0"
                                className="h-8 text-sm"
                                disabled={isSubmitting}
                            />
                          </div>
                      )}
                    </div>

                    <div className="space-y-3 p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="isNewArrival" className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-blue-500" />
                          New Arrival
                        </Label>
                        <Switch
                            id="isNewArrival"
                            checked={formData.isNewArrival}
                            onCheckedChange={(checked) => setFormData({ ...formData, isNewArrival: checked })}
                            disabled={isSubmitting}
                        />
                      </div>
                      {formData.isNewArrival && (
                          <div className="grid gap-2">
                            <Label htmlFor="newArrivalOrder" className="text-xs">Display Order</Label>
                            <Input
                                id="newArrivalOrder"
                                type="number"
                                min="0"
                                value={formData.newArrivalOrder}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  newArrivalOrder: parseInt(e.target.value) || 0
                                })}
                                placeholder="0"
                                className="h-8 text-sm"
                                disabled={isSubmitting}
                            />
                          </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3">
                    <Switch
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                        disabled={isSubmitting}
                    />
                    <Label htmlFor="isActive" className="text-sm">Active Product</Label>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {editingProduct ? "Update this product" : "Create new product"}
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2 mt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="h-9 text-sm px-4"
                    disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                    type="submit"
                    className="h-9 text-sm px-4"
                    disabled={isSubmitting}
                >
                  {isSubmitting ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        {editingProduct ? "Updating..." : "Adding..."}
                      </>
                  ) : (
                      editingProduct ? "Update Product" : "Add Product"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Product Details Modal */}
        <ProductDetailsModal
            product={selectedProduct}
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
        />
      </div>
  );
}