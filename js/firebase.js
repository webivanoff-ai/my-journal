// ============ FIREBASE КОНФИГ ============
// ЗАМЕНИ ЭТОТ БЛОК на свой конфиг из Firebase Console!
const firebaseConfig = {
  apiKey: "AIzaSyA7qoG1VET0sZgpYXq9PcHen3JFMhs3tSI",
  authDomain: "my-journal-a20ff.firebaseapp.com",
  projectId: "my-journal-a20ff",
  storageBucket: "my-journal-a20ff.firebasestorage.app",
  messagingSenderId: "180043375827",
  appId: "1:180043375827:web:42a9d893570a2c801e2026"
};

// ============ ИНИЦИАЛИЗАЦИЯ FIREBASE ============
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ============ ПЕРЕМЕННЫЕ ============
window.currentUser = null;
window.isCloudMode = false;

// ============ АУТЕНТИФИКАЦИЯ ============
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        
        const result = await auth.signInWithPopup(provider);
        window.currentUser = result.user;
        window.isCloudMode = true;
        
        // Мигрируем локальные записи в облако при первом входе
        await migrateLocalToCloud();
        
        // Загружаем записи из облака
        await loadEntriesFromCloud();
        
        updateAuthUI();
        render();
        renderCalendar();
        
        showNotification(`👋 Добро пожаловать, ${result.user.displayName}!`, 'success');
    } catch (error) {
        console.error('Ошибка входа:', error);
        if (error.code !== 'auth/popup-closed-by-user') {
            showNotification('❌ Не удалось войти: ' + error.message, 'error');
        }
    }
}

let logoutAction = 'sync'; // По умолчанию — синхронизация

async function signOut() {
    // Открываем модалку выбора
    openLogoutModal();
}

function openLogoutModal() {
    // Сбрасываем выбор
    logoutAction = 'sync';
    document.querySelectorAll('.logout-option').forEach(opt => {
        opt.classList.toggle('selected', opt.getAttribute('data-action') === 'sync');
    });
    
    // Обработчики выбора
    document.querySelectorAll('.logout-option').forEach(option => {
        option.onclick = () => {
            logoutAction = option.getAttribute('data-action');
            document.querySelectorAll('.logout-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');
        };
    });
    
    // Обработчик подтверждения
    document.getElementById('confirmLogoutBtn').onclick = performLogout;
    
    openModal('logoutModal');
}

async function performLogout() {
    try {
        const localEntries = loadEntries();
        
        // Действие в зависимости от выбора
        if (logoutAction === 'sync' && localEntries.length > 0) {
            // Синхронизируем локальные записи в облако
            showNotification('☁️ Синхронизация локальных записей...', 'info');
            
            for (const entry of localEntries) {
                if (!entry.id) {
                    await saveEntryToCloud(entry);
                }
            }
            
            showNotification(`✅ Синхронизировано: ${localEntries.length} записей`, 'success');
        } else if (logoutAction === 'delete') {
            // Удаляем локальные записи
            localStorage.removeItem('journalEntries');
            showNotification('🗑️ Локальные записи удалены', 'info');
        }
        // Если 'keep' — ничего не делаем, оставляем как есть
        
        // Выходим из аккаунта
        await auth.signOut();
        window.currentUser = null;
        window.isCloudMode = false;
        
        // Загружаем локальные записи (если остались)
        window.entries = loadEntries();
        
        updateAuthUI();
        render();
        renderCalendar();
        
        closeModal('logoutModal');
        showNotification('👋 Вы вышли из аккаунта', 'info');
    } catch (error) {
        console.error('Ошибка выхода:', error);
        showNotification('❌ Не удалось выйти: ' + error.message, 'error');
    }
}

// ============ РАБОТА С ОБЛАЧНОЙ БАЗОЙ ============
async function loadEntriesFromCloud() {
    if (!window.currentUser) return;
    
    try {
        const snapshot = await db.collection('users')
            .doc(window.currentUser.uid)
            .collection('entries')
            .orderBy('date', 'desc')
            .get();
        
        window.entries = [];
        snapshot.forEach(doc => {
            window.entries.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        saveEntries(window.entries); // синхронизируем с localStorage
    } catch (error) {
        console.error('Ошибка загрузки из облака:', error);
        showNotification('⚠️ Ошибка загрузки из облака. Показаны локальные записи.', 'warning');
    }
}

async function saveEntryToCloud(entry) {
    if (!window.currentUser) return;
    
    try {
        const entryRef = db.collection('users')
            .doc(window.currentUser.uid)
            .collection('entries');
        
        if (entry.id) {
            await entryRef.doc(entry.id).set(entry);
            return entry.id;
        } else {
            const docRef = await entryRef.add(entry);
            return docRef.id;
        }
    } catch (error) {
        console.error('Ошибка сохранения в облако:', error);
        throw error;
    }
}

async function deleteEntryFromCloud(entryId) {
    if (!window.currentUser || !entryId) return;
    
    try {
        await db.collection('users')
            .doc(window.currentUser.uid)
            .collection('entries')
            .doc(entryId)
            .delete();
    } catch (error) {
        console.error('Ошибка удаления из облака:', error);
        throw error;
    }
}

async function migrateLocalToCloud() {
    if (!window.currentUser) return;
    
    const localEntries = loadEntries();
    if (localEntries.length === 0) return;
    
    // Проверяем, есть ли уже записи в облаке
    const existing = await db.collection('users')
        .doc(window.currentUser.uid)
        .collection('entries')
        .limit(1)
        .get();
    
    if (!existing.empty) {
        // В облаке уже есть записи — объединяем
        if (confirm(`В облаке уже есть записи. Добавить к ним ваши локальные (${localEntries.length} шт.)?`)) {
            for (const entry of localEntries) {
                await saveEntryToCloud(entry);
            }
        }
    } else {
        // Облако пустое — переносим всё
        for (const entry of localEntries) {
            await saveEntryToCloud(entry);
        }
        showNotification(`☁️ Перенесено в облако: ${localEntries.length} записей`, 'success');
    }
}

// ============ СЛУШАТЕЛЬ СОСТОЯНИЯ АВТОРИЗАЦИИ ============
auth.onAuthStateChanged(async (user) => {
    if (user) {
        window.currentUser = user;
        window.isCloudMode = true;
        await loadEntriesFromCloud();
    } else {
        window.currentUser = null;
        window.isCloudMode = false;
        window.entries = loadEntries();
    }
    
    updateAuthUI();
    render();
    renderCalendar();
});

// ============ ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ============
function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    const syncIndicator = document.getElementById('syncIndicator');
    
    if (window.currentUser) {
        loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        syncIndicator.style.display = 'flex';
        
        document.getElementById('userAvatar').src = 
            window.currentUser.photoURL || 'https://ui-avatars.com/api/?name=' + 
            encodeURIComponent(window.currentUser.displayName || 'User');
        document.getElementById('userName').textContent = 
            window.currentUser.displayName || 'Пользователь';
    } else {
        loginBtn.style.display = 'flex';
        userInfo.style.display = 'none';
        syncIndicator.style.display = 'none';
    }
}

// ============ УВЕДОМЛЕНИЯ ============
function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============ ОБНОВЛЕНИЕ ЗАПИСИ В ОБЛАКЕ ============
async function updateEntryInCloud(entry) {
    if (!window.currentUser || !entry.id) return;
    
    try {
        await db.collection('users')
            .doc(window.currentUser.uid)
            .collection('entries')
            .doc(entry.id)
            .set(entry);
        return true;
    } catch (error) {
        console.error('Ошибка обновления в облаке:', error);
        return false;
    }
}

// ============ ПУБЛИЧНЫЕ ЗАПИСИ (SHARING) ============
async function shareEntry(entry, options = {}) {
    if (!window.currentUser) {
        showNotification('❌ Для шаринга нужно войти в аккаунт', 'error');
        return null;
    }
    
    try {
        const shareId = 'share_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Подготавливаем публичные данные
        const publicData = {
            title: entry.title,
            content: entry.content,
            inkColor: entry.inkColor || INK_COLORS[0].color,
            mood: entry.mood || '',
            date: entry.date,
            tags: entry.tags || [],
            image: options.includeImage ? (entry.image || null) : null,
            ownerUid: window.currentUser.uid,
            ownerName: window.currentUser.displayName || 'Аноним',
            ownerAvatar: window.currentUser.photoURL || '',
            originalEntryId: entry.id || null,
            createdAt: new Date().toISOString(),
            viewCount: 0,
            expiresAt: options.expiresAt || null // null = навсегда
        };
        
        await db.collection('shared_entries')
            .doc(shareId)
            .set(publicData);
        
        // Генерируем ссылку
        const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
        
        showNotification('✅ Ссылка создана!', 'success');
        return { shareId, shareUrl };
    } catch (error) {
        console.error('Ошибка создания ссылки:', error);
        showNotification('❌ Не удалось создать ссылку', 'error');
        return null;
    }
}

async function loadSharedEntry(shareId) {
    try {
        const doc = await db.collection('shared_entries')
            .doc(shareId)
            .get();
        
        if (!doc.exists) {
            return { error: 'Запись не найдена или была удалена' };
        }
        
        const data = doc.data();
        
        // Проверяем срок действия
        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
            return { error: 'Срок действия ссылки истёк' };
        }
        
        // Инкрементируем счётчик просмотров
        try {
            await db.collection('shared_entries')
                .doc(shareId)
                .update({ viewCount: (data.viewCount || 0) + 1 });
        } catch (e) {
            console.warn('Не удалось обновить счётчик:', e);
        }
        
        return { ...data, shareId };
    } catch (error) {
        console.error('Ошибка загрузки публичной записи:', error);
        return { error: 'Не удалось загрузить запись' };
    }
}

async function revokeShare(shareId) {
    if (!window.currentUser) return false;
    
    try {
        const doc = await db.collection('shared_entries').doc(shareId).get();
        
        if (!doc.exists) return false;
        
        // Проверяем, что владелец — текущий пользователь
        if (doc.data().ownerUid !== window.currentUser.uid) {
            showNotification('❌ У вас нет прав на удаление этой ссылки', 'error');
            return false;
        }
        
        await db.collection('shared_entries').doc(shareId).delete();
        showNotification('🗑️ Ссылка отозвана', 'success');
        return true;
    } catch (error) {
        console.error('Ошибка отзыва ссылки:', error);
        showNotification('❌ Не удалось отозвать ссылку', 'error');
        return false;
    }
}

async function getEntryShareStatus(entryId) {
    if (!window.currentUser || !entryId) return null;
    
    try {
        const snapshot = await db.collection('shared_entries')
            .where('ownerUid', '==', window.currentUser.uid)
            .where('originalEntryId', '==', entryId)
            .limit(1)
            .get();
        
        if (snapshot.empty) return null;
        
        const doc = snapshot.docs[0];
        const data = doc.data();
        
        // Проверяем актуальность
        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
            return null;
        }
        
        return { shareId: doc.id, ...data };
    } catch (error) {
        console.error('Ошибка проверки статуса:', error);
        return null;
    }
}

// Проверяем URL при загрузке страницы
async function checkShareUrl() {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    
    if (!shareId) return;
    
    // Показываем индикатор загрузки
    showNotification('⏳ Загрузка записи...', 'info');
    
    const result = await loadSharedEntry(shareId);
    
    if (result.error) {
        setTimeout(() => {
            showNotification('❌ ' + result.error, 'error');
        }, 500);
        return;
    }
    
    // Открываем модалку публичного просмотра
    setTimeout(() => openPublicViewModal(result), 300);
}
