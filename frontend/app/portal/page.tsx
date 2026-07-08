"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../context/auth-context";
import { useTheme } from "../components/theme-provider";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, 
  Button, Input, Select, Modal, Alert, Badge 
} from "../components/ui";
import { 
  ShoppingBasket, RefreshCw, ShoppingCart, Download, Ticket, 
  Clock, Mail, MessageSquare, ArrowLeft, Sun, Moon, LogOut 
} from "lucide-react";
import Link from "next/link";

export default function CustomerPortal() {
  const { apiCall, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Tabs: 'shop' | 'orders' | 'support'
  const [activeTab, setActiveTab] = useState<"shop" | "orders" | "support">("shop");
  const [loading, setLoading] = useState(true);

  // States
  const [products, setProducts] = useState<any[]>([]);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  
  // Support state
  const [supportSub, setSupportSub] = useState("");
  const [supportMsg, setSupportMsg] = useState("");
  const [supportSuccess, setSupportSuccess] = useState(false);

  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isStaff = user && ["SUPER_ADMIN", "BUSINESS_OWNER", "MANAGER", "EMPLOYEE"].includes(user.role);

  useEffect(() => {
    loadPortalData();
  }, [user]);

  const loadPortalData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Get products list
      const prods = await apiCall("/inventory/products");
      setProducts(prods);

      // 2. Fetch customer list to find matches based on email
      const customers = await apiCall("/customers/");
      const matchingCust = customers.find((c: any) => c.email === user.email);
      
      if (matchingCust) {
        // Fetch detailed profile
        const details = await apiCall(`/customers/${matchingCust.id}`);
        setCustomerProfile(details);
      }

      // 3. Load customer orders
      const orderList = await apiCall("/orders/");
      setOrders(orderList);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const addToCart = (product: any) => {
    setErrorMsg("");
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      if (product.stock_quantity <= existing.quantity) {
        setErrorMsg("Insufficient stock limit available");
        return;
      }
      setCart(cart.map(item => 
        item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      if (product.stock_quantity < 1) {
        setErrorMsg("Out of stock");
        return;
      }
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        maxStock: product.stock_quantity,
        branch_id: product.branch_id
      }]);
    }
  };

  const updateQuantity = (pId: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.product_id === pId) {
        const nextQty = item.quantity + delta;
        if (nextQty < 1) return item;
        if (nextQty > item.maxStock) return item;
        return { ...item, quantity: nextQty };
      }
      return item;
    }));
  };

  const removeFromCart = (pId: number) => {
    setCart(cart.filter(item => item.product_id !== pId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckoutSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      if (!customerProfile) {
        throw new Error("Customer profile not fully synced in CRM. Please contact admin.");
      }
      
      // Since an order belongs to a specific branch, and we can add items from multiple branches in the catalog, 
      // for simplicity we will group items by branch and create an order for each branch, OR checkout the first branch order.
      // In our catalog, let's take the branch of the first item
      const firstBranchId = cart[0].branch_id || 1;
      
      const payload = {
        branch_id: firstBranchId,
        customer_id: customerProfile.customer.id,
        items: cart.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
        payment_method: "RAZORPAY", // simulated card check
        payment_status: "PAID" // mock success on payment processing
      };

      await apiCall("/orders/", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setSuccessMsg("Payment processed successfully! Order placed.");
      setCart([]);
      loadPortalData();
      
      setTimeout(() => {
        setActiveTab("orders");
        setSuccessMsg("");
      }, 1500);
    } catch (e: any) {
      setErrorMsg(e.message || "Checkout failed");
    }
    setCheckoutSubmitting(false);
  };

  const handleDownloadPDF = async (invId: number, invNum: string) => {
    try {
      // Fetch list of invoices
      const invoices = await apiCall("/billing/invoices");
      const matched = invoices.find((inv: any) => inv.invoice_number === invNum);
      if (!matched) {
        throw new Error("Invoice record not generated yet");
      }
      
      const blob = await apiCall(`/billing/invoices/${matched.id}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${invNum}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || "Failed to download PDF invoice");
    }
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSub || !supportMsg) return;
    setSupportSuccess(true);
    setSupportSub("");
    setSupportMsg("");
    setTimeout(() => {
      setSupportSuccess(false);
    }, 3000);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (loading && !customerProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <nav className="h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          {isStaff && (
            <Link href="/dashboard" className="p-2 border border-border rounded-lg hover:bg-secondary transition mr-2" title="Return to Admin Panel">
              <ArrowLeft className="w-4 h-4 text-primary" />
            </Link>
          )}
          <div className="p-1.5 bg-primary rounded-lg text-primary-foreground">
            <ShoppingBasket className="w-5 h-5" />
          </div>
          <h1 className="font-bold text-sm leading-tight hidden sm:block">Customer Portal</h1>
        </div>

        {/* Loyalty points banner */}
        {customerProfile && (
          <div className="flex items-center space-x-1.5 text-xs text-primary font-bold bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
            <Ticket className="w-4 h-4 text-primary mr-0.5" />
            <span>Loyalty Reward Points: {customerProfile.customer.loyalty_points} pts</span>
          </div>
        )}

        <div className="flex items-center space-x-3">
          <button onClick={toggleTheme} className="p-2 rounded-lg text-muted-foreground hover:bg-secondary transition border border-border">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          
          <button onClick={logout} className="p-2 rounded-lg text-destructive hover:bg-destructive/10 border border-transparent transition" title="Log out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Main layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 pb-4 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Welcome back, {user?.name}!</h2>
            <p className="text-xs text-muted-foreground">Browse our product inventory, place orders, and download invoices</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant={activeTab === "shop" ? "primary" : "outline"} size="sm" onClick={() => setActiveTab("shop")}>
              Shop Items
            </Button>
            <Button variant={activeTab === "orders" ? "primary" : "outline"} size="sm" onClick={() => setActiveTab("orders")}>
              My Orders ({orders.length})
            </Button>
            <Button variant={activeTab === "support" ? "primary" : "outline"} size="sm" onClick={() => setActiveTab("support")}>
              Contact Support
            </Button>
          </div>
        </div>

        {/* Tab content routing */}
        {activeTab === "shop" ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Products grid */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-sm text-foreground">Available Catalog</h3>
              <div className="grid gap-4 sm:grid-cols-2 max-h-[60vh] overflow-y-auto pr-1">
                {products.map((p) => (
                  <Card key={p.id} className="hover:border-primary/20 transition flex flex-col justify-between">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-semibold truncate mr-2">{p.name}</CardTitle>
                        <Badge variant="primary">{p.category_name}</Badge>
                      </div>
                      <CardDescription className="text-[10px] font-mono mt-0.5">{p.sku}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                      <div className="flex justify-between items-center border-t border-border pt-3">
                        <span className="font-bold text-base text-foreground">${p.price.toFixed(2)}</span>
                        {p.stock_quantity > 0 ? (
                          <Button size="sm" onClick={() => addToCart(p)} className="text-[11px] h-8 py-1.5 px-3">
                            Add to Cart
                          </Button>
                        ) : (
                          <span className="text-xs text-red-500 font-semibold">Out of Stock</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Cart Panel */}
            <div className="space-y-4">
              <Card className="border-primary/20">
                <CardHeader className="bg-secondary/10 pb-4">
                  <CardTitle className="text-sm font-bold flex items-center space-x-2">
                    <ShoppingCart className="w-4.5 h-4.5 text-primary" />
                    <span>My Cart Checkout</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {successMsg && <Alert variant="success">{successMsg}</Alert>}
                  {errorMsg && <Alert variant="error">{errorMsg}</Alert>}

                  <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1 border-b border-border pb-3">
                    {cart.length > 0 ? (
                      cart.map((item) => (
                        <div key={item.product_id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition">
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="font-semibold text-foreground truncate">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">${item.price.toFixed(2)}</p>
                          </div>
                          
                          <div className="flex items-center space-x-2 shrink-0">
                            <button onClick={() => updateQuantity(item.product_id, -1)} className="w-5 h-5 rounded border border-border flex items-center justify-center font-bold hover:bg-secondary">-</button>
                            <span className="font-semibold w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product_id, 1)} className="w-5 h-5 rounded border border-border flex items-center justify-center font-bold hover:bg-secondary">+</button>
                            <button onClick={() => removeFromCart(item.product_id)} className="p-1 text-destructive hover:bg-destructive/10 rounded ml-2">
                              ×
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 text-xs text-muted-foreground">Cart is empty. Add products to begin.</div>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Total Price</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button onClick={handleCheckout} className="w-full mt-4" disabled={checkoutSubmitting || cart.length === 0}>
                    {checkoutSubmitting ? "Processing Payment..." : `Proceed Payment - $${cartTotal.toFixed(2)}`}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : activeTab === "orders" ? (
          <Card>
            <CardContent className="p-0">
              {orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-secondary/20 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                        <th className="p-4 font-medium">Order ID</th>
                        <th className="p-4 font-medium">Date</th>
                        <th className="p-4 font-medium">Amount</th>
                        <th className="p-4 font-medium text-center">Logistics Status</th>
                        <th className="p-4 font-medium text-center">Payment</th>
                        <th className="p-4 font-medium text-right">Invoices</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {orders.map((o) => (
                        <tr key={o.id} className="hover:bg-secondary/10 transition">
                          <td className="p-4 font-semibold text-foreground">#{o.id}</td>
                          <td className="p-4 text-xs text-muted-foreground">{new Date(o.date).toLocaleDateString()}</td>
                          <td className="p-4 font-bold text-foreground">${o.total_amount.toFixed(2)}</td>
                          <td className="p-4 text-center">
                            <Badge variant={o.status === "DELIVERED" ? "success" : "primary"}>
                              {o.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-center">
                            <Badge variant={o.payment_status === "PAID" ? "success" : "warning"}>
                              {o.payment_status}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            {o.invoice_number ? (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDownloadPDF(o.id, o.invoice_number)}
                                className="text-xs text-primary"
                              >
                                <Download className="w-3.5 h-3.5 mr-1" />
                                PDF Invoice
                              </Button>
                            ) : (
                              <span className="text-zinc-500 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground text-sm">No orders logged yet.</div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* SUPPORT TAB */
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Help & Support Desk</CardTitle>
                <CardDescription>Submit complaints or service requests directly to the branch manager</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSupportSubmit} className="space-y-4">
                  {supportSuccess && <Alert variant="success">Support ticket logged! A representative will reach out shortly.</Alert>}
                  
                  <Input 
                    label="Subject Title" 
                    placeholder="e.g. Return request for invoice INV-1002" 
                    value={supportSub}
                    onChange={(e) => setSupportSub(e.target.value)}
                    required 
                  />
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description Message</label>
                    <textarea
                      className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-32 resize-none"
                      placeholder="Type details of your inquiry..."
                      value={supportMsg}
                      onChange={(e) => setSupportMsg(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit">Submit Support Ticket</Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-secondary/10 border-dashed justify-center flex flex-col">
              <CardContent className="p-6 space-y-4 text-xs text-muted-foreground">
                <h3 className="font-bold text-foreground text-sm">Need immediate help?</h3>
                <p className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-primary shrink-0" />
                  <span>Email: support@businessos.ai</span>
                </p>
                <p className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-primary shrink-0" />
                  <span>Support hours: Mon-Fri, 9am - 6pm IST</span>
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
