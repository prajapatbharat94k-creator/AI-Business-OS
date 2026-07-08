"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/auth-context";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, 
  Button, Input, Select, Modal, Alert, Badge 
} from "../../components/ui";
import { 
  Package, Plus, Search, Filter, RefreshCw, Barcode, 
  Tag, Truck, AlertTriangle, Eye, Edit, Trash2 
} from "lucide-react";

export default function InventoryPage() {
  const { apiCall, user } = useAuth();
  
  // Tabs: 'products' | 'categories' | 'suppliers'
  const [activeTab, setActiveTab] = useState<"products" | "categories" | "suppliers">("products");
  const [loading, setLoading] = useState(true);
  
  // Data lists
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Modal control
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  
  // Editing state
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedProductBarcode, setSelectedProductBarcode] = useState<any>(null);

  // Forms states
  const [prodName, setProdName] = useState("");
  const [prodSku, setProdSku] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodCost, setProdCost] = useState("");
  const [prodQty, setProdQty] = useState("");
  const [prodThresh, setProdThresh] = useState("10");
  const [prodCat, setProdCat] = useState("");
  const [prodSup, setProdSup] = useState("");
  const [prodBranch, setProdBranch] = useState("");

  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");

  const [supName, setSupName] = useState("");
  const [supContact, setSupContact] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supAddr, setSupAddr] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [cats, sups, brs] = await Promise.all([
        apiCall("/inventory/categories"),
        apiCall("/inventory/suppliers"),
        apiCall("/branches/"),
      ]);
      setCategories(cats);
      setSuppliers(sups);
      setBranches(brs);

      // Default dropdown values
      if (cats.length > 0) setProdCat(String(cats[0].id));
      if (sups.length > 0) setProdSup(String(sups[0].id));
      if (brs.length > 0) setProdBranch(String(brs[0].id));
      
      await loadProducts();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const loadProducts = async () => {
    try {
      let url = "/inventory/products";
      const params = [];
      if (filterCategory !== "all") params.push(`category_id=${filterCategory}`);
      if (filterBranch !== "all") params.push(`branch_id=${filterBranch}`);
      if (filterLowStock) params.push(`low_stock=true`);
      if (searchQuery) params.push(`search=${encodeURIComponent(searchQuery)}`);
      
      if (params.length > 0) {
        url += "?" + params.join("&");
      }
      
      const prods = await apiCall(url);
      setProducts(prods);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [filterCategory, filterBranch, filterLowStock, searchQuery]);

  // Handle product modal launch
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdName("");
    setProdSku(flickBarcode());
    setProdPrice("");
    setProdCost("");
    setProdQty("");
    setProdThresh("10");
    if (categories.length > 0) setProdCat(String(categories[0].id));
    if (suppliers.length > 0) setProdSup(String(suppliers[0].id));
    if (branches.length > 0) setProdBranch(String(branches[0].id));
    setErrorMsg("");
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: any) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdSku(p.sku);
    setProdPrice(String(p.price));
    setProdCost(String(p.cost_price));
    setProdQty(String(p.stock_quantity));
    setProdThresh(String(p.low_stock_threshold));
    setProdCat(String(p.category_id || ""));
    setProdSup(String(p.supplier_id || ""));
    setProdBranch(String(p.branch_id || ""));
    setErrorMsg("");
    setProductModalOpen(true);
  };

  const flickBarcode = () => {
    return "SKU-" + Math.floor(100000 + Math.random() * 900000);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodSku || !prodPrice || !prodCost || !prodQty) {
      setErrorMsg("Please fill in all core fields");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      const payload = {
        name: prodName,
        sku: prodSku,
        price: parseFloat(prodPrice),
        cost_price: parseFloat(prodCost),
        stock_quantity: parseInt(prodQty),
        low_stock_threshold: parseInt(prodThresh),
        category_id: prodCat ? parseInt(prodCat) : null,
        supplier_id: prodSup ? parseInt(prodSup) : null,
        branch_id: prodBranch ? parseInt(prodBranch) : null,
      };

      if (editingProduct) {
        await apiCall(`/inventory/products/${editingProduct.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiCall("/inventory/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setProductModalOpen(false);
      loadProducts();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to save product");
    }
    setSubmitting(false);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;
    setSubmitting(true);
    try {
      await apiCall("/inventory/categories", {
        method: "POST",
        body: JSON.stringify({ name: catName, description: catDesc }),
      });
      setCategoryModalOpen(false);
      setCatName("");
      setCatDesc("");
      loadAllData();
    } catch (e: any) {
      alert(e.message || "Failed to create category");
    }
    setSubmitting(false);
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName) return;
    setSubmitting(true);
    try {
      await apiCall("/inventory/suppliers", {
        method: "POST",
        body: JSON.stringify({
          name: supName,
          contact_name: supContact,
          phone: supPhone,
          email: supEmail,
          address: supAddr,
        }),
      });
      setSupplierModalOpen(false);
      setSupName("");
      setSupContact("");
      setSupPhone("");
      setSupEmail("");
      setSupAddr("");
      loadAllData();
    } catch (e: any) {
      alert(e.message || "Failed to create supplier");
    }
    setSubmitting(false);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await apiCall(`/inventory/products/${id}`, { method: "DELETE" });
      loadProducts();
    } catch (e: any) {
      alert(e.message || "Failed to delete product");
    }
  };

  const handleViewBarcode = (p: any) => {
    setSelectedProductBarcode(p);
    setBarcodeModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-sm text-muted-foreground">Manage stock levels, suppliers, categories, and branch inventory</p>
        </div>
        
        {/* Buttons based on tabs */}
        <div className="flex items-center space-x-2 shrink-0">
          {activeTab === "products" && (
            <Button onClick={handleOpenAddProduct} className="text-xs">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Product
            </Button>
          )}
          {activeTab === "categories" && (
            <Button onClick={() => setCategoryModalOpen(true)} className="text-xs">
              <Plus className="w-4 h-4 mr-1.5" />
              Create Category
            </Button>
          )}
          {activeTab === "suppliers" && (
            <Button onClick={() => setSupplierModalOpen(true)} className="text-xs">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Supplier
            </Button>
          )}
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-border space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("products")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "products" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center space-x-2">
            <Package className="w-4 h-4" />
            <span>Products Catalog</span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "categories" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center space-x-2">
            <Tag className="w-4 h-4" />
            <span>Categories</span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab("suppliers")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "suppliers" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center space-x-2">
            <Truck className="w-4 h-4" />
            <span>Suppliers</span>
          </span>
        </button>
      </div>

      {/* TAB CONTENTS */}
      {activeTab === "products" && (
        <div className="space-y-4">
          {/* Search and Filters Bar */}
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card border-border"
              />
            </div>
            
            <Select
              options={[{ label: "All Categories", value: "all" }, ...categories.map(c => ({ label: c.name, value: c.id }))]}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-card border-border"
            />
            
            <Select
              options={[{ label: "All Branches", value: "all" }, ...branches.map(b => ({ label: b.name, value: b.id }))]}
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <input
              type="checkbox"
              id="low_stock_chk"
              checked={filterLowStock}
              onChange={(e) => setFilterLowStock(e.target.checked)}
              className="rounded border-border bg-card text-primary focus:ring-primary w-4 h-4 cursor-pointer"
            />
            <label htmlFor="low_stock_chk" className="text-muted-foreground flex items-center font-medium cursor-pointer">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mr-1 shrink-0" />
              Show Low Stock items only
            </label>
          </div>

          {/* Products Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : products.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-secondary/20 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                        <th className="p-4 font-medium">Product / SKU</th>
                        <th className="p-4 font-medium">Category</th>
                        <th className="p-4 font-medium">Branch</th>
                        <th className="p-4 font-medium">Cost / Price</th>
                        <th className="p-4 font-medium text-center">Stock</th>
                        <th className="p-4 font-medium text-center">Status</th>
                        <th className="p-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {products.map((p) => {
                        const isLow = p.stock_quantity <= p.low_stock_threshold;
                        return (
                          <tr key={p.id} className="hover:bg-secondary/10 transition">
                            <td className="p-4">
                              <div className="font-semibold text-foreground">{p.name}</div>
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{p.sku}</div>
                            </td>
                            <td className="p-4 text-xs text-muted-foreground">{p.category_name}</td>
                            <td className="p-4 text-xs text-muted-foreground">{p.branch_name}</td>
                            <td className="p-4">
                              <div className="text-foreground font-semibold">${p.price.toFixed(2)}</div>
                              <div className="text-[10px] text-muted-foreground">Cost: ${p.cost_price.toFixed(2)}</div>
                            </td>
                            <td className="p-4 text-center font-bold text-foreground">{p.stock_quantity}</td>
                            <td className="p-4 text-center">
                              {isLow ? (
                                <Badge variant="destructive">Low Stock</Badge>
                              ) : (
                                <Badge variant="success">In Stock</Badge>
                              )}
                            </td>
                            <td className="p-4 text-right space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => handleViewBarcode(p)} className="p-1.5" title="View Barcode">
                                <Barcode className="w-4 h-4 text-zinc-400 hover:text-foreground" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleOpenEditProduct(p)} className="p-1.5" title="Edit">
                                <Edit className="w-4 h-4 text-zinc-400 hover:text-foreground" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(p.id)} className="p-1.5 text-destructive hover:bg-destructive/10" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground text-sm">
                  No products found in the catalog
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "categories" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Categories list */}
          <Card>
            <CardHeader>
              <CardTitle>Product Categories</CardTitle>
              <CardDescription>Group products for analytical classification</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {categories.map((c) => (
                  <li key={c.id} className="p-4 flex items-center justify-between hover:bg-secondary/10 transition">
                    <div>
                      <p className="font-semibold text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.description || "No description provided"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Category Tips */}
          <Card className="bg-secondary/10 border-dashed">
            <CardContent className="p-6 space-y-3.5 text-xs text-muted-foreground">
              <h3 className="font-bold text-foreground text-sm">Category Best Practices</h3>
              <p>Allocate logical groupings like Electronics, Staples, Office Stationery to segment performance in reports.</p>
              <p>Branch inventory turnover displays higher clarity when product types are mapped correctly.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "suppliers" && (
        <div className="grid gap-6 md:grid-cols-3">
          {suppliers.map((s) => (
            <Card key={s.id} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">{s.name}</CardTitle>
                <CardDescription className="text-xs">{s.contact_name || "Primary Vendor"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p>📞 {s.phone || "No contact number"}</p>
                <p>✉️ {s.email || "No email"}</p>
                <p>📍 {s.address || "No address details"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Product Add/Edit Modal */}
      <Modal 
        isOpen={productModalOpen} 
        onClose={() => setProductModalOpen(false)} 
        title={editingProduct ? "Edit Product Details" : "Add Product to Inventory"}
      >
        <form onSubmit={handleProductSubmit} className="space-y-4">
          {errorMsg && <Alert variant="error">{errorMsg}</Alert>}

          <Input label="Product Name" placeholder="e.g. Wireless Mouse" value={prodName} onChange={(e) => setProdName(e.target.value)} required />
          <Input label="SKU / Barcode" placeholder="Auto-generated if blank" value={prodSku} onChange={(e) => setProdSku(e.target.value)} required />
          
          <div className="grid grid-cols-2 gap-4">
            <Input type="number" step="0.01" label="Cost Price ($)" placeholder="15.00" value={prodCost} onChange={(e) => setProdCost(e.target.value)} required />
            <Input type="number" step="0.01" label="Retail Price ($)" placeholder="29.99" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input type="number" label="Stock Quantity" placeholder="100" value={prodQty} onChange={(e) => setProdQty(e.target.value)} required />
            <Input type="number" label="Min Safety Stock" placeholder="10" value={prodThresh} onChange={(e) => setProdThresh(e.target.value)} required />
          </div>

          <Select 
            label="Product Category" 
            options={categories.map(c => ({ label: c.name, value: c.id }))} 
            value={prodCat} 
            onChange={(e) => setProdCat(e.target.value)} 
          />

          <Select 
            label="Branch / Warehouse" 
            options={branches.map(b => ({ label: b.name, value: b.id }))} 
            value={prodBranch} 
            onChange={(e) => setProdBranch(e.target.value)} 
          />

          <Select 
            label="Supplier / Vendor" 
            options={suppliers.map(s => ({ label: s.name, value: s.id }))} 
            value={prodSup} 
            onChange={(e) => setProdSup(e.target.value)} 
          />

          <div className="flex justify-end space-x-2 pt-4 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setProductModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save Product"}</Button>
          </div>
        </form>
      </Modal>

      {/* Category Creation Modal */}
      <Modal isOpen={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} title="Create New Category">
        <form onSubmit={handleCategorySubmit} className="space-y-4">
          <Input label="Category Name" placeholder="e.g. Apparel" value={catName} onChange={(e) => setCatName(e.target.value)} required />
          <Input label="Description" placeholder="Optional notes" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} />
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setCategoryModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>Create Category</Button>
          </div>
        </form>
      </Modal>

      {/* Supplier Creation Modal */}
      <Modal isOpen={supplierModalOpen} onClose={() => setSupplierModalOpen(false)} title="Add Supplier Profile">
        <form onSubmit={handleSupplierSubmit} className="space-y-4">
          <Input label="Supplier Name" placeholder="Apex Tech Distributors" value={supName} onChange={(e) => setSupName(e.target.value)} required />
          <Input label="Contact Name" placeholder="Rajesh Kumar" value={supContact} onChange={(e) => setSupContact(e.target.value)} />
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone Contact" placeholder="+91 XXXXX XXXXX" value={supPhone} onChange={(e) => setSupPhone(e.target.value)} />
            <Input type="email" label="Email Address" placeholder="sales@apex.com" value={supEmail} onChange={(e) => setSupEmail(e.target.value)} />
          </div>

          <Input label="Warehouse Address" placeholder="MIDC Industrial Area, Pune" value={supAddr} onChange={(e) => setSupAddr(e.target.value)} />
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setSupplierModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>Add Supplier</Button>
          </div>
        </form>
      </Modal>

      {/* Barcode Visual Dialog Modal */}
      <Modal isOpen={barcodeModalOpen} onClose={() => setBarcodeModalOpen(false)} title="Dynamic Barcode Registry">
        {selectedProductBarcode && (
          <div className="text-center py-6 space-y-4">
            <p className="text-sm font-semibold">{selectedProductBarcode.name}</p>
            
            {/* Styled barcode columns */}
            <div className="bg-white p-6 rounded-lg inline-block border border-zinc-200">
              <div className="flex items-center justify-center space-x-0.5 h-16 w-60 mx-auto">
                {Array.from({ length: 30 }).map((_, idx) => (
                  <div 
                    key={idx} 
                    className="bg-black h-full" 
                    style={{ 
                      width: `${(idx % 3 === 0 ? 3 : (idx % 2 === 0 ? 1 : 2))}px`,
                      marginRight: `${(idx % 4 === 0 ? 2 : 1)}px` 
                    }} 
                  />
                ))}
              </div>
              <p className="text-xs font-mono tracking-widest text-black mt-2">{selectedProductBarcode.sku}</p>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Scan SKU code with a standard reader to process sales or warehouse check-ins.
            </p>
            
            <div className="pt-4">
              <Button onClick={() => setBarcodeModalOpen(false)} className="w-full">
                Close Registry
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
