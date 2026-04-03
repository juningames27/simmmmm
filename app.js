const API_URL = 'https://simmmmm-1.onrender.com/api';
let allBooks = [], currentBookId, currentLoanId;

async function navigate(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    if (viewId === 'view-dashboard') loadDashboard();
    if (viewId === 'view-books') loadBooks();
    if (viewId === 'view-loans') { await loadBooks(); loadLoans(); }
}

// --- LIVROS ---
async function loadBooks() {
    const res = await fetch(`${API_URL}/books`);
    allBooks = await res.json();
    renderBooks(allBooks);
}

function renderBooks(books) {
    const tbody = document.getElementById('table-books-body');
    const dlist = document.getElementById('books-datalist');
    tbody.innerHTML = ''; dlist.innerHTML = '';
    
    books.forEach(b => {
        tbody.innerHTML += `<tr>
            <td>${b.id}</td><td>${b.title}</td><td>${b.author}</td>
            <td class="status-${b.status}">${b.status}</td>
            <td>
                <button onclick="openEditBook('${b.id}','${b.title}','${b.author}')">✏️</button>
                <button onclick="deleteBook('${b.id}')">🗑️</button>
            </td></tr>`;
        if(b.status === 'Disponível') dlist.innerHTML += `<option value="${b.title} | ID: ${b.id}">`;
    });
}

document.getElementById('search-book-input').oninput = (e) => {
    const term = e.target.value.toLowerCase();
    renderBooks(allBooks.filter(b => b.title.toLowerCase().includes(term) || b.author.toLowerCase().includes(term)));
};

function openEditBook(id, title, author) {
    currentBookId = id;
    document.getElementById('edit-book-title').value = title;
    document.getElementById('edit-book-author').value = author;
    document.getElementById('modal-edit-book').style.display = 'block';
}

async function saveBookEdit() {
    await fetch(`${API_URL}/books/${currentBookId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            title: document.getElementById('edit-book-title').value,
            author: document.getElementById('edit-book-author').value
        })
    });
    closeModal('modal-edit-book'); loadBooks();
}

// --- EMPRÉSTIMOS ---
async function loadLoans() {
    const res = await fetch(`${API_URL}/loans`);
    const loans = await res.json();
    const tbody = document.getElementById('table-loans-body');
    tbody.innerHTML = '';
    loans.forEach(l => {
        tbody.innerHTML += `<tr onclick="openLoanModal('${l.id}')">
            <td>${l.studentName}</td><td>${l.bookTitle}</td><td>${l.returnDate}</td>
            <td><button>🔍 Ver</button></td></tr>`;
    });
}

async function openLoanModal(id) {
    currentLoanId = id;
    const res = await fetch(`${API_URL}/loans`);
    const loan = (await res.json()).find(l => l.id === id);
    document.getElementById('edit-loan-student').value = loan.studentName;
    document.getElementById('edit-loan-phone').value = loan.phone;
    document.getElementById('edit-loan-school').value = loan.school;
    document.getElementById('modal-loan').style.display = 'block';
}

async function saveLoanEdit() {
    await fetch(`${API_URL}/loans/${currentLoanId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            studentName: document.getElementById('edit-loan-student').value,
            phone: document.getElementById('edit-loan-phone').value,
            school: document.getElementById('edit-loan-school').value
        })
    });
    alert("Salvo!"); loadLoans();
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loan-date').valueAsDate = new Date();
    loadDashboard();
});