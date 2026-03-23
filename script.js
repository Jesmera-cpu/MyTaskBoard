// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://PASTE_YOUR_PROJECT.firebaseio.com",
  projectId: "PASTE_YOUR_PROJECT",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_YOUR_ID",
  appId: "PASTE_YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database().ref('life_dashboard');

let tasks = [];
let editingId = null;

// --- CORE LOGIC ---
db.on('value', (snapshot) => {
    const data = snapshot.val();
    tasks = data ? Object.values(data) : [];
    renderTasks();
});

function renderTasks() {
    const search = document.getElementById('search-bar').value.toLowerCase();
    document.querySelectorAll('.task-list').forEach(l => l.innerHTML = '');

    tasks.forEach(t => {
        if (!t.title.toLowerCase().includes(search)) return;

        const el = document.createElement('div');
        if (t.type === 'daily') {
            el.className = 'daily-item';
            el.innerHTML = `
                <input type="checkbox" class="daily-checkbox" ${t.completed ? 'checked' : ''} onchange="toggleDaily(${t.id})">
                <div style="margin-left:12px">
                    <div style="font-weight:700">${t.title}</div>
                    <div class="timestamp-label">${t.lastDone ? 'Done at: ' + t.lastDone : 'Not completed today'}</div>
                </div>
            `;
            document.getElementById('list-daily').appendChild(el);
        } else {
            el.className = `task-card card-${t.priority}`;
            el.dataset.id = t.id;
            el.dataset.date = t.datetime;
            const timeStr = t.datetime ? new Date(t.datetime).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : '';
            el.innerHTML = `
                <div style="display:flex; align-items:center;">
                    <span class="drag-handle">≡</span>
                    <span>${t.title}</span>
                </div>
                ${timeStr ? `<div class="timestamp-label">⏰ ${timeStr}</div>` : ''}
            `;
            el.ondblclick = () => editTask(t.id);
            document.getElementById('list-' + t.priority).appendChild(el);
        }
    });
    initSortable();
    triggerAlerts();
}

// --- TASK ACTIONS ---
function saveTask() {
    const title = document.getElementById('task-title').value;
    const type = document.getElementById('task-type').value;
    const priority = document.getElementById('task-priority').value;
    const datetime = document.getElementById('task-datetime').value;
    const info = document.getElementById('task-info').value;

    if (!title) return alert("Title required");

    if (editingId) {
        const i = tasks.findIndex(x => x.id === editingId);
        tasks[i] = { ...tasks[i], title, type, priority, datetime, info };
    } else {
        tasks.push({ id: Date.now(), title, type, priority, datetime, info, completed: false });
    }
    sync(); closeModal();
}

function toggleDaily(id) {
    const t = tasks.find(x => x.id === id);
    t.completed = !t.completed;
    t.lastDone = t.completed ? new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : t.lastDone;
    sync();
}

function deleteTask() {
    if (confirm("Delete task?")) {
        tasks = tasks.filter(x => x.id !== editingId);
        sync(); closeModal();
    }
}

function sync() { db.set(tasks); }

// --- UI HELPERS ---
function initSortable() {
    ['list-completed', 'list-p1', 'list-p2', 'list-p3'].forEach(id => {
        const el = document.getElementById(id);
        if (el.sortable) el.sortable.destroy();
        el.sortable = new Sortable(el, { group: 'shared', animation: 150, handle: '.drag-handle', onEnd: saveOrder });
    });
}

function saveOrder() {
    const newOrder = [];
    ['completed', 'p1', 'p2', 'p3'].forEach(col => {
        Array.from(document.getElementById('list-' + col).children).forEach(card => {
            const t = tasks.find(x => x.id == card.dataset.id);
            if (t) { t.priority = col; newOrder.push(t); }
        });
    });
    // Re-add daily tasks which aren't in sortable columns
    tasks.filter(x => x.type === 'daily').forEach(d => newOrder.push(d));
    tasks = newOrder; sync();
}

function triggerAlerts() {
    const now = new Date().toISOString();
    document.querySelectorAll('.task-card').forEach(c => {
        c.classList.remove('flash-overdue', 'flash-today');
        if (!c.dataset.date || c.parentElement.id === 'list-completed') return;
        if (c.dataset.date < now) c.classList.add('flash-overdue');
    });
}

function startVoice(id) {
    const rec = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    rec.onresult = (e) => document.getElementById(id).value = e.results[0][0].transcript;
    rec.start();
}

function openModal() {
    editingId = null;
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('btn-delete').style.display = 'none';
}
function closeModal() { document.getElementById('modal-overlay').style.display = 'none'; }
function togglePriorityDropdown() {
    document.getElementById('priority-group').style.display = document.getElementById('task-type').value === 'daily' ? 'none' : 'block';
}

function editTask(id) {
    const t = tasks.find(x => x.id === id);
    editingId = id;
    document.getElementById('task-title').value = t.title;
    document.getElementById('task-type').value = t.type;
    document.getElementById('task-priority').value = t.priority;
    document.getElementById('task-datetime').value = t.datetime || '';
    document.getElementById('task-info').value = t.info || '';
    document.getElementById('btn-delete').style.display = 'block';
    togglePriorityDropdown();
    document.getElementById('modal-overlay').style.display = 'flex';
}

setInterval(triggerAlerts, 60000);