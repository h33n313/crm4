
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Moon, Sun, Home, LogOut, Clock, LogIn, Lock, UserCog } from 'lucide-react';
import Logo from './Logo';
import { getSettings, updateUserPassword } from '../services/dataService';
import { AppUser } from '../types';

const Header: React.FC<{ title?: string; showLogout?: boolean }> = ({ title, showLogout }) => {
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
    if (savedTheme === 'dark') { setIsDark(true); document.documentElement.classList.add('dark'); }
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
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
      if (!targetUserId || !newPassword) return alert('لطفاً اطلاعات را تکمیل کنید');
      const success = await updateUserPassword(targetUserId, newPassword);
      if (success) { alert('رمز عبور تغییر کرد'); setShowPasswordModal(false); setNewPassword(''); }
      else alert('خطا در تغییر رمز');
  };

  // Hierarchy Logic: Mahlouji restricted from seeing others
  const canManageOthers = currentUser && ['matlabi', 'kand', 'mostafavi'].includes(currentUser.username);
  const selectableUsers = allUsers.filter(u => {
      if (!currentUser) return false;
      if (u.id === currentUser.id) return true;
      if (canManageOthers) return !['matlabi', 'kand', 'mahlouji', 'mostafavi'].includes(u.username);
      return false;
  });

  return (
    <div className="sticky top-0 z-50 px-4 pt-4 pb-2 w-full no-print">
      {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="glass-panel w-full max-w-md p-8 rounded-3xl bg-white dark:bg-slate-900 border shadow-2xl">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-2"><Lock className="w-6 h-6 text-blue-500"/> تغییر رمز عبور</h3>
                  <div className="space-y-4">
                      {selectableUsers.length > 1 ? (
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">انتخاب کاربر</label>
                              <select value={targetUserId} onChange={e => setTargetUserId(e.target.value)} className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border outline-none font-bold">
                                  {selectableUsers.map(u => <option key={u.id} value={u.id}>{u.name} {u.id === currentUser?.id ? '(خودم)' : ''}</option>)}
                              </select>
                          </div>
                      ) : <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-700 dark:text-blue-300 font-bold text-center">تغییر رمز برای: {currentUser?.name}</div>}
                      <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border outline-none text-center font-bold" placeholder="رمز جدید..."/>
                      <div className="flex gap-2 pt-4"><button onClick={() => setShowPasswordModal(false)} className="flex-1 py-3 rounded-xl bg-slate-100 font-bold">انصراف</button><button onClick={handlePasswordUpdate} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold">تایید</button></div>
                  </div>
              </div>
          </div>
      )}
      <div className="max-w-7xl mx-auto glass-panel rounded-[2rem] p-3 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-2">
             <div className="bg-emerald-500/5 px-4 py-2 rounded-2xl flex items-center gap-3 border shadow-inner">
                <span className="text-xl font-black font-['Lalezar']" dir="ltr">{currentTime.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                <Clock className="w-5 h-5 text-emerald-600" />
             </div>
        </div>
        <div onClick={() => navigate('/')} className="cursor-pointer hover:scale-105 transition-transform"><Logo size="sm" /></div>
        <div className="flex items-center gap-2">
            {showLogout && (
                <>
                 <button onClick={openPasswordModal} className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"><UserCog className="w-5 h-5" /></button>
                 <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all"><LogOut className="w-5 h-5" /></button>
                </>
            )}
            <button onClick={toggleTheme} className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-2xl shadow-lg">{isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
        </div>
      </div>
    </div>
  );
};
export default Header;
