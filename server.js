
require('dotenv').config(); // Load environment variables
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const multer = require('multer');
const Groq = require('groq-sdk');
// REMOVED static require to fix ESM error: const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_db';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// --- Static Uploads Directory for TalkBot ---
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
    isPasswordEnabled: Boolean,
    password: { type: String, default: '' },
    avatarColor: String
});

const SettingsSchema = new mongoose.Schema({
    brandName: String,
    developerPassword: String,
    openaiApiKey: String, 
    iotypeApiKey: String,
    talkbotApiKey: String, 
    groqApiKey: String, // Added Groq
    geminiApiKey: String, // Added Gemini
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
    audioFiles: { type: Map, of: mongoose.Schema.Types.Mixed }, // Changed to Mixed to support string or array
    createdAt: Date,
    lastModified: Date
});

const FeedbackModel = mongoose.model('Feedback', FeedbackSchema);

// --- Defaults ---
const DEFAULT_SETTINGS = {
    brandName: "سامانه جهان امید سلامت",
    developerPassword: "111",
    openaiApiKey: "",
    iotypeApiKey: "uGobvO0d2JVAXCB3TiRygJ2R4Zwy3gaH",
    talkbotApiKey: "sk-2cf1f7dc54a0fd9e2b83227fde48de1f",
    groqApiKey: "",
    geminiApiKey: "",
    transcriptionMode: "talkbot",
    users: [], 
    questions: [],
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

        // 1. Remove Data URI prefix
        let base64Data = base64String.replace(/^data:audio\/[a-z0-9;=]+;base64,/, "");

        // 2. Remove whitespace/newlines which might cause invalid input errors in some envs
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
        const isManager = ['matlabi', 'kand', 'mahlouji'].includes(currentUser.username); // Added Mahlouji
        const isSupervisor = ['mostafavi'].includes(currentUser.username);
        const isTargetStaff = !['matlabi', 'kand', 'mahlouji', 'mostafavi'].includes(targetUser.username); // Added Mahlouji

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

// --- NEW STT ENDPOINT (GROQ & GEMINI) ---
app.post('/api/stt', upload.single('audioFile'), async (req, res) => {
    const filePath = req.file?.path;

    try {
        const { provider, apiKey } = req.body;
        if (!req.file || !provider || !apiKey) {
            if (filePath) try { fs.unlinkSync(filePath); } catch (e) {}
            return res.status(400).json({ error: 'Missing audio file, provider, or API key.' });
        }

        let transcription = '';

        if (provider === 'groq') {
            const groq = new Groq({ apiKey: apiKey });
            // Groq SDK can handle file streams
            const transcriptionResponse = await groq.audio.transcriptions.create({
                file: fs.createReadStream(filePath),
                model: 'whisper-large-v3',
                language: 'fa', // Persian
                response_format: 'json'
            });
            transcription = transcriptionResponse.text;

        } else if (provider === 'gemini') {
            // Dynamic import for ESM package
            const { GoogleGenAI } = await import("@google/genai");
            const ai = new GoogleGenAI({ apiKey: apiKey });
            
            // Read file buffer for Gemini
            const fileBuffer = fs.readFileSync(filePath);
            const base64Audio = fileBuffer.toString('base64');
            const mimeType = req.file.mimetype || 'audio/webm'; // Fallback

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: [
                    {
                        parts: [
                            { inlineData: { mimeType: mimeType, data: base64Audio } },
                            { text: "Transcribe this audio exactly to Persian text. Do not translate. Just transcribe." }
                        ]
                    }
                ]
            });
            transcription = response.response.text();
        } else {
            throw new Error('Invalid provider specified.');
        }

        // Cleanup
        try { fs.unlinkSync(filePath); } catch (e) {}

        res.json({ text: transcription.trim() });

    } catch (e) {
        // Cleanup on error
        if (filePath) try { fs.unlinkSync(filePath); } catch (err) {}
        
        console.error(`STT Error (${req.body.provider}):`, e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/test-openai', async (req, res) => {
    try {
        const settings = await SettingsModel.findOne();
        const apiKey = settings?.openaiApiKey;
        if (!apiKey) return res.status(400).json({ error: 'کلید API OpenAI تنظیم نشده است' });

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: "Ping" }],
            max_tokens: 1
        }, {
            headers: { 
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        res.json({ message: 'Success', details: 'Connection OK' });
    } catch (e) {
        res.status(500).json({ error: e.response?.data?.error?.message || e.message });
    }
});

app.post('/api/test-iotype', async (req, res) => {
    try {
        const settings = await SettingsModel.findOne();
        const apiKey = settings?.iotypeApiKey;

        if (!apiKey) return res.status(400).json({ error: 'IOType API Key not configured' });

        // Create a minimal wav buffer
        const base64Audio = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABkYXRhAAAAAA==";
        const { data: buffer, type, ext } = processBase64Audio(base64Audio);
        
        const form = new FormData();
        form.append('type', 'file');
        form.append('file', buffer, { filename: `test.${ext}`, contentType: type });

        const response = await axios.post('https://www.iotype.com/developer/transcription', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': apiKey,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const data = response.data;
        if (data.status === 0) {
             return res.status(400).json({ error: data.message });
        }
        res.json({ message: 'Success', details: 'Connection OK' });
    } catch (e) {
        console.error('Test IOType Error:', e.message);
        const errMsg = e.response?.data?.message || e.message;
        res.status(500).json({ error: errMsg });
    }
});

app.post('/api/test-talkbot', async (req, res) => {
    try {
        const settings = await SettingsModel.findOne();
        const apiKey = settings?.talkbotApiKey;

        if (!apiKey) return res.status(400).json({ error: 'TalkBot API Key not configured' });

        const base64Audio = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABkYXRhAAAAAA==";
        const { data: buffer, ext } = processBase64Audio(base64Audio);
        const filename = `test_talkbot_${Date.now()}.${ext}`;
        const filePath = path.join(uploadsDir, filename);
        
        fs.writeFileSync(filePath, buffer);
        
        const protocol = req.protocol;
        const host = req.get('host');
        const fileUrl = `${protocol}://${host}/uploads/${filename}`;

        const response = await axios.post('https://api.talkbot.ir/v1/media/speech-to-text/REQ', {
            url: fileUrl,
            language: 'none'
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        try { fs.unlinkSync(filePath); } catch (e) {}

        const data = response.data;
        if (data && data.response && data.response.code === 200) {
             res.json({ message: 'Success', details: 'Connection OK' });
        } else {
             return res.status(400).json({ error: data.response?.message || 'TalkBot API Error' });
        }
    } catch (e) {
        console.error('Test TalkBot Error:', e.message);
        res.status(500).json({ error: e.response?.data?.message || e.message });
    }
});

// TalkBot Transcription Route
app.post('/api/transcribe-talkbot', async (req, res) => {
    try {
        const { audio } = req.body;
        if (!audio) return res.status(400).json({ error: 'No audio data received' });

        const settings = await SettingsModel.findOne();
        const apiKey = settings?.talkbotApiKey;

        if (!apiKey) return res.status(400).json({ error: 'TalkBot API Key not configured' });

        const { data: buffer, ext } = processBase64Audio(audio);
        const filename = `talkbot_${Date.now()}_${Math.floor(Math.random()*1000)}.${ext}`;
        const filePath = path.join(uploadsDir, filename);
        
        fs.writeFileSync(filePath, buffer);

        const protocol = req.protocol;
        const host = req.get('host');
        const fileUrl = `${protocol}://${host}/uploads/${filename}`;

        const response = await axios.post('https://api.talkbot.ir/v1/media/speech-to-text/REQ', {
            url: fileUrl,
            language: 'fa' // Persian
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        try { fs.unlinkSync(filePath); } catch (e) { console.error("Error deleting temp file", e); }

        const data = response.data;

        if (data && data.response && data.response.code === 200) {
             const text = data.response.output || '';
             res.json({ text: text });
        } else {
             console.error("TalkBot API Error Response:", data);
             return res.status(500).json({ error: data.response?.message || 'TalkBot API Error' });
        }

    } catch (e) {
        console.error("Transcribe TalkBot Error:", e.message);
        if (e.response) {
             console.error("Response Data:", e.response.data);
             return res.status(500).json({ error: e.response.data.message || e.message });
        }
        res.status(500).json({ error: e.message });
    }
});

// OpenAI Transcription Route
app.post('/api/transcribe-openai', async (req, res) => {
    try {
        const { audio } = req.body; 
        if (!audio) return res.status(400).json({ error: 'No audio data' });

        const settings = await SettingsModel.findOne();
        const apiKey = settings?.openaiApiKey;

        if (!apiKey) return res.status(400).json({ error: 'OpenAI API Key not configured' });

        const { data: buffer, type, ext } = processBase64Audio(audio);
        
        const form = new FormData();
        form.append('file', buffer, { filename: `recording.${ext}`, contentType: type });
        form.append('model', 'whisper-1');
        form.append('language', 'fa'); 

        const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${apiKey}`
            }
        });

        res.json({ text: response.data.text || '' });

    } catch (e) {
        console.error("Transcribe Internal Error:", e.message);
        res.status(500).json({ error: e.response?.data?.error?.message || e.message });
    }
});

// IOType Transcription Route - UPDATED with AXIOS
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
        // IMPORTANT: The 3rd argument (options) is critical for binary buffers in 'form-data'
        form.append('file', buffer, { 
            filename: `recording.${ext}`, 
            contentType: type 
        });

        const response = await axios.post('https://www.iotype.com/developer/transcription', form, {
            headers: { 
                ...form.getHeaders(), // This sets the correct Content-Type with Boundary
                'Authorization': apiKey,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const data = response.data;
        
        if (data.status === 0) {
            console.error("IOType API Logic Error:", data);
            return res.status(500).json({ error: data.message || 'IOType API Error' });
        }
        
        // Success: { status: 100, message: "transcribed", result: "text" }
        const text = data.result || '';
        res.json({ text: text });

    } catch (e) {
        console.error("Transcribe IOType Network Error:", e.message);
        if (e.response) {
            console.error("Response Data:", e.response.data);
            return res.status(500).json({ error: e.response.data.message || e.message });
        }
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/feedback', async (req, res) => {
    try {
        const feedback = await FeedbackModel.find().sort({ createdAt: -1 });
        res.json(feedback);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/feedback', async (req, res) => {
    try {
        const { id, ...data } = req.body;
        if (id && await FeedbackModel.findOne({ id })) {
            const updated = await FeedbackModel.findOneAndUpdate(
                { id }, 
                { ...data, lastModified: new Date() }, 
                { new: true }
            );
            return res.json(updated);
        } else {
            const lastRecord = await FeedbackModel.findOne().sort({ trackingId: -1 });
            const nextTrackingId = lastRecord && lastRecord.trackingId ? lastRecord.trackingId + 1 : 1000;
            const newFeedback = await FeedbackModel.create({
                ...data,
                id: id || Date.now().toString(),
                trackingId: nextTrackingId,
                createdAt: data.createdAt || new Date(),
                status: data.status || 'draft'
            });
            return res.status(201).json(newFeedback);
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/feedback/:id', async (req, res) => {
    try {
        const result = await FeedbackModel.findOneAndDelete({ id: req.params.id });
        if (!result) return res.status(404).json({ message: 'Not found' });
        res.json({ message: 'Deleted' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/backup', async (req, res) => {
    try {
        const data = await FeedbackModel.find().lean();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/restore', async (req, res) => {
    try {
        if (Array.isArray(req.body.data)) {
            for (const item of req.body.data) {
                await FeedbackModel.findOneAndUpdate({ id: item.id }, item, { upsert: true });
            }
            res.json({ message: 'Restored' });
        } else {
            res.status(400).send('Invalid data format');
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/health', (req, res) => {
    if (mongoose.connection.readyState === 1) {
        res.status(200).json({ status: 'ok', db: 'connected' });
    } else {
        res.status(500).json({ status: 'error', db: 'disconnected' });
    }
});

app.post('/api/logs', (req, res) => {
    res.status(200).send('ok');
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Graceful Shutdown
const shutdown = async () => {
    console.log('🛑 Shutting down server...');
    try {
        await mongoose.connection.close(); 
        console.log('🛑 MongoDB connection closed');
    } catch (err) {
        console.error('Error closing MongoDB connection', err);
    }
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
    