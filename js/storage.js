// ============ КОНСТАНТЫ ============
const INK_COLORS = [
    { name: 'Чёрный', color: '#1a1a2e' },
    { name: 'Синий', color: '#1565c0' },
    { name: 'Тёмно-синий', color: '#0d47a1' },
    { name: 'Зелёный', color: '#2e7d32' },
    { name: 'Красный', color: '#c62828' },
    { name: 'Фиолетовый', color: '#6a1b9a' },
    { name: 'Коричневый', color: '#6d4c41' },
    { name: 'Бирюзовый', color: '#00695c' }
];

const MOODS = ['😊', '😢', '💭', '🎉', '🔥', '📚', '💪', '🌟', '☕', '🎵', '😴', '🤔'];

const ITEMS_PER_PAGE = 5;

const MONTHS_RU = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

// ============ РАБОТА С LOCALSTORAGE ============
function loadEntries() {
    try {
        return JSON.parse(localStorage.getItem('journalEntries')) || [];
    } catch (e) {
        console.error('Ошибка загрузки:', e);
        return [];
    }
}

function saveEntries(entries) {
    try {
        localStorage.setItem('journalEntries', JSON.stringify(entries));
        return true;
    } catch (e) {
        console.error('Ошибка сохранения:', e);
        return false;
    }
}

// ============ ЭКСПОРТ ============
function exportToJSON(entries) {
    const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        entries: entries,
        settings: {
            theme: document.documentElement.getAttribute('data-theme') || 'light'
        }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// ============ ИМПОРТ ============
function importFromJSON(file, currentEntries) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.entries || !Array.isArray(data.entries)) {
                    reject('Неверный формат файла!');
                    return;
                }
                resolve(data.entries);
            } catch (err) {
                reject('Ошибка чтения: ' + err.message);
            }
        };
        reader.readAsText(file);
    });
}

// ============ ОБНОВЛЁННАЯ ФУНКЦИЯ СОХРАНЕНИЯ ============
async function saveEntriesWithSync(entries) {
    // Сохраняем локально (резервная копия)
    saveEntries(entries);
    
    // Если пользователь вошёл — сохраняем в облако
    if (window.isCloudMode && window.currentUser) {
        try {
            // Сохраняем только изменённые записи (те, что без id — новые)
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                if (!entry.id) {
                    const cloudId = await saveEntryToCloud(entry);
                    entries[i].id = cloudId;
                }
            }
            saveEntries(entries); // обновляем с id
            showNotification('☁️ Сохранено в облаке', 'success');
        } catch (error) {
            showNotification('⚠️ Сохранено локально (облако недоступно)', 'warning');
        }
    }
}

async function deleteEntryWithSync(index) {
    const entry = window.entries[index];
    const cloudId = entry.id;
    
    window.entries.splice(index, 1);
    
    // Сохраняем локально
    saveEntries(window.entries);
    
    // Удаляем из облака
    if (window.isCloudMode && cloudId) {
        try {
            await deleteEntryFromCloud(cloudId);
        } catch (error) {
            console.error('Не удалось удалить из облака:', error);
        }
    }
}

// ============ ИЗБРАННОЕ ============
async function toggleFavorite(index) {
    const entry = window.entries[index];
    entry.favorite = !entry.favorite;
    
    // Сохраняем локально (всегда)
    saveEntries(window.entries);
    
    // Обновляем в облаке (если вошли)
    if (window.isCloudMode && window.currentUser && entry.id) {
        const success = await updateEntryInCloud(entry);
        if (success) {
            showNotification('⭐ Избранное синхронизировано', 'success');
        } else {
            showNotification('⚠️ Локально сохранено, облако недоступно', 'warning');
        }
    }
    
    render();
    updateFavoritesCount();
}

function updateFavoritesCount() {
    const count = window.entries.filter(e => e.favorite).length;
    const countElement = document.getElementById('favoritesCount');
    if (countElement) countElement.textContent = count;
}

function getFavoritesFilter() {
    return window.favoritesOnly || false;
}