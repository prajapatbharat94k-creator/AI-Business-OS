"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/auth-context";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, 
  Button, Input, Modal, Alert 
} from "../../components/ui";
import { Building, Phone, Mail, MapPin, Plus, RefreshCw, Trash2, Edit } from "lucide-react";

export default function BranchesPage() {
  const { apiCall, user } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const data = await apiCall("/branches/");
      setBranches(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleOpenAdd = () => {
    setEditingBranch(null);
    setName("");
    setAddress("");
    setPhone("");
    setEmail("");
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleOpenEdit = (branch: any) => {
    setEditingBranch(branch);
    setName(branch.name);
    setAddress(branch.address);
    setPhone(branch.phone);
    setEmail(branch.email);
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address || !phone || !email) {
      setErrorMsg("All fields are required");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      if (editingBranch) {
        // Edit Branch
        await apiCall(`/branches/${editingBranch.id}`, {
          method: "PUT",
          body: JSON.stringify({ name, address, phone, email }),
        });
      } else {
        // Create Branch
        await apiCall("/branches/", {
          method: "POST",
          body: JSON.stringify({ name, address, phone, email }),
        });
      }
      setModalOpen(false);
      loadBranches();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to save branch");
    }
    setSubmitting(false);
  };

  const handleDelete = async (branchId: number) => {
    if (!confirm("Are you sure you want to delete this branch?")) return;
    try {
      await apiCall(`/branches/${branchId}`, { method: "DELETE" });
      loadBranches();
    } catch (e: any) {
      alert(e.message || "Failed to delete branch");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Multi-Branch Administration</h1>
          <p className="text-sm text-muted-foreground">Provision and monitor branch logistics</p>
        </div>
        <Button onClick={handleOpenAdd} className="text-xs">
          <Plus className="w-4 h-4 mr-1.5" />
          Add New Branch
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : branches.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <Card key={b.id} className="hover:border-primary/20 transition duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                      <Building className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-base">{b.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs text-muted-foreground">
                <div className="flex items-start space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{b.address}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{b.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{b.email}</span>
                </div>
              </CardContent>
              <div className="p-4 border-t border-border flex justify-end space-x-2 bg-secondary/10">
                <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(b)} className="text-zinc-400 hover:text-foreground">
                  <Edit className="w-3.5 h-3.5 mr-1" />
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(b.id)} className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-border rounded-xl bg-card">
          <Building className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
          <p className="font-semibold text-sm">No branches provisioned yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first branch to allocate resources.</p>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={editingBranch ? "Edit Branch Logistics" : "Provision New Branch"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <Alert variant="error" title="Branch Error">
              {errorMsg}
            </Alert>
          )}

          <Input
            type="text"
            label="Branch Name"
            placeholder="e.g. West Coast Warehouse"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            type="text"
            label="Physical Address"
            placeholder="Street address, city, ZIP"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />

          <Input
            type="text"
            label="Phone Contact"
            placeholder="+91 XXXXX XXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <Input
            type="email"
            label="Branch Email"
            placeholder="branch@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="flex justify-end space-x-2 pt-4 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Branch"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
