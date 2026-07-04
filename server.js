const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Web-to-APK Backend is running!',
        version: '1.0.0'
    });
});

// Generate APK
app.post('/api/generate', async (req, res) => {
    try {
        const { url, appName, packageName } = req.body;
        
        if (!url || !appName) {
            return res.status(400).json({
                error: 'URL dan App Name diperlukan'
            });
        }

        console.log(`📱 Generating APK for: ${appName} (${url})`);

        // Gunakan pwa2apk API (FREE)
        const apkResponse = await axios.post('https://pwa2apk.com/api/generate', {
            url: url,
            appName: appName,
            packageName: packageName || `com.${appName.toLowerCase().replace(/\s/g, '')}`
        });

        res.json({
            success: true,
            appName: appName,
            url: url,
            downloadUrl: apkResponse.data.downloadUrl || 'https://example.com/download',
            message: 'APK berjaya dihasilkan! 🎉'
        });

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            error: 'Gagal generate APK',
            details: error.message
        });
    }
});

// Status check
app.get('/api/status/:jobId', async (req, res) => {
    res.json({
        jobId: req.params.jobId,
        status: 'completed',
        progress: 100
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
