
import React, { useState, useEffect } from 'react';
import SurveyForm from './SurveyForm';
import { PhoneCall, Phone, Plus, CheckCircle2, Clock, Trash2, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getFeedbackData, deleteFeedback } from '../services/dataService';
import { Feedback } from '../types';
import Header from './Header';

const StaffPortal: React.FC = () => {
  const [view, setView] = useState<'list' | 'new' | 'edit'>('list');
  const [drafts, setDrafts] = useState<Feedback[]>([]);
  const [completed, setCompleted] = useState<Feedback[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | undefined>(undefined);
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setUserName(localStorage.getItem('user_name') || 'همکار گرامی');
    loadData();
  }, [view]);

  const loadData = async () => {
    try {
        const allData = await getFeedbackData();
        setDrafts(allData.filter(f => f.status === 'draft'));
        setCompleted(allData.filter(f => f.status === 'final'));
    } catch (err) {
        console.error(err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(window.confirm('آیا از حذف این پیش‌نویس اطمینان دارید؟')) {
          await deleteFeedback(id);
          loadData();
      }
  };

  const handleEdit = (item: Feedback) => {
      setSelectedFeedback(item);
      setView('edit');
  };

  return (
    <div className="min-h-screen pb-10">
      
      <Header title="پنل پیگیری بازخورد" showLogout />

      <div className="max-w-5xl mx-auto p-6">
        
        <div className="mb-6 animate-fade-in">
             <div className="flex items-center gap-3 text-blue-900 dark:text-blue-300">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                    <Phone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h1 className="font-bold text-lg dark:text-white">پنل کاربری</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{userName}</p>
                </div>
            </div>
        </div>
        
        {view === 'list' && (
            <div className="space-y-8 animate-fade-in">
                {/* Header Action */}
                <button 
                    onClick={() => { setSelectedFeedback(undefined); setView('new'); }}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-6 rounded-3xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 transition-all hover:scale-[1.01]"
                >
                    <div className="bg-white/20 p-2 rounded-full"><Plus className="w-6 h-6" /></div>
                    <span className="text-xl font-black">ثبت تماس جدید</span>
                </button>

                {/* Drafts Section */}
                <div>
                    <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-orange-500" />
                        پیش‌نویس‌ها (در انتظار تکمیل)
                    </h2>
                    {drafts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {drafts.map(item => (
                                <div key={item.id} className="glass-panel border-orange-200/50 dark:border-orange-900/30 p-5 rounded-2xl hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm relative group cursor-pointer" onClick={() => handleEdit(item)}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-slate-800 dark:text-white">{item.patientInfo.name || 'بدون نام'}</h3>
                                        <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs px-2 py-1 rounded-lg font-bold">پیش‌نویس</span>
                                    </div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 flex gap-4">
                                        <span>{item.patientInfo.mobile || '---'}</span>
                                        <span>{item.ward}</span>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={(e) => handleDelete(e, item.id)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        <button className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded-xl text-sm font-bold flex items-center gap-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                                            <Edit className="w-4 h-4" /> تکمیل فرم
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                            موردی در پیش‌نویس وجود ندارد
                        </div>
                    )}
                </div>

                {/* Recent Completed Section */}
                <div className="opacity-70">
                    <h2 className="text-lg font-bold text-slate-600 dark:text-slate-400 mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ارسال شده‌های اخیر
                    </h2>
                    <div className="glass-panel rounded-2xl border border-white/60 overflow-hidden">
                        {completed.slice(0, 5).map((item, idx) => (
                            <div key={item.id} className={`p-4 flex justify-between items-center ${idx !== completed.length -1 ? 'border-b border-slate-100 dark:border-slate-700' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full text-green-600 dark:text-green-400"><CheckCircle2 className="w-4 h-4" /></div>
                                    <span className="font-bold text-slate-700 dark:text-slate-200">{item.patientInfo.name}</span>
                                </div>
                                <span className="text-xs text-slate-400" dir="ltr">{new Date(item.lastModified || item.createdAt).toLocaleDateString('fa-IR')}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {(view === 'new' || view === 'edit') && (
             <div className="animate-fade-in">
                 <button onClick={() => { setView('list'); setSelectedFeedback(undefined); }} className="mb-4 text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 hover:underline">
                     ← بازگشت به لیست
                 </button>
                 <div className="glass-panel rounded-3xl p-6 md:p-10 shadow-lg">
                    <div className="bg-blue-600/10 border border-blue-600/20 backdrop-blur-md rounded-2xl p-5 mb-8 flex items-start gap-4">
                        <PhoneCall className="w-6 h-6 text-blue-700 dark:text-blue-300 shrink-0 mt-1" />
                        <p className="text-blue-900 dark:text-blue-100 text-sm leading-relaxed font-medium">
                            همکار گرامی، <br/>
                            لطفاً پس از تماس، اطلاعات را وارد کنید. می‌توانید فرم را به صورت "پیش‌نویس" ذخیره کنید و بعداً تکمیل نمایید. 
                            پس از اطمینان، دکمه "ثبت نهایی" را بزنید.
                        </p>
                    </div>
                    <SurveyForm 
                        source="staff" 
                        initialData={selectedFeedback} 
                        onSuccess={() => { setView('list'); setSelectedFeedback(undefined); }}
                    />
                 </div>
             </div>
        )}

      </div>
    </div>
  );
};

export default StaffPortal;
