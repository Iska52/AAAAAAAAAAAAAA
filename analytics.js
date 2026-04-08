import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL  = 'https://ugracdwltsflfwieakty.supabase.co';
const SUPABASE_ANON = 'sb_publishable_zXJ6w0FH5iq2DUTk2kv7BQ_2rpI4LIq';
const _sb = createClient(SUPABASE_URL, SUPABASE_ANON);

const ACCENT     = '#4f98a3';
const ACCENT_DIM = 'rgba(79,152,163,0.18)';
const GRID_COL   = 'rgba(255,255,255,0.07)';
const TEXT_COL   = 'rgba(255,255,255,0.45)';

const _charts = {};
function destroyChart(id) {
    if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
}

function baseOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.85)',
                titleColor: '#fff',
                bodyColor: 'rgba(255,255,255,0.7)',
                padding: 10,
                cornerRadius: 8,
                displayColors: false,
            }
        },
        scales: {
            x: { grid: { color: GRID_COL }, ticks: { color: TEXT_COL, font: { size: 11 } } },
            y: { grid: { color: GRID_COL }, ticks: { color: TEXT_COL, font: { size: 11 } }, beginAtZero: true }
        }
    };
}

// ── Public ────────────────────────────────────────────────────────────────
export async function renderAnalytics(userId) {
    if (!userId) return;
    _showSkeletons();
    const [profile, messages] = await Promise.all([
        _fetchProfile(userId),
        _fetchMessages(userId)
    ]);
    if (!profile) { _showError(); return; }
    _renderKpis(profile, messages);
    _renderHourly(messages);
    _renderHeatmap(messages);
    _renderTimeline(messages);
}

// ── Data ──────────────────────────────────────────────────────────────────
async function _fetchProfile(uid) {
    const { data, error } = await _sb
        .from('profiles')
        .select('total_study_seconds,session_count,message_count,longest_session_sec')
        .eq('id', uid)
        .maybeSingle();
    if (error) { console.error('[analytics] profile', error); return null; }
    return data;
}
async function _fetchMessages(uid) {
    const { data, error } = await _sb
        .from('messages')
        .select('created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: true });
    if (error) { console.error('[analytics] messages', error); return []; }
    return data || [];
}

// ── Skeletons / Error ─────────────────────────────────────────────────────
function _showSkeletons() {
    const el = document.getElementById('statsKpis');
    if (!el) return;
    el.innerHTML = Array.from({ length: 4 }).map(() =>
        `<div class="stats-kpi stats-skeleton" style="height:72px;"></div>`
    ).join('');
}
function _showError() {
    const el = document.getElementById('statsKpis');
    if (el) el.innerHTML = `<div class="muted" style="grid-column:span 2">Не удалось загрузить статистику</div>`;
}

// ── KPIs ──────────────────────────────────────────────────────────────────
function _renderKpis(profile, messages) {
    const el = document.getElementById('statsKpis');
    if (!el) return;

    const totalSec   = Number(profile.total_study_seconds) || 0;
    const sessions   = Number(profile.session_count) || 0;
    const msgCount   = Number(profile.message_count) || 0;
    const longestSec = Number(profile.longest_session_sec) || 0;
    const avgSec     = sessions > 0 ? Math.round(totalSec / sessions) : 0;

    const hourCounts = new Array(24).fill(0);
    messages.forEach(m => hourCounts[new Date(m.created_at).getHours()]++);
    const maxH     = Math.max(...hourCounts);
    const topHour  = maxH > 0 ? hourCounts.indexOf(maxH) : null;
    const topLabel = topHour !== null ? `${topHour}:00–${topHour + 1}:00` : '—';
    const activeDays = new Set(messages.map(m => m.created_at.slice(0, 10))).size;

    const kpis = [
        { icon: '📚', value: _fmtH(totalSec),      label: 'ВСЕГО УЧЁБЫ',      sub: `${sessions} сессий` },
        { icon: '⏱️', value: _fmtD(avgSec),        label: 'СРЕДНЯЯ СЕССИЯ',   sub: `рекорд ${_fmtD(longestSec)}` },
        { icon: '💬', value: String(msgCount),      label: 'СООБЩЕНИЙ',        sub: `${activeDays} дн. активности` },
        { icon: '🕐', value: topLabel,              label: 'ТОП-ЧАС',          sub: maxH > 0 ? `${maxH} сообщ.` : 'нет данных' },
    ];

    el.innerHTML = kpis.map(k => `
        <div class="stats-kpi">
            <div style="font-size:18px;margin-bottom:4px">${k.icon}</div>
            <div class="stats-kpi-value">${k.value}</div>
            <div class="stats-kpi-label">${k.label}</div>
            <div class="stats-kpi-sub">${k.sub}</div>
        </div>
    `).join('');
}

// ── Chart: Hourly ─────────────────────────────────────────────────────────
function _renderHourly(messages) {
    const canvas = document.getElementById('chartHourly');
    if (!canvas) return;
    const counts = new Array(24).fill(0);
    messages.forEach(m => counts[new Date(m.created_at).getHours()]++);
    const max    = Math.max(...counts, 1);
    const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const bgColors = counts.map(v => `rgba(79,152,163,${(0.25 + (v / max) * 0.65).toFixed(2)})`);

    destroyChart('hourly');
    const opts = baseOptions();
    _charts['hourly'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: counts,
                backgroundColor: bgColors,
                borderColor: counts.map(v => v === max ? ACCENT : 'transparent'),
                borderWidth: 1.5,
                borderRadius: 4,
                borderSkipped: false,
            }]
        },
        options: {
            ...opts,
            plugins: { ...opts.plugins, tooltip: { ...opts.plugins.tooltip, callbacks: {
                title: ctx => `${ctx[0].label} — ${ctx[0].label.replace(':00', ':59')}`,
                label:  ctx => `${ctx.raw} сообщений`
            }}},
            scales: { ...opts.scales, x: { ...opts.scales.x, ticks: { ...opts.scales.x.ticks, maxRotation: 0, maxTicksLimit: 8 } } }
        }
    });
}

// ── Heatmap ───────────────────────────────────────────────────────────────
function _renderHeatmap(messages) {
    const grid = document.getElementById('heatmapGrid');
    if (!grid) return;
    const dayCounts = {};
    messages.forEach(m => {
        const d = m.created_at.slice(0, 10);
        dayCounts[d] = (dayCounts[d] || 0) + 1;
    });
    const days = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
    }
    const max = Math.max(...Object.values(dayCounts), 1);
    const dn  = ['вс','пн','вт','ср','чт','пт','сб'];
    grid.innerHTML = days.map(day => {
        const c   = dayCounts[day] || 0;
        const alpha = c === 0 ? 0 : Math.max(0.18, c / max);
        const bg  = c === 0 ? 'var(--card2)' : `rgba(79,152,163,${alpha.toFixed(2)})`;
        const obj = new Date(day + 'T12:00:00');
        const tip = `${dn[obj.getDay()]} ${String(obj.getDate()).padStart(2,'0')}.${String(obj.getMonth()+1).padStart(2,'0')} — ${c} сообщ.`;
        return `<div class="heatmap-cell" style="background:${bg}" title="${tip}"><div class="heatmap-cell-tooltip">${tip}</div></div>`;
    }).join('');
}

// ── Chart: Timeline ───────────────────────────────────────────────────────
function _renderTimeline(messages) {
    const canvas = document.getElementById('chartTimeline');
    if (!canvas) return;
    const dayCounts = {};
    messages.forEach(m => {
        const d = m.created_at.slice(0, 10);
        dayCounts[d] = (dayCounts[d] || 0) + 1;
    });
    const labels = [], data = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const k = d.toISOString().slice(0, 10);
        labels.push(`${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`);
        data.push(dayCounts[k] || 0);
    }
    const trend = data.map((_, i) => {
        const sl = data.slice(Math.max(0, i - 1), i + 2);
        return Math.round(sl.reduce((a, b) => a + b, 0) / sl.length);
    });

    destroyChart('timeline');
    const opts = baseOptions();
    _charts['timeline'] = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Сообщений',
                    data,
                    borderColor: ACCENT,
                    backgroundColor: ACCENT_DIM,
                    borderWidth: 2,
                    pointBackgroundColor: ACCENT,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.35,
                },
                {
                    label: 'Тренд',
                    data: trend,
                    borderColor: 'rgba(255,255,255,0.25)',
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    fill: false,
                    tension: 0.4,
                }
            ]
        },
        options: {
            ...opts,
            plugins: {
                ...opts.plugins,
                legend: { display: true, labels: { color: TEXT_COL, font: { size: 11 }, boxWidth: 12, padding: 12 } },
                tooltip: { ...opts.plugins.tooltip, callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}` } }
            }
        }
    });
}

// ── Utils ─────────────────────────────────────────────────────────────────
function _fmtH(s) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}ч ${m}м` : `${m}м`;
}
function _fmtD(s) {
    if (!s) return '0м';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}ч ${m}м` : `${m}м`;
}
