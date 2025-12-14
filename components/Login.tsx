
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck, Terminal, AlertCircle, Settings as SettingsIcon, X, UserCog, Users, Star } from 'lucide-react';
import { getSettings, logAction } from '../services/dataService';
import { AppUser, Settings } from '../types';
import Header from './Header';
import Logo from './Logo';

const Login: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Login States
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [devPasswordInput, setDevPasswordInput] = useState('');
  
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [userPasswordInput, setUserPasswordInput] = useState('');
  
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
        try {
            const data = await getSettings();
            setSettings(data);
            setUsers(data.users);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, []);

  const handleUserClick = (user: AppUser) => {
    if (user.isPasswordEnabled) {
        setSelectedUser(user);
        setUserPasswordInput('');
        setError('');
    } else {
        completeLogin(user);
    }
  };

  const completeLogin = (user: AppUser) => {
    localStorage.setItem('user_role', user.role);
    localStorage.setItem('user_name', user.name);
    localStorage.setItem('user_username', user.username);
    
    logAction('INFO', `ورود کاربر: ${user.name} (${user.role})`);

    if (user.role === 'admin') {
        navigate('/admin');
    } else {
        navigate('/staff');
    }
  };

  const verifyUserPassword = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedUser && userPasswordInput === selectedUser.password) {
          completeLogin(selectedUser);
      } else {
          setError('رمز عبور اشتباه است');
      }
  };

  const handleDevLogin = (e: React.FormEvent) => {
      e.preventDefault();
      const devPass = settings?.developerPassword || '111';
      if (devPasswordInput === devPass) {
          localStorage.setItem('user_role', 'developer');
          logAction('WARN', 'ورود به پنل توسعه‌دهنده');
          navigate('/developer');
      } else {
          setError('رمز عبور اشتباه است');
      }
  };

  // Grouping Logic for Requested Hierarchy - SORTED BY ORDER
  const mainManagers = users
    .filter(u => ['matlabi', 'kand', 'mahlouji'].includes(u.username))
    .sort((a,b) => (a.order || 99) - (b.order || 99));
    
  const supervisors = users
    .filter(u => ['mostafavi'].includes(u.username))
    .sort((a,b) => (a.order || 99) - (b.order || 99));
    
  const staff = users
    .filter(u => !['matlabi', 'kand', 'mahlouji', 'mostafavi'].includes(u.username))
    .sort((a,b) => (a.order || 99) - (b.order || 99));

  if (loading) return <div className="min-h-screen flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xl">در حال بارگذاری...</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Dev Login Modal */}
      {showDevLogin && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
              <div className="glass-panel border-none bg-slate-900/90 text-white p-8 rounded-3xl w-full max-w-sm border border-slate-700 shadow-2xl">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-400">
                      <Terminal className="w-6 h-6" />
                      پنل توسعه‌دهنده
                  </h3>
                  <form onSubmit={handleDevLogin} className="space-y-4">
                      <input 
                        type="password" 
                        value={devPasswordInput}
                        onChange={e => setDevPasswordInput(e.target.value)}
                        placeholder="رمز عبور..."
                        className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500 outline-none text-center tracking-widest"
                        autoFocus
                      />
                      {error && <p className="text-red-400 text-sm font-bold text-center bg-red-900/20 py-2 rounded-lg">{error}</p>}
                      <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => setShowDevLogin(false)} className="flex-1 py-3 text-slate-400 hover:text-white transition-colors">انصراف</button>
                          <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-green-900/20">ورود</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* User Password Modal */}
      {selectedUser && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
              <div className="glass-panel bg-white/95 dark:bg-slate-900/95 p-8 rounded-3xl w-full max-w-sm shadow-2xl border border-white/20">
                   <div className="flex flex-col items-center mb-6">
                        <div className={`w-20 h-20 rounded-2xl ${selectedUser.avatarColor || 'bg-emerald-600'} flex items-center justify-center text-white shadow-lg mb-4`}>
                            <Lock className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white">{selectedUser.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">لطفاً رمز عبور خود را وارد کنید</p>
                   </div>
                  
                  <form onSubmit={verifyUserPassword} className="space-y-4">
                      <input 
                        type="password" 
                        value={userPasswordInput}
                        onChange={e => setUserPasswordInput(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-center tracking-widest text-lg"
                        autoFocus
                      />
                      {error && <p className="text-red-500 dark:text-red-400 text-sm font-bold text-center">{error}</p>}
                      <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => {setSelectedUser(null); setError('');}} className="flex-1 py-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-bold">بازگشت</button>
                          <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/30">ورود</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      <div className="flex-1 flex items-center justify-center p-4 md:p-8 z-10 relative">
        <button 
            onClick={() => { setShowDevLogin(true); setError(''); setDevPasswordInput(''); }}
            className="absolute bottom-6 left-6 p-3 bg-white/10 hover:bg-emerald-500 text-slate-400 hover:text-white backdrop-blur-md rounded-full transition-all shadow-lg hover:rotate-90 z-50 border border-white/10"
            title="تنظیمات توسعه‌دهنده"
        >
            <SettingsIcon className="w-6 h-6" />
        </button>

        <div className="w-full max-w-6xl glass-panel p-8 md:p-12 rounded-[3rem] shadow-2xl border-2 border-white/50 dark:border-emerald-400/20 backdrop-blur-2xl relative overflow-hidden">
            
            <div className="flex flex-col items-center justify-center mb-12 relative z-10">
                <div className="mb-6">
                    <Logo size="xl" showText={false} />
                </div>
                
                <h2 className="text-3xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-800 to-teal-700 dark:from-emerald-200 dark:to-teal-200 mb-2 drop-shadow-sm text-center">
                    {settings?.brandName || 'سامانه جهان امید سلامت'}
                </h2>
            </div>

            <div className="flex flex-col gap-8 relative z-10">
                
                {/* 1. Main Managers */}
                {mainManagers.length > 0 && (
                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-800/50">
                        <h3 className="text-indigo-800 dark:text-indigo-200 font-bold text-xl mb-4 flex items-center gap-2">
                            <ShieldCheck className="w-6 h-6" /> مدیران اصلی
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {mainManagers.map(user => (
                                <UserCard key={user.id} user={user} onClick={() => handleUserClick(user)} roleLabel={user.title || "مدیر اصلی"} />
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. Supervisors */}
                {supervisors.length > 0 && (
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-800/50">
                        <h3 className="text-blue-800 dark:text-blue-200 font-bold text-xl mb-4 flex items-center gap-2">
                            <Star className="w-6 h-6" /> سوپروایزر
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {supervisors.map(user => (
                                <UserCard key={user.id} user={user} onClick={() => handleUserClick(user)} roleLabel={user.title || "سوپروایزر"} />
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. Staff */}
                {staff.length > 0 && (
                    <div className="bg-teal-50/50 dark:bg-teal-900/10 p-6 rounded-3xl border border-teal-100 dark:border-teal-800/50">
                        <h3 className="text-teal-800 dark:text-teal-200 font-bold text-xl mb-4 flex items-center gap-2">
                            <Users className="w-6 h-6" /> پرسنل و منشی‌ها
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {staff.map(user => (
                                <UserCard key={user.id} user={user} onClick={() => handleUserClick(user)} roleLabel={user.title || (user.role === 'admin' ? 'مدیر' : 'پرسنل')} />
                            ))}
                        </div>
                    </div>
                )}

            </div>
            
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

        </div>
      </div>
    </div>
  );
};

interface UserCardProps {
    user: AppUser;
    onClick: () => void;
    roleLabel: string;
}

const UserCard: React.FC<UserCardProps> = ({ user, onClick, roleLabel }) => (
    <button 
        onClick={onClick}
        className="group relative overflow-hidden bg-white/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 border border-white/50 dark:border-white/10 rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg flex items-center gap-4 text-right w-full"
    >
        <div className={`w-14 h-14 rounded-xl ${user.avatarColor || 'bg-slate-500'} flex items-center justify-center text-white shadow-md group-hover:rotate-6 transition-transform shrink-0`}>
            <User className="w-7 h-7" />
        </div>
        <div className="flex-1">
            <h2 className="text-lg font-black text-slate-800 dark:text-white mb-1">{user.name}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold">{roleLabel}</p>
        </div>
        {user.isPasswordEnabled && (
            <div className="bg-slate-100 dark:bg-slate-700/50 p-2 rounded-full">
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-300" />
            </div>
        )}
    </button>
);

export default Login;
