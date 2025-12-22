
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TimeRange, Feedback } from '../types';
import { getFeedbackData, calculateAnalytics, getSettings, deleteFeedback, saveFeedback, logAction, toPersianDigits } from '../services/dataService';
import { Search, Hash, Trash2, Activity, CheckCircle, AlertTriangle, Filter, User, ArrowUpDown, ArrowUp, ArrowDown, X, Edit, FileText, Printer, ChevronDown, ChevronUp, Folder, RefreshCw } from 'lucide-react';
// @ts-ignore
import jalaali from 'jalaali-js';
import Header from './Header';
import SurveyForm from './SurveyForm';

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<Feedback[]>([]);
  const [filteredData, setFilteredData] = useState<Feedback[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  
  const [timeRange, setTimeRange] = useState<TimeRange>(TimeRange.ALL); // Changed default to ALL
  const [filterSource, setFilterSource] = useState('All'); 
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  const currentUserUsername = localStorage.getItem('user_username');
  const isReadOnlyAdmin = currentUserUsername === 'mahlouji';

  const [viewMode, setViewMode] = useState<'default' | 'urgent'>('default');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedPatient, setSelectedPatient] = useState<Feedback | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const currentJ = jalaali.toJalaali(new Date());
  const [sDate, setSDate] = useState({y: currentJ.jy, m: currentJ.jm, d: 1});
  const [eDate, setEDate] = useState({y: currentJ.jy, m: currentJ.jm, d: currentJ.jd});

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
      setIsLoading(true);
      const s = await getSettings();
      setSettings(s);
      const res = await getFeedbackData();
      // Important: show everything final, don't over-filter here
      setData(res.filter(d => d.status === 'final'));
      setIsLoading(false);
  };

  useEffect(() => {
      applyFilters();
  }, [data, timeRange, sDate, eDate, filterSource, search]);

  const applyFilters = () => {
      let temp = [...data];

      if (timeRange !== TimeRange.ALL) {
          const now = new Date();
          const nowJ = jalaali.toJalaali(now);
          
          temp = temp.filter(d => {
              const dDate = new Date(d.createdAt);
              const dj = jalaali.toJalaali(dDate);

              if (timeRange === TimeRange.TODAY) return dj.jy === nowJ.jy && dj.jm === nowJ.jm && dj.jd === nowJ.jd;
              if (timeRange === TimeRange.WEEKLY) {
                  const diff = (now.getTime() - dDate.getTime()) / (1000 * 3600 * 24);
                  return diff <= 7;
              }
              if (timeRange === TimeRange.MONTHLY) return dj.jy === nowJ.jy && dj.jm === nowJ.jm;
              if (timeRange === TimeRange.CUSTOM) {
                  const startNum = sDate.y * 10000 + sDate.m * 100 + sDate.d;
                  const endNum = eDate.y * 10000 + eDate.m * 100 + eDate.d;
                  const dNum = dj.jy * 10000 + dj.jm * 100 + dj.jd;
                  return dNum >= startNum && dNum <= endNum;
              }
              return true;
          });
      }

      if (filterSource !== 'All') {
          if (filterSource === 'public') temp = temp.filter(d => d.source === 'public');
          else if (filterSource.startsWith('user-')) temp = temp.filter(d => d.registrarUsername === filterSource.replace('user-', ''));
      }

      if (search) {
          const t = search.toLowerCase();
          temp = temp.filter(d => 
            d.patientInfo.name.includes(t) || d.patientInfo.nationalId.includes(t) || d.patientInfo.mobile.includes(t) || d.ward.includes(t)
          );
      }

      setFilteredData(temp);
      if (settings) setAnalytics(calculateAnalytics(temp, settings.questions));
  };

  const groupedData = useMemo(() => {
      let sorted = [...filteredData];
      if (viewMode === 'urgent') sorted = analytics?.urgentList || [];

      sorted.sort((a, b) => {
          if (sortConfig) {
              const aVal = getNestedValue(a, sortConfig.key);
              const bVal = getNestedValue(b, sortConfig.key);
              if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
              if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      const groups: any[] = [];
      const nidMap = new Map();
      sorted.forEach(item => {
          const nid = item.patientInfo.nationalId;
          if (nid && nidMap.has(nid)) groups[nidMap.get(nid)].children.push(item);
          else { groups.push({ main: item, children: [] }); nidMap.set(nid, groups.length - 1); }
      });
      return groups;
  }, [filteredData, sortConfig, viewMode, analytics]);

  const paginatedGroups = groupedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDelete = async (id: string) => {
      if(isReadOnlyAdmin) return;
      if(confirm('آیا از حذف این رکورد اطمینان دارید؟')) {
          await deleteFeedback(id);
          setData(prev => prev.filter(d => d.id !== id));
          if (selectedPatient?.id === id) setSelectedPatient(null);
      }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen font-bold text-blue-600 animate-pulse">در حال بارگذاری داده‌ها...</div>;

  return (
    <div className="min-h-screen pb-20">
      <Header title="داشبورد مدیریت" showLogout />

      {selectedPatient && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in no-print">
              <div className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-3xl flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2"><FileText className="w-6 h-6"/> پرونده: {selectedPatient.patientInfo.name}</h2>
                      <div className="flex gap-2">
                         <button onClick={() => window.print()} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition-colors"><Printer className="w-5 h-5"/></button>
                         <button onClick={() => {setSelectedPatient(null); setIsEditing(false);}} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-red-500 hover:text-white transition-colors"><X className="w-6 h-6"/></button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                      {isEditing ? (
                          <SurveyForm source="staff" initialData={selectedPatient} onSuccess={() => { setIsEditing(false); setSelectedPatient(null); refreshData(); }} />
                      ) : (
                          <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border">
                                  <InfoItem label="نام" value={selectedPatient.patientInfo.name} />
                                  <InfoItem label="کد ملی" value={toPersianDigits(selectedPatient.patientInfo.nationalId)} />
                                  <InfoItem label="موبایل" value={toPersianDigits(selectedPatient.patientInfo.mobile)} />
                                  <InfoItem label="بخش" value={selectedPatient.ward} />
                                  <InfoItem label="پزشک" value={selectedPatient.clinicalInfo.doctor} />
                                  <InfoItem label="تاریخ ثبت" value={new Date(selectedPatient.createdAt).toLocaleDateString('fa-IR')} />
                              </div>
                              <div className="space-y-4">
                                  <h3 className="font-bold text-lg border-b pb-2">پاسخ‌های نظرسنجی</h3>
                                  {settings?.questions.map((q: any) => (
                                      <div key={q.id} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                          <span className="text-slate-600 dark:text-slate-400 text-sm">{q.text}</span>
                                          <span className="font-bold">{renderAnswer(q, selectedPatient.answers[q.id])}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
                  {!isEditing && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                        {!isReadOnlyAdmin ? (
                            <>
                                <button onClick={() => handleDelete(selectedPatient.id)} className="px-6 py-3 rounded-xl bg-red-100 text-red-600 font-bold hover:bg-red-200 flex items-center gap-2"><Trash2 className="w-5 h-5"/> حذف</button>
                                <button onClick={() => setIsEditing(true)} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center gap-2"><Edit className="w-5 h-5"/> ویرایش</button>
                            </>
                        ) : (
                            <p className="text-xs text-slate-400 font-bold self-center italic">شما دسترسی برای تغییر اطلاعات ندارید</p>
                        )}
                        <button onClick={() => setSelectedPatient(null)} className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 font-bold">بستن</button>
                    </div>
                  )}
              </div>
          </div>
      )}

      <div className="max-w-[95%] mx-auto px-4 mt-8 space-y-6">
          <div className="glass-panel p-5 rounded-3xl flex flex-col xl:flex-row gap-6 justify-between shadow-lg border no-print">
               <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl border">
                        <Filter className="w-4 h-4 text-slate-400"/>
                        <select value={timeRange} onChange={e => setTimeRange(e.target.value as any)} className="bg-transparent outline-none font-bold text-sm cursor-pointer dark:text-white">
                            <option value="all">کل تاریخچه</option>
                            <option value="today">امروز</option>
                            <option value="weekly">۷ روز اخیر</option>
                            <option value="monthly">ماه جاری</option>
                            <option value="custom">بازه انتخابی</option>
                        </select>
                    </div>
                    {timeRange === 'custom' && <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl animate-fade-in border">
                        <PDatePicker val={sDate} setVal={setSDate} /> تا <PDatePicker val={eDate} setVal={setEDate} />
                    </div>}
                    <button onClick={refreshData} className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl hover:bg-blue-100 transition-colors"><RefreshCw className="w-4 h-4"/></button>
               </div>
               <div className="flex gap-3">
                    <div className="relative"><Search className="absolute right-3 top-3.5 w-4 h-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="جستجو..." className="pl-3 pr-10 py-3 rounded-2xl bg-white dark:bg-slate-800 border outline-none dark:text-white focus:border-blue-500 shadow-sm w-64"/></div>
                    <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="bg-white dark:bg-slate-800 border p-3 rounded-2xl outline-none font-bold dark:text-white shadow-sm cursor-pointer"><option value="All">همه ثبت‌کننده‌ها</option><option value="public">بیمار</option>{settings?.users.filter((u:any) => u.role === 'staff').map((u:any) => (<option key={u.id} value={`user-${u.username}`}>{u.name}</option>))}</select>
               </div>
          </div>

          <div className="glass-panel rounded-3xl overflow-hidden shadow-xl border relative">
               <div className="overflow-x-auto custom-scrollbar">
                   <table className="w-full text-right whitespace-nowrap">
                       <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold text-xs uppercase tracking-wider">
                           <tr>
                               <th className="p-5 w-10">#</th>
                               <SortableHeader label="بیمار" sortKey="patientInfo.name" currentSort={sortConfig} onSort={setSortConfig} />
                               <SortableHeader label="کد ملی" sortKey="patientInfo.nationalId" currentSort={sortConfig} onSort={setSortConfig} />
                               <SortableHeader label="بخش" sortKey="ward" currentSort={sortConfig} onSort={setSortConfig} />
                               <SortableHeader label="تاریخ" sortKey="createdAt" currentSort={sortConfig} onSort={setSortConfig} />
                               <th className="p-5">ثبت‌کننده</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                           {paginatedGroups.map((group, idx) => (
                               <tr key={group.main.id} onClick={() => setSelectedPatient(group.main)} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors group">
                                   <td className="p-5 text-slate-400 font-mono text-center">{(currentPage-1)*itemsPerPage + idx + 1}</td>
                                   <td className="p-5 font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">{group.main.patientInfo.name} {group.children.length > 0 && <span className="bg-slate-100 dark:bg-slate-800 text-[10px] px-1.5 py-0.5 rounded border"><Folder className="inline w-3 h-3 ml-1"/> {group.children.length+1}</span>}</td>
                                   <td className="p-5 text-slate-500 font-mono">{toPersianDigits(group.main.patientInfo.nationalId)}</td>
                                   <td className="p-5 text-slate-600 dark:text-slate-300 font-bold">{group.main.ward}</td>
                                   <td className="p-5 text-slate-500 text-xs" dir="ltr">{new Date(group.main.createdAt).toLocaleDateString('fa-IR')}</td>
                                   <td className="p-5 text-xs font-bold text-slate-400">{group.main.registrarName}</td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
               {paginatedGroups.length === 0 && <div className="p-20 text-center text-slate-400 font-bold">داده‌ای برای نمایش وجود ندارد.</div>}
          </div>
      </div>
    </div>
  );
};

const InfoItem = ({label, value}: any) => (<div><span className="block text-[10px] text-slate-400 uppercase font-black mb-0.5">{label}</span><span className="font-bold text-slate-800 dark:text-white text-sm">{value || '-'}</span></div>);
const renderAnswer = (q: any, val: any) => { if (val === undefined || val === null) return '-'; if (q.type === 'yes_no') return val ? 'بله' : 'خیر'; return val; };
const SortableHeader = ({label, sortKey, currentSort, onSort}: any) => (<th className="p-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors" onClick={() => onSort({key: sortKey, direction: currentSort?.key === sortKey && currentSort.direction === 'asc' ? 'desc' : 'asc'})}><div className="flex items-center gap-2">{label}{currentSort?.key === sortKey ? (currentSort.direction === 'asc' ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>) : <ArrowUpDown className="w-3 h-3 opacity-30"/>}</div></th>);
const getNestedValue = (obj: any, path: string) => path.split('.').reduce((o, key) => (o && o[key] !== 'undefined') ? o[key] : null, obj);
const PDatePicker = ({val, setVal}: any) => (<div className="flex gap-1 items-center font-mono text-xs" dir="ltr"><input type="number" className="w-10 bg-transparent text-center" value={val.d} onChange={e=>setVal({...val, d: +e.target.value})}/>/<input type="number" className="w-10 bg-transparent text-center" value={val.m} onChange={e=>setVal({...val, m: +e.target.value})}/>/<input type="number" className="w-12 bg-transparent text-center" value={val.y} onChange={e=>setVal({...val, y: +e.target.value})}/></div>);

export default AdminDashboard;
