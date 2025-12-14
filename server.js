
require('dotenv').config(); // Load environment variables
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_db';

app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(express.static(path.join(__dirname, 'dist')));

// --- Static Uploads Directory ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// --- Multer Configuration for Audio Uploads ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + (file.mimetype.split('/')[1] || 'webm'))
  }
})
const upload = multer({ storage: storage });

// --- MongoDB Connection ---
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- Schemas & Models ---

const QuestionSchema = new mongoose.Schema({
    id: String,
    text: String,
    type: String,
    order: Number,
    visibility: String,
    category: { type: String, default: 'all' }
});

const UserSchema = new mongoose.Schema({
    id: String,
    username: String,
    name: String,
    role: String,
    title: String,
    order: { type: Number, default: 99 },
    isPasswordEnabled: Boolean,
    password: { type: String, default: '' },
    avatarColor: String
});

const SettingsSchema = new mongoose.Schema({
    brandName: String,
    developerPassword: String,
    iotypeApiKey: String,
    geminiApiKeys: [String], // Changed to Array of Strings
    transcriptionMode: { type: String, default: 'iotype' },
    users: [UserSchema],
    questions: [QuestionSchema],
    enabledIcons: [String]
}, { timestamps: true });

const SettingsModel = mongoose.model('Setting', SettingsSchema);

const FeedbackSchema = new mongoose.Schema({
    id: String,
    trackingId: Number,
    source: String,
    surveyType: String,
    registrarName: String,
    registrarUsername: String,
    status: String,
    ward: String,
    patientInfo: {
        name: String,
        nationalId: String,
        gender: String,
        birthDate: String,
        mobile: String,
        address: String,
        admissionDate: String
    },
    insuranceInfo: {
        type: { type: String }, 
        name: String
    },
    clinicalInfo: {
        reason: String,
        doctor: String,
        hasSurgery: Boolean,
        surgeon: String,
        surgeryType: String
    },
    dischargeInfo: {
        isDischarged: Boolean,
        date: String,
        type: { type: String }, 
        doctor: String
    },
    answers: { type: Map, of: mongoose.Schema.Types.Mixed }, 
    audioFiles: { type: Map, of: mongoose.Schema.Types.Mixed }, 
    createdAt: Date,
    lastModified: Date
});

const FeedbackModel = mongoose.model('Feedback', FeedbackSchema);

// --- Defaults ---
const DEFAULT_SETTINGS = {
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
    ],
    enabledIcons: []
};

// --- Initialization Logic ---
const initDB = async () => {
    try {
        const count = await SettingsModel.countDocuments();
        if (count === 0) {
            console.log("Initialize DB: Creating default settings...");
            await SettingsModel.create(DEFAULT_SETTINGS);
        }
    } catch (e) {
        console.error("DB Init Error:", e);
    }
};

mongoose.connection.once('open', initDB);

// --- Helper for Base64 Audio ---
const processBase64Audio = (base64String) => {
    try {
        if (!base64String || typeof base64String !== 'string') {
             throw new Error("Invalid input: audio data must be a non-empty string");
        }
        let base64Data = base64String.replace(/^data:audio\/[a-z0-9;=]+;base64,/, "");
        base64Data = base64Data.replace(/\s/g, '');

        let ext = 'webm';
        if (base64String.includes('audio/wav')) ext = 'wav';
        else if (base64String.includes('audio/mp3')) ext = 'mp3';
        else if (base64String.includes('audio/mp4')) ext = 'mp4';
        else if (base64String.includes('audio/ogg')) ext = 'ogg';

        const buffer = Buffer.from(base64Data, 'base64');
        const mimeType = `audio/${ext}`;
        
        return { type: mimeType, data: buffer, ext };
    } catch (e) {
        console.error("Base64 Parse Error Detail:", e.message);
        throw new Error("Invalid audio data format: " + e.message);
    }
};

// --- API Routes ---

app.get('/api/settings', async (req, res) => {
    try {
        let settings = await SettingsModel.findOne();
        if (!settings) {
            settings = await SettingsModel.create(DEFAULT_SETTINGS);
        }
        res.json(settings);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/settings', async (req, res) => {
    try {
        const updated = await SettingsModel.findOneAndUpdate({}, req.body, { new: true, upsert: true });
        res.json({ message: 'Settings saved', settings: updated });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/users/password', async (req, res) => {
    try {
        const { targetUserId, newPassword, currentUsername } = req.body;
        const settings = await SettingsModel.findOne();
        const users = settings.users;
        const currentUser = users.find(u => u.username === currentUsername);
        const targetUser = users.find(u => u.id === targetUserId);

        if (!currentUser || !targetUser) return res.status(404).json({error: 'User not found'});

        const isSelf = currentUser.id === targetUser.id;
        const isManager = ['matlabi', 'kand', 'mahlouji'].includes(currentUser.username); 
        const isSupervisor = ['mostafavi'].includes(currentUser.username);
        const isTargetStaff = !['matlabi', 'kand', 'mahlouji', 'mostafavi'].includes(targetUser.username); 

        const canEdit = isSelf || ((isManager || isSupervisor) && isTargetStaff);

        if (!canEdit) return res.status(403).json({ error: 'Permission denied' });

        const updatedUsers = users.map(u => {
            if (u.id === targetUserId) {
                return { ...u, password: newPassword, isPasswordEnabled: true };
            }
            return u;
        });

        await SettingsModel.findOneAndUpdate({}, { users: updatedUsers });
        res.json({ message: 'Password updated' });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- NEW STT ENDPOINT (GEMINI MULTI-KEY) ---
app.post('/api/stt', upload.single('audioFile'), async (req, res) => {
    const filePath = req.file?.path;

    try {
        const { provider, apiKeys } = req.body; // Expecting array of keys
        if (!req.file || !provider || !apiKeys) {
            if (filePath) try { fs.unlinkSync(filePath); } catch (e) {}
            return res.status(400).json({ error: 'Missing audio file, provider, or API keys.' });
        }

        let transcription = '';

        if (provider === 'gemini') {
            const { GoogleGenAI } = await import("@google/genai");
            
            // Handle Multiple Keys from Array
            let keys = [];
            try {
                keys = typeof apiKeys === 'string' ? JSON.parse(apiKeys) : apiKeys;
                if (!Array.isArray(keys)) keys = [apiKeys];
            } catch(e) {
                keys = [apiKeys];
            }
            
            let lastError = null;
            let success = false;

            const fileBuffer = fs.readFileSync(filePath);
            const base64Audio = fileBuffer.toString('base64');
            const mimeType = req.file.mimetype || 'audio/webm';

            for (const key of keys) {
                if(!key || key.trim() === '') continue;
                try {
                    const ai = new GoogleGenAI({ apiKey: key });
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: [
                            {
                                parts: [
                                    { inlineData: { mimeType: mimeType, data: base64Audio } },
                                    { text: "Transcribe this audio exactly to Persian text. Do not translate. Just transcribe." }
                                ]
                            }
                        ]
                    });
                    
                    if (response.text) {
                        transcription = response.text;
                        success = true;
                        break; // Stop loop on success
                    }
                } catch (err) {
                    console.error(`Gemini Key Failed (${key.substring(0,6)}...):`, err.message);
                    lastError = err;
                    // Continue to next key
                }
            }

            if (!success) {
                throw new Error("All Gemini API keys failed. Last error: " + (lastError?.message || "Unknown"));
            }

        } else {
            throw new Error('Invalid provider specified.');
        }

        try { fs.unlinkSync(filePath); } catch (e) {}
        res.json({ text: transcription.trim() });

    } catch (e) {
        if (filePath) try { fs.unlinkSync(filePath); } catch (err) {}
        console.error(`STT Error (${req.body.provider}):`, e.message);
        res.status(500).json({ error: e.message });
    }
});

// Test Endpoints
app.post('/api/test-gemini', async (req, res) => {
    try {
        const settings = await SettingsModel.findOne();
        const keys = settings?.geminiApiKeys || [];
        if (!keys || keys.length === 0) return res.status(400).json({ error: 'Gemini API Keys not configured' });
        
        const { GoogleGenAI } = await import("@google/genai");
        let success = false;
        let details = "";

        for (const key of keys) {
            if(!key || key.trim() === '') continue;
            try {
                const ai = new GoogleGenAI({ apiKey: key });
                const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'Ping' });
                details = response.text;
                success = true;
                break;
            } catch (err) {
                console.error(`Gemini Test Key Failed (${key.substring(0,6)}...):`, err.message);
            }
        }

        if (success) {
            res.json({ message: 'Success', details: details });
        } else {
            res.status(500).json({ error: "All Gemini keys failed." });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/test-iotype', async (req, res) => {
    try {
        const settings = await SettingsModel.findOne();
        const apiKey = settings?.iotypeApiKey;
        if (!apiKey) return res.status(400).json({ error: 'IOType API Key not configured' });
        const base64Audio = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABkYXRhAAAAAA==";
        const { data: buffer, type, ext } = processBase64Audio(base64Audio);
        const form = new FormData();
        form.append('type', 'file');
        form.append('file', buffer, { filename: `test.${ext}`, contentType: type });
        const response = await axios.post('https://www.iotype.com/developer/transcription', form, { headers: { ...form.getHeaders(), 'Authorization': apiKey, 'X-Requested-With': 'XMLHttpRequest' } });
        if (response.data.status === 0) return res.status(400).json({ error: response.data.message });
        res.json({ message: 'Success', details: 'Connection OK' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/transcribe-iotype', async (req, res) => {
    try {
        const { audio } = req.body;
        if (!audio) return res.status(400).json({ error: 'No audio data received' });
        const settings = await SettingsModel.findOne();
        const apiKey = settings?.iotypeApiKey;
        if (!apiKey) return res.status(400).json({ error: 'IOType API Key not configured' });
        const { data: buffer, type, ext } = processBase64Audio(audio);
        const form = new FormData();
        form.append('type', 'file');
        form.append('file', buffer, { filename: `recording.${ext}`, contentType: type });
        const response = await axios.post('https://www.iotype.com/developer/transcription', form, { headers: { ...form.getHeaders(), 'Authorization': apiKey, 'X-Requested-With': 'XMLHttpRequest' } });
        if (response.data.status === 0) return res.status(500).json({ error: response.data.message || 'IOType API Error' });
        res.json({ text: response.data.result || '' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Feedback API
app.get('/api/feedback', async (req, res) => {
    try {
        const feedback = await FeedbackModel.find().sort({ createdAt: -1 });
        res.json(feedback);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/feedback', async (req, res) => {
    try {
        const { id, ...data } = req.body;
        if (id && await FeedbackModel.findOne({ id })) {
            const updated = await FeedbackModel.findOneAndUpdate({ id }, { ...data, lastModified: new Date() }, { new: true });
            return res.json(updated);
        } else {
            const lastRecord = await FeedbackModel.findOne().sort({ trackingId: -1 });
            const nextTrackingId = lastRecord && lastRecord.trackingId ? lastRecord.trackingId + 1 : 1000;
            const newFeedback = await FeedbackModel.create({ ...data, id: id || Date.now().toString(), trackingId: nextTrackingId, createdAt: data.createdAt || new Date(), status: data.status || 'draft' });
            return res.status(201).json(newFeedback);
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/feedback/:id', async (req, res) => {
    try {
        const result = await FeedbackModel.findOneAndDelete({ id: req.params.id });
        if (!result) return res.status(404).json({ message: 'Not found' });
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Full System Backup
app.get('/api/full-backup', async (req, res) => {
    try {
        const settings = await SettingsModel.findOne();
        const feedback = await FeedbackModel.find();
        
        const backupData = {
            timestamp: new Date().toISOString(),
            settings: settings,
            feedback: feedback
        };

        const fileName = `Full_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(backupData, null, 2));

    } catch (e) {
        console.error("Full Backup Error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/full-restore', async (req, res) => {
    try {
        const { settings, feedback } = req.body;
        if (!settings && !feedback) return res.status(400).json({ error: "Invalid backup file format" });

        await SettingsModel.deleteMany({});
        await FeedbackModel.deleteMany({});
        
        if (settings) await SettingsModel.create(settings);
        if (feedback && Array.isArray(feedback) && feedback.length > 0) await FeedbackModel.insertMany(feedback);

        res.json({ message: "Full system restore successful" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/health', (req, res) => {
    if (mongoose.connection.readyState === 1) res.status(200).json({ status: 'ok', db: 'connected' });
    else res.status(500).json({ status: 'error', db: 'disconnected' });
});

app.post('/api/logs', (req, res) => { res.status(200).send('ok'); });

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const shutdown = async () => {
    console.log('🛑 Shutting down server...');
    try { await mongoose.connection.close(); } catch (err) {}
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
