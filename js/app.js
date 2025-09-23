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

// Variable global para el tablero actual
let currentBoardId = null;

// Agregar evento para crear tableros
addBoardBtn.addEventListener('click', async () => {
    const name = boardInput.value.trim();
    if (name) {
        await db.collection('boards').add({ name });
        boardInput.value = '';
    }
});

// Escuchar cambios en los tableros
db.collection('boards').onSnapshot((tableros) => {
    boardList.innerHTML = '';
    tableros.forEach((doc) => {
        const board = doc.data();
        const li = document.createElement('li');
        li.classList = 'list-group-item list-group-item-action';
        li.textContent = board.name;
        li.onclick = () => selectBoard(doc.id, board.name);
        boardList.appendChild(li);
    });
});

// Función para seleccionar un tablero
const selectBoard = (id, name) => {
    currentBoardId = id;
    boardTitle.textContent = `📋 ${name}`; // Corregido: uso de backticks
    taskInput.disabled = false; // Corregido: "disabled" en lugar de "disable"
    addTaskBtn.disabled = false; // Corregido: "disabled" en lugar de "disable"
    loadTasks();
};

// Cargar tareas del tablero seleccionado
const loadTasks = () => {
    if (!currentBoardId) return;
    
    db.collection('tasks')
        .where('boardId', '==', currentBoardId)
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
    if (text && currentBoardId) {
        await db.collection('tasks').add({
            text,
            done: false,
            boardId: currentBoardId
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