// analytics-boot.js — ждёт когда main.js залогинит пользователя, потом рендерит аналитику
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { renderAnalytics } from './analytics.js';

const SUPABASE_URL  = 'https://ugracdwltsflfwieakty.supabase.co';
const SUPABASE_ANON = 'sb_publishable_zXJ6w0FH5iq2DUTk2kv7BQ_2rpI4LIq';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// Запускаем аналитику как только есть авторизованная сессия
async function boot() {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
        renderAnalytics(session.user.id);
        return;
    }
    // Если пользователь ещё не вошёл — ждём события
    sb.auth.onAuthStateChange((_event, session) => {
        if (session?.user) renderAnalytics(session.user.id);
    });
}

boot();
