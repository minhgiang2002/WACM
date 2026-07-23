import React, { useState, useEffect } from "react";
import { 
  Globe, Shield, History, Settings as SettingsIcon, RefreshCw, 
  Terminal, ShieldAlert, CheckCircle, Menu, X, Activity, BrainCircuit
} from "lucide-react";
import { Target, Scan, Settings, SystemLog, DashboardData } from "./types";
import DashboardOverview from "./components/DashboardOverview";
import TargetManager from "./components/TargetManager";
import DiffHistory from "./components/DiffHistory";
import SettingsPanel from "./components/SettingsPanel";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [targets, setTargets] = useState<Target[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  
  // Operational States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [isScanningAll, setIsScanningAll] = useState<boolean>(false);
  const [scanningTargetId, setScanningTargetId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Sync data with the backend API
  const fetchDashboardData = async (silent = false, retryCount = 0) => {
    if (!silent && retryCount === 0) setIsLoading(true);
    try {
      const response = await fetch("/api/dashboard");
      if (!response.ok) {
        let errDetail = `HTTP ${response.status}`;
        if (response.statusText) {
          errDetail += ` ${response.statusText}`;
        }
        try {
          const text = await response.text();
          if (text) {
            try {
              const errJson = JSON.parse(text);
              if (errJson.error) {
                errDetail += `: ${errJson.error}`;
              } else {
                errDetail += `: ${text.substring(0, 100)}`;
              }
            } catch (_) {
              errDetail += `: ${text.substring(0, 100)}`;
            }
          }
        } catch (_) {}
        throw new Error(errDetail);
      }
      const data: DashboardData = await response.json();
      setTargets(data.targets || []);
      setScans(data.scans || []);
      setSettings(data.settings || { telegramToken: "", telegramChatId: "", slackWebhook: "", enableAutoAI: false, scanIntervalHours: 12 });
      setLogs(data.logs || []);
      setError("");
    } catch (err: any) {
      console.error("Lỗi lấy dữ liệu dashboard:", err);
      // Auto-retry up to 2 times if server is warming up
      if (retryCount < 2) {
        setTimeout(() => {
          fetchDashboardData(silent, retryCount + 1);
        }, 1200);
        return;
      }
      const msg = err?.message || "Không thể kết nối máy chủ WACM";
      setError(`Không thể thiết lập kết nối đến máy chủ WACM (${msg}). Vui lòng kiểm tra dịch vụ backend.`);
    } finally {
      if (!silent && retryCount === 0) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh dashboard metrics every 30 seconds silently
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Operations
  const handleAddTarget = async (targetData: any) => {
    const response = await fetch("/api/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(targetData)
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Thất bại thêm mục tiêu.");
    }
    await fetchDashboardData(true);
  };

  const handleUpdateTarget = async (id: string, updateData: any) => {
    const response = await fetch(`/api/targets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData)
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Thất bại cập nhật mục tiêu.");
    }
    await fetchDashboardData(true);
  };

  const handleDeleteTarget = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa mục tiêu giám sát này và toàn bộ lịch sử quét liên đới?")) return;
    const response = await fetch(`/api/targets/${id}`, {
      method: "DELETE"
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Thất bại xóa mục tiêu.");
    }
    await fetchDashboardData(true);
  };

  const handleScanTarget = async (id: string) => {
    setScanningTargetId(id);
    try {
      const response = await fetch(`/api/targets/${id}/scan`, {
        method: "POST"
      });
      if (!response.ok) {
        throw new Error("Quét thất bại.");
      }
      await fetchDashboardData(true);
    } catch (err) {
      console.error(err);
    } finally {
      setScanningTargetId(null);
    }
  };

  const handleScanAll = async () => {
    setIsScanningAll(true);
    try {
      const response = await fetch("/api/scan-all", {
        method: "POST"
      });
      if (!response.ok) {
        throw new Error("Lỗi quét đồng loạt.");
      }
      await fetchDashboardData(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanningAll(false);
    }
  };

  const handleFetchTargetScans = async (targetId: string): Promise<Scan[]> => {
    const response = await fetch(`/api/scans/${targetId}`);
    if (!response.ok) {
      throw new Error("Không thể lấy lịch sử quét.");
    }
    return response.json();
  };

  const handleTriggerAiAnalysis = async (scanId: string): Promise<any> => {
    const response = await fetch(`/api/scans/${scanId}/ai-analyze`, {
      method: "POST"
    });
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Lỗi phân tích bảo mật AI.");
    }
    return response.json();
  };

  const handleSaveSettings = async (settingsData: Settings) => {
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsData)
    });
    if (!response.ok) {
      throw new Error("Thất bại lưu cấu hình.");
    }
    await fetchDashboardData(true);
  };

  const handleTestWebhooks = async (testData: { telegramToken: string; telegramChatId: string; slackWebhook: string }) => {
    const response = await fetch("/api/settings/test-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testData)
    });
    if (!response.ok) {
      throw new Error("Kết nối máy chủ kiểm tra thất bại.");
    }
    return response.json();
  };

  // Navigations sidebar definitions
  const navigationItems = [
    { id: "dashboard", label: "Bảng điều khiển", sub: "Tổng quan trạng thái", icon: Shield },
    { id: "targets", label: "Mục tiêu Giám sát", sub: "Cấu hình liên kết", icon: Globe },
    { id: "diffs", label: "Lịch sử & So sánh mã", sub: "Phân tích an ninh AI", icon: History },
    { id: "settings", label: "Cấu hình & Cảnh báo", sub: "Kênh báo động, lập lịch", icon: SettingsIcon },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600 gap-3 font-sans">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <Shield className="w-6 h-6 text-indigo-600 animate-pulse" />
        </div>
        <div className="text-center mt-2">
          <h2 className="text-sm font-display font-bold text-slate-800 tracking-wider">WEB ASSET CHANGE MONITOR</h2>
          <p className="text-[11px] text-slate-400 mt-1">Đang khởi tạo kết nối cơ sở dữ liệu giám sát...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center p-4 font-sans">
        <div className="p-6 bg-white border border-slate-200 rounded-2xl max-w-md w-full space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-display font-bold text-slate-800">Kết nối máy chủ thất bại</h2>
            <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono text-[11px] break-all">{error}</p>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={() => {
                setError("");
                fetchDashboardData();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold rounded-lg text-white transition shadow-sm active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> Thử kết nối lại ngay
            </button>

            <button
              onClick={() => {
                setError("");
                setTargets([
                  {
                    id: "target-1",
                    name: "Tailwind CSS CDN Stylesheet",
                    url: "https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css",
                    type: "css",
                    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) WebAssetChangeMonitor/1.0",
                    headers: "{}",
                    lastScanned: new Date().toISOString(),
                    lastHash: "8b8144e5df50485f68d3715614966a116e22789bad4c88e1010e5d10aa5a7537",
                    status: "active",
                    error: null,
                    createdAt: new Date().toISOString()
                  }
                ]);
                setSettings({ telegramToken: "", telegramChatId: "", slackWebhook: "", enableAutoAI: false, scanIntervalHours: 12 });
                setLogs([{ timestamp: new Date().toISOString(), message: "Chế độ trải nghiệm ngoại tuyến (Demo mode) đã kích hoạt.", type: "warn" }]);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition"
            >
              Dùng chế độ trải nghiệm tạm thời
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row text-slate-800 font-sans">
      
      {/* Mobile Top Header */}
      <header className="lg:hidden bg-[#0f172a] border-b border-slate-800 px-5 py-4 flex items-center justify-between shrink-0 z-40 sticky top-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-lg">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xs font-display font-bold text-white tracking-wider uppercase">WACM Monitor</h1>
            <p className="text-[9px] text-slate-400 font-medium">Bảo vệ tài nguyên web</p>
          </div>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar navigation */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 w-64 bg-[#0f172a] border-r border-slate-800 z-50 flex flex-col justify-between shrink-0 transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        
        {/* Upper Sidebar Info */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo Brand Header */}
          <div className="hidden lg:flex items-center gap-3 p-6 border-b border-slate-800">
            <div className="p-2 bg-indigo-500 rounded flex items-center justify-center text-white font-bold shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-display font-bold text-white tracking-tight">WACM System</h1>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Change Detection</p>
            </div>
          </div>

          {/* Nav List */}
          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
            {navigationItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 text-sm font-medium ${
                    isActive 
                      ? "bg-slate-800 text-white" 
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                  }`}
                >
                  <IconComp className={`w-4 h-4 shrink-0 transition ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
                  <div className="flex-1">
                    <div className="text-xs font-semibold leading-none">{item.label}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Lower Sidebar Settings / State info */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/20 space-y-4 shrink-0">
          {/* Active stats overview */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Trạng thái Cron Engine</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
              <span className="text-xs text-slate-400">Đang chạy (Tự động)</span>
            </div>
            <div className="text-[10px] text-slate-500 space-y-1 pt-1 border-t border-slate-800/40">
              <div className="flex justify-between">
                <span>Hoạt động:</span>
                <span className="text-slate-300 font-mono font-medium">{targets.filter(t => t.status === "active").length} / {targets.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Quét thành công:</span>
                <span className="text-slate-300 font-mono font-medium">{scans.filter(s => s.status === 'success').length}</span>
              </div>
            </div>
          </div>

          <div className="text-[9px] text-slate-600 text-center leading-relaxed font-semibold">
            &copy; 2026 WACM Security.
          </div>
        </div>

      </aside>

      {/* Backdrop for mobile menu */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
        />
      )}

      {/* Main Content Pane */}
      <main className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8 space-y-6">
        
        {/* Tab content switcher with standard animations */}
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Tab 1: Dashboard Overview */}
          {activeTab === "dashboard" && (
            <DashboardOverview 
              targets={targets}
              scans={scans}
              logs={logs}
              onScanAll={handleScanAll}
              isScanningAll={isScanningAll}
              onNavigateToTab={setActiveTab}
            />
          )}

          {/* Tab 2: Target Manager */}
          {activeTab === "targets" && (
            <TargetManager 
              targets={targets}
              onAddTarget={handleAddTarget}
              onUpdateTarget={handleUpdateTarget}
              onDeleteTarget={handleDeleteTarget}
              onScanTarget={handleScanTarget}
              scanningTargetId={scanningTargetId}
            />
          )}

          {/* Tab 3: Diff History & Code Diff Comparator */}
          {activeTab === "diffs" && (
            <DiffHistory 
              targets={targets}
              onFetchTargetScans={handleFetchTargetScans}
              onTriggerAiAnalysis={handleTriggerAiAnalysis}
            />
          )}

          {/* Tab 4: Settings config panel */}
          {activeTab === "settings" && settings && (
            <SettingsPanel 
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onTestWebhooks={handleTestWebhooks}
            />
          )}

        </div>
      </main>

    </div>
  );
}
