"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/auth-context";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, 
  Button, Select 
} from "../../components/ui";
import { 
  FileText, Download, Table, FileSpreadsheet, RefreshCw, 
  ShieldAlert, DollarSign, Receipt, Percent 
} from "lucide-react";

export default function BillingPage() {
  const { apiCall, user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, [filterStatus]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const url = filterStatus === "all" 
        ? "/billing/invoices" 
        : `/billing/invoices?payment_status=${filterStatus}`;
      const data = await apiCall(url);
      setInvoices(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleDownloadPDF = async (invId: number, invNum: string) => {
    try {
      const blob = await apiCall(`/billing/invoices/${invId}/pdf`);
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

  const handleDownloadExcelReport = async (reportType: string) => {
    setExportLoading(reportType);
    try {
      const blob = await apiCall(`/billing/reports/excel?report_type=${reportType}`);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${reportType}_report_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || `Failed to export ${reportType} report`);
    }
    setExportLoading(null);
  };

  const totalGST = invoices.reduce((sum, inv) => sum + (inv.gst_amount || 0), 0);
  const totalBilled = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  const isOwnerOrManager = user && ["SUPER_ADMIN", "BUSINESS_OWNER", "MANAGER"].includes(user.role);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing Ledger & Reports</h1>
        <p className="text-sm text-muted-foreground">GST invoicing logs, payment checks, and data export sheets</p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardDescription className="text-xs uppercase font-semibold">Accumulated Tax GST (18%)</CardDescription>
            <Percent className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">${totalGST.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardDescription className="text-xs uppercase font-semibold">Total Gross Invoiced</CardDescription>
            <DollarSign className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">${totalBilled.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardDescription className="text-xs uppercase font-semibold">Invoices Count</CardDescription>
            <Receipt className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{invoices.length} entries</div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Section (restricted to managers and owners) */}
      {isOwnerOrManager && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <span>Smart Report Generator</span>
            </CardTitle>
            <CardDescription>Export relational database logs to formatted Excel workbooks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Button 
                variant="outline" 
                onClick={() => handleDownloadExcelReport("sales")}
                disabled={exportLoading !== null}
                className="text-xs justify-between"
              >
                <span>Sales Ledger Report</span>
                {exportLoading === "sales" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 ml-2" />}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleDownloadExcelReport("inventory")}
                disabled={exportLoading !== null}
                className="text-xs justify-between"
              >
                <span>Inventory Audit Sheet</span>
                {exportLoading === "inventory" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 ml-2" />}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleDownloadExcelReport("customer")}
                disabled={exportLoading !== null}
                className="text-xs justify-between"
              >
                <span>CRM Customer Profiles</span>
                {exportLoading === "customer" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 ml-2" />}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleDownloadExcelReport("employee")}
                disabled={exportLoading !== null}
                className="text-xs justify-between"
              >
                <span>Payroll & Staff Sheet</span>
                {exportLoading === "employee" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 ml-2" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
          <div>
            <CardTitle className="text-base">Invoice Registry</CardTitle>
            <CardDescription className="text-xs">GST compliant billing accounts</CardDescription>
          </div>
          <div className="w-40">
            <Select
              options={[
                { label: "All Invoices", value: "all" },
                { label: "Paid", value: "PAID" },
                { label: "Pending", value: "PENDING" },
                { label: "Refunded", value: "REFUNDED" }
              ]}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-card border-border text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/20 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    <th className="p-4 font-medium">Invoice Number</th>
                    <th className="p-4 font-medium">Customer</th>
                    <th className="p-4 font-medium">Branch</th>
                    <th className="p-4 font-medium">Subtotal</th>
                    <th className="p-4 font-medium">GST Tax</th>
                    <th className="p-4 font-medium">Total Billed</th>
                    <th className="p-4 font-medium text-center">Status</th>
                    <th className="p-4 font-medium text-right">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-secondary/10 transition">
                      <td className="p-4 font-mono font-semibold text-foreground">{inv.invoice_number}</td>
                      <td className="p-4 text-xs font-semibold text-foreground">{inv.customer_name}</td>
                      <td className="p-4 text-xs text-muted-foreground">{inv.branch_name}</td>
                      <td className="p-4 text-xs font-medium text-foreground">${inv.subtotal.toFixed(2)}</td>
                      <td className="p-4 text-xs text-muted-foreground">
                        ${inv.gst_amount.toFixed(2)} <span className="text-[9px]">({inv.gst_rate}%)</span>
                      </td>
                      <td className="p-4 font-bold text-foreground">${inv.total_amount.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.payment_status === "PAID" ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                          inv.payment_status === "REFUNDED" ? "bg-red-500/10 text-red-600 dark:text-red-400" :
                          "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                        }`}>
                          {inv.payment_status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDownloadPDF(inv.id, inv.invoice_number)}
                          className="p-1 text-primary hover:bg-primary/10"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground text-sm">
              No invoices found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
