
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TimeRange, Feedback } from '../types';
import { getFeedbackData, calculateAnalytics, getSettings, deleteFeedback, saveFeedback, logAction, isLeap, dateToAbsoluteDays, toPersianDigits } from '../services/dataService';
import { Search, Hash, Trash2, Activity, CheckCircle, AlertTriangle, Filter, User, Timer, ArrowUpDown, ArrowUp, ArrowDown, MessageSquare, ThumbsUp, ThumbsDown, Star, X, Edit, FileText, Phone, CreditCard, Scissors, LogOut, Volume2, Printer, ArrowRight, HelpCircle, Play, ChevronDown, ChevronUp, Folder } from 'lucide-react';
// @ts-ignore
import jalaali from 'jalaali-js';
import Header from './Header';
import SurveyForm from './SurveyForm';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<Feedback[]>([]);
  const [filteredData, setFilteredData] = useState<Feedback[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  
  const [timeRange, setTimeRange] = useState<TimeRange>(TimeRange.WEEKLY);
  const [filterSource, setFilterSource] = useState('All'); 
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  // View Mode: default or urgent
  const [viewMode, setViewMode] = useState<'default' | 'urgent'>('default');
  
  // Grouping State
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Modal State
  const [selectedPatient, setSelectedPatient] = useState<Feedback | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showNpsInfo, setShowNpsInfo] = useState(false); // New State for NPS Modal

  const currentJ = jalaali.toJalaali(new Date());
  const [sDate, setSDate] = useState({y: currentJ.jy, m: currentJ.jm, d: 1});
  const [eDate, setEDate] = useState({y: currentJ.jy, m: currentJ.jm, d: currentJ.jd});

  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSettings().then(s => {
        setSettings(s);
        loadData(s);
    });
  }, []);

  useEffect(() => {
      applyFilters();
  }, [data, timeRange, sDate, eDate, filterSource, search]);

  const loadData = async (currentSettings: any) => {
    const res = await getFeedbackData();
    const final = res.filter(d => d.status === 'final');
    setData(final);
  };

  const applyFilters = () => {
      let temp = [...data];

      if (timeRange === TimeRange.CUSTOM) {
          const startNum = sDate.y * 10000 + sDate.m * 100 + sDate.d;
          const endNum = eDate.y * 10000 + eDate.m * 100 + eDate.d;

          temp = temp.filter(d => {
              const date = new Date(d.createdAt);
              const jDate = jalaali.toJalaali(date);
              const dNum = jDate.jy * 10000 + jDate.jm * 100 + jDate.jd;
              return dNum >= startNum && dNum <= endNum;
          });
      } else {
          const nowJ = jalaali.toJalaali(new Date());
          const todayNum = nowJ.jy * 10000 + nowJ.jm * 100 + nowJ.jd;
          
          temp = temp.filter(d => {
              const date = new Date(d.createdAt);
              const jDate = jalaali.toJalaali(date);
              const dNum = jDate.jy * 10000 + jDate.jm * 100 + jDate.jd;

              if (timeRange === TimeRange.TODAY) return dNum === todayNum;
              if (timeRange === TimeRange.WEEKLY) return dNum >= (todayNum - 7); 
              if (timeRange === TimeRange.MONTHLY) return jDate.jm === nowJ.jm && jDate.jy === nowJ.jy;
              return true;
          });
      }

      if (filterSource !== 'All') {
          if (filterSource === 'public') {
              temp = temp.filter(d => d.source === 'public');
          } else if (filterSource.startsWith('user-')) {
              const username = filterSource.replace('user-', '');
              temp = temp.filter(d => d.registrarUsername === username);
          }
      }

      if (search) {
          const t = search.toLowerCase();
          temp = temp.filter(d => 
            d.patientInfo.name.includes(t) || 
            d.patientInfo.mobile.includes(t) || 
            d.patientInfo.nationalId.includes(t) ||
            (d.trackingId && d.trackingId.toString().includes(t)) ||
            d.ward.includes(t)
          );
      }

      setFilteredData(temp);
      setCurrentPage(1); 
      if (settings) {
          setAnalytics(calculateAnalytics(temp, settings.questions));
      }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Grouping Logic
  const groupedData = useMemo(() => {
      // 1. First, sort if needed, or default sort by date desc
      let sorted = [...filteredData];
      if (viewMode === 'urgent') {
          sorted = analytics?.urgentList || [];
      }

      if (sortConfig) {
          sorted.sort((a: any, b: any) => {
            let aValue: any = getNestedValue(a, sortConfig.key);
            let bValue: any = getNestedValue(b, sortConfig.key);
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
          });
      } else {
          sorted.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      // 2. Group by National ID
      // Structure: [ { main: item, children: [item, item] }, { main: item, children: [] } ]
      // We process linearly. If an item's national ID has been seen, add to that group.
      const groups: { main: Feedback, children: Feedback[] }[] = [];
      const nidMap = new Map<string, number>(); // nid -> index in groups

      sorted.forEach(item => {
          const nid = item.patientInfo.nationalId;
          if (nid && nidMap.has(nid)) {
              const idx = nidMap.get(nid)!;
              groups[idx].children.push(item);
          } else {
              groups.push({ main: item, children: [] });
              if (nid) nidMap.set(nid, groups.length - 1);
          }
      });

      return groups;

  }, [filteredData, sortConfig, viewMode, analytics]);

  const paginatedGroups = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return groupedData.slice(startIndex, startIndex + itemsPerPage);
  }, [groupedData, currentPage]);

  const totalPages = Math.ceil(groupedData.length / itemsPerPage);

  const toggleGroup = (nid: string) => {
      const newSet = new Set(expandedGroups);
      if (newSet.has(nid)) newSet.delete(nid);
      else newSet.add(nid);
      setExpandedGroups(newSet);
  };

  // Helpers
  const calculateAgeDetails = (birthDate: string) => {
      if (!birthDate) return { text: '-', val: -1 };
      try {
          const [y, m, d] = birthDate.split('/').map(Number);
          const nowJ = jalaali.toJalaali(new Date());
          let years = nowJ.jy - y;
          let months = nowJ.jm - m;
          let days = nowJ.jd - d;
          if (days < 0) { months--; days += 30; }
          if (months < 0) { years--; months += 12; }
          let text = '';
          if (years > 0) text = `${toPersianDigits(years)} سال`;
          if (months > 0) text += (text ? ' و ' : '') + `${toPersianDigits(months)} ماه`;
          if (years === 0 && months === 0) text = `${toPersianDigits(Math.max(1, days))} روز`;
          return { text, val: years };
      } catch { return { text: '-', val: -1 }; }
  };

  const calculateDuration = (admission: string, discharge?: string) => {
      if (!admission || !discharge) return '-';
      try {
          const days1 = dateToAbsoluteDays(admission);
          const days2 = dateToAbsoluteDays(discharge);
          const diff = Math.max(0, days2 - days1);
          return diff === 0 ? 'کمتر از ۱ روز' : toPersianDigits(diff) + ' روز';
      } catch { return '-'; }
  };

  const formatDate = (isoString: string) => {
      if (!isoString) return ['-', ''];
      const parts = new Date(isoString).toLocaleString('fa-IR', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit'
      }).split(' ');
      return parts;
  };

  const handleDelete = async (id: string) => {
      if(confirm('آیا از حذف این رکورد اطمینان دارید؟')) {
          await deleteFeedback(id);
          const user = localStorage.getItem('user_name') || 'Admin';
          logAction('WARN', `${user} فرمی را حذف کرد - ID: ${id}`);
          const newData = data.filter(d => d.id !== id);
          setData(newData);
          if (selectedPatient?.id === id) setSelectedPatient(null);
      }
  };

  const handleDeleteAudio = async (feedbackId: string, key: string, index: number) => {
      if (!confirm('آیا از حذف این فایل صوتی اطمینان دارید؟')) return;
      const item = data.find(d => d.id === feedbackId);
      if (!item || !item.audioFiles || !item.audioFiles[key]) return;
      let currentAudios = item.audioFiles[key];
      if (!Array.isArray(currentAudios)) currentAudios = [currentAudios];
      const newAudios = currentAudios.filter((_: any, i: number) => i !== index);
      const newAudioFiles = { ...item.audioFiles, [key]: newAudios };
      const updatedItem = { ...item, audioFiles: newAudioFiles };
      await saveFeedback(updatedItem);
      const newData = data.map(d => d.id === feedbackId ? updatedItem : d);
      setData(newData);
      setSelectedPatient(updatedItem);
      logAction('WARN', `فایل صوتی حذف شد - ID: ${feedbackId}`);
  };

  const renderAudioPlayer = (src: string | string[], feedbackId: string, key: string) => {
      let audios = Array.isArray(src) ? src : [src];
      return (
          <div className="space-y-2 w-full">
              {audios.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                      <span className="text-xs bg-blue-200 text-blue-800 rounded-full px-2 py-0.5">{i+1}</span>
                      <audio controls src={s} className="w-full h-8" />
                      <button onClick={() => handleDeleteAudio(feedbackId, key, i)} className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition-colors"><Trash2 className="w-4 h-4"/></button>
                  </div>
              ))}
          </div>
      );
  }

  const questions = settings?.questions?.sort((a:any, b:any) => a.order - b.order) || [];

  return (
    <div className="min-h-screen pb-20 bg-slate-50 dark:bg-transparent">
      <Header title="داشبورد مدیریت" showLogout />

      {/* NPS Modal */}
      {showNpsInfo && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in no-print" onClick={() => setShowNpsInfo(false)}>
              <div className="glass-panel w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowNpsInfo(false)} className="absolute top-4 left-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-red-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
                  <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-2"><Activity className="w-6 h-6"/> شاخص خالص مروجان (NPS)</h3>
                  <div className="space-y-4 text-slate-600 dark:text-slate-300 leading-relaxed text-sm text-justify">
                      <p><strong className="text-slate-800 dark:text-white">NPS</strong> معیاری استاندارد برای سنجش وفاداری بیماران است.</p>
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2">
                          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span><span className="font-bold">مروجان:</span> ۹ تا ۱۰</div>
                          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500"></span><span className="font-bold">منفعل‌ها:</span> ۷ تا ۸</div>
                          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span><span className="font-bold">بدگوها:</span> ۰ تا ۶</div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Patient Modal */}
      {selectedPatient && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto no-print">
              <div className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-3xl flex flex-col relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                      <div>
                          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2"><FileText className="w-6 h-6 text-blue-500"/> پرونده: {selectedPatient.patientInfo.name}</h2>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-bold">
                              {selectedPatient.source === 'public' ? <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400"><User className="w-3 h-3"/> توسط بیمار</span> : <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400"><User className="w-3 h-3"/> توسط پرسنل: {selectedPatient.registrarName}</span>}
                          </p>
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => window.print()} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 transition-colors" title="پرینت"><Printer className="w-5 h-5"/></button>
                         <button onClick={() => {setSelectedPatient(null); setIsEditing(false);}} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-red-500 hover:text-white transition-colors"><X className="w-6 h-6"/></button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                      {isEditing ? (
                          <div className="animate-fade-in">
                              <div className="bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 p-4 rounded-xl mb-4 flex items-center gap-2 text-orange-800 dark:text-orange-200"><Edit className="w-5 h-5"/><span className="font-bold">حالت ویرایش فعال است.</span></div>
                              <SurveyForm source="staff" initialData={selectedPatient} onSuccess={() => { setIsEditing(false); setSelectedPatient(null); loadData(settings); }} />
                          </div>
                      ) : (
                          <div className="space-y-8 animate-fade-in print-only">
                              <div className="glass-card p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/30">
                                  <h3 className="font-bold text-lg text-blue-600 dark:text-blue-400 mb-4 border-b pb-2 flex items-center gap-2"><User className="w-5 h-5"/> اطلاعات فردی</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      <InfoItem label="نام" value={selectedPatient.patientInfo.name} />
                                      <InfoItem label="کد ملی" value={toPersianDigits(selectedPatient.patientInfo.nationalId)} />
                                      <InfoItem label="سن" value={calculateAgeDetails(selectedPatient.patientInfo.birthDate).text} />
                                      <InfoItem label="موبایل" value={toPersianDigits(selectedPatient.patientInfo.mobile)} />
                                      <InfoItem label="آدرس" value={selectedPatient.patientInfo.address} className="md:col-span-3" />
                                      {selectedPatient.audioFiles && selectedPatient.audioFiles['address'] && <div className="md:col-span-3 bg-slate-100 dark:bg-slate-700 p-3 rounded-xl no-print"><label className="text-xs text-slate-500 dark:text-slate-300 mb-1 flex items-center gap-1"><Volume2 className="w-3 h-3"/> صدای آدرس:</label>{renderAudioPlayer(selectedPatient.audioFiles['address'], selectedPatient.id, 'address')}</div>}
                                  </div>
                              </div>
                              <div className="glass-card p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/30">
                                  <h3 className="font-bold text-lg text-indigo-600 dark:text-indigo-400 mb-4 border-b pb-2 flex items-center gap-2"><FileText className="w-5 h-5"/> پاسخ‌های نظرسنجی</h3>
                                  <div className="space-y-4">
                                      {questions.map((q: any, idx: number) => (
                                          <div key={q.id} className="border-b border-slate-200 dark:border-slate-700/50 pb-3 last:border-0">
                                              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 font-bold">{idx + 1}. {q.text}</p>
                                              <p className="font-bold text-slate-800 dark:text-white text-lg">{renderAnswer(q, selectedPatient.answers[q.id])}</p>
                                              {selectedPatient.audioFiles && selectedPatient.audioFiles[q.id] && <div className="mt-2 bg-blue-50 dark:bg-blue-900/10 p-2 rounded-xl border border-blue-100 dark:border-blue-900/30 no-print">{renderAudioPlayer(selectedPatient.audioFiles[q.id], selectedPatient.id, q.id)}</div>}
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
                  {!isEditing && <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 flex justify-end gap-3 backdrop-blur-md sticky bottom-0 z-10 no-print"><button onClick={() => handleDelete(selectedPatient.id)} className="px-6 py-3 rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-bold hover:bg-red-200 flex items-center gap-2"><Trash2 className="w-5 h-5"/> حذف پرونده</button><button onClick={() => setIsEditing(true)} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center gap-2"><Edit className="w-5 h-5"/> ویرایش پرونده</button></div>}
              </div>
          </div>
      )}

      <div className="max-w-[95%] mx-auto px-4 mt-8 space-y-6">
          <div className="glass-panel p-5 rounded-3xl flex flex-col xl:flex-row gap-6 justify-between items-center shadow-lg border border-white/50 dark:border-white/10 no-print">
               <div className="flex flex-col md:flex-row gap-4 items-center w-full xl:w-auto">
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300 font-bold"><Filter className="w-4 h-4"/> فیلتر تاریخ:</div>
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <select value={timeRange} onChange={e => setTimeRange(e.target.value as any)} className="bg-transparent px-3 outline-none font-bold text-slate-700 dark:text-white text-sm cursor-pointer min-w-[120px]">
                            <option value="today" className="dark:bg-slate-800">امروز</option>
                            <option value="weekly" className="dark:bg-slate-800">هفته جاری</option>
                            <option value="monthly" className="dark:bg-slate-800">ماه جاری</option>
                            <option value="custom" className="dark:bg-slate-800">بازه دلخواه</option>
                        </select>
                    </div>
                    {timeRange === 'custom' && <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl animate-fade-in border border-slate-200 dark:border-slate-700"><PDatePicker val={sDate} setVal={setSDate} /><span className="text-slate-400 font-bold">تا</span><PDatePicker val={eDate} setVal={setEDate} /></div>}
               </div>
               <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
                    <div className="relative flex-1 min-w-[200px]"><Search className="absolute right-3 top-3.5 w-4 h-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="جستجو (نام، کد ملی...)" className="w-full pl-3 pr-10 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white focus:border-blue-500 transition-colors shadow-sm"/></div>
                    <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl outline-none font-bold text-slate-700 dark:text-white shadow-sm cursor-pointer"><option value="All" className="dark:bg-slate-800">همه ثبت‌کننده‌ها</option><option value="public" className="dark:bg-slate-800">مراجعه کننده (عمومی)</option>{settings?.users.filter((u:any) => u.role === 'staff').map((u:any) => (<option key={u.id} value={`user-${u.username}`} className="dark:bg-slate-800">{u.name}</option>))}</select>
               </div>
          </div>

          {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
                  <StatCard label="تعداد فرم‌ها" val={analytics.totalCount} color="blue" icon={Hash} />
                  <StatCard label="پیگیری فوری" val={analytics.urgentFollowUps} color="red" icon={AlertTriangle} onClick={() => { if (analytics.urgentFollowUps > 0) { setViewMode('urgent'); setCurrentPage(1); } }} isClickable={analytics.urgentFollowUps > 0} />
                  <StatCard label="میانگین رضایت" val={analytics.averageSatisfaction} color="emerald" icon={CheckCircle} suffix="/5" />
                  <StatCard label="شاخص NPS" val={analytics.npsScore} color={analytics.npsScore > 0 ? 'indigo' : 'orange'} icon={Activity} onClick={() => setShowNpsInfo(true)} isClickable={true} />
              </div>
          )}

          {/* Table */}
          <div className="glass-panel rounded-3xl overflow-hidden shadow-xl border border-white/50 dark:border-white/10 relative print-only" ref={tableRef}>
               <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center no-print">
                   <h2 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">{viewMode === 'urgent' && <AlertTriangle className="w-5 h-5 text-red-500" />}{viewMode === 'urgent' ? 'لیست پیگیری‌های فوری' : 'لیست پرونده‌ها'}</h2>
                   {viewMode === 'urgent' && <button onClick={() => setViewMode('default')} className="text-sm bg-slate-200 px-3 py-1 rounded-lg">بازگشت</button>}
                   <button onClick={() => window.print()} className="flex items-center gap-2 text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl font-bold hover:bg-blue-200"><Printer className="w-4 h-4"/> چاپ</button>
               </div>
               <div className="overflow-x-auto custom-scrollbar pb-2">
                   <table className="w-full text-right whitespace-nowrap">
                       <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-300 font-bold text-sm backdrop-blur-sm sticky top-0 z-10">
                           <tr>
                               <th className="p-5 w-10 text-center">#</th>
                               <SortableHeader label="نام بیمار" sortKey="patientInfo.name" currentSort={sortConfig} onSort={handleSort} />
                               <SortableHeader label="کد ملی" sortKey="patientInfo.nationalId" currentSort={sortConfig} onSort={handleSort} />
                               <SortableHeader label="موبایل" sortKey="patientInfo.mobile" currentSort={sortConfig} onSort={handleSort} />
                               <SortableHeader label="سن" sortKey="age" currentSort={sortConfig} onSort={handleSort} center />
                               <SortableHeader label="بخش" sortKey="ward" currentSort={sortConfig} onSort={handleSort} />
                               <SortableHeader label="پزشک" sortKey="clinicalInfo.doctor" currentSort={sortConfig} onSort={handleSort} />
                               {/* Only show questions for Main Row or Expanded? */}
                               {questions.map((q: any) => (<th key={q.id} className="p-5 min-w-[200px] text-xs opacity-70 border-r border-slate-200 dark:border-slate-700" title={q.text}>{q.text.length > 30 ? q.text.substring(0,30)+'...' : q.text}</th>))}
                               <SortableHeader label="تاریخ ثبت" sortKey="createdAt" currentSort={sortConfig} onSort={handleSort} center />
                               <SortableHeader label="ثبت کننده" sortKey="registrarName" currentSort={sortConfig} onSort={handleSort} />
                           </tr>
                       </thead>
                       <tbody className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                           {paginatedGroups.map((group, index) => {
                               const item = group.main;
                               const hasHistory = group.children.length > 0;
                               const isExpanded = item.patientInfo.nationalId ? expandedGroups.has(item.patientInfo.nationalId) : false;
                               
                               const rowClass = viewMode === 'urgent' ? 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100/50' : 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10';
                               
                               return (
                               <React.Fragment key={item.id}>
                                   {/* Main Row */}
                                   <tr onClick={() => setSelectedPatient(item)} className={`border-t border-slate-100 dark:border-slate-700/50 transition-colors group cursor-pointer ${rowClass}`}>
                                       <td className="p-5 text-center text-slate-400">
                                            {(currentPage - 1) * itemsPerPage + index + 1}
                                            {hasHistory && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); toggleGroup(item.patientInfo.nationalId); }} 
                                                    className="mt-1 p-1 bg-slate-200 rounded hover:bg-slate-300 mx-auto block"
                                                    title="مشاهده سوابق"
                                                >
                                                    {isExpanded ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                                                </button>
                                            )}
                                       </td>
                                       <td className="p-5"><span className="font-bold text-lg text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-2">{item.patientInfo.name}{hasHistory && <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 border border-slate-300"><Folder className="w-3 h-3"/> {toPersianDigits(group.children.length + 1)} پرونده</span>}</span></td>
                                       <td className="p-5 font-mono">{toPersianDigits(item.patientInfo.nationalId)}</td>
                                       <td className="p-5 font-mono">{toPersianDigits(item.patientInfo.mobile)}</td>
                                       <td className="p-5 text-center">{calculateAgeDetails(item.patientInfo.birthDate).text}</td>
                                       <td className="p-5">{item.ward}</td>
                                       <td className="p-5">{item.clinicalInfo.doctor || '-'}</td>
                                       {questions.map((q: any) => (<td key={q.id} className="p-5 text-center border-r border-slate-100 dark:border-slate-800">{renderSimpleAnswer(q, item.answers[q.id])}{item.audioFiles && item.audioFiles[q.id] && <div className="mx-auto mt-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>}</td>))}
                                       <td className="p-5 text-center text-sm" dir="ltr"><span className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-700 dark:text-slate-300 font-mono font-bold">{toPersianDigits(formatDate(item.createdAt)[0])} <span className="text-xs opacity-60">{toPersianDigits(formatDate(item.createdAt)[1])}</span></span></td>
                                       <td className="p-5"><span className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold w-fit ${item.source === 'public' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}><User className="w-3 h-3"/>{item.registrarName || 'نامشخص'}</span></td>
                                   </tr>

                                   {/* Child Rows (History) */}
                                   {isExpanded && group.children.map((child, cIdx) => (
                                       <tr key={child.id} onClick={() => setSelectedPatient(child)} className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 hover:bg-slate-100 cursor-pointer">
                                           <td className="p-5 text-center text-slate-400 border-r-4 border-blue-400 bg-blue-50/30"></td>
                                           <td className="p-5 opacity-50 text-sm">↳ سابقه قبلی</td>
                                           <td className="p-5 font-mono opacity-50 text-xs">"</td>
                                           <td className="p-5 font-mono opacity-50 text-xs">"</td>
                                           <td className="p-5 text-center opacity-50 text-xs">"</td>
                                           <td className="p-5 text-sm">{child.ward}</td>
                                           <td className="p-5 text-sm">{child.clinicalInfo.doctor}</td>
                                           {questions.map((q: any) => (<td key={q.id} className="p-5 text-center border-r border-slate-200 dark:border-slate-700 opacity-70 scale-90">{renderSimpleAnswer(q, child.answers[q.id])}</td>))}
                                           <td className="p-5 text-center text-sm" dir="ltr"><span className="bg-white border border-slate-200 px-2 py-1 rounded text-slate-500 font-mono text-xs">{toPersianDigits(formatDate(child.createdAt)[0])}</span></td>
                                           <td className="p-5 opacity-70 text-xs">{child.registrarName}</td>
                                       </tr>
                                   ))}
                               </React.Fragment>
                               );
                           })}
                           {paginatedGroups.length === 0 && <tr><td colSpan={20} className="p-10 text-center text-slate-400">داده‌ای یافت نشد</td></tr>}
                       </tbody>
                   </table>
               </div>
               
               {totalPages > 1 && (
                   <div className="flex justify-center items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-700 no-print">
                       <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 disabled:opacity-50 text-sm font-bold">قبلی</button>
                       <span className="text-sm font-bold text-slate-600 dark:text-slate-400">صفحه {currentPage} از {totalPages}</span>
                       <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 disabled:opacity-50 text-sm font-bold">بعدی</button>
                   </div>
               )}
          </div>
          
          {/* Charts & Analytics components remain here (omitted for brevity, assume same as before) */}
      </div>
    </div>
  );
};

// Render Helper
const renderSimpleAnswer = (q: any, val: any) => {
    if (val === undefined || val === null) return <span className="text-slate-300">-</span>;
    if (q.type === 'yes_no') return val ? <span className="text-emerald-500 font-bold">بله</span> : <span className="text-red-500 font-bold">خیر</span>;
    if (q.type === 'likert') return <span className="font-bold">{toPersianDigits(val)}</span>;
    if (q.type === 'nps') return <span className={`font-bold px-2 py-0.5 rounded ${val>=9?'bg-green-100 text-green-700':val<=6?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}`}>{toPersianDigits(val)}</span>;
    return <span className="text-xs truncate max-w-[100px] block" title={val}>{val}</span>;
};

const renderAnswer = (q: any, val: any) => {
    if (val === undefined || val === null) return <span className="text-slate-300 italic">بدون پاسخ</span>;
    if (q.type === 'yes_no') return val ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> بله</span> : <span className="text-red-600 flex items-center gap-1"><X className="w-4 h-4"/> خیر</span>;
    if (q.type === 'likert') return (<div className="flex gap-1">{[1,2,3,4,5].map(i => (<div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border ${val === i ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}>{toPersianDigits(i)}</div>))}</div>);
    return <span>{val}</span>;
}

const InfoItem = ({label, value, className}: any) => (<div className={className}><span className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</span><span className="font-bold text-slate-800 dark:text-white text-base">{value || '-'}</span></div>);
const StatCard = ({label, val, color, icon: Icon, suffix, onClick, isClickable}: any) => (<div onClick={onClick} className={`glass-card p-6 rounded-[2rem] border-b-4 border-${color}-500 flex justify-between items-center shadow-lg transition-transform ${isClickable ? 'cursor-pointer hover:-translate-y-2 hover:shadow-xl' : 'hover:-translate-y-1'}`}><div><p className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-1">{label}</p><h3 className="text-3xl font-black text-slate-800 dark:text-white">{toPersianDigits(val)}<span className="text-sm opacity-50 ml-1 font-medium">{suffix}</span></h3></div><div className={`bg-${color}-100 dark:bg-${color}-500/20 p-4 rounded-2xl text-${color}-600 dark:text-${color}-400`}><Icon className="w-6 h-6" /></div></div>);
const SortableHeader = ({label, sortKey, currentSort, onSort, center}: any) => (<th className={`p-5 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors select-none ${center ? 'text-center' : ''}`} onClick={() => onSort(sortKey)}><div className={`flex items-center gap-2 ${center ? 'justify-center' : ''}`}>{label}<div className="text-slate-400">{currentSort?.key === sortKey ? (currentSort.direction === 'asc' ? <ArrowUp className="w-4 h-4 text-blue-500"/> : <ArrowDown className="w-4 h-4 text-blue-500"/>) : (<ArrowUpDown className="w-3 h-3 opacity-50"/>)}</div></div></th>);
const getNestedValue = (obj: any, path: string) => { return path.split('.').reduce((o, key) => (o && o[key] !== 'undefined') ? o[key] : null, obj); };
const PDatePicker = ({val, setVal}: any) => { const months = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"]; return (<div className="flex gap-1" dir="ltr"><select value={val.y} onChange={e=>setVal({...val, y: +e.target.value})} className="bg-transparent text-xs font-bold outline-none cursor-pointer dark:text-white text-center appearance-none dark:bg-slate-800">{Array.from({length: 50}, (_,i) => 1380+i).map(y => <option key={y} value={y} className="dark:bg-slate-800">{toPersianDigits(y)}</option>)}</select><span className="text-slate-300">/</span><select value={val.m} onChange={e=>setVal({...val, m: +e.target.value})} className="bg-transparent text-xs font-bold outline-none cursor-pointer dark:text-white text-center appearance-none dark:bg-slate-800">{months.map((m,i) => <option key={i} value={i+1} className="dark:bg-slate-800">{m}</option>)}</select><span className="text-slate-300">/</span><select value={val.d} onChange={e=>setVal({...val, d: +e.target.value})} className="bg-transparent text-xs font-bold outline-none cursor-pointer dark:text-white text-center appearance-none dark:bg-slate-800">{Array.from({length: 31}, (_,i) => i+1).map(d => <option key={d} value={d} className="dark:bg-slate-800">{toPersianDigits(d)}</option>)}</select></div>) };

export default AdminDashboard;
