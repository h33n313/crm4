
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Moon, Sun, Home, LogOut, Clock, LogIn, Lock, UserCog } from 'lucide-react';
import Logo from './Logo';
import { getSettings, updateUserPassword } from '../services/dataService';
import { AppUser } from '../types';

interface Props {
  title?: string;
  showLogout?: boolean;
}

const Header: React.FC<Props> = ({ title, showLogout }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDark, setIsDark] = useState(false);
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [targetUserId, setTargetUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        setIsDark(true);
        document.documentElement.classList.add('dark');
    } else {
        setIsDark(false);
        document.documentElement.classList.remove('dark');
    }
    
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_username');
    navigate('/login');
  };

  const openPasswordModal = async () => {
      const username = localStorage.getItem('user_username');
      if (!username) return;
      
      const settings = await getSettings();
      const user = settings.users.find(u => u.username === username);
      if (user) {
          setCurrentUser(user);
          setAllUsers(settings.users);
          setTargetUserId(user.id); 
          setShowPasswordModal(true);
      }
  };

  const handlePasswordUpdate = async () => {
      if (!targetUserId || !newPassword) return alert('لطفاً رمز عبور را وارد کنید');
      const success = await updateUserPassword(targetUserId, newPassword);
      if (success) {
          alert('رمز عبور با موفقیت تغییر کرد');
          setShowPasswordModal(false);
          setNewPassword('');
      } else {
          alert('خطا در تغییر رمز عبور');
      }
  };

  const isHome = location.pathname === '/';
  const isSurvey = location.pathname.startsWith('/survey');

  // Hierarchy Logic: Mahlouji excluded from managing others
  const canManageOthers = currentUser && ['matlabi', 'kand', 'mostafavi'].includes(currentUser.username);
  
  const editableUsers = allUsers.filter(u => {
      if (!currentUser) return false;
      if (u.id === currentUser.id) return true; 
      if (canManageOthers) {
          const isTargetStaff = !['matlabi', 'kand', 'mahlouji', 'mostafavi'].includes(u.username);
          return isTargetStaff;
      }
      return false;
  });

  return (
    <div className="sticky top-0 z-50 px-4 pt-4 pb-2 w-full no-print">
      
      {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="glass-panel w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                      <Lock className="w-6 h-6 text-blue-500"/>
                      تغییر رمز عبور
                  </h3>
                  
                  <div className="space-y-4">
                      {/* Only show select box if user has manager privileges AND more than 1 editable user */}
                      {canManageOthers && editableUsers.length > 1 ? (
                          <div>
                              <label className="block text-sm font-bold text-slate-500 mb-1">انتخاب کاربر</label>
                              <select 
                                value={targetUserId}
                                onChange={e => setTargetUserId(e.target.value)}
                                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 outline-none"
                              >
                                  {editableUsers.map(u => (
                                      <option key={u.id} value={u.id}>
                                          {u.name} {u.id === currentUser?.id ? '(خودم)' : ''}
                                      </option>
                                  ))}
                              </select>
                          </div>
                      ) : (
                          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
                              <p className="text-sm font-bold text-slate-500">تغییر رمز برای: <span className="text-slate-800 dark:text-white">{currentUser?.name}</span></p>
                          </div>
                      )}

                      <div>
                          <label className="block text-sm font-bold text-slate-500 mb-1">رمز عبور جدید</label>
                          <input 
                              type="text" 
                              value={newPassword} 
                              onChange={e => setNewPassword(e.target.value)}
                              className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 outline-none text-center tracking-widest"
                              placeholder="رمز جدید..."
                          />
                      </div>

                      <div className="flex gap-2 pt-4">
                          <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 font-bold">انصراف</button>
                          <button onClick={handlePasswordUpdate} className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700">ثبت تغییرات</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="max-w-7xl mx-auto glass-panel rounded-[2rem] p-3 flex flex-col md:flex-row justify-between items-center gap-4 shadow-2xl relative overflow-hidden border-b-2 border-emerald-500/20">
        
        <div className="flex items-center gap-2 order-1 md:order-1 w-full md:w-auto">
             <div className="glass-card bg-emerald-500/5 dark:bg-black/20 px-5 py-2 rounded-2xl flex items-center gap-4 border border-emerald-500/20 shadow-inner min-w-[220px] justify-between group cursor-default">
                 <div className="flex flex-col items-start">
                    <span className="text-2xl font-black text-emerald-900 dark:text-emerald-100 font-['Lalezar'] leading-none drop-shadow-sm pt-1" dir="ltr">
                        {currentTime.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                         {currentTime.toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                 </div>
                 <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-700 dark:text-emerald-300 shadow-sm group-hover:rotate-[360deg] transition-transform duration-1000">
                     <Clock className="w-6 h-6" />
                 </div>
             </div>
        </div>

        <div className="order-3 md:order-2 flex justify-center">
            {isHome || location.pathname === '/login' ? (
                <Logo size="md" />
            ) : (
                <h1 className="text-xl md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-800 to-teal-700 dark:from-emerald-200 dark:to-teal-200 text-center drop-shadow-sm truncate px-2">
                   {title || <Logo size="sm" showText={true} />}
                </h1>
            )}
        </div>

        <div className="flex items-center gap-3 order-2 md:order-3 justify-end w-full md:w-auto">
            {!isHome && !isSurvey && (
                 <button onClick={() => navigate('/')} className="p-3 bg-white/50 dark:bg-white/5 text-slate-700 dark:text-emerald-100 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm hover:shadow-lg hover:-translate-y-1 group" title="خانه">
                    <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
                 </button>
            )}
            
            {isHome && (
                 <button onClick={() => navigate('/login')} className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40 hover:-translate-y-1 flex items-center gap-2 font-bold group" title="ورود">
                    <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    <span className="hidden sm:inline">ورود</span>
                 </button>
            )}

            {showLogout && (
                <>
                 <button onClick={openPasswordModal} className="p-3 bg-white/50 dark:bg-white/5 text-blue-600 dark:text-blue-400 rounded-2xl hover:bg-blue-500 hover:text-white transition-all shadow-sm hover:shadow-lg hover:-translate-y-1 group" title="تغییر رمز عبور">
                    <UserCog className="w-5 h-5 group-hover:scale-110 transition-transform" />
                 </button>
                 <button onClick={handleLogout} className="p-3 bg-white/50 dark:bg-white/5 text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-500 hover:text-white dark:hover:bg-red-600 transition-all shadow-sm hover:shadow-lg hover:-translate-y-1 group" title="خروج">
                    <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                 </button>
                </>
            )}

            <button onClick={toggleTheme} className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 dark:from-indigo-600 dark:to-purple-700 text-white rounded-2xl shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300" title="تغییر تم">
                {isDark ? <Sun className="w-5 h-5 animate-spin-slow" /> : <Moon className="w-5 h-5" />}
            </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
