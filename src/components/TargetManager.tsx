import React, { useState } from "react";
import { 
  Globe, Play, Pause, Trash2, Edit, CheckCircle2, AlertCircle, 
  HelpCircle, ChevronRight, Plus, X, RefreshCw, Terminal, Code
} from "lucide-react";
import { Target } from "../types";

interface TargetManagerProps {
  targets: Target[];
  onAddTarget: (targetData: any) => Promise<void>;
  onUpdateTarget: (id: string, updateData: any) => Promise<void>;
  onDeleteTarget: (id: string) => Promise<void>;
  onScanTarget: (id: string) => Promise<void>;
  scanningTargetId: string | null;
}

export default function TargetManager({
  targets,
  onAddTarget,
  onUpdateTarget,
  onDeleteTarget,
  onScanTarget,
  scanningTargetId
}: TargetManagerProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<'css' | 'js' | 'html' | 'webpage'>("js");
  const [userAgent, setUserAgent] = useState("");
  const [headers, setHeaders] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form for editing or adding
  const openAdd = () => {
    setName("");
    setUrl("");
    setType("js");
    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) WebAssetChangeMonitor/1.0");
    setHeaders("{}");
    setFormError("");
    setEditingTarget(null);
    setIsAddOpen(true);
  };

  const openEdit = (target: Target) => {
    setEditingTarget(target);
    setName(target.name);
    setUrl(target.url);
    setType(target.type);
    setUserAgent(target.userAgent);
    setHeaders(target.headers);
    setFormError("");
    setIsAddOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) return setFormError("Vui lòng nhập tên mục tiêu gợi nhớ.");
    if (!url.trim()) return setFormError("Vui lòng nhập đường dẫn URL.");

    try {
      new URL(url);
    } catch (err) {
      return setFormError("URL không đúng định dạng. Cần nhập đầy đủ http:// hoặc https://");
    }

    if (headers) {
      try {
        JSON.parse(headers);
      } catch (err) {
        return setFormError("Trường Headers bổ sung bắt buộc phải là JSON hợp lệ (ví dụ: {\"Authorization\": \"Bearer key\"})");
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name,
        url,
        type,
        userAgent,
        headers: headers || "{}"
      };

      if (editingTarget) {
        await onUpdateTarget(editingTarget.id, payload);
      } else {
        await onAddTarget(payload);
      }
      setIsAddOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Lỗi lưu cấu hình mục tiêu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (target: Target) => {
    const newStatus = target.status === "active" ? "paused" : "active";
    await onUpdateTarget(target.id, { status: newStatus });
  };

  return (
    <div className="space-y-6" id="target-manager">
      {/* Header section with Action Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-800">Quản lý Mục tiêu Giám sát</h2>
          <p className="text-slate-500 text-xs mt-1">Cấu hình danh mục các script, stylesheet, webpage cần quét định kỳ để phân tích phát hiện thay đổi.</p>
        </div>
        <button
          id="btn-add-target"
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Thêm mục tiêu mới
        </button>
      </div>

      {/* Target Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {targets.map((target) => {
          const isScanning = scanningTargetId === target.id;
          const isPaused = target.status === "paused";

          return (
            <div 
              key={target.id}
              className={`bg-white border ${
                target.error ? "border-rose-200 bg-rose-50/10 hover:border-rose-300" : "border-slate-200 hover:border-slate-300"
              } rounded-xl p-5 flex flex-col justify-between transition relative overflow-hidden shadow-sm hover:shadow`}
            >
              {/* Top Row: Type & Status Badges */}
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    target.type === 'css' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                    target.type === 'js' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                    target.type === 'html' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                    'bg-purple-50 text-purple-600 border border-purple-100'
                  }`}>
                    {target.type}
                  </span>
                  <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                    isPaused ? 'bg-slate-100 text-slate-400 border border-slate-200/50' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'}`} />
                    {isPaused ? "Đang dừng" : "Đang giám sát"}
                  </span>
                </div>
                
                {/* Config Quick Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(target)}
                    title="Chỉnh sửa"
                    className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded transition"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(target)}
                    title={isPaused ? "Tiếp tục quét" : "Tạm ngưng quét"}
                    className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded transition"
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <Pause className="w-3.5 h-3.5 text-amber-500" />}
                  </button>
                  <button
                    onClick={() => onDeleteTarget(target.id)}
                    title="Xóa mục tiêu"
                    className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-rose-600 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Main Content */}
              <div className="py-4 space-y-2">
                <h3 className="font-display font-bold text-sm text-slate-800">{target.name}</h3>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600 bg-slate-50 p-2 border border-slate-100 rounded select-all truncate">
                  <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{target.url}</span>
                </div>
              </div>

              {/* Scan Status Footer */}
              <div className="bg-slate-50/50 border border-slate-100 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400 text-[10px] font-bold uppercase">
                  <span>QUÉT GẦN NHẤT</span>
                  <span>TRẠNG THÁI</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 font-mono">
                    {target.lastScanned ? new Date(target.lastScanned).toLocaleString("vi-VN") : "Chưa quét lần nào"}
                  </span>
                  
                  {target.lastScanned ? (
                    target.error ? (
                      <span className="flex items-center gap-1 text-rose-600 font-bold text-[11px]" title={target.error}>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Thất bại
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Ổn định
                      </span>
                    )
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">Đang chờ...</span>
                  )}
                </div>

                {target.error && (
                  <div className="text-[10px] text-rose-700 bg-rose-50 border border-rose-100 rounded p-2 mt-1.5 leading-relaxed font-mono">
                    {target.error}
                  </div>
                )}
              </div>

              {/* Bottom scan trigger bar */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400 font-medium">
                <span>Khởi tạo: {new Date(target.createdAt).toLocaleDateString("vi-VN")}</span>
                <button
                  onClick={() => onScanTarget(target.id)}
                  disabled={isScanning || isPaused}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 text-slate-700 text-[10px] font-bold rounded transition uppercase tracking-wider shrink-0"
                >
                  <RefreshCw className={`w-3 h-3 ${isScanning ? "animate-spin" : ""}`} />
                  {isScanning ? "Đang quét..." : "Quét ngay"}
                </button>
              </div>
            </div>
          );
        })}

        {targets.length === 0 && (
          <div className="lg:col-span-2 bg-white border border-dashed border-slate-200 rounded-xl p-10 text-center space-y-3 shadow-sm">
            <Globe className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-display font-bold text-slate-700">Chưa có mục tiêu theo dõi nào</h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">Vui lòng nhấp vào nút "Thêm mục tiêu mới" phía trên để cấu hình tài nguyên web đầu tiên cần giám sát.</p>
          </div>
        )}
      </div>

      {/* Slide-over or Modal for Add/Edit Target */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-800">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-display font-bold text-sm text-slate-800">
                {editingTarget ? "Cập nhật Mục tiêu Giám sát" : "Thêm Mục tiêu Giám sát mới"}
              </h3>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-md transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-600 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Target Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Tên gợi nhớ mục tiêu *</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Google Analytics Tracking Core, Bootstrap CDN Stylesheet"
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-slate-800 outline-none transition"
                />
              </div>

              {/* URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Đường dẫn đầy đủ (URL) *</label>
                <input 
                  type="text" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/assets/js/main.js"
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-slate-800 outline-none transition font-mono"
                />
              </div>

              {/* Type Grid Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Loại tài nguyên</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(['js', 'css', 'html', 'webpage'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`p-3 rounded-lg border text-center transition capitalize font-bold text-xs ${
                        type === t 
                          ? "bg-indigo-50 border-indigo-500 text-indigo-600" 
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-500"
                      }`}
                    >
                      {t === 'webpage' ? "Rendered Page" : t}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  {type === 'js' && "Quét và phân tích các file Script JavaScript (.js)."}
                  {type === 'css' && "Quét các file Stylesheet CSS tĩnh định hình bố cục trang (.css)."}
                  {type === 'html' && "Quét mã HTML thô trả về trực tiếp từ nguồn tĩnh (.html)."}
                  {type === 'webpage' && "Giả lập lấy cấu trúc DOM của trang web."}
                </p>
              </div>

              {/* Headers Customization */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    Headers tùy chọn <span className="text-[10px] text-slate-400 font-normal">(JSON)</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono font-medium">Mặc định: {"{}"}</span>
                </div>
                <textarea 
                  value={headers}
                  onChange={(e) => setHeaders(e.target.value)}
                  placeholder='{"Authorization": "Bearer sample_token", "X-Custom-Header": "WACM-Scan"}'
                  rows={2}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-slate-800 outline-none transition font-mono"
                />
              </div>

              {/* User Agent */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">User-Agent giả lập</label>
                <input 
                  type="text" 
                  value={userAgent}
                  onChange={(e) => setUserAgent(e.target.value)}
                  placeholder="Mozilla/5.0 browser agent string"
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-slate-800 outline-none transition font-mono text-[10px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 bg-slate-50/50 -mx-5 -mb-5 p-5">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white text-xs font-bold rounded-lg shadow transition"
                >
                  {isSubmitting ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang lưu...</>
                  ) : (
                    "Lưu mục tiêu"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
