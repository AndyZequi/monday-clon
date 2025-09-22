  const firebaseConfig = {
    apiKey: "AIzaSyCAqAamNNIFeQOMt4GFiQSlJ9YD05tRKYM",
    authDomain: "mars-ad2025-917e2.firebaseapp.com",
    projectId: "mars-ad2025-917e2",
    storageBucket: "mars-ad2025-917e2.firebasestorage.app",
    messagingSenderId: "728972970596",
    appId: "1:728972970596:web:59c0696f5e5ea15d53ed71",
    measurementId: "G-JLSPSD7K72"
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.getFirestore();
  
  //Obtener elementos del DOM para las tareas
  const taskInput = document.getElementById('taskInput');
  const addTaskBtn = document.getElementById('addTaskBtn');
  const taskList = document.getElementById('taskList');

  //Agregamos evento clik al boton
  addTaskBtn.addEventListener('click', async () => {
    const text = taskInput.value.trim()
    if (text) {
        await db.collection('tasks').add({ text, completed: false });
        taskInput.value = ''
    }
  })

  // Funcion para escuchar en tiempo real la BD
  db.collection('tasks').onSnapshot((tareas) => {
    taskList.innerHTML = ''
    tareas.forEach((doc) => {
        const li = Document.createElement('li')
        li.classList='list-group-item d-flex justify-content-between align-items-center'
        li.textContent = doc.data().text
        const delBtn = Document.createElement('button')
        delBtn.classList='btn btn-danger btn-sm'
        delBtn.textContent = 'Eliminar'
        delBtn.onclick = () => db.collection('tasks').doc(doc.id).delete()
        li.appendChild(delBtn)
        taskList.appendChild(li)
    })
  })