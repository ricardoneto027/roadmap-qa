/* ============================================================
   QA Engineer Roadmap — Ricardo
   app.js
   ============================================================ */

// ── TAB SWITCHING ──────────────────────────────────────────────
function showTab(id) {
  const target = document.getElementById('tab-' + id);
  if (!target) {
    console.warn('showTab: no tab-content found for id "' + id + '"');
    return;
  }
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  target.classList.add('active');
  event.target.classList.add('active');
}

// ── SPRINT ACCORDION ───────────────────────────────────────────
function toggleSprint(header) {
  header.parentElement.classList.toggle('open');
}

// ── DASHBOARD PROGRESS SOURCE ───────────────────────────────────
// The Dashboard's "Automático" progress now reads directly from the
// Career Tracker (CAREER_TRACKER_DATA + qa_roadmap_skills_state) —
// see the "CAREER TRACKER" section below. This replaces the old
// standalone 22-item sprint/milestone tracker, which had no matching
// UI left in index.html (the Bootcamp tab uses static summary cards).

// ── DASHBOARD PROGRESS (hybrid: auto from tracker, manual override) ──
const DASH_OVERRIDE_KEY = 'qa_roadmap_dashboard_override';

function computeAutoProgress() {
  const state = loadSkillsState();
  const allItems = CAREER_TRACKER_DATA.flatMap(flattenPriorityItems);
  const total = allItems.length;
  const done  = allItems.filter(it => isSkillDone(it, state)).length;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  return { done, total, pct };
}

function getDashboardOverride() {
  const raw = localStorage.getItem(DASH_OVERRIDE_KEY);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function setDashboardOverride(pct) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  try { localStorage.setItem(DASH_OVERRIDE_KEY, String(clamped)); } catch (e) {}
  renderDashboardProgress();
}

function resetDashboardProgress() {
  try { localStorage.removeItem(DASH_OVERRIDE_KEY); } catch (e) {}
  renderDashboardProgress();
}

function renderDashboardProgress() {
  const fill    = document.getElementById('dash-progress-fill');
  const handle  = document.getElementById('dash-progress-handle');
  const label   = document.getElementById('dash-progress-label');
  const mode    = document.getElementById('dash-progress-mode');
  const track   = document.getElementById('dash-progress-track');
  const resetBt = document.getElementById('dash-progress-reset');
  if (!fill || !label || !mode) return;

  const auto     = computeAutoProgress();
  const override = getDashboardOverride();
  const isManual = override !== null;
  const pct      = isManual ? override : auto.pct;

  fill.style.width = pct + '%';
  if (handle) handle.style.left = pct + '%';
  if (track)  track.setAttribute('aria-valuenow', String(pct));

  label.textContent = isManual
    ? pct + '% (ajustado manualmente)'
    : auto.done + ' / ' + auto.total + ' concluídos (' + pct + '%)';

  mode.textContent = isManual ? 'Manual' : 'Automático';
  mode.classList.toggle('mode-manual', isManual);
  mode.classList.toggle('mode-auto', !isManual);

  if (resetBt) resetBt.style.display = isManual ? 'inline-block' : 'none';
}

function pctFromPointerEvent(track, e) {
  const rect = track.getBoundingClientRect();
  const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
  const ratio = (clientX - rect.left) / rect.width;
  return ratio * 100;
}

function initDashboardProgressControl() {
  const track = document.getElementById('dash-progress-track');
  if (!track) return;

  let dragging = false;

  track.addEventListener('mousedown', e => {
    dragging = true;
    setDashboardOverride(pctFromPointerEvent(track, e));
  });
  window.addEventListener('mousemove', e => {
    if (dragging) setDashboardOverride(pctFromPointerEvent(track, e));
  });
  window.addEventListener('mouseup', () => { dragging = false; });

  track.addEventListener('touchstart', e => {
    dragging = true;
    setDashboardOverride(pctFromPointerEvent(track, e));
  }, { passive: true });
  track.addEventListener('touchmove', e => {
    if (dragging) setDashboardOverride(pctFromPointerEvent(track, e));
  }, { passive: true });
  track.addEventListener('touchend', () => { dragging = false; });

  track.addEventListener('keydown', e => {
    const current = getDashboardOverride() ?? computeAutoProgress().pct;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp')   { setDashboardOverride(current + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowDown') { setDashboardOverride(current - 1); e.preventDefault(); }
    if (e.key === 'Home') { setDashboardOverride(0); e.preventDefault(); }
    if (e.key === 'End')  { setDashboardOverride(100); e.preventDefault(); }
  });
}

// ── CAREER TRACKER (data-driven: 4 priorities → sections → skills) ──
/**
 * Single source of truth for the whole Career Tracker tab.
 * To add/remove a skill: edit this array only — HTML/CSS never need to change.
 *
 * Priority  = { id, icon, eyebrow, title, mindset, goal?, sections[] }
 * Section   = { title, note?, items[] }  OR  { title, note?, groups: [{label, items[]}] }
 *           OR { title, note?, ongoing: 'text' } for non-checkable recurring items
 * Item      = { id, name, done?, hint?, stars? }
 */
const CAREER_TRACKER_DATA = [
  {
    id: 'p1', icon: '🔴', eyebrow: 'Prioridade 1', title: 'Consolidar Fundamentos',
    mindset: 'Já aprendi isto. Agora quero dominar.',
    goal: 'Transformar as bases do bootcamp em competências sólidas.',
    sections: [
      {
        title: '🧪 QA Manual',
        note: 'Esta seria talvez a competência em que mais investiria. Um excelente QA manual continua a ser um excelente QA mesmo quando automatiza.',
        items: [
          { id: 'qam-test-design',    name: 'Test Design Techniques', done: true },
          { id: 'qam-test-cases',     name: 'Test Cases',             done: true },
          { id: 'qam-checklists',     name: 'Checklists',             done: true },
          { id: 'qam-bug-reports',    name: 'Bug Reports',            done: true },
          { id: 'qam-test-plans',     name: 'Test Plans',             done: true },
          { id: 'qam-req-analysis',   name: 'Análise de requisitos' },
          { id: 'qam-risk-based',     name: 'Risk Based Testing' },
          { id: 'qam-exploratory',    name: 'Testes exploratórios' },
          { id: 'qam-edge-cases',     name: 'Edge Cases' },
          { id: 'qam-test-planning',  name: 'Planeamento de testes' },
          { id: 'qam-prioritization', name: 'Priorização' }
        ]
      },
      {
        title: '📋 Agile',
        note: 'Como já tens certificações, aqui o objetivo passa por perceber como tudo isto funciona no contexto real de uma equipa.',
        items: [
          { id: 'agile-scrum',           name: 'Scrum' },
          { id: 'agile-kanban',          name: 'Kanban' },
          { id: 'agile-ceremonies',      name: 'Cerimónias' },
          { id: 'agile-refinement',      name: 'Refinement' },
          { id: 'agile-sprint-planning', name: 'Sprint Planning' },
          { id: 'agile-retro',           name: 'Retrospectives' }
        ]
      },
      {
        title: '🛠 Ferramentas',
        groups: [
          {
            label: 'Plataformas',
            items: [
              { id: 'tool-jira',       name: 'Jira', hint: 'aprofundar workflows, filtros, dashboards' },
              { id: 'tool-confluence', name: 'Confluence', hint: 'documentação' },
              { id: 'tool-github',     name: 'GitHub' }
            ]
          },
          {
            label: 'Git',
            items: [
              { id: 'tool-git',           name: 'Git' },
              { id: 'tool-git-branches',  name: 'Branches' },
              { id: 'tool-git-pr',        name: 'Pull Requests' },
              { id: 'tool-git-merge',     name: 'Merge' },
              { id: 'tool-git-conflicts', name: 'Resolução de conflitos' },
              { id: 'tool-git-flow',      name: 'Git Flow' }
            ]
          }
        ]
      },
      {
        title: '🌐 APIs',
        note: 'Já tens uma boa base. Agora aprofundar:',
        items: [
          { id: 'api-auth',         name: 'Authentication' },
          { id: 'api-tokens',       name: 'Tokens' },
          { id: 'api-variables',    name: 'Variables' },
          { id: 'api-collections',  name: 'Collections' },
          { id: 'api-newman',       name: 'Newman' },
          { id: 'api-postman-auto', name: 'Testes automatizados no Postman' }
        ]
      },
      {
        title: '🗄 SQL',
        note: 'Continuaria exatamente como estás a fazer, e depois passaria para queries mais realistas.',
        groups: [
          {
            label: 'Fundamentos',
            items: [
              { id: 'sql-sqlbolt',    name: 'SQLBolt' },
              { id: 'sql-sqlzoo',     name: 'SQLZoo' },
              { id: 'sql-exercicios', name: 'Exercícios' }
            ]
          },
          {
            label: 'Queries Avançadas',
            items: [
              { id: 'sql-joins',      name: 'JOINs complexos' },
              { id: 'sql-subqueries', name: 'Subqueries' },
              { id: 'sql-having',     name: 'HAVING' },
              { id: 'sql-case',       name: 'CASE' },
              { id: 'sql-window',     name: 'Window Functions', hint: 'mais tarde' }
            ]
          }
        ]
      },
      {
        title: '🤖 Selenium + Python',
        note: 'Maior potencial de crescimento — não apenas comandos novos, mas organização, código limpo, reutilização e estrutura.',
        groups: [
          {
            label: 'Selenium',
            items: [
              { id: 'sel-organizacao',    name: 'Organização' },
              { id: 'sel-codigo-limpo',   name: 'Código limpo' },
              { id: 'sel-reutilizacao',   name: 'Reutilização' },
              { id: 'sel-estrutura',      name: 'Estrutura' },
              { id: 'sel-framework',      name: 'Framework' },
              { id: 'sel-debugging',      name: 'Debugging' },
              { id: 'sel-esperas',        name: 'Esperas' },
              { id: 'sel-fixtures',       name: 'Fixtures' },
              { id: 'sel-parametrizacao', name: 'Parametrização' },
              { id: 'sel-logs',           name: 'Logs' }
            ]
          },
          {
            label: 'Python',
            items: [
              { id: 'py-funcoes',    name: 'Funções' },
              { id: 'py-classes',    name: 'Classes' },
              { id: 'py-exceptions', name: 'Exceptions' },
              { id: 'py-list-comp',  name: 'List comprehensions' },
              { id: 'py-ficheiros',  name: 'Ficheiros' },
              { id: 'py-modulos',    name: 'Módulos' }
            ]
          }
        ]
      },
      {
        title: '💼 Portfolio',
        ongoing: 'Isto nunca termina. Sempre que aprenderes algo novo → novo projeto.'
      }
    ]
  },
  {
    id: 'p2', icon: '🟠', eyebrow: 'Prioridade 2', title: 'Diferenciação',
    mindset: 'Quero destacar-me dos outros candidatos.',
    sections: [
      {
        title: '🏅 Certificações',
        note: 'A ISTQB continua a ter mais peso no mercado europeu. A Katalon acrescenta valor por mostrar contacto com outra plataforma de automação e organização de testes.',
        items: [
          { id: 'cert-istqb',     name: 'ISTQB CTFL', stars: 5 },
          { id: 'cert-atlassian', name: 'Atlassian', hint: 'continuar apenas se fizer sentido' },
          { id: 'cert-katalon',   name: 'Katalon Practitioner', stars: 4 }
        ]
      },
      {
        title: '⚙️ CI/CD',
        note: 'Prioridade muito alta — cada vez mais empresas pedem isto, mesmo para juniores.',
        items: [
          { id: 'cicd-github-actions', name: 'GitHub Actions' },
          { id: 'cicd-jenkins',        name: 'Jenkins' },
          { id: 'cicd-azure-devops',   name: 'Azure DevOps' },
          { id: 'cicd-bitbucket',      name: 'Bitbucket' },
          { id: 'cicd-gitlab',         name: 'GitLab CI/CD' }
        ]
      },
      {
        title: '🐳 Docker',
        note: 'Competência pequena de aprender, associada frequentemente a CI/CD.',
        items: [
          { id: 'docker-basics', name: 'Docker' }
        ]
      }
    ]
  },
  {
    id: 'p3', icon: '🟢', eyebrow: 'Prioridade 3', title: 'Especialização',
    mindset: 'Quero tornar-me um Automation QA mais completo.',
    sections: [
      {
        title: '🚀 Automação Moderna',
        groups: [
          {
            label: 'Frameworks',
            items: [
              { id: 'auto-playwright', name: 'Playwright' },
              { id: 'auto-cypress',    name: 'Cypress' },
              { id: 'auto-robot',      name: 'Robot Framework', hint: 'opcional' },
              { id: 'auto-mobile',     name: 'Mobile' }
            ]
          },
          {
            label: 'Linguagens Adicionais',
            items: [
              { id: 'lang-javascript', name: 'JavaScript', hint: 'pré-requisito para Cypress' },
              { id: 'lang-java',       name: 'Java', hint: 'comum em automação enterprise/banking' },
              { id: 'lang-csharp',     name: 'C#', hint: 'stack .NET' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'p4', icon: '🔵', eyebrow: 'Prioridade 4', title: 'Longo Prazo',
    mindset: 'Quero preparar a evolução para um perfil mais sénior.',
    sections: [
      {
        title: '🔭 Competências de Longo Prazo',
        items: [
          { id: 'lp-katalon',     name: 'Katalon', hint: 'se ainda não tiveres feito, ou aprofundamento' },
          { id: 'lp-jmeter',      name: 'JMeter' },
          { id: 'lp-appium',      name: 'Appium' },
          { id: 'lp-cloud',       name: 'Cloud (AWS / Azure)' },
          { id: 'lp-performance', name: 'Performance Testing' },
          { id: 'lp-security',    name: 'Security Testing', hint: 'bases' },
          { id: 'lp-ai-qa',       name: 'IA aplicada a QA' }
        ]
      }
    ]
  }
];

const SKILLS_STATE_KEY = 'qa_roadmap_skills_state';

function loadSkillsState() {
  try { return JSON.parse(localStorage.getItem(SKILLS_STATE_KEY) || '{}'); }
  catch (e) { return {}; }
}

function saveSkillsState(state) {
  try { localStorage.setItem(SKILLS_STATE_KEY, JSON.stringify(state)); } catch (e) {}
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function starString(n) {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
}

// Merges an item's saved state with its default `done` value (first load only)
function isSkillDone(item, state) {
  if (Object.prototype.hasOwnProperty.call(state, item.id)) return !!state[item.id];
  return !!item.done;
}

function flattenSectionItems(section) {
  if (section.items) return section.items;
  if (section.groups) return section.groups.flatMap(g => g.items);
  return [];
}

function flattenPriorityItems(priority) {
  return priority.sections.flatMap(flattenSectionItems);
}

function renderSkillChip(item, state) {
  const done  = isSkillDone(item, state);
  const stars = item.stars ? ' <span class="skill-stars">' + starString(item.stars) + '</span>' : '';
  const hint  = item.hint ? ' <span class="skill-chip-hint">(' + escapeHtml(item.hint) + ')</span>' : '';
  return '<button type="button" class="skill-chip' + (done ? ' done' : '') + '" data-skill-id="' + item.id + '">'
    + '<span class="skill-chip-check">' + (done ? '✓' : '') + '</span>'
    + '<span class="skill-chip-name">' + escapeHtml(item.name) + stars + hint + '</span>'
    + '</button>';
}

function renderSkillSection(section, state) {
  let body = '';
  if (section.note) body += '<div class="skill-note">' + escapeHtml(section.note) + '</div>';

  if (section.groups) {
    section.groups.forEach(g => {
      body += '<div class="skill-group-label">' + escapeHtml(g.label) + '</div>';
      body += '<div class="skill-chips">' + g.items.map(it => renderSkillChip(it, state)).join('') + '</div>';
    });
  } else if (section.items) {
    body += '<div class="skill-chips">' + section.items.map(it => renderSkillChip(it, state)).join('') + '</div>';
  } else if (section.ongoing) {
    body += '<div class="skill-ongoing">🔄 ' + escapeHtml(section.ongoing) + '</div>';
  }

  return '<div class="skill-section"><div class="skill-section-title">' + escapeHtml(section.title) + '</div>' + body + '</div>';
}

function priorityProgress(priority, state) {
  const items = flattenPriorityItems(priority);
  const total = items.length;
  const done  = items.filter(it => isSkillDone(it, state)).length;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  return { done, total, pct };
}

function renderPriorityBlock(priority, state, openByDefault) {
  const { done, total, pct } = priorityProgress(priority, state);
  const sectionsHtml = priority.sections.map(s => renderSkillSection(s, state)).join('');

  return '<div class="priority-block priority-' + priority.id + (openByDefault ? ' open' : '') + '" data-priority-id="' + priority.id + '">'
    + '<button type="button" class="priority-header">'
    +   '<div class="priority-header-main">'
    +     '<span class="priority-icon">' + priority.icon + '</span>'
    +     '<div>'
    +       '<div class="priority-eyebrow">' + escapeHtml(priority.eyebrow) + '</div>'
    +       '<div class="priority-title">' + escapeHtml(priority.title) + '</div>'
    +       '<div class="priority-mindset">"' + escapeHtml(priority.mindset) + '"</div>'
    +     '</div>'
    +   '</div>'
    +   '<span class="priority-chevron">▾</span>'
    + '</button>'
    + '<div class="priority-progress-row">'
    +   '<div class="progress-bar-track priority-progress-track"><div class="progress-bar-fill priority-progress-fill" style="width:' + pct + '%"></div></div>'
    +   '<span class="priority-progress-label">' + done + '/' + total + ' · ' + pct + '%' + (pct === 100 ? ' 🏆' : '') + '</span>'
    + '</div>'
    + '<div class="priority-body">'
    +   (priority.goal ? '<div class="priority-goal"><strong>Objetivo:</strong> ' + escapeHtml(priority.goal) + '</div>' : '')
    +   sectionsHtml
    + '</div>'
    + '</div>';
}

// Builds the whole tracker DOM once from data + saved state.
function renderCareerTracker() {
  const root = document.getElementById('career-tracker-root');
  if (!root) return;
  const state = loadSkillsState();

  const allItems = CAREER_TRACKER_DATA.flatMap(flattenPriorityItems);
  const totalAll = allItems.length;
  const doneAll   = allItems.filter(it => isSkillDone(it, state)).length;
  const pctAll    = totalAll ? Math.round((doneAll / totalAll) * 100) : 0;

  const summary = '<div class="tracker-summary">'
    + '<div class="tracker-summary-label">Progresso Geral do Career Tracker</div>'
    + '<div class="progress-bar-wrap">'
    +   '<div class="progress-bar-track"><div class="progress-bar-fill"></div></div>'
    +   '<span class="progress-label"></span>'
    + '</div></div>';

  root.innerHTML = summary + CAREER_TRACKER_DATA
    .map((p, i) => renderPriorityBlock(p, state, i === 0))
    .join('');

  updateAllProgressBars(state);
}

// Lightweight targeted updates — never rebuild innerHTML on toggle,
// so open/closed accordion state is preserved.
function updateAllProgressBars(state) {
  CAREER_TRACKER_DATA.forEach(priority => {
    const { done, total, pct } = priorityProgress(priority, state);
    const block = document.querySelector('.priority-block[data-priority-id="' + priority.id + '"]');
    if (!block) return;
    const fill  = block.querySelector('.priority-progress-fill');
    const label = block.querySelector('.priority-progress-label');
    if (fill)  fill.style.width = pct + '%';
    if (label) label.textContent = done + '/' + total + ' · ' + pct + '%' + (pct === 100 ? ' 🏆' : '');
  });

  const allItems = CAREER_TRACKER_DATA.flatMap(flattenPriorityItems);
  const totalAll = allItems.length;
  const doneAll  = allItems.filter(it => isSkillDone(it, state)).length;
  const pctAll   = totalAll ? Math.round((doneAll / totalAll) * 100) : 0;

  const summaryFill  = document.querySelector('.tracker-summary .progress-bar-fill');
  const summaryLabel = document.querySelector('.tracker-summary .progress-label');
  if (summaryFill)  summaryFill.style.width = pctAll + '%';
  if (summaryLabel) summaryLabel.textContent = doneAll + ' / ' + totalAll + ' competências (' + pctAll + '%)';
}

function toggleSkill(id) {
  const state = loadSkillsState();
  const item  = CAREER_TRACKER_DATA.flatMap(flattenPriorityItems).find(it => it.id === id);
  const current = item ? isSkillDone(item, state) : !!state[id];
  state[id] = !current;
  saveSkillsState(state);

  const chip = document.querySelector('.skill-chip[data-skill-id="' + id + '"]');
  if (chip) {
    chip.classList.toggle('done', state[id]);
    const check = chip.querySelector('.skill-chip-check');
    if (check) check.textContent = state[id] ? '✓' : '';
  }
  updateAllProgressBars(state);
  renderDashboardProgress();
}

function initCareerTracker() {
  const root = document.getElementById('career-tracker-root');
  if (!root) return;
  renderCareerTracker();

  root.addEventListener('click', e => {
    const chip = e.target.closest('.skill-chip');
    if (chip) { toggleSkill(chip.dataset.skillId); return; }
    const header = e.target.closest('.priority-header');
    if (header) header.closest('.priority-block').classList.toggle('open');
  });
}

// ── CERTIFICATIONS (data-driven: 4 status groups → cards) ──────
/**
 * Single source of truth for the Certifications tab.
 * To add/remove a certification: edit this array only.
 *
 * Group = { id, icon, title, color, items[] }
 * Item  = { id, name, when, cost, priority?: {tier, label}, hint?, official?: {url,label}, resource?: {url,label} }
 */
const CERTIFICATIONS_DATA = [
  {
    id: 'obtidas', icon: '✅', title: 'Obtidas', color: 'green',
    items: [
      { id: 'cert-atlassian-agile', name: 'Atlassian Agile Fundamentals', when: 'Concluída · Mai 2026', cost: 'Grátis',
        official: { url: 'https://university.atlassian.com', label: 'Atlassian University' } },
      { id: 'cert-scrum', name: 'Scrum Fundamentals', when: 'Concluída · Mai 2026', cost: 'Grátis',
        official: { url: 'https://university.atlassian.com', label: 'Atlassian University' } },
      { id: 'cert-kanban', name: 'Kanban Fundamentals', when: 'Concluída · Mai 2026', cost: 'Grátis',
        official: { url: 'https://university.atlassian.com', label: 'Atlassian University' } },
      { id: 'cert-jira-fund', name: 'Jira Fundamentals', when: 'Concluída · Mai 2026', cost: 'Grátis',
        official: { url: 'https://university.atlassian.com', label: 'Atlassian University' } },
      { id: 'cert-confluence-fund', name: 'Confluence Fundamentals', when: 'Concluída · Mai 2026', cost: 'Grátis',
        official: { url: 'https://university.atlassian.com', label: 'Atlassian University' } }
    ]
  },
  {
    id: 'em-preparacao', icon: '🎯', title: 'Em Preparação', color: 'amber',
    items: [
      { id: 'cert-istqb', name: 'ISTQB Foundation Level (CTFL)',
        when: 'Estudo: Ago–Out 2026 (Fase 2 · PAC) · Exame: Nov 2026',
        cost: '~€200 (exame)', priority: { tier: 1, label: '★★★ MÁXIMA' },
        hint: 'Exame em Portugal via ANPG ou GASQ. A certificação mais reconhecida em QA globalmente.',
        official: { url: 'https://www.istqb.org/certifications/certified-tester-foundation-level', label: 'istqb.org' },
        resource: { url: 'https://www.istqb.org/', label: 'Syllabus & mock exams' } }
    ]
  },
  {
    id: 'planeadas', icon: '📚', title: 'Planeadas', color: 'blue',
    items: [
      { id: 'cert-github-actions', name: 'GitHub Actions (GH-200)',
        when: '2027 · Fase 5 — Diferenciação', cost: '~$99 (varia por região)',
        priority: { tier: 2, label: '★★ ALTA' },
        hint: 'Cada vez mais pedido mesmo para juniores.',
        official: { url: 'https://docs.github.com/en/get-started/showcase-your-expertise-with-github-certifications/about-github-certifications', label: 'GitHub Certifications' },
        resource: { url: 'https://skills.github.com', label: 'GitHub Skills (grátis)' } },
      { id: 'cert-jenkins', name: 'Jenkins — Certified Jenkins Engineer (CJE)',
        when: '2027 · Fase 5 — Diferenciação', cost: 'Preço variável — confirmar no registo',
        priority: { tier: 2, label: '★★ ALTA' },
        hint: 'Confirmar disponibilidade atual do exame junto da CloudBees University.',
        official: { url: 'https://university.cloudbees.com/path/jenkins-community-training-certification/jenkins-cje-cert-info', label: 'CloudBees University' },
        resource: { url: 'https://www.cloudbees.com/cloudbees-university/training-certifications/jenkins', label: 'Cursos gratuitos' } },
      { id: 'cert-azure-devops', name: 'Azure DevOps',
        when: '2027 · Fase 5 — Diferenciação', cost: 'Grátis (Microsoft Learn)',
        priority: { tier: 2, label: '★★ ALTA' },
        hint: 'Sem exame de entrada dedicado — o caminho formal seguinte é o AZ-400 (avançado).',
        official: { url: 'https://learn.microsoft.com/en-us/credentials/certifications/devops-engineer/', label: 'AZ-400 (avançado)' },
        resource: { url: 'https://learn.microsoft.com/en-us/training/browse/?products=azure-devops', label: 'Microsoft Learn (grátis)' } },
      { id: 'cert-docker', name: 'Docker',
        when: '2027 · Fase 5 — Diferenciação', cost: 'Grátis (documentação)',
        priority: { tier: 2, label: '★★ ALTA' },
        hint: 'Sem certificação pessoal "oficial" única — foca-te no essencial via Docker Docs.',
        official: { url: 'https://docs.docker.com/', label: 'Docker Docs' },
        resource: { url: 'https://docs.docker.com/get-started/', label: 'Get Started (grátis)' } },
      { id: 'cert-katalon', name: 'Katalon Practitioner',
        when: '2027 · Fase 5 — Diferenciação', cost: 'Grátis',
        priority: { tier: 2, label: '★★ ALTA' },
        hint: 'Mencionado explicitamente em vagas PT. Cert rápida de obter, bom retorno.',
        official: { url: 'https://academy.katalon.com/certifications/practitioner/', label: 'Katalon Academy' },
        resource: { url: 'https://academy.katalon.com/learning-path/practitioner-certification-fast-track/', label: 'Fast track (grátis)' } }
    ]
  },
  {
    id: 'futuras', icon: '⭐', title: 'Futuras', color: 'purple',
    items: [
      { id: 'cert-playwright', name: 'Playwright',
        when: '2027–2028 · Fase 6 — Especialização', cost: 'Grátis (curso)',
        priority: { tier: 3, label: '★ FUTURA' },
        hint: 'Sem certificação oficial do vendor — foca-te no curso + projeto de portfolio.',
        official: { url: 'https://playwright.dev/', label: 'playwright.dev' },
        resource: { url: 'https://testautomationu.applitools.com/', label: 'Test Automation University (grátis)' } },
      { id: 'cert-cypress', name: 'Cypress',
        when: '2027–2028 · Fase 6 — Especialização', cost: 'Grátis (curso)',
        priority: { tier: 3, label: '★ FUTURA' },
        hint: 'Sem certificação oficial do vendor — foca-te no curso + projeto de portfolio.',
        official: { url: 'https://www.cypress.io/', label: 'cypress.io' },
        resource: { url: 'https://testautomationu.applitools.com/', label: 'Test Automation University (grátis)' } },
      { id: 'cert-aws', name: 'AWS Certified Cloud Practitioner',
        when: 'Fase 7 — Longo Prazo', cost: '~$100 (exame)',
        priority: { tier: 3, label: '★ FUTURA' },
        official: { url: 'https://aws.amazon.com/certification/certified-cloud-practitioner/', label: 'aws.amazon.com' },
        resource: { url: 'https://skillbuilder.aws/', label: 'AWS Skill Builder (grátis)' } },
      { id: 'cert-azure-fund', name: 'Microsoft Azure Fundamentals (AZ-900)',
        when: 'Fase 7 — Longo Prazo', cost: '~€99–165 (varia por região)',
        priority: { tier: 3, label: '★ FUTURA' },
        official: { url: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/', label: 'Microsoft Learn' },
        resource: { url: 'https://learn.microsoft.com/en-us/training/paths/azure-fundamentals/', label: 'Training path (grátis)' } }
    ]
  }
];

function renderCertLinkBtn(link) {
  if (!link) return '';
  return '<a class="cert-link-btn" href="' + link.url + '" target="_blank" rel="noopener">' + escapeHtml(link.label) + ' ↗</a>';
}

// ── Category overrides (drag-and-drop) ──────────────────────────
// Dragging a card between groups doesn't edit CERTIFICATIONS_DATA —
// it just records { certId: newGroupId } here. This keeps the data
// array as the single source of truth for adding new certifications.
const CERT_OVERRIDES_KEY = 'qa_roadmap_cert_overrides';

function loadCertOverrides() {
  try { return JSON.parse(localStorage.getItem(CERT_OVERRIDES_KEY) || '{}'); }
  catch (e) { return {}; }
}

function saveCertOverrides(overrides) {
  try { localStorage.setItem(CERT_OVERRIDES_KEY, JSON.stringify(overrides)); } catch (e) {}
}

// Regroups every certification by its EFFECTIVE group (override, if any,
// otherwise its original group in CERTIFICATIONS_DATA), while keeping the
// group order/icon/title/color exactly as defined in the data array.
function getEffectiveCertGroups() {
  const overrides = loadCertOverrides();
  const buckets = {};
  CERTIFICATIONS_DATA.forEach(g => {
    buckets[g.id] = { id: g.id, icon: g.icon, title: g.title, color: g.color, entries: [] };
  });

  CERTIFICATIONS_DATA.forEach(g => {
    g.items.forEach(item => {
      const effectiveId = (overrides[item.id] && buckets[overrides[item.id]]) ? overrides[item.id] : g.id;
      buckets[effectiveId].entries.push({ item: item, originalGroupId: g.id, isOverridden: effectiveId !== g.id });
    });
  });

  return CERTIFICATIONS_DATA.map(g => buckets[g.id]);
}

function moveCertToGroup(certId, newGroupId) {
  const overrides = loadCertOverrides();
  let originalGroupId = null;
  CERTIFICATIONS_DATA.forEach(g => g.items.forEach(it => { if (it.id === certId) originalGroupId = g.id; }));
  if (newGroupId === originalGroupId) {
    delete overrides[certId]; // dropped back where it started -> no longer an override
  } else {
    overrides[certId] = newGroupId;
  }
  saveCertOverrides(overrides);
  renderCertifications();
}

function renderCertCard(entry, effectiveGroupId) {
  const item = entry.item;
  const priority = effectiveGroupId === 'obtidas'
    ? '<span class="cert-done-tag">Concluída</span>'
    : (item.priority
        ? '<span class="pri-' + item.priority.tier + '">' + escapeHtml(item.priority.label) + '</span>'
        : '<span class="cert-done-tag">Concluída</span>');

  const resetBtn = entry.isOverridden
    ? '<button type="button" class="cert-reset-override" data-cert-id="' + item.id + '" title="Repor categoria original">↺</button>'
    : '';

  const hint = item.hint ? '<div class="cert-card-hint">' + escapeHtml(item.hint) + '</div>' : '';
  const officialBtn = renderCertLinkBtn(item.official ? { url: item.official.url, label: '🔗 ' + item.official.label } : null);
  const resourceBtn  = renderCertLinkBtn(item.resource ? { url: item.resource.url, label: '📚 ' + item.resource.label } : null);

  return '<div class="cert-card" draggable="true" data-cert-id="' + item.id + '">'
    + '<div class="cert-card-top"><span class="cert-card-name">' + escapeHtml(item.name) + '</span>' + priority + resetBtn + '</div>'
    + '<div class="cert-card-meta">' + escapeHtml(item.when) + ' · ' + escapeHtml(item.cost) + '</div>'
    + hint
    + ((officialBtn || resourceBtn) ? '<div class="cert-card-actions">' + officialBtn + resourceBtn + '</div>' : '')
    + '</div>';
}

function renderCertGroup(group) {
  const cards = group.entries.map(entry => renderCertCard(entry, group.id)).join('');
  return '<div class="cert-group cert-group-' + group.color + '" data-group-id="' + group.id + '">'
    + '<div class="cert-group-header">'
    +   '<span class="cert-group-icon">' + group.icon + '</span>'
    +   '<span class="cert-group-title">' + escapeHtml(group.title) + '</span>'
    +   '<span class="cert-group-count">' + group.entries.length + '</span>'
    + '</div>'
    + '<div class="cert-cards">' + cards + '</div>'
    + '</div>';
}

function renderCertifications() {
  const root = document.getElementById('certifications-root');
  if (!root) return;
  root.innerHTML = getEffectiveCertGroups().map(renderCertGroup).join('');
}

function initCertifications() {
  const root = document.getElementById('certifications-root');
  if (!root) return;
  renderCertifications();

  root.addEventListener('dragstart', e => {
    const card = e.target.closest('.cert-card');
    if (!card) return;
    e.dataTransfer.setData('text/plain', card.dataset.certId);
    e.dataTransfer.effectAllowed = 'move';
    card.classList.add('dragging');
  });

  root.addEventListener('dragend', e => {
    const card = e.target.closest('.cert-card');
    if (card) card.classList.remove('dragging');
  });

  root.addEventListener('dragover', e => {
    const cardsWrap = e.target.closest('.cert-cards');
    if (!cardsWrap) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    cardsWrap.classList.add('drag-over');
  });

  root.addEventListener('dragleave', e => {
    const cardsWrap = e.target.closest('.cert-cards');
    if (cardsWrap && !cardsWrap.contains(e.relatedTarget)) cardsWrap.classList.remove('drag-over');
  });

  root.addEventListener('drop', e => {
    const cardsWrap = e.target.closest('.cert-cards');
    if (!cardsWrap) return;
    e.preventDefault();
    cardsWrap.classList.remove('drag-over');
    const certId = e.dataTransfer.getData('text/plain');
    const newGroupId = cardsWrap.closest('.cert-group').dataset.groupId;
    if (certId && newGroupId) moveCertToGroup(certId, newGroupId);
  });

  root.addEventListener('click', e => {
    const resetBtn = e.target.closest('.cert-reset-override');
    if (!resetBtn) return;
    const overrides = loadCertOverrides();
    delete overrides[resetBtn.dataset.certId];
    saveCertOverrides(overrides);
    renderCertifications();
  });
}

// ── LEARNING HUB (data-driven: 6 categories → platform cards) ──
/**
 * Single source of truth for the Learning Hub tab.
 * To add/remove a platform: edit this array only.
 *
 * Category = { id, icon, title, items[] }
 * Item     = { name, url, desc, objetivo, priority: {tier,label}, tag }
 */
const LEARNING_HUB_DATA = [
  {
    id: 'aprender', icon: '📚', title: 'Aprender',
    items: [
      { name: 'TripleTen', url: 'https://tripleten.com/', tag: 'Programa atual',
        desc: 'A plataforma do teu bootcamp — sprints, projetos e revisores.',
        objetivo: 'Concluir o Sprint 9 e o projeto final.',
        priority: { tier: 1, label: '★★★ MÁXIMA' } },
      { name: 'Test Automation University', url: 'https://testautomationu.applitools.com/', tag: 'Cert. grátis',
        desc: 'Cursos gratuitos de Selenium, Cypress, Appium, API testing e Pytest, com certificado por curso.',
        objetivo: 'Aprofundar Selenium + Python e preparar Cypress/Playwright.',
        priority: { tier: 1, label: '★★★ MÁXIMA' } },
      { name: 'Atlassian University', url: 'https://university.atlassian.com', tag: 'Grátis',
        desc: 'Badges de Jira, Confluence, Scrum e Kanban — as que já obtiveste.',
        objetivo: 'Rever workflows e dashboards mais avançados de Jira.',
        priority: { tier: 2, label: '★★ ALTA' } },
      { name: 'Katalon Academy', url: 'https://academy.katalon.com/', tag: 'Grátis',
        desc: 'Cursos e a certificação Katalon Practitioner.',
        objetivo: 'Obter a certificação Katalon Practitioner (Fase 5).',
        priority: { tier: 2, label: '★★ ALTA' } },
      { name: 'Microsoft Learn', url: 'https://learn.microsoft.com/en-us/training/', tag: 'Grátis',
        desc: 'Percursos de aprendizagem gratuitos para Azure DevOps e Azure Fundamentals (AZ-900).',
        objetivo: 'Base para Azure DevOps e Cloud (Fase 5–7).',
        priority: { tier: 3, label: '★ FUTURA' } }
    ]
  },
  {
    id: 'qa-manual', icon: '🧪', title: 'Praticar QA Manual',
    items: [
      { name: 'SauceDemo', url: 'https://www.saucedemo.com/', tag: 'Grátis',
        desc: 'App e-commerce feita para testes — login, produtos, carrinho, checkout.',
        objetivo: 'Test cases, bug reports e base para automação Selenium.',
        priority: { tier: 1, label: '★★★ MÁXIMA' } },
      { name: 'Practice Test Automation', url: 'https://practicetestautomation.com/', tag: 'Grátis',
        desc: 'Site dedicado a exercícios de automação com cenários e soluções guiadas.',
        objetivo: 'Praticar test design e primeiros scripts de automação.',
        priority: { tier: 1, label: '★★★ MÁXIMA' } },
      { name: 'OrangeHRM Demo', url: 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login', tag: 'Grátis',
        desc: 'Sistema de RH real — registo, login, gestão de empregados.',
        objetivo: 'Testes de formulários, validações e permissões de utilizador.',
        priority: { tier: 2, label: '★★ ALTA' } },
      { name: 'Guru99', url: 'https://www.guru99.com/software-testing.html', tag: 'Grátis',
        desc: 'Tutoriais extensos de QA Manual, SQL, Selenium e mais — bom para consulta rápida.',
        objetivo: 'Consolidar teoria de Test Design Techniques e Risk Based Testing.',
        priority: { tier: 2, label: '★★ ALTA' } },
      { name: 'OpenCart Demo', url: 'https://demo.opencart.com/', tag: 'Grátis',
        desc: 'Loja online real, com área de utilizador e de administração.',
        objetivo: 'Fluxos completos: registo, compra, gestão de produtos.',
        priority: { tier: 3, label: '★ FUTURA' } }
    ]
  },
  {
    id: 'apis', icon: '🌐', title: 'Praticar APIs',
    items: [
      { name: 'JSONPlaceholder', url: 'https://jsonplaceholder.typicode.com/', tag: 'Grátis',
        desc: 'API fake de posts, comentários e utilizadores — GET, POST, PUT, DELETE.',
        objetivo: 'Coleções Postman básicas com assertions.',
        priority: { tier: 1, label: '★★★ MÁXIMA' } },
      { name: 'Swagger Petstore', url: 'https://petstore.swagger.io/', tag: 'Grátis',
        desc: 'API com documentação Swagger integrada — testa na UI ou via Postman.',
        objetivo: 'Autenticação e CRUD completo.',
        priority: { tier: 1, label: '★★★ MÁXIMA' } },
      { name: 'Restful Booker', url: 'https://restful-booker.herokuapp.com/apidoc/index.html', tag: 'Grátis',
        desc: 'API completa de reservas com autenticação.',
        objetivo: 'Coleção completa: auth, CRUD, testes negativos, assertions.',
        priority: { tier: 2, label: '★★ ALTA' } },
      { name: 'ReqRes', url: 'https://reqres.in/', tag: 'Grátis',
        desc: 'API de teste com respostas realistas e paginação.',
        objetivo: 'Praticar variáveis, collections e testes automatizados no Postman.',
        priority: { tier: 2, label: '★★ ALTA' } },
      { name: 'Postman Echo', url: 'https://postman-echo.com/', tag: 'Grátis',
        desc: 'Serviço oficial da Postman para testar requests, headers e autenticação.',
        objetivo: 'Explorar Authentication e Tokens na prática.',
        priority: { tier: 2, label: '★★ ALTA' } }
    ]
  },
  {
    id: 'sql', icon: '🗄️', title: 'Praticar SQL',
    items: [
      { name: 'SQLBolt', url: 'https://sqlbolt.com/', tag: 'Grátis',
        desc: 'Tutorial visual e interativo — o ponto de partida mais simples.',
        objetivo: 'Consolidar SELECT, WHERE, JOINs básicos.',
        priority: { tier: 1, label: '★★★ MÁXIMA' } },
      { name: 'SQLZoo', url: 'https://sqlzoo.net/wiki/SQL_Tutorial', tag: 'Grátis',
        desc: 'Exercícios interativos no browser, sem instalação.',
        objetivo: 'JOINs, subqueries e agregações mais complexas.',
        priority: { tier: 1, label: '★★★ MÁXIMA' } },
      { name: 'HackerRank SQL', url: 'https://www.hackerrank.com/domains/sql', tag: 'Grátis',
        desc: 'Desafios de SQL com níveis de dificuldade crescente.',
        objetivo: 'HAVING, CASE e queries mais realistas.',
        priority: { tier: 2, label: '★★ ALTA' } },
      { name: 'LeetCode SQL', url: 'https://leetcode.com/problemset/database/', tag: 'Grátis',
        desc: 'Problemas de base de dados usados em entrevistas técnicas.',
        objetivo: 'Window Functions e preparação para entrevistas.',
        priority: { tier: 3, label: '★ FUTURA' } }
    ]
  },
  {
    id: 'python-auto', icon: '🤖', title: 'Praticar Python & Automação',
    items: [
      { name: 'The Internet (Herokuapp)', url: 'https://the-internet.herokuapp.com/', tag: 'Grátis',
        desc: 'Coleção de challenges de automação: login, alerts, drag-and-drop, iframes, shadow DOM.',
        objetivo: 'Praticar esperas, locators e debugging em cenários variados.',
        priority: { tier: 1, label: '★★★ MÁXIMA' } },
      { name: 'Selenium Playground', url: 'https://seleniumplayground.netlify.app/', tag: 'Grátis',
        desc: 'Site dedicado à prática de scraping e interação com Selenium.',
        objetivo: 'Reutilização, estrutura e organização de scripts.',
        priority: { tier: 1, label: '★★★ MÁXIMA' } },
      { name: 'Exercism', url: 'https://exercism.org/', tag: 'Grátis',
        desc: 'Exercícios de Python com mentor humano gratuito.',
        objetivo: 'Funções, classes, exceptions, list comprehensions.',
        priority: { tier: 2, label: '★★ ALTA' } },
      { name: 'HackerRank Python', url: 'https://www.hackerrank.com/domains/python', tag: 'Grátis',
        desc: 'Desafios de Python organizados por tópico e dificuldade.',
        objetivo: 'Consolidar fundamentos antes de escalar para frameworks novos.',
        priority: { tier: 2, label: '★★ ALTA' } },
      { name: 'Codewars', url: 'https://www.codewars.com/', tag: 'Grátis',
        desc: 'Kata de programação com comunidade ativa e várias linguagens.',
        objetivo: 'Manter prática regular de lógica e Python geral.',
        priority: { tier: 3, label: '★ FUTURA' } }
    ]
  },
  {
    id: 'emprego', icon: '💼', title: 'Emprego',
    items: [
      { name: 'PAC — TripleTen', url: 'https://tripleten.com/', tag: 'Programa atual',
        desc: 'O teu Career Acceleration Program — coach dedicado, candidaturas e mock interviews.',
        objetivo: 'Cumprir a quota semanal de candidaturas (Fase 2).',
        priority: { tier: 1, label: '★★★ MÁXIMA' } },
      { name: 'LinkedIn Jobs', url: 'https://www.linkedin.com/jobs/', tag: 'Grátis',
        desc: 'A rede mais usada para recrutamento tech em Portugal.',
        objetivo: 'Candidaturas + networking com QAs portugueses.',
        priority: { tier: 1, label: '★★★ MÁXIMA' } },
      { name: 'Landing.Jobs', url: 'https://landing.jobs/', tag: 'Grátis',
        desc: 'A maior plataforma de emprego tech em Portugal.',
        objetivo: 'Vagas QA locais e remotas.',
        priority: { tier: 1, label: '★★★ MÁXIMA' } },
      { name: 'ITJobs', url: 'https://www.itjobs.pt/', tag: 'Grátis',
        desc: 'Job board português especializado em TI.',
        objetivo: 'Vagas QA/TI adicionais fora do LinkedIn.',
        priority: { tier: 2, label: '★★ ALTA' } },
      { name: 'Indeed Portugal', url: 'https://pt.indeed.com/', tag: 'Grátis',
        desc: 'Agregador generalista com grande volume de vagas.',
        objetivo: 'Alertas automáticos para novas vagas QA.',
        priority: { tier: 2, label: '★★ ALTA' } }
    ]
  }
];

function renderPlatformItem(item) {
  const priority = item.priority
    ? '<span class="pri-' + item.priority.tier + '">' + escapeHtml(item.priority.label) + '</span>'
    : '';
  return '<div class="cert-card">'
    + '<div class="cert-card-top"><span class="cert-card-name">' + escapeHtml(item.name) + '</span>' + priority + '</div>'
    + '<div class="cert-card-meta">' + escapeHtml(item.tag) + '</div>'
    + '<div class="cert-card-hint">' + escapeHtml(item.desc) + '</div>'
    + '<div class="cert-card-hint">🎯 ' + escapeHtml(item.objetivo) + '</div>'
    + '<div class="cert-card-actions"><a class="cert-link-btn" href="' + item.url + '" target="_blank" rel="noopener">🔗 Abrir site ↗</a></div>'
    + '</div>';
}

function renderHubCategory(category) {
  return '<div class="sec">' + category.icon + ' ' + escapeHtml(category.title) + '</div>'
    + '<div class="cert-cards">' + category.items.map(renderPlatformItem).join('') + '</div>';
}

function initLearningHub() {
  const root = document.getElementById('learning-hub-root');
  if (!root) return;
  root.innerHTML = LEARNING_HUB_DATA.map(renderHubCategory).join('');
}

// ── SKILLS MATRIX (confidence levels, not percentages) ─────────
/**
 * 5 self-assessed confidence levels — deliberately NOT a percentage,
 * so this stays a subjective read of "how sure do I feel", not a fake metric.
 */
const SKILL_LEVELS = ['Iniciante', 'Básico', 'Intermédio', 'Avançado', 'Domínio'];

/**
 * `objetivo` is the target level index (0-4) for that skill, based on where
 * it sits in the Career Tracker's 4 priorities — P1 skills aim higher
 * (Avançado/Domínio), P4 skills only need Básico for now.
 * `level` (current) is intentionally NOT pre-filled here — it's a personal
 * self-assessment only Ricardo should set, via clicking in the UI.
 */
const SKILLS_MATRIX_DATA = [
  { id: 'sm-qa-manual', name: 'QA Manual', objetivo: 4 },
  { id: 'sm-agile', name: 'Agile', objetivo: 3 },
  { id: 'sm-git-github', name: 'Git & GitHub', objetivo: 3 },
  { id: 'sm-apis', name: 'APIs', objetivo: 3 },
  { id: 'sm-sql', name: 'SQL', objetivo: 3 },
  { id: 'sm-python', name: 'Python', objetivo: 3 },
  { id: 'sm-selenium', name: 'Selenium', objetivo: 4 },
  { id: 'sm-cicd', name: 'CI/CD', objetivo: 2 },
  { id: 'sm-docker', name: 'Docker', objetivo: 2 },
  { id: 'sm-playwright', name: 'Playwright', objetivo: 2 },
  { id: 'sm-cypress', name: 'Cypress', objetivo: 2 },
  { id: 'sm-cloud', name: 'Cloud (AWS / Azure)', objetivo: 1 },
  { id: 'sm-mobile', name: 'Mobile (Appium)', objetivo: 1 }
];

const SKILLS_MATRIX_KEY = 'qa_roadmap_skills_matrix';

function loadSkillsMatrixState() {
  try { return JSON.parse(localStorage.getItem(SKILLS_MATRIX_KEY) || '{}'); }
  catch (e) { return {}; }
}

function saveSkillsMatrixState(state) {
  try { localStorage.setItem(SKILLS_MATRIX_KEY, JSON.stringify(state)); } catch (e) {}
}

function renderMatrixRow(skill, state) {
  const current = state[skill.id];
  const hasLevel = typeof current === 'number';

  const segments = SKILL_LEVELS.map((label, i) => {
    const filled = hasLevel && i <= current;
    return '<button type="button" class="matrix-segment' + (filled ? ' filled' : '') + '" '
      + 'data-skill-id="' + skill.id + '" data-level="' + i + '" title="' + escapeHtml(label) + '"></button>';
  }).join('');

  const levelLabel = hasLevel ? SKILL_LEVELS[current] : 'Por avaliar';
  const objetivoLabel = SKILL_LEVELS[skill.objetivo];
  const levelClass = hasLevel ? ' level-' + current : '';

  let gapClass = '';
  if (hasLevel) {
    const gap = skill.objetivo - current;
    gapClass = gap <= 0 ? ' gap-done' : (gap === 1 ? ' gap-small' : ' gap-big');
  }

  return '<div class="cert-card matrix-row' + gapClass + '">'
    + '<div class="matrix-row-top">'
    +   '<span class="matrix-skill-name">' + escapeHtml(skill.name) + '</span>'
    +   '<span class="matrix-objetivo">🎯 Objetivo: ' + escapeHtml(objetivoLabel) + '</span>'
    + '</div>'
    + '<div class="matrix-bar-wrap' + levelClass + '">'
    +   '<div class="matrix-bar">' + segments + '</div>'
    +   '<span class="matrix-level-label' + (hasLevel ? '' : ' unset') + '">' + escapeHtml(levelLabel) + '</span>'
    + '</div>'
    + '</div>';
}

function renderSkillsMatrix() {
  const root = document.getElementById('skills-matrix-root');
  if (!root) return;
  const state = loadSkillsMatrixState();
  root.innerHTML = SKILLS_MATRIX_DATA.map(s => renderMatrixRow(s, state)).join('');
}

function initSkillsMatrix() {
  const root = document.getElementById('skills-matrix-root');
  if (!root) return;
  renderSkillsMatrix();

  root.addEventListener('click', e => {
    const seg = e.target.closest('.matrix-segment');
    if (!seg) return;
    const state = loadSkillsMatrixState();
    const skillId = seg.dataset.skillId;
    const level = Number(seg.dataset.level);
    // Clicking the segment that already marks the current level clears it
    // back to "Por avaliar" — otherwise it'd be impossible to un-rate a skill.
    if (state[skillId] === level) {
      delete state[skillId];
    } else {
      state[skillId] = level;
    }
    saveSkillsMatrixState(state);
    renderSkillsMatrix();
  });
}

// ── INIT ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDashboardProgressControl();
  initCareerTracker();
  initCertifications();
  initLearningHub();
  initSkillsMatrix();
  renderDashboardProgress(); // Dashboard "Automático" now reflects the Career Tracker
});