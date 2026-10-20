import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Mail,
  Trash2,
  RefreshCw,
  User,
  Phone,
  Calendar,
  AlertCircle,
  Plus,
  Shield,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import adminApiService from "@/contexts/adminApiService";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

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

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  // New user form state
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    contact: "",
    role: "user" as "user" | "admin"
  });

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("Fetching customers...");
      
      const res = await adminApiService.getUsers();
      console.log("API Response:", res);
      
      // Debug: Check the response structure
      if (res && res.data) {
        console.log("Response data:", res.data);
        setCustomers(res.data);
      } else if (Array.isArray(res)) {
        // If the response is directly the array
        console.log("Response is array:", res);
        setCustomers(res);
      } else {
        console.warn("Unexpected response structure:", res);
        setCustomers([]);
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      setError("Failed to load customers. Please try again.");
      toast({
        variant: "destructive",
        title: "Error loading customers",
        description: "Could not fetch customer data.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Debug: Log when customers change
  useEffect(() => {
    console.log("Customers state updated:", customers);
  }, [customers]);

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.contact && customer.contact.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Stats calculations
  const totalCustomers = customers.length;
  const adminCustomers = customers.filter(customer => customer.role === 'admin').length;
  const userCustomers = customers.filter(customer => customer.role === 'user').length;

  const handleViewCustomer = async (customer: Customer) => {
    try {
      console.log("Viewing customer:", customer);
      const res = await adminApiService.getUserById(customer.id.toString());
      console.log("Customer details response:", res);
      setSelectedCustomer(res?.data || res);
      setDialogOpen(true);
    } catch (err) {
      console.error("Failed to load customer:", err);
      toast({
        variant: "destructive",
        title: "Error loading customer",
        description: "Could not fetch customer information.",
      });
    }
  };

  const handleDeleteCustomer = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      await adminApiService.deleteUser(id.toString());

      setCustomers((prev) => prev.filter((c) => c.id !== id));

      if (selectedCustomer?.id === id) {
        setSelectedCustomer(null);
        setDialogOpen(false);
      }

      toast({
        title: "Customer deleted",
        description: "The customer has been removed successfully",
      });
    } catch (err) {
      console.error("Failed to delete customer:", err);
      toast({
        variant: "destructive",
        title: "Error deleting customer",
        description: "Could not delete the customer. Please try again.",
      });
    }
  };

  const handleDeleteCustomerFromDialog = (id: number) => {
    handleDeleteCustomer(id);
  };

  const handleCreateUser = async () => {
    try {
      // Basic validation
      if (!newUser.name || !newUser.email || !newUser.password) {
        toast({
          variant: "destructive",
          title: "Missing fields",
          description: "Please fill in all required fields.",
        });
        return;
      }

      console.log("Creating user:", newUser);
      // Call API to create user
      const response = await adminApiService.createUser({
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        contact: newUser.contact || null,
        role: newUser.role
      });

      console.log("Create user response:", response);

      // Refresh the customers list
      await fetchCustomers();

      // Reset form and close dialog
      setNewUser({
        name: "",
        email: "",
        password: "",
        contact: "",
        role: "user"
      });
      setCreateDialogOpen(false);

      toast({
        title: "User created",
        description: "The user has been created successfully",
      });
    } catch (err) {
      console.error("Failed to create user:", err);
      toast({
        variant: "destructive",
        title: "Error creating user",
        description: "Could not create the user. Please try again.",
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInHours = diffInMs / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        const hours = Math.floor(diffInHours);
        if (hours === 0) {
          const minutes = Math.floor(diffInMs / (1000 * 60));
          return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        }
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
      }
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return "Invalid date";
    }
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      user: "secondary",
      admin: "destructive"
    } as const;

    return (
      <Badge variant={variants[role as keyof typeof variants]}>
        {role.toUpperCase()}
      </Badge>
    );
  };

  const SkeletonRow = () => (
    <tr className="border-b">
      <td className="p-4">
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-32" />
          <div className="h-3 bg-muted rounded animate-pulse w-48" />
        </div>
      </td>
      <td className="p-4">
        <div className="h-4 bg-muted rounded animate-pulse w-40" />
      </td>
      <td className="p-4">
        <div className="h-4 bg-muted rounded animate-pulse w-32" />
      </td>
      <td className="p-4">
        <div className="h-6 bg-muted rounded animate-pulse w-20" />
      </td>
      <td className="p-4">
        <div className="h-4 bg-muted rounded animate-pulse w-24" />
      </td>
      <td className="p-4">
        <div className="flex justify-end gap-2">
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
        </div>
      </td>
    </tr>
  );



  if (error && customers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <Button onClick={fetchCustomers} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Failed to load customers</p>
            <p className="text-muted-foreground text-center mb-4">{error}</p>
            <Button onClick={fetchCustomers}>
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
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <div className="flex gap-2">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
          <Button onClick={fetchCustomers} variant="outline" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <div className="h-8 bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 bg-muted rounded animate-pulse" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{totalCustomers}</div>
                <p className="text-xs text-muted-foreground">All registered users</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <div className="h-8 bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 bg-muted rounded animate-pulse" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{adminCustomers}</div>
                <p className="text-xs text-muted-foreground">Administrator accounts</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <div className="h-8 bg-muted rounded animate-pulse mb-2" />
                <div className="h-4 bg-muted rounded animate-pulse" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{userCustomers}</div>
                <p className="text-xs text-muted-foreground">Regular user accounts</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">All Users</CardTitle>
          <CardDescription>View and manage user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, role, or phone..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left text-sm font-medium">User</th>
                  <th className="p-4 text-left text-sm font-medium">Contact</th>
                  <th className="p-4 text-left text-sm font-medium">Phone</th>
                  <th className="p-4 text-left text-sm font-medium">Role</th>
                  <th className="p-4 text-left text-sm font-medium">Registered</th>
                  <th className="p-4 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <SkeletonRow key={index} />
                  ))
                ) : paginatedCustomers.length > 0 ? (
                  paginatedCustomers.map((customer) => (
                    <tr 
                      key={customer.id}
                      className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
                      
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div className="max-w-[150px]">
                            <div className="font-medium truncate" title={customer.name}>{customer.name}</div>
                            <div className="text-sm text-muted-foreground truncate" >ID: {customer.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {customer.email}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {customer.contact || "Not provided"}
                        </div>
                      </td>
                      <td className="p-4">
                        {getRoleBadge(customer.role)}
                      </td>
                      <td className="p-4">{formatDate(customer.createdAt)}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => handleDeleteCustomer(customer.id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-sm text-muted-foreground">
                      {customers.length === 0 ? "No users found in system" : "No users match your search"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {paginatedCustomers.length > 0 && (
            <div className="flex justify-between items-center py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredCustomers.length)} of {filteredCustomers.length} customers
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

      {/* View Customer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View the complete details of the user below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 my-4">
            {selectedCustomer ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{selectedCustomer.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      {getRoleBadge(selectedCustomer.role)}
                      <span className="text-sm text-muted-foreground">ID: {selectedCustomer.id}</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </h3>
                    <p>{selectedCustomer.email}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone
                    </h3>
                    <p>{selectedCustomer.contact || "Not provided"}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Registered
                    </h3>
                    <p>{formatDate(selectedCustomer.createdAt)}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Last Updated
                    </h3>
                    <p>{formatDate(selectedCustomer.updatedAt)}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No user selected.</p>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="destructive" 
              onClick={() => selectedCustomer && handleDeleteCustomerFromDialog(selectedCustomer.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system. All fields are required except phone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Full Name *</label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email *</label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password *</label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="contact" className="text-sm font-medium">Phone</label>
              <Input
                id="contact"
                placeholder="Enter phone number (optional)"
                value={newUser.contact}
                onChange={(e) => setNewUser({...newUser, contact: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">Role *</label>
              <select
                id="role"
                className="w-full p-2 border rounded-md"
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value as "user" | "admin"})}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser}>
              <Plus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}