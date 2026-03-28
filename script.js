// ---------- DATA MODELS (dynamic) ----------
let blogPosts = [];          // will hold loaded posts metadata
let projectsList = [];       // will hold loaded projects metadata

// comment storage: pending + approved
let pendingComments = [];
let approvedComments = [];

// load from localStorage
function loadComments() {
    const storedPending = localStorage.getItem("cyber_pending_comments");
    const storedApproved = localStorage.getItem("cyber_approved_comments");
    if(storedPending) pendingComments = JSON.parse(storedPending);
    if(storedApproved) approvedComments = JSON.parse(storedApproved);
    if(!storedApproved) {
        approvedComments = [
            { id: "app1", postId: "post1", author: "zer0_cool", text: "Sick aesthetic, love the glitch approach.", date: "2025-03-01" },
            { id: "app2", postId: "post2", author: "neon_nomad", text: "BCI part is fascinating! More details please.", date: "2025-03-12" }
        ];
        saveComments();
    }
    if(!storedPending) pendingComments = [];
}
function saveComments() {
    localStorage.setItem("cyber_pending_comments", JSON.stringify(pendingComments));
    localStorage.setItem("cyber_approved_comments", JSON.stringify(approvedComments));
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

// ---------- LOAD DATA FROM JSON ----------
async function loadBlogIndex() {
    const response = await fetch('data/blog/index.json');
    const posts = await response.json();
    blogPosts = posts.sort((a,b) => new Date(b.date) - new Date(a.date));
}
async function loadProjectsIndex() {
    const response = await fetch('data/projects/index.json');
    const projects = await response.json();
    projectsList = projects;
}
async function loadFullPost(postId) {
    const response = await fetch(`data/blog/${postId}.json`);
    return await response.json();
}
async function loadFullProject(projectId) {
    const response = await fetch(`data/projects/${projectId}.json`);
    return await response.json();
}

// RENDER LOGIC & SPA
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
    let truncated = '';
    if(latest) {
        truncated = "Click 'READ FULL POST' to view this article...";
    }
    const html = `
        <div class="intro-card">
            <h2 class="glow-text">⚡ CYBERNAUT // ENTRY</h2>
            <p>Minimalist, machine whisperer, architect of neon vectors. Explore void-driven design, bleeding-edge commentary, and open-source artifacts. This terminal is your gateway.</p>
        </div>
        ${latest ? `
        <div class="latest-card">
            <h3>⟡ LATEST TRANSMISSION ⟡</h3>
            <div class="post-title">${escapeHtml(latest.title)}</div>
            <div class="post-meta">${latest.date}</div>
            <p>${escapeHtml(truncated)}</p>
            <button class="btn-subtle" data-nav="blog">READ FULL POST →</button>
        </div>
        ` : '<p>no articles yet</p>'}
        <div class="media-links">
            <a href="https://github.com" target="_blank" class="media-icon"><i class="fab fa-github"></i></a>
            <a href="https://facebook.com" target="_blank" class="media-icon"><i class="fab fa-facebook"></i></a>
            <a href="https://youtube.com" target="_blank" class="media-icon"><i class="fab fa-youtube"></i></a>
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
                    <h4>💬 visitor comments</h4>
                    <div class="comments-list" id="comments-${postMeta.id}">${commentsHtml || '<i>no approved comments yet</i>'}</div>
                    <form class="comment-form" data-postid="${postMeta.id}">
                        <input type="text" placeholder="handle / alias" class="comment-name" required>
                        <textarea rows="2" placeholder="post your thought (awaiting review)" class="comment-text" required></textarea>
                        <button type="submit">submit for review</button>
                        <p style="font-size:0.7rem; margin-top:5px;">🔒 comments appear after admin approval</p>
                    </form>
                </div>
            </div>
        `;
    }
    const fullHtml = `<div class="blog-feed"><h2>📡 BLOG FEED <span style="font-size:0.8rem;">latest to oldest</span></h2>${postsHtml}</div>`;
    document.getElementById("pageContent").innerHTML = fullHtml;
    document.querySelectorAll('.comment-form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const postId = form.dataset.postid;
            const nameInput = form.querySelector('.comment-name');
            const textInput = form.querySelector('.comment-text');
            const author = nameInput.value.trim();
            const text = textInput.value.trim();
            if(!author || !text) { alert("fill both fields"); return; }
            addPendingComment(postId, author, text);
            alert("comment stored for manual review. Thank you.");
            form.reset();
        });
    });
}

async function renderProjectsView() {
    if(selectedProjectId) {
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
                <div class="back-link" id="backToProjects">← BACK TO PROJECT INDEX</div>
                <h2 class="glow-text">${escapeHtml(fullProject.title)}</h2>
                <div style="margin-top:1rem;">${contentHtml}</div>
                <hr>
                <p><i class="fas fa-microchip"></i> full project log — extended documentation available on github</p>
            </div>
        `;
        document.getElementById("pageContent").innerHTML = detailHtml;
        document.getElementById("backToProjects").addEventListener('click', () => {
            selectedProjectId = null;
            renderProjectsView();
        });
        return;
    }
    let listHtml = `<h2>⚙️ COMPLETED PROJECTS // SELECT TARGET</h2><div class="project-list">`;
    projectsList.forEach(proj => {
        listHtml += `<div class="project-item" data-projid="${proj.id}">
                        <span><i class="fas fa-cube"></i> ${escapeHtml(proj.title)}</span>
                        <span style="color:cyan;">↗</span>
                     </div>`;
    });
    listHtml += `</div><p class="glow-text" style="font-size:0.8rem;">* each project is a deep case study, click to expand</p>`;
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
            <h2><i class="fas fa-user-astronaut"></i> // SIGNAL INTERCEPT</h2>
            <p>email: <strong>void.operator@cyberhaven.io</strong><br>
            discord: .neon_gh0st<br>
            location: unknown sector, orbital node</p>
            <button id="downloadCvBtn" class="cv-btn"><i class="fas fa-download"></i> DOWNLOAD CV (terminal edition)</button>
            <div style="margin-top:1rem;">
                <h4>✦ clearances</h4>
                <ul style="margin-left:1.2rem;">
                    <li>Full-stack architecture / cybernetics</li>
                    <li>Neon UI/UX engineering</li>
                    <li>Rust / Typescript / Shader alchemy</li>
                </ul>
            </div>
        </div>
    `;
    document.getElementById("pageContent").innerHTML = contactHtml;
    document.getElementById("downloadCvBtn")?.addEventListener('click', () => {
        const cvContent = `[ CYBERPUNK CV ]\n==================\nNAME: Nyx V. Code\nROLE: Creative Technologist\nSKILLS: Minimalist web, neon design, embedded systems, generative art, AI integration.\nEXPERIENCE: 8+ years underground labs, open source contributions.\nCONTACT: void.operator@cyberhaven.io\n"reject mediocrity, embrace the glitch."`;
        const blob = new Blob([cvContent], {type: "text/plain"});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = "CV_NEON_VOID.txt";
        link.click();
        URL.revokeObjectURL(link.href);
    });
}

function switchPage(page) {
    currentPage = page;
    selectedProjectId = null;
    render();
}

// ADMIN MODAL
function showAdminModal() {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal';
    modalDiv.id = 'adminModal';
    let pendingHtml = '<h3>🔒 PENDING COMMENTS (manual review)</h3>';
    if(pendingComments.length === 0) pendingHtml += '<p>✨ no pending comments.</p>';
    else {
        pendingComments.forEach(comm => {
            const postTitle = blogPosts.find(p => p.id === comm.postId)?.title || "unknown article";
            pendingHtml += `
                <div class="pending-item" data-id="${comm.id}">
                    <strong>${escapeHtml(comm.author)}</strong> on <em>${postTitle}</em> (${comm.date})<br>
                    "${escapeHtml(comm.text)}"<br>
                    <button class="approveBtn" data-id="${comm.id}">✅ APPROVE</button>
                    <button class="rejectBtn" data-id="${comm.id}">❌ REJECT</button>
                </div>
            `;
        });
    }
    pendingHtml += `<hr><button id="closeAdminModal" class="btn-subtle">CLOSE PANEL</button>`;
    modalDiv.innerHTML = `<div class="modal-content">${pendingHtml}</div>`;
    document.body.appendChild(modalDiv);
    modalDiv.querySelectorAll('.approveBtn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cid = btn.dataset.id;
            approveComment(cid);
            modalDiv.remove();
            showAdminModal();
            if(currentPage === 'blog') renderBlog();
            else if(currentPage === 'home') renderHome();
        });
    });
    modalDiv.querySelectorAll('.rejectBtn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cid = btn.dataset.id;
            rejectComment(cid);
            modalDiv.remove();
            showAdminModal();
            if(currentPage === 'blog') renderBlog();
        });
    });
    document.getElementById('closeAdminModal')?.addEventListener('click', () => modalDiv.remove());
}

function requestAdminAccess() {
    const pwd = prompt("ADMIN AUTHENTICATION // enter override code:");
    if(pwd === "cyber2025") {
        showAdminModal();
    } else if(pwd !== null) {
        alert("access denied. incorrect clearance.");
    }
}

// INIT
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