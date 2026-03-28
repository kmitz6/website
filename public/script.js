// ---------- DATA MODELS (loaded from server) ----------
let blogPosts = [];
let projectsList = [];

// comment storage (still in localStorage for simplicity)
let pendingComments = [];
let approvedComments = [];

// ---------- LOAD DATA FROM SERVER ----------
async function loadBlogIndex() {
    const response = await fetch('/data/blog/index.json');
    const posts = await response.json();
    blogPosts = posts.sort((a,b) => new Date(b.date) - new Date(a.date));
}
async function loadProjectsIndex() {
    const response = await fetch('/data/projects/index.json');
    const projects = await response.json();
    projectsList = projects;
}
async function loadFullPost(postId) {
    const response = await fetch(`/data/blog/${postId}.json`);
    return await response.json();
}
async function loadFullProject(projectId) {
    const response = await fetch(`/data/projects/${projectId}.json`);
    return await response.json();
}

// ---------- COMMENT FUNCTIONS (localStorage) ----------
function loadComments() {
    const storedPending = localStorage.getItem("pending_comments");
    const storedApproved = localStorage.getItem("approved_comments");
    if(storedPending) pendingComments = JSON.parse(storedPending);
    if(storedApproved) approvedComments = JSON.parse(storedApproved);
    if(!storedApproved) {
        approvedComments = [
            { id: "app1", postId: "post1", author: "Alex", text: "Great article, thanks for sharing.", date: "2025-03-01" },
            { id: "app2", postId: "post2", author: "Jamie", text: "Interesting approach to BCI!", date: "2025-03-12" }
        ];
        saveComments();
    }
    if(!storedPending) pendingComments = [];
}
function saveComments() {
    localStorage.setItem("pending_comments", JSON.stringify(pendingComments));
    localStorage.setItem("approved_comments", JSON.stringify(approvedComments));
}
function addPendingComment(postId, author, text) {
    const newComment = {
        id: Date.now() + "-" + Math.random(),
        postId: postId,
        author: author.trim() || "Anonymous",
        text: text.trim(),
        date: new Date().toISOString().slice(0,10)
    };
    pendingComments.push(newComment);
    saveComments();
}
function approveComment(commentId) {
    const index = pendingComments.findIndex(c => c.id == commentId);
    if(index !== -1) {
        const approved = pendingComments[index];
        approvedComments.push({ ...approved });
        pendingComments.splice(index,1);
        saveComments();
    }
}
function rejectComment(commentId) {
    const index = pendingComments.findIndex(c => c.id == commentId);
    if(index !== -1) {
        pendingComments.splice(index,1);
        saveComments();
    }
}
function getApprovedForPost(postId) {
    return approvedComments.filter(c => c.postId === postId);
}

// ---------- RENDER LOGIC (same as before) ----------
let currentPage = "home";
let selectedProjectId = null;

function render() {
    if(currentPage === "home") renderHome();
    else if(currentPage === "blog") renderBlog();
    else if(currentPage === "projects") renderProjectsView();
    else if(currentPage === "contact") renderContact();
    highlightActiveNav();
}

function highlightActiveNav() {
    document.querySelectorAll('.nav-link').forEach(btn => {
        if(btn.dataset.page === currentPage) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

function escapeHtml(str) { 
    if(!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if(m === '&') return '&amp;';
        if(m === '<') return '&lt;';
        if(m === '>') return '&gt;';
        return m;
    }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
        return c;
    });
}

function renderHome() {
    const latest = blogPosts.length ? blogPosts[0] : null;
    const html = `
        <div class="intro-card">
            <h2>Hello, I'm a developer</h2>
            <p>I build web applications, design systems, and experiment with creative coding. This site serves as a portfolio and a space to share technical insights.</p>
        </div>
        ${latest ? `
        <div class="latest-card">
            <h3>Latest article</h3>
            <div class="post-title">${escapeHtml(latest.title)}</div>
            <div class="post-meta">${latest.date}</div>
            <p>Click below to read the full post.</p>
            <button class="btn-subtle" data-nav="blog">Read full post →</button>
        </div>
        ` : '<p>No articles yet.</p>'}
        <div class="media-links">
            <a href="https://github.com" target="_blank" class="media-icon"><i class="fab fa-github"></i></a>
            <a href="https://linkedin.com" target="_blank" class="media-icon"><i class="fab fa-linkedin"></i></a>
            <a href="https://twitter.com" target="_blank" class="media-icon"><i class="fab fa-twitter"></i></a>
        </div>
    `;
    document.getElementById("pageContent").innerHTML = html;
    document.querySelector("[data-nav='blog']")?.addEventListener('click', () => switchPage('blog'));
}

async function renderBlog() {
    let postsHtml = '';
    for(let postMeta of blogPosts) {
        const fullPost = await loadFullPost(postMeta.id);
        const contentHtml = fullPost.content.map(block => {
            if(block.type === 'text') {
                return `<p>${escapeHtml(block.value).replace(/\n/g, '<br>')}</p>`;
            } else if(block.type === 'image') {
                return `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt || '')}" class="post-image">`;
            }
            return '';
        }).join('');
        const approvedCommentsList = getApprovedForPost(postMeta.id);
        const commentsHtml = approvedCommentsList.map(c => `<div class="comment"><span class="comment-author">${escapeHtml(c.author)}</span> <small>${c.date}</small><br>${escapeHtml(c.text)}</div>`).join('');
        postsHtml += `
            <div class="post-card" data-postid="${postMeta.id}">
                <div class="post-title">${escapeHtml(postMeta.title)}</div>
                <div class="post-meta">📅 ${postMeta.date}</div>
                <div class="post-content">${contentHtml}</div>
                <div class="comment-section">
                    <h4>Comments</h4>
                    <div class="comments-list" id="comments-${postMeta.id}">${commentsHtml || '<i>No comments yet.</i>'}</div>
                    <form class="comment-form" data-postid="${postMeta.id}">
                        <input type="text" placeholder="Name" class="comment-name" required>
                        <textarea rows="2" placeholder="Add a comment (awaiting review)" class="comment-text" required></textarea>
                        <button type="submit">Submit for review</button>
                        <p style="font-size:0.7rem; margin-top:5px;">Comments are moderated.</p>
                    </form>
                </div>
            </div>
        `;
    }
    const fullHtml = `<div class="blog-feed"><h2>Blog</h2>${postsHtml}</div>`;
    document.getElementById("pageContent").innerHTML = fullHtml;
    document.querySelectorAll('.comment-form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const postId = form.dataset.postid;
            const nameInput = form.querySelector('.comment-name');
            const textInput = form.querySelector('.comment-text');
            const author = nameInput.value.trim();
            const text = textInput.value.trim();
            if(!author || !text) { alert("Please fill in both fields."); return; }
            addPendingComment(postId, author, text);
            alert("Comment submitted for review. Thank you.");
            form.reset();
        });
    });
}

async function renderProjectsView() {
    if(selectedProjectId) {
        const project = projectsList.find(p => p.id === selectedProjectId);
        if(project) {
            const fullProject = await loadFullProject(selectedProjectId);
            const contentHtml = fullProject.content.map(block => {
                if(block.type === 'text') {
                    return `<p>${escapeHtml(block.value).replace(/\n/g, '<br>')}</p>`;
                } else if(block.type === 'image') {
                    return `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt || '')}" class="post-image">`;
                }
                return '';
            }).join('');
            const detailHtml = `
                <div class="project-detail-card">
                    <div class="back-link" id="backToProjects">← Back to projects</div>
                    <h2>${escapeHtml(fullProject.title)}</h2>
                    <div style="margin-top:1rem;">${contentHtml}</div>
                    <hr>
                    <p>More details available on GitHub.</p>
                </div>
            `;
            document.getElementById("pageContent").innerHTML = detailHtml;
            document.getElementById("backToProjects").addEventListener('click', () => {
                selectedProjectId = null;
                renderProjectsView();
            });
            return;
        } else {
            selectedProjectId = null;
        }
    }
    let listHtml = `<h2>Projects</h2><div class="project-list">`;
    projectsList.forEach(proj => {
        listHtml += `<div class="project-item" data-projid="${proj.id}">
                        <span><i class="fas fa-folder"></i> ${escapeHtml(proj.title)}</span>
                        <span>→</span>
                     </div>`;
    });
    listHtml += `</div><p>Click on any project to view details.</p>`;
    document.getElementById("pageContent").innerHTML = listHtml;
    document.querySelectorAll('.project-item').forEach(el => {
        el.addEventListener('click', (e) => {
            const pid = el.dataset.projid;
            selectedProjectId = pid;
            renderProjectsView();
        });
    });
}

function renderContact() {
    const contactHtml = `
        <div class="intro-card">
            <h2>Contact</h2>
            <p>Email: <strong>hello@example.com</strong><br>
            GitHub: <strong>github.com/username</strong><br>
            Location: Remote</p>
            <button id="downloadCvBtn" class="cv-btn"><i class="fas fa-download"></i> Download CV (PDF)</button>
            <div style="margin-top:1rem;">
                <h4>Areas of focus</h4>
                <ul style="margin-left:1.2rem;">
                    <li>Web development & design systems</li>
                    <li>Creative coding & generative art</li>
                    <li>Open source contributions</li>
                </ul>
            </div>
        </div>
    `;
    document.getElementById("pageContent").innerHTML = contactHtml;
    document.getElementById("downloadCvBtn")?.addEventListener('click', () => {
        const cvContent = `CURRICULUM VITAE\n=================\nName: Jane Doe\nRole: Full-stack Developer\nSkills: JavaScript, React, Node.js, Python, WebGL\nExperience: 5+ years in software development\nContact: hello@example.com\n"Building things that matter."`;
        const blob = new Blob([cvContent], {type: "text/plain"});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = "CV.txt";
        link.click();
        URL.revokeObjectURL(link.href);
    });
}

function switchPage(page) {
    currentPage = page;
    selectedProjectId = null;
    render();
}

// ---------- ADMIN MODAL (with server-side post creation) ----------
function showAdminModal() {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal';
    modalDiv.id = 'adminModal';
    modalDiv.innerHTML = `
        <div class="modal-content">
            <div style="display: flex; gap: 1rem; border-bottom: 1px solid cyan; margin-bottom: 1rem;">
                <button id="tabComments" class="btn-subtle" style="background: #0ff22d20;">Pending Comments</button>
                <button id="tabNewPost" class="btn-subtle">Create New Post</button>
            </div>
            <div id="adminCommentsPanel">
                <h3>Pending comments</h3>
                <div id="pendingCommentsList"></div>
            </div>
            <div id="adminNewPostPanel" style="display: none;">
                <h3>Write a new blog post</h3>
                <form id="newPostForm" enctype="multipart/form-data">
                    <input type="text" id="postTitle" placeholder="Title" required style="width:100%; margin-bottom: 0.5rem; background:#041018; border:1px solid cyan; color:white; padding:0.5rem;">
                    <input type="date" id="postDate" required style="width:100%; margin-bottom: 0.5rem; background:#041018; border:1px solid cyan; color:white; padding:0.5rem;">
                    <div id="contentBlocksContainer">
                        <div class="content-block" data-block-index="0">
                            <select class="block-type" style="background:#041018; border:1px solid cyan; color:white; padding:0.2rem;">
                                <option value="text">Text</option>
                                <option value="image">Image</option>
                            </select>
                            <div class="block-content">
                                <textarea placeholder="Text content..." rows="3" style="width:100%; background:#041018; border:1px solid cyan; color:white; margin-top:0.3rem;"></textarea>
                            </div>
                            <button type="button" class="remove-block" style="color:red; margin-top:0.3rem;">Remove</button>
                            <hr style="margin:0.5rem 0;">
                        </div>
                    </div>
                    <button type="button" id="addBlockBtn" class="btn-subtle" style="margin:0.5rem 0;">+ Add text or image block</button>
                    <button type="submit" class="btn-subtle" style="background:#0ff22d20;">Publish Post</button>
                </form>
            </div>
            <hr>
            <button id="closeAdminModal" class="btn-subtle">Close</button>
        </div>
    `;
    document.body.appendChild(modalDiv);

    // Tab switching
    const tabComments = modalDiv.querySelector('#tabComments');
    const tabNewPost = modalDiv.querySelector('#tabNewPost');
    const commentsPanel = modalDiv.querySelector('#adminCommentsPanel');
    const newPostPanel = modalDiv.querySelector('#adminNewPostPanel');

    tabComments.addEventListener('click', () => {
        commentsPanel.style.display = 'block';
        newPostPanel.style.display = 'none';
        tabComments.style.background = '#0ff22d20';
        tabNewPost.style.background = 'none';
        refreshPendingCommentsList(modalDiv);
    });
    tabNewPost.addEventListener('click', () => {
        commentsPanel.style.display = 'none';
        newPostPanel.style.display = 'block';
        tabNewPost.style.background = '#0ff22d20';
        tabComments.style.background = 'none';
    });

    // Function to refresh pending comments list
    function refreshPendingCommentsList(modal) {
        const container = modal.querySelector('#pendingCommentsList');
        if(pendingComments.length === 0) {
            container.innerHTML = '<p>No pending comments.</p>';
            return;
        }
        let html = '';
        pendingComments.forEach(comm => {
            const postTitle = blogPosts.find(p => p.id === comm.postId)?.title || "unknown article";
            html += `
                <div class="pending-item" data-id="${comm.id}">
                    <strong>${escapeHtml(comm.author)}</strong> on <em>${postTitle}</em> (${comm.date})<br>
                    "${escapeHtml(comm.text)}"<br>
                    <button class="approveBtn" data-id="${comm.id}">✓ Approve</button>
                    <button class="rejectBtn" data-id="${comm.id}">✗ Reject</button>
                </div>
            `;
        });
        container.innerHTML = html;
        container.querySelectorAll('.approveBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cid = btn.dataset.id;
                approveComment(cid);
                refreshPendingCommentsList(modalDiv);
                if(currentPage === 'blog') renderBlog();
                else if(currentPage === 'home') renderHome();
            });
        });
        container.querySelectorAll('.rejectBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cid = btn.dataset.id;
                rejectComment(cid);
                refreshPendingCommentsList(modalDiv);
                if(currentPage === 'blog') renderBlog();
            });
        });
    }
    refreshPendingCommentsList(modalDiv);

    // ---- Blog post creation logic (server-side) ----
    const blocksContainer = modalDiv.querySelector('#contentBlocksContainer');
    const addBlockBtn = modalDiv.querySelector('#addBlockBtn');
    let blockIndex = 1;

    function updateBlockUI(blockDiv) {
        const typeSelect = blockDiv.querySelector('.block-type');
        const contentDiv = blockDiv.querySelector('.block-content');
        const currentType = typeSelect.value;
        if (currentType === 'text') {
            if (!contentDiv.querySelector('textarea')) {
                contentDiv.innerHTML = '<textarea placeholder="Text content..." rows="3" style="width:100%; background:#041018; border:1px solid cyan; color:white; margin-top:0.3rem;"></textarea>';
            }
        } else if (currentType === 'image') {
            if (!contentDiv.querySelector('input[type="file"]')) {
                contentDiv.innerHTML = `
                    <input type="file" accept="image/*" style="margin-top:0.3rem; background:#041018; color:white;">
                    <div class="image-preview" style="margin-top:0.3rem;"></div>
                `;
                const fileInput = contentDiv.querySelector('input[type="file"]');
                fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file && file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            const previewDiv = contentDiv.querySelector('.image-preview');
                            previewDiv.innerHTML = `<img src="${ev.target.result}" style="max-width:100%; max-height:100px; border-radius:4px;">`;
                            // Store the file object in a data attribute for later upload
                            blockDiv.dataset.imageFile = file;
                        };
                        reader.readAsDataURL(file);
                    } else {
                        alert('Please select an image file.');
                    }
                });
            }
        }
    }

    function addBlock() {
        const blockDiv = document.createElement('div');
        blockDiv.className = 'content-block';
        blockDiv.setAttribute('data-block-index', blockIndex++);
        blockDiv.innerHTML = `
            <select class="block-type" style="background:#041018; border:1px solid cyan; color:white; padding:0.2rem;">
                <option value="text">Text</option>
                <option value="image">Image</option>
            </select>
            <div class="block-content"></div>
            <button type="button" class="remove-block" style="color:red; margin-top:0.3rem;">Remove</button>
            <hr style="margin:0.5rem 0;">
        `;
        const typeSelect = blockDiv.querySelector('.block-type');
        typeSelect.addEventListener('change', () => updateBlockUI(blockDiv));
        const removeBtn = blockDiv.querySelector('.remove-block');
        removeBtn.addEventListener('click', () => blockDiv.remove());
        blocksContainer.appendChild(blockDiv);
        updateBlockUI(blockDiv);
    }

    // initial block setup
    const firstBlock = modalDiv.querySelector('.content-block');
    if (firstBlock) {
        const firstTypeSelect = firstBlock.querySelector('.block-type');
        firstTypeSelect.addEventListener('change', () => updateBlockUI(firstBlock));
        updateBlockUI(firstBlock);
        const firstRemove = firstBlock.querySelector('.remove-block');
        firstRemove.addEventListener('click', () => firstBlock.remove());
    }

    addBlockBtn.addEventListener('click', addBlock);

    const newPostForm = modalDiv.querySelector('#newPostForm');
    newPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = modalDiv.querySelector('#postTitle').value.trim();
        const date = modalDiv.querySelector('#postDate').value;
        if (!title || !date) {
            alert('Please fill in title and date.');
            return;
        }

        const blocks = modalDiv.querySelectorAll('.content-block');
        const formData = new FormData();
        formData.append('title', title);
        formData.append('date', date);

        let blockCounter = 0;
        for (let block of blocks) {
            const type = block.querySelector('.block-type').value;
            if (type === 'text') {
                const textarea = block.querySelector('textarea');
                if (textarea && textarea.value.trim()) {
                    formData.append(`blocks[${blockCounter}][type]`, 'text');
                    formData.append(`blocks[${blockCounter}][value]`, textarea.value.trim());
                    blockCounter++;
                }
            } else if (type === 'image') {
                const fileInput = block.querySelector('input[type="file"]');
                const file = fileInput && fileInput.files[0];
                if (file) {
                    formData.append(`blocks[${blockCounter}][type]`, 'image');
                    formData.append(`blocks[${blockCounter}][image]`, file);
                    blockCounter++;
                } else if (block.dataset.imageFile) {
                    // If we already selected the file but maybe it's still in dataset
                    formData.append(`blocks[${blockCounter}][type]`, 'image');
                    formData.append(`blocks[${blockCounter}][image]`, block.dataset.imageFile);
                    blockCounter++;
                }
            }
        }

        if (blockCounter === 0) {
            alert('Please add at least one content block (text or image).');
            return;
        }

        try {
            const response = await fetch('/api/blog', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (response.ok) {
                alert('Post created successfully!');
                modalDiv.remove();
                // Reload blog index and refresh page
                await loadBlogIndex();
                if (currentPage === 'blog') renderBlog();
                else if (currentPage === 'home') renderHome();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (err) {
            alert('Network error: ' + err.message);
        }
    });

    modalDiv.querySelector('#closeAdminModal').addEventListener('click', () => modalDiv.remove());
}

function requestAdminAccess() {
    const pwd = prompt("Admin access required. Enter password:");
    if(pwd === "admin123") {
        showAdminModal();
    } else if(pwd !== null) {
        alert("Incorrect password.");
    }
}

// ---------- INIT ----------
async function init() {
    await loadBlogIndex();
    await loadProjectsIndex();
    loadComments();
    render();
    document.querySelectorAll('.nav-link').forEach(btn => {
        btn.addEventListener('click', () => {
            switchPage(btn.dataset.page);
        });
    });
    document.getElementById('adminTrigger').addEventListener('click', requestAdminAccess);
    document.addEventListener('click', (e) => {
        if(e.target.closest('[data-nav="blog"]')) {
            switchPage('blog');
        }
    });
}
init();