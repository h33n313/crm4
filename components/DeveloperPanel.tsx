import React, { useState, useEffect } from 'react';
import { Settings, SurveyQuestion, AppUser } from '../types';
import { getSettings, saveSettings, backupData, restoreData, checkHealth, getSystemLogs, logAction, performFullRestore } from '../services/dataService';
// Added RefreshCw to imports to fix missing name error
import { Download, Upload, Settings as SettingsIcon, UserPlus, Trash2, Edit2, Key, List, Plus, ArrowUp, ArrowDown, CheckSquare, Square, Palette, Wifi, WifiOff, FileText, Activity, QrCode, Cpu, Check, Mic, Brain, Languages, Globe, Bot, Zap, Sparkles, HardDrive, PlusCircle, RefreshCw } from 'lucide-react';
// @ts-ignore
import * as XLSX from 'xlsx';
import Header from './Header';

const DeveloperPanel: React.FC = () => {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'questions' | 'backup' | 'general' | 'logs' | 'qr'>('users');
    const [isConnected, setIsConnected] = useState<boolean>(false);
    
    const [testGeminiStatus, setTestGeminiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    useEffect(() => {
        loadData();
        checkConnection();
    }, []);

    const loadData = async () => {
        const s = await getSettings();
        setSettings(s);
    };

    const checkConnection = async () => {
        const status = await checkHealth();
        setIsConnected(status);
    };

    const handleSave = async (s: Settings) => {
        setSettings(s);
        await saveSettings(s);
        setMessage('تغییرات با موفقیت ذخیره شد');
        setTimeout(() => setMessage(''), 3000);
    };

    const testGeminiApi = async () => {
        setTestGeminiStatus('loading');
        try {
            if(settings) await saveSettings(settings);
            const res = await fetch('/api/test-gemini', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                setTestGeminiStatus('success');
            } else {
                setTestGeminiStatus('error');
                alert('خطا در تست: ' + (data.error || 'Unknown Error'));
            }
        } catch (e: any) {
            setTestGeminiStatus('error');
            alert('خطای شبکه: ' + e.message);
        } finally {
            setTimeout(() => setTestGeminiStatus('idle'), 3000);
        }
    };

    // Dynamic Gemini List Management
    const addGeminiKey = () => {
        if (!settings) return;
        const keys = [...(settings.geminiApiKeys || []), ''];
        setSettings({...settings, geminiApiKeys: keys});
    };

    const updateGeminiKey = (idx: number, val: string) => {
        if (!settings) return;
        const keys = [...(settings.geminiApiKeys || [])];
        keys[idx] = val;
        setSettings({...settings, geminiApiKeys: keys});
    };

    const removeGeminiKey = (idx: number) => {
        if (!settings) return;
        const keys = settings.geminiApiKeys?.filter((_, i) => i !== idx);
        handleSave({...settings, geminiApiKeys: keys});
    };

    if (!settings) return <div className="p-10 text-center font-bold">در حال بارگذاری...</div>;

    return (
        <div className="min-h-screen pb-10">
            <Header title="تنظیمات توسعه‌دهنده" showLogout />
            {message && <div className="fixed bottom-5 left-5 bg-emerald-600 text-white px-4 py-2 rounded-xl z-50 animate-bounce shadow-lg">{message}</div>}

            <div className="max-w-7xl mx-auto px-4 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Navigation Sidebar */}
                    <div className="glass-panel p-4 rounded-3xl h-fit flex flex-row lg:flex-col gap-2 overflow-x-auto">
                        <button onClick={() => setActiveTab('users')} className={`p-4 rounded-2xl font-bold flex items-center gap-3 transition-all whitespace-nowrap ${activeTab==='users'?'bg-blue-600 text-white shadow-lg':'text-slate-500 hover:bg-white/40'}`}><UserPlus className="w-5 h-5"/> مدیریت کاربران</button>
                        <button onClick={() => setActiveTab('general')} className={`p-4 rounded-2xl font-bold flex items-center gap-3 transition-all whitespace-nowrap ${activeTab==='general'?'bg-blue-600 text-white shadow-lg':'text-slate-500 hover:bg-white/40'}`}><SettingsIcon className="w-5 h-5"/> تنظیمات سرویس‌ها</button>
                        <button onClick={() => setActiveTab('backup')} className={`p-4 rounded-2xl font-bold flex items-center gap-3 transition-all whitespace-nowrap ${activeTab==='backup'?'bg-blue-600 text-white shadow-lg':'text-slate-500 hover:bg-white/40'}`}><Download className="w-5 h-5"/> پشتیبان‌گیری</button>
                    </div>

                    <div className="lg:col-span-3">
                        {activeTab === 'general' && (
                             <div className="glass-panel p-8 rounded-3xl space-y-10 animate-fade-in">
                                 <div>
                                     <label className="block mb-3 font-black text-slate-800 dark:text-white text-lg flex items-center gap-2"><Sparkles className="w-6 h-6 text-purple-500"/> مدیریت کلیدهای Gemini</label>
                                     <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-4">
                                         {(settings.geminiApiKeys || []).map((key, idx) => (
                                             <div key={idx} className="flex gap-2 group animate-fade-in">
                                                 <input 
                                                    className="flex-1 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono dark:text-white outline-none focus:border-blue-500 shadow-sm" 
                                                    dir="ltr" value={key} 
                                                    onChange={e => updateGeminiKey(idx, e.target.value)}
                                                    onBlur={() => handleSave(settings)}
                                                    placeholder={`Enter Gemini Key #${idx + 1}...`}
                                                 />
                                                 <button onClick={() => removeGeminiKey(idx)} className="p-4 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors"><Trash2 className="w-5 h-5"/></button>
                                             </div>
                                         ))}
                                         <div className="flex justify-between items-center pt-2">
                                             <button onClick={addGeminiKey} className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-6 py-3 rounded-xl font-black hover:bg-emerald-200 transition-all active:scale-95 shadow-sm">
                                                 <PlusCircle className="w-5 h-5"/> افزودن کلید جدید
                                             </button>
                                             {(settings.geminiApiKeys || []).length > 0 && (
                                                 <button onClick={testGeminiApi} disabled={testGeminiStatus === 'loading'} className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-black hover:bg-blue-700 shadow-lg disabled:opacity-50">
                                                     {testGeminiStatus === 'loading' ? <RefreshCw className="w-5 h-5 animate-spin"/> : <Zap className="w-5 h-5"/>}
                                                     تست و عیب‌یابی کلیدها
                                                 </button>
                                             )}
                                         </div>
                                     </div>
                                     <p className="text-xs text-slate-500 mt-4 leading-relaxed">سیستم به ترتیب از بالا از کلیدها استفاده می‌کند. اگر کلیدی با محدودیت مواجه شود، به طور خودکار کلید بعدی امتحان می‌شود.</p>
                                 </div>

                                 <div className="pt-8 border-t space-y-6">
                                     <label className="block font-black text-slate-800 dark:text-white text-lg">سایر تنظیمات سرویس</label>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                         <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                             <label className="text-sm font-bold block mb-2">حالت پیش‌فرض تبدیل صدا</label>
                                             <select value={settings.transcriptionMode} onChange={e => handleSave({...settings, transcriptionMode: e.target.value as any})} className="w-full p-3 rounded-xl bg-white border outline-none font-bold">
                                                 <option value="gemini">Gemini (بسیار دقیق)</option>
                                                 <option value="iotype">IOType (سریع)</option>
                                                 <option value="browser">مرورگر (رایگان)</option>
                                             </select>
                                         </div>
                                         <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                             <label className="text-sm font-bold block mb-2">کلید IOType</label>
                                             <input type="password" value={settings.iotypeApiKey} onChange={e => setSettings({...settings, iotypeApiKey: e.target.value})} onBlur={() => handleSave(settings)} className="w-full p-3 rounded-xl bg-white border outline-none font-mono" placeholder="API Key..."/>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeveloperPanel;