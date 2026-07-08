"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/auth-context";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, 
  Button, Input, Alert, Badge 
} from "../../components/ui";
import { 
  Brain, Send, Sparkles, AlertCircle, RefreshCw, BarChart2, 
  TrendingUp, HelpCircle, Bot, ArrowRight, ShieldCheck 
} from "lucide-react";
import { 
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, 
  Tooltip, Legend, CartesianGrid 
} from "recharts";

export default function AIPage() {
  const { apiCall } = useAuth();
  
  // Tabs: 'predictions' | 'assistant'
  const [activeTab, setActiveTab] = useState<"predictions" | "assistant">("predictions");
  const [loading, setLoading] = useState(true);

  // AI data states
  const [forecastData, setForecastData] = useState<any>(null);
  const [inventoryPredict, setInventoryPredict] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);

  // Chatbot states
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      sender: "ai",
      text: "Hello! I am your AI Business OS Assistant. Ask me operational questions like 'what is our total revenue?' or 'show low stock items'. How can I assist you today?"
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAIData();
  }, []);

  useEffect(() => {
    // Scroll chat to bottom
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const loadAIData = async () => {
    setLoading(true);
    try {
      const [forecast, invPred, ins] = await Promise.all([
        apiCall("/ai/forecast?days=7"),
        apiCall("/ai/inventory-prediction"),
        apiCall("/ai/insights")
      ]);
      setForecastData(forecast);
      setInventoryPredict(invPred);
      setInsights(ins);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSendChat = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryText = customQuery || chatInput;
    if (!queryText.trim()) return;

    // Append user message
    const userMsg = { sender: "user", text: queryText };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await apiCall("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ query: queryText })
      });
      // Append AI response
      setChatMessages(prev => [...prev, { sender: "ai", text: response.response }]);
    } catch (e: any) {
      setChatMessages(prev => [...prev, { sender: "ai", text: `I encountered an error processing your query: ${e.message || "Unknown error"}` }]);
    }
    setChatLoading(false);
  };

  // Compile Recharts Combined Sales Data
  // History: [{date, amount}], Forecast: [{date, amount}]
  const chartData: any[] = [];
  if (forecastData) {
    forecastData.history.forEach((h: any) => {
      chartData.push({
        date: h.date.slice(5), // truncate year to make readable (e.g. 07-08)
        Historical: h.amount,
        Forecasted: null
      });
    });
    
    // Connect forecast line cleanly starting from last historical value
    if (forecastData.history.length > 0) {
      const lastHist = forecastData.history[forecastData.history.length - 1];
      chartData.push({
        date: lastHist.date.slice(5) + " (F)",
        Historical: lastHist.amount,
        Forecasted: lastHist.amount
      });
    }
    
    forecastData.forecast.forEach((f: any) => {
      chartData.push({
        date: f.date.slice(5) + " (F)",
        Historical: null,
        Forecasted: f.amount
      });
    });
  }

  // Predefined Chat Questions
  const promptSuggestions = [
    "What is our total revenue?",
    "Do we have any low stock items?",
    "Which is our best performing branch?",
    "Who is our top customer?",
    "How many employees do we have?"
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-primary rounded-xl text-primary-foreground">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Analytics Panel</h1>
            <p className="text-sm text-muted-foreground">Expose mathematical sales models, safety stock velocities, and chat bot insights</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 shrink-0">
          <Button 
            variant={activeTab === "predictions" ? "primary" : "outline"} 
            size="sm"
            onClick={() => setActiveTab("predictions")}
          >
            <BarChart2 className="w-4 h-4 mr-1" />
            Forecasting & Depletion
          </Button>
          <Button 
            variant={activeTab === "assistant" ? "primary" : "outline"} 
            size="sm"
            onClick={() => setActiveTab("assistant")}
          >
            <Bot className="w-4 h-4 mr-1" />
            AI Chat Copilot
          </Button>
        </div>
      </div>

      {/* AI Performance Text Insights (always visible at top) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {insights.map((ins, idx) => (
          <Card key={idx} className="border-border hover:border-primary/20 transition duration-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider">{ins.title}</CardDescription>
              <Sparkles className={`w-3.5 h-3.5 ${
                ins.impact === "POSITIVE" ? "text-green-500" :
                ins.impact === "NEGATIVE" ? "text-red-500" :
                "text-primary"
              }`} />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">{ins.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* TAB SUB-PAGES */}
      {activeTab === "predictions" ? (
        <div className="space-y-6">
          {/* Sales Forecast Chart */}
          <Card>
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Linear Regression Sales Forecast</CardTitle>
                  <CardDescription className="text-xs">Based on past 30 days of daily transaction turnover</CardDescription>
                </div>
                {forecastData && (
                  <div className="text-right shrink-0">
                    <Badge variant="primary">Trend: {forecastData.trend}</Badge>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Confidence: {forecastData.confidence_score * 100}%</p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="h-80 pt-6">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                    <XAxis dataKey="date" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Line type="monotone" dataKey="Historical" stroke="var(--primary)" strokeWidth={2.5} activeDot={{ r: 6 }} dot={false} />
                    <Line type="monotone" dataKey="Forecasted" stroke="#a78bfa" strokeWidth={2.5} strokeDasharray="5 5" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                  Insufficient sales data to run regression models.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Safety Stock Predictions table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Safety Stock & Depletion Forecasts</CardTitle>
              <CardDescription>Predicted consumption velocity and reorder alerts</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : inventoryPredict.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-secondary/20 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                        <th className="p-4 font-medium">SKU / Product</th>
                        <th className="p-4 font-medium text-center">Remaining Stock</th>
                        <th className="p-4 font-medium text-center">Velocity (Units/Day)</th>
                        <th className="p-4 font-medium text-center">Remaining Days</th>
                        <th className="p-4 font-medium text-center">Depletion Risk</th>
                        <th className="p-4 font-medium text-right">Reorder Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {inventoryPredict.map((p, idx) => (
                        <tr key={idx} className="hover:bg-secondary/10 transition">
                          <td className="p-4">
                            <span className="font-semibold text-foreground">{p.product_name}</span>
                            <span className="block text-[9px] text-muted-foreground font-mono mt-0.5">{p.sku}</span>
                          </td>
                          <td className="p-4 text-center font-semibold text-foreground">{p.current_stock} units</td>
                          <td className="p-4 text-center font-medium text-muted-foreground">{p.daily_velocity}</td>
                          <td className="p-4 text-center font-bold text-foreground">
                            {p.days_remaining === 999 ? "∞" : `${p.days_remaining} days`}
                          </td>
                          <td className="p-4 text-center">
                            <Badge variant={
                              p.urgency_level === "CRITICAL" ? "destructive" :
                              p.urgency_level === "HIGH" ? "warning" :
                              "success"
                            }>
                              {p.urgency_level}
                            </Badge>
                          </td>
                          <td className="p-4 text-right font-bold text-primary">
                            {p.recommended_qty > 0 ? (
                              <span className="text-red-500 animate-pulse">Restock {p.recommended_qty} units</span>
                            ) : (
                              <span className="text-green-500">Adequate</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground text-xs">No stock items found</div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* AI ASSISTANT CHAT COPILOT */
        <div className="grid gap-6 lg:grid-cols-4 items-start">
          {/* Suggested Questions */}
          <div className="lg:col-span-1 space-y-3">
            <Card>
              <CardHeader className="pb-3 bg-secondary/10">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center">
                  <HelpCircle className="w-3.5 h-3.5 mr-1 text-primary" />
                  Suggested Inquiries
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 flex flex-col space-y-2">
                {promptSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(undefined, s)}
                    disabled={chatLoading}
                    className="w-full text-left p-2.5 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition font-medium"
                  >
                    {s}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Chat Window */}
          <div className="lg:col-span-3">
            <Card className="h-[65vh] flex flex-col justify-between border-primary/20">
              <CardHeader className="bg-secondary/10 border-b border-border py-4 flex flex-row items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-sm font-bold">SQL-Aware NLP Assistant</CardTitle>
                    <CardDescription className="text-[10px]">Real-time natural language query broker</CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 text-[10px] text-green-500 font-semibold bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                  <ShieldCheck className="w-3.5 h-3.5 mr-0.5 text-green-500" />
                  <span>Sandbox active</span>
                </div>
              </CardHeader>

              {/* Message bubbles */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[75%] p-3.5 rounded-xl text-xs leading-relaxed ${
                      msg.sender === "user" 
                        ? "bg-primary text-primary-foreground rounded-br-none" 
                        : "bg-secondary text-foreground rounded-bl-none border border-border"
                    }`}>
                      {msg.text.split("\n").map((line: string, lIdx: number) => (
                        <p key={lIdx} className={lIdx > 0 ? "mt-2" : ""}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
                
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-secondary text-foreground p-3 rounded-xl rounded-bl-none border border-border text-xs flex items-center space-x-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                      <span className="font-semibold text-muted-foreground">Reading SQL records...</span>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendChat} className="p-3 border-t border-border bg-card flex items-center space-x-2">
                <Input
                  placeholder="Ask a question about database metrics..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                  className="bg-secondary border-border focus:ring-primary"
                />
                <Button type="submit" disabled={chatLoading || !chatInput.trim()} className="p-2.5 shrink-0 rounded-lg">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
