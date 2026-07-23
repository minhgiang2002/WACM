import React, { useState } from "react";
import { 
  Settings as SettingsIcon, Bell, Slack, Send, ShieldCheck, 
  HelpCircle, CheckCircle2, XCircle, RefreshCw, Clock, Save
} from "lucide-react";
import { Settings } from "../types";

interface SettingsPanelProps {
  settings: Settings;
  onSaveSettings: (settingsData: Settings) => Promise<void>;
  onTestWebhooks: (testData: { telegramToken: string; telegramChatId: string; slackWebhook: string }) => Promise<any>;
}

export default function SettingsPanel({
  settings,
  onSaveSettings,
  onTestWebhooks
}: SettingsPanelProps) {
  // Local form states
  const [telegramToken, setTelegramToken] = useState(settings.telegramToken || "");
  const [telegramChatId, setTelegramChatId] = useState(settings.telegramChatId || "");
  const [slackWebhook, setSlackWebhook] = useState(settings.slackWebhook || "");
  const [enableAutoAI, setEnableAutoAI] = useState(settings.enableAutoAI || false);
  const [scanIntervalHours, setScanIntervalHours] = useState(settings.scanIntervalHours || 12);

  // Status states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [saveError, setSaveError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError("");
    try {
      await onSaveSettings({
        telegramToken,
        telegramChatId,
        slackWebhook,
        enableAutoAI,
        scanIntervalHours: Number(scanIntervalHours)
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Lỗi lưu cấu hình hệ thống.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestWebhooks = async () => {
    setIsTesting(true);
    setTestResults(null);
    try {
      const results = await onTestWebhooks({
        telegramToken,
        telegramChatId,
        slackWebhook
      });
      setTestResults(results);
    } catch (err: any) {
      setTestResults({ error: err.message || "Không thể thực hiện kết nối thử nghiệm." });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="settings-panel">
      {/* Left 2 Columns: Form settings */}
      <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
        
        {/* Alerts & Webhooks Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm">
          <h3 className="text-sm font-display font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-400" /> Tích hợp Hệ thống Cảnh báo (Alert Channels)
          </h3>
          
          <p className="text-slate-500 text-xs leading-relaxed font-medium">
            Hệ thống sẽ gửi cảnh báo tức thì ngay khi phát hiện bất kỳ thay đổi nào trong mã nguồn tài nguyên web hoặc xảy ra sự cố giám sát đến các kênh cấu hình dưới đây.
          </p>

          <div className="space-y-4">
            
            {/* Telegram config */}
            <div className="space-y-3 p-4 bg-slate-50/50 border border-slate-100 rounded-lg">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Send className="w-4 h-4 text-blue-500" /> Cảnh báo qua Telegram Bot
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500">Telegram Bot Token</label>
                  <input
                    type="password"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    placeholder="1234567890:ABCdefGhI..."
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-slate-800 outline-none transition font-mono"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500">Telegram Chat ID (Cá nhân hoặc Nhóm)</label>
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="-100123456789 hoặc 12345678"
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-slate-800 outline-none transition font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                Lưu ý: Bạn cần tạo Bot qua @BotFather và mời Bot vào cuộc trò chuyện/nhóm mong muốn trước khi nhận thông báo.
              </p>
            </div>

            {/* Slack config */}
            <div className="space-y-3 p-4 bg-slate-50/50 border border-slate-100 rounded-lg">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Slack className="w-4 h-4 text-purple-600" /> Cảnh báo qua Slack Webhook
              </div>
              
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-slate-500">Incoming Webhook URL</label>
                <input
                  type="password"
                  value={slackWebhook}
                  onChange={(e) => setSlackWebhook(e.target.value)}
                  placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-slate-800 outline-none transition font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                Đường dẫn Webhook được lấy từ trang cấu hình "Incoming Webhooks" trong ứng dụng Slack của bạn.
              </p>
            </div>

          </div>
        </div>

        {/* Scheduler & AI Auto Configuration */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm">
          <h3 className="text-sm font-display font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" /> Lập lịch Quét & Thiết lập Trí tuệ Nhân tạo
          </h3>

          <div className="space-y-5">
            
            {/* Scan interval */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50/50 border border-slate-100 rounded-lg">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-700">Tần suất quét định kỳ</h4>
                <p className="text-[11px] text-slate-400 font-semibold">Đặt khoảng thời gian cách nhau giữa các lần quét tự động các mục tiêu đang hoạt động.</p>
              </div>
              
              <div className="flex items-center gap-2.5">
                <select
                  value={scanIntervalHours}
                  onChange={(e) => setScanIntervalHours(Number(e.target.value))}
                  className="bg-white border border-slate-200 hover:border-slate-300 text-xs text-slate-800 rounded-lg p-2.5 outline-none font-bold w-28 text-center transition"
                >
                  <option value={1}>1 giờ</option>
                  <option value={3}>3 giờ</option>
                  <option value={6}>6 giờ</option>
                  <option value={12}>12 giờ</option>
                  <option value={24}>24 giờ</option>
                </select>
              </div>
            </div>

            {/* Auto AI Toggle */}
            <div className="flex items-start justify-between gap-4 p-4 bg-slate-50/50 border border-slate-100 rounded-lg">
              <div className="space-y-0.5 max-w-md">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  Tự động phân tích an ninh AI khi có thay đổi
                </h4>
                <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                  Khi phát hiện có sự thay đổi mã nguồn, hệ thống sẽ ngay lập tức sử dụng Gemini AI để rà soát rủi ro bảo mật trong chế độ nền và đính kèm báo cáo vào cảnh báo.
                </p>
              </div>
              
              <div className="flex items-center h-5 shrink-0">
                <input
                  type="checkbox"
                  checked={enableAutoAI}
                  onChange={(e) => setEnableAutoAI(e.target.checked)}
                  className="w-4.5 h-4.5 bg-white border border-slate-200 text-indigo-600 rounded cursor-pointer focus:ring-0"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Submit Save status bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
          <div className="shrink-0 text-left">
            {saveSuccess && (
              <span className="text-emerald-600 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Đã lưu mọi thay đổi thành công!
              </span>
            )}
            {saveError && (
              <span className="text-rose-600 text-xs font-bold flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-500" /> Lỗi: {saveError}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white text-xs font-bold rounded-lg shadow-sm transition whitespace-nowrap cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Đang lưu cấu hình..." : "Lưu cấu hình"}
          </button>
        </div>

      </form>

      {/* Right Column: Webhook Integration Testing Playground */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 h-fit shadow-sm">
        <h3 className="text-sm font-display font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-400" /> Phòng thử nghiệm Cảnh báo
        </h3>
        
        <p className="text-slate-500 text-xs leading-relaxed font-medium">
          Sử dụng bảng này để gửi một thông báo kiểm tra kết nối mạng thực tế đến các webhook Telegram/Slack bạn vừa nhập ở bên trái trước khi lưu cấu hình.
        </p>

        <button
          type="button"
          onClick={handleTestWebhooks}
          disabled={isTesting || (!telegramToken && !slackWebhook)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 text-slate-700 text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
        >
          {isTesting ? (
            <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang truyền tín hiệu...</>
          ) : (
            "Gửi thông báo thử nghiệm"
          )}
        </button>

        {testResults && (
          <div className="space-y-3 pt-2">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kết quả kết nối</h4>
            
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3.5 space-y-2 text-xs font-mono text-slate-700">
              {testResults.error ? (
                <div className="text-rose-600 flex items-start gap-1.5 leading-relaxed font-semibold">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{testResults.error}</span>
                </div>
              ) : (
                <div className="space-y-2 font-bold">
                  {telegramToken && (
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-400 font-sans font-semibold">Telegram Bot:</span>
                      <span className={testResults.telegram?.startsWith("Gửi") ? "text-emerald-600" : "text-amber-600"}>
                        {testResults.telegram || "Chưa gửi"}
                      </span>
                    </div>
                  )}
                  {slackWebhook && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-400 font-sans font-semibold">Slack Webhook:</span>
                      <span className={testResults.slack?.startsWith("Gửi") ? "text-emerald-600" : "text-amber-600"}>
                        {testResults.slack || "Chưa gửi"}
                      </span>
                    </div>
                  )}
                  {!telegramToken && !slackWebhook && (
                    <span className="text-slate-400 italic font-sans font-semibold">Vui lòng nhập Token Telegram hoặc Webhook Slack để thực hiện kiểm tra.</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
