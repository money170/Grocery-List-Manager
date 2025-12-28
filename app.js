// Data Model
let groceryLists = [];
let currentListId = null;
let currentFilter = 'all';
let isShoppingMode = false;
let isSuperFullScreen = false;
let isBulkSelectMode = false;
let selectedItems = new Set();
let showArchived = false;
let darkMode = false;
let shoppingHistory = [];
let favorites = [];
let templates = [];

// Category emoji mapping
const categoryEmojis = {
    'Produce': '🥬',
    'Dairy': '🥛',
    'Meat': '🥩',
    'Bakery': '🍞',
    'Frozen': '❄️',
    'Pantry': '🥫',
    'Beverages': '🥤',
    'Snacks': '🍿',
    'Other': '📦'
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeEventListeners();
    updateUI();
    updateQuickAddButtons();
    updateFavoritesButtons();
    updateItemSuggestions();
});

// Local Storage Functions
function saveData() {
    localStorage.setItem('groceryLists', JSON.stringify(groceryLists));
    localStorage.setItem('currentListId', currentListId);
    localStorage.setItem('shoppingHistory', JSON.stringify(shoppingHistory));
    localStorage.setItem('favorites', JSON.stringify(favorites));
    localStorage.setItem('templates', JSON.stringify(templates));
    localStorage.setItem('darkMode', darkMode);
}

function loadData() {
    const savedLists = localStorage.getItem('groceryLists');
    const savedCurrentId = localStorage.getItem('currentListId');
    const savedHistory = localStorage.getItem('shoppingHistory');
    const savedFavorites = localStorage.getItem('favorites');
    const savedTemplates = localStorage.getItem('templates');
    const savedDarkMode = localStorage.getItem('darkMode');
    
    if (savedLists) {
        groceryLists = JSON.parse(savedLists);
    }
    
    if (savedCurrentId) {
        currentListId = savedCurrentId;
    }
    
    if (savedHistory) {
        shoppingHistory = JSON.parse(savedHistory);
    }
    
    if (savedFavorites) {
        favorites = JSON.parse(savedFavorites);
    }
    
    if (savedTemplates) {
        templates = JSON.parse(savedTemplates);
    }
    
    if (savedDarkMode === 'true') {
        darkMode = true;
        document.body.classList.add('dark-mode');
    }
}

// List Management Functions
function createList(name, fromTemplate = null) {
    const newList = {
        id: Date.now().toString(),
        name: name,
        items: fromTemplate ? JSON.parse(JSON.stringify(fromTemplate.items)) : [],
        archived: false,
        createdAt: Date.now()
    };
    groceryLists.push(newList);
    currentListId = newList.id;
    saveData();
    updateUI();
}

function deleteList(listId) {
    const index = groceryLists.findIndex(list => list.id === listId);
    if (index !== -1) {
        groceryLists.splice(index, 1);
        if (currentListId === listId) {
            currentListId = groceryLists.length > 0 ? groceryLists[0].id : null;
        }
        saveData();
        updateUI();
    }
}

function renameList(listId, newName) {
    const list = groceryLists.find(list => list.id === listId);
    if (list) {
        list.name = newName;
        saveData();
        updateUI();
    }
}

function getCurrentList() {
    return groceryLists.find(list => list.id === currentListId);
}

// Item Management Functions
function addItem(name, quantity, category, priority = 'normal', notes = '', isFavorite = false) {
    const list = getCurrentList();
    if (list) {
        const newItem = {
            id: Date.now().toString(),
            name: name,
            quantity: quantity,
            category: category,
            priority: priority,
            notes: notes,
            purchased: false,
            addedAt: Date.now()
        };
        list.items.push(newItem);
        
        // Add to shopping history
        if (!shoppingHistory.find(h => h.name.toLowerCase() === name.toLowerCase())) {
            shoppingHistory.push({ name: name, category: category, count: 1, lastAdded: Date.now() });
        } else {
            const historyItem = shoppingHistory.find(h => h.name.toLowerCase() === name.toLowerCase());
            historyItem.count++;
            historyItem.lastAdded = Date.now();
        }
        
        // Add to favorites if marked
        if (isFavorite && !favorites.find(f => f.name.toLowerCase() === name.toLowerCase())) {
            favorites.push({ name: name, category: category, quantity: quantity });
        }
        
        saveData();
        updateItemsDisplay();
        updateQuickAddButtons();
        updateFavoritesButtons();
        updateItemSuggestions();
    }
}

function deleteItem(itemId) {
    const list = getCurrentList();
    if (list) {
        const index = list.items.findIndex(item => item.id === itemId);
        if (index !== -1) {
            list.items.splice(index, 1);
            saveData();
            updateItemsDisplay();
        }
    }
}

function toggleItemPurchased(itemId) {
    const list = getCurrentList();
    if (list) {
        const item = list.items.find(item => item.id === itemId);
        if (item) {
            item.purchased = !item.purchased;
            saveData();
            updateItemsDisplay();
        }
    }
}

function clearCompletedItems() {
    const list = getCurrentList();
    if (list) {
        const purchasedCount = list.items.filter(item => item.purchased).length;
        if (purchasedCount > 0) {
            if (confirm(`Clear ${purchasedCount} purchased item(s)?`)) {
                list.items = list.items.filter(item => !item.purchased);
                saveData();
                updateItemsDisplay();
            }
        }
    }
}

// Filter Functions
function getFilteredItems(purchased = false) {
    const list = getCurrentList();
    if (!list) return [];
    
    let items = list.items.filter(item => item.purchased === purchased);
    
    if (currentFilter !== 'all') {
        items = items.filter(item => item.category === currentFilter);
    }
    
    return items;
}

// UI Update Functions
function updateUI() {
    updateListSelector();
    updateMainContent();
}

function updateListSelector() {
    const selector = document.getElementById('listSelector');
    selector.innerHTML = '<option value="">Select a list...</option>';
    
    const filteredLists = groceryLists.filter(list => 
        showArchived ? list.archived : !list.archived
    );
    
    filteredLists.forEach(list => {
        const option = document.createElement('option');
        option.value = list.id;
        option.textContent = list.name + (list.archived ? ' (Archived)' : '');
        if (list.id === currentListId) {
            option.selected = true;
        }
        selector.appendChild(option);
    });
}

function updateMainContent() {
    const mainContent = document.getElementById('mainContent');
    const emptyState = document.getElementById('emptyState');
    
    if (currentListId && getCurrentList()) {
        mainContent.style.display = 'block';
        emptyState.style.display = 'none';
        updateCurrentListName();
        updateItemsDisplay();
    } else {
        mainContent.style.display = 'none';
        emptyState.style.display = 'block';
    }
}

function updateCurrentListName() {
    const list = getCurrentList();
    if (list) {
        document.getElementById('currentListName').textContent = list.name;
        const archiveBtn = document.getElementById('archiveListBtn');
        if (archiveBtn) {
            archiveBtn.textContent = list.archived ? '📦 Unarchive' : '📦 Archive';
        }
    }
}

function updateItemsDisplay() {
    const activeItems = getFilteredItems(false);
    const completedItems = getFilteredItems(true);
    
    updateItemsList('activeItemsList', activeItems);
    updateItemsList('completedItemsList', completedItems);
    updateStats();
    updateQuickAddButtons();
    updateFavoritesButtons();
}

function updateItemsList(listId, items) {
    const listElement = document.getElementById(listId);
    listElement.innerHTML = '';
    
    if (items.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.padding = '20px';
        emptyMessage.style.color = '#999';
        emptyMessage.textContent = listId === 'activeItemsList' ? 
            'No items in your list. Add some items above!' : 
            'No purchased items yet.';
        listElement.appendChild(emptyMessage);
        return;
    }
    
    items.forEach(item => {
        const itemElement = createItemElement(item);
        listElement.appendChild(itemElement);
    });
}

function createItemElement(item) {
    const li = document.createElement('li');
    li.className = `item ${item.purchased ? 'purchased' : ''} ${item.priority || 'normal'}-priority`;
    li.dataset.itemId = item.id;
    
    let checkbox;
    if (isBulkSelectMode && !item.purchased) {
        checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'bulk-select-checkbox';
        checkbox.checked = selectedItems.has(item.id);
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedItems.add(item.id);
            } else {
                selectedItems.delete(item.id);
            }
            updateBulkActions();
        });
    } else {
        checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.purchased;
        checkbox.addEventListener('change', () => toggleItemPurchased(item.id));
    }
    
    const content = document.createElement('div');
    content.className = 'item-content';
    
    const nameRow = document.createElement('div');
    nameRow.className = 'item-name-row';
    
    const name = document.createElement('div');
    name.className = 'item-name';
    name.textContent = item.name;
    
    if (item.priority === 'high') {
        const priorityBadge = document.createElement('span');
        priorityBadge.className = 'priority-badge high';
        priorityBadge.textContent = '⭐ Must Have';
        nameRow.appendChild(priorityBadge);
    } else if (item.priority === 'low') {
        const priorityBadge = document.createElement('span');
        priorityBadge.className = 'priority-badge low';
        priorityBadge.textContent = 'Nice to Have';
        nameRow.appendChild(priorityBadge);
    }
    
    nameRow.appendChild(name);
    
    const details = document.createElement('div');
    details.className = 'item-details';
    
    const quantity = document.createElement('span');
    quantity.className = 'item-quantity';
    quantity.textContent = `Qty: ${item.quantity}`;
    
    const category = document.createElement('span');
    category.className = `category-badge category-${item.category}`;
    category.textContent = `${categoryEmojis[item.category]} ${item.category}`;
    
    details.appendChild(quantity);
    details.appendChild(category);
    
    if (item.notes) {
        const notes = document.createElement('div');
        notes.className = 'item-notes';
        notes.textContent = `📝 ${item.notes}`;
        details.appendChild(notes);
    }
    
    content.appendChild(nameRow);
    content.appendChild(details);
    
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    
    const favoriteBtn = document.createElement('button');
    favoriteBtn.className = 'item-favorite';
    favoriteBtn.textContent = favorites.find(f => f.name.toLowerCase() === item.name.toLowerCase()) ? '★' : '☆';
    favoriteBtn.title = 'Toggle favorite';
    favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(item.name, item.category, item.quantity);
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'item-delete';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete item';
    deleteBtn.addEventListener('click', () => deleteItem(item.id));
    
    actions.appendChild(favoriteBtn);
    actions.appendChild(deleteBtn);
    
    li.appendChild(checkbox);
    li.appendChild(content);
    li.appendChild(actions);
    
    return li;
}

function updateStats() {
    const list = getCurrentList();
    if (list) {
        const total = list.items.length;
        const purchased = list.items.filter(item => item.purchased).length;
        const remaining = total - purchased;
        
        document.getElementById('itemStats').textContent = 
            `${total} total | ${remaining} remaining | ${purchased} purchased`;
    }
}

// Quick Add Functions
function updateQuickAddButtons() {
    const container = document.getElementById('quickAddButtons');
    container.innerHTML = '';
    
    // Sort by most recent and show top 10
    const recent = [...shoppingHistory]
        .sort((a, b) => b.lastAdded - a.lastAdded)
        .slice(0, 10);
    
    recent.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'quick-add-btn';
        btn.textContent = item.name;
        btn.title = `Add ${item.name} (used ${item.count} times)`;
        btn.addEventListener('click', () => {
            document.getElementById('itemName').value = item.name;
            document.getElementById('itemCategory').value = item.category;
            document.getElementById('itemName').focus();
        });
        container.appendChild(btn);
    });
}

function updateFavoritesButtons() {
    const container = document.getElementById('favoritesButtons');
    container.innerHTML = '';
    
    if (favorites.length === 0) {
        container.innerHTML = '<p class="no-favorites">No favorites yet. Click the star on any item to add it to favorites.</p>';
        return;
    }
    
    favorites.forEach(fav => {
        const btn = document.createElement('button');
        btn.className = 'quick-add-btn favorite-btn';
        btn.textContent = `★ ${fav.name}`;
        btn.title = `Add ${fav.name} from favorites`;
        btn.addEventListener('click', () => {
            addItem(fav.name, fav.quantity || '1', fav.category, 'normal', '', true);
        });
        container.appendChild(btn);
    });
}

function updateItemSuggestions() {
    const datalist = document.getElementById('itemSuggestions');
    datalist.innerHTML = '';
    
    const allItems = [...shoppingHistory, ...favorites]
        .map(item => item.name)
        .filter((name, index, self) => self.indexOf(name) === index)
        .slice(0, 20);
    
    allItems.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        datalist.appendChild(option);
    });
}

function toggleFavorite(name, category, quantity) {
    const index = favorites.findIndex(f => f.name.toLowerCase() === name.toLowerCase());
    if (index !== -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push({ name: name, category: category, quantity: quantity || '1' });
    }
    saveData();
    updateItemsDisplay();
    updateFavoritesButtons();
}

// Bulk Operations
function toggleBulkSelectMode() {
    isBulkSelectMode = !isBulkSelectMode;
    selectedItems.clear();
    
    if (isBulkSelectMode) {
        document.getElementById('bulkActions').style.display = 'flex';
        document.getElementById('bulkSelectModeBtn').textContent = 'Cancel Selection';
    } else {
        document.getElementById('bulkActions').style.display = 'none';
        document.getElementById('bulkSelectModeBtn').textContent = 'Select Multiple';
    }
    
    updateItemsDisplay();
}

function updateBulkActions() {
    const count = selectedItems.size;
    if (count > 0) {
        document.getElementById('bulkMarkPurchasedBtn').disabled = false;
        document.getElementById('bulkDeleteBtn').disabled = false;
    } else {
        document.getElementById('bulkMarkPurchasedBtn').disabled = true;
        document.getElementById('bulkDeleteBtn').disabled = true;
    }
}

function bulkSelectAll() {
    const list = getCurrentList();
    if (list) {
        list.items.filter(item => !item.purchased).forEach(item => {
            selectedItems.add(item.id);
        });
        updateItemsDisplay();
        updateBulkActions();
    }
}

function bulkMarkPurchased() {
    selectedItems.forEach(itemId => {
        const list = getCurrentList();
        if (list) {
            const item = list.items.find(i => i.id === itemId);
            if (item && !item.purchased) {
                item.purchased = true;
            }
        }
    });
    selectedItems.clear();
    saveData();
    toggleBulkSelectMode();
    updateItemsDisplay();
}

function bulkDelete() {
    if (confirm(`Delete ${selectedItems.size} selected item(s)?`)) {
        selectedItems.forEach(itemId => {
            deleteItem(itemId);
        });
        selectedItems.clear();
        toggleBulkSelectMode();
        updateItemsDisplay();
    }
}

// Archive Functions
function archiveList(listId) {
    const list = groceryLists.find(l => l.id === listId);
    if (list) {
        list.archived = true;
        saveData();
        updateUI();
    }
}

function unarchiveList(listId) {
    const list = groceryLists.find(l => l.id === listId);
    if (list) {
        list.archived = false;
        saveData();
        updateUI();
    }
}

// Template Functions
function saveAsTemplate() {
    const list = getCurrentList();
    if (!list) {
        alert('No list selected');
        return;
    }
    
    const name = prompt('Enter template name:', list.name);
    if (name && name.trim()) {
        templates.push({
            id: Date.now().toString(),
            name: name.trim(),
            items: JSON.parse(JSON.stringify(list.items)),
            createdAt: Date.now()
        });
        saveData();
        updateTemplatesList();
        alert('Template saved!');
    }
}

function createFromTemplate(templateId) {
    const template = templates.find(t => t.id === templateId);
    if (template) {
        const name = prompt('Enter list name:', template.name);
        if (name && name.trim()) {
            createList(name.trim(), template);
        }
    }
}

function deleteTemplate(templateId) {
    if (confirm('Delete this template?')) {
        const index = templates.findIndex(t => t.id === templateId);
        if (index !== -1) {
            templates.splice(index, 1);
            saveData();
            updateTemplatesList();
        }
    }
}

function updateTemplatesList() {
    const container = document.getElementById('templatesList');
    container.innerHTML = '';
    
    if (templates.length === 0) {
        container.innerHTML = '<p>No templates saved yet.</p>';
        return;
    }
    
    templates.forEach(template => {
        const div = document.createElement('div');
        div.className = 'template-item';
        div.innerHTML = `
            <div class="template-info">
                <h4>${template.name}</h4>
                <p>${template.items.length} items</p>
            </div>
            <div class="template-actions">
                <button class="btn btn-primary btn-sm use-template-btn" data-id="${template.id}">Use</button>
                <button class="btn btn-danger btn-sm delete-template-btn" data-id="${template.id}">Delete</button>
            </div>
        `;
        container.appendChild(div);
    });
    
    // Add event listeners
    container.querySelectorAll('.use-template-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            createFromTemplate(e.target.dataset.id);
            document.getElementById('templateModal').style.display = 'none';
        });
    });
    
    container.querySelectorAll('.delete-template-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            deleteTemplate(e.target.dataset.id);
        });
    });
}

// Export/Import Functions
function exportList() {
    const list = getCurrentList();
    if (!list) {
        alert('No list selected');
        return;
    }
    
    const dataStr = JSON.stringify(list, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${list.name.replace(/[^a-z0-9]/gi, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function exportAsCSV() {
    const list = getCurrentList();
    if (!list) {
        alert('No list selected');
        return;
    }
    
    let csv = 'Name,Quantity,Category,Priority,Notes,Purchased\n';
    list.items.forEach(item => {
        csv += `"${item.name}","${item.quantity}","${item.category}","${item.priority || 'normal'}","${item.notes || ''}","${item.purchased ? 'Yes' : 'No'}"\n`;
    });
    
    const dataBlob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${list.name.replace(/[^a-z0-9]/gi, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function importList(data) {
    try {
        let listData;
        
        // Try JSON first
        try {
            listData = JSON.parse(data);
        } catch (e) {
            // Try CSV
            listData = parseCSV(data);
        }
        
        if (listData.name && Array.isArray(listData.items)) {
            createList(listData.name, { items: listData.items });
            alert('List imported successfully!');
            document.getElementById('importModal').style.display = 'none';
            document.getElementById('importData').value = '';
        } else {
            throw new Error('Invalid format');
        }
    } catch (error) {
        alert('Error importing list. Please check the format.');
        console.error(error);
    }
}

function parseCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const items = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
        const item = {
            id: Date.now().toString() + i,
            name: values[0]?.replace(/"/g, '') || '',
            quantity: values[1]?.replace(/"/g, '') || '1',
            category: values[2]?.replace(/"/g, '') || 'Other',
            priority: values[3]?.replace(/"/g, '') || 'normal',
            notes: values[4]?.replace(/"/g, '') || '',
            purchased: values[5]?.replace(/"/g, '').toLowerCase() === 'yes',
            addedAt: Date.now()
        };
        items.push(item);
    }
    
    return {
        name: 'Imported List',
        items: items
    };
}

// Dark Mode
function toggleDarkMode() {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode', darkMode);
    saveData();
    updateDarkModeButton();
}

function updateDarkModeButton() {
    const btn = document.getElementById('darkModeToggle');
    btn.textContent = darkMode ? '☀️' : '🌙';
}

// Print View
function printList() {
    const list = getCurrentList();
    if (!list) {
        alert('No list selected');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    const activeItems = list.items.filter(item => !item.purchased);
    const completedItems = list.items.filter(item => item.purchased);
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${list.name} - Grocery List</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #333; }
                .item { margin: 10px 0; padding: 10px; border-bottom: 1px solid #ddd; }
                .item-name { font-weight: bold; font-size: 16px; }
                .item-details { color: #666; margin-top: 5px; }
                .priority-high { background: #fff3cd; }
                .completed { text-decoration: line-through; opacity: 0.6; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>${list.name}</h1>
            <h2>Shopping List</h2>
            ${activeItems.map(item => `
                <div class="item ${item.priority === 'high' ? 'priority-high' : ''}">
                    <div class="item-name">${item.name}</div>
                    <div class="item-details">
                        Quantity: ${item.quantity} | ${item.category}
                        ${item.notes ? ` | Notes: ${item.notes}` : ''}
                    </div>
                </div>
            `).join('')}
            ${completedItems.length > 0 ? `
                <h2>Purchased</h2>
                ${completedItems.map(item => `
                    <div class="item completed">
                        <div class="item-name">${item.name}</div>
                    </div>
                `).join('')}
            ` : ''}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Event Listeners
function initializeEventListeners() {
    // New List Button
    document.getElementById('newListBtn').addEventListener('click', () => {
        const name = prompt('Enter list name:');
        if (name && name.trim()) {
            createList(name.trim());
        }
    });
    
    // List Selector
    document.getElementById('listSelector').addEventListener('change', (e) => {
        currentListId = e.target.value || null;
        saveData();
        updateMainContent();
    });
    
    // Rename List Button
    document.getElementById('renameListBtn').addEventListener('click', () => {
        const list = getCurrentList();
        if (list) {
            const newName = prompt('Enter new name:', list.name);
            if (newName && newName.trim()) {
                renameList(list.id, newName.trim());
            }
        }
    });
    
    // Delete List Button
    document.getElementById('deleteListBtn').addEventListener('click', () => {
        const list = getCurrentList();
        if (list) {
            if (confirm(`Delete list "${list.name}"?`)) {
                deleteList(list.id);
            }
        }
    });
    
    // Add Item Form
    document.getElementById('addItemForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('itemName').value.trim();
        const quantity = document.getElementById('itemQuantity').value.trim();
        const category = document.getElementById('itemCategory').value;
        const priority = document.getElementById('itemPriority').value;
        const notes = document.getElementById('itemNotes').value.trim();
        
        if (name) {
            addItem(name, quantity, category, priority, notes);
            document.getElementById('itemName').value = '';
            document.getElementById('itemQuantity').value = '1';
            document.getElementById('itemCategory').value = 'Produce';
            document.getElementById('itemPriority').value = 'normal';
            document.getElementById('itemNotes').value = '';
            document.getElementById('itemName').focus();
        }
    });
    
    // Category Filter
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        currentFilter = e.target.value;
        updateItemsDisplay();
    });
    
    // Clear Completed Button
    document.getElementById('clearCompletedBtn').addEventListener('click', () => {
        clearCompletedItems();
    });
    
    // Shopping Mode Button
    document.getElementById('shoppingModeBtn').addEventListener('click', () => {
        enterShoppingMode();
    });
    
    // Exit Shopping Mode Button
    document.getElementById('exitShoppingModeBtn').addEventListener('click', () => {
        exitShoppingMode();
    });
    
    // Super Full Screen Button
    document.getElementById('superFullScreenBtn').addEventListener('click', () => {
        toggleSuperFullScreen();
    });
    
    // Exit Super Full Screen Button
    document.getElementById('exitSuperFullScreenBtn').addEventListener('click', () => {
        toggleSuperFullScreen();
    });
    
    // Dark Mode Toggle
    document.getElementById('darkModeToggle').addEventListener('click', () => {
        toggleDarkMode();
    });
    
    // Print List
    document.getElementById('printListBtn').addEventListener('click', () => {
        printList();
    });
    
    // Export List
    document.getElementById('exportListBtn').addEventListener('click', () => {
        const format = confirm('Export as JSON? (Cancel for CSV)') ? 'json' : 'csv';
        if (format === 'json') {
            exportList();
        } else {
            exportAsCSV();
        }
    });
    
    // Archive List
    document.getElementById('archiveListBtn').addEventListener('click', () => {
        const list = getCurrentList();
        if (list) {
            if (list.archived) {
                unarchiveList(list.id);
            } else {
                if (confirm(`Archive list "${list.name}"?`)) {
                    archiveList(list.id);
                }
            }
        }
    });
    
    // Template Buttons
    document.getElementById('newListFromTemplateBtn').addEventListener('click', () => {
        updateTemplatesList();
        document.getElementById('templateModal').style.display = 'block';
    });
    
    document.getElementById('saveAsTemplateBtn').addEventListener('click', () => {
        saveAsTemplate();
    });
    
    document.getElementById('closeTemplateModal').addEventListener('click', () => {
        document.getElementById('templateModal').style.display = 'none';
    });
    
    // Import Buttons
    document.getElementById('importListBtn').addEventListener('click', () => {
        document.getElementById('importModal').style.display = 'block';
    });
    
    document.getElementById('closeImportModal').addEventListener('click', () => {
        document.getElementById('importModal').style.display = 'none';
    });
    
    document.getElementById('importSubmitBtn').addEventListener('click', () => {
        const data = document.getElementById('importData').value.trim();
        if (data) {
            importList(data);
        }
    });
    
    document.getElementById('importFileBtn').addEventListener('click', () => {
        document.getElementById('importFileInput').click();
    });
    
    document.getElementById('importFileInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                importList(event.target.result);
            };
            reader.readAsText(file);
        }
    });
    
    // Bulk Operations
    document.getElementById('bulkSelectModeBtn').addEventListener('click', () => {
        toggleBulkSelectMode();
    });
    
    document.getElementById('bulkCancelBtn').addEventListener('click', () => {
        toggleBulkSelectMode();
    });
    
    document.getElementById('bulkSelectAllBtn').addEventListener('click', () => {
        bulkSelectAll();
    });
    
    document.getElementById('bulkMarkPurchasedBtn').addEventListener('click', () => {
        bulkMarkPurchased();
    });
    
    document.getElementById('bulkDeleteBtn').addEventListener('click', () => {
        bulkDelete();
    });
    
    // List Filter Tabs
    document.getElementById('showAllListsBtn').addEventListener('click', () => {
        showArchived = false;
        document.getElementById('showAllListsBtn').classList.add('active');
        document.getElementById('showArchivedListsBtn').classList.remove('active');
        updateUI();
    });
    
    document.getElementById('showArchivedListsBtn').addEventListener('click', () => {
        showArchived = true;
        document.getElementById('showArchivedListsBtn').classList.add('active');
        document.getElementById('showAllListsBtn').classList.remove('active');
        updateUI();
    });
    
    // Initialize quick add and favorites
    updateQuickAddButtons();
    updateFavoritesButtons();
    updateItemSuggestions();
    updateDarkModeButton();
}

// Shopping Mode Functions
function enterShoppingMode() {
    isShoppingMode = true;
    document.getElementById('shoppingModeOverlay').style.display = 'block';
    document.body.style.overflow = 'hidden';
    updateShoppingMode();
}

function exitShoppingMode() {
    isShoppingMode = false;
    isSuperFullScreen = false;
    const overlay = document.getElementById('shoppingModeOverlay');
    overlay.style.display = 'none';
    overlay.classList.remove('super-fullscreen');
    document.body.style.overflow = 'auto';
    updateItemsDisplay(); // Refresh main view
}

function toggleSuperFullScreen() {
    isSuperFullScreen = !isSuperFullScreen;
    const overlay = document.getElementById('shoppingModeOverlay');
    
    if (isSuperFullScreen) {
        overlay.classList.add('super-fullscreen');
        updateSuperFullScreenMiniHeader();
    } else {
        overlay.classList.remove('super-fullscreen');
    }
}

function updateSuperFullScreenMiniHeader() {
    const list = getCurrentList();
    if (!list) return;
    
    const activeItems = list.items.filter(item => !item.purchased);
    const total = list.items.length;
    const purchased = list.items.filter(item => item.purchased).length;
    const remaining = activeItems.length;
    
    document.getElementById('shoppingModeMiniStats').textContent = 
        `${list.name} • ${remaining} remaining • ${purchased}/${total} complete`;
}

function updateShoppingMode() {
    const list = getCurrentList();
    if (!list) return;
    
    // Update list name
    document.getElementById('shoppingModeListName').textContent = list.name;
    
    // Get items (no filter applied in shopping mode)
    const activeItems = list.items.filter(item => !item.purchased);
    const completedItems = list.items.filter(item => item.purchased);
    
    // Update stats
    const total = list.items.length;
    const purchased = completedItems.length;
    const remaining = activeItems.length;
    document.getElementById('shoppingModeStats').textContent = 
        `${remaining} items remaining • ${purchased} of ${total} complete`;
    
    // Update lists
    updateShoppingModeList('shoppingModeItemsList', activeItems);
    updateShoppingModeList('shoppingModeCompletedList', completedItems);
}

function updateShoppingModeList(listId, items) {
    const listElement = document.getElementById(listId);
    listElement.innerHTML = '';
    
    if (items.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'shopping-mode-empty';
        emptyMessage.textContent = listId === 'shoppingModeItemsList' ? 
            '🎉 All items checked!' : 
            'No purchased items yet';
        listElement.appendChild(emptyMessage);
        return;
    }
    
    items.forEach(item => {
        const itemElement = createShoppingModeItem(item);
        listElement.appendChild(itemElement);
    });
}

function createShoppingModeItem(item) {
    const li = document.createElement('li');
    li.className = `shopping-item ${item.purchased ? 'purchased' : ''} ${item.priority || 'normal'}-priority`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.purchased;
    checkbox.addEventListener('change', () => {
        toggleItemPurchased(item.id);
        updateShoppingMode(); // Refresh shopping mode view
        if (isSuperFullScreen) {
            updateSuperFullScreenMiniHeader();
        }
    });
    
    const info = document.createElement('div');
    info.className = 'item-info';
    
    const nameRow = document.createElement('div');
    nameRow.className = 'item-name-row';
    
    const name = document.createElement('div');
    name.className = 'item-name';
    name.textContent = item.name;
    
    if (item.priority === 'high') {
        const priorityBadge = document.createElement('span');
        priorityBadge.className = 'priority-badge high';
        priorityBadge.textContent = '⭐';
        nameRow.appendChild(priorityBadge);
    }
    
    nameRow.appendChild(name);
    
    const meta = document.createElement('div');
    meta.className = 'item-meta';
    
    const quantity = document.createElement('span');
    quantity.className = 'item-quantity';
    quantity.textContent = `Quantity: ${item.quantity}`;
    
    const category = document.createElement('span');
    category.className = 'item-category';
    category.textContent = `${categoryEmojis[item.category]} ${item.category}`;
    
    meta.appendChild(quantity);
    meta.appendChild(category);
    
    if (item.notes) {
        const notes = document.createElement('div');
        notes.className = 'item-notes';
        notes.textContent = `📝 ${item.notes}`;
        meta.appendChild(notes);
    }
    
    info.appendChild(nameRow);
    info.appendChild(meta);
    
    li.appendChild(checkbox);
    li.appendChild(info);
    
    return li;
}

