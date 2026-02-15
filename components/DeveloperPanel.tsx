import React, { useState, useEffect } from 'react';
import { Settings, SurveyQuestion, AppUser } from '../types';
import { getSettings, saveSettings, checkHealth, logAction } from '../services/dataService';
import { Download, Settings as SettingsIcon, UserPlus, Trash2, Edit2, List, Plus, Save, Wifi, WifiOff, FileText, Activity, Zap, RefreshCw, PlusCircle, User, Shield, Info, Layers } from 'lucide-react';
import Header from './Header';

const DeveloperPanel: React.FC = () => {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'questions' | 'backup' | 'general'>('users');
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

    // --- User Management ---
    const addNewUser = () => {
        if (!settings) return;
        const newUser: AppUser = {
            id: 'u_' + Date.now(),
            username: '',
            name: 'کاربر جدید',
            role: 'staff',
            title: 'پرسنل',
            isPasswordEnabled: false,
            password: '',
            avatarColor: 'bg-blue-500'
        };
        handleSave({...settings, users: [...settings.users, newUser]});
    };

    const removeUser = (id: string) => {
        if (!settings) return;
        if (confirm('آیا از حذف این کاربر مطمئن هستید؟')) {
            const updated = settings.users.filter(u => u.id !== id);
            handleSave({...settings, users: updated});
        }
    };

    const updateUser = (id: string, field: keyof AppUser, value: any) => {
        if (!settings) return;
        const updated = settings.users.map(u => u.id === id ? {...u, [field]: value} : u);
        setSettings({...settings, users: updated});
    };

    // --- Question Management ---
    const addNewQuestion = () => {
        if (!settings) return;
        const newQ: SurveyQuestion = {
            id: 'q_' + Date.now(),
            text: 'سوال جدید',
            type: 'yes_no',
            order: settings.questions.length + 1,
            visibility: 'all',
            category: 'all'
        };
        handleSave({...settings, questions: [...settings.questions, newQ]});
    };

    const removeQuestion = (id: string) => {
        if (!settings) return;
        if (confirm('آیا از حذف این سوال مطمئن هستید؟')) {
            const updated = settings.questions.filter(q => q.id !== id);
            handleSave({...settings, questions: updated});
        }
    };

    const updateQuestion = (id: string, field: keyof SurveyQuestion, value: any) => {
        if (!settings) return;
        const updated = settings.questions.map(q => q.id === id ? {...q, [field]: value} : q);
        setSettings({...settings, questions: updated});
    };

    const testGeminiApi = async () => {
        setTestGeminiStatus('loading');
        try {
            if(settings) await saveSettings(settings);
            const res = await fetch('/api/test-gemini', { method: 'POST' });
            const data = await res.json();
            alert(data.message || 'تست انجام شد');
            setTestGeminiStatus('success');
        } catch (e: any) {
            setTestGeminiStatus('error');
            alert('خطا در تست: ' + e.message);
        } finally {
            setTimeout(() => setTestGeminiStatus('idle'), 3000);
        }
    };

    if (!settings) return <div className="p-10 text-center font-bold">در حال بارگذاری...</div>;

    return (
        <div className="min-h-screen pb-10">
            <Header title="تنظیمات توسعه‌دهنده" showLogout />
            {message && <div className="fixed bottom-5 left-5 bg-emerald-600 text-white px-4 py-2 rounded-xl z-50 animate-bounce shadow-lg">{message}</div>}

            <div className="max-w-7xl mx-auto px-4 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Navigation Sidebar */}
                    <div className="glass-panel p-4 rounded-3xl h-fit flex flex-row lg:flex-col gap-2 overflow-x-auto no-scrollbar">
                        <button onClick={() => setActiveTab('users')} className={`p-4 rounded-2xl font-bold flex items-center gap-3 transition-all whitespace-nowrap ${activeTab==='users'?'bg-blue-600 text-white shadow-lg':'text-slate-500 hover:bg-white/40'}`}><User className="w-5 h-5"/> مدیریت کاربران</button>
                        <button onClick={() => setActiveTab('questions')} className={`p-4 rounded-2xl font-bold flex items-center gap-3 transition-all whitespace-nowrap ${activeTab==='questions'?'bg-blue-600 text-white shadow-lg':'text-slate-500 hover:bg-white/40'}`}><List className="w-5 h-5"/> مدیریت سوالات</button>
                        <button onClick={() => setActiveTab('general')} className={`p-4 rounded-2xl font-bold flex items-center gap-3 transition-all whitespace-nowrap ${activeTab==='general'?'bg-blue-600 text-white shadow-lg':'text-slate-500 hover:bg-white/40'}`}><SettingsIcon className="w-5 h-5"/> تنظیمات سرویس‌ها</button>
                    </div>

                    <div className="lg:col-span-3">
                        {/* 1. Users Management Tab */}
                        {activeTab === 'users' && (
                            <div className="glass-panel p-8 rounded-3xl space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2"><Shield className="w-6 h-6 text-indigo-500"/> مدیریت دسترسی کاربران</h3>
                                    <button onClick={addNewUser} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all"><Plus className="w-5 h-5"/> کاربر جدید</button>
                                </div>
                                <div className="space-y-4">
                                    {settings.users.map((user) => (
                                        <div key={user.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center">
                                            <input value={user.name} onChange={e => updateUser(user.id, 'name', e.target.value)} onBlur={() => handleSave(settings)} className="bg-white dark:bg-slate-900 p-2 rounded-lg border flex-1 min-w-[150px]" placeholder="نام کاربر"/>
                                            <input value={user.username} onChange={e => updateUser(user.id, 'username', e.target.value)} onBlur={() => handleSave(settings)} className="bg-white dark:bg-slate-900 p-2 rounded-lg border font-mono text-sm" placeholder="نام کاربری"/>
                                            <select value={user.role} onChange={e => updateUser(user.id, 'role', e.target.value)} onBlur={() => handleSave(settings)} className="bg-white dark:bg-slate-900 p-2 rounded-lg border font-bold">
                                                <option value="admin">ادمین</option>
                                                <option value="staff">پرسنل</option>
                                            </select>
                                            <button onClick={() => removeUser(user.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-5 h-5"/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. Questions Management Tab */}
                        {activeTab === 'questions' && (
                            <div className="glass-panel p-8 rounded-3xl space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2"><Layers className="w-6 h-6 text-blue-500"/> مدیریت سوالات نظرسنجی</h3>
                                    <button onClick={addNewQuestion} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all"><Plus className="w-5 h-5"/> سوال جدید</button>
                                </div>
                                <div className="space-y-4">
                                    {settings.questions.sort((a,b)=>a.order-b.order).map((q) => (
                                        <div key={q.id} className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                            <div className="flex gap-4">
                                                <input type="number" value={q.order} onChange={e => updateQuestion(q.id, 'order', +e.target.value)} onBlur={() => handleSave(settings)} className="w-16 bg-white dark:bg-slate-900 p-2 rounded-lg border text-center font-bold" title="ترتیب"/>
                                                <input value={q.text} onChange={e => updateQuestion(q.id, 'text', e.target.value)} onBlur={() => handleSave(settings)} className="flex-1 bg-white dark:bg-slate-900 p-2 rounded-lg border font-bold" placeholder="متن سوال..."/>
                                            </div>
                                            <div className="flex flex-wrap gap-4 items-center">
                                                <select value={q.type} onChange={e => updateQuestion(q.id, 'type', e.target.value)} onBlur={() => handleSave(settings)} className="bg-white dark:bg-slate-900 p-2 rounded-lg border text-xs">
                                                    <option value="yes_no">بله/خیر</option>
                                                    <option value="likert">طیف ۵ تایی</option>
                                                    <option value="nps">NPS (۰-۱۰)</option>
                                                    <option value="text">تشریحی</option>
                                                </select>
                                                <select value={q.category} onChange={e => updateQuestion(q.id, 'category', e.target.value)} onBlur={() => handleSave(settings)} className="bg-white dark:bg-slate-900 p-2 rounded-lg border text-xs">
                                                    <option value="all">همه دسته‌ها</option>
                                                    <option value="inpatient">حین بستری</option>
                                                    <option value="discharge">حین ترخیص</option>
                                                </select>
                                                <select value={q.visibility} onChange={e => updateQuestion(q.id, 'visibility', e.target.value)} onBlur={() => handleSave(settings)} className="bg-white dark:bg-slate-900 p-2 rounded-lg border text-xs">
                                                    <option value="all">نمایش برای همه</option>
                                                    <option value="staff_only">فقط پرسنل</option>
                                                </select>
                                                <button onClick={() => removeQuestion(q.id)} className="mr-auto p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-5 h-5"/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. General Settings Tab */}
                        {activeTab === 'general' && (
                            <div className="glass-panel p-8 rounded-3xl space-y-10 animate-fade-in">
                                <div>
                                    <label className="block mb-3 font-black text-slate-800 dark:text-white text-lg flex items-center gap-2"><Zap className="w-6 h-6 text-purple-500"/> کلیدهای Gemini (AI)</label>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-4">
                                        {(settings.geminiApiKeys || []).map((key, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <input className="flex-1 p-3 rounded-xl border bg-white dark:bg-slate-900 font-mono text-sm" dir="ltr" value={key} onChange={e => {
                                                    const keys = [...(settings.geminiApiKeys || [])];
                                                    keys[idx] = e.target.value;
                                                    setSettings({...settings, geminiApiKeys: keys});
                                                }} onBlur={() => handleSave(settings)}/>
                                                <button onClick={() => {
                                                    const keys = settings.geminiApiKeys?.filter((_, i) => i !== idx);
                                                    handleSave({...settings, geminiApiKeys: keys});
                                                }} className="p-3 bg-red-100 text-red-600 rounded-xl"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                        ))}
                                        <button onClick={() => setSettings({...settings, geminiApiKeys: [...(settings.geminiApiKeys || []), '']})} className="text-emerald-600 font-bold flex items-center gap-2 hover:underline"><PlusCircle className="w-5 h-5"/> افزودن کلید</button>
                                        <button onClick={testGeminiApi} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                                            {testGeminiStatus === 'loading' ? <RefreshCw className="animate-spin"/> : <Zap/>} تست سلامت کلیدها
                                        </button>
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