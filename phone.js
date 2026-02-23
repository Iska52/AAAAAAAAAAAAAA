import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, query, orderBy, onSnapshot, 
    serverTimestamp, updateDoc, doc, increment, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// КОНФИГУРАЦИЯ
const firebaseConfig = {
  apiKey: "AIzaSyDDQUDZAHu1eYxxEAjG1n0d1AfcUXtz1jE",
  authDomain: "is-po233.firebaseapp.com",
  projectId: "is-po233",
  storageBucket: "is-po233.firebasestorage.app",
  messagingSenderId: "1083602801160",
  appId: "1:1083602801160:web:5f033d32c2d9efb0cbf7bd",
  measurementId: "G-P5JR939L0K"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Функция 1: АВТОРИЗАЦИЯ + ПРОВЕРКА УНИКАЛЬНОСТИ PHONE
window.checkPhoneUnique = async (phone) => {
    if (!phone?.match(/^\\+?[1-9]\\d{1,14}$/)) {
        throw new Error("Неверный формат: используйте +77001234567 или 77001234567");
    }
    
    try {
        // Анонимный логин (один раз)
        if (!auth.currentUser) {
            await signInAnonymously(auth);
        }
        
        // Проверка existence в индексе phones
        const phoneDocRef = doc(db, "phones", phone);
        const phoneDoc = await getDoc(phoneDocRef);
        if (phoneDoc.exists()) {
            throw new Error("Этот номер уже используется другим пользователем");
        }
        return true;
    } catch (e) {
        throw e;
    }
};

// МЕТОД: АТОМАРНОЕ ОБНОВЛЕНИЕ (LIKES) - без изменений
window.processLike = async (id) => {
    const docRef = doc(db, "requests", id);
    try {
        await updateDoc(docRef, { likes: increment(1) });
    } catch (e) { 
        console.error("Ошибка лайка:", e.message); 
    }
};

// МЕТОД: ЗАПИСЬ С ВАЛИДАЦИЕЙ + PHONE + ИНДЕКС
document.getElementById('mainBtn').onclick = async () => {
    const btn = document.getElementById('mainBtn');
    btn.disabled = true;
    btn.textContent = "Публикация...";
    
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone')?.value.trim() || null;
    
    try {
        // Валидация базовых полей
        if (name.length < 3) throw new Error("Имя должно быть длиннее 2 символов");
        if (!email.match(/.*@.*\..*/)) throw new Error("Некорректный email");
        
        // Проверка phone (если указан)
        if (phone) {
            await window.checkPhoneUnique(phone);
        }
        
        // Анонимный логин для rules
        if (!auth.currentUser) {
            await signInAnonymously(auth);
        }
        
        // Создание поста
        const docRef = await addDoc(collection(db, "requests"), {
            name,
            email,
            phone,  // null или валидный номер
            likes: 0,
            uid: auth.currentUser.uid,
            timestamp: serverTimestamp()
        });
        
        // Создание индекса уникальности (если phone указан)
        if (phone) {
            await setDoc(doc(db, "phones", phone), { 
                claimedBy: auth.currentUser.uid,
                requestId: docRef.id 
            });
        }
        
        // Очистка формы
        document.getElementById('name').value = "";
        document.getElementById('email').value = "";
        if (document.getElementById('phone')) {
            document.getElementById('phone').value = "";
        }
        
        alert("Опубликовано успешно!");
        
    } catch (e) {
        console.error("Ошибка:", e);
        alert("Ошибка: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Опубликовать в облако";
    }
};

// МЕТОД: REAL-TIME СИНХРОНИЗАЦИЯ (обновлен для показа phone)
const q = query(collection(db, "requests"), orderBy("timestamp", "desc"));
onSnapshot(q, (snapshot) => {
    const feed = document.getElementById('feed');
    feed.innerHTML = "";
    snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const phoneDisplay = data.phone ? `📱 ${data.phone}` : "";
        feed.innerHTML += `
            <div class="post">
                <span class="time">${data.timestamp?.toDate().toLocaleTimeString() || '...'}</span>
                <b>${data.name}</b>
                <p style="margin: 5px 0;">${data.email}</p>
                ${phoneDisplay ? `<p style="margin: 2px 0; font-size: 13px; color: #666;">${phoneDisplay}</p>` : ''}
                <button class="like-btn" onclick="processLike('${docSnapshot.id}')">👍 ${data.likes || 0}</button>
            </div>
        `;
    });
});
