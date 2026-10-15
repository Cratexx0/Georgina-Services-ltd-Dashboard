// import { useState, useEffect } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
//   DollarSign,
//   Star,
//   TrendingUp,
//   Zap,
//   Calendar,
//   Tag,
//   Hash,
//   Layers,
//   Edit,
//   Trash2,
//   Check,
//   X,
//   Sparkles,
//   BarChart3,
//   Eye,
//   RefreshCw,
// } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";
// import adminApiService from "@/contexts/adminApiService";

// interface Product {
//   id: string;
//   name: string;
//   slug: string;
//   description: string;
//   price: number;
//   categoryLevel1: string;
//   categoryLevel2?: string;
//   categoryLevel3?: string;
//   unit: string;
//   stock: number;
//   images: string[];
//   tags?: string[];
//   brand?: string;
//   isActive: boolean;
//   isFeatured?: boolean;
//   isTrending?: boolean;
//   isNewArrival?: boolean;
//   featuredOrder?: number;
//   trendingOrder?: number;
//   newArrivalOrder?: number;
//   size?: string | string[];
//   sku?: string;
//   weight?: number;
//   dimensions?: string;
//   discountPrice?: number;
//   discountPercentage?: number;
//   rating?: number;
//   reviewsCount?: number;
//   createdAt: string;
//   updatedAt: string;
// }

// export default function ProductDetails() {
//   const { id } = useParams<{ id: string }>();
//   const navigate = useNavigate();
//   const { toast } = useToast();
  
//   const [product, setProduct] = useState<Product | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
//   const [currentImageIndex, setCurrentImageIndex] = useState(0);

//   useEffect(() => {
//     fetchProductDetails();
//   }, [id]);

//   const fetchProductDetails = async () => {
//     try {
//       setIsLoading(true);
//       const response = await adminApiService.getProducts();
      
//       let productsData: any[] = [];
//       if (Array.isArray(response)) {
//         productsData = response;
//       } else if (response && Array.isArray(response.products)) {
//         productsData = response.products;
//       } else if (response && response.data) {
//         productsData = Array.isArray(response.data) ? response.data : response.data.products || [];
//       }

//       const foundProduct = productsData.find((p: any) => String(p.id) === id);
      
//       if (!foundProduct) {
//         toast({
//           variant: "destructive",
//           title: "Product not found",
//           description: "The requested product could not be found.",
//         });
//         navigate("/admin/products");
//         return;
//       }

//       setProduct(foundProduct);
//     } catch (err: any) {
//       console.error('Failed to fetch product:', err);
//       toast({
//         variant: "destructive",
//         title: "Error loading product",
//         description: err.message || "Could not load product details.",
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleDeleteProduct = async () => {
//     if (!product) return;

//     try {
//       await adminApiService.deleteProduct(product.id);
      
//       toast({
//         title: "Product deleted",
//         description: `${product.name} has been deleted successfully.`,
//       });

//       navigate("/admin/products");
//     } catch (err: any) {
//       console.error('Failed to delete product:', err);
//       toast({
//         variant: "destructive",
//         title: "Delete failed",
//         description: err.message || "Could not delete the product.",
//       });
//     }
//   };

//   const getImageUrl = (imagePath: string) => {
//     if (!imagePath) return "/placeholder.svg";
//     if (imagePath.startsWith('http')) return imagePath;
//     return `https://georgina-server-code.onrender.com${imagePath}`;
//   };

//   if (isLoading) {
//     return (
//       <div className="space-y-6 p-4 md:p-6 lg:p-8">
//         <div className="flex items-center gap-4">
//           <Button variant="outline" size="icon" onClick={() => navigate("/admin/products")}>
//             <ArrowLeft className="h-4 w-4" />
//           </Button>
//           <div className="flex-1">
//             <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
//             <div className="h-4 w-32 bg-muted rounded animate-pulse" />
//           </div>
//         </div>
        
//         <div className="grid gap-6 lg:grid-cols-3">
//           <div className="lg:col-span-2 space-y-6">
//             <Card>
//               <CardContent className="p-6">
//                 <div className="space-y-4">
//                   {Array.from({ length: 5 }).map((_, i) => (
//                     <div key={i} className="h-12 bg-muted rounded animate-pulse" />
//                   ))}
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (!product) {
//     return (
//       <div className="space-y-6 p-4 md:p-6 lg:p-8">
//         <Button variant="outline" onClick={() => navigate("/admin/products")}>
//           <ArrowLeft className="h-4 w-4 mr-2" />
//           Back to Products
//         </Button>
//         <Card>
//           <CardContent className="flex flex-col items-center justify-center py-12">
//             <Package className="h-12 w-12 text-muted-foreground mb-4" />
//             <p className="text-lg font-medium">Product not found</p>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }

//   const images = product.images && product.images.length > 0 ? product.images : ["/placeholder.svg"];

//   return (
//     <div className="space-y-6 p-4 md:p-6 lg:p-8">
//       {/* Enhanced Header */}
//       <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 p-6 md:p-8 shadow-lg">
//         <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))] dark:bg-grid-slate-700/25"></div>
//         <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
//           <div className="flex items-start gap-4 flex-1">
//             <Button 
//               variant="outline" 
//               size="icon" 
//               onClick={() => navigate("/admin/products")}
//               className="bg-white/80 backdrop-blur-sm hover:bg-white"
//             >
//               <ArrowLeft className="h-4 w-4" />
//             </Button>
//             <div className="flex-1">
//               <div className="flex items-center gap-3 mb-2 flex-wrap">
//                 <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
//                   {product.name}
//                 </h1>
//                 {product.isActive ? (
//                   <Badge className="bg-green-100 text-green-800 border-green-200">
//                     <Check className="h-3 w-3 mr-1" />
//                     Active
//                   </Badge>
//                 ) : (
//                   <Badge variant="secondary">
//                     <X className="h-3 w-3 mr-1" />
//                     Inactive
//                   </Badge>
//                 )}
//                 {product.isFeatured && (
//                   <Badge className="bg-amber-100 text-amber-800 border-amber-200">
//                     <Star className="h-3 w-3 mr-1" />
//                     Featured
//                   </Badge>
//                 )}
//                 {product.isTrending && (
//                   <Badge className="bg-pink-100 text-pink-800 border-pink-200">
//                     <TrendingUp className="h-3 w-3 mr-1" />
//                     Trending
//                   </Badge>
//                 )}
//                 {product.isNewArrival && (
//                   <Badge className="bg-purple-100 text-purple-800 border-purple-200">
//                     <Sparkles className="h-3 w-3 mr-1" />
//                     New
//                   </Badge>
//                 )}
//               </div>
//               <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
//                 <span className="flex items-center gap-1.5">
//                   <Package className="h-3.5 w-3.5" />
//                   SKU: {product.sku || 'N/A'}
//                 </span>
//                 <span className="flex items-center gap-1.5">
//                   <Hash className="h-3.5 w-3.5" />
//                   ID: {product.id}
//                 </span>
//                 <span className="flex items-center gap-1.5">
//                   <Calendar className="h-3.5 w-3.5" />
//                   Created: {new Date(product.createdAt).toLocaleDateString()}
//                 </span>
//               </div>
//             </div>
//           </div>
//           <div className="flex gap-2">
//             <Button
//               onClick={() => navigate(`/admin/products/${product.id}/edit`)}
//               className="shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
//             >
//               <Edit className="h-4 w-4 mr-2" />
//               Edit Product
//             </Button>
//             <Button
//               variant="destructive"
//               onClick={() => setDeleteDialogOpen(true)}
//               className="shadow-lg"
//             >
//               <Trash2 className="h-4 w-4 mr-2" />
//               Delete
//             </Button>
//           </div>
//         </div>
//       </div>

//       {/* Overview Section - Key Metrics */}
//       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
//         {/* Pricing Card */}
//         <Card className="border-2 border-emerald-200 dark:border-emerald-900">
//           <CardHeader className="pb-3">
//             <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
//               <DollarSign className="h-4 w-4 text-emerald-600" />
//               Pricing
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             {product.discountPrice && product.discountPrice > 0 ? (
//               <div className="space-y-2">
//                 <div>
//                   <p className="text-2xl font-bold text-emerald-600">
//                     ${Number(product.discountPrice).toFixed(2)}
//                   </p>
//                   <p className="text-xs text-muted-foreground line-through">
//                     ${Number(product.price).toFixed(2)}
//                   </p>
//                 </div>
//                 {product.discountPercentage && (
//                   <Badge className="bg-amber-500 text-white text-xs">
//                     -{product.discountPercentage}% OFF
//                   </Badge>
//                 )}
//               </div>
//             ) : (
//               <div>
//                 <p className="text-2xl font-bold text-emerald-600">
//                   ${Number(product.price).toFixed(2)}
//                 </p>
//                 <p className="text-xs text-muted-foreground mt-1">per {product.unit}</p>
//               </div>
//             )}
//           </CardContent>
//         </Card>

//         {/* Inventory Card */}
//         <Card className={`border-2 ${
//           product.stock > 10 
//             ? 'border-green-200 dark:border-green-900'
//             : product.stock > 0
//             ? 'border-amber-200 dark:border-amber-900'
//             : 'border-red-200 dark:border-red-900'
//         }`}>
//           <CardHeader className="pb-3">
//             <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
//               <Package className="h-4 w-4" />
//               Inventory
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-2">
//               <p className="text-2xl font-bold">
//                 {product.stock} <span className="text-base font-normal text-muted-foreground">{product.unit}s</span>
//               </p>
//               {product.stock === 0 && (
//                 <Badge variant="destructive" className="text-xs">
//                   Out of Stock
//                 </Badge>
//               )}
//               {product.stock > 0 && product.stock <= 10 && (
//                 <Badge className="bg-amber-500 text-xs">
//                   Low Stock
//                 </Badge>
//               )}
//               {product.stock > 10 && (
//                 <Badge className="bg-green-500 text-xs">
//                   In Stock
//                 </Badge>
//               )}
//             </div>
//           </CardContent>
//         </Card>

//         {/* Rating Card */}
//         <Card className="border-2 border-purple-200 dark:border-purple-900">
//           <CardHeader className="pb-3">
//             <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
//               <Star className="h-4 w-4 text-amber-500" />
//               Rating
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             {product.rating ? (
//               <div className="space-y-1">
//                 <div className="flex items-baseline gap-2">
//                   <p className="text-2xl font-bold">{product.rating}</p>
//                   <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
//                 </div>
//                 {product.reviewsCount && (
//                   <p className="text-xs text-muted-foreground">
//                     {product.reviewsCount} review{product.reviewsCount !== 1 ? 's' : ''}
//                   </p>
//                 )}
//               </div>
//             ) : (
//               <p className="text-sm text-muted-foreground">No ratings yet</p>
//             )}
//           </CardContent>
//         </Card>

//         {/* Views/Stats Card */}
//         <Card className="border-2 border-blue-200 dark:border-blue-900">
//           <CardHeader className="pb-3">
//             <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
//               <BarChart3 className="h-4 w-4 text-blue-600" />
//               Category
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-2">
//               <div>
//                 <p className="text-sm font-semibold">{product.categoryLevel1}</p>
//                 {product.categoryLevel2 && (
//                   <p className="text-xs text-muted-foreground">→ {product.categoryLevel2}</p>
//                 )}
//                 {product.categoryLevel3 && (
//                   <p className="text-xs text-muted-foreground">→ {product.categoryLevel3}</p>
//                 )}
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Main Content Grid */}
//       <div className="grid gap-6 lg:grid-cols-3">
//         {/* Left Column - Images (Larger) */}
//         <div className="lg:col-span-2 space-y-6">
//           {/* Product Images */}
//           <Card className="border-2 hover:shadow-lg transition-shadow overflow-hidden">
//             <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50">
//               <CardTitle className="flex items-center gap-2">
//                 <Eye className="h-5 w-5" />
//                 Product Images
//               </CardTitle>
//               <CardDescription>View all product images</CardDescription>
//             </CardHeader>
//             <CardContent className="pt-6">
//               <div className="space-y-4">
//                 {/* Main Image */}
//                 <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800">
//                   <img
//                     src={getImageUrl(images[currentImageIndex])}
//                     alt={product.name}
//                     className="w-full h-full object-contain"
//                     onError={(e) => {
//                       (e.target as HTMLImageElement).src = "/placeholder.svg";
//                     }}
//                   />
//                 </div>
                
//                 {/* Thumbnail Gallery */}
//                 {images.length > 1 && (
//                   <div className="grid grid-cols-5 gap-2">
//                     {images.map((img, index) => (
//                       <button
//                         key={index}
//                         onClick={() => setCurrentImageIndex(index)}
//                         className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
//                           currentImageIndex === index 
//                             ? 'border-blue-500 ring-2 ring-blue-200' 
//                             : 'border-slate-200 hover:border-blue-300'
//                         }`}
//                       >
//                         <img
//                           src={getImageUrl(img)}
//                           alt={`${product.name} ${index + 1}`}
//                           className="w-full h-full object-cover"
//                           onError={(e) => {
//                             (e.target as HTMLImageElement).src = "/placeholder.svg";
//                           }}
//                         />
//                       </button>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             </CardContent>
//           </Card>

//           {/* Product Description */}
//           <Card className="border-2">
//             <CardHeader>
//               <CardTitle>Product Description</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <p className="text-muted-foreground leading-relaxed">
//                 {product.description || 'No description available'}
//               </p>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Right Column - Details */}
//         <div className="space-y-6">
//           {/* Categories */}
//           <Card className="border-2">
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2 text-base">
//                 <Layers className="h-4 w-4" />
//                 Categories
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-2">
//               <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
//                 <span className="text-xs font-medium">Level 1</span>
//                 <Badge variant="outline" className="text-xs">{product.categoryLevel1}</Badge>
//               </div>
//               {product.categoryLevel2 && (
//                 <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
//                   <span className="text-xs font-medium">Level 2</span>
//                   <Badge variant="secondary" className="text-xs">{product.categoryLevel2}</Badge>
//                 </div>
//               )}
//               {product.categoryLevel3 && (
//                 <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-900">
//                   <span className="text-xs font-medium">Level 3</span>
//                   <Badge variant="outline" className="text-xs">{product.categoryLevel3}</Badge>
//                 </div>
//               )}
//             </CardContent>
//           </Card>

//           {/* Product Attributes */}
//           <Card className="border-2">
//             <CardHeader>
//               <CardTitle className="text-base">Product Attributes</CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               {product.brand && (
//                 <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
//                   <span className="text-sm text-muted-foreground">Brand</span>
//                   <Badge variant="secondary">{product.brand}</Badge>
//                 </div>
//               )}
              
//               {product.weight && (
//                 <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
//                   <span className="text-sm text-muted-foreground">Weight</span>
//                   <span className="text-sm font-medium">{product.weight} kg</span>
//                 </div>
//               )}
              
//               {product.dimensions && (
//                 <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
//                   <span className="text-sm text-muted-foreground">Dimensions</span>
//                   <span className="text-sm font-medium">{product.dimensions}</span>
//                 </div>
//               )}
              
//               {product.size && (
//                 <div className="space-y-2">
//                   <span className="text-sm text-muted-foreground">Available Sizes</span>
//                   <div className="flex flex-wrap gap-2">
//                     {(Array.isArray(product.size) ? product.size : [product.size]).map((size, index) => (
//                       <Badge key={index} variant="outline">
//                         {size}
//                       </Badge>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </CardContent>
//           </Card>

//           {/* Tags */}
//           {product.tags && product.tags.length > 0 && (
//             <Card className="border-2">
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2 text-base">
//                   <Tag className="h-4 w-4" />
//                   Tags
//                 </CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="flex flex-wrap gap-2">
//                   {product.tags.map((tag, index) => (
//                     <Badge key={index} variant="secondary" className="text-xs">
//                       {tag}
//                     </Badge>
//                   ))}
//                 </div>
//               </CardContent>
//             </Card>
//           )}

//           {/* Timeline */}
//           <Card className="border-2">
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2 text-base">
//                 <Calendar className="h-4 w-4" />
//                 Timeline
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-3">
//               <div className="space-y-1">
//                 <p className="text-xs text-muted-foreground">Created</p>
//                 <p className="text-sm font-medium">
//                   {new Date(product.createdAt).toLocaleString('en-US', {
//                     month: 'short',
//                     day: 'numeric',
//                     year: 'numeric',
//                     hour: '2-digit',
//                     minute: '2-digit'
//                   })}
//                 </p>
//               </div>
//               <div className="space-y-1 pt-2 border-t">
//                 <p className="text-xs text-muted-foreground">Last Updated</p>
//                 <p className="text-sm font-medium">
//                   {new Date(product.updatedAt).toLocaleString('en-US', {
//                     month: 'short',
//                     day: 'numeric',
//                     year: 'numeric',
//                     hour: '2-digit',
//                     minute: '2-digit'
//                   })}
//                 </p>
//               </div>
//             </CardContent>
//           </Card>
//         </div>
//       </div>

//       {/* Delete Confirmation Modal */}
//       <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
//         <AlertDialogContent className="sm:max-w-[450px]">
//           <AlertDialogHeader>
//             <div className="flex items-center gap-3 mb-2">
//               <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
//                 <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
//               </div>
//               <div>
//                 <AlertDialogTitle className="text-xl">Delete Product</AlertDialogTitle>
//               </div>
//             </div>
//             <AlertDialogDescription className="text-base pt-2">
//               Are you sure you want to delete <strong className="text-foreground">"{product.name}"</strong>?
//               <div className="mt-3 p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900">
//                 <p className="text-sm text-amber-900 dark:text-amber-200 font-medium">
//                   ⚠️ This action cannot be undone
//                 </p>
//                 <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
//                   The product will be permanently removed from your catalog and all associated data will be deleted.
//                 </p>
//               </div>
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter className="mt-4">
//             <AlertDialogCancel className="sm:mr-2">Cancel</AlertDialogCancel>
//             <AlertDialogAction
//               onClick={handleDeleteProduct}
//               className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
//             >
//               <Trash2 className="h-4 w-4 mr-2" />
//               Delete Product
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
import { Separator } from "@/components/ui/separator";
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
  Star,
  Edit,
  Trash2,
  ImageOff,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import adminApiService from "@/contexts/adminApiService";

// UI product: every numeric/list field is normalized so it is always safe to render
interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPercentage: number;
  discountPrice?: number;
  categoryLevel1: string;
  categoryLevel2?: string;
  categoryLevel3?: string;
  unit: string;
  stock: number;
  images: string[];
  tags: string[];
  brand?: string;
  isActive: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  sizes: string[];
  colors: string[];
  sku?: string;
  weight?: number;
  dimensions?: string;
  rating: number;
  reviewsCount: number;
  createdAt: string;
  updatedAt: string;
}

const API_BASE_URL = "https://georgina-server-code.onrender.com";

// Convert API values (often decimal strings like "79.99") to numbers
const toNumber = (value: unknown): number => {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
};

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const n = toNumber(value);
  return n > 0 ? n : undefined;
};

const toStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter((item) => item.trim() !== "");
  }
  if (value === undefined || value === null || value === "") return [];
  return [String(value)];
};

// `size` can be a string, an array, a JSON string, or { sizes: [...], colors: [...] }
const normalizeVariants = (raw: unknown): { sizes: string[]; colors: string[] } => {
  let value: unknown = raw;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        value = JSON.parse(trimmed);
      } catch {
        // plain string
      }
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as { sizes?: unknown; colors?: unknown };
    return { sizes: toStringList(obj.sizes), colors: toStringList(obj.colors) };
  }

  return { sizes: toStringList(value), colors: [] };
};

// `images` can be null, an array of strings, an array of objects, or a JSON string
const normalizeImages = (raw: unknown): string[] => {
  let value: unknown = raw;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        value = JSON.parse(trimmed);
      } catch {
        value = [trimmed];
      }
    } else {
      value = [trimmed];
    }
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const obj = item as { url?: string; src?: string };
        return obj.url || obj.src || "";
      }
      return "";
    })
    .filter((item) => item.trim() !== "");
};

const getImageUrl = (imagePath: string) => {
  if (/^(https?:|data:|blob:)/.test(imagePath)) return imagePath;
  return `${API_BASE_URL}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
};

const normalizeProduct = (raw: any): Product => {
  const price = toNumber(raw.price);
  // API sends `discount` as a percentage (e.g. "21.43")
  const discountPercentage = toNumber(raw.discountPercentage ?? raw.discount);
  const apiDiscountPrice = toOptionalNumber(raw.discountPrice);
  const discountPrice =
    apiDiscountPrice ??
    (discountPercentage > 0 ? Number((price * (1 - discountPercentage / 100)).toFixed(2)) : undefined);
  const { sizes, colors } = normalizeVariants(raw.size);

  return {
    id: String(raw.id),
    name: raw.name || "Untitled product",
    slug: raw.slug || "",
    description: raw.description || "",
    price,
    discountPercentage,
    discountPrice,
    categoryLevel1: raw.categoryLevel1 || "",
    categoryLevel2: raw.categoryLevel2 || undefined,
    categoryLevel3: raw.categoryLevel3 || undefined,
    unit: raw.unit || "piece",
    stock: toNumber(raw.stock),
    images: normalizeImages(raw.images),
    tags: toStringList(raw.tags),
    brand: raw.brand || undefined,
    isActive: Boolean(raw.isActive),
    isFeatured: Boolean(raw.isFeatured),
    isTrending: Boolean(raw.isTrending),
    isNewArrival: Boolean(raw.isNewArrival),
    sizes,
    colors,
    sku: raw.sku || undefined,
    weight: toOptionalNumber(raw.weight),
    dimensions: raw.dimensions || undefined,
    rating: toNumber(raw.rating ?? raw.averageRating),
    reviewsCount: toNumber(raw.reviewsCount ?? raw.totalReviews),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Small label/value row used in the side cards
const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 text-sm">
    <span className="text-muted-foreground shrink-0">{label}</span>
    <span className="text-right font-medium break-words min-w-0">{children}</span>
  </div>
);

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // Remember which image URLs failed so we never retry them (prevents error loops)
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const markImageFailed = (url: string) => {
    setFailedImages((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  };

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setIsLoading(true);
      setCurrentImageIndex(0);
      setFailedImages({});
      const response = await adminApiService.getProducts();

      let productsData: any[] = [];
      if (Array.isArray(response)) {
        productsData = response;
      } else if (response && Array.isArray(response.products)) {
        productsData = response.products;
      } else if (response && response.data) {
        productsData = Array.isArray(response.data) ? response.data : response.data.products || [];
      }

      const foundProduct = productsData.find((p: any) => String(p.id) === id);

      if (!foundProduct) {
        toast({
          variant: "destructive",
          title: "Product not found",
          description: "The requested product could not be found.",
        });
        navigate("/admin/products");
        return;
      }

      setProduct(normalizeProduct(foundProduct));
    } catch (err: any) {
      console.error("Failed to fetch product:", err);
      toast({
        variant: "destructive",
        title: "Error loading product",
        description: err.message || "Could not load product details.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!product) return;

    try {
      await adminApiService.deleteProduct(product.id);

      toast({
        title: "Product deleted",
        description: `${product.name} has been deleted successfully.`,
      });

      navigate("/admin/products");
    } catch (err: any) {
      console.error("Failed to delete product:", err);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err.message || "Could not delete the product.",
      });
    }
  };

  const getStockBadge = (stock: number) => {
    if (stock <= 0) {
      return <Badge className="bg-red-100 text-red-800 border-red-200">Out of stock</Badge>;
    }
    if (stock <= 10) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Low stock</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 border-green-200">In stock</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-muted rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-7 w-64 bg-muted rounded animate-pulse" />
            <div className="h-4 w-40 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-6 space-y-4">
              <div className="aspect-video bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-3">
                  <div className="h-5 w-28 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/admin/products")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Product Details</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Product not found</p>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={() => navigate("/admin/products")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Products
              </Button>
              <Button onClick={fetchProductDetails}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentImage = product.images[currentImageIndex];
  const currentImageUrl = currentImage ? getImageUrl(currentImage) : "";
  const showMainImage = Boolean(currentImageUrl) && !failedImages[currentImageUrl];
  const hasDiscount = product.discountPrice !== undefined && product.discountPrice < product.price;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/admin/products")}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to products</span>
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
              {product.isActive ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
              ) : (
                <Badge variant="outline" className="text-gray-600 border-gray-300">Inactive</Badge>
              )}
              {product.isFeatured && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">Featured</Badge>
              )}
              {product.isTrending && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-200">Trending</Badge>
              )}
              {product.isNewArrival && (
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">New</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              ID: {product.id}
              {product.sku ? ` · SKU: ${product.sku}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => navigate(`/admin/products/${product.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
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
        {/* Left column: images + description */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Images</CardTitle>
              <CardDescription>
                {product.images.length > 0
                  ? `${product.images.length} ${product.images.length === 1 ? "image" : "images"}`
                  : "No images uploaded for this product"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video w-full overflow-hidden rounded-md border bg-muted flex items-center justify-center">
                {showMainImage ? (
                  <img
                    key={currentImageUrl}
                    src={currentImageUrl}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-contain"
                    onError={() => markImageFailed(currentImageUrl)}
                  />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <ImageOff className="h-10 w-10 mb-2" />
                    <p className="text-sm">
                      {product.images.length > 0 ? "Image could not be loaded" : "No image available"}
                    </p>
                  </div>
                )}
              </div>

              {product.images.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {product.images.map((img, index) => {
                    const url = getImageUrl(img);
                    const failed = failedImages[url];
                    return (
                      <button
                        key={`${url}-${index}`}
                        type="button"
                        onClick={() => setCurrentImageIndex(index)}
                        className={`aspect-square overflow-hidden rounded-md border bg-muted flex items-center justify-center ${
                          currentImageIndex === index ? "ring-2 ring-primary" : "hover:border-foreground/40"
                        }`}
                      >
                        {failed ? (
                          <ImageOff className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <img
                            src={url}
                            alt={`${product.name} ${index + 1}`}
                            loading="lazy"
                            className="h-full w-full object-cover"
                            onError={() => markImageFailed(url)}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.description || "No description available"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right column: details */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Pricing & Stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-3xl font-bold">
                  ${(hasDiscount ? (product.discountPrice as number) : product.price).toFixed(2)}
                </p>
                {hasDiscount && (
                  <p className="text-sm text-muted-foreground">
                    <span className="line-through">${product.price.toFixed(2)}</span>
                    <span className="ml-2">{product.discountPercentage}% off</span>
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">per {product.unit}</p>
              </div>
              <Separator />
              <InfoRow label="Stock">
                {product.stock} {product.unit}
                {product.stock === 1 ? "" : "s"}
              </InfoRow>
              <InfoRow label="Status">{getStockBadge(product.stock)}</InfoRow>
              <InfoRow label="Rating">
                {product.rating > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    {product.rating.toFixed(1)}
                    <Star className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground font-normal">
                      ({product.reviewsCount} review{product.reviewsCount === 1 ? "" : "s"})
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground font-normal">No ratings yet</span>
                )}
              </InfoRow>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Category">
                <span className="capitalize">{product.categoryLevel1 || "N/A"}</span>
              </InfoRow>
              {product.categoryLevel2 && (
                <InfoRow label="Sub-category">
                  <span className="capitalize">{product.categoryLevel2}</span>
                </InfoRow>
              )}
              {product.categoryLevel3 && (
                <InfoRow label="Type">
                  <span className="capitalize">{product.categoryLevel3}</span>
                </InfoRow>
              )}
              {product.brand && <InfoRow label="Brand">{product.brand}</InfoRow>}
              {product.weight !== undefined && <InfoRow label="Weight">{product.weight} kg</InfoRow>}
              {product.dimensions && <InfoRow label="Dimensions">{product.dimensions}</InfoRow>}
              <InfoRow label="Slug">
                <span className="font-mono text-xs">{product.slug || "N/A"}</span>
              </InfoRow>
            </CardContent>
          </Card>

          {(product.sizes.length > 0 || product.colors.length > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Variants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.sizes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Sizes</p>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((size, index) => (
                        <Badge key={`${size}-${index}`} variant="outline">
                          {size}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {product.colors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Colors</p>
                    <div className="flex flex-wrap gap-2">
                      {product.colors.map((color, index) => (
                        <Badge key={`${color}-${index}`} variant="outline">
                          {color}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {product.tags.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, index) => (
                    <Badge key={`${tag}-${index}`} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Created">{formatDateTime(product.createdAt)}</InfoRow>
              <InfoRow label="Last updated">{formatDateTime(product.updatedAt)}</InfoRow>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">"{product.name}"</span> will be permanently removed from
              your catalog. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
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