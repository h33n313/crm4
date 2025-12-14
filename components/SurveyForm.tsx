
import React, { useState, useEffect, useRef } from 'react';
import { saveFeedback, getSettings, toPersianDigits, findPatientByNationalId, isLeap, dateToAbsoluteDays } from '../services/dataService';
import { CheckCircle, User, Activity, FileText, CreditCard, Scissors, LogOut, ArrowLeft, ArrowRight, Timer, Save, Mic, Loader, Search, StopCircle, UserCheck, AlertTriangle, Play, Trash2, WifiOff } from 'lucide-react';
import { Feedback, Settings, PatientInfo, InsuranceInfo, ClinicalInfo, DischargeInfo } from '../types';
// @ts-ignore
import jalaali from 'jalaali-js';

interface Props {
  source: 'public' | 'staff';
  surveyType?: 'inpatient' | 'discharge';
  initialData?: Feedback;
  onSuccess?: () => void;
}

interface VoiceInputProps {
    value: string;
    onChange: (text: string) => void;
    placeholder?: string;
    onAudioData: (base64Audios: string[]) => void;
    label?: string;
    hasError?: boolean;
    transcriptionMode?: 'iotype' | 'browser' | 'gemini';
    existingAudio?: string | string[];
    isPublicView: boolean;
}

const VoiceRecorderInput: React.FC<VoiceInputProps> = ({ value, onChange, placeholder, onAudioData, label, hasError, transcriptionMode, existingAudio, isPublicView }) => {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recordings, setRecordings] = useState<string[]>([]);
    
    // Load existing recordings on mount
    useEffect(() => {
        if (existingAudio) {
            setRecordings(Array.isArray(existingAudio) ? existingAudio : [existingAudio]);
        }
    }, [existingAudio]);

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recognitionRef = useRef<any>(null);
    
    const committedTextRef = useRef(value);

    useEffect(() => {
        if (!isListening) {
            committedTextRef.current = value;
        }
    }, [value, isListening]);

    useEffect(() => {
        return () => {
            stopAll();
        };
    }, [transcriptionMode]);

    const stopAll = () => {
        setIsListening(false);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            try { mediaRecorderRef.current.stop(); } catch {}
        }
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch {}
            recognitionRef.current = null;
        }
    };

    const deleteRecording = (index: number) => {
        const newRecs = recordings.filter((_, i) => i !== index);
        setRecordings(newRecs);
        onAudioData(newRecs);
    };

    const startRecording = async () => {
        committedTextRef.current = value;
        setIsListening(true);

        try {
            // Android compatibility: prioritize webm/opus or mp4
            let mimeType = '';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4'; 
            } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                mimeType = 'audio/webm';
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const options = mimeType ? { mimeType } : undefined;
            const mediaRecorder = new MediaRecorder(stream, options);
            
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const blobType = mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
                
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result as string;
                    
                    const newRecordings = [...recordings, base64Audio];
                    setRecordings(newRecordings);
                    onAudioData(newRecordings);

                    // Server-side Processing
                    if (transcriptionMode === 'iotype' || transcriptionMode === 'gemini') {
                        setIsProcessing(true);
                        try {
                            // Unified STT handling
                            if (transcriptionMode === 'gemini') {
                                // For Gemini, we upload the file via formData to the new endpoint
                                const settings = await getSettings();
                                const apiKeys = settings.geminiApiKeys || [];
                                
                                if (apiKeys.length === 0) throw new Error(`${transcriptionMode} API keys are missing.`);

                                const formData = new FormData();
                                formData.append('audioFile', audioBlob, 'audio.webm'); // Ensure filename extension matches mimetype roughly
                                formData.append('provider', transcriptionMode);
                                // Pass array as JSON string or handle on server if FormData supports array
                                formData.append('apiKeys', JSON.stringify(apiKeys)); 

                                const res = await fetch('/api/stt', {
                                    method: 'POST',
                                    body: formData
                                });
                                const data = await res.json();
                                if (data.error) throw new Error(data.error);
                                if (data.text) {
                                    const spacer = committedTextRef.current && !committedTextRef.current.endsWith(' ') ? ' ' : '';
                                    const finalText = committedTextRef.current + spacer + data.text;
                                    committedTextRef.current = finalText;
                                    onChange(finalText);
                                }
                            } else {
                                // IOType handler (default fallback)
                                const res = await fetch('/api/transcribe-iotype', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ audio: base64Audio })
                                });
                                const data = await res.json();
                                if (data.error) throw new Error(data.error);
                                if (data.text) {
                                    const spacer = committedTextRef.current && !committedTextRef.current.endsWith(' ') ? ' ' : '';
                                    const finalText = committedTextRef.current + spacer + data.text;
                                    committedTextRef.current = finalText;
                                    onChange(finalText);
                                }
                            }
                        } catch (e: any) {
                            console.error(e);
                            alert(`خطا در تبدیل متن (${transcriptionMode}): ${e.message}`);
                        } finally {
                            setIsProcessing(false);
                        }
                    }
                };
                
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();

            // Browser Speech Recognition
            if (transcriptionMode === 'browser') {
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (!SpeechRecognition) {
                     alert("قابلیت تبدیل گفتار مرورگر در این دستگاه پشتیبانی نمی‌شود. صدا ضبط می‌شود اما به متن تبدیل نخواهد شد.");
                } else {
                    const recognition = new SpeechRecognition();
                    recognition.lang = 'fa-IR';
                    recognition.continuous = false; // False is safer for mobile
                    recognition.interimResults = true;
                    
                    recognition.onresult = (event: any) => {
                        let transcript = '';
                        for (let i = event.resultIndex; i < event.results.length; i++) {
                            if(event.results[i].isFinal){
                                transcript += event.results[i][0].transcript;
                            }
                        }
                        if (transcript) {
                             const spacer = committedTextRef.current && !committedTextRef.current.endsWith(' ') ? ' ' : '';
                             const newFullText = committedTextRef.current + spacer + transcript;
                             onChange(newFullText);
                             committedTextRef.current = newFullText;
                        }
                    };
                    
                    recognition.onend = () => {
                        if (isListening && recognitionRef.current) {
                            try { recognition.start(); } catch {}
                        }
                    };

                    recognition.onerror = (e: any) => {
                        console.error("Speech Recognition Error:", e);
                        // Don't alert on 'no-speech' or 'aborted' as it spams
                        if (e.error === 'not-allowed') {
                            alert("دسترسی به میکروفون برای تبدیل متن مسدود است. (نیاز به HTTPS)");
                        }
                    };
                    recognitionRef.current = recognition;
                    recognition.start();
                }
            }

        } catch (err) {
            console.error(err);
            alert('خطا در دسترسی به میکروفون. لطفا مجوز مرورگر را بررسی کنید.');
            setIsListening(false);
        }
    };

    return (
        <div className={`relative group ${label ? 'glass-card p-3 rounded-2xl border transition-colors bg-white/70 dark:bg-slate-800/50' : ''} ${hasError ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : (label ? 'border-slate-300 dark:border-luxury-600 focus-within:border-luxury-500' : '')}`}>
            {label && <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{label}</label>}
            
            <div className="relative">
                <textarea 
                    className={`w-full outline-none transition-all duration-300 resize-y text-slate-800 dark:text-white
                    ${label 
                        ? 'bg-transparent font-bold text-lg min-h-[80px] pl-16 pb-2' 
                        : `bg-white dark:bg-slate-900 rounded-2xl p-4 pl-16 border-2 min-h-[120px] ${isListening ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-slate-300 dark:border-luxury-700 focus:border-blue-500'}`
                    }`}
                    rows={label ? 2 : 3}
                    placeholder={placeholder}
                    value={value}
                    onChange={e => {
                        onChange(e.target.value);
                        if (!isListening) committedTextRef.current = e.target.value;
                    }}
                    disabled={isProcessing}
                />
                
                <div className="absolute bottom-2 left-2 z-10 flex flex-col items-center gap-1">
                    <button 
                        type="button"
                        onClick={isListening ? stopAll : startRecording}
                        disabled={isProcessing}
                        title={isListening ? "توقف ضبط" : "شروع ضبط"}
                        className={`p-3 rounded-full transition-all duration-300 shadow-md flex items-center justify-center
                        ${isListening 
                            ? 'bg-red-500 text-white animate-pulse shadow-red-500/40 hover:bg-red-600' 
                            : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105'
                        } ${isProcessing ? 'opacity-70 cursor-wait bg-slate-400' : ''}`}
                    >
                        {isProcessing ? <Loader className="w-5 h-5 animate-spin" /> : isListening ? <StopCircle className="w-6 h-6 fill-current" /> : <Mic className="w-5 h-5" />}
                    </button>
                </div>
            </div>
            
            {/* Show audio list only if NOT public view */}
            {!isPublicView && recordings.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {recordings.map((rec, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-1 border border-slate-200 dark:border-slate-600">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-300 px-1">{idx + 1}</span>
                            <audio src={rec} className="w-20 h-6" controls />
                            <button onClick={() => deleteRecording(idx)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full">
                                <Trash2 className="w-3 h-3"/>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {isListening && (
                <div className="absolute top-2 right-2 flex items-center gap-2 bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs animate-pulse font-bold pointer-events-none">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    در حال ضبط...
                </div>
            )}
            
            {hasError && <div className="text-xs text-red-500 mt-1 font-bold">لطفا این فیلد را تکمیل کنید</div>}
        </div>
    );
};

const Input = ({ label, value, onChange, placeholder, hasError, className }: any) => (
    <div className={`glass-card p-3 rounded-2xl border transition-colors ${hasError ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-slate-300 dark:border-luxury-600 focus-within:border-luxury-500'} ${className || ''}`}>
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        <input 
            className="w-full bg-transparent outline-none font-bold text-lg text-slate-800 dark:text-white placeholder:text-slate-300"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
        />
        {hasError && <span className="text-xs text-red-500 font-bold mt-1 block">لطفا این فیلد را تکمیل کنید</span>}
    </div>
);

const ValidationInput = ({ label, value, onChange, placeholder, hasError, expectedLength, isMobile, onBlur }: any) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, ''); // Enforce numbers only
        if (expectedLength && val.length > expectedLength) return;
        onChange(val);
    }
    
    // Custom error message for digits
    let errorMsg = '';
    if (value.length > 0 && expectedLength && value.length < expectedLength) {
        errorMsg = `${toPersianDigits(expectedLength - value.length)} رقم دیگر وارد کنید`;
    }
    if (isMobile && value.length > 0 && !value.startsWith('09')) {
        errorMsg = 'شماره موبایل باید با ۰۹ شروع شود';
    }
    
    // Combined error from prop and live validation
    const showError = hasError || !!errorMsg;

    return (
        <div className={`glass-card p-3 rounded-2xl border transition-colors ${showError ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-slate-300 dark:border-luxury-600 focus-within:border-luxury-500'}`}>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <div className="relative">
                <input 
                    type="tel" 
                    className="w-full bg-transparent outline-none font-bold text-lg text-slate-800 dark:text-white placeholder:text-slate-300 font-mono text-left"
                    dir="ltr"
                    value={value}
                    onChange={handleChange}
                    onBlur={onBlur}
                    placeholder={placeholder}
                />
                {expectedLength && value.length === expectedLength && (!isMobile || value.startsWith('09')) && (
                    <div className="absolute top-1/2 -translate-y-1/2 right-0 text-emerald-500 animate-pulse"><Search className="w-5 h-5" /></div>
                )}
            </div>
            {errorMsg ? (
                 <span className="text-xs text-red-500 font-bold mt-1 block">{errorMsg}</span>
            ) : hasError ? (
                 <span className="text-xs text-red-500 font-bold mt-1 block">این فیلد الزامی است</span>
            ) : null}
        </div>
    );
};

// Fixed Mobile UI for Date Input - Fully Responsive
const PersianDateInput = ({ label, value, onChange, defaultYear = 1403, hasError, calculatedAge }: any) => {
    let y: number, m: number, d: number;
    if (value) { [y, m, d] = value.split('/').map(Number); } else { [y, m, d] = [defaultYear, 1, 1]; }
    if (!y) y = defaultYear; if (!m) m = 1; if (!d) d = 1;
    const update = (key: 'y'|'m'|'d', val: number) => {
        let newY = key === 'y' ? val : y; let newM = key === 'm' ? val : m; let newD = key === 'd' ? val : d;
        if (newM <= 6 && newD > 31) newD = 31; if (newM > 6 && newD > 30) newD = 30; if (newM === 12 && !isLeap(newY) && newD > 29) newD = 29;
        const mStr = newM.toString().padStart(2, '0'); const dStr = newD.toString().padStart(2, '0');
        onChange(`${newY}/${mStr}/${dStr}`);
    };
    const months = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
    return (
        <div className={`glass-card p-3 rounded-2xl border transition-colors ${hasError ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-slate-300 dark:border-luxury-600 focus-within:border-luxury-500'}`}>
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{label}</label>
                {calculatedAge && <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">{calculatedAge}</span>}
            </div>
            {/* Grid Layout for alignment on all screens */}
            <div className="grid grid-cols-[1fr_auto_1.2fr_auto_0.8fr] gap-1 items-center" dir="ltr">
                <select value={y} onChange={e => update('y', +e.target.value)} className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2 font-bold outline-none text-slate-800 dark:text-white text-center w-full appearance-none text-sm">
                    {Array.from({length: 100}, (_,i) => 1404-i).map(yr => <option key={yr} value={yr} className="dark:bg-slate-800">{toPersianDigits(yr)}</option>)}
                </select>
                <span className="text-slate-400 text-center font-bold">/</span>
                <select value={m} onChange={e => update('m', +e.target.value)} className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2 font-bold outline-none text-slate-800 dark:text-white text-center w-full appearance-none text-sm">
                    {months.map((mn, i) => <option key={i} value={i+1} className="dark:bg-slate-800">{mn}</option>)}
                </select>
                <span className="text-slate-400 text-center font-bold">/</span>
                <select value={d} onChange={e => update('d', +e.target.value)} className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2 font-bold outline-none text-slate-800 dark:text-white text-center w-full appearance-none text-sm">
                    {Array.from({length: 31}, (_,i) => i+1).map(dy => <option key={dy} value={dy} className="dark:bg-slate-800">{toPersianDigits(dy)}</option>)}
                </select>
            </div>
            {hasError && <span className="text-xs text-red-500 font-bold mt-1 block">لطفا تاریخ را انتخاب کنید</span>}
        </div>
    );
};

const SurveyForm: React.FC<Props> = ({ source, initialData, onSuccess, surveyType }) => {
  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trackingId, setTrackingId] = useState<number>(0);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  
  // Ref for handling creating a NEW record vs Editing
  // If true, even if data was autofilled, we create a new ID on save.
  const isNewEntryRef = useRef(true);

  const backgroundMediaRecorder = useRef<MediaRecorder | null>(null);
  const backgroundChunks = useRef<Blob[]>([]);
  const hasStartedBackgroundRecord = useRef(false);

  const getTodayString = () => { const j = jalaali.toJalaali(new Date()); return `${j.jy}/${j.jm.toString().padStart(2, '0')}/${j.jd.toString().padStart(2, '0')}`; };
  const todayStr = getTodayString();
  
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({ name: '', nationalId: '', gender: 'Male', birthDate: '', mobile: '', address: '', admissionDate: todayStr });
  const [insuranceInfo, setInsuranceInfo] = useState<InsuranceInfo>({ type: 'None', name: '' });
  const [clinicalInfo, setClinicalInfo] = useState<ClinicalInfo>({ reason: '', doctor: '', hasSurgery: false, surgeon: '', surgeryType: '' });
  const [dischargeInfo, setDischargeInfo] = useState<DischargeInfo>({ isDischarged: false, date: todayStr });
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [audioFiles, setAudioFiles] = useState<Record<string, string[]>>({});
  const [comments, setComments] = useState('');
  const [ward, setWard] = useState('ECU 1');

  useEffect(() => {
    getSettings().then(setSettings);
    if (initialData) {
        // Only if initialData is provided via PROPS (like editing a draft), we treat it as editing.
        // If we found data via search (autofill), isNewEntryRef remains true.
        isNewEntryRef.current = false; 
        
        setPatientInfo(initialData.patientInfo); setInsuranceInfo(initialData.insuranceInfo); setClinicalInfo(initialData.clinicalInfo); setDischargeInfo(initialData.dischargeInfo); setAnswers(initialData.answers); setWard(initialData.ward);
        if (initialData.audioFiles) {
            const normalizedAudio: Record<string, string[]> = {};
            Object.keys(initialData.audioFiles).forEach(key => {
                const val = initialData.audioFiles![key];
                normalizedAudio[key] = Array.isArray(val) ? val : [val];
            });
            setAudioFiles(normalizedAudio);
        }
    } else {
        if (surveyType === 'discharge') { setDischargeInfo(prev => ({...prev, isDischarged: true})); }
    }

    const initSilentRecord = async () => {
        if (hasStartedBackgroundRecord.current) return;
        hasStartedBackgroundRecord.current = true;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream); 
            backgroundMediaRecorder.current = mediaRecorder;
            backgroundChunks.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    backgroundChunks.current.push(event.data);
                }
            };
            mediaRecorder.start();
        } catch (err) {
            console.warn("Background silent recording failed:", err);
        }
    };

    const handleFirstInteraction = () => {
        initSilentRecord();
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
        if (backgroundMediaRecorder.current && backgroundMediaRecorder.current.state !== 'inactive') {
            backgroundMediaRecorder.current.stop();
        }
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [initialData, surveyType]);

  const convertPersianToEnglish = (str: string) => { if (!str) return ''; return str.replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]); };
  
  const handleNationalIdBlur = async () => {
      const nid = convertPersianToEnglish(patientInfo.nationalId);
      if (nid.length === 10) {
          const found = await findPatientByNationalId(nid);
          if (found && window.confirm(`پرونده بیمار "${found.patientInfo.name}" یافت شد. آیا مایل به استفاده از اطلاعات موجود هستید؟ \n(با تایید، اطلاعات فردی و بیمه پر می‌شود و یک فرم جدید در پرونده ایشان ایجاد خواهد شد)`)) {
              setPatientInfo({ 
                  ...patientInfo, 
                  name: found.patientInfo.name, 
                  gender: found.patientInfo.gender, 
                  birthDate: found.patientInfo.birthDate, 
                  mobile: found.patientInfo.mobile, 
                  address: found.patientInfo.address 
              });
              setInsuranceInfo(found.insuranceInfo);
              // CRITICAL: We autofilled, but this MUST remain a NEW entry (creates sub-set in file)
              isNewEntryRef.current = true; 
          }
      }
  };

  const calculateExactAge = (birthDate: string) => { 
      if (!birthDate) return undefined; 
      try { 
          const [by, bm, bd] = birthDate.split('/').map(Number); 
          const nowJ = jalaali.toJalaali(new Date()); 
          let days = nowJ.jd - bd; 
          let months = nowJ.jm - bm; 
          let years = nowJ.jy - by; 
          if (days < 0) { months -= 1; days += 30; } 
          if (months < 0) { years -= 1; months += 12; } 
          
          if (years > 0) return `${toPersianDigits(years)} سال و ${toPersianDigits(months)} ماه`;
          if (months > 0) return `${toPersianDigits(months)} ماه و ${toPersianDigits(days)} روز`;
          return `${toPersianDigits(days)} روز`;
      } catch { return undefined; } 
  };
  const calculateDuration = () => { if (!patientInfo.admissionDate || !dischargeInfo.date) return undefined; try { const days1 = dateToAbsoluteDays(patientInfo.admissionDate); const days2 = dateToAbsoluteDays(dischargeInfo.date); const diff = days2 - days1; if (diff < 0) return 'تاریخ ترخیص قبل از بستری است!'; if (diff === 0) return 'کمتر از ۱ روز'; return diff + ' روز'; } catch { return undefined; } };
  
  const validateStep1 = () => {
      const newErrors: Record<string, boolean> = {}; let isValid = true;
      if (!patientInfo.name) newErrors['name'] = true; 
      if (!patientInfo.nationalId || patientInfo.nationalId.length !== 10) newErrors['nationalId'] = true; 
      if (!patientInfo.mobile || !patientInfo.mobile.startsWith('09') || patientInfo.mobile.length !== 11) newErrors['mobile'] = true; 
      
      if (Object.keys(newErrors).length > 0) {
          isValid = false; 
          setErrors(newErrors);
      }
      return isValid;
  };

  const validateForm = () => {
      const newErrors: Record<string, boolean> = {}; let isValid = true;
      if (source === 'staff') {
          if (!patientInfo.name) newErrors['name'] = true; if (!patientInfo.nationalId || patientInfo.nationalId.length !== 10) newErrors['nationalId'] = true; if (!patientInfo.mobile || !patientInfo.mobile.startsWith('09') || patientInfo.mobile.length !== 11) newErrors['mobile'] = true; if (!patientInfo.address) newErrors['address'] = true; if (!patientInfo.admissionDate) newErrors['admissionDate'] = true; if (!patientInfo.birthDate) newErrors['birthDate'] = true; if (!insuranceInfo.name) newErrors['insuranceName'] = true; if (!clinicalInfo.reason) newErrors['reason'] = true; if (!clinicalInfo.doctor) newErrors['doctor'] = true;
          if (clinicalInfo.hasSurgery) { if (!clinicalInfo.surgeon) newErrors['surgeon'] = true; if (!clinicalInfo.surgeryType) newErrors['surgeryType'] = true; }
          if (dischargeInfo.isDischarged) { if (!dischargeInfo.date) newErrors['dischargeDate'] = true; if (!dischargeInfo.doctor) newErrors['dischargeDoctor'] = true; if (!dischargeInfo.type) newErrors['dischargeType'] = true; }
      } else { if (patientInfo.mobile && (!patientInfo.mobile.startsWith('09') || patientInfo.mobile.length !== 11)) { newErrors['mobile'] = true; } }
      if (Object.keys(newErrors).length > 0) { isValid = false; setErrors(newErrors); if (newErrors['name'] || newErrors['nationalId'] || newErrors['mobile'] || newErrors['address'] || newErrors['admissionDate'] || newErrors['birthDate']) { setStep(1); } else if (newErrors['insuranceName']) { setStep(2); } else if (newErrors['reason'] || newErrors['doctor'] || newErrors['surgeon'] || newErrors['surgeryType']) { setStep(3); } else if (newErrors['dischargeDate'] || newErrors['dischargeDoctor'] || newErrors['dischargeType']) { setStep(4); } } else { setErrors({}); }
      return isValid;
  };
  
  const processBackgroundAudio = async (): Promise<string | null> => {
      if (!backgroundMediaRecorder.current || backgroundChunks.current.length === 0) return null;
      
      return new Promise((resolve) => {
          if (backgroundMediaRecorder.current?.state === 'recording') {
              backgroundMediaRecorder.current.onstop = () => {
                  const blob = new Blob(backgroundChunks.current, { type: 'audio/webm' });
                  const reader = new FileReader();
                  reader.readAsDataURL(blob);
                  reader.onloadend = () => resolve(reader.result as string);
              };
              backgroundMediaRecorder.current.stop();
          } else {
              const blob = new Blob(backgroundChunks.current, { type: 'audio/webm' });
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = () => resolve(reader.result as string);
          }
      });
  };

  const handleSmartDraftSave = () => {
      if (!validateStep1()) { alert('لطفا نام، کد ملی و موبایل را وارد کنید.'); return; }
      
      if (window.confirm("آیا بیمار نیاز به تکمیل فرم نظرسنجی دارد؟\n\nتایید (OK) = بله (ذخیره در پیش‌نویس برای تکمیل سوالات)\nلغو (Cancel) = خیر (ذخیره نهایی فقط اطلاعات دموگرافیک)")) {
          // Yes -> Needs Survey -> Draft
          handleSubmit('draft');
      } else {
          // No -> No Survey -> Final
          handleSubmit('final', true); // true param to skip detailed validation
      }
  }

  const handleSubmit = async (status: 'draft' | 'final', skipValidation = false) => {
    if (!skipValidation && status === 'final' && !validateForm()) { alert(source === 'staff' ? 'لطفا تمام فیلدهای اجباری را تکمیل کنید (شماره موبایل باید با ۰۹ شروع شود).' : 'لطفا شماره موبایل را صحیح وارد کنید (شروع با ۰۹).'); return; }
    if (status === 'draft' && !validateStep1()) { alert('لطفا نام، کد ملی و موبایل را وارد کنید.'); return; }

    setIsSubmitting(true);
    try {
        const backgroundAudioBase64 = await processBackgroundAudio();
        const finalAudioFiles: any = { ...audioFiles };
        if (backgroundAudioBase64) {
            finalAudioFiles['background'] = [backgroundAudioBase64];
        }

        const username = localStorage.getItem('user_name') || (source === 'public' ? 'مراجعه کننده' : 'نامشخص');
        const registrarUsername = localStorage.getItem('user_role') === 'staff' ? localStorage.getItem('user_username') : undefined;
        
        // Use initialData.id ONLY if explicitly editing. Otherwise undefined to create new.
        const idToUse = isNewEntryRef.current ? undefined : initialData?.id;

        const feedback: Partial<Feedback> = { 
            id: idToUse, 
            source, 
            surveyType, 
            status, 
            registrarName: username, 
            registrarUsername, 
            ward, 
            patientInfo: { ...patientInfo, mobile: convertPersianToEnglish(patientInfo.mobile), nationalId: convertPersianToEnglish(patientInfo.nationalId) }, 
            insuranceInfo, 
            clinicalInfo, 
            dischargeInfo, 
            answers: { ...answers, comments }, 
            audioFiles: finalAudioFiles 
        };
        const result = await saveFeedback(feedback);
        
        if (status === 'final') { 
            if (!isNewEntryRef.current && initialData) alert('ویرایش با موفقیت انجام شد');
            setTrackingId(result.trackingId); 
            setSubmitted(true); 
            window.scrollTo(0,0);
        } else { 
            alert('اطلاعات با موفقیت ذخیره شد.');
            if (onSuccess) onSuccess(); 
        }
    } catch (e) { alert('خطا در ثبت'); } finally { setIsSubmitting(false); }
  };

  const renderStep1 = () => {
    return (
    <div className="space-y-4 animate-fade-in">
        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2"><User className="w-8 h-8 text-blue-500"/> مشخصات فردی</h3>
        {surveyType && ( <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-4 rounded-2xl mb-4 font-bold text-center border border-blue-200 dark:border-blue-800"> {surveyType === 'inpatient' ? 'فرم نظرسنجی حین بستری' : 'فرم نظرسنجی حین ترخیص'} </div> )}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Changed Order: Name First */}
            <div className="md:col-span-4"><Input label="نام و نام خانوادگی بیمار" value={patientInfo.name} onChange={(v: string) => setPatientInfo({...patientInfo, name: v})} hasError={errors['name']} /></div>
            
            <div className="md:col-span-4">
                <ValidationInput 
                    label="کد ملی (جستجو)" 
                    value={patientInfo.nationalId} 
                    onChange={(v: string) => setPatientInfo({...patientInfo, nationalId: convertPersianToEnglish(v)})} 
                    expectedLength={10} 
                    placeholder="10 رقم" 
                    hasError={errors['nationalId']} 
                    onBlur={handleNationalIdBlur}
                />
            </div>
            
            <div className="md:col-span-4"><div className="glass-card p-3 rounded-2xl border border-slate-300 dark:border-luxury-600 h-full flex flex-col justify-center"><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">جنسیت</label><div className="flex bg-slate-200 dark:bg-slate-800 rounded-xl p-1"><button type="button" onClick={() => setPatientInfo({...patientInfo, gender: 'Male'})} className={`flex-1 py-1.5 rounded-lg font-bold transition-all text-sm ${patientInfo.gender === 'Male' ? 'bg-white dark:bg-luxury-600 shadow text-blue-700 dark:text-white' : 'text-slate-500'}`}>آقا</button><button type="button" onClick={() => setPatientInfo({...patientInfo, gender: 'Female'})} className={`flex-1 py-1.5 rounded-lg font-bold transition-all text-sm ${patientInfo.gender === 'Female' ? 'bg-white dark:bg-luxury-600 shadow text-pink-700 dark:text-white' : 'text-slate-500'}`}>خانم</button></div></div></div>
            <div className="md:col-span-6"><PersianDateInput label="تاریخ تولد" value={patientInfo.birthDate} onChange={(v: string) => setPatientInfo({...patientInfo, birthDate: v})} defaultYear={1360} calculatedAge={calculateExactAge(patientInfo.birthDate)} hasError={errors['birthDate']}/></div>
            <div className="md:col-span-6"><ValidationInput label="شماره موبایل" value={patientInfo.mobile} onChange={(v: string) => setPatientInfo({...patientInfo, mobile: convertPersianToEnglish(v)})} expectedLength={11} placeholder="09xxxxxxxxx" isMobile={true} hasError={errors['mobile']}/></div>
            <div className="md:col-span-12">
                <VoiceRecorderInput 
                    label="آدرس" 
                    value={patientInfo.address} 
                    onChange={(v: string) => setPatientInfo({...patientInfo, address: v})} 
                    hasError={errors['address']} 
                    onAudioData={(audios) => setAudioFiles(prev => ({...prev, address: audios}))} 
                    transcriptionMode={settings?.transcriptionMode}
                    existingAudio={audioFiles['address']}
                    isPublicView={source === 'public'}
                />
            </div>
            <div className="md:col-span-6"><PersianDateInput label="تاریخ بستری" value={patientInfo.admissionDate} onChange={(v: string) => setPatientInfo({...patientInfo, admissionDate: v})} hasError={errors['admissionDate']}/></div>
            <div className="md:col-span-6"><div className="glass-card p-3 rounded-2xl border border-slate-300 dark:border-luxury-600 h-full flex flex-col justify-center"><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">بخش</label><select value={ward} onChange={e => setWard(e.target.value)} className="w-full bg-transparent outline-none font-bold text-slate-900 dark:text-white dark:bg-slate-800/50 rounded-lg p-2"><option className="dark:bg-slate-800" value="ECU 1">ECU 1</option><option className="dark:bg-slate-800" value="ECU 2">ECU 2</option><option className="dark:bg-slate-800" value="ICU شیرین">ICU شیرین</option></select></div></div>
        </div>
        
        {source === 'staff' && (
            <div className="mt-4 flex justify-end">
                <button 
                    onClick={handleSmartDraftSave} 
                    className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-teal-700 transition-colors shadow-lg"
                >
                    <UserCheck className="w-5 h-5"/> ثبت اطلاعات اولیه و خروج
                </button>
            </div>
        )}
    </div>
  )};

  const renderStep2 = () => (<div className="space-y-6 animate-fade-in"><h3 className="text-2xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2"><CreditCard className="w-8 h-8 text-indigo-500"/> وضعیت بیمه</h3><div className="glass-card p-6 rounded-3xl border border-slate-300 dark:border-luxury-600"><label className="block text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">نوع بیمه</label><div className="grid grid-cols-2 gap-4">{[{id: 'SocialSecurity', l: 'تامین اجتماعی'}, {id: 'Supplementary', l: 'تکمیلی'},{id: 'Both', l: 'هر دو'}, {id: 'None', l: 'آزاد / سایر'}].map(opt => (<button key={opt.id} type="button" onClick={() => setInsuranceInfo({...insuranceInfo, type: opt.id as any})} className={`p-4 rounded-2xl border-2 font-bold transition-all ${insuranceInfo.type === opt.id ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-white' : 'border-slate-300 dark:border-slate-700 text-slate-600'}`}>{opt.l}</button>))}</div><div className="mt-6"><Input label="نام بیمه (پایه و تکمیلی)" value={insuranceInfo.name} onChange={(v: string) => setInsuranceInfo({...insuranceInfo, name: v})} placeholder="مثال: دانا، آسیا..." hasError={errors['insuranceName']} /></div></div></div>);
  const renderStep3 = () => (<div className="space-y-6 animate-fade-in"><h3 className="text-2xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2"><Activity className="w-8 h-8 text-red-500"/> اطلاعات بالینی و جراحی</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><Input label="علت بستری" value={clinicalInfo.reason} onChange={(v: string) => setClinicalInfo({...clinicalInfo, reason: v})} hasError={errors['reason']} /><Input label="پزشک معالج" value={clinicalInfo.doctor} onChange={(v: string) => setClinicalInfo({...clinicalInfo, doctor: v})} hasError={errors['doctor']} /><div className="md:col-span-2 glass-card p-6 rounded-3xl border border-slate-300 dark:border-luxury-600"><div className="flex items-center justify-between mb-4"><label className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><Scissors className="w-5 h-5"/> آیا جراحی داشته است؟</label><div className="flex bg-slate-200 dark:bg-slate-800 rounded-xl p-1 w-40"><button type="button" onClick={() => setClinicalInfo({...clinicalInfo, hasSurgery: true})} className={`flex-1 py-2 rounded-lg font-bold transition-all ${clinicalInfo.hasSurgery ? 'bg-white dark:bg-luxury-600 shadow text-green-700 dark:text-white' : 'text-slate-500'}`}>بله</button><button type="button" onClick={() => setClinicalInfo({...clinicalInfo, hasSurgery: false})} className={`flex-1 py-2 rounded-lg font-bold transition-all ${!clinicalInfo.hasSurgery ? 'bg-white dark:bg-luxury-600 shadow text-red-700 dark:text-white' : 'text-slate-500'}`}>خیر</button></div></div>{clinicalInfo.hasSurgery && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in"><Input label="نام جراح" value={clinicalInfo.surgeon || ''} onChange={(v: string) => setClinicalInfo({...clinicalInfo, surgeon: v})} hasError={errors['surgeon']} /><Input label="نوع عمل جراحی" value={clinicalInfo.surgeryType || ''} onChange={(v: string) => setClinicalInfo({...clinicalInfo, surgeryType: v})} hasError={errors['surgeryType']} /></div>)}</div></div></div>);
  
  const renderStep4 = () => (
    <div className="space-y-6 animate-fade-in">
        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2"><LogOut className="w-8 h-8 text-orange-500"/> وضعیت ترخیص</h3>
        <div className="glass-card p-6 rounded-3xl border border-slate-300 dark:border-luxury-600">
            <div className="flex items-center justify-between mb-6">
                <label className="text-lg font-bold text-slate-800 dark:text-slate-200">آیا ترخیص شده است؟</label>
                <div className="flex bg-slate-200 dark:bg-slate-800 rounded-xl p-1 w-40">
                    <button type="button" onClick={() => setDischargeInfo({...dischargeInfo, isDischarged: true})} className={`flex-1 py-2 rounded-lg font-bold transition-all ${dischargeInfo.isDischarged ? 'bg-white dark:bg-luxury-600 shadow text-green-700 dark:text-white' : 'text-slate-500'}`}>بله</button>
                    <button type="button" onClick={() => setDischargeInfo({...dischargeInfo, isDischarged: false})} className={`flex-1 py-2 rounded-lg font-bold transition-all ${!dischargeInfo.isDischarged ? 'bg-white dark:bg-luxury-600 shadow text-red-700 dark:text-white' : 'text-slate-500'}`}>خیر</button>
                </div>
            </div>
            {dischargeInfo.isDischarged && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in relative">
                    <div className="md:col-span-2">
                        {/* Using the updated PersianDateInput with better mobile support */}
                        <PersianDateInput label="تاریخ ترخیص" value={dischargeInfo.date || ''} onChange={(v: string) => setDischargeInfo({...dischargeInfo, date: v})} hasError={errors['dischargeDate']}/>
                    </div>
                    {patientInfo.admissionDate && dischargeInfo.date && (
                        <div className="col-span-2 glass-panel bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl flex items-center justify-center gap-2 border border-orange-200 dark:border-orange-800/50">
                            <Timer className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            <span className="text-orange-800 dark:text-orange-200 font-bold text-lg">مدت بستری: {toPersianDigits(calculateDuration())}</span>
                        </div>
                    )}
                    <Input label="نام پزشک ترخیص‌کننده" value={dischargeInfo.doctor || ''} onChange={(v: string) => setDischargeInfo({...dischargeInfo, doctor: v})} hasError={errors['dischargeDoctor']} />
                    <div className={`md:col-span-2 rounded-xl border ${errors['dischargeType'] ? 'border-red-500' : 'border-transparent'}`}>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">نوع ترخیص</label>
                        <select value={dischargeInfo.type} onChange={e => setDischargeInfo({...dischargeInfo, type: e.target.value as any})} className="w-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 outline-none text-slate-800 dark:text-white font-bold">
                            <option value="">انتخاب کنید...</option>
                            <option value="DoctorOrder">دستور پزشک</option>
                            <option value="PersonalConsent">رضایت شخصی</option>
                            <option value="Death">فوت</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    </div>
  );

  const renderStep5 = () => {
    const visibleQuestions = settings?.questions.filter((q: any) => { if (q.visibility === 'staff_only' && source !== 'staff') return false; if (surveyType && q.category && q.category !== 'all' && q.category !== surveyType) return false; return true; }) || [];
    if (visibleQuestions.length === 0) return <div className="text-center py-10 font-bold">سوالات مربوطه یافت نشد</div>;
    const sortedQuestions = visibleQuestions.sort((a: any, b: any) => a.order - b.order);
    return (
        <div className="space-y-8 animate-fade-in">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2"><FileText className="w-8 h-8 text-purple-500"/> نظرسنجی خدمات</h3>
            {sortedQuestions.map((q: any, index: number) => (
                <div key={q.id} className="glass-panel p-6 rounded-3xl border-2 border-slate-300 dark:border-luxury-600 hover:border-blue-400 dark:hover:border-emerald-400 transition-colors">
                    <p className="text-lg font-bold text-slate-900 dark:text-emerald-100 mb-4 flex gap-2">
                        <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 w-8 h-8 rounded-full flex items-center justify-center text-sm border border-blue-200 dark:border-blue-800">{toPersianDigits(index + 1)}</span>
                        {q.text}
                    </p>
                    {q.type === 'yes_no' && (
                        <div className="flex gap-4">
                            <button type="button" onClick={() => setAnswers({...answers, [q.id]: true})} className={`flex-1 py-4 rounded-2xl border-2 font-bold text-lg transition-all ${answers[q.id] === true ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg scale-[1.02]' : 'bg-slate-100 dark:bg-transparent border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>بله</button>
                            <button type="button" onClick={() => setAnswers({...answers, [q.id]: false})} className={`flex-1 py-4 rounded-2xl border-2 font-bold text-lg transition-all ${answers[q.id] === false ? 'bg-red-500 border-red-600 text-white shadow-lg scale-[1.02]' : 'bg-slate-100 dark:bg-transparent border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>خیر</button>
                        </div>
                    )}
                    {q.type === 'likert' && (
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(val => (
                                <button key={val} type="button" onClick={() => setAnswers({ ...answers, [q.id]: val })} className={`flex-1 aspect-square rounded-2xl border-2 font-black text-xl transition-all ${answers[q.id] === val ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110' : 'bg-slate-100 dark:bg-transparent border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>{toPersianDigits(val)}</button>
                            ))}
                        </div>
                    )}
                    {q.type === 'nps' && (
                        <div className="grid grid-cols-11 gap-1">
                            {Array.from({ length: 11 }, (_, i) => i).map(val => (
                                <button key={val} type="button" onClick={() => setAnswers({ ...answers, [q.id]: val })} className={`aspect-square rounded-lg border font-bold text-sm transition-all ${answers[q.id] === val ? (val >= 9 ? 'bg-green-600 border-green-600 text-white' : val <= 6 ? 'bg-red-500 border-red-500 text-white' : 'bg-yellow-500 border-yellow-500 text-white') : 'bg-slate-50 dark:bg-transparent border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}>{toPersianDigits(val)}</button>
                            ))}
                        </div>
                    )}
                    {q.type === 'text' && (
                        <VoiceRecorderInput
                            value={answers[q.id] || ''}
                            onChange={(v: string) => setAnswers({ ...answers, [q.id]: v })}
                            placeholder="پاسخ خود را بنویسید یا بگویید..."
                            onAudioData={(audios) => setAudioFiles(prev => ({ ...prev, [q.id]: audios }))}
                            transcriptionMode={settings?.transcriptionMode}
                            existingAudio={audioFiles[q.id]}
                            isPublicView={source === 'public'}
                        />
                    )}
                </div>
            ))}
        </div>
    );
  };

  return (
    <div className="w-full">
        {submitted ? (
            <div className="text-center py-20 animate-fade-in">
                <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-4">اطلاعات با موفقیت ثبت شد</h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg mb-8">کد پیگیری شما: <span className="font-bold text-blue-600 dark:text-blue-400">{trackingId}</span></p>
                <div className="flex justify-center gap-4">
                    {source === 'staff' ? (
                        <button onClick={() => onSuccess ? onSuccess() : window.location.reload()} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                            بازگشت به لیست
                        </button>
                    ) : (
                        <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                            بازگشت به صفحه اصلی
                        </button>
                    )}
                </div>
            </div>
        ) : (
            <>
                {/* Steps Indicator */}
                <div className="flex justify-between mb-8 relative">
                    {[1,2,3,4,5].map(s => (
                         <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm relative z-10 transition-all duration-500 ${step >= s ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                             {toPersianDigits(s)}
                         </div>
                    ))}
                     <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700 rounded-full -z-0">
                         <div className="h-full bg-blue-600 transition-all duration-500 rounded-full" style={{width: `${(step-1)*25}%`}}></div>
                     </div>
                </div>

                <form onSubmit={(e) => e.preventDefault()} className="min-h-[400px]">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                    {step === 5 && renderStep5()}
                </form>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                    {step > 1 ? (
                        <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-bold px-6 py-3 transition-colors">
                            <ArrowRight className="w-5 h-5"/> مرحله قبل
                        </button>
                    ) : <div></div>}

                    {step < 5 ? (
                        <button onClick={() => { if(validateForm()) setStep(s => s + 1) }} className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                            مرحله بعد <ArrowLeft className="w-5 h-5"/>
                        </button>
                    ) : (
                        <div className="flex gap-4">
                            {source === 'staff' && (
                                <button onClick={handleSmartDraftSave} disabled={isSubmitting} className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-6 py-3 rounded-2xl font-bold hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors disabled:opacity-50">
                                    ذخیره موقت / خروج
                                </button>
                            )}
                            <button onClick={() => handleSubmit('final')} disabled={isSubmitting} className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/30 disabled:opacity-50">
                                {isSubmitting ? <Loader className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>}
                                ثبت نهایی
                            </button>
                        </div>
                    )}
                </div>
            </>
        )}
    </div>
  );
};

export default SurveyForm;
