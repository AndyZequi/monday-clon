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

// Referencias al tablero
const boardTitle = document.getElementById('boardTitle');
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
let unsubscribeBoards = null; // Para manejar la suscripción a tableros

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
    console.log('@@ user => ', user)
    if (user){
        currentUser = user
        userInfo.textContent = user.email
        loginBtn.style.display = 'none'
        logoutBtn.style.display = 'block'
        boardTitle.textContent = 'Selecciona un tablero'
        boardList.disabled = false
        boardInput.disabled = false
        addBoardBtn.disabled = false
        loadBoards() // CORREGIDO: Ahora cargamos los tableros del usuario
    }else {
        currentUser = null
        userInfo.textContent = 'No autenticado'
        loginBtn.style.display = 'block'
        logoutBtn.style.display = 'none'
        boardInput.disabled = true
        addBoardBtn.disabled = true
        boardList.innerHTML = ''
        boardList.disabled = true
        boardTitle.textContent = 'Inicia sesion para ver tus tableros'
        taskInput.disabled = true
        addTaskBtn.disabled = true
        pendingTasks.innerHTML = ''
        doneTasks.innerHTML = ''
        
        // Cancelar la suscripción a tableros cuando cierra sesión
        if (unsubscribeBoards) {
            unsubscribeBoards();
            unsubscribeBoards = null;
        }
    }
})

// Agregar evento para crear tableros
addBoardBtn.addEventListener('click', async () => {
    const name = boardInput.value.trim();
    if (name && currentUser) {
        await db.collection('boards').add({ 
            name: name,
            userId: currentUser.uid, // CORREGIDO: Agregar el usuario dueño del tablero
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        boardInput.value = '';
    }
});

// Función para cargar tableros del usuario actual
const loadBoards = () => {
    if (!currentUser) return;
    
    // Cancelar suscripción anterior si existe
    if (unsubscribeBoards) {
        unsubscribeBoards();
    }
    
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

// Función para seleccionar un tablero
const selectBoard = (id, name) => {
    currentBoardId = id;
    boardTitle.textContent = `📋 ${name}`; 
    taskInput.disabled = false; 
    addTaskBtn.disabled = false; 
    loadTasks();
};

// Cargar tareas del tablero seleccionado
const loadTasks = () => {
    if (!currentBoardId || !currentUser) return;
    
    db.collection('tasks')
        .where('boardId', '==', currentBoardId)
        .where('userId', '==', currentUser.uid) // CORREGIDO: Filtrar por usuario
        .onSnapshot((tareas) => {
            pendingTasks.innerHTML = '';
            doneTasks.innerHTML = '';
            
            tareas.forEach((doc) => {
                const task = doc.data();
                const li = document.createElement('li');
                li.classList = 'list-group-item d-flex justify-content-between align-items-center';

                const leftDiv = document.createElement('div');
                leftDiv.classList = 'd-flex align-items-center';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.classList = 'form-check-input me-2';
                checkbox.checked = task.done;
                checkbox.onchange = () => db.collection('tasks').doc(doc.id).update({ done: checkbox.checked });

                const span = document.createElement('span');
                span.textContent = task.text;
                if (task.done) {
                    span.style.textDecoration = 'line-through';
                }

                leftDiv.appendChild(checkbox);
                leftDiv.appendChild(span);

                const delBtn = document.createElement('button');
                delBtn.classList = 'btn btn-danger btn-sm';
                delBtn.textContent = 'Eliminar';
                delBtn.onclick = () => db.collection('tasks').doc(doc.id).delete();

                li.appendChild(leftDiv);
                li.appendChild(delBtn);
                
                if (task.done) {
                    doneTasks.appendChild(li);
                } else {
                    pendingTasks.appendChild(li);
                }
            });
        });
};

// Agregar evento para crear tareas
addTaskBtn.addEventListener('click', async () => {
    const text = taskInput.value.trim();
    if (text && currentBoardId && currentUser) {
        await db.collection('tasks').add({
            text: text,
            done: false,
            boardId: currentBoardId,
            userId: currentUser.uid, // CORREGIDO: Agregar el usuario dueño de la tarea
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        taskInput.value = '';
    }
});

// Permitir agregar tareas con la tecla Enter
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTaskBtn.click();
    }
});