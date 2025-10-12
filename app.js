// Data Model
let groceryLists = [];
let currentListId = null;
let currentFilter = 'all';
let isShoppingMode = false;

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
});

// Local Storage Functions
function saveData() {
    localStorage.setItem('groceryLists', JSON.stringify(groceryLists));
    localStorage.setItem('currentListId', currentListId);
}

function loadData() {
    const savedLists = localStorage.getItem('groceryLists');
    const savedCurrentId = localStorage.getItem('currentListId');
    
    if (savedLists) {
        groceryLists = JSON.parse(savedLists);
    }
    
    if (savedCurrentId) {
        currentListId = savedCurrentId;
    }
}

// List Management Functions
function createList(name) {
    const newList = {
        id: Date.now().toString(),
        name: name,
        items: []
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
function addItem(name, quantity, category) {
    const list = getCurrentList();
    if (list) {
        const newItem = {
            id: Date.now().toString(),
            name: name,
            quantity: quantity,
            category: category,
            purchased: false
        };
        list.items.push(newItem);
        saveData();
        updateItemsDisplay();
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
    
    groceryLists.forEach(list => {
        const option = document.createElement('option');
        option.value = list.id;
        option.textContent = list.name;
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
    }
}

function updateItemsDisplay() {
    const activeItems = getFilteredItems(false);
    const completedItems = getFilteredItems(true);
    
    updateItemsList('activeItemsList', activeItems);
    updateItemsList('completedItemsList', completedItems);
    updateStats();
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
    li.className = `item ${item.purchased ? 'purchased' : ''}`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.purchased;
    checkbox.addEventListener('change', () => toggleItemPurchased(item.id));
    
    const content = document.createElement('div');
    content.className = 'item-content';
    
    const name = document.createElement('div');
    name.className = 'item-name';
    name.textContent = item.name;
    
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
    
    content.appendChild(name);
    content.appendChild(details);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'item-delete';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete item';
    deleteBtn.addEventListener('click', () => deleteItem(item.id));
    
    li.appendChild(checkbox);
    li.appendChild(content);
    li.appendChild(deleteBtn);
    
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
        
        if (name) {
            addItem(name, quantity, category);
            document.getElementById('itemName').value = '';
            document.getElementById('itemQuantity').value = '1';
            document.getElementById('itemCategory').value = 'Produce';
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
    document.getElementById('shoppingModeOverlay').style.display = 'none';
    document.body.style.overflow = 'auto';
    updateItemsDisplay(); // Refresh main view
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
    li.className = `shopping-item ${item.purchased ? 'purchased' : ''}`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.purchased;
    checkbox.addEventListener('change', () => {
        toggleItemPurchased(item.id);
        updateShoppingMode(); // Refresh shopping mode view
    });
    
    const info = document.createElement('div');
    info.className = 'item-info';
    
    const name = document.createElement('div');
    name.className = 'item-name';
    name.textContent = item.name;
    
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
    
    info.appendChild(name);
    info.appendChild(meta);
    
    li.appendChild(checkbox);
    li.appendChild(info);
    
    return li;
}

