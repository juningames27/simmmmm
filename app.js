const API_URL = "https://simmmmm-1.onrender.com/api";
let currentLoanId = null;
let currentBookId = null;

// NAVEGAÇÃO
function navigate(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    document.querySelector(`button[onclick="navigate('${viewId}')"]`).classList.add('active');
    if (viewId === 'view-dashboard') updateDashboard();
    if (viewId === 'view-books') loadBooks();
    if (viewId === 'view-loans') loadLoans();
}

// DASHBOARD
async function updateDashboard() {
    const res = await fetch(`${API_URL}/dashboard`);
    const data = await res.json();
    document.getElementById("dash-total-books").innerText = data.totalBooks;
    document.getElementById("dash-rented-books").innerText = data.rentedBooks;
    document.getElementById("dash-late-loans").innerText = data.lateLoans;
}

// LIVROS
async function loadBooks() {
    const res = await fetch(`${API_URL}/books`);
    const books = await res.json();
    const tableBody = document.getElementById("table-books-body");
    const datalist = document.getElementById("books-datalist");
    
    tableBody.innerHTML = "";
    datalist.innerHTML = "";

    books.forEach(b => {
        if (b.status === "Disponível") {
            datalist.innerHTML += `<option value="${b.id} | ${b.title}">`;
        }
        tableBody.innerHTML += `
            <tr>
                <td>${b.id}</td>
                <td>${b.title}</td>
                <td>${b.author}</td>
                <td><span class="badge ${b.status === 'Alugado' ? 'bg-danger' : 'bg-success'}">${b.status}</span></td>
                <td>
                    <button onclick="openEditBookModal('${b.id}', '${b.title}', '${b.author}')" class="btn-edit-row">✏️</button>
                    <button onclick="deleteBook('${b.id}')" class="btn-delete-row">🗑️</button>
                </td>
            </tr>
        `;
    });
}

document.getElementById("form-book").onsubmit = async (e) => {
    e.preventDefault();
    const title = document.getElementById("book-title").value;
    const author = document.getElementById("book-author").value;
    await fetch(`${API_URL}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, author })
    });
    e.target.reset();
    loadBooks();
};

function openEditBookModal(id, title, author) {
    currentBookId = id;
    document.getElementById("edit-book-title").value = title;
    document.getElementById("edit-book-author").value = author;
    document.getElementById("modal-edit-book").style.display = "block";
}

function closeEditBookModal() { document.getElementById("modal-edit-book").style.display = "none"; }

async function updateBook() {
    const title = document.getElementById("edit-book-title").value;
    const author = document.getElementById("edit-book-author").value;
    await fetch(`${API_URL}/books/${currentBookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, author })
    });
    closeEditBookModal();
    loadBooks();
}

async function deleteBook(id) {
    if (confirm("Deseja remover este livro?")) {
        const res = await fetch(`${API_URL}/books/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.error) alert(data.error);
        loadBooks();
    }
}

// EMPRÉSTIMOS
async function loadLoans() {
    const res = await fetch(`${API_URL}/loans`);
    const loans = await res.json();
    const tableBody = document.getElementById("table-loans-body");
    tableBody.innerHTML = "";

    loans.forEach(l => {
        tableBody.innerHTML += `
            <tr>
                <td>${l.studentName}</td>
                <td>${l.phone || '---'}</td>
                <td>${l.school}</td>
                <td>${l.grade}</td>
                <td>${l.bookTitle}</td>
                <td>${l.returnDate}</td>
                <td>
                    <button onclick="event.stopPropagation(); openEditLoanModal('${l.id}', '${l.studentName}', '${l.school}', '${l.grade}', '${l.phone}')" class="btn-edit-row">✏️</button>
                    <button onclick="openModal('${l.id}')" class="btn-details">🔍 Detalhes</button>
                </td>
            </tr>
        `;
    });
}

document.getElementById("form-loan").onsubmit = async (e) => {
    e.preventDefault();
    const bookSearch = document.getElementById("loan-book-search").value;
    const bookId = bookSearch.split(" | ")[0];
    
    const payload = {
        studentName: document.getElementById("loan-student").value,
        phone: document.getElementById("loan-phone").value,
        school: document.getElementById("loan-school").value,
        grade: document.getElementById("loan-grade").value,
        bookId: bookId,
        rentalDate: document.getElementById("loan-date").value
    };

    const res = await fetch(`${API_URL}/loans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        e.target.reset();
        loadLoans();
    } else {
        const err = await res.json();
        alert(err.error);
    }
};

// MODAL DETALHES/FICHA
async function openModal(loanId) {
    const res = await fetch(`${API_URL}/loans`);
    const loans = await res.json();
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    currentLoanId = loanId;
    document.getElementById("modal-details").innerHTML = `
        <p><strong>Aluno:</strong> ${loan.studentName}</p>
        <p><strong>Telefone:</strong> ${loan.phone || 'Não informado'}</p>
        <p><strong>Escola:</strong> ${loan.school}</p>
        <p><strong>Livro:</strong> ${loan.bookTitle}</p>
        <p><strong>Data Entrega:</strong> ${loan.returnDate}</p>
    `;
    document.getElementById("modal-loan").style.display = "block";
}

function closeModal() { document.getElementById("modal-loan").style.display = "none"; }

// EDITAR EMPRÉSTIMO
function openEditLoanModal(id, student, school, grade, phone) {
    currentLoanId = id;
    document.getElementById("edit-loan-student").value = student;
    document.getElementById("edit-loan-school").value = school;
    document.getElementById("edit-loan-grade").value = grade;
    document.getElementById("edit-loan-phone").value = phone || "";
    document.getElementById("modal-edit-loan").style.display = "block";
}

function closeEditLoanModal() { document.getElementById("modal-edit-loan").style.display = "none"; }

async function updateLoan() {
    const payload = {
        studentName: document.getElementById("edit-loan-student").value,
        school: document.getElementById("edit-loan-school").value,
        grade: document.getElementById("edit-loan-grade").value,
        phone: document.getElementById("edit-loan-phone").value
    };

    await fetch(`${API_URL}/loans/${currentLoanId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    closeEditLoanModal();
    loadLoans();
}

// FINALIZAR EMPRÉSTIMO
document.getElementById("btn-confirm-return").onclick = async () => {
    await fetch(`${API_URL}/loans/${currentLoanId}`, { method: "DELETE" });
    closeModal();
    loadLoans();
};

document.getElementById("btn-delete-loan").onclick = async () => {
    if(confirm("Remover registro sem devolver o livro?")) {
        await fetch(`${API_URL}/loans/${currentLoanId}`, { method: "DELETE" });
        closeModal();
        loadLoans();
    }
};

window.onload = () => { navigate('view-dashboard'); };