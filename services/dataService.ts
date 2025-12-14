
import { Feedback, Settings, SystemLog, SurveyQuestion } from '../types';
// @ts-ignore
import jalaali from 'jalaali-js';

const API_URL = '/api/feedback';
const SETTINGS_URL = '/api/settings';
const LOGS_URL = '/api/logs';
const HEALTH_URL = '/api/health';
const PASSWORD_URL = '/api/users/password'; 
const LS_KEYS = { SETTINGS: 'crm_settings', DATA: 'crm_feedback_data', LOGS: 'crm_system_logs' };

const CLIENT_DEFAULTS: Settings = {
    brandName: "سامانه جهان امید سلامت",
    developerPassword: "111",
    iotypeApiKey: "uGobvO0d2JVAXCB3TiRygJ2R4Zwy3gaH",
    geminiApiKeys: [], 
    transcriptionMode: "iotype", 
    users: [
        { id: "admin1", username: "matlabi", name: "آقای مطلبی", role: "admin", title: "مدیر اصلی", order: 1, isPasswordEnabled: false, password: "", avatarColor: "bg-blue-600" },
        { id: "admin2", username: "kand", name: "آقای کاند", role: "admin", title: "مدیر اصلی", order: 2, isPasswordEnabled: false, password: "", avatarColor: "bg-indigo-600" },
        { id: "admin3", username: "mahlouji", name: "آقای مهلوجی", role: "admin", title: "مسئول مالی", order: 3, isPasswordEnabled: false, password: "", avatarColor: "bg-teal-600" }, 
        { id: "staff1", username: "mostafavi", name: "آقای مصطفوی", role: "admin", title: "سوپروایزر", order: 4, isPasswordEnabled: false, password: "", avatarColor: "bg-cyan-600" },
        { id: "staff2", username: "farid", name: "خانم فرید", role: "staff", title: "پرسنل", order: 5, isPasswordEnabled: false, password: "", avatarColor: "bg-pink-500" },
        { id: "staff3", username: "sec", name: "منشی‌ها", role: "staff", title: "منشی بخش", order: 6, isPasswordEnabled: false, password: "", avatarColor: "bg-purple-500" }
    ],
    questions: [
        { id: "q1", order: 1, type: "yes_no", text: "آیا آموزش‌های حین ترخیص به بیمار داده شده است؟", visibility: 'all', category: 'discharge' },
        { id: "q2", order: 2, type: "yes_no", text: "آیا بیمار از نوع رژیم غذایی خود اطلاع دارد؟", visibility: 'all', category: 'discharge' },
        { id: "q3", order: 3, type: "yes_no", text: "آیا بیمار از نحوه مصرف داروهای خود در منزل اطلاع دارد؟", visibility: 'all', category: 'discharge' },
        { id: "q4", order: 4, type: "yes_no", text: "آیا بیمار وضعیت حرکتی خود در منزل را می‌داند؟", visibility: 'all', category: 'discharge' },
        { id: "q5", order: 5, type: "yes_no", text: "آیا زمان و مکان مراجعه مجدد به پزشک را می‌دانید؟", visibility: 'all', category: 'discharge' },
        { id: "q6", order: 6, type: "yes_no", text: "آیا مراقبت‌های لازم در منزل (زخم، عضو آسیب دیده و...) را می‌دانید؟", visibility: 'all', category: 'discharge' },
        { id: "q7", order: 7, type: "yes_no", text: "(در صورت جراحی) آیا محل عمل فاقد قرمزی و ترشح است؟", visibility: 'all', category: 'discharge' },
        { id: "q8", order: 8, type: "yes_no", text: "آیا آموزش و راهنمایی‌های ارائه شده واضح بود؟", visibility: 'all', category: 'all' },
        { id: "q9", order: 9, type: "yes_no", text: "آیا اطلاعات ارائه شده توسط پزشکان کامل و قابل قبول بود؟", visibility: 'all', category: 'all' },
        { id: "q10", order: 10, type: "yes_no", text: "آیا از آموزش‌های پزشک در بخش رضایت دارید؟", visibility: 'all', category: 'all' },
        { id: "q11", order: 11, type: "yes_no", text: "آیا از آموزش‌های پرستار در بخش رضایت دارید؟", visibility: 'all', category: 'all' },
        { id: "q12", order: 12, type: "yes_no", text: "آیا از اقدامات واحد پذیرش و توضیحات آن رضایت دارید؟", visibility: 'all', category: 'inpatient' },
        { id: "q13", order: 13, type: "yes_no", text: "آیا از عملکرد اورژانس (از ورود تا بستری در بخش/ICU) رضایت دارید؟", visibility: 'all', category: 'inpatient' },
        { id: "q14", order: 14, type: "yes_no", text: "آیا از واحد ترخیص و مالی و توضیحات آن رضایت دارید؟", visibility: 'all', category: 'discharge' },
        { id: "q15", order: 15, type: "yes_no", text: "آیا به طور کلی از خدمات بیمارستان راضی بودید؟", visibility: 'all', category: 'discharge' },
        { id: "q16", order: 16, type: "yes_no", text: "آیا نیاز به آموزش مجدد دارید؟", visibility: 'all', category: 'discharge' },
        { id: "q17", order: 17, type: "yes_no", text: "آیا به ادامه پیگیری تلفنی تمایل دارید؟", visibility: 'all', category: 'all' },
        { id: "q_cleaning", order: 18, type: "likert", text: "نظافت اتاق و سرویس", visibility: 'all', category: 'all' },
        { id: "q_response", order: 19, type: "likert", text: "سرعت پاسخگویی به احضار", visibility: 'all', category: 'all' },
        { id: "q_food", order: 20, type: "likert", text: "کیفیت غذای بیمار", visibility: 'all', category: 'all' },
        { id: "q_nps", order: 21, type: "nps", text: "چقدر احتمال دارد این بیمارستان را به دیگران معرفی کنید؟", visibility: 'all', category: 'all' },
        { id: "q_comment", order: 22, type: "text", text: "نظرات و پیشنهادات تکمیلی", visibility: 'all', category: 'all' }
    ]
};

// --- Helpers ---
export const toPersianDigits = (n: number | string) => {
    if (n === undefined || n === null) return '';
    const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return n.toString().replace(/\d/g, x => farsiDigits[parseInt(x)]);
};

export const isLeap = (year: number) => {
    return (((((year - 474) % 2820) + 474) + 38) * 682) % 2816 < 682;
};

export const dateToAbsoluteDays = (dateStr: string) => {
    if (!dateStr) return 0;
    try {
        const [y, m, d] = dateStr.split('/').map(Number);
        let days = (y - 1) * 365;
        days += Math.floor((8 * (y - 1) + 21) / 33); // Leap years approx
        for (let i = 1; i < m; i++) {
            if (i <= 6) days += 31;
            else days += 30;
        }
        days += d;
        return days;
    } catch { return 0; }
};

// --- API Services ---

export const getSettings = async (): Promise<Settings> => {
    try {
        const res = await fetch(SETTINGS_URL);
        if (!res.ok) throw new Error('API Error');
        return await res.json();
    } catch (e) {
        console.warn('API fetch failed, returning default settings', e);
        const local = localStorage.getItem(LS_KEYS.SETTINGS);
        if (local) return JSON.parse(local);
        return CLIENT_DEFAULTS;
    }
};

export const saveSettings = async (settings: Settings) => {
    try {
        await fetch(SETTINGS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
        console.error('Save settings failed', e);
        localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(settings));
    }
};

export const getFeedbackData = async (): Promise<Feedback[]> => {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error('API Error');
        return await res.json();
    } catch (e) {
        const local = localStorage.getItem(LS_KEYS.DATA);
        return local ? JSON.parse(local) : [];
    }
};

export const saveFeedback = async (data: Partial<Feedback>) => {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('API Error');
        return await res.json();
    } catch (e) {
        console.error('Save feedback failed', e);
        // Offline fallback
        const current = await getFeedbackData();
        const id = data.id || Date.now().toString();
        const newItem = { 
            ...data, 
            id, 
            trackingId: data.trackingId || Math.floor(Math.random() * 10000),
            createdAt: data.createdAt || new Date().toISOString() 
        } as Feedback;
        
        const index = current.findIndex(f => f.id === id);
        if (index >= 0) current[index] = newItem;
        else current.push(newItem);
        
        localStorage.setItem(LS_KEYS.DATA, JSON.stringify(current));
        return newItem;
    }
};

export const deleteFeedback = async (id: string) => {
    try {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    } catch (e) {
        const current = await getFeedbackData();
        const filtered = current.filter(f => f.id !== id);
        localStorage.setItem(LS_KEYS.DATA, JSON.stringify(filtered));
    }
};

export const checkHealth = async () => {
    try {
        const res = await fetch(HEALTH_URL);
        const data = await res.json();
        return data.db === 'connected';
    } catch {
        return false;
    }
};

export const updateUserPassword = async (targetUserId: string, newPassword: string) => {
    try {
        const currentUsername = localStorage.getItem('user_username');
        const res = await fetch(PASSWORD_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUserId, newPassword, currentUsername })
        });
        return res.ok;
    } catch {
        return false;
    }
};

export const findPatientByNationalId = async (nid: string): Promise<Feedback | undefined> => {
    const data = await getFeedbackData();
    // Search latest confirmed data first
    const sorted = data.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted.find(f => f.patientInfo.nationalId === nid);
};

export const backupData = async () => {
    return await getFeedbackData();
};

export const restoreData = async (data: any[]) => {
    try {
        await fetch('/api/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data })
        });
    } catch {
        localStorage.setItem(LS_KEYS.DATA, JSON.stringify(data));
    }
};

export const performFullBackup = async () => {
    const res = await fetch('/api/full-backup');
    if (!res.ok) throw new Error('Backup failed');
    return await res.json();
};

export const performFullRestore = async (jsonData: any) => {
    const res = await fetch('/api/full-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData)
    });
    if (!res.ok) throw new Error('Restore failed');
    return await res.json();
};


// --- Logs System ---

export const logAction = (type: 'INFO' | 'WARN' | 'ERROR', message: string) => {
    try {
        const logs: SystemLog[] = JSON.parse(localStorage.getItem(LS_KEYS.LOGS) || '[]');
        logs.unshift({ timestamp: new Date().toISOString(), type, message });
        if (logs.length > 500) logs.pop(); // limit size
        localStorage.setItem(LS_KEYS.LOGS, JSON.stringify(logs));
        // Also try sending to server (fire and forget)
        fetch(LOGS_URL, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ type, message })
        }).catch(() => {});
    } catch (e) { console.error(e); }
};

export const getSystemLogs = (): SystemLog[] => {
    try {
        return JSON.parse(localStorage.getItem(LS_KEYS.LOGS) || '[]');
    } catch { return []; }
};

// --- Analytics ---

export const calculateAnalytics = (data: Feedback[], questions: SurveyQuestion[]) => {
    const totalCount = data.length;
    let totalScoreSum = 0;
    let totalScoreCount = 0;
    
    // NPS
    let promoters = 0;
    let detractors = 0;
    let npsCount = 0;

    // Category Data
    const categoryScores: Record<string, {sum: number, count: number}> = {};

    // Yes/No Stats
    const yesNoStats: any[] = [];
    const yesNoQuestions = questions.filter(q => q.type === 'yes_no');

    yesNoQuestions.forEach(q => {
        let yes = 0;
        let no = 0;
        data.forEach(d => {
            if (d.answers[q.id] === true) yes++;
            if (d.answers[q.id] === false) no++;
        });
        const total = yes + no;
        yesNoStats.push({
            id: q.id,
            text: q.text,
            yesCount: yes,
            noCount: no,
            yesPercent: total ? Math.round((yes / total) * 100) : 0,
            noPercent: total ? Math.round((no / total) * 100) : 0
        });
    });

    // Text Comments
    const textComments: any[] = [];
    const textQuestions = questions.filter(q => q.type === 'text');
    textQuestions.forEach(q => {
        const comments: any[] = [];
        data.forEach(d => {
            if (d.answers[q.id]) {
                comments.push({
                    id: d.id,
                    comment: d.answers[q.id],
                    patientName: d.patientInfo.name,
                    date: d.createdAt
                });
            }
        });
        if (comments.length > 0) {
            textComments.push({ id: q.id, text: q.text, comments });
        }
    });

    data.forEach(item => {
        // Likert Calc
        questions.filter(q => q.type === 'likert').forEach(q => {
            const val = item.answers[q.id];
            if (typeof val === 'number') {
                totalScoreSum += val;
                totalScoreCount++;

                if (q.text) { // Group by Question Text
                    if (!categoryScores[q.text]) categoryScores[q.text] = {sum: 0, count: 0};
                    categoryScores[q.text].sum += val;
                    categoryScores[q.text].count++;
                }
            }
        });

        // NPS Calc
        questions.filter(q => q.type === 'nps').forEach(q => {
            const val = item.answers[q.id];
            if (typeof val === 'number') {
                npsCount++;
                if (val >= 9) promoters++;
                if (val <= 6) detractors++;
            }
        });
    });

    const averageSatisfaction = totalScoreCount ? (totalScoreSum / totalScoreCount).toFixed(1) : 0;
    const npsScore = npsCount ? Math.round(((promoters - detractors) / npsCount) * 100) : 0;

    const categoryData = Object.keys(categoryScores).map(k => ({
        name: k,
        value: parseFloat((categoryScores[k].sum / categoryScores[k].count).toFixed(1))
    }));

    // Filter urgent list
    const urgentList = data.filter(item => {
         let isUrgent = false;
         // Check Likert <= 2
         questions.filter(q => q.type === 'likert').forEach(q => {
             if (item.answers[q.id] <= 2) isUrgent = true;
         });
         // Check NPS <= 6
         questions.filter(q => q.type === 'nps').forEach(q => {
             if (item.answers[q.id] <= 6) isUrgent = true;
         });
         // Critical Yes/No Questions (hardcoded logic based on typical IDs)
         ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'].forEach(qid => {
             if (item.answers[qid] === false) isUrgent = true;
         });
         return isUrgent;
    });

    return {
        totalCount,
        averageSatisfaction,
        npsScore,
        urgentFollowUps: urgentList.length,
        urgentList,
        categoryData,
        yesNoStats,
        textComments
    };
};
