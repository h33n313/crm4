require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const QuestionSchema = new mongoose.Schema({
    id: String, text: String, type: String, order: Number, visibility: String, category: { type: String, default: 'all' }
});

const UserSchema = new mongoose.Schema({
    id: String, username: String, name: String, role: String, title: String, order: Number, isPasswordEnabled: Boolean, password: { type: String, default: '' }, avatarColor: String
});

const SettingsSchema = new mongoose.Schema({
    brandName: String, developerPassword: String, iotypeApiKey: String, geminiApiKeys: [String], transcriptionMode: { type: String, default: 'iotype' }, users: [UserSchema], questions: [QuestionSchema], enabledIcons: [String]
});

const SettingsModel = mongoose.model('Setting', SettingsSchema);
const FeedbackModel = mongoose.model('Feedback', new mongoose.Schema({}, { strict: false, timestamps: true }));

const DEFAULT_SETTINGS = {
    brandName: "سامانه جهان امید سلامت",
    developerPassword: "111",
    iotypeApiKey: "uGobvO0d2JVAXCB3TiRygJ2R4Zwy3gaH",
    geminiApiKeys: [],
    transcriptionMode: "iotype",
    users: [
        { id: "admin1", username: "matlabi", name: "آقای مطلبی", role: "admin", title: "مدیر اصلی", order: 1, isPasswordEnabled: false, password: "", avatarColor: "bg-blue-600" },
        { id: "admin2", username: "kand", name: "آقای کاند", role: "admin", title: "مدیر اصلی", order: 2, isPasswordEnabled: false, password: "", avatarColor: "bg-indigo-600" },
        { id: "admin3", username: "mahlouji", name: "آقای مهلوجی", role: "admin", title: "مدیر مالی", order: 3, isPasswordEnabled: false, password: "", avatarColor: "bg-teal-600" },
        { id: "staff1", username: "mostafavi", name: "آقای مصطفوی", role: "admin", title: "سوپروایزر", order: 4, isPasswordEnabled: false, password: "", avatarColor: "bg-cyan-600" }
    ],
    questions: [
        { id: "q1", order: 1, type: "yes_no", text: "آیا آموزش‌های حین ترخیص به بیمار داده شده است؟", visibility: 'all', category: 'discharge' },
        { id: "q2", order: 2, type: "yes_no", text: "آیا بیمار از نوع رژیم غذایی خود اطلاع دارد؟", visibility: 'all', category: 'discharge' },
        { id: "q_nps", order: 21, type: "nps", text: "چقدر احتمال دارد این بیمارستان را به دیگران معرفی کنید؟", visibility: 'all', category: 'all' },
        { id: "q_comment", order: 22, type: "text", text: "نظرات و پیشنهادات تکمیلی", visibility: 'all', category: 'all' }
    ]
};

// --- API Routes ---

// Feedback Routes
app.get('/api/feedback', async (req, res) => {
    try {
        const feedback = await FeedbackModel.find().sort({ createdAt: -1 });
        res.json(feedback);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/feedback', async (req, res) => {
    try {
        const feedback = await FeedbackModel.create(req.body);
        res.json(feedback);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/feedback/:id', async (req, res) => {
    try {
        await FeedbackModel.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Settings Routes
app.get('/api/settings', async (req, res) => {
    try {
        let settings = await SettingsModel.findOne();
        if (!settings || !settings.questions || settings.questions.length === 0) {
            console.log("Initializing database with default settings...");
            await SettingsModel.deleteMany({});
            settings = await SettingsModel.create(DEFAULT_SETTINGS);
        }
        res.json(settings);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', async (req, res) => {
    try {
        const updated = await SettingsModel.findOneAndUpdate({}, req.body, { new: true, upsert: true });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings/reset', async (req, res) => {
    try {
        await SettingsModel.deleteMany({});
        const settings = await SettingsModel.create(DEFAULT_SETTINGS);
        res.json({ message: 'Database reset to defaults', settings });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Password Update Route
app.post('/api/users/password', async (req, res) => {
    try {
        const { targetUserId, newPassword } = req.body;
        const settings = await SettingsModel.findOne();
        if (!settings) return res.status(404).json({ error: 'Settings not found' });

        const userIndex = settings.users.findIndex(u => u.id === targetUserId);
        if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

        settings.users[userIndex].password = newPassword;
        settings.users[userIndex].isPasswordEnabled = !!newPassword;
        await settings.save();
        
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Logs Route
app.post('/api/logs', async (req, res) => {
    // Simple log to console for now, or could save to a LogModel
    console.log(`[LOG] ${req.body.type}: ${req.body.message}`);
    res.json({ success: true });
});

// STT Routes
app.post('/api/stt', multer().single('audioFile'), async (req, res) => {
    try {
        const { provider, apiKeys } = req.body;
        const keys = JSON.parse(apiKeys || '[]');
        
        if (provider === 'gemini') {
            const { GoogleGenAI } = require("@google/genai");
            const apiKey = keys[0]; // Use the first available key
            if (!apiKey) throw new Error("No Gemini API key provided");
            
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: "gemini-1.5-flash",
                contents: [{
                    parts: [
                        {
                            inlineData: {
                                data: req.file.buffer.toString("base64"),
                                mimeType: req.file.mimetype
                            }
                        },
                        { text: "تبدیل این فایل صوتی به متن فارسی. فقط متن را برگردان." }
                    ]
                }]
            });
            
            res.json({ text: response.text });
        } else {
            res.status(400).json({ error: "Unsupported provider" });
        }
    } catch (e) {
        console.error("STT Error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/transcribe-iotype', async (req, res) => {
    try {
        const { audio } = req.body;
        const settings = await SettingsModel.findOne();
        const apiKey = settings?.iotypeApiKey;
        
        if (!apiKey) throw new Error("IOType API key not configured");

        // Here you would normally call the IOType API
        // For now, returning a placeholder or implementing the actual call if possible
        // This is a placeholder for the actual integration
        res.json({ text: "متن تبدیل شده (نمونه)" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Backup & Restore Routes
app.get('/api/full-backup', async (req, res) => {
    try {
        const feedback = await FeedbackModel.find();
        const settings = await SettingsModel.findOne();
        res.json({ feedback, settings });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/full-restore', async (req, res) => {
    try {
        const { feedback, settings } = req.body;
        if (settings) {
            await SettingsModel.deleteMany({});
            await SettingsModel.create(settings);
        }
        if (feedback && Array.isArray(feedback)) {
            await FeedbackModel.deleteMany({});
            await FeedbackModel.insertMany(feedback);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/restore', async (req, res) => {
    try {
        const { data } = req.body;
        if (data && Array.isArray(data)) {
            await FeedbackModel.deleteMany({});
            await FeedbackModel.insertMany(data);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/health', (req, res) => res.json({ db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));