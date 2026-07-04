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
        version: '2.0.0'
    });
});

// Generate APK using PWA2APK (FREE)
app.post('/api/generate', async (req, res) => {
    try {
        const { url, appName, packageName } = req.body;
        
        if (!url || !appName) {
            return res.status(400).json({
                success: false,
                error: 'URL dan App Name diperlukan'
            });
        }

        console.log(`📱 Generating APK for: ${appName} (${url})`);

        // === USE PWA2APK API (FREE) ===
        const pwa2apkUrl = 'https://pwa2apk.com/api/generate';
        
        const requestData = {
            url: url,
            appName: appName,
            packageName: packageName || `com.${appName.toLowerCase().replace(/\s/g, '')}`,
            icon: '', // Optional: icon URL
            splashScreen: true,
            orientation: 'portrait',
            statusBar: '#000000'
        };

        console.log('Sending request to PWA2APK:', requestData);

        const response = await axios.post(pwa2apkUrl, requestData, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 120000 // 2 minutes
        });

        console.log('PWA2APK response:', response.status, response.data);

        // Check if response contains download URL
        let downloadUrl = null;
        if (response.data && response.data.downloadUrl) {
            downloadUrl = response.data.downloadUrl;
        } else if (response.data && response.data.url) {
            downloadUrl = response.data.url;
        } else if (response.data && response.data.data && response.data.data.downloadUrl) {
            downloadUrl = response.data.data.downloadUrl;
        }

        // If no download URL, try alternative API
        if (!downloadUrl) {
            console.log('PWA2APK failed, trying alternative...');
            // Try alternative: pwa2apk.com (different endpoint)
            const altResponse = await axios.post('https://pwa2apk.com/generate', {
                url: url,
                name: appName,
                package: packageName || `com.${appName.toLowerCase().replace(/\s/g, '')}`
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 120000
            });

            if (altResponse.data && altResponse.data.downloadUrl) {
                downloadUrl = altResponse.data.downloadUrl;
            }
        }

        // If still no download URL, return error
        if (!downloadUrl) {
            return res.status(500).json({
                success: false,
                error: 'Failed to get download URL from APK generator',
                debug: response.data || 'No response data'
            });
        }

        // Return success with download URL
        res.json({
            success: true,
            appName: appName,
            url: url,
            downloadUrl: downloadUrl,
            message: 'APK berjaya dihasilkan! 🎉'
        });

    } catch (error) {
        console.error('Error generating APK:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        
        res.status(500).json({
            success: false,
            error: 'Gagal generate APK: ' + error.message,
            debug: error.response ? error.response.data : null
        });
    }
});

// Download endpoint (optional - for local caching)
app.get('/api/download/:filename', async (req, res) => {
    const { filename } = req.params;
    const downloadDir = path.join(__dirname, 'downloads');
    
    try {
        // Try to find file in downloads folder
        const files = await fs.readdir(downloadDir);
        const matchingFile = files.find(f => f.includes(filename) || f === filename);
        
        if (matchingFile) {
            const filePath = path.join(downloadDir, matchingFile);
            res.download(filePath);
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving file' });
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
