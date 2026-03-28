const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Ensure directories exist
const dataDir = path.join(__dirname, 'data');
const blogDir = path.join(dataDir, 'blog');
const blogImagesDir = path.join(blogDir, 'images');
const projectsDir = path.join(dataDir, 'projects');
const projectsImagesDir = path.join(projectsDir, 'images');

[dataDir, blogDir, blogImagesDir, projectsDir, projectsImagesDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Determine destination based on the endpoint
        if (req.path === '/api/blog') {
            cb(null, blogImagesDir);
        } else if (req.path === '/api/project') {
            cb(null, projectsImagesDir);
        } else {
            cb(null, blogImagesDir);
        }
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        const timestamp = Date.now();
        cb(null, `${basename}-${timestamp}${ext}`);
    }
});
const upload = multer({ storage });

// Helper functions
function readJson(filePath, defaultVal) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        return defaultVal;
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err);
        return defaultVal;
    }
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// API endpoint to create a new blog post
app.post('/api/blog', upload.any(), async (req, res) => {
    try {
        const { title, date, blocks } = req.body;
        if (!title || !date) {
            return res.status(400).json({ error: 'Title and date required' });
        }

        // If blocks is not an object, return error
        if (!blocks || typeof blocks !== 'object') {
            return res.status(400).json({ error: 'No content blocks found' });
        }

        const content = [];

        // Iterate over each block (keys are numeric strings)
        const blockKeys = Object.keys(blocks).sort((a,b) => parseInt(a) - parseInt(b));
        for (const key of blockKeys) {
            const block = blocks[key];
            if (!block || !block.type) continue;

            if (block.type === 'text') {
                if (block.value && block.value.trim()) {
                    content.push({ type: 'text', value: block.value.trim() });
                }
            } else if (block.type === 'image') {
                // Find the uploaded file for this block
                const expectedFieldname = `blocks[${key}][image]`;
                const uploadedFile = req.files.find(f => f.fieldname === expectedFieldname);
                if (uploadedFile) {
                    const imageUrl = `/data/blog/images/${uploadedFile.filename}`;
                    content.push({ type: 'image', src: imageUrl, alt: 'Uploaded image' });
                }
            }
        }

        if (content.length === 0) {
            return res.status(400).json({ error: 'At least one content block required' });
        }

        // Generate ID and filename
        const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
        const postFile = path.join(blogDir, `${id}.json`);
        const postData = { id, title, date, content };
        writeJson(postFile, postData);

        // Update index
        const indexFile = path.join(blogDir, 'index.json');
        let index = readJson(indexFile, []);
        index.push({ id, title, date });
        index.sort((a,b) => new Date(b.date) - new Date(a.date));
        writeJson(indexFile, index);

        res.json({ success: true, id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// (Optional) similar endpoint for projects if needed later

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});