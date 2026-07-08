"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/auth-context";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, 
  Button, Input, Select, Modal, Alert, Badge 
} from "../../components/ui";
import { 
  ShoppingBag, Plus, RefreshCw, Eye, Edit, Truck, 
  Trash2, ShoppingCart, Search, User, CreditCard, DollarSign 
} from "lucide-react";

export default function OrdersPage() {
  const { apiCall, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"history" | "new_order">("history");
  const [loading, setLoading] = useState(true);

  // Data lists
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Detailed view modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);

  // New Order Creation State
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(""); // empty for Walk-in Guest
  const [cart, setCart] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentStatus, setPaymentStatus] = useState("PENDING");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Product Selection helper inside POS
  const [prodSearch, setProdSearch] = useState("");

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [ordList, custList, brList, prodList] = await Promise.all([
        apiCall("/orders/"),
        apiCall("/customers/"),
        apiCall("/branches/"),
        apiCall("/inventory/products"),
      ]);
      setOrders(ordList);
      setCustomers(custList);
      setBranches(brList);
      setProducts(prodList);
      
      // Default selections
      if (brList.length > 0) {
        setSelectedBranch(user?.branch_id ? String(user.branch_id) : String(brList[0].id));
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const loadOrders = async () => {
    try {
      const ordList = await apiCall("/orders/");
      setOrders(ordList);
    } catch (e) {
      console.error(e);
    }
  };

  const handleViewDetails = async (orderId: number) => {
    setLoading(true);
    try {
      const data = await apiCall(`/orders/${orderId}`);
      setSelectedOrderDetails(data);
      setDetailsModalOpen(true);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (orderId: number, nextStatus: string) => {
    try {
      await apiCall(`/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus })
      });
      loadOrders();
      if (selectedOrderDetails && selectedOrderDetails.id === orderId) {
        setSelectedOrderDetails({ ...selectedOrderDetails, status: nextStatus });
      }
    } catch (e: any) {
      alert(e.message || "Failed to update order status");
    }
  };

  const handleUpdatePayment = async (orderId: number, nextPayment: string) => {
    try {
      await apiCall(`/orders/${orderId}/payment`, {
        method: "PUT",
        body: JSON.stringify({ payment_status: nextPayment })
      });
      loadOrders();
      if (selectedOrderDetails && selectedOrderDetails.id === orderId) {
        setSelectedOrderDetails({ ...selectedOrderDetails, payment_status: nextPayment });
      }
    } catch (e: any) {
      alert(e.message || "Failed to update payment status");
    }
  };

  // CART LOGIC
  const addToCart = (product: any) => {
    setErrorMsg("");
    // Check if product belongs to selected branch
    if (product.branch_id && String(product.branch_id) !== selectedBranch) {
      setErrorMsg("This product belongs to another branch catalog!");
      return;
    }
    
    // Check if product is already in cart
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      if (product.stock_quantity <= existing.quantity) {
        setErrorMsg("Cannot add more. Insufficient stock limit.");
        return;
      }
      setCart(cart.map(item => 
        item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      if (product.stock_quantity < 1) {
        setErrorMsg("Product is out of stock!");
        return;
      }
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        maxStock: product.stock_quantity
      }]);
    }
  };

  const removeFromCart = (pId: number) => {
    setCart(cart.filter(item => item.product_id !== pId));
  };

  const updateQuantity = (pId: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.product_id === pId) {
        const nextQty = item.quantity + delta;
        if (nextQty < 1) return item;
        if (nextQty > item.maxStock) {
          setErrorMsg("Insufficient stock available");
          return item;
        }
        return { ...item, quantity: nextQty };
      }
      return item;
    }));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorMsg("Your cart is empty");
      return;
    }
    if (!selectedBranch) {
      setErrorMsg("Please select a branch");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const payload = {
        branch_id: parseInt(selectedBranch),
        customer_id: selectedCustomer ? parseInt(selectedCustomer) : null,
        items: cart.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
        payment_method: paymentMethod,
        payment_status: paymentStatus
      };

      await apiCall("/orders/", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setSuccessMsg("Order check-out successful! Invoice generated.");
      setCart([]);
      setSelectedCustomer("");
      // Reload lists
      loadAllData();
      // Switch back to history
      setTimeout(() => {
        setActiveTab("history");
        setSuccessMsg("");
      }, 1500);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to create order");
    }
    setSubmitting(false);
  };

  // Filter products for the POS cart
  const filteredProducts = products.filter(p => {
    const matchesBranch = !p.branch_id || String(p.branch_id) === selectedBranch;
    const matchesSearch = p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.sku.toLowerCase().includes(prodSearch.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Order Lifecycle & Sales</h1>
          <p className="text-sm text-muted-foreground">Log transactions, assign branches, and update logistics statuses</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant={activeTab === "history" ? "primary" : "outline"} 
            size="sm"
            onClick={() => setActiveTab("history")}
          >
            Order History
          </Button>
          <Button 
            variant={activeTab === "new_order" ? "primary" : "outline"} 
            size="sm"
            onClick={() => setActiveTab("new_order")}
          >
            <Plus className="w-4 h-4 mr-1" />
            New Order (POS)
          </Button>
        </div>
      </div>

      {activeTab === "history" ? (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-secondary/20 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      <th className="p-4 font-medium">Order ID</th>
                      <th className="p-4 font-medium">Branch</th>
                      <th className="p-4 font-medium">Customer</th>
                      <th className="p-4 font-medium">Date</th>
                      <th className="p-4 font-medium">Total</th>
                      <th className="p-4 font-medium text-center">Payment</th>
                      <th className="p-4 font-medium text-center">Status</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-secondary/10 transition">
                        <td className="p-4 font-semibold text-foreground">#{o.id}</td>
                        <td className="p-4 text-xs text-muted-foreground">{o.branch_name}</td>
                        <td className="p-4 text-xs font-medium text-foreground">{o.customer_name}</td>
                        <td className="p-4 text-xs text-muted-foreground">{new Date(o.date).toLocaleDateString()}</td>
                        <td className="p-4 font-bold text-foreground">${o.total_amount.toFixed(2)}</td>
                        <td className="p-4 text-center">
                          {o.payment_status === "PAID" ? (
                            <Badge variant="success">Paid</Badge>
                          ) : (
                            <Badge variant="warning">Pending</Badge>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <Badge variant={
                            o.status === "DELIVERED" ? "success" :
                            o.status === "CANCELLED" ? "destructive" :
                            "primary"
                          }>
                            {o.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetails(o.id)} className="p-1">
                            <Eye className="w-4 h-4 text-zinc-400 hover:text-foreground" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground text-sm">
                No orders logged yet.
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* NEW ORDER (POS CHECKOUT) */
        <div className="grid gap-6 lg:grid-cols-3">
          {/* POS Catalog */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Product Catalog</span>
                  <span className="text-xs text-muted-foreground font-normal">Showing items for selected branch</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    label="Branch Source"
                    options={branches.map(b => ({ label: b.name, value: b.id }))}
                    value={selectedBranch}
                    onChange={(e) => {
                      setSelectedBranch(e.target.value);
                      setCart([]); // wipe cart since branch changes catalog items
                    }}
                    disabled={!!user?.branch_id}
                  />
                  <div className="flex items-end">
                    <div className="relative w-full">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search SKU or name..."
                        value={prodSearch}
                        onChange={(e) => setProdSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 max-h-[45vh] overflow-y-auto pr-2">
                  {filteredProducts.map((p) => {
                    const inCart = cart.find(item => item.product_id === p.id);
                    const remStock = p.stock_quantity - (inCart?.quantity || 0);
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => remStock > 0 && addToCart(p)}
                        className={`p-3 border rounded-xl flex flex-col justify-between transition cursor-pointer select-none ${
                          remStock <= 0 
                            ? "bg-secondary/20 border-border opacity-50 cursor-not-allowed" 
                            : "bg-card border-border hover:border-primary/40 hover:shadow-sm"
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-xs text-foreground leading-tight truncate mr-2">{p.name}</span>
                            <span className="font-mono text-[9px] text-muted-foreground uppercase">{p.sku}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{p.category_name}</p>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-border/40">
                          <span className="font-bold text-sm text-foreground">${p.price.toFixed(2)}</span>
                          <span className="text-[9px] text-muted-foreground">Stock: {remStock} remaining</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* POS Cart / Checkout */}
          <div className="space-y-4">
            <Card className="sticky top-20 border-primary/20">
              <CardHeader className="bg-secondary/10 pb-4">
                <CardTitle className="text-base flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  <span>Shopping Cart</span>
                </CardTitle>
                <CardDescription>Final check-out details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {successMsg && <Alert variant="success">{successMsg}</Alert>}
                {errorMsg && <Alert variant="error">{errorMsg}</Alert>}

                {/* Customer assignment */}
                <Select
                  label="Assign Customer Profile"
                  options={[{ label: "Walk-in Guest", value: "" }, ...customers.map(c => ({ label: `${c.name} (${c.email})`, value: c.id }))]}
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                />

                {/* Cart Items list */}
                <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2 border-b border-border pb-3">
                  {cart.length > 0 ? (
                    cart.map((item) => (
                      <div key={item.product_id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-semibold text-foreground truncate">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground">${item.price.toFixed(2)} each</p>
                        </div>
                        
                        <div className="flex items-center space-x-2 shrink-0">
                          <button onClick={() => updateQuantity(item.product_id, -1)} className="w-5 h-5 rounded border border-border flex items-center justify-center font-bold hover:bg-secondary">-</button>
                          <span className="font-semibold text-center w-4">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product_id, 1)} className="w-5 h-5 rounded border border-border flex items-center justify-center font-bold hover:bg-secondary">+</button>
                          
                          <button onClick={() => removeFromCart(item.product_id)} className="p-1 rounded text-destructive hover:bg-destructive/10 ml-2">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-xs text-muted-foreground">Cart is empty. Click items on the left.</div>
                  )}
                </div>

                {/* Summary */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax (GST 18% Incl.)</span>
                    <span>${(cartTotal * 0.1525).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-foreground font-bold text-sm pt-2 border-t border-border">
                    <span>Grand Total</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment configs */}
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Method"
                    options={[
                      { label: "Cash", value: "CASH" },
                      { label: "Card", value: "CARD" },
                      { label: "UPI", value: "UPI" },
                      { label: "Razorpay (Demo)", value: "RAZORPAY" }
                    ]}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <Select
                    label="Status"
                    options={[
                      { label: "Pending", value: "PENDING" },
                      { label: "Paid", value: "PAID" }
                    ]}
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                  />
                </div>

                <Button onClick={handleCheckout} className="w-full mt-4" disabled={submitting || cart.length === 0}>
                  {submitting ? "Checking out..." : `Submit Order - $${cartTotal.toFixed(2)}`}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Order Details View Modal */}
      <Modal isOpen={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} title="Order Ledger Details">
        {selectedOrderDetails && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs border-b border-border pb-4">
              <div>
                <p className="text-muted-foreground font-semibold uppercase">Order ID</p>
                <p className="font-bold text-sm text-foreground mt-0.5">#{selectedOrderDetails.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-semibold uppercase">Branch Location</p>
                <p className="font-bold text-foreground mt-0.5">{selectedOrderDetails.branch_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-semibold uppercase">Customer Name</p>
                <p className="font-bold text-foreground mt-0.5">{selectedOrderDetails.customer_name || "Walk-in Guest"}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-semibold uppercase">Payment Details</p>
                <p className="font-bold text-foreground mt-0.5">{selectedOrderDetails.payment_method} ({selectedOrderDetails.payment_status})</p>
              </div>
            </div>

            {/* List items */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Checkout Items</h3>
              <div className="space-y-2 border border-border rounded-lg p-3 bg-secondary/10">
                {selectedOrderDetails.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-foreground">{item.product_name}</p>
                      <p className="text-[10px] text-muted-foreground">Qty: {item.quantity} × ${item.price.toFixed(2)}</p>
                    </div>
                    <span className="font-bold text-foreground">${item.total_price.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-bold text-xs">
                  <span>Grand Total</span>
                  <span>${selectedOrderDetails.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Action controls (status update) */}
            <div className="flex flex-col gap-2 pt-4 border-t border-border">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Logistics Management</h3>
              
              <div className="grid grid-cols-2 gap-2">
                <Select
                  label="Update Order Status"
                  options={[
                    { label: "Pending", value: "PENDING" },
                    { label: "Processing", value: "PROCESSING" },
                    { label: "Shipped", value: "SHIPPED" },
                    { label: "Delivered", value: "DELIVERED" },
                    { label: "Cancelled", value: "CANCELLED" }
                  ]}
                  value={selectedOrderDetails.status}
                  onChange={(e) => handleUpdateStatus(selectedOrderDetails.id, e.target.value)}
                />
                
                <Select
                  label="Update Payment"
                  options={[
                    { label: "Pending", value: "PENDING" },
                    { label: "Paid", value: "PAID" },
                    { label: "Refunded", value: "REFUNDED" }
                  ]}
                  value={selectedOrderDetails.payment_status}
                  onChange={(e) => handleUpdatePayment(selectedOrderDetails.id, e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button onClick={() => setDetailsModalOpen(false)}>Close Ledger</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
