// ============ ОТКРЫТИЕ/ЗАКРЫТИЕ МОДАЛОК ============
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
    if (id === 'deleteModal') window.deletingIndex = null;
    if (id === 'createModal') window.editingIndex = null;
}

// ============ МОДАЛКА СОЗДАНИЯ/РЕДАКТИРОВАНИЯ ============
function openCreateModal() {
    window.editingIndex = null;
    document.getElementById('modalTitle').textContent = 'Новая Запись';
    document.getElementById('entryTitle').value = '';
    document.getElementById('entryContent').value = '';
    document.getElementById('entryTags').value = '';
    
    window.currentImage = null;
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('removeImage').style.display = 'none';
    document.getElementById('imageInput').value = '';
    
    selectInkColor(INK_COLORS[0].color);
    selectMood(MOODS[0]);
    
    openModal('createModal');
    setTimeout(() => document.getElementById('entryTitle').focus(), 100);
}

function openEditModal(index) {
    window.editingIndex = index;
    const entry = window.entries[index];
    
    document.getElementById('modalTitle').textContent = 'Редактировать Запись';
    document.getElementById('entryTitle').value = entry.title;
    document.getElementById('entryContent').value = entry.content;
    document.getElementById('entryTags').value = (entry.tags || []).join(', ');
    
    window.currentImage = entry.image || null;
    if (window.currentImage) {
        document.getElementById('imagePreview').src = window.currentImage;
        document.getElementById('imagePreview').style.display = 'block';
        document.getElementById('removeImage').style.display = 'block';
    } else {
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('removeImage').style.display = 'none';
    }
    document.getElementById('imageInput').value = '';
    
    selectInkColor(entry.inkColor || INK_COLORS[0].color);
    if (entry.mood) {
        selectMood(entry.mood);
        document.querySelectorAll('.mood-btn').forEach(btn => {
            if (btn.textContent === entry.mood) btn.classList.add('selected');
        });
    } else {
        selectMood(MOODS[0]);
    }
    
    openModal('createModal');
}

async function saveEntry() {
    const title = document.getElementById('entryTitle').value.trim();
    const content = document.getElementById('entryContent').value.trim();
    const tags = document.getElementById('entryTags').value
        .split(',').map(t => t.trim()).filter(t => t);
    
    if (!title || !content) {
        alert('Заполни заголовок и содержание!');
        return;
    }
    
    const entryData = {
        title,
        content,
        tags,
        inkColor: window.selectedInkColor,
        mood: window.selectedMood,
        image: window.currentImage,
        date: window.editingIndex !== null 
            ? window.entries[window.editingIndex].date 
            : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Если редактируем — сохраняем id и статус избранного
    if (window.editingIndex !== null) {
        entryData.id = window.entries[window.editingIndex].id;
        entryData.favorite = window.entries[window.editingIndex].favorite;
        window.entries[window.editingIndex] = entryData;
    } else {
        entryData.favorite = false;
        window.entries.unshift(entryData);
    }
    
    // Сохраняем локально (всегда, как резервная копия)
    saveEntries(window.entries);
    
    // Синхронизируем с облаком
    if (window.isCloudMode && window.currentUser) {
        try {
            if (window.editingIndex !== null && entryData.id) {
                // ОБНОВЛЯЕМ существующую запись
                await updateEntryInCloud(entryData);
                showNotification('✏️ Запись обновлена в облаке', 'success');
            } else {
                // СОЗДАЁМ новую запись
                const cloudId = await saveEntryToCloud(entryData);
                // Добавляем id к записи и пересохраняем локально
                const newIndex = window.entries.findIndex(e => e.date === entryData.date);
                if (newIndex !== -1) {
                    window.entries[newIndex].id = cloudId;
                    saveEntries(window.entries);
                }
                showNotification('☁️ Запись сохранена в облаке', 'success');
            }
        } catch (error) {
            console.error('Ошибка синхронизации:', error);
            showNotification('⚠️ Сохранено локально (облако недоступно)', 'warning');
        }
    }
    
    closeModal('createModal');
    render();
    renderCalendar();
    updateFavoritesCount();
    updateGalleryCount();
}

// ============ ЗАГРУЗКА ФОТО ============
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        alert('Фото слишком большое! Максимум 2 МБ.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (ev) => {
        window.currentImage = ev.target.result;
        document.getElementById('imagePreview').src = window.currentImage;
        document.getElementById('imagePreview').style.display = 'block';
        document.getElementById('removeImage').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// ============ ПРОСМОТР ЗАПИСИ ============
function openViewModal(index) {
    const entry = window.entries[index];
    const date = new Date(entry.date).toLocaleDateString('ru-RU', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    const inkColor = entry.inkColor || INK_COLORS[0].color;
    const mood = entry.mood || '';
    
    const viewContent = document.getElementById('viewContent');
    viewContent.innerHTML = `
        <div class="view-date">${mood} ${date}</div>
        <h2 class="view-title" style="color: ${inkColor}">${escapeHtml(entry.title)}</h2>
        ${entry.image ? `<img class="view-image" src="${entry.image}" />` : ''}
        <div class="view-text" style="color: ${inkColor}">${escapeHtml(entry.content)}</div>
        ${(entry.tags || []).length > 0 ? `
            <div class="view-tags">
                ${entry.tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}
            </div>
        ` : ''}
    `;
    openModal('viewModal');
}

// ============ УДАЛЕНИЕ ============
function requestDelete(index) {
    window.deletingIndex = index;
    openModal('deleteModal');
}

async function confirmDelete() {
    if (window.deletingIndex !== null) {
        await deleteEntryWithSync(window.deletingIndex);
        
        const filtered = getFilteredEntries(
            window.entries, window.searchQuery, window.dateFilter
        );
        const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
        if (window.currentPage > totalPages) window.currentPage = totalPages;
        
window.deletingIndex = null;
closeModal('deleteModal');
render();
renderCalendar();
updateFavoritesCount();  // ← ДОБАВИЛИ
updateGalleryCount();        
    }
}