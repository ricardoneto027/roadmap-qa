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
  document.querySelectorAll('nav button').forEach(b => {
    const isActive = b.dataset.tab === id;
    b.classList.toggle('active', isActive);
    if (isActive) { b.setAttribute('aria-current', 'page'); b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    else b.removeAttribute('aria-current');
  });
  target.classList.add('active');
  document.body.classList.toggle('is-compact', id !== 'dashboard'); // cabeçalho pequeno fora do Dashboard
  window.scrollTo({ top: 0 });
}

// ── NAV deslizável: mostra um esbatido do lado onde há mais abas ──
function updateNavFades() {
  const nav = document.querySelector('nav');
  if (!nav) return;
  nav.classList.toggle('fade-left', nav.scrollLeft > 2);
  nav.classList.toggle('fade-right', nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 2);
}

function initNav() {
  const nav = document.querySelector('nav');
  if (!nav) return;
  nav.addEventListener('scroll', updateNavFades, { passive: true });
  window.addEventListener('resize', updateNavFades);
  updateNavFades();
}

// Cabeçalhos de sprint acessíveis por teclado (Enter / Espaço)
function initSprintAccessibility() {
  document.querySelectorAll('.sprint-header').forEach(h => {
    h.setAttribute('role', 'button');
    h.setAttribute('tabindex', '0');
    h.setAttribute('aria-expanded', h.parentElement.classList.contains('open') ? 'true' : 'false');
    h.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSprint(h); }
    });
  });
}

// ── SPRINT ACCORDION ───────────────────────────────────────────
function toggleSprint(header) {
  const open = header.parentElement.classList.toggle('open');
  header.setAttribute('aria-expanded', open ? 'true' : 'false');
}

// ── DASHBOARD PROGRESS SOURCE ───────────────────────────────────
// The Dashboard's "Automático" progress now reads directly from the
// Career Tracker (CAREER_TRACKER_DATA + qa_roadmap_skills_state) —
// see the "CAREER TRACKER" section below. This replaces the old
// standalone 22-item sprint/milestone tracker, which had no matching
// UI left in index.html (the Bootcamp tab uses static summary cards).

// ── DASHBOARD PROGRESS (hybrid: auto from tracker, manual override) ──
const DASH_OVERRIDE_KEY = 'qa_roadmap_dashboard_override';

// ── NÍVEIS DE CARREIRA (mesmos patamares da Skills Matrix: 25% · 50% · 75% · 100%) ──
const CAREER_LEVELS = [
  { name: 'Iniciante',  title: 'QA Trainee',             pct: 0 },
  { name: 'Básico',     title: 'QA Júnior',              pct: 25 },
  { name: 'Intermédio', title: 'QA Engineer',            pct: 50 },
  { name: 'Avançado',   title: 'QA Automation Engineer', pct: 75 },
  { name: 'Domínio',    title: 'Senior QA',              pct: 100 }
];

function renderLevelRow(el, done, total) {
  if (!el || !total) return;
  const need = CAREER_LEVELS.map(l => Math.ceil((l.pct / 100) * total));
  let cur = 0;
  need.forEach((n, i) => { if (done >= n) cur = i; });
  const steps = CAREER_LEVELS.map((l, i) =>
    '<span class="level-step' + (i < cur ? ' is-done' : '') + (i === cur ? ' is-current' : '') + '">'
    + '<strong>' + (i < cur ? '✓ ' : '') + l.name + '</strong>'
    + '<small>' + l.title + ' · ' + need[i] + '+</small></span>'
  ).join('');
  const next = cur < CAREER_LEVELS.length - 1
    ? 'Faltam <strong>' + (need[cur + 1] - done) + '</strong> para ' + CAREER_LEVELS[cur + 1].name + ' (' + CAREER_LEVELS[cur + 1].title + ')'
    : '🏆 Nível máximo atingido';
  el.innerHTML = '<div class="level-current">Nível atual: <strong>' + CAREER_LEVELS[cur].name + ' · ' + CAREER_LEVELS[cur].title + '</strong> · ' + next + '</div>'
    + '<div class="level-steps">' + steps + '</div>';
}

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
  renderLevelRow(document.getElementById('dash-level'), auto.done, auto.total);
  renderDashboardExtras();
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
    id: 'p1', icon: '🔴', status: 'active',  eyebrow: 'Prioridade 1 · Nov 2026 → Jan 2027 · Fase 4', title: 'Consolidar Fundamentos',
    mindset: 'Já aprendi isto. Agora quero dominar.',
    goal: 'ISTQB em dezembro, Python sólido com o CS50P e Playwright formalizado com o TAU, sem largar as bases de QA.',
    sections: [
      {
        title: '🎓 ISTQB CTFL v4.0',
        note: 'Exame em dezembro de 2026 pela PSTQB (em português). Um capítulo do syllabus de cada vez, depois simulados.',
        items: [
          { id: 'istqb-cap1',      name: '1 · Fundamentos de Teste' },
          { id: 'istqb-cap2',      name: '2 · Teste no Ciclo de Vida' },
          { id: 'istqb-cap3',      name: '3 · Teste Estático' },
          { id: 'istqb-cap4',      name: '4 · Análise e Desenho de Testes' },
          { id: 'istqb-cap5',      name: '5 · Gestão das Atividades de Teste' },
          { id: 'istqb-cap6',      name: '6 · Ferramentas de Teste' },
          { id: 'istqb-simulados', name: 'Simulados de exame' },
          { id: 'cert-istqb',      name: 'Exame ISTQB CTFL', stars: 5 }
        ]
      },
      {
        title: '🐍 Python · CS50P',
        note: 'A base de programação que sustenta a automação. 10 semanas, certificado gratuito no fim.',
        items: [
          { id: 'py-funcoes',     name: 'Funções' },
          { id: 'py-condicionais', name: 'Condicionais e loops' },
          { id: 'py-exceptions',  name: 'Exceptions' },
          { id: 'py-modulos',     name: 'Módulos e bibliotecas' },
          { id: 'py-unit-tests',  name: 'Unit tests' },
          { id: 'py-ficheiros',   name: 'Ficheiros' },
          { id: 'py-regex',       name: 'Expressões regulares' },
          { id: 'py-classes',     name: 'Classes e POO' },
          { id: 'py-list-comp',   name: 'List comprehensions' },
          { id: 'cs50p-cert',     name: 'Certificado CS50P' }
        ]
      },
      {
        title: '🤖 Playwright · TAU',
        note: 'Formalizar o que já fizeste no PetClinic: organização, código limpo, reutilização e estrutura.',
        items: [
          { id: 'pw-organizacao',    name: 'Organização' },
          { id: 'pw-codigo-limpo',   name: 'Código limpo' },
          { id: 'pw-reutilizacao',   name: 'Reutilização' },
          { id: 'pw-estrutura',      name: 'Estrutura (POM)' },
          { id: 'pw-framework',      name: 'Framework' },
          { id: 'pw-debugging',      name: 'Debugging' },
          { id: 'pw-esperas',        name: 'Esperas' },
          { id: 'pw-fixtures',       name: 'Fixtures' },
          { id: 'pw-parametrizacao', name: 'Parametrização' },
          { id: 'pw-logs',           name: 'Logs' },
          { id: 'tau-playwright',    name: 'TAU Playwright path' }
        ]
      },
      {
        title: '🧪 QA Manual',
        note: 'Um excelente QA manual continua a ser um excelente QA mesmo quando automatiza. A ISTQB reforça tudo isto.',
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
        note: 'Já tens as certificações Atlassian. O objetivo é perceber como tudo funciona numa equipa real.',
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
        title: '🛠 Ferramentas & APIs',
        groups: [
          {
            label: 'Jira & Confluence',
            items: [
              { id: 'tool-jira',        name: 'Jira (bug reports e tarefas)', done: true },
              { id: 'jira-workflows',   name: 'Workflows e estados' },
              { id: 'jira-jql',         name: 'Filtros e JQL' },
              { id: 'jira-dashboards',  name: 'Dashboards e relatórios' },
              { id: 'jira-test-mgmt',   name: 'Gestão de testes (AIO / Xray)' },
              { id: 'tool-confluence',  name: 'Confluence (documentação)', done: true },
              { id: 'conf-templates',   name: 'Templates e estrutura de espaços' }
            ]
          },
          {
            label: 'Git & GitHub',
            items: [
              { id: 'tool-github',        name: 'GitHub', done: true },
              { id: 'tool-git',           name: 'Git', done: true },
              { id: 'tool-git-branches',  name: 'Branches' },
              { id: 'tool-git-pr',        name: 'Pull Requests' },
              { id: 'tool-git-merge',     name: 'Merge' },
              { id: 'tool-git-conflicts', name: 'Resolução de conflitos' },
              { id: 'tool-git-flow',      name: 'Git Flow' }
            ]
          },
          {
            label: 'APIs (Postman)',
            items: [
              { id: 'api-status',       name: 'Status codes e validações' },
              { id: 'api-schema',       name: 'Validação de schema (JSON)' },
              { id: 'api-auth',         name: 'Authentication' },
              { id: 'api-tokens',       name: 'Tokens' },
              { id: 'api-variables',    name: 'Variables', done: true },
              { id: 'api-collections',  name: 'Collections', done: true },
              { id: 'api-newman',       name: 'Newman', done: true },
              { id: 'api-postman-auto', name: 'Testes automatizados no Postman' }
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
    id: 'p2', icon: '🟠', status: 'planned',  eyebrow: 'Prioridade 2 · Fev → Mai 2027 · Fase 5', title: 'Diferenciação',
    mindset: 'Quero destacar-me dos outros candidatos.',
    goal: 'Alargar o perfil: testes com Python, Katalon, performance, segurança, Azure DevOps e a primeira certificação GitHub.',
    sections: [
      {
        title: '🤖 Automação',
        items: [
          { id: 'tau-python',       name: 'TAU Python Testing path' },
          { id: 'udemy-playwright', name: 'Playwright avançado (Udemy)' },
          { id: 'cert-katalon',     name: 'Katalon Practitioner', stars: 4 }
        ]
      },
      {
        title: '⚡ Performance',
        note: 'Primeiro contacto com testes de performance, com certificado grátis da BlazeMeter.',
        items: [
          { id: 'perf-concepts', name: 'Conceitos: load, stress e spike' },
          { id: 'perf-metrics',  name: 'Métricas: tempo de resposta, throughput, erros' },
          { id: 'perf-scripts',  name: 'Criar e parametrizar scripts JMeter' },
          { id: 'perf-reports',  name: 'Relatórios e análise de resultados' },
          { id: 'lp-jmeter',     name: 'JMeter Intro (BlazeMeter)' }
        ]
      },
      {
        title: '🗄 SQL & Segurança',
        note: 'O curso de SQL + Security testing junta as duas coisas: queries mais realistas e testes de segurança na ótica de QA.',
        groups: [
          {
            label: 'SQL',
            items: [
              { id: 'sql-fundamentos', name: 'Fundamentos (SELECT, WHERE, JOINs)', done: true },
              { id: 'sql-joins',      name: 'JOINs complexos' },
              { id: 'sql-subqueries', name: 'Subqueries' },
              { id: 'sql-having',     name: 'HAVING' },
              { id: 'sql-case',       name: 'CASE' },
              { id: 'sql-window',     name: 'Window Functions', hint: 'mais tarde' }
            ]
          },
          {
            label: 'Segurança',
            items: [
              { id: 'sec-owasp',   name: 'OWASP Top 10' },
              { id: 'sec-auth',    name: 'Autenticação e autorização' },
              { id: 'sec-input',   name: 'Validação de inputs (SQL injection, XSS)' },
              { id: 'sec-api',     name: 'Segurança em APIs' },
              { id: 'lp-security', name: 'Curso SQL + Security testing (Udemy)' }
            ]
          }
        ]
      },
      {
        title: '⚙️ CI/CD',
        note: 'GitHub Actions já foi usado no PetClinic. Agora a teoria (TAU DevOps) e o Azure DevOps que as vagas pedem.',
        items: [
          { id: 'cicd-github-actions', name: 'GitHub Actions (pipelines no PetClinic)', done: true },
          { id: 'tau-devops',          name: 'TAU DevOps path' },
          { id: 'cicd-azure-devops',   name: 'Azure DevOps (Boards, Repos, Pipelines)' }
        ]
      },
      {
        title: '🐙 GitHub',
        note: 'Teoria de GitHub para consolidar a prática. O Git do dia a dia está na Prioridade 1.',
        items: [
          { id: 'cert-gh-900', name: 'GitHub Foundations (GH-900)' }
        ]
      },
      {
        title: '🐳 Docker',
        note: 'Primeiro contacto no PetClinic. Ainda nível iniciante: aprofundar com o TAU DevOps e o curso DevOps Fundamentals.',
        items: [
          { id: 'docker-basics',     name: 'Primeiro contacto (stack do PetClinic)', done: true },
          { id: 'docker-containers', name: 'Containers: run, stop, logs, exec' },
          { id: 'docker-images',     name: 'Imagens e Dockerfile' },
          { id: 'docker-compose',    name: 'docker-compose' },
          { id: 'docker-volumes',    name: 'Volumes e persistência' },
          { id: 'docker-networks',   name: 'Redes entre containers' },
          { id: 'docker-env',        name: 'Variáveis de ambiente e configuração' },
          { id: 'docker-tests',      name: 'Correr testes dentro de containers' },
          { id: 'docker-ci',         name: 'Docker em pipelines de CI' },
          { id: 'docker-debug',      name: 'Debugging de containers' }
        ]
      }
    ]
  },
  {
    id: 'p3', icon: '🟢', status: 'future',  eyebrow: 'Prioridade 3 · Jun → Dez 2027 · Fase 6', title: 'Especialização',
    mindset: 'Quero tornar-me um Automation QA mais completo.',
    goal: 'Jenkins e GitHub Actions a fundo, Python mais avançado e, se fizer sentido, a cloud Azure.',
    sections: [
      {
        title: '⚙️ CI/CD avançado',
        items: [
          { id: 'cicd-jenkins', name: 'Jenkins', hint: 'curso DevOps Fundamentals' },
          { id: 'cert-gh-200',  name: 'GitHub Actions (GH-200)' }
        ]
      },
      {
        title: '🐍 Python avançado',
        note: 'POO, estruturas de dados e algoritmos, úteis em entrevistas técnicas.',
        items: [
          { id: 'fcc-python', name: 'freeCodeCamp Python Certification' }
        ]
      },
      {
        title: '☁️ Cloud',
        items: [
          { id: 'cloud-concepts', name: 'Conceitos: IaaS, PaaS, SaaS' },
          { id: 'cloud-azure',    name: 'Serviços Azure principais' },
          { id: 'cloud-envs',     name: 'Ambientes de teste na cloud' },
          { id: 'lp-cloud',       name: 'Azure Fundamentals (AZ-900)', hint: 'opcional' }
        ]
      }
    ]
  },
  {
    id: 'p4', icon: '🔵', status: 'future',  eyebrow: 'Prioridade 4 · 2028 → · Fase 7', title: 'Longo Prazo',
    mindset: 'Quero preparar a evolução para um perfil mais sénior.',
    sections: [
      {
        title: '🚀 Automação Moderna',
        groups: [
          {
            label: 'Cypress',
            items: [
              { id: 'auto-cypress', name: 'Testes E2E com Cypress' },
              { id: 'cy-commands',  name: 'Custom commands e fixtures' },
              { id: 'cy-ci',        name: 'Cypress em CI' }
            ]
          },
          {
            label: 'Mobile',
            items: [
              { id: 'mob-manual',    name: 'Testes mobile manuais (Android / iOS)' },
              { id: 'mob-emulators', name: 'Emuladores e dispositivos reais' },
              { id: 'auto-mobile',   name: 'Automação com Appium' },
              { id: 'mob-gestures',  name: 'Gestos e elementos nativos' }
            ]
          },
          {
            label: 'Outros Frameworks',
            items: [
              { id: 'auto-bdd',     name: 'BDD (Cucumber / Gherkin)' },
              { id: 'auto-robot',   name: 'Robot Framework', hint: 'opcional' }
            ]
          },
          {
            label: 'Linguagens',
            items: [
              { id: 'lang-javascript', name: 'JavaScript', hint: 'pré-requisito para Cypress' },
              { id: 'lang-java',       name: 'Java', hint: 'comum em enterprise/banca' },
              { id: 'lang-csharp',     name: 'C#', hint: 'stack .NET' }
            ]
          }
        ]
      },
      {
        title: '🔭 Outras Competências',
        items: [
          { id: 'lp-performance', name: 'Performance avançada', hint: 'k6, JMeter Pro' },
          { id: 'cicd-gitlab',    name: 'GitLab CI/CD' },
          { id: 'cicd-bitbucket', name: 'Bitbucket' },
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

// Estado partilhado por Tracker, Timeline e Training Plan
const STATUS_LABELS = { done: 'Concluído', active: 'Em curso', planned: 'Planeado', future: 'Futuro' };
function statusBadge(status) {
  return status ? '<span class="badge badge--' + status + '">' + STATUS_LABELS[status] + '</span>' : '';
}

function renderPriorityBlock(priority, state, openByDefault) {
  const { done, total, pct } = priorityProgress(priority, state);
  const sectionsHtml = priority.sections.map(s => renderSkillSection(s, state)).join('');

  return '<div class="priority-block priority-' + priority.id + (openByDefault ? ' open' : '') + '" data-priority-id="' + priority.id + '">'
    + '<button type="button" class="priority-header">'
    +   '<div class="priority-header-main">'
    +     '<span class="prio-badge prio-' + priority.id.slice(1) + '">' + priority.id.toUpperCase() + '</span>'
    +     '<div>'
    +       '<div class="priority-eyebrow">' + escapeHtml(priority.eyebrow) + '</div>'
    +       '<div class="priority-title">' + escapeHtml(priority.title) + ' ' + statusBadge(priority.status) + '</div>'
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
    +   '<div class="progress-bar-track has-levels"><div class="progress-bar-fill"></div></div>'
    +   '<span class="progress-label"></span>'
    + '</div><div class="level-row" id="tracker-level"></div></div>';

  root.innerHTML = summary + CAREER_TRACKER_DATA
    .map(p => renderPriorityBlock(p, state, p.status === 'active')) // abre a prioridade em curso
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
  renderLevelRow(document.getElementById('tracker-level'), doneAll, totalAll);
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
  renderSkillsMatrix(); // a Skills Matrix segue o Tracker
}

// Dashboard → Career Tracker: abre a prioridade escolhida e desce até ela
function goToPriority(id) {
  showTab('tracker');
  const block = document.querySelector('.priority-block[data-priority-id="' + id + '"]');
  if (!block) return;
  block.classList.add('open');
  // espera que o cabeçalho encolha (transição de 0.25s) antes de calcular a posição
  setTimeout(() => {
    const nav = document.querySelector('nav');
    const offset = (nav ? nav.offsetHeight : 0) + 16;
    window.scrollTo({ top: block.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
    block.classList.add('is-highlight');
    setTimeout(() => block.classList.remove('is-highlight'), 1500);
  }, 300);
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
        credential: 'Badge Atlassian',
        official: { url: 'https://university.atlassian.com', label: 'Atlassian University' } },
      { id: 'cert-scrum', name: 'Scrum Fundamentals', when: 'Concluída · Mai 2026', cost: 'Grátis',
        credential: 'Badge Atlassian',
        official: { url: 'https://university.atlassian.com', label: 'Atlassian University' } },
      { id: 'cert-kanban', name: 'Kanban Fundamentals', when: 'Concluída · Mai 2026', cost: 'Grátis',
        credential: 'Badge Atlassian',
        official: { url: 'https://university.atlassian.com', label: 'Atlassian University' } },
      { id: 'cert-jira-fund', name: 'Jira Fundamentals', when: 'Concluída · Mai 2026', cost: 'Grátis',
        credential: 'Badge Atlassian',
        official: { url: 'https://university.atlassian.com', label: 'Atlassian University' } },
      { id: 'cert-confluence-fund', name: 'Confluence Fundamentals', when: 'Concluída · Mai 2026', cost: 'Grátis',
        credential: 'Badge Atlassian',
        official: { url: 'https://university.atlassian.com', label: 'Atlassian University' } }
    ]
  },
  {
    id: 'em-preparacao', icon: '🎯', title: 'Em Curso', color: 'amber',
    items: [
      { id: 'cert-istqb', name: 'ISTQB Foundation Level (CTFL v4.0)', short: 'ISTQB CTFL',
        provider: 'PSTQB · exame em português', when: 'Estudo desde Ago 2026 · Exame: Dez 2026',
        cost: '196,80 € (exame) + ~13 € (curso Udemy)', priority: { tier: 1, label: '★★★ P1' },
        credential: 'Certificação ISTQB oficial (sem validade)',
        months: ['2026-11', '2026-12'], milestone: { month: '2026-12', label: '🎯 exame' },
        hint: 'Requisito em muitas vagas. 40 perguntas, 60 min, aprovação com 65%. Datas e inscrição: exames@pstqb.pt.',
        official: { url: 'https://pstqb.pt/wp-content/uploads/2026/01/ISTQB_CTFL_v4_PT.pdf', label: 'PSTQB · exame CTFL' },
        resource: { url: 'https://www.udemy.com/courses/search/?q=ISTQB+Foundation+Level+V4.0+Complete+Training+Tarek+Roshdy', label: 'Curso Tarek Roshdy (Udemy)' } },
      { id: 'cert-cs50p', name: 'CS50P — Introduction to Programming with Python', short: 'CS50P',
        provider: 'Harvard · CS50', when: 'Nov 2026 → Jan 2027 · 10 semanas',
        cost: 'Grátis', priority: { tier: 1, label: '★★★ P1' },
        credential: 'Certificado gratuito CS50 (≥70% nos problem sets e no projeto final)',
        months: ['2026-11', '2026-12', '2027-01'], milestone: { month: '2027-01', label: '🎓 certificado' },
        hint: 'Base de Python para automação: funções, exceptions, unit tests e POO com classes.',
        official: { url: 'https://cs50.harvard.edu/python/', label: 'cs50.harvard.edu/python' } },
      { id: 'cert-tau-playwright', name: 'TAU — Playwright Learning Path', short: 'TAU Playwright',
        provider: 'Test Automation University (Applitools)', when: 'Dez 2026 → Jan 2027 (depois do exame ISTQB)',
        cost: 'Grátis', priority: { tier: 1, label: '★★★ P1' },
        credential: 'Certificado de conclusão por curso',
        months: ['2026-12', '2027-01'],
        hint: 'Reforça e formaliza o que já fizeste no PetClinic com Playwright + Python.',
        official: { url: 'https://testautomationu.applitools.com/learningpaths.html?id=playwright-path', label: 'Playwright path' } }
    ]
  },
  {
    id: 'planeadas', icon: '📚', title: 'Planeadas', color: 'blue',
    items: [
      { id: 'cert-tau-python', name: 'TAU — Python Testing Path', short: 'TAU Python',
        provider: 'Test Automation University (Applitools)', when: 'Fev 2027',
        cost: 'Grátis', priority: { tier: 2, label: '★★ P2' },
        credential: 'Certificado de conclusão por curso',
        months: ['2027-02'],
        hint: 'Testes com Python depois do CS50P: complementa a base de programação.',
        official: { url: 'https://testautomationu.applitools.com/learningpaths.html?id=python-testing-path', label: 'Python testing path' } },
      { id: 'cert-tau-devops', name: 'TAU — DevOps Path', short: 'TAU DevOps',
        provider: 'Test Automation University (Applitools)', when: 'Fev 2027',
        cost: 'Grátis', priority: { tier: 2, label: '★★ P2' },
        credential: 'Certificado de conclusão por curso',
        months: ['2027-02'],
        hint: 'Conceitos de CI/CD para testers, a juntar à prática com GitHub Actions.',
        official: { url: 'https://testautomationu.applitools.com/learningpaths.html?id=devops-path', label: 'DevOps path' } },
      { id: 'cert-udemy-playwright', name: 'Playwright Python Automation Testing — From Zero to Expert', short: 'Udemy Playwright',
        provider: 'Udemy · Rahul Shetty · 13,5h', when: 'Fev 2027',
        cost: '~12–14 € (promoção Udemy)', priority: { tier: 2, label: '★★ P2' },
        credential: 'Certificado de conclusão Udemy',
        months: ['2027-02'],
        hint: 'Aprofundamento depois do TAU Playwright.',
        official: { url: 'https://www.udemy.com/courses/search/?q=Playwright+Python+Automation+Testing+From+Zero+to+Expert+Rahul+Shetty', label: 'Ver na Udemy' } },
      { id: 'cert-katalon', name: 'Katalon Practitioner', short: 'Katalon',
        provider: 'Katalon Academy', when: 'Mar 2027',
        cost: 'Grátis', priority: { tier: 2, label: '★★ P2' },
        credential: 'Badge + página de verificação (válido 2 anos)',
        months: ['2027-03'],
        hint: 'Sem exame: 50 test cases, 30 test objects, 10 test suites e 75 execuções no Katalon Studio (grátis).',
        official: { url: 'https://academy.katalon.com/certifications/practitioner/', label: 'Katalon Academy' } },
      { id: 'cert-blazemeter-jmeter', name: 'BlazeMeter University — Apache JMeter Intro', short: 'JMeter (BlazeMeter)',
        provider: 'BlazeMeter University', when: 'Mar 2027',
        cost: 'Grátis', priority: { tier: 2, label: '★★ P2' },
        credential: 'Certificado após exame do curso (partilhável no LinkedIn)',
        months: ['2027-03'],
        hint: 'Primeiro contacto com performance testing. O JMeter Pro fica para depois.',
        official: { url: 'https://www.blazemeter.com/university', label: 'BlazeMeter University' } },
      { id: 'cert-udemy-security', name: 'Learn SQL + Security (pen) testing from Scratch', short: 'Udemy SQL + Security',
        provider: 'Udemy · Rahul Shetty · 13,5h', when: 'Abr 2027',
        cost: '~12–14 € (promoção Udemy)', priority: { tier: 2, label: '★★ P2' },
        credential: 'Certificado de conclusão Udemy',
        months: ['2027-04'],
        hint: 'Testes de segurança na ótica de QA e reforço de SQL.',
        official: { url: 'https://www.udemy.com/courses/search/?q=Learn+SQL+Security+pen+testing+from+Scratch+Rahul+Shetty', label: 'Ver na Udemy' } },
      { id: 'cert-udemy-azure-devops', name: 'Azure DevOps Crash Course — Build CI/CD release pipelines', short: 'Udemy Azure DevOps',
        provider: 'Udemy · Rahul Shetty · 7h', when: 'Abr 2027',
        cost: '~12–14 € (promoção Udemy)', priority: { tier: 2, label: '★★ P2' },
        credential: 'Certificado de conclusão Udemy',
        months: ['2027-04'],
        hint: 'Boards, Repos e Pipelines: é isto que as vagas querem dizer com "Azure DevOps".',
        official: { url: 'https://www.udemy.com/courses/search/?q=Azure+Devops+Crash+Course+Build+CI+CD+release+pipelines+Rahul+Shetty', label: 'Ver na Udemy' } },
      { id: 'cert-gh-900', name: 'GitHub Foundations (GH-900)', short: 'GH-900',
        provider: 'Microsoft Learn · GitHub', when: 'Estudo e exame: Mai 2027',
        cost: 'Estudo grátis · Exame 76 €', priority: { tier: 2, label: '★★ P2' },
        credential: 'Certificação GitHub (válida 2 anos)',
        months: ['2027-05'], milestone: { month: '2027-05', label: '🎯 exame' },
        hint: 'Consolidar a teoria de GitHub (repositórios, branches, PRs, issues) para além da prática.',
        official: { url: 'https://learn.microsoft.com/pt-pt/credentials/certifications/github-foundations/', label: 'Certificação GH-900' },
        resource: { url: 'https://learn.microsoft.com/pt-pt/training/github/', label: 'Formação GitHub (grátis)' } }
    ]
  },
  {
    id: 'futuras', icon: '⭐', title: 'Futuras', color: 'purple',
    items: [
      { id: 'cert-udemy-devops', name: 'DevOps Fundamentals — CI/CD with AWS + Docker + Ansible + Jenkins', short: 'Udemy DevOps (Jenkins)',
        provider: 'Udemy · Rahul Shetty · 9h', when: 'Jun → Jul 2027',
        cost: '~12–14 € (promoção Udemy)', priority: { tier: 3, label: '★ P3' },
        credential: 'Certificado de conclusão Udemy',
        months: ['2027-06', '2027-07'],
        hint: 'Jenkins aparece nas vagas PT e o Docker reforça o PetClinic. AWS e Ansible são mais DevOps do que QA.',
        official: { url: 'https://www.udemy.com/courses/search/?q=Devops+Fundamentals+CI+CD+AWS+Docker+Ansible+Jenkins+Rahul+Shetty', label: 'Ver na Udemy' } },
      { id: 'cert-gh-200', name: 'GitHub Actions (GH-200)', short: 'GH-200',
        provider: 'Microsoft Learn · GitHub · nível intermédio', when: 'Estudo: Jun → Jul 2027 · Exame: 2.º sem. 2027',
        cost: 'Estudo grátis · Exame 76 €', priority: { tier: 3, label: '★ P3' },
        credential: 'Certificação GitHub (válida 2 anos)',
        months: ['2027-06', '2027-07', '2027-H2'], milestone: { month: '2027-H2', label: '🎯 exame' },
        hint: 'Formaliza o que já fazes com pipelines no PetClinic. Exame disponível em português (Brasil).',
        official: { url: 'https://learn.microsoft.com/pt-pt/credentials/certifications/github-actions/', label: 'Certificação GH-200' },
        resource: { url: 'https://learn.microsoft.com/pt-pt/training/github/', label: 'Formação GitHub (grátis)' } },
      { id: 'cert-fcc-python', name: 'freeCodeCamp — Python Certification', short: 'freeCodeCamp Python',
        provider: 'freeCodeCamp', when: '2.º sem. 2027',
        cost: 'Grátis', priority: { tier: 3, label: '★ P3' },
        credential: 'Certificação verificada freeCodeCamp (5 projetos + exame)',
        months: ['2027-H2'],
        hint: 'Continuação do CS50P: POO, estruturas de dados e algoritmos, úteis em entrevistas técnicas.',
        official: { url: 'https://www.freecodecamp.org/learn/python-v9/', label: 'freeCodeCamp Python' } },
      { id: 'cert-az-900', name: 'Azure Fundamentals (AZ-900)', short: 'AZ-900 (opcional)',
        provider: 'Microsoft Learn · opcional', when: '2.º sem. 2027 (opcional)',
        cost: 'Estudo grátis · Exame 76 €', priority: { tier: 3, label: '★ P3' },
        credential: 'Certificação Microsoft',
        months: ['2027-H2'],
        hint: 'É sobre a cloud Azure, não Azure DevOps. Só pagar o exame se as vagas o pedirem ou a empresa pagar.',
        official: { url: 'https://learn.microsoft.com/pt-pt/credentials/certifications/azure-fundamentals/', label: 'Certificação AZ-900' } }
    ]
  }
];

// ── Certifications timeline (month by month, built from `months` above) ──
const CERT_TIMELINE_MONTHS = [
  { key: '2026-11', label: 'Nov 2026' },
  { key: '2026-12', label: 'Dez 2026' },
  { key: '2027-01', label: 'Jan 2027' },
  { key: '2027-02', label: 'Fev 2027' },
  { key: '2027-03', label: 'Mar 2027' },
  { key: '2027-04', label: 'Abr 2027' },
  { key: '2027-05', label: 'Mai 2027' },
  { key: '2027-06', label: 'Jun 2027' },
  { key: '2027-07', label: 'Jul 2027' },
  { key: '2027-H2', label: '2.º sem. 2027' }
];

function currentMonthKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

// Re-rendered together with the cards, so a card dragged to "Obtidas"
// shows up as ✅ (riscado) na timeline.
function renderCertTimeline() {
  const root = document.getElementById('cert-timeline-root');
  if (!root) return;
  const effectiveGroup = {};
  getEffectiveCertGroups().forEach(g => g.entries.forEach(e => { effectiveGroup[e.item.id] = g.id; }));
  const allItems = [];
  CERTIFICATIONS_DATA.forEach(g => g.items.forEach(it => { if (it.months) allItems.push(it); }));
  const nowKey = currentMonthKey();

  root.innerHTML = '<div class="cert-tl">' + CERT_TIMELINE_MONTHS.map(m => {
    const items = allItems
      .filter(it => it.months.indexOf(m.key) !== -1)
      .sort((x, y) => x.priority.tier - y.priority.tier);
    const chips = items.map(it => {
      const done = effectiveGroup[it.id] === 'obtidas';
      const ms = (it.milestone && it.milestone.month === m.key) ? ' · ' + it.milestone.label : '';
      return '<span class="cert-tl-chip tl-p' + it.priority.tier + (done ? ' is-done' : '') + (ms ? ' is-milestone' : '') + '">'
        + (done ? '✅ ' : '') + escapeHtml(it.short || it.name) + ms + '</span>';
    }).join('');
    const isNow = m.key === nowKey;
    return '<div class="cert-tl-row' + (isNow ? ' is-now' : '') + '">'
      + '<div class="cert-tl-month">' + m.label + (isNow ? ' <span class="cert-tl-now">agora</span>' : '') + '</div>'
      + '<div class="cert-tl-items">' + chips + '</div>'
      + '</div>';
  }).join('') + '</div>';
}

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
    + '<div class="cert-card-meta">' + (item.provider ? escapeHtml(item.provider) + ' · ' : '') + escapeHtml(item.when) + ' · ' + escapeHtml(item.cost) + '</div>'
    + (item.credential ? '<div class="cert-card-cred">🔖 ' + escapeHtml(item.credential) + '</div>' : '')
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
  renderCertTimeline();
  renderDashboardExtras();
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
      { name: 'PSTQB — ISTQB Portugal', url: 'https://www.pstqb.pt/', tag: 'Exame pago · 196,80 €',
        desc: 'Associação portuguesa do ISTQB: syllabus em português, exames remotos ou presenciais e inscrições.',
        objetivo: 'Exame ISTQB CTFL em dezembro de 2026.',
        priority: { tier: 1, label: '★★★ P1' } },
      { name: 'CS50P — Harvard', url: 'https://cs50.harvard.edu/python/', tag: 'Cert. grátis',
        desc: 'Introdução à programação com Python: funções, exceptions, unit tests e POO, em 10 semanas.',
        objetivo: 'Base de Python para automação (Nov 2026 → Jan 2027).',
        priority: { tier: 1, label: '★★★ P1' } },
      { name: 'Test Automation University', url: 'https://testautomationu.applitools.com/', tag: 'Cert. grátis',
        desc: 'Cursos gratuitos de automação (Playwright, Python, DevOps, API testing), com certificado por curso.',
        objetivo: 'Playwright path (Dez–Jan), depois os paths de Python e DevOps (Fev 2027).',
        priority: { tier: 1, label: '★★★ P1' } },
      { name: 'Udemy', url: 'https://www.udemy.com/', tag: 'Pago · ~12–14 € em promoção',
        desc: 'Cursos do plano: ISTQB (Tarek Roshdy) e, do Rahul Shetty, Playwright, SQL + Security, Azure DevOps e DevOps.',
        objetivo: 'Comprar só em promoção e um de cada vez, conforme a timeline das Certifications.',
        priority: { tier: 1, label: '★★★ P1' } },
      { name: 'Katalon Academy', url: 'https://academy.katalon.com/', tag: 'Cert. grátis',
        desc: 'Cursos e a certificação Katalon Practitioner, obtida por atividade no Katalon Studio.',
        objetivo: 'Katalon Practitioner (Mar 2027).',
        priority: { tier: 2, label: '★★ P2' } },
      { name: 'BlazeMeter University', url: 'https://www.blazemeter.com/university', tag: 'Cert. grátis',
        desc: 'Cursos gratuitos de performance testing: Apache JMeter Intro e Pro.',
        objetivo: 'JMeter Intro (Mar 2027).',
        priority: { tier: 2, label: '★★ P2' } },
      { name: 'Microsoft Learn', url: 'https://learn.microsoft.com/pt-pt/training/github/', tag: 'Grátis · exames 76 €',
        desc: 'Formação gratuita de GitHub (GH-900, GH-200), Azure DevOps e Azure Fundamentals.',
        objetivo: 'GitHub Foundations (GH-900) em maio de 2027.',
        priority: { tier: 2, label: '★★ P2' } },
      { name: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/python-v9/', tag: 'Cert. grátis',
        desc: 'Python Certification: POO, estruturas de dados e algoritmos, com 5 projetos e exame.',
        objetivo: 'Continuação do CS50P (2.º semestre de 2027).',
        priority: { tier: 3, label: '★ P3' } },
      { name: 'Tutorialspoint — Software Quality', url: 'https://www.tutorialspoint.com/software_quality_tutorials.htm', tag: 'Grátis · consulta',
        desc: '47 tutoriais de qualidade de software: TestLink, QC, SoapUI, Bugzilla, Selenium, Cypress, Jenkins, Cucumber, Robot Framework, segurança e mobile.',
        objetivo: 'Introdução rápida a uma ferramenta que aparece numa vaga e que ainda não conheces.',
        priority: { tier: 3, label: '★ P3' } },
      { name: 'Atlassian University', url: 'https://university.atlassian.com', tag: 'Grátis',
        desc: 'Onde obtiveste as badges de Jira, Confluence, Scrum e Kanban.',
        objetivo: 'Aprofundar Jira (workflows, JQL, dashboards) quando precisares.',
        priority: { tier: 3, label: '★ P3' } }
    ]
  },
  {
    id: 'qa-manual', icon: '🧪', title: 'Praticar QA Manual',
    items: [
      { name: 'SauceDemo', url: 'https://www.saucedemo.com/', tag: 'Grátis',
        desc: 'Loja online feita para testes: login, produtos, carrinho e checkout, com utilizadores com problemas.',
        objetivo: 'Test cases e bug reports, e base para scripts Playwright.',
        priority: { tier: 1, label: '★★★ P1' } },
      { name: 'Practice Software Testing (Toolshop)', url: 'https://practicesoftwaretesting.com/', tag: 'Grátis',
        desc: 'Loja de ferramentas criada para praticar testes, com interface web e API.',
        objetivo: 'Aplicar as técnicas da ISTQB (EP, BVA, tabelas de decisão) num caso realista.',
        priority: { tier: 1, label: '★★★ P1' } },
      { name: 'OrangeHRM Demo', url: 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login', tag: 'Grátis',
        desc: 'Sistema de RH real: login, gestão de empregados, permissões.',
        objetivo: 'Testes de formulários, validações e permissões de utilizador.',
        priority: { tier: 2, label: '★★ P2' } },
      { name: 'Guru99', url: 'https://www.guru99.com/software-testing.html', tag: 'Grátis',
        desc: 'Tutoriais de teoria de testes, bons para consulta rápida.',
        objetivo: 'Rever conceitos durante o estudo da ISTQB.',
        priority: { tier: 2, label: '★★ P2' } },
      { name: 'OpenCart Demo', url: 'https://demo.opencart.com/', tag: 'Grátis',
        desc: 'Loja online com área de cliente e de administração.',
        objetivo: 'Fluxos completos: registo, compra e gestão de produtos.',
        priority: { tier: 3, label: '★ P3' } }
    ]
  },
  {
    id: 'apis', icon: '🌐', title: 'Praticar APIs',
    items: [
      { name: 'Restful Booker', url: 'https://restful-booker.herokuapp.com/apidoc/index.html', tag: 'Grátis',
        desc: 'API de reservas com autenticação por token, CRUD completo e bugs propositados.',
        objetivo: 'Authentication, tokens, testes negativos e validação de schema.',
        priority: { tier: 1, label: '★★★ P1' } },
      { name: 'Postman Echo', url: 'https://postman-echo.com/', tag: 'Grátis',
        desc: 'Serviço da Postman que devolve o pedido: headers, auth, cookies, status codes.',
        objetivo: 'Perceber status codes e tipos de autenticação na prática.',
        priority: { tier: 2, label: '★★ P2' } },
      { name: 'Swagger Petstore', url: 'https://petstore.swagger.io/', tag: 'Grátis',
        desc: 'API de exemplo com documentação Swagger (OpenAPI) integrada.',
        objetivo: 'Ler documentação OpenAPI e testar a partir dela.',
        priority: { tier: 2, label: '★★ P2' } },
      { name: 'JSONPlaceholder', url: 'https://jsonplaceholder.typicode.com/', tag: 'Grátis',
        desc: 'API fake de posts, comentários e utilizadores: GET, POST, PUT, DELETE.',
        objetivo: 'Aquecimento rápido de Postman (já dominas o básico).',
        priority: { tier: 3, label: '★ P3' } },
      { name: 'ReqRes', url: 'https://reqres.in/', tag: 'Grátis · conta opcional',
        desc: 'API de teste com respostas realistas e paginação. Sem conta funciona com limite por IP.',
        objetivo: 'Variáveis e paginação em coleções Postman.',
        priority: { tier: 3, label: '★ P3' } }
    ]
  },
  {
    id: 'sql', icon: '🗄️', title: 'Praticar SQL',
    items: [
      { name: 'SQLZoo', url: 'https://sqlzoo.net/wiki/SQL_Tutorial', tag: 'Grátis',
        desc: 'Exercícios interativos no browser, sem instalação.',
        objetivo: 'JOINs complexos, subqueries e agregações (Abr 2027, com o curso de SQL).',
        priority: { tier: 2, label: '★★ P2' } },
      { name: 'HackerRank SQL', url: 'https://www.hackerrank.com/domains/sql', tag: 'Grátis',
        desc: 'Desafios de SQL com dificuldade crescente.',
        objetivo: 'HAVING, CASE e queries mais realistas.',
        priority: { tier: 2, label: '★★ P2' } },
      { name: 'SQLBolt', url: 'https://sqlbolt.com/', tag: 'Grátis',
        desc: 'Tutorial visual e interativo, o mais simples para rever.',
        objetivo: 'Revisão rápida de SELECT, WHERE e JOINs antes de entrevistas.',
        priority: { tier: 3, label: '★ P3' } },
      { name: 'LeetCode SQL', url: 'https://leetcode.com/problemset/database/', tag: 'Grátis',
        desc: 'Problemas de base de dados usados em entrevistas técnicas.',
        objetivo: 'Window Functions e preparação para entrevistas.',
        priority: { tier: 3, label: '★ P3' } }
    ]
  },
  {
    id: 'python-auto', icon: '🤖', title: 'Praticar Python & Automação',
    items: [
      { name: 'Playwright Docs (Python)', url: 'https://playwright.dev/python/', tag: 'Grátis',
        desc: 'Documentação oficial: locators, auto-waiting, fixtures e trace viewer.',
        objetivo: 'Organização, reutilização e estrutura dos testes (POM, fixtures, parametrização).',
        priority: { tier: 1, label: '★★★ P1' } },
      { name: 'The Internet (Herokuapp)', url: 'https://the-internet.herokuapp.com/', tag: 'Grátis',
        desc: 'Challenges de automação: login, alerts, drag-and-drop, iframes, shadow DOM.',
        objetivo: 'Esperas, locators e debugging em cenários variados.',
        priority: { tier: 1, label: '★★★ P1' } },
      { name: 'UI Testing Playground', url: 'http://uitestingplayground.com/', tag: 'Grátis',
        desc: 'Exemplos dos problemas reais da automação: IDs dinâmicos, AJAX, camadas escondidas, frames.',
        objetivo: 'Perceber quando o auto-waiting do Playwright chega e quando não.',
        priority: { tier: 1, label: '★★★ P1' } },
      { name: 'Automation Exercise', url: 'https://www.automationexercise.com/', tag: 'Grátis',
        desc: 'Loja online para automação com lista de test cases e de APIs prontos a usar.',
        objetivo: 'Projeto Playwright novo para o portfolio, com UI e API.',
        priority: { tier: 2, label: '★★ P2' } },
      { name: 'Practice Test Automation', url: 'https://practicetestautomation.com/practice/', tag: 'Grátis',
        desc: 'Páginas de prática com cenários guiados (login, exceções, tabelas).',
        objetivo: 'Exercícios curtos de automação entre módulos do TAU.',
        priority: { tier: 2, label: '★★ P2' } },
      { name: 'Exercism (Python)', url: 'https://exercism.org/tracks/python', tag: 'Grátis',
        desc: 'Exercícios de Python com feedback de mentores voluntários.',
        objetivo: 'Praticar o que aprendes no CS50P.',
        priority: { tier: 2, label: '★★ P2' } },
      { name: 'Codewars', url: 'https://www.codewars.com/', tag: 'Grátis',
        desc: 'Desafios curtos (kata) de lógica em várias linguagens.',
        objetivo: 'Manter a lógica de programação em dia.',
        priority: { tier: 3, label: '★ P3' } }
    ]
  },
  {
    // Emprego: sem prioridades — são canais a usar em paralelo
    id: 'emprego', icon: '💼', title: 'Emprego',
    items: [
      { name: 'Tracker de Candidaturas', url: 'https://docs.google.com/spreadsheets/d/1CPKxxleHZq8KAqDd3qOivWGPxBGi1W4qZQZhaKneHo4/edit?usp=sharing', tag: 'Google Sheets',
        desc: 'O registo de todas as candidaturas: data, empresa, cargo, estado e resposta.',
        objetivo: 'Registar cada candidatura e acompanhar respostas e entrevistas.' },
      { name: 'LinkedIn Jobs', url: 'https://www.linkedin.com/jobs/', tag: 'Grátis',
        desc: 'A rede mais usada para recrutamento tech em Portugal.',
        objetivo: 'Candidaturas, alertas de vagas e networking com recrutadores e QAs.' },
      { name: 'Landing.Jobs', url: 'https://landing.jobs/', tag: 'Grátis',
        desc: 'Job board europeu de tecnologia com escritório em Lisboa.',
        objetivo: 'Vagas QA locais e remotas.' },
      { name: 'ITJobs', url: 'https://www.itjobs.pt/', tag: 'Grátis',
        desc: 'Job board português especializado em TI.',
        objetivo: 'Vagas QA e TI fora do LinkedIn, muitas de consultoras.' },
      { name: 'Indeed Portugal', url: 'https://pt.indeed.com/', tag: 'Grátis',
        desc: 'Agregador generalista com grande volume de vagas.',
        objetivo: 'Alertas automáticos para novas vagas QA.' },
      { name: 'PAC — TripleTen', url: 'https://tripleten.com/', tag: 'Programa concluído',
        desc: 'Career Acceleration Program concluído: coach, candidaturas e mock interviews.',
        objetivo: 'Reaproveitar as tarefas do PAC e manter contacto com o coach durante a procura.' }
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
  return '<div class="sec" id="hub-' + category.id + '">' + category.icon + ' ' + escapeHtml(category.title) + '</div>'
    + '<div class="cert-cards">' + category.items.map(renderPlatformItem).join('') + '</div>';
}

function initLearningHub() {
  const root = document.getElementById('learning-hub-root');
  if (!root) return;
  const index = '<div class="hub-index">' + LEARNING_HUB_DATA.map(c =>
      '<a class="cert-link-btn" href="#hub-' + c.id + '">' + c.icon + ' ' + escapeHtml(c.title) + ' · ' + c.items.length + '</a>'
    ).join('') + '</div>';
  root.innerHTML = index + LEARNING_HUB_DATA.map(renderHubCategory).join('');
}

// ── SKILLS MATRIX (confidence levels, not percentages) ─────────
/**
 * Skills Matrix calculada a partir do Career Tracker (sem autoavaliação).
 * Cada competência agrupa itens do Tracker (`items`). O nível sobe à medida
 * que os marcas como feitos, por patamares:
 *   < 25% Iniciante · 25% Básico · 50% Intermédio · 75% Avançado · 100% Domínio O `objetivo` é só um alvo (segmento a
 * tracejado), definido pela prioridade da competência no Career Tracker.
 */
const SKILL_LEVELS = ['Iniciante', 'Básico', 'Intermédio', 'Avançado', 'Domínio'];

const SKILLS_MATRIX_DATA = [
  { id: 'sm-qa-manual', name: 'QA Manual', objetivo: 4,
    items: ['qam-test-design', 'qam-test-cases', 'qam-checklists', 'qam-bug-reports', 'qam-test-plans',
            'qam-req-analysis', 'qam-risk-based', 'qam-exploratory', 'qam-edge-cases', 'qam-test-planning',
            'qam-prioritization'] },
  { id: 'sm-istqb', name: 'ISTQB (teoria de testes)', objetivo: 4,
    items: ['istqb-cap1', 'istqb-cap2', 'istqb-cap3', 'istqb-cap4', 'istqb-cap5', 'istqb-cap6',
            'istqb-simulados', 'cert-istqb'] },
  { id: 'sm-playwright', name: 'Playwright', objetivo: 4,
    items: ['pw-organizacao', 'pw-codigo-limpo', 'pw-reutilizacao', 'pw-estrutura', 'pw-framework', 'pw-debugging',
            'pw-esperas', 'pw-fixtures', 'pw-parametrizacao', 'pw-logs', 'tau-playwright', 'udemy-playwright'] },
  { id: 'sm-python', name: 'Python', objetivo: 3,
    items: ['py-funcoes', 'py-condicionais', 'py-exceptions', 'py-modulos', 'py-unit-tests', 'py-ficheiros',
            'py-regex', 'py-classes', 'py-list-comp', 'cs50p-cert', 'tau-python', 'fcc-python'] },
  { id: 'sm-apis', name: 'APIs (Postman)', objetivo: 3,
    items: ['api-status', 'api-schema', 'api-auth', 'api-tokens', 'api-variables', 'api-collections', 'api-newman', 'api-postman-auto'] },
  { id: 'sm-sql', name: 'SQL', objetivo: 3,
    items: ['sql-fundamentos', 'sql-joins', 'sql-subqueries', 'sql-having', 'sql-case', 'sql-window'] },
  { id: 'sm-git-github', name: 'Git & GitHub', objetivo: 3,
    items: ['tool-github', 'tool-git', 'tool-git-branches', 'tool-git-pr', 'tool-git-merge', 'tool-git-conflicts',
            'tool-git-flow', 'cert-gh-900'] },
  { id: 'sm-jira', name: 'Jira & Confluence', objetivo: 3,
    items: ['tool-jira', 'jira-workflows', 'jira-jql', 'jira-dashboards', 'jira-test-mgmt', 'tool-confluence', 'conf-templates'] },
  { id: 'sm-agile', name: 'Agile', objetivo: 3,
    items: ['agile-scrum', 'agile-kanban', 'agile-ceremonies', 'agile-refinement', 'agile-sprint-planning', 'agile-retro'] },
  { id: 'sm-cicd', name: 'CI/CD', objetivo: 3,
    items: ['cicd-github-actions', 'tau-devops', 'cicd-azure-devops', 'cicd-jenkins', 'cert-gh-200', 'cicd-gitlab', 'cicd-bitbucket'] },
  { id: 'sm-docker', name: 'Docker', objetivo: 2,
    items: ['docker-basics', 'docker-containers', 'docker-images', 'docker-compose', 'docker-volumes', 'docker-networks',
            'docker-env', 'docker-tests', 'docker-ci', 'docker-debug'] },
  { id: 'sm-performance', name: 'Performance (JMeter / k6)', objetivo: 2,
    items: ['perf-concepts', 'perf-metrics', 'perf-scripts', 'perf-reports', 'lp-jmeter', 'lp-performance'] },
  { id: 'sm-security', name: 'Testes de Segurança', objetivo: 1,
    items: ['sec-owasp', 'sec-auth', 'sec-input', 'sec-api', 'lp-security'] },
  { id: 'sm-cypress', name: 'Cypress & JavaScript', objetivo: 2,
    items: ['lang-javascript', 'auto-cypress', 'cy-commands', 'cy-ci'] },
  { id: 'sm-cloud', name: 'Cloud (Azure)', objetivo: 1,
    items: ['cloud-concepts', 'cloud-azure', 'cloud-envs', 'lp-cloud'] },
  { id: 'sm-mobile', name: 'Mobile (Appium)', objetivo: 1,
    items: ['mob-manual', 'mob-emulators', 'auto-mobile', 'mob-gestures'] }
];

function computeMatrixSkill(skill, trackerState) {
  const all = CAREER_TRACKER_DATA.flatMap(flattenPriorityItems);
  const items = skill.items.map(id => all.find(it => it.id === id)).filter(Boolean);
  const total = items.length;
  const done = items.filter(it => isSkillDone(it, trackerState)).length;
  const MAX = SKILL_LEVELS.length - 1;
  const level = total ? Math.floor((done / total) * MAX) : 0;
  // Quantos itens faltam para chegar ao patamar seguinte
  let toNext = null;
  if (level < MAX && total) {
    const needed = Math.ceil(((level + 1) / MAX) * total);
    toNext = Math.max(1, needed - done);
  }
  return { done, total, level, toNext };
}

function renderMatrixRow(skill, trackerState) {
  const r = computeMatrixSkill(skill, trackerState);
  const hasProgress = r.done > 0;

  const segments = SKILL_LEVELS.map((label, i) => {
    const filled = hasProgress && i <= r.level;
    const isTarget = i === skill.objetivo;
    return '<span class="matrix-segment' + (filled ? ' filled' : '') + (isTarget ? ' is-target' : '') + '" '
      + 'title="' + escapeHtml(label) + (isTarget ? ' (objetivo)' : '') + '"></span>';
  }).join('');

  // Cor = nível (igual em todas as competências): ≤ Básico vermelho · Intermédio âmbar · ≥ Avançado verde
  const tone = !hasProgress ? '' : (r.level <= 1 ? ' tone-low' : (r.level === 2 ? ' tone-mid' : ' tone-high'));

  const MAX = SKILL_LEVELS.length - 1;
  const goal = r.level >= skill.objetivo ? ' · 🎯 objetivo atingido' : '';
  const next = r.level >= MAX
    ? '🏆 Domínio'
    : (r.toNext === 1 ? 'Falta 1 para ' : 'Faltam ' + r.toNext + ' para ') + SKILL_LEVELS[r.level + 1];

  return '<div class="cert-card matrix-row' + tone + '">'
    + '<div class="matrix-row-top">'
    +   '<span class="matrix-skill-name">' + escapeHtml(skill.name) + '</span>'
    +   '<span class="matrix-objetivo">🎯 Objetivo: ' + escapeHtml(SKILL_LEVELS[skill.objetivo]) + '</span>'
    + '</div>'
    + '<div class="matrix-bar-wrap level-' + r.level + '" role="img" aria-label="' + escapeHtml(skill.name + ': ' + SKILL_LEVELS[r.level] + ', objetivo ' + SKILL_LEVELS[skill.objetivo]) + '">'
    +   '<div class="matrix-bar">' + segments + '</div>'
    +   '<span class="matrix-level-label' + (hasProgress ? '' : ' unset') + '">' + SKILL_LEVELS[r.level] + '</span>'
    + '</div>'
    + '<div class="matrix-meta"><span>' + r.done + '/' + r.total + ' no Career Tracker' + goal + '</span><span>' + next + '</span></div>'
    + '</div>';
}

function renderSkillsMatrix() {
  const root = document.getElementById('skills-matrix-root');
  if (!root) return;
  const trackerState = loadSkillsState();
  root.innerHTML = SKILLS_MATRIX_DATA.map(s => renderMatrixRow(s, trackerState)).join('');
}

function initSkillsMatrix() {
  renderSkillsMatrix();
}

// ── DASHBOARD — cartões automáticos ligados ao plano ───────────
// Lê CERTIFICATIONS_DATA (+ overrides de drag-and-drop) e CAREER_TRACKER_DATA,
// por isso o Dashboard atualiza sozinho quando mudas o plano noutras abas.
function monthIndex(key) {
  const y = parseInt(key.slice(0, 4), 10);
  const m = key.slice(5) === 'H2' ? 7 : parseInt(key.slice(5), 10);
  return y * 12 + (m - 1);
}

function monthLabel(key) {
  const m = CERT_TIMELINE_MONTHS.find(x => x.key === key);
  return m ? m.label : key;
}

function relativeMonths(key) {
  const diff = monthIndex(key) - monthIndex(currentMonthKey());
  if (diff <= 0) return 'este mês';
  if (diff === 1) return 'no próximo mês';
  return 'daqui a ' + diff + ' meses';
}

function getCertEffectiveGroupMap() {
  const map = {};
  getEffectiveCertGroups().forEach(g => g.entries.forEach(e => { map[e.item.id] = g.id; }));
  return map;
}

function planItemsPending() {
  const groupOf = getCertEffectiveGroupMap();
  const items = [];
  CERTIFICATIONS_DATA.forEach(g => g.items.forEach(it => {
    if (it.months && groupOf[it.id] !== 'obtidas') items.push(it);
  }));
  return items;
}

function renderDashMonth() {
  const root = document.getElementById('dash-month-root');
  if (!root) return;
  const pending = planItemsPending();
  const nowIdx = monthIndex(currentMonthKey());
  // Mês atual; se não houver nada planeado, o próximo mês com formação.
  const month = CERT_TIMELINE_MONTHS.find(m => monthIndex(m.key) >= nowIdx && pending.some(it => it.months.indexOf(m.key) !== -1));
  if (!month) { root.innerHTML = '<p class="dash-empty">Plano de formação concluído 🎉</p>'; return; }
  const items = pending.filter(it => it.months.indexOf(month.key) !== -1).sort((a, b) => a.priority.tier - b.priority.tier);
  const isNow = monthIndex(month.key) <= nowIdx;
  root.innerHTML = '<div class="dash-month-title">' + month.label
    + (isNow ? '' : ' <span class="dash-month-next">a seguir</span>') + '</div>'
    + '<div class="cert-tl-items">' + items.map(it => {
        const ms = (it.milestone && it.milestone.month === month.key) ? ' · ' + it.milestone.label : '';
        return '<span class="cert-tl-chip tl-p' + it.priority.tier + (ms ? ' is-milestone' : '') + '">' + escapeHtml(it.short || it.name) + ms + '</span>';
      }).join('') + '</div>';
}

function renderDashMilestone() {
  const root = document.getElementById('dash-milestone-root');
  if (!root) return;
  const nowIdx = monthIndex(currentMonthKey());
  const next = planItemsPending()
    .filter(it => it.milestone && monthIndex(it.milestone.month) >= nowIdx)
    .sort((a, b) => monthIndex(a.milestone.month) - monthIndex(b.milestone.month))[0];
  if (!next) { root.innerHTML = '<p class="dash-empty">Sem marcos pendentes.</p>'; return; }
  root.innerHTML = '<div class="goal-card">'
    + '<strong>' + next.milestone.label.split(' ')[0] + ' ' + escapeHtml(next.short || next.name) + '</strong>'
    + '<p>' + monthLabel(next.milestone.month) + ' · ' + relativeMonths(next.milestone.month) + '</p>'
    + '<p>' + escapeHtml(next.cost) + '</p>'
    + '</div>';
}

function renderDashCerts() {
  const root = document.getElementById('dash-certs-root');
  if (!root) return;
  const groups = getEffectiveCertGroups();
  root.innerHTML = '<div class="dash-cert-counts">' + groups.map(g =>
      '<button type="button" class="dash-cert-count cert-group-' + g.color + '" onclick="showTab(\'certs\')">'
      + '<span class="dash-cert-num">' + g.entries.length + '</span>'
      + '<span class="dash-cert-name">' + g.icon + ' ' + escapeHtml(g.title) + '</span></button>'
    ).join('') + '</div>';
}

function renderDashPriorities() {
  const root = document.getElementById('dash-priorities-root');
  if (!root) return;
  const state = loadSkillsState();
  root.innerHTML = CAREER_TRACKER_DATA.map(p => {
    const pr = priorityProgress(p, state);
    const period = (p.eyebrow.split(' · ')[1]) || '';
    const n = p.id.slice(1);
    return '<button type="button" class="dash-prio prio-' + n + '" onclick="goToPriority(\'' + p.id + '\')" title="Abrir ' + escapeHtml(p.title) + ' no Career Tracker">'
      + '<span class="prio-badge prio-' + n + '">P' + n + '</span>'
      + '<span class="dash-prio-name">' + escapeHtml(p.title) + '</span>'
      + '<span class="dash-prio-period">' + escapeHtml(period) + '</span>'
      + '<span class="progress-bar-track dash-prio-track" aria-hidden="true"><span class="progress-bar-fill" style="width:' + pr.pct + '%"></span></span>'
      + '<span class="dash-prio-pct">' + pr.done + '/' + pr.total + '</span>'
      + '</button>';
  }).join('');
}

function renderDashboardExtras() {
  renderDashMonth();
  renderDashMilestone();
  renderDashCerts();
  renderDashPriorities();
}

// ── INIT ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initSprintAccessibility();
  initDashboardProgressControl();
  initCareerTracker();
  initCertifications();
  initLearningHub();
  initSkillsMatrix();
  renderDashboardProgress(); // Dashboard "Automático" now reflects the Career Tracker
});