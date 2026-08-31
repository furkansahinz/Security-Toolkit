/**
 * Tool: Pano (Clipboard Board)
 * Clipboard içeriğini kalıcı olarak saklar ve yönetir
 */

const PANO_STORAGE_KEY = 'securityToolkit_pano';
const MAX_ITEMS = 100;
let panoItems = [];
let selectedItems = new Set();
let dragSourceId = null;
let pasteHandler = null;

/**
 * Initialize Pano
 */
function initPano() {
    const addBtn = document.getElementById('pano-add-btn');
    const pasteBtn = document.getElementById('pano-paste-btn');
    const input = document.getElementById('pano-input');
    const selectAllBtn = document.getElementById('pano-select-all-btn');
    const bulkDeleteBtn = document.getElementById('pano-bulk-delete-btn');
    const bulkLockBtn = document.getElementById('pano-bulk-lock-btn');
    const clearSelectionBtn = document.getElementById('pano-clear-selection-btn');
    const filterInput = document.getElementById('pano-filter-input');
    const showPinnedOnly = document.getElementById('pano-show-pinned-only');

    // Load saved items
    loadPanoItems();

    // Paste button (paste from clipboard to input - text only, or add image to pano)
    pasteBtn.addEventListener('click', async () => {
        try {
            // Try to read as image first (if image, add to pano directly)
            if (navigator.clipboard && navigator.clipboard.read) {
                try {
                    const clipboardItems = await navigator.clipboard.read();
                    for (const item of clipboardItems) {
                        // Check for image
                        const imageType = item.types.find(type => type.startsWith('image/'));
                        if (imageType) {
                            const blob = await item.getType(imageType);
                            await addItemFromImage(blob);
                            return;
                        }
                    }
                } catch (err) {
                    // Not an image or permission denied, continue to text
                    console.log('Görsel okuma denemesi başarısız:', err);
                }
            }
            
            // Try text
            if (navigator.clipboard && navigator.clipboard.readText) {
                const text = await navigator.clipboard.readText();
                if (text) {
                    input.value = text;
                    input.focus();
                    showToast('Panoya yapıştırıldı', 'success');
                } else {
                    showToast('Panoda metin bulunamadı', 'info');
                }
            } else {
                // Fallback: try to read from clipboard using execCommand
                input.focus();
                document.execCommand('paste');
                showToast('Yapıştırıldı', 'success');
            }
        } catch (err) {
            console.error('Yapıştırma hatası:', err);
            showToast('Yapıştırma başarısız. Lütfen Ctrl+V kullanın.', 'error');
        }
    });

    // Add button
    addBtn.addEventListener('click', () => {
        const text = input.value.trim();
        if (text) {
            addItemFromText(text);
            input.value = '';
        }
    });

    // Enter key in input
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addBtn.click();
        }
    });

    // Bulk delete
    bulkDeleteBtn.addEventListener('click', () => {
        bulkDelete();
    });

    // Bulk lock
    bulkLockBtn.addEventListener('click', () => {
        bulkLock();
    });

    // Select all
    selectAllBtn.addEventListener('click', () => {
        selectAll();
    });

    // Clear selection
    clearSelectionBtn.addEventListener('click', () => {
        clearSelection();
    });

    // Filter
    if (filterInput) {
        filterInput.addEventListener('input', (e) => {
            filterItems(e.target.value);
        });
    }

    // Show pinned only
    if (showPinnedOnly) {
        showPinnedOnly.addEventListener('change', (e) => {
            renderBoard();
        });
    }

    // Paste handler (only when pano is active)
    setupPasteHandler();

    // Initial render
    renderBoard();
}

/**
 * Setup paste handler for Ctrl+V
 */
function setupPasteHandler() {
    // Remove existing handler if any
    if (pasteHandler) {
        document.removeEventListener('paste', pasteHandler);
    }

    pasteHandler = async (e) => {
        // Only handle if pano screen is visible
        const panoScreen = document.getElementById('tool-pano');
        if (!panoScreen || panoScreen.style.display === 'none') {
            return;
        }

        const activeElement = document.activeElement;
        const isPanoInput = activeElement && activeElement.id === 'pano-input';
        
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData) return;

        // Check for image first (images should always be added to pano, not to input)
        const items = Array.from(clipboardData.items);
        const imageItem = items.find(item => item.kind === 'file' && item.type.startsWith('image/'));

        if (imageItem) {
            // Görsel yapıştırma: her zaman panoya ekle, input'a değil
            e.preventDefault();
            e.stopPropagation();
            
            try {
                const blob = imageItem.getAsFile();
                if (blob && blob.size > 0) {
                    await addItemFromImage(blob);
                } else {
                    showToast('Görsel okunamadı (boş dosya)', 'error');
                }
            } catch (err) {
                console.error('Görsel yapıştırma hatası:', err);
                showToast('Görsel yapıştırılamadı: ' + err.message, 'error');
            }
            return;
        }

        // Text handling
        if (isPanoInput) {
            // Input'ta ise, normal paste davranışına izin ver (text input'a gider)
            return;
        }

        // Input'ta değilse ve text varsa, panoya ekle
        const text = clipboardData.getData('text/plain');
        if (text && text.trim()) {
            e.preventDefault();
            addItemFromText(text);
        }
    };

    document.addEventListener('paste', pasteHandler);
}

/**
 * Load items from storage
 */
async function loadPanoItems() {
    try {
        const saved = localStorage.getItem(PANO_STORAGE_KEY);
        if (saved) {
            panoItems = JSON.parse(saved);
            
            // Load image blobs from IndexedDB
            for (const item of panoItems) {
                if (item.type === 'image' && item.imageId) {
                    try {
                        const blob = await getImage(item.imageId);
                        if (blob) {
                            item.imageBlob = blob;
                            item.imageUrl = URL.createObjectURL(blob);
                        }
                    } catch (err) {
                        console.error('Görsel yüklenemedi:', err);
                    }
                }
            }
        }
    } catch (err) {
        console.error('Pano yüklenemedi:', err);
        panoItems = [];
    }
}

/**
 * Save items to storage
 */
async function savePanoItems() {
    try {
        // Save metadata to localStorage
        const metadata = panoItems.map(item => ({
            id: item.id,
            type: item.type,
            text: item.text,
            imageId: item.imageId,
            pinned: item.pinned || false,
            locked: item.locked || false,
            createdAt: item.createdAt,
            orderIndex: item.orderIndex || 0
        }));
        localStorage.setItem(PANO_STORAGE_KEY, JSON.stringify(metadata));
    } catch (err) {
        console.error('Pano kaydedilemedi:', err);
        showToast('Kaydetme hatası', 'error');
    }
}

/**
 * Add text item
 */
function addItemFromText(text) {
    if (panoItems.length >= MAX_ITEMS) {
        // Try to remove oldest unpinned item
        const unpinnedItems = panoItems.filter(item => !item.pinned);
        if (unpinnedItems.length === 0) {
            showToast(`Pano dolu (${MAX_ITEMS} kayıt). Lütfen önce bazı kayıtları silin.`, 'error');
            return;
        }
        
        // Remove oldest unpinned
        unpinnedItems.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        const oldest = unpinnedItems[0];
        deleteItem(oldest.id, false);
    }

    // Yeni öğe başa gelsin: tüm mevcut orderIndex'leri artır
    panoItems.forEach(item => {
        item.orderIndex = (item.orderIndex || 0) + 1;
    });

    const item = {
        id: generateId(),
        type: 'text',
        text: text,
        pinned: false,
        locked: false,
        createdAt: Date.now(),
        orderIndex: 0  // En başa ekle
    };

    panoItems.push(item);
    savePanoItems();
    renderBoard();
    showToast('Panoya eklendi', 'success');
}

/**
 * Add image item
 */
async function addItemFromImage(blob) {
    if (panoItems.length >= MAX_ITEMS) {
        const unpinnedItems = panoItems.filter(item => !item.pinned);
        if (unpinnedItems.length === 0) {
            showToast(`Pano dolu (${MAX_ITEMS} kayıt). Lütfen önce bazı kayıtları silin.`, 'error');
            return;
        }
        
        unpinnedItems.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        const oldest = unpinnedItems[0];
        await deleteItem(oldest.id, false);
    }

    const imageId = generateId();
    
    try {
        await saveImage(imageId, blob);
        const imageUrl = URL.createObjectURL(blob);

        // Yeni öğe başa gelsin: tüm mevcut orderIndex'leri artır
        panoItems.forEach(item => {
            item.orderIndex = (item.orderIndex || 0) + 1;
        });

        const item = {
            id: generateId(),
            type: 'image',
            imageId: imageId,
            imageUrl: imageUrl,
            imageBlob: blob,
            pinned: false,
            locked: false,
            createdAt: Date.now(),
            orderIndex: 0  // En başa ekle
        };

        panoItems.push(item);
        await savePanoItems();
        renderBoard();
        showToast('Görsel panoya eklendi', 'success');
    } catch (err) {
        console.error('Görsel eklenemedi:', err);
        showToast('Görsel eklenemedi', 'error');
    }
}

/**
 * Delete item
 */
async function deleteItem(id, showToastMsg = true) {
    const item = panoItems.find(i => i.id === id);
    if (!item) return;

    if (item.locked) {
        if (showToastMsg) showToast('Kilitli kayıt silinemez', 'error');
        return false;
    }

    // Delete image from IndexedDB if exists
    if (item.type === 'image' && item.imageId) {
        try {
            await deleteImage(item.imageId);
            if (item.imageUrl) {
                URL.revokeObjectURL(item.imageUrl);
            }
        } catch (err) {
            console.error('Görsel silinemedi:', err);
        }
    }

    panoItems = panoItems.filter(i => i.id !== id);
    selectedItems.delete(id);
    await savePanoItems();
    renderBoard();
    
    if (showToastMsg) showToast('Silindi', 'success');
    return true;
}

/**
 * Toggle pin
 */
function togglePin(id) {
    const item = panoItems.find(i => i.id === id);
    if (!item) return;

    item.pinned = !item.pinned;
    savePanoItems();
    renderBoard();
    showToast(item.pinned ? 'Başa tutturuldu' : 'Tutturma kaldırıldı', 'info');
}

/**
 * Toggle lock
 */
function toggleLock(id) {
    const item = panoItems.find(i => i.id === id);
    if (!item) return;

    item.locked = !item.locked;
    savePanoItems();
    renderBoard();
    showToast(item.locked ? 'Kilitlendi' : 'Kilit açıldı', 'info');
}

/**
 * Bulk delete
 */
async function bulkDelete() {
    if (selectedItems.size === 0) {
        showToast('Lütfen silmek için kayıt seçin', 'error');
        return;
    }

    let deleted = 0;
    let skipped = 0;

    for (const id of selectedItems) {
        const success = await deleteItem(id, false);
        if (success) {
            deleted++;
        } else {
            skipped++;
        }
    }

    selectedItems.clear();
    renderBoard();

    if (skipped > 0) {
        showToast(`${deleted} kayıt silindi, ${skipped} kilitli kayıt atlandı`, 'info');
    } else {
        showToast(`${deleted} kayıt silindi`, 'success');
    }
}

/**
 * Bulk lock
 */
function bulkLock() {
    if (selectedItems.size === 0) {
        showToast('Lütfen kilitlemek için kayıt seçin', 'error');
        return;
    }

    let locked = 0;
    for (const id of selectedItems) {
        const item = panoItems.find(i => i.id === id);
        if (item && !item.locked) {
            item.locked = true;
            locked++;
        }
    }

    selectedItems.clear();
    savePanoItems();
    renderBoard();
    showToast(`${locked} kayıt kilitlendi`, 'success');
}

/**
 * Select all items
 */
function selectAll() {
    // Get currently visible/filtered items
    const filterInput = document.getElementById('pano-filter-input');
    const showPinnedOnly = document.getElementById('pano-show-pinned-only');
    
    let filtered = [...panoItems];
    
    // Apply same filters as renderBoard
    if (filterInput && filterInput.value.trim()) {
        const term = filterInput.value.toLowerCase();
        filtered = filtered.filter(item => {
            if (item.type === 'text') {
                return item.text.toLowerCase().includes(term);
            }
            return true;
        });
    }
    
    if (showPinnedOnly && showPinnedOnly.checked) {
        filtered = filtered.filter(item => item.pinned);
    }
    
    // Select all filtered items
    filtered.forEach(item => {
        selectedItems.add(item.id);
    });
    
    renderBoard();
    
    const count = selectedItems.size;
    if (count > 0) {
        showToast(`${count} öğe seçildi`, 'success');
    } else {
        showToast('Seçilecek öğe yok', 'info');
    }
}

/**
 * Clear selection
 */
function clearSelection() {
    selectedItems.clear();
    renderBoard();
    showToast('Seçim temizlendi', 'info');
}

/**
 * Toggle item selection
 */
function toggleSelection(id) {
    if (selectedItems.has(id)) {
        selectedItems.delete(id);
    } else {
        selectedItems.add(id);
    }
    renderBoard();
}

/**
 * Filter items
 */
function filterItems(searchTerm) {
    renderBoard();
}

/**
 * Render board
 */
function renderBoard() {
    const container = document.getElementById('pano-grid');
    if (!container) return;

    const filterInput = document.getElementById('pano-filter-input');
    const showPinnedOnly = document.getElementById('pano-show-pinned-only');
    
    let filtered = [...panoItems];
    
    // Filter by search
    if (filterInput && filterInput.value.trim()) {
        const term = filterInput.value.toLowerCase();
        filtered = filtered.filter(item => {
            if (item.type === 'text') {
                return item.text.toLowerCase().includes(term);
            }
            return true; // Images can't be filtered by text
        });
    }
    
    // Filter by pinned
    if (showPinnedOnly && showPinnedOnly.checked) {
        filtered = filtered.filter(item => item.pinned);
    }
    
    // Sort: pinned first (by createdAt), then unpinned by orderIndex (ascending = newest first)
    filtered.sort((a, b) => {
        // Pinned items first, sorted by creation time (newest first)
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        if (a.pinned && b.pinned) {
            return (b.createdAt || 0) - (a.createdAt || 0); // Newest pinned first
        }
        // Unpinned items: orderIndex ascending (0 = newest, higher = older)
        return (a.orderIndex || 0) - (b.orderIndex || 0);
    });

    container.innerHTML = '';

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p class="empty-state-text">Pano boş. Metin veya görsel ekleyin.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(item => {
        const card = createCard(item);
        container.appendChild(card);
    });
}

/**
 * Create card element
 */
function createCard(item) {
    const card = document.createElement('div');
    card.className = `pano-card ${item.pinned ? 'pano-card-pinned' : ''} ${item.locked ? 'pano-card-locked' : ''} ${selectedItems.has(item.id) ? 'pano-card-selected' : ''}`;
    card.draggable = !item.locked;
    card.dataset.id = item.id;

    // Selection checkbox (custom professional checkbox)
    const checkboxContainer = document.createElement('label');
    checkboxContainer.className = 'pano-card-checkbox-container';
    checkboxContainer.addEventListener('click', (e) => e.stopPropagation());
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'pano-card-checkbox';
    checkbox.checked = selectedItems.has(item.id);
    checkbox.addEventListener('change', () => toggleSelection(item.id));
    
    const checkboxCustom = document.createElement('span');
    checkboxCustom.className = 'pano-card-checkbox-custom';
    
    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(checkboxCustom);

    // Content preview
    const content = document.createElement('div');
    content.className = 'pano-card-content';
    
    if (item.type === 'text') {
        content.textContent = item.text;
        content.title = item.text;
    } else if (item.type === 'image' && item.imageUrl) {
        const img = document.createElement('img');
        img.src = item.imageUrl;
        img.alt = 'Pano görseli';
        img.className = 'pano-card-image';
        content.appendChild(img);
    }

    // Actions
    const actions = document.createElement('div');
    actions.className = 'pano-card-actions';
    
    const pinBtn = document.createElement('button');
    pinBtn.className = 'pano-card-action-btn';
    pinBtn.innerHTML = item.pinned ? '📌' : '📍';
    pinBtn.title = item.pinned ? 'Tutturmayı kaldır' : 'Başa tuttur';
    pinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePin(item.id);
    });

    const lockBtn = document.createElement('button');
    lockBtn.className = 'pano-card-action-btn';
    lockBtn.innerHTML = item.locked ? '🔒' : '🔓';
    lockBtn.title = item.locked ? 'Kilidi aç' : 'Kilitle';
    lockBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLock(item.id);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'pano-card-action-btn';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Sil';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteItem(item.id);
    });

    actions.appendChild(pinBtn);
    actions.appendChild(lockBtn);
    actions.appendChild(deleteBtn);

    // Card click handler (copy)
    card.addEventListener('click', async (e) => {
        // Don't copy if clicking on buttons or checkbox
        if (e.target.closest('.pano-card-actions') || e.target.closest('.pano-card-checkbox-container')) {
            return;
        }

        await copyItem(item);
    });

    // Drag & drop (improved)
    if (!item.locked) {
        card.addEventListener('dragstart', (e) => {
            dragSourceId = item.id;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', item.id); // For better compatibility
            card.classList.add('pano-card-dragging');
            
            // Create drag image
            const dragImage = card.cloneNode(true);
            dragImage.style.opacity = '0.8';
            dragImage.style.transform = 'rotate(3deg)';
            document.body.appendChild(dragImage);
            e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
            setTimeout(() => document.body.removeChild(dragImage), 0);
        });

        card.addEventListener('dragend', (e) => {
            dragSourceId = null;
            card.classList.remove('pano-card-dragging');
            // Remove all drag-over classes
            document.querySelectorAll('.pano-card-drag-over').forEach(c => {
                c.classList.remove('pano-card-drag-over');
            });
        });

        card.addEventListener('dragover', (e) => {
            if (dragSourceId && dragSourceId !== item.id) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                card.classList.add('pano-card-drag-over');
            }
        });

        card.addEventListener('dragleave', (e) => {
            // Only remove if we're actually leaving the card
            if (!card.contains(e.relatedTarget)) {
                card.classList.remove('pano-card-drag-over');
            }
        });

        card.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            card.classList.remove('pano-card-drag-over');
            
            if (dragSourceId && dragSourceId !== item.id) {
                moveItem(dragSourceId, item.id);
            }
        });
    }

    card.appendChild(checkboxContainer);
    card.appendChild(content);
    card.appendChild(actions);

    return card;
}

/**
 * Copy item to clipboard
 */
async function copyItem(item) {
    try {
        if (item.type === 'text') {
            await navigator.clipboard.writeText(item.text);
            showToast('Kopyalandı', 'success');
        } else if (item.type === 'image' && item.imageBlob) {
            try {
                const clipboardItem = new ClipboardItem({
                    [item.imageBlob.type]: item.imageBlob
                });
                await navigator.clipboard.write([clipboardItem]);
                showToast('Görsel kopyalandı', 'success');
            } catch (err) {
                // Fallback: download option
                const url = item.imageUrl;
                const a = document.createElement('a');
                a.href = url;
                a.download = `pano-image-${item.id}.png`;
                a.click();
                showToast('Görsel kopyalanamadı, indirme başlatıldı', 'info');
            }
        }
    } catch (err) {
        console.error('Kopyalama hatası:', err);
        showToast('Kopyalama başarısız', 'error');
    }
}

/**
 * Move item (drag & drop)
 */
function moveItem(sourceId, targetId) {
    const sourceItem = panoItems.find(i => i.id === sourceId);
    const targetItem = panoItems.find(i => i.id === targetId);
    
    if (!sourceItem || !targetItem) return;
    
    // Kilitli öğeler taşınamaz
    if (sourceItem.locked || targetItem.locked) {
        showToast('Kilitli öğeler taşınamaz', 'error');
        return;
    }

    // Pinned öğeleri koru, sadece unpinned öğeleri taşı
    if (sourceItem.pinned || targetItem.pinned) {
        // Pinned öğeleri taşıma, sadece unpinned öğeleri taşı
        if (sourceItem.pinned && !targetItem.pinned) {
            // Pinned öğeyi unpinned öğenin yerine taşıma
            showToast('Tutturulan öğeler taşınamaz', 'info');
            return;
        }
    }

    // Swap orderIndex
    const temp = sourceItem.orderIndex;
    sourceItem.orderIndex = targetItem.orderIndex;
    targetItem.orderIndex = temp;

    savePanoItems();
    renderBoard();
    showToast('Sıralama güncellendi', 'success');
}

/**
 * Generate unique ID
 */
function generateId() {
    return 'pano_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

