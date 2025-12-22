require('dotenv').config();
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

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + (file.mimetype.split('/')[1] || 'webm'));
  }
});
const upload = multer({ storage: storage });

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const QuestionSchema = new mongoose.Schema({
    id: String, text: String, type: String, order: Number, visibility: String, category: { type: String, default: 'all' }
});

const UserSchema = new mongoose.Schema({
    id: String, username: String, name: String, role: String, title: String, order: { type: Number, default: 99 }, isPasswordEnabled: Boolean, password: { type: String, default: '' }, avatarColor: String
});

const SettingsSchema = new mongoose.Schema({
    brandName: String, developerPassword: String, iotypeApiKey: String, geminiApiKeys: [String], transcriptionMode: { type: String, default: 'iotype' }, users: [UserSchema], questions: [QuestionSchema], enabledIcons: [String]
}, { timestamps: true });

const SettingsModel = mongoose.model('Setting', SettingsSchema);

const FeedbackSchema = new mongoose.Schema({
    id: String, trackingId: Number, source: String, surveyType: String, registrarName: String, registrarUsername: String, status: String, ward: String,
    patientInfo: { name: String, nationalId: String, gender: String, birthDate: String, mobile: String, address: String, admissionDate: String },
    insuranceInfo: { type: { type: String }, name: String },
    clinicalInfo: { reason: String, doctor: String, hasSurgery: Boolean, surgeon: String, surgeryType: String },
    dischargeInfo: { isDischarged: Boolean, date: String, type: { type: String }, doctor: String },
    answers: { type: Map, of: mongoose.Schema.Types.Mixed }, audioFiles: { type: Map, of: mongoose.Schema.Types.Mixed },
    createdAt: Date, lastModified: Date
});

const FeedbackModel = mongoose.model('Feedback', FeedbackSchema);

const DEFAULT_SETTINGS = {
    brandName: "سامانه جهان امید سلامت",
    developerPassword: "111",
    iotypeApiKey: "uGobvO0d2JVAXCB3TiRygJ2R4Zwy3gaH",
    geminiApiKeys: [],
    transcriptionMode: "iotype",
    users: [
        { id: "admin1", username: "matlabi", name: "آقای مطلبی", role: "admin", title: "مدیر اصلی", order: 1, isPasswordEnabled: false, password: "", avatarColor: "bg-blue-600" },
        { id: "admin2", username: "kand", name: "آقای کاند", role: "admin", title: "مدیر اصلی", order: 2, isPasswordEnabled: false, password: "", avatarColor: "bg-indigo-600" },
        { id: "admin3", username: "mahlouji", name: "آقای مهلوجی", role: "admin", title: "مدیر", order: 3, isPasswordEnabled: false, password: "", avatarColor: "bg-teal-600" }, 
        { id: "staff1", username: "mostafavi", name: "آقای مصطفوی", role: "admin", title: "سوپروایزر", order: 4, isPasswordEnabled: false, password: "", avatarColor: "bg-cyan-600" },
        { id: "staff2", username: "farid", name: "خانم فرید", role: "staff", title: "پرسنل", order: 5, isPasswordEnabled: false, password: "", avatarColor: "bg-pink-500" },
        { id: "staff3", username: "sec", name: "منشی‌ها", role: "staff", title: "منشی بخش", order: 6, isPasswordEnabled: false, password: "", avatarColor: "bg-purple-500" }
    ],
    questions: [
        { id: "q1", order: 1, type: "yes_no", text: "آیا آموزش‌های حین ترخیص به بیمار داده شده است؟", visibility: 'all', category: 'discharge' },
        { id: "q_comment", order: 22, type: "text", text: "نظرات و پیشنهادات تکمیلی", visibility: 'all', category: 'all' }
    ]
};

app.get('/api/settings', async (req, res) => {
    try {
        let settings = await SettingsModel.findOne();
        if (!settings) settings = await SettingsModel.create(DEFAULT_SETTINGS);
        res.json(settings);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', async (req, res) => {
    try {
        const updated = await SettingsModel.findOneAndUpdate({}, req.body, { new: true, upsert: true });
        res.json({ message: 'Settings saved', settings: updated });
    } catch (e) { res.status(500).json({ error: e.message }); }
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
        // Mahlouji is strictly read-only for others, even if labelled as admin
        const canManageOthers = ['matlabi', 'kand', 'mostafavi'].includes(currentUser.username); 
        const isTargetStaff = !['matlabi', 'kand', 'mahlouji', 'mostafavi'].includes(targetUser.username); 

        const canEdit = isSelf || (canManageOthers && isTargetStaff);

        if (!canEdit) return res.status(403).json({ error: 'Permission denied' });

        const updatedUsers = users.map(u => {
            if (u.id === targetUserId) return { ...u, password: newPassword, isPasswordEnabled: true };
            return u;
        });

        await SettingsModel.findOneAndUpdate({}, { users: updatedUsers });
        res.json({ message: 'Password updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/stt', upload.single('audioFile'), async (req, res) => {
    const filePath = req.file?.path;
    try {
        const { provider, apiKeys } = req.body;
        if (!req.file || !provider || !apiKeys) {
            if (filePath) try { fs.unlinkSync(filePath); } catch (e) {}
            return res.status(400).json({ error: 'Missing data' });
        }

        let keys = [];
        try { keys = JSON.parse(apiKeys); } catch(e) { keys = [apiKeys]; }

        if (provider === 'gemini') {
            const { GoogleGenAI } = await import("@google/genai");
            const fileBuffer = fs.readFileSync(filePath);
            const base64Audio = fileBuffer.toString('base64');
            const mimeType = req.file.mimetype || 'audio/webm';
            let success = false;
            let transcription = '';

            for (const key of keys) {
                if(!key) continue;
                try {
                    // Initialize client with named parameter apiKey
                    const ai = new GoogleGenAI({ apiKey: key });
                    // Use gemini-3-flash-preview for general text/multimodal tasks
                    const response = await ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: { parts: [{ inlineData: { mimeType, data: base64Audio } }, { text: "فقط متن فارسی گفتار را بنویس." }] }
                    });
                    // Extract generated text using .text property
                    if (response.text) { transcription = response.text; success = true; break; }
                } catch (err) { console.error(`Key failed: ${key.slice(0,5)}...`); }
            }
            if (!success) throw new Error("همه کلیدها با خطا مواجه شدند.");
            res.json({ text: transcription.trim() });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally { if(filePath) try { fs.unlinkSync(filePath); } catch(e) {} }
});

app.post('/api/test-gemini', async (req, res) => {
    try {
        const settings = await SettingsModel.findOne();
        const keys = settings?.geminiApiKeys || [];
        const { GoogleGenAI } = await import("@google/genai");
        let successCount = 0;
        for (const key of keys) {
            try {
                // Initialize client with named parameter apiKey
                const ai = new GoogleGenAI({ apiKey: key });
                // Simple connectivity test using gemini-3-flash-preview
                await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: 'Ping' });
                successCount++;
            } catch (err) {}
        }
        res.json({ message: `${successCount} کلید از ${keys.length} فعال هستند.` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

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
        await FeedbackModel.findOneAndDelete({ id: req.params.id });
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/full-backup', async (req, res) => {
    try {
        const settings = await SettingsModel.findOne();
        const feedback = await FeedbackModel.find();
        res.json({ settings, feedback });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/full-restore', async (req, res) => {
    try {
        const { settings, feedback } = req.body;
        await SettingsModel.deleteMany({});
        await FeedbackModel.deleteMany({});
        if (settings) await SettingsModel.create(settings);
        if (feedback) await FeedbackModel.insertMany(feedback);
        res.json({ message: "OK" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on ${PORT}`));