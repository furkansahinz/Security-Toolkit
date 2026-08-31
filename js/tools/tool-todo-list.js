/**
 * Tool 11: Todo List
 * LocalStorage ile kalıcı todo listesi
 */

const TODO_LIST_KEY = 'securityToolkit_todoList';

function initTodoList() {
    const todoInput = document.getElementById('todo-input');
    const todoAddBtn = document.getElementById('todo-add-btn');
    const todoListContainer = document.getElementById('todo-list-container');
    const todoEmptyState = document.getElementById('todo-empty-state');
    const todoStats = document.getElementById('todo-stats');
    const clearCompletedBtn = document.getElementById('todo-clear-completed-btn');
    const clearAllBtn = document.getElementById('todo-clear-all-btn');
    const exportBtn = document.getElementById('todo-export-btn');
    
    // Check if elements exist
    if (!todoInput || !todoAddBtn || !todoListContainer || !todoEmptyState || !todoStats) {
        console.error('Todo list elements not found');
        return;
    }
    
    let todos = [];
    let saveTimeout = null;
    let openInputIndex = null; // Hangi todo'nun altında input açık
    
    // Load saved todos
    function loadTodos() {
        const saved = localStorage.getItem(TODO_LIST_KEY);
        if (saved) {
            try {
                todos = JSON.parse(saved);
                // Eski format için migration (children yoksa ekle)
                todos = migrateTodos(todos);
                renderTodos();
            } catch (e) {
                console.error('Todo list parse error:', e);
                todos = [];
            }
        }
    }
    
    // Migrate old todos to new format
    function migrateTodos(todoList) {
        return todoList.map(todo => {
            if (!todo.hasOwnProperty('children')) {
                todo.children = [];
            }
            if (!todo.hasOwnProperty('expanded')) {
                todo.expanded = true;
            }
            if (todo.children && todo.children.length > 0) {
                todo.children = migrateTodos(todo.children);
            }
            return todo;
        });
    }
    
    // Save todos (debounced)
    function saveTodos(showNotification = true) {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            localStorage.setItem(TODO_LIST_KEY, JSON.stringify(todos));
            if (showNotification && typeof showToast === 'function') {
                showToast('Kaydedildi', 'success');
            }
        }, 300);
    }
    
    // Render todos recursively
    function renderTodos() {
        todoListContainer.innerHTML = '';
        
        if (todos.length === 0) {
            todoEmptyState.style.display = 'block';
            todoListContainer.appendChild(todoEmptyState);
            updateStats();
            return;
        }
        
        todoEmptyState.style.display = 'none';
        
        const todoList = document.createElement('div');
        todoList.className = 'todo-list';
        
        renderTodoList(todos, todoList, []);
        
        todoListContainer.appendChild(todoList);
        
        attachEventListeners();
        updateStats();
    }
    
    // Render todo list recursively
    function renderTodoList(todoList, container, path) {
        todoList.forEach((todo, index) => {
            const currentPath = [...path, index];
            const pathKey = currentPath.join('-');
            
            const todoItem = document.createElement('div');
            todoItem.className = `todo-item ${todo.completed ? 'todo-completed' : ''}`;
            todoItem.dataset.path = pathKey;
            todoItem.dataset.level = path.length;
            
            const hasChildren = todo.children && todo.children.length > 0;
            const expandIcon = todo.expanded ? '▼' : '▶';
            
            const escapedPathKey = escapeHtmlAttr(pathKey);
            todoItem.innerHTML = `
                <div class="todo-content">
                    <button class="todo-expand-btn" data-path="${escapedPathKey}" style="${hasChildren ? '' : 'visibility: hidden;'}">
                        ${expandIcon}
                    </button>
                    <label class="todo-checkbox-label">
                        <input 
                            type="checkbox" 
                            class="todo-checkbox" 
                            ${todo.completed ? 'checked' : ''}
                            data-path="${escapedPathKey}"
                        >
                        <span class="todo-text">${escapeHtml(todo.text)}</span>
                    </label>
                </div>
                <div class="todo-actions">
                    <button class="todo-add-below-btn" data-path="${escapedPathKey}" title="Altına ekle">
                        ➕
                    </button>
                    <button class="todo-delete-btn" data-path="${escapedPathKey}" title="Sil">
                        🗑️
                    </button>
                </div>
            `;
            
            container.appendChild(todoItem);
            
            // Render children if expanded
            if (hasChildren && todo.expanded) {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'todo-children';
                childrenContainer.dataset.path = pathKey;
                renderTodoList(todo.children, childrenContainer, currentPath);
                container.appendChild(childrenContainer);
            }
            
            // Render input if this todo has open input
            if (openInputIndex === pathKey) {
                const inputContainer = document.createElement('div');
                inputContainer.className = 'todo-input-inline';
                inputContainer.dataset.path = escapedPathKey;
                inputContainer.innerHTML = `
                    <input 
                        type="text" 
                        class="todo-inline-input" 
                        placeholder="Yeni görev..."
                        autocomplete="off"
                    >
                `;
                container.appendChild(inputContainer);
                
                // Focus and add event listeners
                setTimeout(() => {
                    const input = inputContainer.querySelector('.todo-inline-input');
                    if (input) {
                        input.focus();
                        input.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const text = input.value.trim();
                                if (text) {
                                    addChildTodo(currentPath, text);
                                } else {
                                    openInputIndex = null;
                                    renderTodos();
                                }
                            } else if (e.key === 'Escape') {
                                openInputIndex = null;
                                renderTodos();
                            }
                        });
                        input.addEventListener('blur', () => {
                            const text = input.value.trim();
                            if (text) {
                                addChildTodo(currentPath, text);
                            } else {
                                openInputIndex = null;
                                renderTodos();
                            }
                        });
                    }
                }, 10);
            }
        });
    }
    
    // Attach event listeners
    function attachEventListeners() {
        // Checkboxes
        const checkboxes = todoListContainer.querySelectorAll('.todo-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const path = e.target.dataset.path.split('-').map(Number);
                const todo = getTodoByPath(path);
                if (todo) {
                    todo.completed = e.target.checked;
                    saveTodos(false);
                    renderTodos();
                }
            });
        });
        
        // Expand/collapse buttons
        const expandBtns = todoListContainer.querySelectorAll('.todo-expand-btn');
        expandBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const path = e.target.dataset.path.split('-').map(Number);
                const todo = getTodoByPath(path);
                if (todo) {
                    todo.expanded = !todo.expanded;
                    saveTodos(false);
                    renderTodos();
                }
            });
        });
        
        // Add below buttons
        const addBelowBtns = todoListContainer.querySelectorAll('.todo-add-below-btn');
        addBelowBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const pathKey = e.target.dataset.path;
                if (openInputIndex === pathKey) {
                    openInputIndex = null;
                } else {
                    openInputIndex = pathKey;
                }
                renderTodos();
            });
        });
        
        // Delete buttons
        const deleteBtns = todoListContainer.querySelectorAll('.todo-delete-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const path = e.target.dataset.path.split('-').map(Number);
                deleteTodoByPath(path);
                saveTodos(false);
                renderTodos();
            });
        });
    }
    
    // Get todo by path
    function getTodoByPath(path) {
        let current = todos;
        for (let i = 0; i < path.length; i++) {
            if (current[path[i]]) {
                if (i === path.length - 1) {
                    return current[path[i]];
                }
                current = current[path[i]].children || [];
            } else {
                return null;
            }
        }
        return null;
    }
    
    // Delete todo by path
    function deleteTodoByPath(path) {
        if (path.length === 1) {
            todos.splice(path[0], 1);
        } else {
            const parentPath = path.slice(0, -1);
            const parent = getTodoByPath(parentPath);
            if (parent && parent.children) {
                parent.children.splice(path[path.length - 1], 1);
            }
        }
    }
    
    // Add child todo
    function addChildTodo(parentPath, text) {
        const newTodo = {
            text: text,
            completed: false,
            children: [],
            expanded: true,
            createdAt: new Date().toISOString()
        };
        
        if (parentPath.length === 0) {
            // Root level
            todos.push(newTodo);
        } else {
            const parent = getTodoByPath(parentPath);
            if (parent) {
                if (!parent.children) {
                    parent.children = [];
                }
                parent.children.push(newTodo);
                if (!parent.expanded) {
                    parent.expanded = true;
                }
            }
        }
        
        openInputIndex = null;
        saveTodos(false);
        renderTodos();
    }
    
    // Update stats (recursive count)
    function updateStats() {
        function countTodos(todoList) {
            let total = 0;
            let completed = 0;
            todoList.forEach(todo => {
                total++;
                if (todo.completed) completed++;
                if (todo.children && todo.children.length > 0) {
                    const childCounts = countTodos(todo.children);
                    total += childCounts.total;
                    completed += childCounts.completed;
                }
            });
            return { total, completed };
        }
        
        const counts = countTodos(todos);
        const pending = counts.total - counts.completed;
        
        if (counts.total === 0) {
            todoStats.textContent = '0 görev';
        } else {
            todoStats.textContent = `${counts.total} görev (${pending} bekleyen, ${counts.completed} tamamlanan)`;
        }
    }
    
    // Add todo (root level)
    function addTodo() {
        const text = todoInput.value.trim();
        if (!text) {
            if (typeof showToast === 'function') {
                showToast('Lütfen görev metni girin', 'error');
            } else {
                alert('Lütfen görev metni girin');
            }
            return;
        }
        
        todos.push({
            text: text,
            completed: false,
            children: [],
            expanded: true,
            createdAt: new Date().toISOString()
        });
        
        todoInput.value = '';
        renderTodos();
        saveTodos(true);
        todoInput.focus();
        
        if (typeof showToast === 'function') {
            showToast('Görev eklendi', 'success');
        }
    }
    
    // Add button click
    if (todoAddBtn) {
        todoAddBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addTodo();
        });
    }
    
    // Enter key in input
    if (todoInput) {
        todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTodo();
            }
        });
    }
    
    // Clear completed (recursive)
    if (clearCompletedBtn) {
        clearCompletedBtn.addEventListener('click', () => {
            function removeCompleted(todoList) {
                return todoList.filter(todo => {
                    if (todo.children && todo.children.length > 0) {
                        todo.children = removeCompleted(todo.children);
                    }
                    return !todo.completed;
                });
            }
            
            const beforeCount = countAllTodos(todos);
            todos = removeCompleted(todos);
            const afterCount = countAllTodos(todos);
            const removedCount = beforeCount - afterCount;
            
            if (removedCount === 0) {
                if (typeof showToast === 'function') {
                    showToast('Tamamlanan görev yok', 'info');
                }
                return;
            }
            
            if (confirm(`${removedCount} tamamlanan görevi silmek istediğinize emin misiniz?`)) {
                saveTodos(false);
                renderTodos();
                if (typeof showToast === 'function') {
                    showToast(`${removedCount} görev silindi`, 'success');
                }
            } else {
                // Revert
                loadTodos();
            }
        });
    }
    
    // Clear all
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            const totalCount = countAllTodos(todos);
            if (totalCount === 0) {
                if (typeof showToast === 'function') {
                    showToast('Silinecek görev yok', 'info');
                }
                return;
            }
            
            if (confirm('Tüm görevleri silmek istediğinize emin misiniz?')) {
                todos = [];
                localStorage.removeItem(TODO_LIST_KEY);
                renderTodos();
                if (typeof showToast === 'function') {
                    showToast('Tüm görevler silindi', 'info');
                }
            }
        });
    }
    
    // Helper: Count all todos recursively
    function countAllTodos(todoList) {
        let count = 0;
        todoList.forEach(todo => {
            count++;
            if (todo.children && todo.children.length > 0) {
                count += countAllTodos(todo.children);
            }
        });
        return count;
    }
    
    // Export
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (todos.length === 0) {
                if (typeof showToast === 'function') {
                    showToast('Dışa aktarılacak görev yok', 'error');
                }
                return;
            }
            
            function formatTodosForExport(todoList, indent = 0) {
                const lines = [];
                const prefix = '  '.repeat(indent);
                todoList.forEach((todo, index) => {
                    const status = todo.completed ? '[✓]' : '[ ]';
                    lines.push(`${prefix}${status} ${todo.text}`);
                    if (todo.children && todo.children.length > 0) {
                        lines.push(...formatTodosForExport(todo.children, indent + 1));
                    }
                });
                return lines;
            }
            
            const lines = formatTodosForExport(todos);
            
            const content = `TODO List - ${new Date().toLocaleString('tr-TR')}\n\n${lines.join('\n')}`;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `todo-list-${timestamp}.txt`;
            
            if (typeof downloadTextFile === 'function') {
                downloadTextFile(content, filename);
            } else {
                // Fallback download
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
            }
        });
    }
    
    // Escape HTML helper
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Initialize
    loadTodos();
}

