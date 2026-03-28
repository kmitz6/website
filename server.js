const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Ensure necessary directories exist
const dataDir = path.join(__dirname, 'data');
const blogDir = path.join(dataDir, 'blog');
const blogImagesDir = path.join(blogDir, 'images');
const projectsDir = path.join(dataDir, 'projects');
const projectsImagesDir = path.join(projectsDir, 'images');

[dataDir, blogDir, blogImagesDir, projectsDir, projectsImagesDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Serve static files from 'public' and 'data' folders
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Determine if it's a blog or project upload based on endpoint
        if (req.path === '/api/blog') {
            cb(null, blogImagesDir);
        } else if (req.path === '/api/project') {
            cb(null, projectsImagesDir);
        } else {
            cb(null, blogImagesDir);
        }
    },
    filename: (req, file, cb) => {
        // Generate filename: originalname without extension + timestamp
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        const timestamp = Date.now();
        cb(null, `${basename}-${timestamp}${ext}`);
    }
});
const upload = multer({ storage });

// Helper to read and write JSON files
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

        // Parse blocks from form data
        let content = [];
        if (blocks) {
            // blocks is an array-like object; we need to process it carefully
            const blockKeys = Object.keys(blocks).filter(k => k.endsWith('[type]'));
            for (let key of blockKeys) {
                const index = key.split('[')[0];
                const type = blocks[`blocks[${index}][type]`];
                if (type === 'text') {
                    const value = blocks[`blocks[${index}][value]`];
                    if (value) content.push({ type: 'text', value });
                } else if (type === 'image') {
                    // Find the uploaded file associated with this block
                    const file = req.files.find(f => f.fieldname === `blocks[${index}][image]`);
                    if (file) {
                        // File path relative to web root
                        const imageUrl = `/data/blog/images/${file.filename}`;
                        content.push({ type: 'image', src: imageUrl, alt: 'Uploaded image' });
                    }
                }
            }
        }

        if (content.length === 0) {
            return res.status(400).json({ error: 'At least one content block required' });
        }

        // Generate a unique ID and filename
        const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
        const postFile = path.join(blogDir, `${id}.json`);
        const postData = {
            id,
            title,
            date,
            content
        };
        writeJson(postFile, postData);

        // Update blog index
        const indexFile = path.join(blogDir, 'index.json');
        let index = readJson(indexFile, []);
        index.push({ id, title, date });
        // Sort by date descending
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