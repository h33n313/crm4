
import React from 'react';
import { Globe, HeartPulse, Activity, Plus } from 'lucide-react';

interface Props {
    className?: string;
    showText?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<Props> = ({ className = "", showText = true, size = 'md' }) => {
    
    const sizeClasses = {
        sm: "w-8 h-8",
        md: "w-12 h-12",
        lg: "w-20 h-20",
        xl: "w-32 h-32"
    };

    const iconSize = sizeClasses[size];

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className={`relative flex items-center justify-center ${iconSize}`}>
                {/* Background Globe (Jahan) */}
                <Globe className="w-full h-full text-blue-100 dark:text-blue-900/40 absolute animate-pulse-glow" strokeWidth={1} />
                
                {/* Medical Cross Background */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 rotate-45">
                    <Plus className="w-full h-full text-emerald-500" strokeWidth={4} />
                </div>

                {/* Heart Pulse (Omid/Salamat) */}
                <HeartPulse className="w-[60%] h-[60%] text-emerald-600 dark:text-emerald-400 relative z-10 drop-shadow-md" strokeWidth={2.5} />
                
                {/* Small Activity Indicator */}
                <Activity className="w-[40%] h-[40%] text-blue-500 dark:text-blue-400 absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-sm" />
            </div>

            {showText && (
                <div className="flex flex-col items-start select-none">
                    <h1 className={`font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-blue-600 dark:from-emerald-400 dark:to-blue-400 leading-tight ${size === 'xl' ? 'text-4xl' : size === 'lg' ? 'text-3xl' : 'text-xl'}`}>
                        جهان امید سلامت
                    </h1>
                    <span className={`font-bold text-slate-400 dark:text-slate-500 tracking-[0.2em] uppercase font-sans ${size === 'xl' ? 'text-sm' : 'text-[0.6rem]'}`}>
                        Jahan Omid Salamat
                    </span>
                </div>
            )}
        </div>
    );
};

export default Logo;
