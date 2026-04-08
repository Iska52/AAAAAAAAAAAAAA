// analytics.js — рендерит статистику в существующие элементы index.html:
// #statsKpis, #chartHourly, #heatmapGrid, #chartTimeline
// Требует Chart.js загруженного глобально через CDN в index.html

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://ugracdwltsflfwieakty.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_zXJ6w0FH5iq2DUTk2kv7BQ_2rpI4LIq';
const _sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ACCENT     = '#4f98a3';
const ACCENT_DIM = 'rgba(79,152,163,0.18)';
const GRID_COLOR = 'rgba(255,255,255,0.07)';
const TEXT_COLOR = 'rgba(255,255,255,0.45)';

const _charts = {};
function _destroyChart(id) {
    if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
}

function _baseOpts() {
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
            x: { grid: { color: GRID_COLOR }, ticks: { color: TEXT_COLOR, font: { size: 11 } } },
            y: { grid: { color: GRID_COLOR }, ticks: { color: TEXT_COLOR, font: { size: 11 } }, beginAtZero: true }
        }
    };
}

// ══════════════════════════════════════════════════════════════
// ГЛАВНАЯ ЭКСПОРТНАЯ ФУНКЦИЯ
// ══════════════════════════════════════════════════════════════

export async function renderAnalytics(userId) {
    if (!userId) return;
    _injectStyles();
    _renderKpiSkeletons();

    const [profile, messages] = await Promise.all([
        _fetchProfile(userId),
        _fetchMessages(userId),
    ]);

    if (!profile) {
        const el = document.getElementById('statsKpis');
        if (el) el.innerHTML = '<div style="color:rgba(255,255,255,0.4);font-size:13px;">Нет данных</div>';
        return;
    }

    _renderKpis(profile, messages);
    _renderHourlyChart(messages);
    _renderHeatmap(messages);
    _renderTimelineChart(messages);
}

// ── Запросы ──────────────────────────────────────────────────

async function _fetchProfile(userId) {
    const { data, error } = await _sb
        .from('profiles')
        .select('total_study_seconds, session_count, message_count, longest_session_sec, username')
        .eq('id', userId)
        .maybeSingle();
    if (error) { console.error('[analytics] profile', error); return null; }
    return data;
}

async function _fetchMessages(userId) {
    const { data, error } = await _sb
        .from('messages')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
    if (error) { console.error('[analytics] messages', error); return []; }
    return data || [];
}

// ── Стили ────────────────────────────────────────────────────

function _injectStyles() {
    if (document.getElementById('_analytics_css')) return;
    const s = document.createElement('style');
    s.id = '_analytics_css';
    s.textContent = `
        @keyframes _shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}

        .a-kpi-grid{
            display:grid;
            grid-template-columns:repeat(2,1fr);
            gap:10px;
            margin-bottom:4px;
        }
        .a-kpi{
            background:rgba(255,255,255,0.04);
            border:1px solid rgba(79,152,163,0.22);
            border-radius:10px;
            padding:12px 10px;
            text-align:center;
            transition:transform .15s,box-shadow .15s;
        }
        .a-kpi:hover{transform:translateY(-2px);box-shadow:0 4px 18px rgba(79,152,163,0.15);}
        .a-kpi-icon{font-size:18px;margin-bottom:4px;}
        .a-kpi-value{
            font-size:18px;
            font-weight:700;
            font-variant-numeric:tabular-nums;
            color:#fff;
            line-height:1.2;
        }
        .a-kpi-label{
            font-size:10px;
            letter-spacing:.06em;
            text-transform:uppercase;
            color:rgba(255,255,255,0.4);
            margin-top:3px;
        }
        .a-kpi-sub{
            font-size:11px;
            color:rgba(255,255,255,0.3);
            margin-top:2px;
        }
        .a-skeleton{
            animation:_shimmer 1.4s ease infinite;
            background:linear-gradient(90deg,rgba(255,255,255,0.05) 25%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.05) 75%);
            background-size:200% 100%;
            border-radius:10px;
        }
        .heatmap-grid{
            display:grid;
            grid-template-columns:repeat(10,1fr);
            gap:4px;
        }
        .heatmap-cell{
            aspect-ratio:1;
            border-radius:4px;
            position:relative;
            cursor:default;
            transition:transform .1s;
        }
        .heatmap-cell:hover{transform:scale(1.3);z-index:2;}
        .heatmap-cell:hover .heatmap-tip{display:block;}
        .heatmap-tip{
            display:none;
            position:absolute;
            bottom:130%;
            left:50%;
            transform:translateX(-50%);
            background:rgba(0,0,0,0.88);
            color:#fff;
            font-size:10px;
            padding:4px 8px;
            border-radius:6px;
            white-space:nowrap;
            pointer-events:none;
            z-index:10;
        }
        .chart-wrap{
            position:relative;
            height:140px;
        }
    `;
    document.head.appendChild(s);
}

// ── Скелетон ─────────────────────────────────────────────────

function _renderKpiSkeletons() {
    const el = document.getElementById('statsKpis');
    if (!el) return;
    el.innerHTML = `
        <div class="a-kpi-grid">
            ${Array.from({length:4}).map(()=>`<div class="a-kpi a-skeleton" style="height:80px;"></div>`).join('')}
        </div>
    `;
}

// ── KPI-плитки ────────────────────────────────────────────────

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
    const maxHC    = Math.max(...hourCounts);
    const topHour  = maxHC > 0 ? hourCounts.indexOf(maxHC) : null;
    const topLabel = topHour !== null ? `${topHour}:00–${topHour+1}:00` : '—';
    const activeDays = new Set(messages.map(m => m.created_at.slice(0,10))).size;

    const kpis = [
        { icon:'📚', value: _fmtH(totalSec),    label:'ВСЕГО УЧЁБЫ',    sub:`${sessions} сессий` },
        { icon:'⏱️', value: _fmtD(avgSec),      label:'СРЕДНЯЯ СЕССИЯ', sub:`рекорд: ${_fmtD(longestSec)}` },
        { icon:'💬', value: msgCount,            label:'СООБЩЕНИЙ',      sub:`${activeDays} активных дней` },
        { icon:'🕐', value: topLabel,            label:'ТОП-ЧАС',        sub: maxHC > 0 ? `${maxHC} сообщ.` : 'нет данных' },
    ];

    el.innerHTML = `
        <div class="a-kpi-grid">
            ${kpis.map(k=>`
                <div class="a-kpi">
                    <div class="a-kpi-icon">${k.icon}</div>
                    <div class="a-kpi-value">${k.value}</div>
                    <div class="a-kpi-label">${k.label}</div>
                    ${k.sub ? `<div class="a-kpi-sub">${k.sub}</div>` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

// ── Бар-чарт по часам ────────────────────────────────────────

function _renderHourlyChart(messages) {
    const canvas = document.getElementById('chartHourly');
    if (!canvas) return;
    if (typeof Chart === 'undefined') { console.warn('[analytics] Chart.js not loaded'); return; }

    const counts = new Array(24).fill(0);
    messages.forEach(m => counts[new Date(m.created_at).getHours()]++);
    const labels = Array.from({length:24}, (_,i) => `${i}`);
    const max = Math.max(...counts, 1);
    const bgColors = counts.map(v => `rgba(79,152,163,${(0.2 + (v/max)*0.7).toFixed(2)})`);
    const borderColors = counts.map(v => v === max && v > 0 ? ACCENT : 'transparent');

    _destroyChart('hourly');
    const opts = _baseOpts();
    _charts['hourly'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: counts,
                backgroundColor: bgColors,
                borderColor: borderColors,
                borderWidth: 1.5,
                borderRadius: 3,
                borderSkipped: false,
            }]
        },
        options: {
            ...opts,
            plugins: {
                ...opts.plugins,
                tooltip: {
                    ...opts.plugins.tooltip,
                    callbacks: {
                        title: ctx => `${ctx[0].label}:00–${Number(ctx[0].label)+1}:00`,
                        label: ctx => `${ctx.raw} сообщений`
                    }
                }
            },
            scales: {
                ...opts.scales,
                x: {
                    ...opts.scales.x,
                    ticks: { ...opts.scales.x.ticks, maxRotation: 0, maxTicksLimit: 12 }
                }
            }
        }
    });
}

// ── Тепловая карта (30 дней) ─────────────────────────────────

function _renderHeatmap(messages) {
    const grid = document.getElementById('heatmapGrid');
    if (!grid) return;

    const dayCounts = {};
    messages.forEach(m => {
        const d = m.created_at.slice(0,10);
        dayCounts[d] = (dayCounts[d] || 0) + 1;
    });

    const days = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0,10));
    }

    const max = Math.max(...Object.values(dayCounts), 1);
    const DOW = ['вс','пн','вт','ср','чт','пт','сб'];

    grid.className = 'heatmap-grid';
    grid.innerHTML = days.map(day => {
        const count = dayCounts[day] || 0;
        const intensity = count === 0 ? 0 : Math.max(0.15, count / max);
        const bg = count === 0
            ? 'rgba(255,255,255,0.07)'
            : `rgba(79,152,163,${intensity.toFixed(2)})`;
        const dateObj = new Date(day + 'T12:00:00');
        const dd = dateObj.getDate().toString().padStart(2,'0');
        const mm = (dateObj.getMonth()+1).toString().padStart(2,'0');
        const tip = `${DOW[dateObj.getDay()]} ${dd}.${mm} — ${count} сообщ.`;
        return `
            <div class="heatmap-cell" style="background:${bg};" aria-label="${tip}">
                <div class="heatmap-tip">${tip}</div>
            </div>`;
    }).join('');
}

// ── Линейный график (14 дней) ─────────────────────────────────

function _renderTimelineChart(messages) {
    const canvas = document.getElementById('chartTimeline');
    if (!canvas) return;
    if (typeof Chart === 'undefined') return;

    const dayCounts = {};
    messages.forEach(m => {
        const d = m.created_at.slice(0,10);
        dayCounts[d] = (dayCounts[d] || 0) + 1;
    });

    const labels = [];
    const data = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0,10);
        labels.push(`${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}`);
        data.push(dayCounts[key] || 0);
    }

    const trend = data.map((_,i) => {
        const slice = data.slice(Math.max(0,i-1), i+2);
        return Math.round(slice.reduce((a,b) => a+b, 0) / slice.length);
    });

    _destroyChart('timeline');
    const opts = _baseOpts();
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
                    borderColor: 'rgba(255,255,255,0.22)',
                    borderWidth: 1.5,
                    borderDash: [4,4],
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
                legend: {
                    display: true,
                    labels: { color: TEXT_COLOR, font: { size: 11 }, boxWidth: 12, padding: 12 }
                },
                tooltip: {
                    ...opts.plugins.tooltip,
                    callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw}` }
                }
            }
        }
    });
}

// ── Утилиты ───────────────────────────────────────────────────

function _fmtH(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return h === 0 ? `${m}м` : `${h}ч ${m}м`;
}

function _fmtD(sec) {
    if (!sec) return '0м';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${h}ч ${m}м` : `${m}м`;
}
