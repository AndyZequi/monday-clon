const firebaseConfig = {
  apiKey: "AIzaSyCAqAamNNIFeQOMt4GFiQSlJ9YD05tRKYM",
  authDomain: "mars-ad2025-917e2.firebaseapp.com",
  projectId: "mars-ad2025-917e2",
  storageBucket: "mars-ad2025-917e2.firebasestorage.app",
  messagingSenderId: "728972970596",
  appId: "1:728972970596:web:59c0696f5e5ea15d53ed71",
  measurementId: "G-JLSPSD7K72"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Obtener elementos del DOM para las tareas
const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const pendingTasks = document.getElementById('pendingTasks');
const doneTasks = document.getElementById('doneTasks');
// Elementos Nuevos
const assignedInput = document.getElementById('assignedInput');
const statusInput = document.getElementById('statusInput');
const priorityInput = document.getElementById('priorityInput');
const kanbanBoard = document.getElementById('kanbanBoard');
const boardTabs = document.getElementById('boardTabs');

// Referencias al tablero
const boardList = document.getElementById('boardList');
const boardInput = document.getElementById('boardInput');
const addBoardBtn = document.getElementById('addBoardBtn');

// Botones para google
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');

// Variable global para el tablero actual
let currentBoardId = null;
let currentUser = null;
let unsubscribeBoards = null;
let listeners = {};

//Estados posibles de las tareas
const STATUSES = ['Pendiente', 'En Progreso', 'Bloqueado', 'Hecho'];

//Funciones para login y logout con Google 
loginBtn.addEventListener('click', async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
})

// Cerrar sesión
logoutBtn.addEventListener('click', async () => {
    await auth.signOut();
})

//Evento que escucha cuando cambia de estado la autenticacion
auth.onAuthStateChanged(user => {
    if (user){
        currentUser = user
        userInfo.textContent = user.email
        loginBtn.style.display = 'none'
        logoutBtn.style.display = 'block'
        boardList.disabled = false
        boardInput.disabled = false
        addBoardBtn.disabled = false
        disableTaskForm()
        loadBoards() 
    }else {
        currentUser = null
        userInfo.textContent = 'No autenticado'
        loginBtn.style.display = 'block'
        logoutBtn.style.display = 'none'
        boardInput.disabled = true
        addBoardBtn.disabled = true
        boardList.innerHTML = ''
        boardList.disabled = true
        disableTaskForm()
        pendingTasks.innerHTML = ''
        doneTasks.innerHTML = ''
        boardTabs.innerHTML = ''
        resetKanban()
        
        // Cancelar la suscripción a tableros cuando cierra sesión
        if (unsubscribeBoards) {
            unsubscribeBoards();
            unsubscribeBoards = null;
        }
        
        // Cancelar todos los listeners de tareas
        Object.values(listeners).forEach(unsubscribe => {
            if (unsubscribe) unsubscribe();
        });
        listeners = {};
    }
})

// Agregar evento para crear tableros
addBoardBtn.addEventListener('click', async () => {
    const name = boardInput.value.trim();
    if (name && currentUser) {
        await db.collection('boards').add({ 
            name: name,
            userId: currentUser.uid, 
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        boardInput.value = '';
    }
});

// Función para cargar tableros del usuario actual
const loadBoards = () => {
    if (!currentUser) return;
    
    // Escuchar cambios en los tableros del usuario actual
    unsubscribeBoards = db.collection('boards')
        .where('userId', '==', currentUser.uid)
        .onSnapshot((snapshot) => {
            boardList.innerHTML = '';
            snapshot.forEach((doc) => {
                const board = doc.data();
                const li = document.createElement('li');
                li.classList = 'list-group-item list-group-item-action';
                li.textContent = board.name;
                li.onclick = () => selectBoard(doc.id, board.name);
                boardList.appendChild(li);
            });
            
            // Si no hay tableros, mostrar mensaje
            if (snapshot.empty) {
                const li = document.createElement('li');
                li.classList = 'list-group-item text-muted';
                li.textContent = 'No hay tableros. ¡Crea uno nuevo!';
                boardList.appendChild(li);
            }
        }, (error) => {
            console.error('Error cargando tableros:', error);
        });
};

//Abrir la pestaña del tablero 
const oppenBoard = (id, name) => {
    currentBoardId = id;
    if (!document.getElementById(`tab-${id}`)) {
        const li = document.createElement('li')
        li.className = 'nav-item'
        li.innerHTML = 
        `
        <button class="nav-link" id="tab-${id}" data-id="${id}">
            ${name} ❌
        </button>
        `
    
        boardTabs.appendChild(li)

        li.querySelector('button').addEventListener('click', (e) => {
            // Verificar si se hizo click en la X (últimos 10px del botón)
            const button = e.currentTarget;
            const clickX = e.offsetX;
            const buttonWidth = button.offsetWidth;
            
            if (clickX > buttonWidth - 20) { // Click en la X
                // Cerrar pestaña
                li.remove()
                if (listeners[id]) {
                    listeners[id]()
                    delete listeners[id]
                }
                
                // Si hay más pestañas, activar la primera
                if (boardTabs.children.length > 0) {
                    const firstTab = boardTabs.children[0].querySelector('button')
                    const tabId = firstTab.dataset.id
                    const tabName = firstTab.textContent.replace(' ❌', "")
                    setActiveTab(tabId)
                } else {
                    // Si no hay pestañas, resetear
                    currentBoardId = null
                    disableTaskForm()
                    resetKanban()
                }
            } else {
                // Click en el nombre - activar pestaña
                setActiveTab(id)
            }
        })
    }
    setActiveTab(id)
}

// Activar pestaña 
const setActiveTab = id => {
    document.querySelectorAll('#boardTabs .nav-link').forEach((btn) => btn.classList.remove('active'))
    const activeTab = document.getElementById(`tab-${id}`)
    if (activeTab) {
        activeTab.classList.add('active')
    }
    currentBoardId = id
    enableTaskForm()
    renderKanban()
    loadTasks(id)
}

// Función para seleccionar un tablero
const selectBoard = (id, name) => {
    oppenBoard(id, name);
};

// Funcion para habilitar inputs del formuladio de tareas
const enableTaskForm = () => {
    taskInput.disabled = false;
    assignedInput.disabled = false;
    priorityInput.disabled = false;
    addTaskBtn.disabled = false;
    statusInput.disabled = false;
}

// Funcion para des - habilitar inputs del formuladio de tareas
const disableTaskForm = () => {
    taskInput.disabled = true;
    assignedInput.disabled = true;
    priorityInput.disabled = true;
    addTaskBtn.disabled = true;
    statusInput.disabled = true;
}

// Helpers para color de prioridad y status
const getStatusColor = (status) => {
    switch (status) {
        case 'Pendiente': return 'secondary'
        case 'En Progreso': return 'info'
        case 'Bloqueado': return 'warning'
        case 'Hecho': return 'success'
        default: return 'dark'
    }
}

const getPriorityColor = (priority) => {
    switch (priority) {
        case 'Alta': return 'danger'
        case 'Media': return 'primary'
        case 'Baja': return 'success'
        default: return 'secondary'
    }
}

// Cargar tareas del tablero seleccionado
const loadTasks = (boardId) => {
    if (!boardId || !currentUser) {
        console.log('No boardId or user:', {boardId, currentUser})
        return;
    }

    // Cancelar listener anterior si existe
    if (listeners[boardId]) {
        listeners[boardId]()
    }

    console.log('Cargando tareas para board:', boardId)
    
    listeners[boardId] = db.collection('tasks')
    .where('boardId', '==', boardId)
    .where('userId', '==', currentUser.uid)
    .onSnapshot(snapshot => {
        console.log('Tareas recibidas:', snapshot.size)
        document.querySelectorAll('.kanban-col').forEach(col => col.innerHTML = '')
        snapshot.forEach((doc) => {
            const task = doc.data()
            const card = document.createElement('div')
            card.className = 'card p-2 kanban-task mb-2'
            card.draggable = true
            card.dataset.id = doc.id
            card.innerHTML = 
                `
                <strong>${task.text}</strong>
                <small class="d-block">${task.assigned}</small>
                <span class="badge bg-${getStatusColor(task.status)}">${task.status}</span>
                <span class="badge bg-${getPriorityColor(task.priority)}">${task.priority}</span>
                <button class="btn btn-sm btn-outline-danger mt-1">🗑</button>
                `
            
            // Drag events
            card.addEventListener('dragstart', e => {
                e.dataTransfer.setData('taskId', doc.id)
                e.dataTransfer.setData('boardId', boardId)
                setTimeout(() => {
                    card.style.opacity = '0.4'
                }, 0)
            })
            
            card.addEventListener('dragend', e => {
                card.style.opacity = '1'
            })

            card.querySelector('button').onclick = () => db.collection('tasks').doc(doc.id).delete()

            const col = document.querySelector(`.kanban-col[data-status="${task.status}"]`)
            if (col) {
                col.appendChild(card)
            }
        })
    }, (error) => {
        console.error('Error cargando tareas:', error)
    })
};

// Agregar evento para crear tareas
addTaskBtn.addEventListener('click', async () => {
    const text = taskInput.value.trim();
    const assigned = assignedInput.value.trim();
    const status = statusInput.value;
    const priority = priorityInput.value;

    if (text && assigned && currentBoardId && currentUser) {
        await db.collection('tasks').add({
            text,
            status,
            priority,
            assigned,
            done: status === 'Hecho',
            boardId: currentBoardId,
            userId: currentUser.uid, 
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        taskInput.value = '';
        assignedInput.value = '';
    } else {
        alert('Por favor, selecciona un tablero y completa todos los campos.');
    }
});

// Permitir agregar tareas con la tecla Enter
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTaskBtn.click();
    }
});

const renderKanban = () => {
    kanbanBoard.innerHTML = '';
    STATUSES.forEach(status => {
        const col = document.createElement('div');
        col.className = 'col-md-3'
        col.innerHTML = 
        `
        <h5 class='text-center'>${status}</h5>
        <div class='kanban-col' data-status='${status}'></div>
        `
        kanbanBoard.appendChild(col)

        // Eventos Drag & Drop
        const dropZone = col.querySelector('.kanban-col')
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over')
        })
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over')
        })
        
        dropZone.addEventListener('drop', e => {
            e.preventDefault()
            dropZone.classList.remove('drag-over')
            const taskId = e.dataTransfer.getData('taskId')
            const taskBoardId = e.dataTransfer.getData('boardId')
            
            // Solo actualizar si la tarea pertenece al tablero actual
            if (taskBoardId === currentBoardId) {
                updateTaskStatus(taskId, status)
            }
        })
    })
}

// Función para actualizar el estado de la tarea
const updateTaskStatus = (taskId, newStatus) => {
    db.collection('tasks').doc(taskId).update({
        status: newStatus,
        done: newStatus === 'Hecho'
    }).catch(error => {
        console.error('Error actualizando tarea:', error)
    })
}

const resetKanban = () => {
    kanbanBoard.innerHTML = 
    `
    <div class="col-12 text-center">
        <p class="text-muted">Selecciona un tablero para comenzar</p>
    </div>
    `
}

// Inicializar
resetKanban()