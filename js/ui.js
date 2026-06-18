// ============ ТЕМА ============
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('journalTheme', theme);
    
    // Обновляем dropdown меню
    document.querySelectorAll('.theme-dropdown-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-theme') === theme);
    });
}

function loadTheme() {
    const saved = localStorage.getItem('journalTheme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    
    // Обновляем dropdown
    document.querySelectorAll('.theme-dropdown-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-theme') === saved);
    });
}

function loadTheme() {
    const saved = localStorage.getItem('journalTheme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    
    // Обновляем UI
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-theme') === saved);
    });
}
// ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncate(text, max = 300) {
    if (!text) return '';
    if (text.length <= max) return escapeHtml(text);
    return escapeHtml(text.substring(0, max)) + '...';
}

function rgbToHex(rgb) {
    if (!rgb || rgb.startsWith('#')) return rgb;
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return rgb;
    return '#' + [match[1], match[2], match[3]].map(x => {
        const hex = parseInt(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

// ============ ЦВЕТА ЧЕРНИЛ ============
function initInkColors() {
    const container = document.getElementById('inkColors');
    if (!container) return;
    container.innerHTML = '';
    
    INK_COLORS.forEach(c => {
        const div = document.createElement('div');
        div.className = 'ink-color';
        div.style.background = c.color;
        div.title = c.name;
        div.addEventListener('click', () => selectInkColor(c.color));
        container.appendChild(div);
    });
    
    selectInkColor(INK_COLORS[0].color);
}

function selectInkColor(color) {
    window.selectedInkColor = color;
    document.querySelectorAll('.ink-color').forEach(el => {
        const bgColor = el.style.background;
        const isSelected = bgColor === color || rgbToHex(bgColor) === color;
        el.classList.toggle('selected', isSelected);
    });
}

// ============ НАСТРОЕНИЕ ============
function initMoodPicker() {
    const container = document.getElementById('moodPicker');
    if (!container) return;
    container.innerHTML = '';
    
    MOODS.forEach(mood => {
        const btn = document.createElement('button');
        btn.className = 'mood-btn';
        btn.textContent = mood;
        btn.type = 'button';
        btn.addEventListener('click', () => selectMood(mood, btn));
        container.appendChild(btn);
    });
}

function selectMood(mood, btn) {
    window.selectedMood = mood;
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
    if (btn) btn.classList.add('selected');
}

// ============ СТАТИСТИКА ============
function generateStats(entries) {
    const stats = {
        total: entries.length,
        withImage: entries.filter(e => e.image).length,
        monthlyData: {},
        tagCounts: {},
        moodCounts: {},
        colorCounts: {},
        hourlyData: new Array(24).fill(0)
    };
    
    entries.forEach(e => {
        const d = new Date(e.date);
        const monthKey = `${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`;
        stats.monthlyData[monthKey] = (stats.monthlyData[monthKey] || 0) + 1;
        
        (e.tags || []).forEach(tag => {
            stats.tagCounts[tag] = (stats.tagCounts[tag] || 0) + 1;
        });
        
        if (e.mood) stats.moodCounts[e.mood] = (stats.moodCounts[e.mood] || 0) + 1;
        if (e.inkColor) stats.colorCounts[e.inkColor] = (stats.colorCounts[e.inkColor] || 0) + 1;
        stats.hourlyData[d.getHours()]++;
    });
    
    return stats;
}

function renderStats(entries) {
    const stats = generateStats(entries);
    const container = document.getElementById('statsContent');
    if (!container) return;
    
    if (stats.total === 0) {
        container.innerHTML = '<div class="empty-stats">📝 Пока нет записей для статистики</div>';
        return;
    }
    
    // Топ тегов
    const topTags = Object.entries(stats.tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const maxTagCount = topTags.length > 0 ? topTags[0][1] : 1;
    
    // Топ настроений
    const topMoods = Object.entries(stats.moodCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const maxMoodCount = topMoods.length > 0 ? topMoods[0][1] : 1;
    
    // Топ цветов
    const topColors = Object.entries(stats.colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const maxColorCount = topColors.length > 0 ? topColors[0][1] : 1;
    
    // Самое продуктивное время
    const maxHour = stats.hourlyData.indexOf(Math.max(...stats.hourlyData));
    const hourName = maxHour >= 6 && maxHour < 12 ? 'утром' :
                     maxHour >= 12 && maxHour < 18 ? 'днём' :
                     maxHour >= 18 && maxHour < 23 ? 'вечером' : 'ночью';
    
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${stats.total}</div>
                <div class="stat-label">Всего записей</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.withImage}</div>
                <div class="stat-label">С фото 📸</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${topTags.length}</div>
                <div class="stat-label">Уникальных тегов</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${hourName}</div>
                <div class="stat-label">Пик активности</div>
            </div>
        </div>
        
        ${topTags.length > 0 ? `
        <div class="stats-section">
            <h3>🏷️ Популярные теги</h3>
            ${topTags.map(([tag, count]) => `
                <div class="stat-bar">
                    <div class="stat-label">#${escapeHtml(tag)}</div>
                    <div class="stat-track">
                        <div class="stat-fill" style="width: ${(count / maxTagCount) * 100}%"></div>
                    </div>
                    <div class="stat-value">${count}</div>
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        ${topMoods.length > 0 ? `
        <div class="stats-section">
            <h3>😊 Частые настроения</h3>
            ${topMoods.map(([mood, count]) => `
                <div class="stat-bar mood-bar">
                    <div class="stat-label">${mood}</div>
                    <div class="stat-track">
                        <div class="stat-fill mood-fill" style="width: ${(count / maxMoodCount) * 100}%"></div>
                    </div>
                    <div class="stat-value">${count}</div>
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        ${topColors.length > 0 ? `
        <div class="stats-section">
            <h3>🎨 Любимые цвета чернил</h3>
            ${topColors.map(([color, count]) => `
                <div class="stat-bar color-bar">
                    <div class="color-dot" style="background: ${color}"></div>
                    <div class="stat-track">
                        <div class="stat-fill" style="width: ${(count / maxColorCount) * 100}%; background: ${color}"></div>
                    </div>
                    <div class="stat-value">${count}</div>
                </div>
            `).join('')}
        </div>
        ` : ''}
    `;
}

// ============ ГАЛЕРЕЯ ФОТО ============
let galleryPhotos = [];
let currentPhotoIndex = 0;
let slideshowInterval = null;

function updateGalleryCount() {
    const photosWithCount = window.entries.filter(e => e.image).length;
    const countElement = document.getElementById('galleryCount');
    if (countElement) countElement.textContent = photosWithCount;
}

function collectPhotos() {
    galleryPhotos = window.entries
        .filter(e => e.image)
        .map(e => ({
            image: e.image,
            title: e.title,
            date: e.date,
            tags: e.tags || [],
            mood: e.mood || '',
            favorite: e.favorite || false,
            entryIndex: window.entries.indexOf(e)
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    return galleryPhotos;
}

function openGallery() {
    collectPhotos();
    
    // Собираем уникальные теги
    const allTags = new Set();
    galleryPhotos.forEach(p => {
        (p.tags || []).forEach(t => allTags.add(t));
    });
    
    // Рендерим фильтры по тегам
    const tagsContainer = document.getElementById('galleryFilterTags');
    tagsContainer.innerHTML = `<button class="filter-tag active" data-tag="all">Все фото</button>`;
    [...allTags].sort().forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'filter-tag';
        btn.setAttribute('data-tag', tag);
        btn.textContent = '#' + tag;
        btn.addEventListener('click', () => filterGalleryByTag(tag));
        tagsContainer.appendChild(btn);
    });
    
    // Рендерим фильтр по датам (по месяцам)
    const dateFilter = document.getElementById('galleryDateFilter');
    dateFilter.innerHTML = '<option value="all">Все даты</option>';
    
    const months = new Set();
    galleryPhotos.forEach(p => {
        const d = new Date(p.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.add(key);
    });
    
    [...months].sort().reverse().forEach(m => {
        const [year, month] = m.split('-');
        const option = document.createElement('option');
        option.value = m;
        option.textContent = `${MONTHS_RU[parseInt(month) - 1]} ${year}`;
        dateFilter.appendChild(option);
    });
    
    // Рендерим сетку
    renderGalleryGrid(galleryPhotos);
    
    openModal('galleryModal');
    
    // Обработчики фильтров
    document.getElementById('galleryDateFilter').onchange = (e) => {
        filterGalleryByDate(e.target.value);
    };
}

function renderGalleryGrid(photos) {
    const grid = document.getElementById('galleryGrid');
    const empty = document.getElementById('galleryEmpty');
    
    grid.innerHTML = '';
    
    if (photos.length === 0) {
        empty.style.display = 'block';
        grid.style.display = 'none';
        return;
    }
    
    empty.style.display = 'none';
    grid.style.display = 'grid';
    
    photos.forEach((photo, idx) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        
        const date = new Date(photo.date).toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
        
        item.innerHTML = `
            <img src="${photo.image}" alt="${escapeHtml(photo.title)}" loading="lazy" />
            ${photo.mood ? `<div class="gallery-item-mood">${photo.mood}</div>` : ''}
            ${photo.favorite ? `<div class="gallery-item-favorite">⭐</div>` : ''}
            <div class="gallery-item-overlay">
                <strong>${escapeHtml(photo.title)}</strong><br>
                ${date}
            </div>
        `;
        
        item.addEventListener('click', () => openLightbox(idx, photos));
        grid.appendChild(item);
    });
}

function filterGalleryByTag(tag) {
    document.querySelectorAll('.filter-tag').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.filter-tag[data-tag="${tag}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    const dateValue = document.getElementById('galleryDateFilter').value;
    let filtered = galleryPhotos;
    
    if (tag !== 'all') {
        filtered = filtered.filter(p => (p.tags || []).includes(tag));
    }
    
    if (dateValue !== 'all') {
        const [year, month] = dateValue.split('-').map(Number);
        filtered = filtered.filter(p => {
            const d = new Date(p.date);
            return d.getFullYear() === year && d.getMonth() === month - 1;
        });
    }
    
    renderGalleryGrid(filtered);
}

function filterGalleryByDate(value) {
    const activeTag = document.querySelector('.filter-tag.active');
    const tag = activeTag ? activeTag.getAttribute('data-tag') : 'all';
    
    let filtered = galleryPhotos;
    
    if (tag !== 'all') {
        filtered = filtered.filter(p => (p.tags || []).includes(tag));
    }
    
    if (value !== 'all') {
        const [year, month] = value.split('-').map(Number);
        filtered = filtered.filter(p => {
            const d = new Date(p.date);
            return d.getFullYear() === year && d.getMonth() === month - 1;
        });
    }
    
    renderGalleryGrid(filtered);
}

// ============ LIGHTBOX ============
let currentLightboxPhotos = [];

function openLightbox(index, photos) {
    currentLightboxPhotos = photos;
    currentPhotoIndex = index;
    showLightboxPhoto();
    document.getElementById('lightbox').classList.add('active');
}

function closeLightbox() {
    stopSlideshow();
    document.getElementById('lightbox').classList.remove('active');
}

function showLightboxPhoto() {
    const photo = currentLightboxPhotos[currentPhotoIndex];
    if (!photo) return;
    
    const img = document.getElementById('lightboxImage');
    img.src = photo.image;
    
    const date = new Date(photo.date).toLocaleDateString('ru-RU', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    
    const info = document.getElementById('lightboxInfo');
    info.innerHTML = `
        <div class="info-title">${photo.mood} ${escapeHtml(photo.title)}</div>
        <div class="info-date">📅 ${date}</div>
        ${(photo.tags || []).length > 0 ? `
            <div class="info-tags">
                ${photo.tags.map(t => `<span class="info-tag">#${escapeHtml(t)}</span>`).join('')}
            </div>
        ` : ''}
    `;
}

function lightboxNext() {
    currentPhotoIndex = (currentPhotoIndex + 1) % currentLightboxPhotos.length;
    showLightboxPhoto();
}

function lightboxPrev() {
    currentPhotoIndex = (currentPhotoIndex - 1 + currentLightboxPhotos.length) % currentLightboxPhotos.length;
    showLightboxPhoto();
}

function toggleSlideshow() {
    const btn = document.getElementById('lightboxSlideshow');
    if (slideshowInterval) {
        stopSlideshow();
    } else {
        slideshowInterval = setInterval(lightboxNext, 3000);
        btn.classList.add('playing');
        btn.textContent = '⏸';
    }
}

function stopSlideshow() {
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
        slideshowInterval = null;
    }
    const btn = document.getElementById('lightboxSlideshow');
    if (btn) {
        btn.classList.remove('playing');
        btn.textContent = '▶';
    }
}

function goToEntryFromLightbox() {
    const photo = currentLightboxPhotos[currentPhotoIndex];
    if (!photo) return;
    
    closeLightbox();
    closeModal('galleryModal');
    
    // Открываем запись в модалке просмотра
    setTimeout(() => openViewModal(photo.entryIndex), 300);
}