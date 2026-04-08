import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://ugracdwltsflfwieakty.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_zXJ6w0FH5iq2DUTk2kv7BQ_2rpI4LIq';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ONLINE_WINDOW_MS = 45000;
const STUDY_STATUS = '📚 Учусь';

const ACHIEVEMENTS = [
    { id: 'first_step',    icon: '🌱', title: 'Первый шаг',      description: 'Провёл первую учебную сессию',           rarity: 'common',    rarityLabel: 'Обычное' },
    { id: 'comeback',     icon: '🔄', title: 'Возвращение',      description: 'Вернулся к учёбе после перерыва',         rarity: 'common',    rarityLabel: 'Обычное' },
    { id: 'early_bird',   icon: '🌅', title: 'Ранняя пташка',    description: 'Начал учиться до 08:00',                  rarity: 'common',    rarityLabel: 'Обычное' },
    { id: 'night_owl',    icon: '🦉', title: 'Сова',              description: 'Начал учиться ночью',                     rarity: 'common',    rarityLabel: 'Обычное' },
    { id: 'activist',     icon: '💬', title: 'Активист',          description: 'Написал 20 сообщений в чате',             rarity: 'rare',      rarityLabel: 'Редкое' },
    { id: 'speaker',      icon: '🗣️', title: 'Оратор',            description: 'Написал 50 сообщений в чате',             rarity: 'epic',      rarityLabel: 'Эпическое' },
    { id: 'social_legend',icon: '📣', title: 'Голос группы',      description: 'Написал 100 сообщений в чате',            rarity: 'legendary', rarityLabel: 'Легендарное' },
    { id: 'marathon',     icon: '🏃', title: 'Марафонец',          description: 'Проучился более 2 часов за раз',          rarity: 'rare',      rarityLabel: 'Редкое' },
    { id: 'dedication',   icon: '🔥', title: 'Дедикация',          description: 'Накопил 10 часов учёбы суммарно',         rarity: 'epic',      rarityLabel: 'Эпическое' },
    { id: 'legend',       icon: '⚡', title: 'Легенда',            description: 'Накопил 20 часов учёбы суммарно',         rarity: 'legendary', rarityLabel: 'Легендарное' },
    { id: 'veteran',      icon: '🎓', title: 'Ветеран',            description: 'Завершил 10 учебных сессий',              rarity: 'epic',      rarityLabel: 'Эпическое' },
    { id: 'unstoppable',  icon: '🚀', title: 'Неостановимый',      description: 'Завершил 25 учебных сессий',              rarity: 'legendary', rarityLabel: 'Легендарное' },
    { id: 'podium',       icon: '🏆', title: 'Пьедестал',          description: 'Вошёл в топ-3 рейтинга',                 rarity: 'legendary', rarityLabel: 'Легендарное' },
    { id: 'champion',     icon: '👑', title: 'Чемпион',            description: 'Занял 1 место в рейтинге',                rarity: 'legendary', rarityLabel: 'Легендарное' }
];

const ACHIEVEMENTS_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(item => [item.id, item]));

const authScreen           = document.getElementById('authScreen');
const appScreen            = document.getElementById('appScreen');
const googleBtn            = document.getElementById('googleBtn');
const mainNameEl           = document.getElementById('mainName');
const bigTimerTextEl       = document.getElementById('bigTimerText');
const usersListEl          = document.getElementById('usersList');
const chatBoxEl            = document.getElementById('chatBox');
const chatFormEl           = document.getElementById('chatForm');
const chatInputEl          = document.getElementById('chatInput');
const statusMenuBtnEl      = document.getElementById('statusMenuBtn');
const endSessionBtnEl      = document.getElementById('endSessionBtn');
const logoutBtnEl          = document.getElementById('logoutBtn');
const statusMenuEl         = document.getElementById('statusMenu');
const closeMenuBtn         = document.getElementById('closeMenuBtn');
const profileAchievementsEl = document.getElementById('profileAchievements');
const profileStatsEl       = document.getElementById('profileStats');
const summaryStudyingEl    = document.getElementById('summaryStudying');
const summaryBreakEl       = document.getElementById('summaryBreak');
const summaryOfflineEl     = document.getElementById('summaryOffline');
const leaderboardListEl    = document.getElementById('leaderboardList');
const achievementsGridEl   = document.getElementById('achievementsGrid');
const achievementsCountEl  = document.getElementById('achievementsCount');

let me = null;
let myProfile = null;
let groupUsers = [];
let chatMessages = [];
let leaderboardUsers = [];
let myAchievements = [];
let myAchievementIds = new Set();
let activeTab = 'participants';

// ── Realtime channel references (Group 2) ───────────────────────────────────
let chatChannel = null;
let groupChannel = null;

function escapeHtml(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function buildUsername(user) {
    return user?.user_metadata?.full_name?.trim()
        || user?.email?.split('@')[0]
        || 'Пользователь';
}

function getInitials(name = '') {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'П';
    return parts.slice(0, 2).map(part => part[0]?.toUpperCase()).join('');
}

function isOnline(lastSeen) {
    if (!lastSeen) return false;
    return Date.now() - new Date(lastSeen).getTime() < ONLINE_WINDOW_MS;
}

function toDurationSec(iso) {
    if (!iso) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

function formatBigTimer(iso) {
    const sec = toDurationSec(iso);
    if (sec < 60) return `${sec} сек.`;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}ч ${m}м ${s}с`;
    return `${m}м ${s}с`;
}

function formatStudyTime(iso) {
    const sec = toDurationSec(iso);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}ч ${m}м ${s}с`;
}

function formatSeconds(totalSec = 0) {
    const sec = Math.max(0, Number(totalSec) || 0);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}ч ${m}м ${s}с`;
}

function getLiveStudySeconds(user) {
    let total = Number(user.total_study_seconds) || 0;
    if (user.status === STUDY_STATUS && user.status_changed_at) {
        total += toDurationSec(user.status_changed_at);
    }
    return total;
}

function formatShortSeconds(totalSec = 0) {
    const sec = Math.max(0, Number(totalSec) || 0);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}ч ${m}м`;
    if (m > 0) return `${m}м`;
    return `${sec}с`;
}

function setView(view) {
    authScreen.classList.add('hidden');
    appScreen.classList.add('hidden');
    if (view === 'auth') authScreen.classList.remove('hidden');
    if (view === 'app')  appScreen.classList.remove('hidden');
}

function openMenu()  { statusMenuEl.classList.remove('hidden'); }
function closeMenu() { statusMenuEl.classList.add('hidden'); }

function hardLogoutUI() {
    me = null; myProfile = null; groupUsers = []; chatMessages = [];
    leaderboardUsers = []; myAchievements = []; myAchievementIds = new Set();
    setView('auth');
    mainNameEl.textContent = 'Загрузка...';
    bigTimerTextEl.textContent = '0 сек.';
    usersListEl.innerHTML = '<div class="muted">Загрузка списка...</div>';
    chatBoxEl.innerHTML = '<div class="muted">Загрузка чата...</div>';
    if (leaderboardListEl)    leaderboardListEl.innerHTML    = '<div class="muted">Загрузка рейтинга...</div>';
    if (achievementsGridEl)   achievementsGridEl.innerHTML   = '<div class="muted">Загрузка достижений...</div>';
    if (profileAchievementsEl) profileAchievementsEl.innerHTML = '';
    if (profileStatsEl)       profileStatsEl.innerHTML       = '';
}

async function signInWithGoogle() {
    const redirectTo = window.location.origin + window.location.pathname;
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) { alert('Ошибка входа: ' + error.message); console.error(error); return; }
    if (data?.url) window.location.href = data.url;
}

async function signOut() {
    unsubscribeAll();
    try { await supabase.auth.signOut(); } catch (e) { console.error('signOut error', e); }
    hardLogoutUI();
    setTimeout(() => { window.location.href = window.location.pathname + '?logout=' + Date.now(); }, 100);
}

async function getCurrentUser() {
    const { data } = await supabase.auth.getUser();
    return data?.user ?? null;
}

const PROFILE_FIELDS = `id, username, status, color, last_seen, status_changed_at,
    total_study_seconds, session_count, message_count, longest_session_sec`;

async function ensureProfile(user) {
    const username = buildUsername(user);
    const { data: existing, error: selectError } = await supabase
        .from('profiles').select(PROFILE_FIELDS).eq('id', user.id).maybeSingle();
    if (selectError) { alert('Ошибка profiles select: ' + selectError.message); throw selectError; }
    if (!existing) {
        const now = new Date().toISOString();
        const { error: insertError } = await supabase.from('profiles').insert({
            id: user.id, username, status: STUDY_STATUS, color: '#28a745',
            last_seen: now, status_changed_at: now,
            total_study_seconds: 0, session_count: 0, message_count: 0, longest_session_sec: 0
        });
        if (insertError) { alert('Ошибка profiles insert: ' + insertError.message); throw insertError; }
    } else {
        const { error: updateError } = await supabase.from('profiles')
            .update({ username: existing.username || username, last_seen: new Date().toISOString() })
            .eq('id', user.id);
        if (updateError) { alert('Ошибка profiles update: ' + updateError.message); throw updateError; }
    }
}

async function fetchMyProfile() {
    if (!me) return;
    const { data, error } = await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', me.id).maybeSingle();
    if (error) { alert('Ошибка загрузки моего профиля: ' + error.message); console.error(error); return; }
    myProfile = data;
    renderMe();
}

async function fetchGroup() {
    const { data, error } = await supabase.from('profiles').select(PROFILE_FIELDS).order('username', { ascending: true });
    if (error) { usersListEl.innerHTML = '<div class="muted">Ошибка загрузки списка</div>'; console.error(error); return; }
    groupUsers = data || [];
    renderGroup();
    renderPresenceSummary();
}

async function fetchLeaderboard() {
    const { data, error } = await supabase.from('profiles').select(PROFILE_FIELDS)
        .order('total_study_seconds', { ascending: false })
        .order('session_count', { ascending: false })
        .order('username', { ascending: true });
    if (error) { if (leaderboardListEl) leaderboardListEl.innerHTML = '<div class="muted">Ошибка загрузки рейтинга</div>'; console.error(error); return; }
    leaderboardUsers = data || [];
    renderLeaderboard();
}

async function fetchMessages() {
    const { data, error } = await supabase.from('messages').select('id, username, text, created_at')
        .order('created_at', { ascending: true }).limit(100);
    if (error) { chatBoxEl.innerHTML = '<div class="muted">Ошибка загрузки чата</div>'; console.error(error); return; }
    chatMessages = data || [];
    renderMessages();
}

async function fetchMyAchievements() {
    if (!me) return;
    const { data, error } = await supabase.from('user_achievements')
        .select('achievement_id, earned_at').eq('user_id', me.id).order('earned_at', { ascending: true });
    if (error) { console.error('achievements fetch error', error); return; }
    myAchievements = data || [];
    myAchievementIds = new Set((data || []).map(item => item.achievement_id));
    renderProfileAchievements();
    renderAchievements();
}

// ════════════════════════════════════════════════════════════════════════════
// ГРУППА 1 — СТАТИСТИКА И ДАННЫЕ
// ════════════════════════════════════════════════════════════════════════════

/**
 * fetchMyDetailedStats()
 *
 * Загружает детальную статистику текущего пользователя из таблиц profiles и
 * messages, вычисляет на клиенте:
 *   • среднюю продолжительность одной сессии (total_study_seconds / session_count)
 *   • самую длинную сессию (longest_session_sec — уже хранится в profiles)
 *   • количество сообщений в чате (message_count из profiles)
 *   • топ-час активности — час суток, в который отправлено больше всего сообщений
 *
 * Возвращает объект { avgSessionSec, longestSessionSec, messageCount, topHour }
 * или null при ошибке.
 */
async function fetchMyDetailedStats() {
    if (!me) return null;

    // 1. Берём профиль (total_study_seconds, session_count, longest_session_sec, message_count)
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('total_study_seconds, session_count, longest_session_sec, message_count')
        .eq('id', me.id)
        .maybeSingle();

    if (profileError) {
        console.error('fetchMyDetailedStats: profiles error', profileError);
        return null;
    }

    const totalSec    = Number(profile?.total_study_seconds) || 0;
    const sessions    = Number(profile?.session_count) || 0;
    const avgSessionSec  = sessions > 0 ? Math.round(totalSec / sessions) : 0;
    const longestSessionSec = Number(profile?.longest_session_sec) || 0;
    const messageCount  = Number(profile?.message_count) || 0;

    // 2. Загружаем все сообщения пользователя, чтобы найти топ-час активности
    const { data: myMessages, error: msgError } = await supabase
        .from('messages')
        .select('created_at')
        .eq('user_id', me.id);

    if (msgError) {
        console.error('fetchMyDetailedStats: messages error', msgError);
        // Возвращаем частичные данные без topHour
        return { avgSessionSec, longestSessionSec, messageCount, topHour: null };
    }

    // Считаем по часам
    const hourCounts = new Array(24).fill(0);
    (myMessages || []).forEach(msg => {
        const hour = new Date(msg.created_at).getHours();
        hourCounts[hour]++;
    });

    const maxCount = Math.max(...hourCounts);
    const topHour  = maxCount > 0 ? hourCounts.indexOf(maxCount) : null;

    const stats = { avgSessionSec, longestSessionSec, messageCount, topHour };

    console.log('[fetchMyDetailedStats]', stats);
    renderDetailedStats(stats);
    return stats;
}

/**
 * renderDetailedStats(stats)
 *
 * Отрисовывает детальную статистику в блоке #profileStats под основными плитками.
 */
function renderDetailedStats(stats) {
    if (!profileStatsEl) return;

    const topHourLabel = stats.topHour !== null
        ? `${stats.topHour}:00–${stats.topHour + 1}:00`
        : '—';

    // Добавляем расширенный блок после уже существующих плиток
    const existingDetailed = profileStatsEl.querySelector('.detailed-stats');
    if (existingDetailed) existingDetailed.remove();

    const div = document.createElement('div');
    div.className = 'detailed-stats';
    div.style.cssText = 'margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.1);display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;';
    div.innerHTML = `
        <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:8px;text-align:center;">
            <div style="font-size:15px;font-weight:700;color:#fff">${escapeHtml(formatSeconds(stats.avgSessionSec))}</div>
            <div style="color:rgba(255,255,255,0.55);margin-top:2px;">СРЕДНЯЯ СЕССИЯ</div>
        </div>
        <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:8px;text-align:center;">
            <div style="font-size:15px;font-weight:700;color:#fff">${escapeHtml(formatSeconds(stats.longestSessionSec))}</div>
            <div style="color:rgba(255,255,255,0.55);margin-top:2px;">РЕКОРД СЕССИИ</div>
        </div>
        <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:8px;text-align:center;">
            <div style="font-size:15px;font-weight:700;color:#fff">${stats.messageCount}</div>
            <div style="color:rgba(255,255,255,0.55);margin-top:2px;">СООБЩЕНИЙ</div>
        </div>
        <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:8px;text-align:center;">
            <div style="font-size:15px;font-weight:700;color:#fff">${escapeHtml(topHourLabel)}</div>
            <div style="color:rgba(255,255,255,0.55);margin-top:2px;">ТОП-ЧАС</div>
        </div>
    `;
    profileStatsEl.appendChild(div);
}

/**
 * fetchAchievementLeaders()
 *
 * Загружает рейтинг пользователей по количеству полученных достижений.
 * Делает запрос к таблице user_achievements, группирует по user_id,
 * присоединяет username из profiles и сортирует по убыванию count.
 *
 * Возвращает массив { username, count } или [] при ошибке.
 *
 * Примечание: Supabase JS-клиент не поддерживает GROUP BY напрямую,
 * поэтому выбираем все строки и агрегируем на клиенте. Для больших
 * таблиц рекомендуется создать Postgres View или RPC-функцию.
 */
async function fetchAchievementLeaders() {
    // Загружаем все записи из user_achievements
    const { data: rows, error: achError } = await supabase
        .from('user_achievements')
        .select('user_id');

    if (achError) {
        console.error('fetchAchievementLeaders: user_achievements error', achError);
        return [];
    }

    // Считаем достижения на клиенте
    const countMap = {};
    (rows || []).forEach(row => {
        countMap[row.user_id] = (countMap[row.user_id] || 0) + 1;
    });

    if (!Object.keys(countMap).length) return [];

    // Загружаем имена пользователей
    const ids = Object.keys(countMap);
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', ids);

    if (profileError) {
        console.error('fetchAchievementLeaders: profiles error', profileError);
        return [];
    }

    // Собираем итоговый рейтинг
    const leaders = (profiles || [])
        .map(p => ({ username: p.username || 'Пользователь', count: countMap[p.id] || 0 }))
        .sort((a, b) => b.count - a.count);

    console.log('[fetchAchievementLeaders]', leaders);
    renderAchievementLeaders(leaders);
    return leaders;
}

/**
 * renderAchievementLeaders(leaders)
 *
 * Отрисовывает рейтинг по достижениям в конце таба «Достижения».
 */
function renderAchievementLeaders(leaders) {
    const panelEl = document.querySelector('[data-tab-panel="achievements"]');
    if (!panelEl) return;

    let leaderEl = panelEl.querySelector('.achievement-leaders');
    if (!leaderEl) {
        leaderEl = document.createElement('div');
        leaderEl.className = 'achievement-leaders';
        leaderEl.style.cssText = 'margin-top:16px;';
        panelEl.appendChild(leaderEl);
    }

    leaderEl.innerHTML = `
        <div class="section-label" style="margin-bottom:8px;">🏅 РЕЙТИНГ ПО ДОСТИЖЕНИЯМ</div>
        ${leaders.slice(0, 10).map((item, i) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:rgba(255,255,255,0.05);border-radius:8px;margin-bottom:6px;">
                <span style="font-weight:600;">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`} ${escapeHtml(item.username)}</span>
                <span style="color:rgba(255,255,255,0.7);font-size:13px;">${item.count} достиж.</span>
            </div>
        `).join('')}
    `;
}

/**
 * deleteOldMessages(daysOld = 7)
 *
 * Удаляет сообщения из таблицы messages, созданные более daysOld дней назад.
 * Вызывается автоматически при инициализации (раз при загрузке).
 *
 * Требует, чтобы в Supabase RLS была политика DELETE для авторизованных
 * пользователей (или политика для владельца сообщения).
 *
 * Возвращает количество удалённых строк или null при ошибке.
 */
async function deleteOldMessages(daysOld = 7) {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();

    const { data, error, count } = await supabase
        .from('messages')
        .delete({ count: 'exact' })
        .lt('created_at', cutoff);

    if (error) {
        // Не ломаем приложение — просто логируем
        console.warn('[deleteOldMessages] Ошибка очистки чата (возможно, нет прав):', error.message);
        return null;
    }

    const deleted = count ?? (data?.length ?? 0);
    if (deleted > 0) {
        console.log(`[deleteOldMessages] Удалено ${deleted} сообщений старше ${daysOld} дней`);
    }
    return deleted;
}

// ════════════════════════════════════════════════════════════════════════════
// ГРУППА 2 — REALTIME ПОДПИСКИ
// ════════════════════════════════════════════════════════════════════════════

/**
 * subscribeToChat()
 *
 * Подписывается на INSERT-события таблицы messages через Supabase Realtime.
 * При появлении нового сообщения добавляет его в локальный массив chatMessages
 * и перерисовывает чат — без повторного запроса к БД.
 *
 * Заменяет setInterval(fetchMessages, 5000).
 * Возвращает объект канала (RealtimeChannel).
 */
function subscribeToChat() {
    // Если канал уже открыт — не дублируем
    if (chatChannel) return chatChannel;

    chatChannel = supabase
        .channel('realtime:messages')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (payload) => {
                const newMsg = payload.new;
                // Избегаем дублей (на случай если fetchMessages сработал параллельно)
                if (!chatMessages.find(m => m.id === newMsg.id)) {
                    chatMessages.push(newMsg);
                    // Держим не более 100 сообщений в памяти
                    if (chatMessages.length > 100) chatMessages.shift();
                    renderMessages();
                }
            }
        )
        .subscribe((status) => {
            console.log('[subscribeToChat] статус канала:', status);
        });

    return chatChannel;
}

/**
 * subscribeToGroup()
 *
 * Подписывается на INSERT и UPDATE события таблицы profiles через Supabase Realtime.
 * При изменении любого профиля обновляет локальный массив groupUsers и перерисовывает:
 *   • список участников
 *   • сводку присутствия (УЧАТСЯ / ПЕРЕРЫВ / ОФЛАЙН)
 *   • рейтинг (если активен соответствующий таб)
 *
 * Заменяет setInterval(fetchGroup, 5000) и setInterval(fetchLeaderboard, 5000).
 * Возвращает объект канала (RealtimeChannel).
 */
function subscribeToGroup() {
    if (groupChannel) return groupChannel;

    groupChannel = supabase
        .channel('realtime:profiles')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'profiles' },
            (payload) => {
                const newUser = payload.new;
                if (!groupUsers.find(u => u.id === newUser.id)) {
                    groupUsers.push(newUser);
                }
                renderGroup();
                renderPresenceSummary();
            }
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'profiles' },
            (payload) => {
                const updated = payload.new;

                // Обновляем в groupUsers
                const idx = groupUsers.findIndex(u => u.id === updated.id);
                if (idx !== -1) {
                    groupUsers[idx] = { ...groupUsers[idx], ...updated };
                } else {
                    groupUsers.push(updated);
                }

                // Обновляем в leaderboardUsers
                const lIdx = leaderboardUsers.findIndex(u => u.id === updated.id);
                if (lIdx !== -1) {
                    leaderboardUsers[lIdx] = { ...leaderboardUsers[lIdx], ...updated };
                } else {
                    leaderboardUsers.push(updated);
                }

                // Если это наш профиль — обновляем локально
                if (me && updated.id === me.id) {
                    myProfile = { ...myProfile, ...updated };
                    renderMe();
                }

                renderGroup();
                renderPresenceSummary();
                if (activeTab === 'leaderboard') renderLeaderboard();
            }
        )
        .subscribe((status) => {
            console.log('[subscribeToGroup] статус канала:', status);
        });

    return groupChannel;
}

/**
 * unsubscribeAll()
 *
 * Отписывается от всех Realtime-каналов и обнуляет ссылки.
 * Вызывается при выходе из аккаунта.
 */
function unsubscribeAll() {
    if (chatChannel) {
        supabase.removeChannel(chatChannel);
        chatChannel = null;
    }
    if (groupChannel) {
        supabase.removeChannel(groupChannel);
        groupChannel = null;
    }
}

// ════════════════════════════════════════════════════════════════════════════
// Остальной код (без изменений)
// ════════════════════════════════════════════════════════════════════════════

function getMyRank() {
    if (!me || !leaderboardUsers.length) return null;
    const index = leaderboardUsers.findIndex(user => user.id === me.id);
    return index >= 0 ? index + 1 : null;
}

function getAchievementIdsToAward(profile, context = {}) {
    const ids = new Set();
    const totalStudy    = Number(profile?.total_study_seconds) || 0;
    const sessionCount  = Number(profile?.session_count) || 0;
    const messageCount  = Number(profile?.message_count) || 0;
    const longestSession = Number(profile?.longest_session_sec) || 0;
    const rank = getMyRank();

    if (sessionCount >= 1)  ids.add('first_step');
    if (sessionCount >= 10) ids.add('veteran');
    if (sessionCount >= 25) ids.add('unstoppable');
    if (messageCount >= 20) ids.add('activist');
    if (messageCount >= 50) ids.add('speaker');
    if (messageCount >= 100) ids.add('social_legend');
    if (totalStudy >= 10 * 3600) ids.add('dedication');
    if (totalStudy >= 20 * 3600) ids.add('legend');
    if (longestSession >= 2 * 3600) ids.add('marathon');
    if (rank && rank <= 3) ids.add('podium');
    if (rank === 1) ids.add('champion');

    if (context.previousStatus && context.previousStatus !== STUDY_STATUS && context.newStatus === STUDY_STATUS)
        ids.add('comeback');

    if (context.newStatus === STUDY_STATUS && typeof context.startedHour === 'number') {
        if (context.startedHour < 8) ids.add('early_bird');
        if (context.startedHour >= 0 && context.startedHour < 5) ids.add('night_owl');
    }

    return [...ids].filter(id => !myAchievementIds.has(id));
}

async function awardAchievements(ids = []) {
    const freshIds = [...new Set(ids)].filter(id => !myAchievementIds.has(id));
    if (!freshIds.length || !me) return;
    const rows = freshIds.map(id => ({ user_id: me.id, achievement_id: id }));
    const { error } = await supabase.from('user_achievements')
        .upsert(rows, { onConflict: 'user_id,achievement_id', ignoreDuplicates: true });
    if (error) { console.error('awardAchievements error', error); return; }
    freshIds.forEach(id => myAchievementIds.add(id));
    await fetchMyAchievements();
}

async function syncAchievements(context = {}) {
    if (!myProfile) return;
    const ids = getAchievementIdsToAward(myProfile, context);
    await awardAchievements(ids);
}

function renderMe() {
    mainNameEl.textContent = myProfile?.username || buildUsername(me) || 'Пользователь';
    if (!myProfile) {
        bigTimerTextEl.textContent = '0 сек.';
        statusMenuBtnEl.textContent = '☕ Перерыв';
        if (profileStatsEl) profileStatsEl.innerHTML = '';
        if (profileAchievementsEl) profileAchievementsEl.innerHTML = '';
        return;
    }
    const timerMap = {
        [STUDY_STATUS]: () => formatBigTimer(myProfile.status_changed_at),
        '☕ Перерыв': () => 'Перерыв',
        '🎮 В игре': () => 'В игре',
        '🏠 Дома': () => 'Дома',
        '⛔ Сессия завершена': () => 'Сессия завершена'
    };
    bigTimerTextEl.textContent = (timerMap[myProfile.status] || (() => '0 сек.'))();
    statusMenuBtnEl.textContent = myProfile.status || '☕ Перерыв';
    if (profileStatsEl) {
        profileStatsEl.innerHTML = `
            <div class="profile-stat"><div class="profile-stat-value">${escapeHtml(formatShortSeconds(myProfile.total_study_seconds || 0))}</div><div class="profile-stat-label">УЧЕБА</div></div>
            <div class="profile-stat"><div class="profile-stat-value">${Number(myProfile.session_count) || 0}</div><div class="profile-stat-label">СЕССИЙ</div></div>
            <div class="profile-stat"><div class="profile-stat-value">${Number(myProfile.message_count) || 0}</div><div class="profile-stat-label">СООБЩ.</div></div>
            <div class="profile-stat"><div class="profile-stat-value">${myAchievementIds.size}</div><div class="profile-stat-label">ДОСТИЖ.</div></div>
        `;
        // Обновляем детальную статистику если она уже была загружена
        const existingDetailed = profileStatsEl.querySelector('.detailed-stats');
        if (existingDetailed) fetchMyDetailedStats();
    }
    renderProfileAchievements();
}

function renderProfileAchievements() {
    if (!profileAchievementsEl) return;
    const unlocked = myAchievements.map(item => ACHIEVEMENTS_BY_ID[item.achievement_id]).filter(Boolean).slice(0, 4);
    profileAchievementsEl.innerHTML = unlocked.map(item =>
        `<div class="mini-achievement mini-${escapeHtml(item.rarity)}"><span>${escapeHtml(item.icon)}</span><span>${escapeHtml(item.title)}</span></div>`
    ).join('');
}

function renderGroup() {
    if (!groupUsers.length) { usersListEl.innerHTML = '<div class="muted">Пока нет участников.</div>'; return; }
    usersListEl.innerHTML = groupUsers.map(user => {
        const online = isOnline(user.last_seen);
        const studying = user.status === STUDY_STATUS;
        return `
            <div class="user-item">
                <div class="user-left">
                    <div class="status-dot ${online ? 'online' : ''}"></div>
                    <div class="user-name">${escapeHtml(user.username || 'Без имени')}</div>
                </div>
                <div class="user-right">
                    <div class="user-status">${escapeHtml(user.status || 'Без статуса')}</div>
                    ${studying ? `<div class="study-time">⏱ ${escapeHtml(formatStudyTime(user.status_changed_at))}</div>` : ''}
                    <div class="online-text ${online ? 'is-online' : ''}">${online ? '● Онлайн' : '● Офлайн'}</div>
                </div>
            </div>`;
    }).join('');
}

function renderPresenceSummary() {
    if (!summaryStudyingEl || !summaryBreakEl || !summaryOfflineEl) return;
    summaryStudyingEl.textContent = groupUsers.filter(u => isOnline(u.last_seen) && u.status === STUDY_STATUS).length;
    summaryBreakEl.textContent    = groupUsers.filter(u => isOnline(u.last_seen) && u.status !== STUDY_STATUS).length;
    summaryOfflineEl.textContent  = groupUsers.filter(u => !isOnline(u.last_seen)).length;
}

function renderMessages() {
    if (!chatMessages.length) { chatBoxEl.innerHTML = '<div class="muted">Пока нет сообщений.</div>'; return; }
    chatBoxEl.innerHTML = chatMessages.map(msg =>
        `<div class="chat-line"><strong>${escapeHtml(msg.username)}:</strong> ${escapeHtml(msg.text)}</div>`
    ).join('');
    chatBoxEl.scrollTop = chatBoxEl.scrollHeight;
}

function getMedalByRank(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
}

function renderLeaderboard() {
    if (!leaderboardListEl) return;
    if (!leaderboardUsers.length) { leaderboardListEl.innerHTML = '<div class="muted">Пока нет данных рейтинга.</div>'; return; }
    const sorted = [...leaderboardUsers].sort((a, b) => getLiveStudySeconds(b) - getLiveStudySeconds(a));
    leaderboardListEl.innerHTML = sorted.map((user, index) => {
        const rank = index + 1;
        return `
            <div class="leader-item ${rank <= 3 ? `top-${rank}` : ''}">
                <div class="leader-left">
                    <div class="leader-rank">${escapeHtml(getMedalByRank(rank))}</div>
                    <div class="leader-avatar" style="background:${escapeHtml(user.color || '#4b5563')}">${escapeHtml(getInitials(user.username || 'П'))}</div>
                    <div class="leader-meta">
                        <div class="leader-name">${escapeHtml(user.username || 'Без имени')}</div>
                        <div class="leader-sub">${Number(user.session_count) || 0} сессий</div>
                    </div>
                </div>
                <div class="leader-right">${escapeHtml(formatSeconds(getLiveStudySeconds(user)))}</div>
            </div>`;
    }).join('');
}

function renderAchievements() {
    if (achievementsCountEl) achievementsCountEl.textContent = `${myAchievementIds.size}/${ACHIEVEMENTS.length}`;
    if (!achievementsGridEl) return;
    achievementsGridEl.innerHTML = ACHIEVEMENTS.map(item => {
        const unlocked = myAchievementIds.has(item.id);
        return `
            <div class="achievement-card ${unlocked ? 'unlocked' : 'locked'} rarity-${escapeHtml(item.rarity)}">
                <div class="achievement-card-head">
                    <div class="achievement-icon">${unlocked ? escapeHtml(item.icon) : '🔒'}</div>
                    ${!unlocked ? '<div class="achievement-lock">🔒</div>' : ''}
                </div>
                <div class="achievement-title">${escapeHtml(item.title)}</div>
                <div class="achievement-desc">${escapeHtml(item.description)}</div>
                <div class="achievement-rarity">${escapeHtml(item.rarityLabel)}</div>
            </div>`;
    }).join('');
}

function switchTab(tabName) {
    activeTab = tabName;
    document.querySelectorAll('[data-tab-btn]').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.tabBtn === tabName));
    document.querySelectorAll('[data-tab-panel]').forEach(panel =>
        panel.classList.toggle('hidden', panel.dataset.tabPanel !== tabName));

    // При переходе на таб достижений — подгружаем рейтинг по достижениям
    if (tabName === 'achievements') fetchAchievementLeaders();
}

async function incrementMyMessageCount() {
    if (!me || !myProfile) return;
    const nextCount = (Number(myProfile.message_count) || 0) + 1;
    const { error } = await supabase.from('profiles')
        .update({ message_count: nextCount, last_seen: new Date().toISOString() }).eq('id', me.id);
    if (error) { console.error('incrementMyMessageCount error', error); return; }
    myProfile.message_count = nextCount;
    renderMe();
}

async function sendMessage(text) {
    const clean = text.trim();
    if (!clean || !me || !myProfile) return;
    const { error } = await supabase.from('messages').insert({
        user_id: me.id, username: myProfile.username || buildUsername(me), text: clean
    });
    if (error) { alert('Ошибка отправки сообщения: ' + error.message); console.error(error); return; }
    chatInputEl.value = '';
    await incrementMyMessageCount();
    // fetchMessages() больше не нужен — Realtime сам добавит сообщение
    await fetchLeaderboard();
    await syncAchievements();
}

async function setStatus(status, color) {
    if (!me || !myProfile) return;
    const nowIso = new Date().toISOString();
    const previousStatus = myProfile.status;
    const startedHour = new Date().getHours();
    const updatePayload = { status, color, last_seen: nowIso, status_changed_at: nowIso };
    if (previousStatus === STUDY_STATUS && status !== STUDY_STATUS) {
        const currentSessionSec = toDurationSec(myProfile.status_changed_at);
        updatePayload.total_study_seconds = (Number(myProfile.total_study_seconds) || 0) + currentSessionSec;
        updatePayload.session_count       = (Number(myProfile.session_count) || 0) + 1;
        updatePayload.longest_session_sec = Math.max(Number(myProfile.longest_session_sec) || 0, currentSessionSec);
    }
    const { error } = await supabase.from('profiles').update(updatePayload).eq('id', me.id);
    if (error) { alert('Ошибка обновления статуса: ' + error.message); console.error(error); return; }
    closeMenu();
    await fetchMyProfile();
    // fetchGroup() и fetchLeaderboard() больше не нужны — Realtime обновит сам
    await syncAchievements({ previousStatus, newStatus: status, startedHour });
}

async function endSession() { await setStatus('⛔ Сессия завершена', '#e53345'); }

async function heartbeat() {
    if (!me) return;
    await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', me.id);
}

function tick() {
    if (myProfile?.status === STUDY_STATUS)
        bigTimerTextEl.textContent = formatBigTimer(myProfile.status_changed_at);
    renderGroup();
    if (activeTab === 'leaderboard') renderLeaderboard();
}

// ── Event listeners ──────────────────────────────────────────────────────────
googleBtn.addEventListener('click', signInWithGoogle);
logoutBtnEl.addEventListener('click', signOut);
endSessionBtnEl.addEventListener('click', endSession);
statusMenuBtnEl.addEventListener('click', openMenu);
closeMenuBtn.addEventListener('click', closeMenu);
statusMenuEl.addEventListener('click', e => { if (e.target === statusMenuEl) closeMenu(); });

document.addEventListener('click', e => {
    const tabBtn = e.target.closest('[data-tab-btn]');
    if (tabBtn) switchTab(tabBtn.dataset.tabBtn);
});

document.querySelectorAll('.status-option[data-status]').forEach(btn => {
    btn.addEventListener('click', async () => { await setStatus(btn.dataset.status, btn.dataset.color); });
});

chatFormEl.addEventListener('submit', async e => {
    e.preventDefault();
    await sendMessage(chatInputEl.value);
});

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
    try {
        me = await getCurrentUser();
        if (!me) { setView('auth'); return; }
        setView('app');
        await ensureProfile(me);
        await fetchMyProfile();
        await fetchGroup();
        await fetchMessages();
        await fetchLeaderboard();
        await fetchMyAchievements();
        await syncAchievements();
        await heartbeat();
        switchTab(activeTab);

        // Группа 1: загружаем детальную статистику
        await fetchMyDetailedStats();

        // Группа 1: тихая очистка старых сообщений (7 дней)
        deleteOldMessages(7);

        // Группа 2: запускаем Realtime-подписки вместо setInterval для чата и группы
        subscribeToChat();
        subscribeToGroup();

        // Heartbeat и тик остаются на интервалах
        setInterval(heartbeat, 20000);
        setInterval(tick, 1000);

        // fetchLeaderboard оставляем на интервале — он не покрыт Realtime
        setInterval(fetchLeaderboard, 10000);

    } catch (e) {
        console.error('INIT ERROR', e);
        alert('Ошибка инициализации: ' + (e?.message || 'unknown'));
    }
}

init();
