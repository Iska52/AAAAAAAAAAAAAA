// analytics-boot.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { renderAnalytics } from './analytics.js';

const SUPABASE_URL  = 'https://ugracdwltsflfwieakty.supabase.co';
const SUPABASE_ANON = 'sb_publishable_zXJ6w0FH5iq2DUTk2kv7BQ_2rpI4LIq';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// Ждём пока Chart.js (UMD) инициализируется в window.Chart
function waitForChart(maxMs = 5000) {
    return new Promise((resolve, reject) => {
        if (typeof window.Chart !== 'undefined') { resolve(); return; }
        const start = Date.now();
        const iv = setInterval(() => {
            if (typeof window.Chart !== 'undefined') { clearInterval(iv); resolve(); }
            else if (Date.now() - start > maxMs) { clearInterval(iv); reject(new Error('Chart.js не загрузился')); }
        }, 50);
    });
}

// Ждём пока канвас появится в DOM
function waitForElement(id, maxMs = 8000) {
    return new Promise((resolve, reject) => {
        if (document.getElementById(id)) { resolve(); return; }
        const start = Date.now();
        const iv = setInterval(() => {
            if (document.getElementById(id)) { clearInterval(iv); resolve(); }
            else if (Date.now() - start > maxMs) { clearInterval(iv); reject(new Error(`#${id} не найден`)); }
        }, 100);
    });
}

async function tryRender(userId) {
    try {
        await waitForChart();
        await waitForElement('chartHourly');
        await renderAnalytics(userId);
    } catch (e) {
        console.error('[analytics-boot] ошибка рендера:', e);
    }
}

async function boot() {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
        tryRender(session.user.id);
        return;
    }
    sb.auth.onAuthStateChange((_event, session) => {
        if (session?.user) tryRender(session.user.id);
    });
}

boot();
