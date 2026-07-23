import React from "react";
import { 
  Globe, Shield, AlertTriangle, CheckCircle, XCircle, Play, 
  Activity, Settings as SettingsIcon, Terminal, RefreshCw, Layers 
} from "lucide-react";
import { Target, Scan, SystemLog } from "../types";

interface DashboardOverviewProps {
  targets: Target[];
  scans: Scan[];
  logs: SystemLog[];
  onScanAll: () => Promise<void>;
  isScanningAll: boolean;
  onNavigateToTab: (tab: string) => void;
}

export default function DashboardOverview({
  targets,
  scans,
  logs,
  onScanAll,
  isScanningAll,
  onNavigateToTab
}: DashboardOverviewProps) {
  // Statistics
  const totalTargets = targets.length;
  const activeTargets = targets.filter(t => t.status === "active").length;
  const pausedTargets = totalTargets - activeTargets;
  
  const totalScans = scans.length;
  const successfulScans = scans.filter(s => s.status === "success").length;
  const failedScans = scans.filter(s => s.status === "failed").length;
  const totalChanges = scans.filter(s => s.isChange).length;
  
  // Find high risk scans
  const highRiskCount = scans.filter(s => s.aiAnalysis?.riskLevel === "HIGH").length;
  const mediumRiskCount = scans.filter(s => s.aiAnalysis?.riskLevel === "MEDIUM").length;

  // Group targets by type for distribution chart
  const typeCounts = targets.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const targetTypes = [
    { type: "css", label: "Stylesheets (CSS)", color: "#3b82f6", count: typeCounts["css"] || 0 },
    { type: "js", label: "Scripts (JS)", color: "#eab308", count: typeCounts["js"] || 0 },
    { type: "html", label: "Static HTML", color: "#f97316", count: typeCounts["html"] || 0 },
    { type: "webpage", label: "Rendered Webpage", color: "#a855f7", count: typeCounts["webpage"] || 0 }
  ];

  const totalTypesCount = targets.length || 1;

  // Group scan counts of last 7 days or last 10 scans
  const recentScans = [...scans]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-10);

  return (
    <div className="space-y-6" id="dashboard-overview">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div 
          id="stat-targets"
          className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition cursor-pointer shadow-sm"
          onClick={() => onNavigateToTab("targets")}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Mục tiêu theo dõi</p>
              <h3 className="text-3xl font-bold mt-2 text-slate-900">{totalTargets}</h3>
            </div>
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> {activeTargets} Hoạt động</span>
            {pausedTargets > 0 && <span>• {pausedTargets} Tạm ngưng</span>}
          </div>
        </div>

        <div 
          id="stat-changes"
          className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition cursor-pointer shadow-sm"
          onClick={() => onNavigateToTab("diffs")}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Phát hiện Thay đổi</p>
              <h3 className="text-3xl font-bold mt-2 text-amber-500">{totalChanges}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 border border-amber-100 text-amber-600 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <span>Tổng số bản ghi phát hiện biến đổi mã nguồn</span>
          </div>
        </div>

        <div 
          id="stat-security"
          className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Cảnh báo An ninh AI</p>
              <h3 className="text-3xl font-bold mt-2 text-rose-600">
                {highRiskCount}
              </h3>
            </div>
            <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
            <span className="text-rose-600 font-semibold">{highRiskCount} Nguy cơ cao</span>
            <span>•</span>
            <span className="text-amber-600 font-medium">{mediumRiskCount} Nguy cơ trung bình</span>
          </div>
        </div>

        <div 
          id="stat-scans"
          className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Tác vụ Quét</p>
              <h3 className="text-3xl font-bold mt-2 text-slate-900">{totalScans}</h3>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle className="w-3.5 h-3.5" /> {successfulScans} Đạt</span>
            <span className="flex items-center gap-1 text-rose-600 font-semibold"><XCircle className="w-3.5 h-3.5" /> {failedScans} Lỗi</span>
          </div>
        </div>
      </div>

      {/* Main Operations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Charts & Overview */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Scan & Intro Panel */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-950 border border-indigo-900 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md text-white">
            <div className="space-y-1.5 text-center md:text-left">
              <h2 className="text-lg font-display font-bold text-white">Giám sát tài nguyên Web chuyên nghiệp</h2>
              <p className="text-indigo-200/80 text-sm max-w-xl">
                WACM tự động quét định kỳ cấu trúc tĩnh và nội dung render của CSS, JS, HTML để bảo vệ mã nguồn, phòng chống mã độc (anti-XSS), theo dõi cập nhật UI và giữ an toàn hệ thống.
              </p>
            </div>
            <button
              id="btn-scan-all"
              onClick={onScanAll}
              disabled={isScanningAll || activeTargets === 0}
              className="w-full md:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-sm rounded-lg shadow-lg flex items-center justify-center gap-2 transition shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isScanningAll ? "animate-spin" : ""}`} />
              {isScanningAll ? "Đang quét dữ liệu..." : "Quét tất cả ngay"}
            </button>
          </div>

          {/* Custom SVG Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Chart 1: Scan History (Line/Bar simulation in SVG) */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-display font-bold text-slate-800">Lịch sử hoạt động gần đây</h3>
                <span className="text-slate-500 text-xs">10 tác vụ cuối</span>
              </div>
              
              {recentScans.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  <p className="text-xs">Chưa có dữ liệu lịch sử quét</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Custom interactive bar representation */}
                  <div className="flex items-end justify-between h-36 px-2 pb-2 border-b border-slate-100">
                    {recentScans.map((scan, idx) => {
                      const isSuccess = scan.status === "success";
                      const isChange = scan.isChange;
                      let barHeight = isSuccess ? "h-24" : "h-8";
                      if (isSuccess && isChange) barHeight = "h-20";

                      return (
                        <div key={scan.id} className="group relative flex flex-col items-center w-full">
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-slate-900 border border-slate-800 text-[10px] text-slate-300 p-2 rounded shadow-xl z-20 w-36 pointer-events-none">
                            <p className="font-semibold text-white">
                              {isSuccess ? "Thành công" : "Quét thất bại"}
                            </p>
                            <p className="text-slate-400 mt-0.5">
                              {new Date(scan.timestamp).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {isChange && <p className="text-amber-400 mt-1 font-medium">⚠️ Phát hiện thay đổi</p>}
                            {isSuccess && <p className="text-slate-500 mt-0.5">+{scan.addedLines} / -{scan.deletedLines} dòng</p>}
                          </div>
                          
                          {/* Bar */}
                          <div className={`w-3.5 rounded-t transition-all ${
                            isChange 
                              ? "bg-amber-500 hover:bg-amber-400" 
                              : isSuccess 
                                ? "bg-emerald-500 hover:bg-emerald-400" 
                                : "bg-rose-500 hover:bg-rose-400"
                          } ${barHeight}`}></div>
                          
                          <span className="text-[9px] text-slate-400 mt-1">{idx + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex justify-center gap-4 text-[10px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500"></span> Thành công</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500"></span> Phát hiện Thay đổi</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-500"></span> Thất bại</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chart 2: Donut Distribution of Target Types */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-display font-bold text-slate-800">Tỷ lệ loại tài nguyên giám sát</h3>
              
              <div className="flex items-center gap-6 h-36">
                {/* SVG Donut */}
                <div className="relative w-28 h-28 shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="4"></circle>
                    {(() => {
                      let currentOffset = 0;
                      return targetTypes.map((type) => {
                        if (type.count === 0) return null;
                        const percentage = (type.count / totalTypesCount) * 100;
                        const strokeDash = `${percentage} ${100 - percentage}`;
                        const offset = currentOffset;
                        currentOffset += percentage;
                        return (
                          <circle
                            key={type.type}
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="none"
                            stroke={type.color}
                            strokeWidth="4"
                            strokeDasharray={strokeDash}
                            strokeDashoffset={100 - offset}
                            className="transition-all"
                          ></circle>
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-slate-800 font-display">{totalTargets}</span>
                    <span className="text-[9px] text-slate-400">Mục tiêu</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="flex flex-col justify-center space-y-2 text-xs w-full">
                  {targetTypes.map(type => (
                    <div key={type.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: type.color }} />
                        <span className="text-slate-600 font-semibold">{type.label}</span>
                      </div>
                      <span className="text-slate-500 font-bold">{type.count} ({Math.round((type.count / totalTypesCount) * 100)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Quick Target Summary Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-display font-bold text-slate-800">Mục tiêu có thay đổi mới nhất</h3>
              <button 
                onClick={() => onNavigateToTab("targets")}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                Quản lý mục tiêu
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="text-slate-500 bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-3 font-semibold">Mục tiêu</th>
                    <th className="p-3 font-semibold">Loại</th>
                    <th className="p-3 font-semibold">Trạng thái quét</th>
                    <th className="p-3 font-semibold">Thay đổi gần đây</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {targets.slice(0, 3).map((target) => {
                    const targetScans = scans.filter(s => s.targetId === target.id);
                    const changesCount = targetScans.filter(s => s.isChange).length;
                    
                    return (
                      <tr key={target.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{target.name}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{target.url}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            target.type === 'css' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                            target.type === 'js' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            target.type === 'html' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                            'bg-purple-50 text-purple-600 border border-purple-100'
                          }`}>
                            {target.type}
                          </span>
                        </td>
                        <td className="p-3">
                          {target.lastScanned ? (
                            <span className="flex items-center gap-1 font-semibold">
                              {target.error ? (
                                <><XCircle className="w-3.5 h-3.5 text-rose-500" /> <span className="text-rose-600">Lỗi kết nối</span></>
                              ) : (
                                <><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> <span className="text-emerald-600">Ổn định</span></>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400">Chưa quét</span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-amber-600">
                          {changesCount > 0 ? `${changesCount} lần` : "Chưa có"}
                        </td>
                      </tr>
                    );
                  })}
                  {targets.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">Chưa cấu hình mục tiêu nào.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column: Active System Logs & Terminal output */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col h-full space-y-4 shadow-sm">
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-display font-bold text-slate-800">Nhật ký Hệ thống (Real-time Logs)</h3>
            </div>
            <span className="flex items-center gap-1.5 font-bold text-emerald-600 text-xs">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span> Live
            </span>
          </div>

          <div 
            id="terminal-logs"
            className="flex-1 bg-[#0f172a] border border-slate-800 rounded-lg p-3.5 font-mono text-[11px] overflow-y-auto space-y-2.5 max-h-[460px] min-h-[300px]"
          >
            {logs.length === 0 ? (
              <p className="text-slate-500 italic">Chưa phát sinh hoạt động nhật ký nào...</p>
            ) : (
              logs.map((log, idx) => {
                let textClass = "text-slate-300";
                let prefix = "[INFO]";
                if (log.type === "warn") {
                  textClass = "text-amber-400";
                  prefix = "[WARN]";
                } else if (log.type === "error") {
                  textClass = "text-rose-400";
                  prefix = "[ERR ]";
                }

                return (
                  <div key={idx} className="leading-relaxed border-b border-slate-800/20 pb-1.5 last:border-0">
                    <span className="text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>{" "}
                    <span className={textClass + " font-bold"}>{prefix}</span>{" "}
                    <span className={textClass}>{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
          
          <div className="text-[10px] text-slate-500 text-center bg-slate-50 py-2 border border-slate-100 rounded italic font-semibold">
            Nhật ký tự động làm mới khi có quét hoặc cấu hình thay đổi.
          </div>
        </div>

      </div>
    </div>
  );
}
