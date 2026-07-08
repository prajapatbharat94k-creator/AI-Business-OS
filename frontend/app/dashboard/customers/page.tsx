"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/auth-context";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, 
  Button, Input, Select, Modal, Alert 
} from "../../components/ui";
import { 
  UserCheck, Plus, Search, RefreshCw, Eye, MessageSquare, 
  Phone, Mail, MapPin, Award, BookOpen, Clock, Calendar 
} from "lucide-react";

export default function CustomersPage() {
  const { apiCall } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Customer Detail View
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [crmActivities, setCrmActivities] = useState<any[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Creation Modals
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [addActivityOpen, setAddActivityOpen] = useState(false);

  // Customer Form
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddr, setCustAddr] = useState("");
  
  // CRM Activity Form
  const [actType, setActType] = useState("NOTE");
  const [actNotes, setActNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await apiCall("/customers/");
      setCustomers(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleOpenDetails = async (cust: any) => {
    setLoading(true);
    try {
      const details = await apiCall(`/customers/${cust.id}`);
      const activities = await apiCall(`/customers/${cust.id}/activities`);
      setSelectedCustomer(details);
      setCrmActivities(activities);
      setDetailModalOpen(true);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custEmail) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      await apiCall("/customers/", {
        method: "POST",
        body: JSON.stringify({
          name: custName,
          email: custEmail,
          phone: custPhone,
          address: custAddr
        })
      });
      setAddCustomerOpen(false);
      // Reset
      setCustName("");
      setCustEmail("");
      setCustPhone("");
      setCustAddr("");
      loadCustomers();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to create customer");
    }
    setSubmitting(false);
  };

  const handleCreateCRMActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actNotes || !selectedCustomer) return;
    setSubmitting(true);
    try {
      const newAct = await apiCall(`/customers/${selectedCustomer.customer.id}/activities`, {
        method: "POST",
        body: JSON.stringify({
          activity_type: actType,
          notes: actNotes
        })
      });
      
      // Update local listing in detail view
      setCrmActivities([newAct, ...crmActivities]);
      setAddActivityOpen(false);
      setActNotes("");
    } catch (e: any) {
      alert(e.message || "Failed to add note");
    }
    setSubmitting(false);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer CRM & Loyalty</h1>
          <p className="text-sm text-muted-foreground">Log client interactions, trace purchase histories, and allocate loyalty points</p>
        </div>
        <Button onClick={() => setAddCustomerOpen(true)} className="text-xs shrink-0">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Customer Profile
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card border-border"
        />
      </div>

      {/* Customer profiles grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filteredCustomers.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((c) => (
            <Card key={c.id} className="hover:border-primary/20 transition duration-200 flex flex-col justify-between">
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-sm">{c.name}</CardTitle>
                    <CardDescription className="text-[10px] truncate max-w-[150px]">{c.email}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-primary text-xs font-bold bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  <Award className="w-3.5 h-3.5 shrink-0 text-primary mr-0.5" />
                  <span>{c.loyalty_points} pts</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{c.phone || "No contact number"}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="truncate">{c.address || "No address log"}</span>
                </div>
              </CardContent>
              <div className="p-4 border-t border-border flex justify-end bg-secondary/10">
                <Button variant="ghost" size="sm" onClick={() => handleOpenDetails(c)} className="text-primary hover:bg-primary/10">
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  View CRM Ledger
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-border rounded-xl bg-card">
          <UserCheck className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
          <p className="font-semibold text-sm">No customers registered yet</p>
          <p className="text-xs text-muted-foreground mt-1">Register a new client or wait for portal signups.</p>
        </div>
      )}

      {/* Customer CRM details modal */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="Customer CRM Ledger">
        {selectedCustomer && (
          <div className="space-y-6">
            {/* Purchase summaries */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-secondary/20 p-3 rounded-lg border border-border">
              <div>
                <p className="text-muted-foreground font-semibold uppercase">Total Sales Orders</p>
                <p className="font-bold text-sm text-foreground mt-0.5">{selectedCustomer.total_orders} purchases</p>
              </div>
              <div>
                <p className="text-muted-foreground font-semibold uppercase">Total Accumulative Spend</p>
                <p className="font-bold text-sm text-foreground mt-0.5">${selectedCustomer.total_spent.toFixed(2)}</p>
              </div>
            </div>

            {/* Log list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center">
                  <BookOpen className="w-4 h-4 mr-1 text-primary" />
                  Interaction Logs ({crmActivities.length})
                </h3>
                <Button size="sm" onClick={() => setAddActivityOpen(true)} className="text-[10px] h-7 px-2.5">
                  Add Interaction Log
                </Button>
              </div>

              <div className="space-y-3.5 max-h-[35vh] overflow-y-auto pr-1">
                {crmActivities.length > 0 ? (
                  crmActivities.map((act) => (
                    <div key={act.id} className="p-3 border border-border rounded-lg bg-card text-xs flex flex-col space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          act.activity_type === "TRANSACTION" ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" :
                          act.activity_type === "CALL" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                          "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                        }`}>
                          {act.activity_type}
                        </span>
                        <span className="text-muted-foreground font-medium flex items-center">
                          <Clock className="w-3 h-3 mr-0.5" />
                          {new Date(act.date).toLocaleDateString()} {new Date(act.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-foreground">{act.notes}</p>
                      <p className="text-[9px] text-muted-foreground text-right italic">Recorded by: {act.staff_name}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-[11px] text-muted-foreground">No interaction history registered</div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border mt-6">
              <Button onClick={() => setDetailModalOpen(false)}>Close Ledger</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Customer Modal */}
      <Modal isOpen={addCustomerOpen} onClose={() => setAddCustomerOpen(false)} title="Register Customer Profile">
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
          <Input label="Customer Full Name" placeholder="Jane Doe" value={custName} onChange={(e) => setCustName(e.target.value)} required />
          <Input type="email" label="Email Address" placeholder="jane@example.com" value={custEmail} onChange={(e) => setCustEmail(e.target.value)} required />
          <Input label="Phone Number" placeholder="+91 XXXXX XXXXX" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} />
          <Input label="Shipping Address" placeholder="Street, City, Postal Code" value={custAddr} onChange={(e) => setCustAddr(e.target.value)} />
          
          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setAddCustomerOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>Register Customer</Button>
          </div>
        </form>
      </Modal>

      {/* Add CRM Activity Modal */}
      <Modal isOpen={addActivityOpen} onClose={() => setAddActivityOpen(false)} title="Log Client Interaction">
        <form onSubmit={handleCreateCRMActivity} className="space-y-4">
          <Select
            label="Interaction Type"
            options={[
              { label: "Internal Note", value: "NOTE" },
              { label: "Phone Call", value: "CALL" },
              { label: "Email Sent", value: "EMAIL" },
              { label: "In-Person Meeting", value: "MEETING" }
            ]}
            value={actType}
            onChange={(e) => setActType(e.target.value)}
          />
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Notes Details</label>
            <textarea
              className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-24 resize-none"
              placeholder="Record details of conversation, complaints, or inquiries..."
              value={actNotes}
              onChange={(e) => setActNotes(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setAddActivityOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>Log Interaction</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
