
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicHome from './components/PublicHome';
import AdminDashboard from './components/AdminDashboard';
import StaffPortal from './components/StaffPortal';
import DeveloperPanel from './components/DeveloperPanel';
import Login from './components/Login';
import SurveyForm from './components/SurveyForm'; // Import SurveyForm directly for specific routes
import Header from './components/Header'; // Import Header
import { Stethoscope, Activity, Thermometer, Heart, Pill, ShieldPlus, Syringe, Brain, Dna } from 'lucide-react';
import { getSettings } from './services/dataService';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRole }: React.PropsWithChildren<{ allowedRole: string }>) => {
  const role = localStorage.getItem('user_role');
  if (!role || role !== allowedRole) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// --- Dynamic Bubble System ---

interface BubbleData {
    id: number;
    x: number; // percentage
    y: number; // percentage
    size: number; // pixels
    iconIndex: number;
    color: string;
    animationClass: string;
    isPopping: boolean;
}

const ICON_MAP: Record<string, any> = {
    Stethoscope, Activity, Thermometer, Heart, Pill, ShieldPlus, Syringe, Brain, Dna
};

const COLORS = [
    'text-blue-500', 'text-emerald-500', 'text-red-500', 'text-purple-500', 
    'text-orange-500', 'text-teal-500', 'text-indigo-500', 'text-pink-500'
];
const ANIMATIONS = ['animate-float-1', 'animate-float-2', 'animate-float-3'];

const App: React.FC = () => {
  const [bubbles, setBubbles] = useState<BubbleData[]>([]);
  const [activeIcons, setActiveIcons] = useState<string[]>(Object.keys(ICON_MAP));

  // Initialize Settings & Bubbles
  useEffect(() => {
    const init = async () => {
        try {
            const settings = await getSettings();
            let icons = settings.enabledIcons || Object.keys(ICON_MAP);
            if (icons.length === 0) icons = Object.keys(ICON_MAP); // Fallback if user disabled all
            setActiveIcons(icons);
            
            const initialBubbles: BubbleData[] = [];
            for (let i = 0; i < 20; i++) {
                initialBubbles.push(createRandomBubble(i, icons));
            }
            setBubbles(initialBubbles);
        } catch (e) {
            console.error(e);
        }
    };
    init();
  }, []);

  const createRandomBubble = (id: number, iconList: string[], x?: number, y?: number, sizeScale: number = 1): BubbleData => {
      const iconsToUse = iconList && iconList.length > 0 ? iconList : Object.keys(ICON_MAP);
      return {
          id: id,
          x: x !== undefined ? x : Math.random() * 90 + 5, // 5% to 95%
          y: y !== undefined ? y : Math.random() * 90 + 5,
          size: (Math.random() * 30 + 30) * sizeScale, // 30px to 60px base
          iconIndex: Math.floor(Math.random() * iconsToUse.length),
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          animationClass: ANIMATIONS[Math.floor(Math.random() * ANIMATIONS.length)],
          isPopping: false
      };
  };

  const handleBubbleClick = useCallback((bubbleId: number, x: number, y: number) => {
      // 1. Mark as popping
      setBubbles(prev => prev.map(b => b.id === bubbleId ? { ...b, isPopping: true } : b));

      // 2. Remove after animation and Spawn 2 new ones
      setTimeout(() => {
          setBubbles(prev => {
              const filtered = prev.filter(b => b.id !== bubbleId);
              // Limit total bubbles to prevent crash
              if (filtered.length > 50) return filtered;

              const newId1 = Date.now();
              const newId2 = Date.now() + 1;
              
              // Spawn nearby with slight offset
              return [
                  ...filtered,
                  createRandomBubble(newId1, activeIcons, x - 2, y - 2, 0.8),
                  createRandomBubble(newId2, activeIcons, x + 2, y + 2, 0.8)
              ];
          });
      }, 300); // Wait for pop animation
  }, [activeIcons]);

  return (
    <HashRouter>
      <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-transparent transition-colors duration-500 font-sans selection:bg-emerald-500 selection:text-white">
          
          {/* DYNAMIC BUBBLE BACKGROUND */}
          <div className="fixed inset-0 overflow-hidden z-0 pointer-events-none">
              {bubbles.map(bubble => {
                  const iconName = activeIcons[bubble.iconIndex] || activeIcons[0];
                  const Icon = ICON_MAP[iconName] || Activity;
                  return (
                      <div
                        key={bubble.id}
                        onClick={(e) => {
                            // Enable pointer events for the bubble specifically
                            e.stopPropagation();
                            handleBubbleClick(bubble.id, bubble.x, bubble.y);
                        }}
                        className={`absolute flex items-center justify-center rounded-full shadow-lg border border-white/20 backdrop-blur-sm bg-white/40 dark:bg-slate-800/30 cursor-pointer pointer-events-auto transition-colors hover:bg-white/60 dark:hover:bg-slate-700/50 ${bubble.animationClass} ${bubble.isPopping ? 'animate-pop' : 'animate-fade-in'}`}
                        style={{
                            left: `${bubble.x}%`,
                            top: `${bubble.y}%`,
                            width: `${bubble.size}px`,
                            height: `${bubble.size}px`,
                            transition: 'left 10s ease, top 10s ease' // Smooth drift
                        }}
                      >
                          <Icon className={`w-1/2 h-1/2 ${bubble.color}`} />
                      </div>
                  );
              })}
          </div>

          <div className="relative z-10">
              <Routes>
                <Route path="/" element={<PublicHome />} />
                
                {/* Specific Survey Routes for QR Codes - NOW WITH HEADER */}
                <Route path="/survey/inpatient" element={
                     <div className="min-h-screen flex flex-col">
                        <Header />
                        <div className="p-4 flex flex-col justify-center max-w-4xl mx-auto w-full flex-1">
                            <SurveyForm source="public" surveyType="inpatient" onSuccess={() => window.location.reload()} />
                        </div>
                     </div>
                } />
                <Route path="/survey/discharge" element={
                     <div className="min-h-screen flex flex-col">
                        <Header />
                        <div className="p-4 flex flex-col justify-center max-w-4xl mx-auto w-full flex-1">
                            <SurveyForm source="public" surveyType="discharge" onSuccess={() => window.location.reload()} />
                        </div>
                     </div>
                } />

                <Route path="/login" element={<Login />} />
                
                <Route path="/staff" element={
                  <ProtectedRoute allowedRole="staff">
                    <StaffPortal />
                  </ProtectedRoute>
                } />

                <Route path="/admin" element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                } />

                <Route path="/developer" element={
                  <ProtectedRoute allowedRole="developer">
                    <DeveloperPanel />
                  </ProtectedRoute>
                } />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
          </div>
      </div>
    </HashRouter>
  );
};

export default App;