/* ============================================================
   QA Engineer Roadmap — Ricardo
   app.js
   ============================================================ */

// ── TAB SWITCHING ──────────────────────────────────────────────
function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  event.target.classList.add('active');
}

// ── SPRINT ACCORDION ───────────────────────────────────────────
function toggleSprint(header) {
  header.parentElement.classList.toggle('open');
}

// ── PROGRESS TRACKER ───────────────────────────────────────────

/**
 * Chronological order — must match the tracker-grid in index.html.
 * To add/remove an item: edit this array AND the matching
 * <div class="tracker-item" id="tr-xxx"> in index.html.
 */
const TRACKER_ITEMS = [
  's1','s2','s3','s4','s5','s6','jira','s7','s8','s9',
  'cypress','istqb','gitlab','job'
];

/**
 * Maps each tracker id → the corresponding timeline block id (id="tl-xxx").
 * When a tracker item is marked done, the matching tl-seg gets .tl-done-check.
 */
const TL_MAP = {
  's1'     : 'tl-s1',
  's2'     : 'tl-s2',
  's3'     : 'tl-s3',
  's4'     : 'tl-s4',
  's5'     : 'tl-s5',
  's6'     : 'tl-s6',
  'jira'   : 'tl-jira',
  's7'     : 'tl-s7',
  's8'     : 'tl-s8',
  's9'     : 'tl-s9',
  'cypress': 'tl-cypress',
  'istqb'  : 'tl-istqb',
  'gitlab' : 'tl-gitlab',
  'job'    : 'tl-job'
};

// ── STATE PERSISTENCE (localStorage) ──────────────────────────
function loadState() {
  try {
    return JSON.parse(localStorage.getItem('qa_roadmap_progress') || '{}');
  } catch (e) { return {}; }
}

function saveState(state) {
  try {
    localStorage.setItem('qa_roadmap_progress', JSON.stringify(state));
  } catch (e) {}
}

// ── UI UPDATE ──────────────────────────────────────────────────
function updateProgress(state) {
  const done  = TRACKER_ITEMS.filter(id => state[id]).length;
  const total = TRACKER_ITEMS.length;
  const pct   = Math.round((done / total) * 100);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-label').textContent =
    done + ' / ' + total + ' concluídos (' + pct + '%)';
}

function applyState(state) {
  TRACKER_ITEMS.forEach(id => {
    // Tracker item
    const item = document.getElementById('tr-' + id);
    if (item) {
      item.classList.toggle('done', !!state[id]);
    }
    // Matching timeline block (if mapped)
    const tlId = TL_MAP[id];
    if (tlId) {
      const seg = document.getElementById(tlId);
      if (seg) seg.classList.toggle('tl-done-check', !!state[id]);
    }
  });
  updateProgress(state);
}

// ── PUBLIC: called by onclick in HTML ─────────────────────────
function toggleTracker(id) {
  const state = loadState();
  state[id] = !state[id];
  saveState(state);
  applyState(state);
}

// ── WEEKLY PLAN TRACKER (Set–Dez 2026) — independent from sprint tracker ──
/**
 * Chronological order — must match the second tracker-grid in index.html
 * (Plano Semanal section). Kept separate from TRACKER_ITEMS/sprints on
 * purpose: different rhythm (weekly, not sprint-based) and different
 * localStorage key so resetting one never resets the other.
 */
const WEEKLY_ITEMS = [
  'w-set1','w-set2','w-set3','w-set4',
  'w-out1','w-out2','w-out3',
  'w-nov1','w-nov2',
  'w-dez1','w-dez2',
  'w-katalon'
];

function loadWeeklyState() {
  try {
    return JSON.parse(localStorage.getItem('qa_roadmap_weekly_progress') || '{}');
  } catch (e) { return {}; }
}

function saveWeeklyState(state) {
  try {
    localStorage.setItem('qa_roadmap_weekly_progress', JSON.stringify(state));
  } catch (e) {}
}

function updateWeeklyProgress(state) {
  const done  = WEEKLY_ITEMS.filter(id => state[id]).length;
  const total = WEEKLY_ITEMS.length;
  const pct   = Math.round((done / total) * 100);
  const fill  = document.getElementById('progress-fill-weekly');
  const label = document.getElementById('progress-label-weekly');
  if (fill)  fill.style.width = pct + '%';
  if (label) label.textContent = done + ' / ' + total + ' concluídos (' + pct + '%)';
}

function applyWeeklyState(state) {
  WEEKLY_ITEMS.forEach(id => {
    const item = document.getElementById('tr-' + id);
    if (item) item.classList.toggle('done', !!state[id]);
  });
  updateWeeklyProgress(state);
}

function toggleWeekly(id) {
  const state = loadWeeklyState();
  state[id] = !state[id];
  saveWeeklyState(state);
  applyWeeklyState(state);
}

// ── INIT ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const state = loadState();
  // Pre-mark S1–S4 as done on first load (already completed)
  ['s1','s2','s3','s4'].forEach(id => {
    if (state[id] === undefined) state[id] = true;
  });
  saveState(state);
  applyState(state);

  applyWeeklyState(loadWeeklyState());
});
