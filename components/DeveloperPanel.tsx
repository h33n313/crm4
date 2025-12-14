
import React, { useState, useEffect } from 'react';
import { Settings, SurveyQuestion, AppUser } from '../types';
import { getSettings, saveSettings, backupData, restoreData, checkHealth, getSystemLogs, logAction, performFullRestore } from '../services/dataService';
import { Download, Upload, Settings as SettingsIcon, UserPlus, Trash2, Edit2, Key, List, Plus, ArrowUp, ArrowDown, CheckSquare, Square, Palette, Wifi, WifiOff, FileText, Activity, QrCode, Cpu, Check, Mic, Brain, Languages, Globe, Bot, Zap, Sparkles, HardDrive } from 'lucide-react';
// @ts-ignore
import * as XLSX from 'xlsx';
import Header from './Header';

const formatLogDate = (iso: string) => {
    try {
        return new Date(iso).toLocaleString('fa-IR');
    } catch {
        return iso;
    }
};

const DeveloperPanel: React.FC = () => {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'questions' | 'backup' | 'general' | 'logs' | 'qr'>('users');
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [systemLogs, setSystemLogs] = useState<any[]>([]);
    
    const [testOpenaiStatus, setTestOpenaiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [testIOTypeStatus, setTestIOTypeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [testTalkBotStatus, setTestTalkBotStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [testGroqStatus, setTestGroqStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [testGeminiStatus, setTestGeminiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    
    const [editingQuestion, setEditingQuestion] = useState<Partial<SurveyQuestion> | null>(null);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    
    const [editingUser, setEditingUser] = useState<Partial<AppUser> | null>(null);
    const [showUserModal, setShowUserModal] = useState(false);
    
    // Backup State
    const [isRestoring, setIsRestoring] = useState(false);

    const AVAILABLE_ICONS = ['Stethoscope', 'Activity', 'Thermometer', 'Heart', 'Pill', 'ShieldPlus', 'Syringe', 'Brain', 'Dna'];

    useEffect(() => {
        loadData();
        checkConnection();
    }, []);

    useEffect(() => {
        if (activeTab === 'logs') {
            loadLogs();
        }
    }, [activeTab]);

    const loadData = async () => {
        const s = await getSettings();
        setSettings(s);
    };

    const checkConnection = async () => {
        const status = await checkHealth();
        setIsConnected(status);
    };

    const loadLogs = () => {
        const logs = getSystemLogs();
        setSystemLogs(logs);
    };

    const showMessage = (msg: string) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 3000);
    };

    const handleSave = async (s: Settings) => {
        setSettings(s);
        await saveSettings(s);
        showMessage('تغییرات با موفقیت ذخیره شد');
        
        if (!isConnected) {
            setTimeout(() => {
                window.dispatchEvent(new Event('storage'));
            }, 100);
        }
    };

    const testOpenaiApi = async () => {
        setTestOpenaiStatus('loading');
        try {
            if(settings) await saveSettings(settings);
            const res = await fetch('/api/test-openai', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setTestOpenaiStatus('success');
                showMessage('ارتباط با OpenAI موفقیت‌آمیز بود');
            } else {
                setTestOpenaiStatus('error');
                alert('خطا در OpenAI: ' + (data.error || 'Unknown Error'));
            }
        } catch (e: any) {
            setTestOpenaiStatus('error');
            alert('خطای شبکه: ' + e.message);
        } finally {
            setTimeout(() => setTestOpenaiStatus('idle'), 3000);
        }
    };

    const testIOTypeApi = async () => {
        setTestIOTypeStatus('loading');
        try {
            if(settings) await saveSettings(settings);
            const res = await fetch('/api/test-iotype', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setTestIOTypeStatus('success');
                showMessage('ارتباط با IOType موفقیت‌آمیز بود');
            } else {
                setTestIOTypeStatus('error');
                alert('خطا در IOType: ' + (data.error || 'Unknown Error'));
            }
        } catch (e: any) {
            setTestIOTypeStatus('error');
            alert('خطای شبکه: ' + e.message);
        } finally {
            setTimeout(() => setTestIOTypeStatus('idle'), 3000);
        }
    };

    const testTalkBotApi = async () => {
        setTestTalkBotStatus('loading');
        try {
            if(settings) await saveSettings(settings);
            const res = await fetch('/api/test-talkbot', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setTestTalkBotStatus('success');
                showMessage('ارتباط با TalkBot موفقیت‌آمیز بود');
            } else {
                setTestTalkBotStatus('error');
                alert('خطا در TalkBot: ' + (data.error || 'Unknown Error'));
            }
        } catch (e: any) {
            setTestTalkBotStatus('error');
            alert('خطای شبکه: ' + e.message);
        } finally {
            setTimeout(() => setTestTalkBotStatus('idle'), 3000);
        }
    };

    const testGroqApi = async () => {
        setTestGroqStatus('loading');
        try {
            if(settings) await saveSettings(settings);
            const res = await fetch('/api/test-groq', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setTestGroqStatus('success');
                showMessage('ارتباط با Groq موفقیت‌آمیز بود');
            } else {
                setTestGroqStatus('error');
                alert('خطا در Groq: ' + (data.error || 'Unknown Error'));
            }
        } catch (e: any) {
            setTestGroqStatus('error');
            alert('خطای شبکه: ' + e.message);
        } finally {
            setTimeout(() => setTestGroqStatus('idle'), 3000);
        }
    };

    const testGeminiApi = async () => {
        setTestGeminiStatus('loading');
        try {
            if(settings) await saveSettings(settings);
            const res = await fetch('/api/test-gemini', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setTestGeminiStatus('success');
                showMessage('ارتباط با Gemini موفقیت‌آمیز بود');
            } else {
                setTestGeminiStatus('error');
                alert('خطا در Gemini: ' + (data.error || 'Unknown Error'));
            }
        } catch (e: any) {
            setTestGeminiStatus('error');
            alert('خطای شبکه: ' + e.message);
        } finally {
            setTimeout(() => setTestGeminiStatus('idle'), 3000);
        }
    };

    const saveUser = () => {
        if (!settings || !editingUser) return;
        if (!editingUser.username || !editingUser.name) return alert('نام و نام کاربری الزامی است');

        let newUsers = [...settings.users];
        const existingIndex = newUsers.findIndex(u => u.id === editingUser.id);

        const userToSave: AppUser = {
            id: editingUser.id || `user_${Date.now()}`,
            name: editingUser.name!,
            username: editingUser.username!,
            role: editingUser.role || 'staff',
            isPasswordEnabled: editingUser.isPasswordEnabled || false,
            password: editingUser.password || '',
            avatarColor: editingUser.avatarColor || 'bg-slate-500'
        };

        if (existingIndex >= 0) {
            newUsers[existingIndex] = userToSave;
            logAction('WARN', `کاربر ویرایش شد: ${userToSave.name}`);
        } else {
            newUsers.push(userToSave);
            logAction('INFO', `کاربر جدید ایجاد شد: ${userToSave.name}`);
        }

        handleSave({...settings, users: newUsers});
        setShowUserModal(false);
        setEditingUser(null);
    };
    
    const deleteUser = (id: string) => {
        if (!settings || !window.confirm('آیا از حذف این کاربر اطمینان دارید؟')) return;
        handleSave({...settings, users: settings.users.filter(u => u.id !== id)});
        logAction('WARN', `کاربر حذف شد: ${id}`);
    };

    const saveQuestion = () => {
        if (!settings || !editingQuestion) return;
        if (!editingQuestion.text) return alert('متن سوال الزامی است');

        let newQs = [...settings.questions];
        const existingIndex = newQs.findIndex(q => q.id === editingQuestion.id);

        const qToSave: SurveyQuestion = {
            id: editingQuestion.id || `q_${Date.now()}`,
            text: editingQuestion.text!,
            type: editingQuestion.type || 'yes_no',
            order: editingQuestion.order || newQs.length + 1,
            visibility: editingQuestion.visibility || 'all',
            category: editingQuestion.category || 'all'
        };

        if (existingIndex >= 0) {
            newQs[existingIndex] = qToSave;
            logAction('INFO', `سوال ویرایش شد: ${qToSave.id}`);
        } else {
            newQs.push(qToSave);
            logAction('INFO', `سوال جدید ایجاد شد: ${qToSave.id}`);
        }

        handleSave({ ...settings, questions: newQs });
        setShowQuestionModal(false);
        setEditingQuestion(null);
    };

    const deleteQuestion = (id: string, text: string) => {
        if (!settings) return;
        if (!window.confirm(`آیا از حذف سوال "${text}" اطمینان دارید؟`)) return;
        const newQs = settings.questions.filter(q => q.id !== id);
        handleSave({ ...settings, questions: newQs });
        logAction('WARN', `سوال حذف شد: ${id}`);
    };

    const moveQuestion = (index: number, direction: 'up' | 'down') => {
        if (!settings) return;
        const qs = [...settings.questions];
        if (direction === 'up' && index > 0) {
            [qs[index], qs[index-1]] = [qs[index-1], qs[index]];
        } else if (direction === 'down' && index < qs.length - 1) {
            [qs[index], qs[index+1]] = [qs[index+1], qs[index]];
        }
        qs.forEach((q, i) => q.order = i + 1);
        handleSave({ ...settings, questions: qs });
    };

    const toggleIcon = (icon: string) => {
        if (!settings) return;
        let current = settings.enabledIcons || AVAILABLE_ICONS;
        if (current.includes(icon)) {
            current = current.filter(i => i !== icon);
        } else {
            current = [...current, icon];
        }
        handleSave({ ...settings, enabledIcons: current });
    };

    const doBackup = async () => {
        const rawData = await backupData();
        const flatData = rawData.map((item: any) => ({...item, id: item.id})); 
        const ws = XLSX.utils.json_to_sheet(flatData);
        const wb = XLSX.utils.book_new();
        // @ts-ignore
        wb.Views = [{ RTL: true }];
        XLSX.utils.book_append_sheet(wb, ws, "گزارش کامل");
        XLSX.writeFile(wb, "CRM_Backup_Full.xlsx");
        logAction('INFO', 'پشتیبان‌گیری اکسل (Data Only) انجام شد');
        showMessage('فایل اکسل دانلود شد');
    };
    
    const doRestore = (e: any) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (evt: any) => {
            const wb = XLSX.read(evt.target.result, {type:'binary'});
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            await restoreData(data);
            logAction('WARN', 'بازیابی اطلاعات از فایل اکسل');
            showMessage('اطلاعات با موفقیت بازیابی شد');
        };
        reader.readAsBinaryString(file);
    };

    // --- NEW DIRECT DOWNLOAD HANDLER ---
    // This bypasses the fetch -> blob -> download process which fails on large files/sandboxes
    const handleFullBackup = () => {
        if (!confirm('این عملیات تمام تنظیمات، فرم‌ها و فایل‌های صوتی را دانلود می‌کند. ممکن است کمی طول بکشد. ادامه می‌دهید؟')) return;
        
        // Create a temporary hidden link and click it
        const link = document.createElement("a");
        link.href = "/api/full-backup";
        link.target = "_blank"; // Optional: opens in new tab if needed, but for download usually triggers save
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        logAction('INFO', 'درخواست دانلود بکاپ کامل ارسال شد');
    };

    const handleFullRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];

        if (!confirm(`آیا مطمئن هستید؟ با بازیابی این فایل، تمام اطلاعات فعلی دیتابیس (شامل کاربران و فرم‌ها) حذف و با اطلاعات فایل جایگزین می‌شود!`)) {
            e.target.value = '';
            return;
        }

        setIsRestoring(true);
        const reader = new FileReader();
        reader.onload = async (evt: any) => {
            try {
                const json = JSON.parse(evt.target.result);
                await performFullRestore(json);
                logAction('WARN', 'بازگردانی کامل سیستم (Full Restore) انجام شد');
                alert('سیستم با موفقیت بازیابی شد. صفحه رفرش می‌شود.');
                window.location.reload();
            } catch (err: any) {
                alert('خطا در بازگردانی: فایل نامعتبر است یا حجم آن بسیار زیاد است. \n' + err.message);
            } finally {
                setIsRestoring(false);
            }
        };
        reader.readAsText(file);
    };


    if (!settings) return <div className="p-10 text-center text-slate-500 font-bold">در حال بارگذاری پنل...</div>;

    const sortedQuestions = [...settings.questions].sort((a,b) => a.order - b.order);

    return (
        <div className="min-h-screen pb-10">
            <Header title="پنل توسعه‌دهنده" showLogout />
            {message && <div className="fixed bottom-5 left-5 bg-emerald-600 text-white px-4 py-2 rounded-xl z-50 animate-bounce shadow-lg">{message}</div>}

            <div className="max-w-7xl mx-auto px-4 mt-6">
                
                <div className="mb-6 flex justify-end">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold ${isConnected ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {isConnected ? <Wifi className="w-4 h-4"/> : <WifiOff className="w-4 h-4"/>}
                        {isConnected ? 'متصل به سرور (MongoDB)' : 'حالت آفلاین (Local Storage)'}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="glass-panel p-4 rounded-3xl h-fit flex flex-row lg:flex-col gap-2 overflow-x-auto">
                        {[
                            {id: 'users', icon: UserPlus, label: 'مدیریت کاربران'},
                            {id: 'questions', icon: List, label: 'مدیریت سوالات'},
                            {id: 'qr', icon: QrCode, label: 'کد QR و لینک‌ها'},
                            {id: 'logs', icon: Activity, label: 'گزارشات سیستم'},
                            {id: 'backup', icon: Download, label: 'پشتیبان‌گیری'},
                            {id: 'general', icon: SettingsIcon, label: 'تنظیمات پایه'}
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-3 p-4 rounded-2xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-700/50'}`}
                            >
                                <tab.icon className="w-5 h-5" /> {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="lg:col-span-3">
                        
                        {activeTab === 'questions' && (
                            <div className="glass-panel p-6 rounded-3xl animate-fade-in">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                        <List className="w-6 h-6"/> مدیریت سوالات
                                    </h2>
                                    <button 
                                        onClick={() => { setEditingQuestion({}); setShowQuestionModal(true); }}
                                        className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-lg"
                                    >
                                        <Plus className="w-5 h-5"/> افزودن سوال
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {sortedQuestions.map((q, idx) => (
                                        <div key={q.id} className="bg-white/60 dark:bg-slate-800/60 p-4 rounded-2xl flex items-center gap-4 border border-slate-200 dark:border-slate-700 transition-all hover:border-blue-400">
                                            <div className="flex flex-col gap-1">
                                                <button onClick={() => moveQuestion(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-30"><ArrowUp className="w-4 h-4"/></button>
                                                <button onClick={() => moveQuestion(idx, 'down')} disabled={idx === sortedQuestions.length - 1} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-30"><ArrowDown className="w-4 h-4"/></button>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-800 dark:text-white">{q.text}</p>
                                                <div className="flex gap-2 mt-1 text-xs font-bold text-slate-500">
                                                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded">{q.type}</span>
                                                    <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-2 py-0.5 rounded">{q.category}</span>
                                                    {q.visibility === 'staff_only' && <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 px-2 py-0.5 rounded">فقط پرسنل</span>}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setEditingQuestion(q); setShowQuestionModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl"><Edit2 className="w-5 h-5"/></button>
                                                <button onClick={() => deleteQuestion(q.id, q.text)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="w-5 h-5"/></button>
                                            </div>
                                        </div>
                                    ))}
                                    {sortedQuestions.length === 0 && <div className="text-center py-10 text-slate-400">هیچ سوالی تعریف نشده است</div>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="glass-panel p-6 rounded-3xl animate-fade-in">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                        <UserPlus className="w-6 h-6"/> مدیریت کاربران
                                    </h2>
                                    <button 
                                        onClick={() => { setEditingUser({}); setShowUserModal(true); }}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg"
                                    >
                                        <Plus className="w-5 h-5"/> کاربر جدید
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {settings.users.map(u => (
                                        <div key={u.id} className="bg-white/60 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full ${u.avatarColor || 'bg-slate-500'} flex items-center justify-center text-white font-bold`}>{u.name.charAt(0)}</div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white">{u.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{u.username} • {u.role === 'admin' ? 'مدیر' : u.role === 'staff' ? 'پرسنل' : 'مهمان'}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingUser(u); setShowUserModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                                                <button onClick={() => deleteUser(u.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'general' && (
                             <div className="glass-panel p-6 rounded-3xl animate-fade-in space-y-8">
                                 {/* Settings content same as before */}
                                 <div>
                                    <label className="block mb-3 font-bold text-slate-700 dark:text-white text-lg">نام برند و سامانه</label>
                                    <input 
                                        className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xl font-bold dark:text-white outline-none focus:border-blue-500 transition-colors shadow-sm"
                                        value={settings.brandName}
                                        onChange={e => handleSave({...settings, brandName: e.target.value})}
                                    />
                                 </div>
                                 
                                 <div>
                                    <label className="block mb-3 font-bold text-slate-700 dark:text-white text-lg flex items-center gap-2"><Key className="w-5 h-5"/> رمز عبور پنل توسعه‌دهنده</label>
                                    <input 
                                        className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xl font-bold dark:text-white outline-none focus:border-blue-500 transition-colors shadow-sm tracking-widest text-center"
                                        value={settings.developerPassword || ''}
                                        onChange={e => handleSave({...settings, developerPassword: e.target.value})}
                                        placeholder="رمز عبور..."
                                    />
                                 </div>

                                 <div className="glass-card p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                                     <label className="block mb-4 font-bold text-slate-700 dark:text-white text-lg flex items-center gap-2"><Mic className="w-5 h-5 text-purple-500"/> تنظیمات تبدیل صدا به متن</label>
                                     
                                     <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-6 bg-slate-200 dark:bg-slate-800 p-1.5 rounded-2xl">
                                         <button 
                                             onClick={() => handleSave({...settings, transcriptionMode: 'openai'})}
                                             className={`py-3 rounded-xl font-bold transition-all text-xs md:text-sm flex items-center justify-center gap-1 ${settings.transcriptionMode === 'openai' ? 'bg-white dark:bg-purple-600 shadow text-purple-700 dark:text-white' : 'text-slate-500'}`}
                                         >
                                             <Brain className="w-4 h-4"/>
                                             OpenAI
                                         </button>
                                         <button 
                                             onClick={() => handleSave({...settings, transcriptionMode: 'iotype'})}
                                             className={`py-3 rounded-xl font-bold transition-all text-xs md:text-sm flex items-center justify-center gap-1 ${settings.transcriptionMode === 'iotype' ? 'bg-white dark:bg-purple-600 shadow text-purple-700 dark:text-white' : 'text-slate-500'}`}
                                         >
                                             <Languages className="w-4 h-4"/>
                                             IOType
                                         </button>
                                         <button 
                                             onClick={() => handleSave({...settings, transcriptionMode: 'talkbot'})}
                                             className={`py-3 rounded-xl font-bold transition-all text-xs md:text-sm flex items-center justify-center gap-1 ${settings.transcriptionMode === 'talkbot' ? 'bg-white dark:bg-purple-600 shadow text-purple-700 dark:text-white' : 'text-slate-500'}`}
                                         >
                                             <Bot className="w-4 h-4"/>
                                             TalkBot
                                         </button>
                                         <button 
                                             onClick={() => handleSave({...settings, transcriptionMode: 'groq'})}
                                             className={`py-3 rounded-xl font-bold transition-all text-xs md:text-sm flex items-center justify-center gap-1 ${settings.transcriptionMode === 'groq' ? 'bg-white dark:bg-purple-600 shadow text-purple-700 dark:text-white' : 'text-slate-500'}`}
                                         >
                                             <Zap className="w-4 h-4"/>
                                             Groq (High Speed)
                                         </button>
                                          <button 
                                             onClick={() => handleSave({...settings, transcriptionMode: 'gemini'})}
                                             className={`py-3 rounded-xl font-bold transition-all text-xs md:text-sm flex items-center justify-center gap-1 ${settings.transcriptionMode === 'gemini' ? 'bg-white dark:bg-purple-600 shadow text-purple-700 dark:text-white' : 'text-slate-500'}`}
                                         >
                                             <Sparkles className="w-4 h-4"/>
                                             Gemini (Free)
                                         </button>
                                         <button 
                                             onClick={() => handleSave({...settings, transcriptionMode: 'browser'})}
                                             className={`py-3 rounded-xl font-bold transition-all text-xs md:text-sm flex items-center justify-center gap-1 ${settings.transcriptionMode === 'browser' ? 'bg-white dark:bg-purple-600 shadow text-purple-700 dark:text-white' : 'text-slate-500'}`}
                                         >
                                             <Globe className="w-4 h-4"/>
                                             Browser
                                         </button>
                                     </div>

                                     <div className="space-y-4">
                                         {/* API Keys inputs - same as before */}
                                         <div>
                                            <label className="block mb-2 font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2"><Brain className="w-4 h-4"/> کلید API اوپن‌ای‌آی (OpenAI)</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono dark:text-white outline-none focus:border-blue-500 text-left dir-ltr"
                                                    dir="ltr"
                                                    value={settings.openaiApiKey || ''}
                                                    onChange={e => setSettings({...settings, openaiApiKey: e.target.value})}
                                                    onBlur={() => handleSave(settings)}
                                                    placeholder="sk-..."
                                                    type="password"
                                                />
                                                <button onClick={testOpenaiApi} disabled={testOpenaiStatus === 'loading'} className="px-4 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 min-w-[80px] flex items-center justify-center">
                                                    {testOpenaiStatus === 'loading' ? '...' : <Check className="w-5 h-5"/>}
                                                </button>
                                            </div>
                                         </div>
                                         {/* Other API Keys (Same as before) */}
                                         <div>
                                            <label className="block mb-2 font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2"><Languages className="w-4 h-4"/> کلید API سرویس IOType (نویسه‌نگار)</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono dark:text-white outline-none focus:border-blue-500 text-left dir-ltr"
                                                    dir="ltr"
                                                    value={settings.iotypeApiKey || ''}
                                                    onChange={e => setSettings({...settings, iotypeApiKey: e.target.value})}
                                                    onBlur={() => handleSave(settings)}
                                                    placeholder="API Key..."
                                                    type="password"
                                                />
                                                <button onClick={testIOTypeApi} disabled={testIOTypeStatus === 'loading'} className="px-4 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 min-w-[80px] flex items-center justify-center">
                                                    {testIOTypeStatus === 'loading' ? '...' : <Check className="w-5 h-5"/>}
                                                </button>
                                            </div>
                                         </div>

                                         <div>
                                            <label className="block mb-2 font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2"><Bot className="w-4 h-4"/> کلید API سرویس TalkBot (تاک‌بات)</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono dark:text-white outline-none focus:border-blue-500 text-left dir-ltr"
                                                    dir="ltr"
                                                    value={settings.talkbotApiKey || ''}
                                                    onChange={e => setSettings({...settings, talkbotApiKey: e.target.value})}
                                                    onBlur={() => handleSave(settings)}
                                                    placeholder="API Key..."
                                                    type="password"
                                                />
                                                <button onClick={testTalkBotApi} disabled={testTalkBotStatus === 'loading'} className="px-4 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 min-w-[80px] flex items-center justify-center">
                                                    {testTalkBotStatus === 'loading' ? '...' : <Check className="w-5 h-5"/>}
                                                </button>
                                            </div>
                                         </div>
                                         
                                         <div>
                                            <label className="block mb-2 font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2"><Zap className="w-4 h-4"/> کلید API سرویس Groq (Whisper Large-v3)</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono dark:text-white outline-none focus:border-blue-500 text-left dir-ltr"
                                                    dir="ltr"
                                                    value={settings.groqApiKey || ''}
                                                    onChange={e => setSettings({...settings, groqApiKey: e.target.value})}
                                                    onBlur={() => handleSave(settings)}
                                                    placeholder="gsk_..."
                                                    type="password"
                                                />
                                                 <button onClick={testGroqApi} disabled={testGroqStatus === 'loading'} className="px-4 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 min-w-[80px] flex items-center justify-center">
                                                    {testGroqStatus === 'loading' ? '...' : <Check className="w-5 h-5"/>}
                                                </button>
                                            </div>
                                         </div>

                                          <div>
                                            <label className="block mb-2 font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2"><Sparkles className="w-4 h-4"/> کلید API سرویس Google Gemini (Flash)</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono dark:text-white outline-none focus:border-blue-500 text-left dir-ltr"
                                                    dir="ltr"
                                                    value={settings.geminiApiKey || ''}
                                                    onChange={e => setSettings({...settings, geminiApiKey: e.target.value})}
                                                    onBlur={() => handleSave(settings)}
                                                    placeholder="AIza..."
                                                    type="password"
                                                />
                                                <button onClick={testGeminiApi} disabled={testGeminiStatus === 'loading'} className="px-4 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 min-w-[80px] flex items-center justify-center">
                                                    {testGeminiStatus === 'loading' ? '...' : <Check className="w-5 h-5"/>}
                                                </button>
                                            </div>
                                         </div>
                                     </div>
                                 </div>

                                 <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                                     <h3 className="text-xl font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                         <Palette className="w-5 h-5 text-purple-500"/>
                                         آیکون‌های پس‌زمینه
                                     </h3>
                                     <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                         {AVAILABLE_ICONS.map(icon => (
                                             <button 
                                                key={icon}
                                                onClick={() => toggleIcon(icon)}
                                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${settings.enabledIcons?.includes(icon) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                             >
                                                {settings.enabledIcons?.includes(icon) ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>}
                                                <span className="text-xs font-bold">{icon}</span>
                                             </button>
                                         ))}
                                     </div>
                                 </div>
                             </div>
                        )}

                        {activeTab === 'qr' && (
                            <div className="glass-panel p-6 rounded-3xl animate-fade-in text-center">
                                <h2 className="text-2xl font-black mb-6 dark:text-white">لینک‌های دسترسی</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-white p-6 rounded-3xl border shadow-lg flex flex-col items-center">
                                        <QrCode className="w-32 h-32 text-slate-800 mb-4"/>
                                        <h3 className="font-bold text-xl mb-2">لینک عمومی (خانه)</h3>
                                        <a href={window.location.origin} target="_blank" className="text-blue-600 font-mono text-sm break-all">{window.location.origin}</a>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border shadow-lg flex flex-col items-center">
                                        <QrCode className="w-32 h-32 text-slate-800 mb-4"/>
                                        <h3 className="font-bold text-xl mb-2">لینک فرم بستری</h3>
                                        <a href={window.location.origin + '/#/survey/inpatient'} target="_blank" className="text-blue-600 font-mono text-sm break-all">{window.location.origin}/#/survey/inpatient</a>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'backup' && (
                            <div className="glass-panel p-6 rounded-3xl animate-fade-in flex flex-col gap-6">
                                <h2 className="text-2xl font-black mb-4 dark:text-white">پشتیبان‌گیری و بازیابی</h2>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Data Only Backup */}
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                                        <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-500"/> بکاپ داده‌ها (اکسل)</h3>
                                        <div className="flex flex-col gap-3">
                                            <button onClick={doBackup} className="bg-blue-600 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 text-sm"><Download className="w-4 h-4"/> دانلود فایل اکسل (فقط فرم‌ها)</button>
                                            <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer">
                                                <input type="file" onChange={doRestore} className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx" />
                                                <p className="font-bold text-xs text-slate-500 dark:text-slate-400">بازیابی از فایل اکسل</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Full System Backup */}
                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-200 dark:border-emerald-800/50">
                                        <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-emerald-800 dark:text-emerald-200"><HardDrive className="w-5 h-5"/> بکاپ کامل سیستم</h3>
                                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-3 leading-relaxed">شامل: تنظیمات، کاربران، فرم‌ها و <b>تمام فایل‌های صوتی</b> ضبط شده.</p>
                                        <div className="flex flex-col gap-3">
                                            <button 
                                                onClick={handleFullBackup} 
                                                className="bg-emerald-600 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 text-sm disabled:opacity-70 disabled:cursor-wait"
                                            >
                                                <Download className="w-4 h-4"/> دانلود بکاپ کامل (JSON)
                                            </button>
                                            <div className="relative border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-xl p-4 text-center hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors cursor-pointer">
                                                <input type="file" onChange={handleFullRestore} disabled={isRestoring} className="absolute inset-0 opacity-0 cursor-pointer" accept=".json" />
                                                <p className="font-bold text-xs text-emerald-700 dark:text-emerald-400">
                                                    {isRestoring ? 'در حال بازگردانی...' : 'بازیابی فایل JSON کامل'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'logs' && (
                            <div className="glass-panel p-6 rounded-3xl animate-fade-in">
                                <h2 className="text-2xl font-black mb-4 dark:text-white">گزارشات سیستم</h2>
                                <div className="h-[400px] overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-900 rounded-xl p-4 font-mono text-sm">
                                    {systemLogs.map((log, i) => (
                                        <div key={i} className="mb-2 border-b border-slate-200 dark:border-slate-800 pb-2 last:border-0">
                                            <span className="text-slate-400 text-xs block">{formatLogDate(log.timestamp)}</span>
                                            <span className={`font-bold ${log.type==='ERROR'?'text-red-500':log.type==='WARN'?'text-orange-500':'text-blue-500'}`}>[{log.type}]</span> <span className="dark:text-slate-300">{log.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showUserModal && editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="glass-panel w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900">
                        {/* User Modal Content (Same as before) */}
                        <h3 className="text-xl font-black mb-6 dark:text-white">{editingUser.id ? 'ویرایش کاربر' : 'کاربر جدید'}</h3>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-bold text-slate-500 mb-1">نام کامل</label><input className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none" value={editingUser.name || ''} onChange={e=>setEditingUser({...editingUser, name:e.target.value})}/></div>
                            <div><label className="block text-sm font-bold text-slate-500 mb-1">نام کاربری (انگلیسی)</label><input className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none font-mono text-left" dir="ltr" value={editingUser.username || ''} onChange={e=>setEditingUser({...editingUser, username:e.target.value})}/></div>
                            <div><label className="block text-sm font-bold text-slate-500 mb-1">نقش</label>
                                <select className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none" value={editingUser.role} onChange={e=>setEditingUser({...editingUser, role:e.target.value as any})}>
                                    <option value="staff">پرسنل (دسترسی محدود)</option>
                                    <option value="admin">مدیر (دسترسی کامل)</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" className="w-5 h-5" checked={editingUser.isPasswordEnabled || false} onChange={e=>setEditingUser({...editingUser, isPasswordEnabled:e.target.checked})}/>
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-300">فعال‌سازی رمز عبور</label>
                            </div>
                            {editingUser.isPasswordEnabled && (
                                <div><label className="block text-sm font-bold text-slate-500 mb-1">رمز عبور</label><input type="text" className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none font-mono text-center tracking-widest" value={editingUser.password || ''} onChange={e=>setEditingUser({...editingUser, password:e.target.value})}/></div>
                            )}
                            <div><label className="block text-sm font-bold text-slate-500 mb-1">رنگ آواتار</label>
                                <div className="flex gap-2 flex-wrap">
                                    {['bg-blue-600','bg-red-600','bg-green-600','bg-purple-600','bg-orange-600','bg-teal-600'].map(c => (
                                        <button key={c} onClick={()=>setEditingUser({...editingUser, avatarColor:c})} className={`w-8 h-8 rounded-full ${c} ${editingUser.avatarColor===c?'ring-2 ring-offset-2 ring-blue-500':''}`}></button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={()=>setShowUserModal(false)} className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 rounded-xl font-bold">لغو</button>
                            <button onClick={saveUser} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">ذخیره</button>
                        </div>
                    </div>
                </div>
            )}

            {showQuestionModal && editingQuestion && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                   {/* Question Modal Content (Same as before) */}
                   <div className="glass-panel w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-slate-900">
                        <h3 className="text-xl font-black mb-6 dark:text-white">{editingQuestion.id ? 'ویرایش سوال' : 'سوال جدید'}</h3>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-bold text-slate-500 mb-1">متن سوال</label><textarea rows={3} className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none" value={editingQuestion.text || ''} onChange={e=>setEditingQuestion({...editingQuestion, text:e.target.value})}/></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-bold text-slate-500 mb-1">نوع پاسخ</label>
                                    <select className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none" value={editingQuestion.type} onChange={e=>setEditingQuestion({...editingQuestion, type:e.target.value as any})}>
                                        <option value="yes_no">بله / خیر</option>
                                        <option value="likert">امتیازی (۱ تا ۵)</option>
                                        <option value="text">متنی (تایپ/صوت)</option>
                                        <option value="nps">NPS (۰ تا ۱۰)</option>
                                    </select>
                                </div>
                                <div><label className="block text-sm font-bold text-slate-500 mb-1">دسته‌بندی</label>
                                    <select className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none" value={editingQuestion.category} onChange={e=>setEditingQuestion({...editingQuestion, category:e.target.value as any})}>
                                        <option value="all">عمومی (همه)</option>
                                        <option value="inpatient">حین بستری</option>
                                        <option value="discharge">ترخیص</option>
                                    </select>
                                </div>
                            </div>
                            <div><label className="block text-sm font-bold text-slate-500 mb-1">قابل مشاهده برای</label>
                                <select className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none" value={editingQuestion.visibility} onChange={e=>setEditingQuestion({...editingQuestion, visibility:e.target.value as any})}>
                                    <option value="all">همه (بیمار و پرسنل)</option>
                                    <option value="staff_only">فقط پرسنل</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={()=>setShowQuestionModal(false)} className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 rounded-xl font-bold">لغو</button>
                            <button onClick={saveQuestion} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">ذخیره</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default DeveloperPanel;
