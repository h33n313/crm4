import React, { useState, useEffect } from 'react';
import { Settings, SurveyQuestion, AppUser } from '../types';
import { getSettings, saveSettings, checkHealth } from '../services/dataService';
import { Settings as SettingsIcon, Trash2, List, Plus, RefreshCw, PlusCircle, User, Shield, Layers, AlertCircle, Database } from 'lucide-react';
import Header from './Header';

const DeveloperPanel: React.FC = () => {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [activeTab, setActiveTab] = useState<'users' | 'questions' | 'general'>('users');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const s = await getSettings();
        setSettings(s);
    };

    const handleSave = async (s: Settings) => {
        setIsSaving(true);
        setSettings(s);
        await saveSettings(s);
        setTimeout(() => setIsSaving(false), 500);
    };

    const resetDatabase = async () => {
        if (confirm('هشدار: تمامی سوالات و کاربران سفارشی حذف و تنظیمات اولیه جایگزین می‌شود. آیا مطمئن هستید؟')) {
            const res = await fetch('/api/settings/reset', { method: 'POST' });
            const data = await res.json();
            setSettings(data.settings);
            alert('دیتابیس با موفقیت بازنشانی شد.');
        }
    };

    if (!settings) return <div className="p-20 text-center font-bold animate-pulse">در حال فراخوانی داده‌ها از سرور...</div>;

    return (
        <div className="min-h-screen pb-10">
            <Header title="مدیریت هسته سیستم" showLogout />
            
            <div className="max-w-7xl mx-auto px-4 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="glass-panel p-4 rounded-3xl h-fit flex flex-row lg:flex-col gap-2 overflow-x-auto no-scrollbar">
                        <button onClick={() => setActiveTab('users')} className={`p-4 rounded-2xl font-bold flex items-center gap-3 transition-all ${activeTab==='users'?'bg-blue-600 text-white shadow-lg':'text-slate-500 hover:bg-white/40'}`}><User className="w-5 h-5"/> کاربران</button>
                        <button onClick={() => setActiveTab('questions')} className={`p-4 rounded-2xl font-bold flex items-center gap-3 transition-all ${activeTab==='questions'?'bg-blue-600 text-white shadow-lg':'text-slate-500 hover:bg-white/40'}`}><Layers className="w-5 h-5"/> سوالات</button>
                        <button onClick={() => setActiveTab('general')} className={`p-4 rounded-2xl font-bold flex items-center gap-3 transition-all ${activeTab==='general'?'bg-blue-600 text-white shadow-lg':'text-slate-500 hover:bg-white/40'}`}><SettingsIcon className="w-5 h-5"/> تنظیمات</button>
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                             <button onClick={resetDatabase} className="w-full p-4 rounded-2xl font-bold flex items-center gap-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><Database className="w-5 h-5"/> تعمیر دیتابیس</button>
                        </div>
                    </div>

                    <div className="lg:col-span-3">
                        {activeTab === 'users' && (
                            <div className="glass-panel p-8 rounded-3xl space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-black flex items-center gap-2"><Shield className="text-blue-500"/> مدیریت کاربران ({settings.users.length})</h3>
                                    <button onClick={() => handleSave({...settings, users: [...settings.users, {id: 'u'+Date.now(), name: 'کاربر جدید', username: 'user'+Date.now(), role: 'staff', isPasswordEnabled: false}]})} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"><Plus className="w-4 h-4"/> افزودن</button>
                                </div>
                                <div className="grid gap-4">
                                    {settings.users.map(u => (
                                        <div key={u.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border flex gap-4 items-center">
                                            <input value={u.name} onChange={e => handleSave({...settings, users: settings.users.map(x => x.id === u.id ? {...x, name: e.target.value} : x)})} className="bg-white dark:bg-slate-900 p-2 rounded-lg border flex-1" placeholder="نام"/>
                                            <input value={u.username} onChange={e => handleSave({...settings, users: settings.users.map(x => x.id === u.id ? {...x, username: e.target.value} : x)})} className="bg-white dark:bg-slate-900 p-2 rounded-lg border w-32" placeholder="یوزرنیم"/>
                                            <select value={u.role} onChange={e => handleSave({...settings, users: settings.users.map(x => x.id === u.id ? {...x, role: e.target.value as any} : x)})} className="p-2 rounded-lg border">
                                                <option value="admin">ادمین</option>
                                                <option value="staff">پرسنل</option>
                                            </select>
                                            <button onClick={() => handleSave({...settings, users: settings.users.filter(x => x.id !== u.id)})} className="text-red-500 p-2 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'questions' && (
                            <div className="glass-panel p-8 rounded-3xl space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-black flex items-center gap-2"><List className="text-emerald-500"/> سوالات نظرسنجی ({settings.questions.length})</h3>
                                    <button onClick={() => handleSave({...settings, questions: [...settings.questions, {id: 'q'+Date.now(), text: 'متن سوال جدید', type: 'yes_no', order: settings.questions.length+1, visibility: 'all'}]})} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"><Plus className="w-4 h-4"/> افزودن</button>
                                </div>
                                <div className="space-y-3">
                                    {settings.questions.sort((a,b)=>a.order-b.order).map(q => (
                                        <div key={q.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border flex flex-col gap-3">
                                            <div className="flex gap-2">
                                                <input type="number" value={q.order} onChange={e => handleSave({...settings, questions: settings.questions.map(x => x.id === q.id ? {...x, order: +e.target.value} : x)})} className="w-16 p-2 rounded-lg border text-center font-bold"/>
                                                <input value={q.text} onChange={e => handleSave({...settings, questions: settings.questions.map(x => x.id === q.id ? {...x, text: e.target.value} : x)})} className="flex-1 p-2 rounded-lg border font-bold"/>
                                            </div>
                                            <div className="flex gap-4 items-center">
                                                <select value={q.type} onChange={e => handleSave({...settings, questions: settings.questions.map(x => x.id === q.id ? {...x, type: e.target.value as any} : x)})} className="p-2 rounded-lg border text-xs">
                                                    <option value="yes_no">بله/خیر</option>
                                                    <option value="likert">طیف ۵ تایی</option>
                                                    <option value="nps">NPS</option>
                                                    <option value="text">تشریحی</option>
                                                </select>
                                                <select value={q.category} onChange={e => handleSave({...settings, questions: settings.questions.map(x => x.id === q.id ? {...x, category: e.target.value as any} : x)})} className="p-2 rounded-lg border text-xs">
                                                    <option value="all">همه</option>
                                                    <option value="inpatient">بستری</option>
                                                    <option value="discharge">ترخیص</option>
                                                </select>
                                                <button onClick={() => handleSave({...settings, questions: settings.questions.filter(x => x.id !== q.id)})} className="mr-auto text-red-500 p-2 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {isSaving && <div className="fixed bottom-10 right-10 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl animate-bounce font-bold">ذخیره شد...</div>}
        </div>
    );
};

export default DeveloperPanel;