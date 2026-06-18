// ============ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ============
window.favoritesOnly = false;
window.entries = loadEntries();
window.currentPage = 1;
window.searchQuery = '';
window.dateFilter = null;
window.editingIndex = null;
window.deletingIndex = null;
window.selectedInkColor = INK_COLORS[0].color;
window.selectedMood = MOODS[0];
window.currentImage = null;
window.calendarDate = new Date();

// ============ ИНИЦИАЛИЗАЦИЯ ============
document.addEventListener('DOMContentLoaded', () => {
    // Инициализация UI
    initInkColors();
    initMoodPicker();
    loadTheme();
    render();
    updateFavoritesCount();
    updateGalleryCount();
    renderCalendar();
    
    // ============ ОБРАБОТЧИКИ СОБЫТИЙ ============
    
    // Кнопка добавления новой записи
    document.getElementById('addBtn').addEventListener('click', openCreateModal);
    
    // ============ МЕНЮ ФУНКЦИЙ (DROPDOWN) ============
    
    // Клик по иконке меню — toggle dropdown
    document.getElementById('menuIconBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('menuDropdown').classList.toggle('show');
    });
    
    // Закрытие dropdown меню при клике вне
    document.addEventListener('click', (e) => {
        const menuDropdown = document.getElementById('menuDropdown');
        const menuBtn = document.getElementById('menuIconBtn');
        if (menuDropdown && menuBtn && !menuDropdown.contains(e.target) && !menuBtn.contains(e.target)) {
            menuDropdown.classList.remove('show');
        }
    });
    
// Фильтр избранного (из меню)
document.getElementById('favoritesFilter').addEventListener('click', () => {
    window.favoritesOnly = !window.favoritesOnly;
    document.getElementById('favoritesFilter').classList.toggle('active', window.favoritesOnly);
    document.getElementById('favoritesIndicator').classList.toggle('show', window.favoritesOnly);
    window.currentPage = 1;
    render();
    
    // Закрываем меню после выбора (на мобильных)
    if (window.innerWidth < 768) {
        document.getElementById('menuDropdown').classList.remove('show');
    }
});

// Клик по крестику индикатора — закрываем фильтр
document.getElementById('favoritesIndicatorClose').addEventListener('click', () => {
    window.favoritesOnly = false;
    document.getElementById('favoritesFilter').classList.remove('active');
    document.getElementById('favoritesIndicator').classList.remove('show');
    window.currentPage = 1;
    render();
});
    
    // Галерея (из меню)
    document.getElementById('galleryBtn').addEventListener('click', () => {
        openGallery();
        
        // Закрываем меню после выбора (на мобильных)
        if (window.innerWidth < 768) {
            document.getElementById('menuDropdown').classList.remove('show');
        }
    });
    
    // ============ МОДАЛКА СОЗДАНИЯ/РЕДАКТИРОВАНИЯ ============
    document.getElementById('saveBtn').addEventListener('click', saveEntry);
    document.getElementById('cancelBtn').addEventListener('click', () => closeModal('createModal'));
    
    // ============ ПОИСК ============
    document.getElementById('searchInput').addEventListener('input', (e) => {
        window.searchQuery = e.target.value.trim().toLowerCase();
        window.currentPage = 1;
        render();
    });
    
    // ============ ПЕРЕКЛЮЧАТЕЛЬ ТЕМ (DROPDOWN) ============
    document.querySelectorAll('.theme-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const theme = item.getAttribute('data-theme');
            setTheme(theme);
            
            // Закрываем dropdown после выбора (на мобильных)
            if (window.innerWidth < 768) {
                document.getElementById('themeDropdown').classList.remove('show');
            }
        });
    });
    
    // Клик по иконке темы — toggle dropdown
    document.getElementById('themeIconBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('themeDropdown').classList.toggle('show');
    });
    
    // Закрытие dropdown тем при клике вне
    document.addEventListener('click', (e) => {
        const themeDropdown = document.getElementById('themeDropdown');
        const themeBtn = document.getElementById('themeIconBtn');
        if (themeDropdown && themeBtn && !themeDropdown.contains(e.target) && !themeBtn.contains(e.target)) {
            themeDropdown.classList.remove('show');
        }
    });
    
    // ============ FIREBASE — ВХОД/ВЫХОД ============
    document.getElementById('loginBtn').addEventListener('click', signInWithGoogle);
    document.getElementById('logoutBtn').addEventListener('click', signOut);
    
    // ============ ЗАГРУЗКА ФОТО ============
    document.getElementById('imageInput').addEventListener('change', handleImageUpload);
    document.getElementById('removeImage').addEventListener('click', () => {
        window.currentImage = null;
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('removeImage').style.display = 'none';
        document.getElementById('imageInput').value = '';
    });
    
    // ============ ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ ============
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
    
    // ============ НАВИГАЦИЯ ПО КАЛЕНДАРЮ ============
    document.getElementById('prevMonth').addEventListener('click', () => {
        window.calendarDate.setMonth(window.calendarDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
        window.calendarDate.setMonth(window.calendarDate.getMonth() + 1);
        renderCalendar();
    });
    
    // ============ СТАТИСТИКА ============
    document.getElementById('statsBtn').addEventListener('click', () => {
        renderStats(window.entries);
        openModal('statsModal');
    });
    
    // ============ КНОПКА "О ПРОЕКТЕ" ============
    document.getElementById('aboutBtn').addEventListener('click', () => {
        openModal('aboutModal');
    });
    
    // ============ LIGHTBOX (ПОЛНОЭКРАННЫЙ ПРОСМОТР ФОТО) ============
    document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
    document.getElementById('lightboxPrev').addEventListener('click', lightboxPrev);
    document.getElementById('lightboxNext').addEventListener('click', lightboxNext);
    document.getElementById('lightboxSlideshow').addEventListener('click', toggleSlideshow);
    document.getElementById('lightboxGoToEntry').addEventListener('click', goToEntryFromLightbox);
    
    // Закрытие lightbox по клику на фон
    document.getElementById('lightbox').addEventListener('click', (e) => {
        if (e.target.id === 'lightbox' || e.target.classList.contains('lightbox-content')) {
            closeLightbox();
        }
    });
    
    // ============ ОБЩИЕ ОБРАБОТЧИКИ ============
    
    // Закрытие модалок по клику на фон
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', (e) => {
            if (e.target === m) closeModal(m.id);
        });
    });
    
    // Клавиатурные сочетания
    document.addEventListener('keydown', (e) => {
        const lightbox = document.getElementById('lightbox');
        
        // Если открыт lightbox — обрабатываем его клавиши
        if (lightbox && lightbox.classList.contains('active')) {
            if (e.key === 'ArrowLeft') lightboxPrev();
            if (e.key === 'ArrowRight') lightboxNext();
            if (e.key === ' ') { 
                e.preventDefault(); 
                toggleSlideshow(); 
            }
            if (e.key === 'Escape') closeLightbox();
            return;
        }
        
        // Иначе — закрытие модалок и dropdown
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(m => closeModal(m.id));
            
            const themeDropdown = document.getElementById('themeDropdown');
            if (themeDropdown) themeDropdown.classList.remove('show');
            
            const menuDropdown = document.getElementById('menuDropdown');
            if (menuDropdown) menuDropdown.classList.remove('show');
        }
    });
});