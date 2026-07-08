"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/auth-context";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, 
  Button, Input, Select, Modal, Alert, Badge 
} from "../../components/ui";
import { 
  Users, RefreshCw, Calendar, DollarSign, Clock, ShieldCheck, 
  ThumbsUp, ThumbsDown, CheckCircle, XCircle 
} from "lucide-react";

export default function EmployeesPage() {
  const { apiCall, user } = useAuth();
  
  // Tabs: 'payroll' | 'leave' | 'attendance'
  const [activeTab, setActiveTab] = useState<"payroll" | "leave" | "attendance">("payroll");
  const [loading, setLoading] = useState(true);

  // Data lists
  const [profiles, setProfiles] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  
  // Salary Adjust Modal
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [salaryInput, setSalaryInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      if (activeTab === "payroll") {
        const data = await apiCall("/employees/profiles");
        setProfiles(data);
      } else if (activeTab === "leave") {
        const data = await apiCall("/employees/leave/all");
        setLeaves(data);
      } else if (activeTab === "attendance") {
        const data = await apiCall("/employees/attendance/all");
        setAttendance(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleOpenSalary = (profile: any) => {
    setSelectedProfile(profile);
    setSalaryInput(String(profile.salary));
    setSalaryModalOpen(true);
  };

  const handleAdjustSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryInput || !selectedProfile) return;
    setSubmitting(true);
    try {
      await apiCall(`/employees/profiles/${selectedProfile.id}/salary`, {
        method: "PUT",
        body: JSON.stringify({ salary: parseFloat(salaryInput) })
      });
      setSalaryModalOpen(false);
      // Reload payroll
      const data = await apiCall("/employees/profiles");
      setProfiles(data);
    } catch (e: any) {
      alert(e.message || "Failed to adjust salary");
    }
    setSubmitting(false);
  };

  const handleLeaveDecision = async (reqId: number, status: "APPROVED" | "REJECTED") => {
    try {
      await apiCall(`/employees/leave/${reqId}/status?status=${status}`, {
        method: "PUT"
      });
      // Reload leaves
      const data = await apiCall("/employees/leave/all");
      setLeaves(data);
    } catch (e: any) {
      alert(e.message || "Failed to process leave request");
    }
  };

  const isOwnerOrAdmin = user && ["SUPER_ADMIN", "BUSINESS_OWNER"].includes(user.role);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Employee Administration & Payroll</h1>
        <p className="text-sm text-muted-foreground">Manage salary structures, approve leave requests, and audit check-in schedules</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("payroll")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "payroll" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4" />
            <span>Payroll Profiles</span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab("leave")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "leave" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>Leave Requests</span>
          </span>
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "attendance" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Attendance Log</span>
          </span>
        </button>
      </div>

      {/* TAB SUB-PAGES */}
      {activeTab === "payroll" && (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : profiles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-secondary/20 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      <th className="p-4 font-medium">Employee Name</th>
                      <th className="p-4 font-medium">Position</th>
                      <th className="p-4 font-medium">Assigned Branch</th>
                      <th className="p-4 font-medium">Hired Date</th>
                      <th className="p-4 font-medium">Leave Balance</th>
                      <th className="p-4 font-medium text-right">Salary (Monthly)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {profiles.map((p) => (
                      <tr key={p.id} className="hover:bg-secondary/10 transition">
                        <td className="p-4">
                          <div className="font-semibold text-foreground">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground">{p.email}</div>
                        </td>
                        <td className="p-4">
                          <Badge variant="primary">{p.position}</Badge>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">{p.branch_name}</td>
                        <td className="p-4 text-xs text-muted-foreground">{new Date(p.hire_date).toLocaleDateString()}</td>
                        <td className="p-4 font-semibold text-foreground text-center">{p.leave_balance} days</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <span className="font-bold text-foreground">${p.salary.toFixed(2)}</span>
                            {isOwnerOrAdmin && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleOpenSalary(p)}
                                className="text-[10px] py-1 px-2 h-7"
                              >
                                Adjust
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground text-sm">
                No payroll profiles registered.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "leave" && (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : leaves.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-secondary/20 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      <th className="p-4 font-medium">Employee</th>
                      <th className="p-4 font-medium">Leave Type</th>
                      <th className="p-4 font-medium">Dates</th>
                      <th className="p-4 font-medium">Reason</th>
                      <th className="p-4 font-medium text-center">Status</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {leaves.map((l) => (
                      <tr key={l.id} className="hover:bg-secondary/10 transition">
                        <td className="p-4 font-semibold text-foreground">{l.user_name}</td>
                        <td className="p-4 text-xs font-medium text-foreground">{l.leave_type}</td>
                        <td className="p-4 text-xs text-muted-foreground">
                          {new Date(l.start_date).toLocaleDateString()} to {new Date(l.end_date).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-xs text-muted-foreground max-w-xs truncate">{l.reason}</td>
                        <td className="p-4 text-center">
                          <Badge variant={
                            l.status === "APPROVED" ? "success" :
                            l.status === "REJECTED" ? "destructive" :
                            "warning"
                          }>
                            {l.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-right space-x-1.5">
                          {l.status === "PENDING" ? (
                            <div className="flex justify-end space-x-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleLeaveDecision(l.id, "APPROVED")}
                                className="py-1 px-2 h-7 border-green-500/20 text-green-600 hover:bg-green-500/10 hover:text-green-600"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleLeaveDecision(l.id, "REJECTED")}
                                className="py-1 px-2 h-7 border-red-500/20 text-red-600 hover:bg-red-500/10 hover:text-red-600"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </Button>
                            </div>
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
              <div className="text-center py-20 text-muted-foreground text-sm">
                No leave requests submitted.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "attendance" && (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : attendance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-secondary/20 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      <th className="p-4 font-medium">Employee</th>
                      <th className="p-4 font-medium">Date</th>
                      <th className="p-4 font-medium">Checked In</th>
                      <th className="p-4 font-medium">Checked Out</th>
                      <th className="p-4 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {attendance.map((a) => (
                      <tr key={a.id} className="hover:bg-secondary/10 transition">
                        <td className="p-4">
                          <div className="font-semibold text-foreground">{a.user_name}</div>
                          <div className="text-[10px] text-muted-foreground">{a.user_email}</div>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">{new Date(a.date).toLocaleDateString()}</td>
                        <td className="p-4 text-xs text-foreground font-mono">
                          {a.check_in ? new Date(a.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                        </td>
                        <td className="p-4 text-xs text-foreground font-mono">
                          {a.check_out ? new Date(a.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                        </td>
                        <td className="p-4 text-center">
                          <Badge variant={a.status === "PRESENT" ? "success" : "warning"}>
                            {a.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground text-sm">
                No attendance logs found.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Salary Adjust Modal */}
      <Modal isOpen={salaryModalOpen} onClose={() => setSalaryModalOpen(false)} title="Adjust Monthly Salary">
        {selectedProfile && (
          <form onSubmit={handleAdjustSalarySubmit} className="space-y-4">
            <div className="text-xs text-muted-foreground border-b border-border pb-3 mb-2">
              Adjusting salary rate for <strong className="text-foreground">{selectedProfile.name}</strong> ({selectedProfile.position})
            </div>
            
            <Input
              type="number"
              step="0.01"
              label="Salary Rate ($/Month)"
              placeholder="e.g. 3500.00"
              value={salaryInput}
              onChange={(e) => setSalaryInput(e.target.value)}
              required
            />

            <div className="flex justify-end space-x-2 pt-4 border-t border-border mt-6">
              <Button type="button" variant="outline" onClick={() => setSalaryModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>Confirm Adjustment</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
