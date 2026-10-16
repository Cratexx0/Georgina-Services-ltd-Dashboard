import { Search, MenuSquareIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { UserProfile } from "@/components/UserProfile";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function DashboardHeader() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate based on search query type
      if (searchQuery.toUpperCase().startsWith('ORD-')) {
        // Navigate to order details
        navigate(`/admin/orders/${searchQuery}`);
      } else if (searchQuery.toUpperCase().startsWith('BOOK-') || searchQuery.toLowerCase().includes('booking')) {
        // Navigate to bookings
        navigate('/bookings');
      } else if (searchQuery.toLowerCase().includes('customer') || searchQuery.toLowerCase().includes('user')) {
        // Navigate to customers
        navigate('/users');
      } else {
        // Default: navigate to products page
        navigate('/products');
      }
      // Clear search after navigation
      setSearchQuery("");
    }
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 md:px-6">
        {/* Mobile Menu Trigger - Only shows on small screens */}
        <SidebarTrigger className="md:hidden mr-2">
          <MenuSquareIcon className="h-5 w-5" />
        </SidebarTrigger>

        <div className="ml-auto flex items-center gap-2">
          <form className="hidden md:flex" onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search orders, products..."
                className="w-[200px] pl-8 md:w-[240px] lg:w-[320px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
          
          <ThemeToggle />
          <UserProfile />
        </div>
      </div>
    </header>
  );
}