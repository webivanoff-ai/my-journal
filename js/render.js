// ============ ФИЛЬТРАЦИЯ ============
function getFilteredEntries(entries, searchQuery, dateFilter) {
    return entries.filter(e => {
        // Фильтр по избранному
        if (window.favoritesOnly && !e.favorite) return false;
        
        // Фильтр по поиску
        if (searchQuery) {
            const text = ((e.title || '') + ' ' + (e.content || '') + ' ' + (e.tags || []).join(' ')).toLowerCase();
            if (!text.includes(searchQuery)) return false;
        }
        
        // Фильтр по дате
        if (dateFilter) {
            const d = new Date(e.date);
            if (d.getFullYear() !== dateFilter.year ||
                d.getMonth() !== dateFilter.month ||
                d.getDate() !== dateFilter.day) return false;
        }
        return true;
    });
}

// ============ РЕНДЕР ЗАПИСЕЙ ============
function render() {
    const entries = window.entries;
    const currentPage = window.currentPage;
    const searchQuery = window.searchQuery;
    const dateFilter = window.dateFilter;
    
    const filtered = getFilteredEntries(entries, searchQuery, dateFilter);
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
    
    if (currentPage > totalPages) window.currentPage = totalPages;
    
    const start = (window.currentPage - 1) * ITEMS_PER_PAGE;
    const pageEntries = filtered.slice(start, start + ITEMS_PER_PAGE);
    
    const entriesContainer = document.getElementById('entries');
    entriesContainer.innerHTML = '';
    
if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    
    if (searchQuery || dateFilter) {
        // Если это результат фильтрации
        empty.innerHTML = '🔍<br>Ничего не найдено...';
} else if (!window.currentUser) {
    empty.innerHTML = `
        <div class="sync-warning">
            <div class="warning-icon">💾</div>
            <h3>Записи хранятся только в этом браузере</h3>
            <p>
                При очистке кэша, переустановке браузера или смене устройства 
                ваши записи могут быть потеряны навсегда.
            </p>
            <div class="warning-features">
                <div class="warning-feature">
                    <span class="warning-feature-icon">☁️</span>
                    <span>Облачное хранение</span>
                </div>
                <div class="warning-feature">
                    <span class="warning-feature-icon">🔄</span>
                    <span>Синхронизация</span>
                </div>
                <div class="warning-feature">
                    <span class="warning-feature-icon">📱</span>
                    <span>С любого устройства</span>
                </div>
            </div>
            <button class="warning-btn" id="warningLoginBtn">
                <svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.79 2.73v2.26h2.91c1.7-1.57 2.68-3.88 2.68-6.63z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.83.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33C2.44 16.18 5.48 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.96 10.71c-.18-.54-.28-1.11-.28-1.71s.1-1.17.28-1.71V4.96H.96C.35 6.18 0 7.55 0 9s.35 2.82.96 4.04l3-2.33z"/>
                    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 1.82.96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"/>
                </svg>
                Войти через Google
            </button>
            <div class="warning-note">
                Это бесплатно и займёт пару секунд 🔐
            </div>
        </div>
    `;
        
        // Добавляем обработчик для кнопки входа
        setTimeout(() => {
            const btn = document.getElementById('warningLoginBtn');
            if (btn) {
                btn.addEventListener('click', signInWithGoogle);
            }
        }, 100);
    } else {
        // Если пользователь авторизован, но записей пока нет
        empty.innerHTML = `
            <div class="empty-state-icon">📝</div>
            <div class="empty-state-text">
                Пока нет записей...<br>
                Нажми + чтобы добавить первую!
            </div>
            <div style="margin-top: 15px; font-size: 14px; color: var(--text-secondary); opacity: 0.8;">
                ☁️ Ваши записи будут сохраняться в облаке
            </div>
        `;
    }
    
    entriesContainer.appendChild(empty);
} else {
        pageEntries.forEach((entry) => {
            const realIndex = entries.indexOf(entry);
            const div = document.createElement('div');
            div.className = 'entry';
            
            const date = new Date(entry.date).toLocaleDateString('ru-RU', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            const inkColor = entry.inkColor || INK_COLORS[0].color;
            const mood = entry.mood || '';
            
div.innerHTML = `
    <div class="entry-actions">
        <button class="action-btn edit-btn" title="Редактировать">✎</button>
        <button class="favorite-btn ${entry.favorite ? 'active' : ''}" title="В избранное">${entry.favorite ? '⭐' : '☆'}</button>
        <button class="action-btn delete-btn" title="Удалить">×</button>
    </div>
                <div class="entry-date">${mood} ${date}</div>
                <div class="entry-title" style="color: ${inkColor}">${escapeHtml(entry.title)}</div>
                ${entry.image ? `<img class="entry-image-preview" src="${entry.image}" />` : ''}
                <div class="entry-preview" style="color: ${inkColor}">${truncate(entry.content)}</div>
                ${(entry.tags || []).length > 0 ? `
                    <div class="entry-tags">
                        ${entry.tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}
                    </div>
                ` : ''}
            `;
            
const editBtn = div.querySelector('.edit-btn');
const deleteBtn = div.querySelector('.delete-btn');
const favoriteBtn = div.querySelector('.favorite-btn');  // ← ДОБАВИЛИ

editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openEditModal(realIndex);
});

deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    requestDelete(realIndex);
});

// ↓ ЭТОТ БЛОК ДОБАВИЛИ ↓
favoriteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await toggleFavorite(realIndex);
});

div.addEventListener('click', () => openViewModal(realIndex));
            
            entriesContainer.appendChild(div);
        });
    }
    
    renderPagination(totalPages);
}

// ============ ПАГИНАЦИЯ ============
function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    if (totalPages <= 1) return;
    
    const prev = document.createElement('button');
    prev.className = 'page-btn';
    prev.textContent = '‹';
    prev.disabled = window.currentPage === 1;
    prev.addEventListener('click', () => {
        window.currentPage--;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    pagination.appendChild(prev);
    
    const maxVisible = 5;
    let startPage = Math.max(1, window.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    function addPageBtn(page) {
        const btn = document.createElement('button');
        btn.className = 'page-btn' + (page === window.currentPage ? ' active' : '');
        btn.textContent = page;
        btn.addEventListener('click', () => {
            window.currentPage = page;
            render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        pagination.appendChild(btn);
    }
    
    if (startPage > 1) {
        addPageBtn(1);
        if (startPage > 2) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.style.padding = '0 8px';
            dots.style.color = 'var(--text-secondary)';
            pagination.appendChild(dots);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        addPageBtn(i);
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.style.padding = '0 8px';
            dots.style.color = 'var(--text-secondary)';
            pagination.appendChild(dots);
        }
        addPageBtn(totalPages);
    }
    
    const next = document.createElement('button');
    next.className = 'page-btn';
    next.textContent = '›';
    next.disabled = window.currentPage === totalPages;
    next.addEventListener('click', () => {
        window.currentPage++;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    pagination.appendChild(next);
}

// ============ КАЛЕНДАРЬ ============
function renderCalendar() {
    const calendarDate = window.calendarDate;
    const entries = window.entries;
    const dateFilter = window.dateFilter;
    
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    document.getElementById('calendarTitle').textContent = `${MONTHS_RU[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;
    
    const today = new Date();
    const entryDates = new Set();
    entries.forEach(e => {
        const d = new Date(e.date);
        if (d.getFullYear() === year && d.getMonth() === month) {
            entryDates.add(d.getDate());
        }
    });
    
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';
    
    for (let i = 0; i < startDay; i++) {
        const empty = document.createElement('button');
        empty.className = 'calendar-day empty';
        calendarDays.appendChild(empty);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const btn = document.createElement('button');
        btn.className = 'calendar-day';
        btn.textContent = day;
        
        if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === day) {
            btn.classList.add('today');
        }
        if (entryDates.has(day)) {
            btn.classList.add('has-entry');
        }
        if (dateFilter && dateFilter.year === year && dateFilter.month === month && dateFilter.day === day) {
            btn.classList.add('selected');
        }
        
        btn.addEventListener('click', () => {
            if (entryDates.has(day)) {
                window.dateFilter = { year, month, day };
                document.getElementById('filterHint').classList.add('active');
                document.getElementById('filterText').textContent = 
                    `Показаны записи за ${day} ${MONTHS_RU[month].toLowerCase()}`;
                window.currentPage = 1;
                render();
                renderCalendar();
            }
        });
        
        calendarDays.appendChild(btn);
    }
}

function clearDateFilter() {
    window.dateFilter = null;
    document.getElementById('filterHint').classList.remove('active');
    window.currentPage = 1;
    render();
    renderCalendar();
}