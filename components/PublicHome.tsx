
import React, { useState } from 'react';
import { ArrowUp, Activity, LogOut, Printer, QrCode, X, ExternalLink } from 'lucide-react';
import Header from './Header';
import Logo from './Logo';
import { useNavigate } from 'react-router-dom';

const PublicHome: React.FC = () => {
  const [showScrollTop, setShowScrollTop] = React.useState(false);
  const [printMode, setPrintMode] = useState<'none' | 'inpatient' | 'discharge'>('none');
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleScroll = () => {
        if (window.scrollY > 300) setShowScrollTop(true);
        else setShowScrollTop(false);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const triggerPrint = (mode: 'inpatient' | 'discharge') => {
      setPrintMode(mode);
      setTimeout(() => {
          window.print();
      }, 300);
  };

  // --- Printable Component ---
  const PrintableCard = ({ type }: { type: 'inpatient' | 'discharge' }) => {
      const url = `${window.location.origin}/#/survey/${type}`;
      const title = type === 'inpatient' ? 'فرم نظرسنجی حین بستری' : 'فرم نظرسنجی حین ترخیص';
      const icon = type === 'inpatient' ? <Activity className="w-24 h-24 text-teal-600" /> : <LogOut className="w-24 h-24 text-orange-600" />;
      const colorClass = type === 'inpatient' ? 'border-teal-500' : 'border-orange-500';
      const bgClass = type === 'inpatient' ? 'bg-teal-50' : 'bg-orange-50';
      const textClass = type === 'inpatient' ? 'text-teal-800' : 'text-orange-800';

      return (
          <div className="min-h-screen bg-white flex flex-col items-center justify-center p-0 print:p-0">
              {/* Close Button (Visible on screen, Hidden on print) */}
              <div className="fixed top-4 right-4 no-print z-50">
                  <button onClick={() => setPrintMode('none')} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-full hover:bg-black transition-colors shadow-lg font-bold">
                      <X className="w-5 h-5" /> بازگشت
                  </button>
              </div>
              
              {/* A5 Card Container */}
              <div className={`w-full h-full min-h-[190mm] border-[6px] ${colorClass} p-8 flex flex-col items-center text-center relative overflow-hidden print:border-[4px]`}>
                  
                  {/* Decorative Background */}
                  <div className={`absolute inset-0 opacity-10 ${bgClass} z-0`}></div>
                  <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-current opacity-5 z-0 text-slate-400"></div>
                  <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-current opacity-5 z-0 text-slate-400"></div>

                  <div className="relative z-10 flex flex-col items-center w-full h-full justify-between py-6">
                      
                      {/* Header */}
                      <div className="flex flex-col items-center gap-4 border-b-2 border-slate-100 w-full pb-6">
                          <Logo size="xl" />
                          <h1 className="text-3xl font-black text-slate-900 mt-2 tracking-tight">سامانه جهان امید سلامت</h1>
                      </div>

                      {/* Main Content */}
                      <div className="flex flex-col items-center gap-6 my-4">
                          <div className={`p-6 rounded-[2rem] ${type === 'inpatient' ? 'bg-teal-100' : 'bg-orange-100'}`}>
                              {icon}
                          </div>
                          <h2 className={`text-4xl font-black ${textClass} drop-shadow-sm`}>
                              {title}
                          </h2>
                          <p className="text-slate-600 font-bold text-xl max-w-sm leading-relaxed">
                              لطفاً جهت ثبت نظرات ارزشمند خود، بارکد زیر را با دوربین گوشی اسکن نمایید
                          </p>
                      </div>

                      {/* QR Code */}
                      <div className="bg-white p-4 rounded-[2.5rem] border-4 border-slate-100 shadow-2xl print:shadow-none">
                          <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`} 
                              alt="QR Code" 
                              className="w-56 h-56 mix-blend-multiply"
                          />
                      </div>

                      {/* Footer URL */}
                      <div className="mt-6 flex flex-col items-center gap-2">
                          <span className="text-slate-400 text-sm font-bold">یا به آدرس زیر مراجعه کنید:</span>
                          <div className="font-mono text-slate-500 font-bold text-sm dir-ltr bg-slate-100 px-4 py-2 rounded-lg">
                              {url}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  // If in print mode, switch view entirely to the printable card
  if (printMode !== 'none') {
      return <PrintableCard type={printMode} />;
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <Header />

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 pb-20 mt-12 flex-1 flex flex-col justify-center">
        
        <div className="text-center mb-12 flex flex-col items-center relative z-10 print:mb-4">
            <div className="mb-6">
                <Logo size="xl" showText={false} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-blue-600 dark:from-emerald-300 dark:to-blue-300 tracking-tight drop-shadow-sm mb-4 print:text-black">
                سامانه جهان امید سلامت
            </h1>
            <p className="text-slate-600 dark:text-slate-300 font-medium text-lg max-w-lg mx-auto leading-relaxed no-print">
                لطفاً فرم مربوط به وضعیت خود را انتخاب کنید
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full no-print">
            
            {/* Inpatient Card */}
            <div className="group relative overflow-hidden bg-white/70 dark:bg-slate-800/60 border-2 border-teal-200 dark:border-teal-800 rounded-[2.5rem] p-8 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-teal-500/20 text-center flex flex-col items-center justify-between gap-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-teal-500/20 transition-all"></div>
                
                <div className="flex flex-col items-center gap-4 cursor-pointer" onClick={() => navigate('/survey/inpatient')}>
                    <div className="bg-teal-100 dark:bg-teal-900/30 p-6 rounded-full text-teal-600 dark:text-teal-400 mb-2 group-hover:scale-110 transition-transform duration-300">
                        <Activity className="w-12 h-12" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white">فرم حین بستری</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-bold">مخصوص بیمارانی که در بخش بستری هستند</p>
                </div>

                <div className="flex flex-col w-full gap-3 mt-2">
                    <button onClick={() => navigate('/survey/inpatient')} className="w-full py-3 rounded-xl bg-teal-600 text-white font-bold shadow-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2">
                        شروع نظرسنجی
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); triggerPrint('inpatient'); }} className="w-full py-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-700 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors flex items-center justify-center gap-2">
                        <Printer className="w-5 h-5" /> چاپ بارکد (A5)
                    </button>
                </div>
            </div>

            {/* Discharge Card */}
            <div className="group relative overflow-hidden bg-white/70 dark:bg-slate-800/60 border-2 border-orange-200 dark:border-orange-800 rounded-[2.5rem] p-8 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-orange-500/20 text-center flex flex-col items-center justify-between gap-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-orange-500/20 transition-all"></div>
                
                <div className="flex flex-col items-center gap-4 cursor-pointer" onClick={() => navigate('/survey/discharge')}>
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-6 rounded-full text-orange-600 dark:text-orange-400 mb-2 group-hover:scale-110 transition-transform duration-300">
                        <LogOut className="w-12 h-12" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white">فرم حین ترخیص</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-bold">مخصوص بیمارانی که در حال ترخیص هستند</p>
                </div>

                <div className="flex flex-col w-full gap-3 mt-2">
                    <button onClick={() => navigate('/survey/discharge')} className="w-full py-3 rounded-xl bg-orange-600 text-white font-bold shadow-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2">
                        شروع نظرسنجی
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); triggerPrint('discharge'); }} className="w-full py-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-bold border border-orange-200 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors flex items-center justify-center gap-2">
                        <Printer className="w-5 h-5" /> چاپ بارکد (A5)
                    </button>
                </div>
            </div>

        </div>

      </div>

      {/* Scroll To Top */}
      <button 
        onClick={scrollToTop}
        className={`fixed bottom-8 left-8 bg-emerald-600 dark:bg-emerald-500 text-white p-4 rounded-full shadow-2xl transition-all duration-500 z-50 hover:bg-emerald-700 dark:hover:bg-emerald-400 hover:scale-110 border-4 border-white/20 no-print ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
      >
        <ArrowUp className="w-6 h-6" />
      </button>
    </div>
  );
};

export default PublicHome;
