import React, { useState, useEffect } from "react";
import { 
  History, Calendar, Hash, FileCode, ShieldAlert, ShieldCheck, 
  ChevronRight, ArrowRight, CornerDownRight, Check, AlertTriangle, 
  BrainCircuit, Sparkles, AlertCircle, RefreshCw, Layers, Shield
} from "lucide-react";
import { Target, Scan } from "../types";
import { diffLines } from "diff";

interface DiffHistoryProps {
  targets: Target[];
  onFetchTargetScans: (targetId: string) => Promise<Scan[]>;
  onTriggerAiAnalysis: (scanId: string) => Promise<any>;
}

export default function DiffHistory({
  targets,
  onFetchTargetScans,
  onTriggerAiAnalysis
}: DiffHistoryProps) {
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [scans, setScans] = useState<Scan[]>([]);
  const [isLoadingScans, setIsLoadingScans] = useState(false);
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  
  // Diff Calculation State
  const [diffParts, setDiffParts] = useState<any[]>([]);
  const [previousScan, setPreviousScan] = useState<Scan | null>(null);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiError, setAiError] = useState("");

  // Fetch scans when target is selected
  useEffect(() => {
    if (selectedTargetId) {
      setIsLoadingScans(true);
      setSelectedScan(null);
      setPreviousScan(null);
      setDiffParts([]);
      
      onFetchTargetScans(selectedTargetId)
        .then(scansData => {
          setScans(scansData);
          // Auto select first successful scan that has change if available, else first scan
          const firstChange = scansData.find(s => s.isChange && s.status === 'success');
          if (firstChange) {
            handleSelectScan(firstChange, scansData);
          } else if (scansData.length > 0) {
            handleSelectScan(scansData[0], scansData);
          }
        })
        .finally(() => {
          setIsLoadingScans(false);
        });
    } else {
      setScans([]);
      setSelectedScan(null);
      setPreviousScan(null);
      setDiffParts([]);
    }
  }, [selectedTargetId]);

  // Compute diff when a scan is selected
  const handleSelectScan = (scan: Scan, allScans: Scan[] = scans) => {
    setSelectedScan(scan);
    setAiError("");

    if (scan.status === 'failed') {
      setPreviousScan(null);
      setDiffParts([]);
      return;
    }

    // Find previous successful scan
    const successfulScans = allScans
      .filter(s => s.status === 'success')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const currentIdx = successfulScans.findIndex(s => s.id === scan.id);
    const prevScan = currentIdx > 0 ? successfulScans[currentIdx - 1] : null;
    
    setPreviousScan(prevScan);

    if (scan.content !== undefined) {
      const oldText = prevScan ? (prevScan.content || "") : "";
      const newText = scan.content || "";
      const calculatedDiff = diffLines(oldText, newText);
      setDiffParts(calculatedDiff);
    } else {
      // If content is not preloaded, fetch it
      setDiffParts([]);
    }
  };

  const handleRunAiAnalysis = async () => {
    if (!selectedScan) return;
    setIsAnalyzingAI(true);
    setAiError("");
    try {
      const analysisResult = await onTriggerAiAnalysis(selectedScan.id);
      // Update selectedScan with the returned analysis
      setSelectedScan(prev => prev ? { ...prev, aiAnalysis: analysisResult } : null);
      
      // Update in local scans array too
      setScans(prevScans => prevScans.map(s => s.id === selectedScan.id ? { ...s, aiAnalysis: analysisResult } : s));
    } catch (err: any) {
      setAiError(err.message || "Không thể khởi chạy phân tích an ninh AI.");
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const selectedTarget = targets.find(t => t.id === selectedTargetId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="diff-history">
      {/* Sidebar: Target Selection & Scan List */}
      <div className="lg:col-span-1 space-y-4">
        {/* Target Dropdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-sm">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mục tiêu giám sát</label>
          <select
            id="select-target"
            value={selectedTargetId}
            onChange={(e) => setSelectedTargetId(e.target.value)}
            className="w-full bg-white border border-slate-200 hover:border-slate-300 text-xs text-slate-800 rounded-lg p-2.5 outline-none font-bold transition"
          >
            <option value="">-- Chọn mục tiêu --</option>
            {targets.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.type.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* Scan List */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col min-h-[300px] max-h-[500px] shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pb-3 border-b border-slate-100 mb-3 flex items-center gap-1.5 shrink-0">
            <History className="w-3.5 h-3.5 text-slate-400" /> Lịch sử quét tài nguyên
          </h3>

          {isLoadingScans ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 py-10">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs font-medium">Đang tải lịch sử...</span>
            </div>
          ) : !selectedTargetId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center text-xs p-4 py-10 leading-relaxed font-medium">
              <CornerDownRight className="w-5 h-5 mb-2 text-indigo-500 animate-bounce" />
              Chọn một mục tiêu giám sát phía trên để bắt đầu xem lịch sử thay đổi.
            </div>
          ) : scans.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center text-xs p-4 py-10 leading-relaxed">
              <FileCode className="w-6 h-6 mb-2 text-slate-300" />
              Chưa có phiên bản quét nào được ghi nhận cho mục tiêu này.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {scans.map((scan) => {
                const isSelected = selectedScan?.id === scan.id;
                const isSuccess = scan.status === 'success';

                return (
                  <button
                    key={scan.id}
                    onClick={() => handleSelectScan(scan)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition flex flex-col gap-1.5 relative overflow-hidden ${
                      isSelected 
                        ? "bg-indigo-50/50 border-indigo-500 text-indigo-900 font-semibold shadow-sm" 
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    {/* Time & Hash */}
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[11px] flex items-center gap-1 text-slate-700">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        {new Date(scan.timestamp).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}{" "}
                        {new Date(scan.timestamp).toLocaleDateString("vi-VN", { month: '2-digit', day: '2-digit' })}
                      </span>
                      <span className="font-mono text-[9px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-bold">
                        {isSuccess ? scan.hash.substring(0, 7) : "LỖI"}
                      </span>
                    </div>

                    {/* Stats & Badge */}
                    <div className="flex items-center justify-between mt-1">
                      {isSuccess ? (
                        scan.isChange ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3 text-amber-500" /> THAY ĐỔI
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-400 text-[10px] font-bold">
                            ✓ Không thay đổi
                          </span>
                        )
                      ) : (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold">
                          ✖ Lỗi quét
                        </span>
                      )}

                      {isSuccess && scan.isChange && (
                        <span className="text-[10px] text-slate-500 font-semibold">
                          <span className="text-emerald-600 font-bold">+{scan.addedLines}</span>
                          {" / "}
                          <span className="text-rose-600 font-bold">-{scan.deletedLines}</span>
                        </span>
                      )}
                    </div>

                    {/* AI Analysis mini indicator */}
                    {scan.aiAnalysis && (
                      <div className={`mt-1.5 pt-1.5 border-t border-slate-100 flex items-center gap-1 text-[10px] font-bold ${
                        scan.aiAnalysis.riskLevel === "HIGH" ? "text-rose-600" :
                        scan.aiAnalysis.riskLevel === "MEDIUM" ? "text-amber-700" :
                        "text-emerald-700"
                      }`}>
                        <BrainCircuit className="w-3.5 h-3.5 shrink-0" />
                        AI: Nguy cơ {scan.aiAnalysis.riskLevel}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Diff & AI Analysis Display */}
      <div className="lg:col-span-3 space-y-6">
        {!selectedScan ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center py-20 space-y-3 flex flex-col justify-center items-center min-h-[460px] shadow-sm">
            <History className="w-12 h-12 text-slate-300 animate-pulse" />
            <h3 className="font-display font-bold text-slate-600">Chọn lịch sử quét để xem chi tiết</h3>
            <p className="text-slate-400 text-xs max-w-sm font-medium leading-relaxed">
              Sau khi chọn một bản ghi lịch sử, hệ thống sẽ tiến hành so sánh từng dòng mã và cung cấp báo cáo phân tích bảo mật AI.
            </p>
          </div>
        ) : selectedScan.status === 'failed' ? (
          <div className="bg-white border border-rose-200 rounded-xl p-6 min-h-[460px] flex flex-col justify-center items-center text-center space-y-4 shadow-sm">
            <AlertCircle className="w-12 h-12 text-rose-500" />
            <div className="space-y-1.5">
              <h3 className="font-display font-bold text-base text-rose-600">Tác vụ Quét Thất Bại</h3>
              <p className="text-slate-500 text-xs max-w-md">Bản ghi quét ngày {new Date(selectedScan.timestamp).toLocaleString("vi-VN")} không thành công do lỗi kết nối hoặc phản hồi HTTP không hợp lệ.</p>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded p-4 max-w-lg w-full font-mono text-xs text-rose-700 text-left overflow-x-auto leading-relaxed">
              {selectedScan.errorMessage || "Lỗi phản hồi máy chủ không phản hồi."}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Version Overview Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-800">So sánh phiên bản quét lịch sử</h3>
                  <p className="text-slate-500 text-xs mt-1">
                    Thực hiện so sánh giữa bản quét hiện tại với phiên bản quét thành công trước đó.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
                  {previousScan ? (
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">{previousScan.hash.substring(0, 8)}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100">{selectedScan.hash.substring(0, 8)}</span>
                    </div>
                  ) : (
                    <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 font-bold">Phiên bản đầu tiên (Không có lịch sử trước đó)</span>
                  )}
                </div>
              </div>

              {/* Add/Del lines summary bar */}
              {selectedScan.isChange && (
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex justify-between items-center text-xs text-slate-600">
                  <div className="flex gap-4 font-bold">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded"></span> Thêm mới: <strong className="text-emerald-600 font-mono font-bold">+{selectedScan.addedLines}</strong> dòng</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-500 rounded"></span> Xóa bỏ: <strong className="text-rose-600 font-mono font-bold">-{selectedScan.deletedLines}</strong> dòng</span>
                  </div>
                  <span className="text-slate-400 italic text-[11px] font-semibold hidden sm:inline">Thay đổi được làm sạch & chuẩn hóa trước khi so sánh</span>
                </div>
              )}
            </div>

            {/* AI Security Assessment Section */}
            {selectedScan.isChange ? (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                {/* AI Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg shrink-0">
                      <BrainCircuit className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm text-slate-800 flex items-center gap-1.5">
                        Phân tích An ninh AI <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold tracking-wider">GEMINI AI</span>
                      </h4>
                      <p className="text-slate-500 text-[11px] mt-0.5 font-medium">Tự động rà soát mã độc, kiểm duyệt mã script lạ, phân tích hành vi độc hại ẩn giấu trong mã nguồn.</p>
                    </div>
                  </div>
                  
                  {!selectedScan.aiAnalysis && (
                    <button
                      id="btn-run-ai"
                      onClick={handleRunAiAnalysis}
                      disabled={isAnalyzingAI}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:bg-slate-100 disabled:text-slate-300 text-white font-bold text-xs rounded-lg shadow-sm transition whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {isAnalyzingAI ? (
                        <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang chạy phân tích...</>
                      ) : (
                        <><Sparkles className="w-3.5 h-3.5" /> Phân tích thay đổi</>
                      )}
                    </button>
                  )}
                </div>

                {/* AI Error */}
                {aiError && (
                  <div className="p-4 mx-5 mt-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-600 flex items-start gap-2.5 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{aiError}</span>
                  </div>
                )}

                {/* AI Loading state */}
                {isAnalyzingAI && (
                  <div className="p-10 text-center space-y-4 flex flex-col items-center justify-center">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <div className="absolute inset-0 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                      <BrainCircuit className="w-5 h-5 text-indigo-600 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-indigo-600 animate-pulse">Gemini đang giải nén diff mã và phân tích...</h5>
                      <p className="text-[10px] text-slate-400 max-w-sm font-medium">Quá trình này rà soát cú pháp, phân tích rủi ro XSS, theo dõi cookie hijack, kiểm tra an toàn CDN bên thứ ba.</p>
                    </div>
                  </div>
                )}

                {/* AI Analysis Result Report */}
                {selectedScan.aiAnalysis ? (
                  <div className="p-5 space-y-4 text-slate-800">
                    {/* Risk Badge and Summary Banner */}
                    <div className={`p-4 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
                      selectedScan.aiAnalysis.riskLevel === 'HIGH' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                      selectedScan.aiAnalysis.riskLevel === 'MEDIUM' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                      'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                      {/* Risk Icon */}
                      <div className={`p-2.5 rounded-lg border ${
                        selectedScan.aiAnalysis.riskLevel === 'HIGH' ? 'bg-rose-100 border-rose-200 text-rose-600' :
                        selectedScan.aiAnalysis.riskLevel === 'MEDIUM' ? 'bg-amber-100 border-amber-200 text-amber-600' :
                        'bg-emerald-100 border-emerald-200 text-emerald-600'
                      }`}>
                        {selectedScan.aiAnalysis.riskLevel === 'HIGH' ? <ShieldAlert className="w-6 h-6" /> :
                         selectedScan.aiAnalysis.riskLevel === 'MEDIUM' ? <AlertTriangle className="w-6 h-6" /> :
                         <ShieldCheck className="w-6 h-6" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold tracking-wider uppercase">Đánh giá nguy cơ an ninh</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            selectedScan.aiAnalysis.riskLevel === 'HIGH' ? 'bg-rose-100/60 border-rose-300 text-rose-700' :
                            selectedScan.aiAnalysis.riskLevel === 'MEDIUM' ? 'bg-amber-100/60 border-amber-300 text-amber-700' :
                            'bg-emerald-100/60 border-emerald-300 text-emerald-700'
                          }`}>
                            NGUY CƠ {selectedScan.aiAnalysis.riskLevel}
                          </span>
                        </div>
                        <p className="text-slate-800 text-xs font-bold leading-relaxed">
                          {selectedScan.aiAnalysis.summary}
                        </p>
                      </div>
                    </div>

                    {/* Detailed Analysis Text */}
                    <div className="space-y-2.5">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-500" /> Báo cáo giải trình chi tiết
                      </h5>
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 text-xs text-slate-700 leading-relaxed space-y-2 whitespace-pre-wrap font-medium">
                        {selectedScan.aiAnalysis.details}
                      </div>
                    </div>

                    {/* Footer stats */}
                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-3 font-semibold">
                      <span>Phân tích lúc: {new Date(selectedScan.aiAnalysis.analyzedAt).toLocaleString("vi-VN")}</span>
                      <span>Mô hình thông minh: Gemini-2.5-Flash</span>
                    </div>
                  </div>
                ) : (
                  !isAnalyzingAI && (
                    <div className="p-8 text-center text-slate-400 text-xs font-medium flex flex-col justify-center items-center">
                      <Sparkles className="w-5 h-5 text-indigo-400 mb-1.5 animate-pulse" />
                      Mã tài nguyên đã thay đổi. Vui lòng bấm vào "Phân tích thay đổi" để đánh giá mức độ rủi ro bảo mật mã nguồn.
                    </div>
                  )
                )}
              </div>
            ) : (
              // No change detected
              <div className="bg-white border border-slate-200 rounded-xl p-5 text-xs text-slate-500 flex items-center gap-2.5 shadow-sm font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Không phát hiện thay đổi so với phiên bản trước. Không cần rà soát phân tích an ninh AI.</span>
              </div>
            )}

            {/* Code Diff Display */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50/50 border-b border-slate-100 px-5 py-4 flex justify-between items-center">
                <h4 className="font-display font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-slate-400" /> Bản so sánh chi tiết mã nguồn (Line-by-line Diff)
                </h4>
                <span className="text-[10px] text-slate-400 font-mono font-bold">Bố cục gộp (Unified)</span>
              </div>

              {!previousScan ? (
                // First Scan Output (No Diff, just full code render)
                <div className="p-5 font-mono text-xs overflow-x-auto bg-slate-50 text-slate-700 leading-relaxed max-h-[500px]">
                  <div className="text-slate-400 pb-3 border-b border-slate-100 mb-3 italic font-semibold">
                    Đây là phiên bản quét đầu tiên thành công của tài nguyên này. Hiển thị toàn bộ nội dung mã:
                  </div>
                  <pre className="text-slate-800">
                    {selectedScan.content || "Nội dung trống."}
                  </pre>
                </div>
              ) : diffParts.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs italic font-medium">
                  Không phát hiện khác biệt dòng mã giữa 2 phiên bản quét.
                </div>
              ) : (
                // Code rendering with lines highlighted
                <div className="font-mono text-[11px] overflow-x-auto bg-white select-text leading-relaxed max-h-[600px]">
                  <table className="w-full table-auto border-collapse text-left">
                    <tbody>
                      {(() => {
                        let oldLineNum = 1;
                        let newLineNum = 1;
                        
                        return diffParts.map((part, index) => {
                          const lines = part.value.split('\n');
                          // Filter out last line if empty
                          if (lines.length > 1 && lines[lines.length - 1] === '') {
                            lines.pop();
                          }

                          return lines.map((line: string, lineIdx: number) => {
                            const isAdded = part.added;
                            const isRemoved = part.removed;
                            
                            let lineClass = "text-slate-700 hover:bg-slate-50/40";
                            let numClass = "text-slate-400 bg-slate-50/50";
                            let sign = " ";
                            
                            if (isAdded) {
                              lineClass = "bg-emerald-50 text-emerald-800 hover:bg-emerald-100/50 font-semibold";
                              numClass = "text-emerald-700 bg-emerald-100/30";
                              sign = "+";
                            } else if (isRemoved) {
                              lineClass = "bg-rose-50/60 text-rose-700 hover:bg-rose-100/30 line-through";
                              numClass = "text-rose-700 bg-rose-100/20";
                              sign = "-";
                            }

                            const oldNumStr = isAdded ? "" : oldLineNum++;
                            const newNumStr = isRemoved ? "" : newLineNum++;

                            return (
                              <tr key={`${index}-${lineIdx}`} className={lineClass}>
                                {/* Old Line Number */}
                                <td className={`w-12 text-right select-none pr-3 border-r border-slate-100 font-mono text-[10px] ${numClass}`}>
                                  {oldNumStr}
                                </td>
                                {/* New Line Number */}
                                <td className={`w-12 text-right select-none pr-3 border-r border-slate-100 font-mono text-[10px] ${numClass}`}>
                                  {newNumStr}
                                </td>
                                {/* Sign indicator */}
                                <td className="w-6 text-center select-none font-bold font-mono text-slate-400 px-1 border-r border-slate-100">
                                  {sign}
                                </td>
                                {/* Code line content */}
                                <td className="pl-4 py-0.5 whitespace-pre font-mono text-slate-800">
                                  {line}
                                </td>
                              </tr>
                            );
                          });
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
