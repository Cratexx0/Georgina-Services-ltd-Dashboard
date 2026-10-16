import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, X, ImageOff, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import adminApiService from "@/contexts/adminApiService";

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
  tags: string;
  isActive: boolean;
  weight: string;
  discountPercentage: string;
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  featuredOrder: number;
  trendingOrder: number;
  newArrivalOrder: number;
}


const MAX_IMAGE_SIZE_MB = 5;

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
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  return `${baseUrl}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
};

const splitList = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");

// Keeps 0 as "0" (the old code turned 0 into an empty string) and null into ""
const toFieldString = (value: unknown): string =>
  value === undefined || value === null ? "" : String(value);

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // The server stores images on Cloudinary and accepts ONE new image per save (field "image")
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  // Snapshot of the values loaded from the server, used to send only what changed
  const [initialData, setInitialData] = useState<ProductFormData | null>(null);
  // Sizes/colors are shown read-only (see the note in the Variants section)
  const [variants, setVariants] = useState<{ sizes: string[]; colors: string[] }>({ sizes: [], colors: [] });

  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    price: "",
    categoryLevel1: "",
    categoryLevel2: "",
    categoryLevel3: "",
    unit: "",
    stock: "",
    brand: "",
    tags: "",
    isActive: true,
    weight: "",
    discountPercentage: "",
    isFeatured: false,
    isTrending: false,
    isNewArrival: false,
    featuredOrder: 0,
    trendingOrder: 0,
    newArrivalOrder: 0,
  });

  // Preview of the newly selected file, built once per selection
  const newImagePreview = useMemo(() => (newImage ? URL.createObjectURL(newImage) : null), [newImage]);

  // Release the blob URL when the selection changes or the page unmounts
  useEffect(() => {
    return () => {
      if (newImagePreview) URL.revokeObjectURL(newImagePreview);
    };
  }, [newImagePreview]);

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const markImageFailed = (url: string) => {
    setFailedImages((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  };

  const fetchProductDetails = async () => {
    try {
      setIsLoading(true);
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

      const product = productsData.find((p: any) => String(p.id) === id);

      if (!product) {
        toast({
          variant: "destructive",
          title: "Product not found",
          description: "The requested product could not be found.",
        });
        navigate("/admin/products");
        return;
      }

      const { sizes, colors } = normalizeVariants(product.size);
      // API stores the discount as a percentage in `discount`
      const discountValue = Number(product.discountPercentage ?? product.discount ?? 0);

      const loaded: ProductFormData = {
        name: product.name || "",
        description: product.description || "",
        price: toFieldString(product.price),
        categoryLevel1: product.categoryLevel1 || "",
        categoryLevel2: product.categoryLevel2 || "",
        categoryLevel3: product.categoryLevel3 || "",
        unit: product.unit || "",
        stock: toFieldString(product.stock),
        brand: product.brand || "",
        tags: toStringList(product.tags).join(", "),
        isActive: product.isActive ?? true,
        weight: toFieldString(product.weight),
        discountPercentage: Number.isFinite(discountValue) && discountValue > 0 ? String(discountValue) : "",
        isFeatured: Boolean(product.isFeatured),
        isTrending: Boolean(product.isTrending),
        isNewArrival: Boolean(product.isNewArrival),
        featuredOrder: Number(product.featuredOrder) || 0,
        trendingOrder: Number(product.trendingOrder) || 0,
        newArrivalOrder: Number(product.newArrivalOrder) || 0,
      };
      setFormData(loaded);
      setInitialData(loaded);
      setVariants({ sizes, colors });

      setExistingImages(normalizeImages(product.images));
      setNewImage(null);
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

  const handleInputChange = (field: keyof ProductFormData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please choose an image file.",
      });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: `Maximum image size is ${MAX_IMAGE_SIZE_MB}MB.`,
      });
      return;
    }

    setNewImage(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || formData.price === "" || !formData.categoryLevel1.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields (Name, Price, Category).",
      });
      return;
    }

    const discount = formData.discountPercentage === "" ? 0 : Number(formData.discountPercentage);
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      toast({
        variant: "destructive",
        title: "Invalid discount",
        description: "Discount must be a percentage between 0 and 100.",
      });
      return;
    }

    try {
      setIsSaving(true);

      // The server copies req.body straight into the database update, so only send
      // real columns, and only the ones that actually changed.
      const formDataToSend = new FormData();
      let changedCount = 0;
      const add = (key: string, value: string) => {
        formDataToSend.append(key, value);
        changedCount++;
      };
      const changed = (key: keyof ProductFormData) =>
        !initialData || String(formData[key]) !== String(initialData[key]);

      if (changed("name")) add("name", formData.name.trim());
      if (changed("description")) add("description", formData.description);
      if (changed("price")) add("price", formData.price);
      if (changed("categoryLevel1")) add("categoryLevel1", formData.categoryLevel1.trim());
      if (changed("categoryLevel2")) add("categoryLevel2", formData.categoryLevel2);
      if (changed("categoryLevel3")) add("categoryLevel3", formData.categoryLevel3);
      if (changed("unit") && formData.unit) add("unit", formData.unit);
      if (changed("stock")) add("stock", formData.stock);
      if (changed("brand")) add("brand", formData.brand);
      if (changed("weight") && formData.weight) add("weight", formData.weight);
      if (changed("discountPercentage")) add("discount", String(discount));

      if (changed("isActive")) add("isActive", String(formData.isActive));
      if (changed("isFeatured")) add("isFeatured", String(formData.isFeatured));
      if (changed("isTrending")) add("isTrending", String(formData.isTrending));
      if (changed("isNewArrival")) add("isNewArrival", String(formData.isNewArrival));
      if (changed("featuredOrder")) add("featuredOrder", String(formData.featuredOrder));
      if (changed("trendingOrder")) add("trendingOrder", String(formData.trendingOrder));
      if (changed("newArrivalOrder")) add("newArrivalOrder", String(formData.newArrivalOrder));

      if (changed("tags")) add("tags", JSON.stringify(splitList(formData.tags)));

      const hasFieldChanges = changedCount > 0;

      if (!hasFieldChanges && !newImage) {
        toast({
          title: "No changes",
          description: "Nothing was changed, so there is nothing to save.",
        });
        return;
      }

      // 1) Save the text fields on their own, so a problem with the image upload
      //    can never block (or roll back) the rest of the edit.
      if (hasFieldChanges) {
        await adminApiService.updateProduct(id!, formDataToSend);
      }

      // 2) Upload the image in a separate request.
      //    The route uses upload.single('image'), so the field name must be "image".
      if (newImage) {
        const imageForm = new FormData();
        imageForm.append("image", newImage);

        try {
          await adminApiService.updateProduct(id!, imageForm);
        } catch (imageErr: any) {
          console.error("Image upload failed:", imageErr);

          if (hasFieldChanges) {
            // The fields are already saved; remember that so a retry only resends the image
            setInitialData(formData);
          }

          toast({
            variant: "destructive",
            title: hasFieldChanges ? "Changes saved, but the image upload failed" : "Image upload failed",
            description:
              "The server rejected the image. Try a smaller JPG or PNG. " +
              (imageErr?.message ? `(${imageErr.message})` : ""),
          });
          return; // stay on the page so the image can be retried
        }
      }

      toast({
        title: "Product updated",
        description: "The product has been updated successfully.",
      });

      navigate(`/admin/products/${id}`);
    } catch (err: any) {
      console.error("Failed to update product:", err);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err.message || "Could not update the product.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const displayImageUrl = newImagePreview || (existingImages[0] ? getImageUrl(existingImages[0]) : "");

  const priceNumber = Number(formData.price);
  const discountNumber = Number(formData.discountPercentage);
  const salePrice =
    Number.isFinite(priceNumber) && priceNumber > 0 && Number.isFinite(discountNumber) && discountNumber > 0
      ? priceNumber * (1 - discountNumber / 100)
      : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-muted rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-7 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(`/admin/products/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to product</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
            <p className="text-sm text-muted-foreground mt-1">Update product information and settings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(`/admin/products/${id}`)}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" form="product-edit-form" disabled={isSaving}>
            {isSaving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <form id="product-edit-form" onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Enter product description"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => handleInputChange("brand", e.target.value)}
                    placeholder="Enter brand name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryLevel1">Main Category *</Label>
                  <Input
                    id="categoryLevel1"
                    value={formData.categoryLevel1}
                    onChange={(e) => handleInputChange("categoryLevel1", e.target.value)}
                    placeholder="e.g., women, men, kids"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryLevel2">Subcategory</Label>
                  <Input
                    id="categoryLevel2"
                    value={formData.categoryLevel2}
                    onChange={(e) => handleInputChange("categoryLevel2", e.target.value)}
                    placeholder="Enter subcategory"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryLevel3">Sub-subcategory</Label>
                  <Input
                    id="categoryLevel3"
                    value={formData.categoryLevel3}
                    onChange={(e) => handleInputChange("categoryLevel3", e.target.value)}
                    placeholder="Enter sub-subcategory"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => handleInputChange("unit", e.target.value)}
                    placeholder="e.g., piece, kg, liter"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) => handleInputChange("weight", e.target.value)}
                    placeholder="Enter weight"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags & Variants */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tags & Variants</CardTitle>
              <CardDescription>Separate multiple tags with commas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => handleInputChange("tags", e.target.value)}
                  placeholder="e.g., women, african-wear"
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Sizes & colors</p>
                  <p className="text-xs text-muted-foreground">
                    Read-only here. The server's update endpoint can't store colors, and saving sizes would
                    overwrite the current sizes and colors.
                  </p>
                </div>

                {variants.sizes.length === 0 && variants.colors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sizes or colors</p>
                ) : (
                  <>
                    {variants.sizes.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Sizes</p>
                        <div className="flex flex-wrap gap-2">
                          {variants.sizes.map((size, index) => (
                            <Badge key={`${size}-${index}`} variant="outline">
                              {size}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {variants.colors.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Colors</p>
                        <div className="flex flex-wrap gap-2">
                          {variants.colors.map((color, index) => (
                            <Badge key={`${color}-${index}`} variant="outline">
                              {color}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Image */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Image</CardTitle>
              <CardDescription>Uploading a new image replaces the current one</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="h-40 w-40 shrink-0 overflow-hidden rounded-md border bg-muted flex items-center justify-center">
                  {displayImageUrl && !failedImages[displayImageUrl] ? (
                    <img
                      key={displayImageUrl}
                      src={displayImageUrl}
                      alt="Product"
                      className="h-full w-full object-cover"
                      onError={() => markImageFailed(displayImageUrl)}
                    />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <ImageOff className="h-8 w-8 mb-1" />
                      <p className="text-xs">{displayImageUrl ? "Could not load" : "No image"}</p>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <Label htmlFor="image">{existingImages.length > 0 ? "Replace image" : "Upload image"}</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelected}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">One image, up to {MAX_IMAGE_SIZE_MB}MB.</p>
                  {newImage && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="truncate">{newImage.name}</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => setNewImage(null)}>
                        Undo
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {existingImages.length > 1 && newImage && (
                <p className="text-xs text-muted-foreground">
                  This product has {existingImages.length} images. All of them will be replaced by the new one.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="isActive" className="font-medium">
                    Active
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.isActive ? "Visible to customers" : "Hidden from customers"}
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange("isActive", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Stock */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Pricing & Stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="price">Regular Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => handleInputChange("price", e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountPercentage">Discount (%)</Label>
                <Input
                  id="discountPercentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.discountPercentage}
                  onChange={(e) => handleInputChange("discountPercentage", e.target.value)}
                  placeholder="0"
                />
                {salePrice !== null && (
                  <p className="text-xs text-muted-foreground">Sale price: ${salePrice.toFixed(2)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock Quantity *</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => handleInputChange("stock", e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Display Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Display Options</CardTitle>
              <CardDescription>Where this product appears in the store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="isFeatured" className="font-medium">
                    Featured
                  </Label>
                  <Switch
                    id="isFeatured"
                    checked={formData.isFeatured}
                    onCheckedChange={(checked) => handleInputChange("isFeatured", checked)}
                  />
                </div>
                {formData.isFeatured && (
                  <div className="space-y-2">
                    <Label htmlFor="featuredOrder" className="text-sm text-muted-foreground">
                      Display order
                    </Label>
                    <Input
                      id="featuredOrder"
                      type="number"
                      value={formData.featuredOrder}
                      onChange={(e) => handleInputChange("featuredOrder", Number(e.target.value))}
                    />
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="isTrending" className="font-medium">
                    Trending
                  </Label>
                  <Switch
                    id="isTrending"
                    checked={formData.isTrending}
                    onCheckedChange={(checked) => handleInputChange("isTrending", checked)}
                  />
                </div>
                {formData.isTrending && (
                  <div className="space-y-2">
                    <Label htmlFor="trendingOrder" className="text-sm text-muted-foreground">
                      Display order
                    </Label>
                    <Input
                      id="trendingOrder"
                      type="number"
                      value={formData.trendingOrder}
                      onChange={(e) => handleInputChange("trendingOrder", Number(e.target.value))}
                    />
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="isNewArrival" className="font-medium">
                    New arrival
                  </Label>
                  <Switch
                    id="isNewArrival"
                    checked={formData.isNewArrival}
                    onCheckedChange={(checked) => handleInputChange("isNewArrival", checked)}
                  />
                </div>
                {formData.isNewArrival && (
                  <div className="space-y-2">
                    <Label htmlFor="newArrivalOrder" className="text-sm text-muted-foreground">
                      Display order
                    </Label>
                    <Input
                      id="newArrivalOrder"
                      type="number"
                      value={formData.newArrivalOrder}
                      onChange={(e) => handleInputChange("newArrivalOrder", Number(e.target.value))}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}