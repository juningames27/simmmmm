const API_URL = "https://simmmmm-1.onrender.com/api";
let statusChart, monthlyChart, currentLoanId, currentBookId;
let allBooks = [];

async function navigate(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(viewId).classList.add("active");
    if (viewId === "view-dashboard") loadDashboard();
    if (viewId === "view-books") loadBooks();
    if (viewId === "view-loans") { await loadBooks(); loadLoans(); }
}

async function loadDashboard() {
    try {
        const res = await fetch(`${API_URL}/dashboard`);
        const data = await res.json();
        document.getElementById("dash-total-books").textContent = data.totalBooks;
        document.getElementById("dash-rented-books").textContent = data.rentedBooks;
        document.getElementById("dash-late-loans").textContent = data.lateLoans;
        const color = document.body.classList.contains("dark-theme") ? "#fff" : "#333";
        if (statusChart) statusChart.destroy();
        statusChart = new Chart(document.getElementById("chartStatus"), {
            type: "doughnut",
            data: { labels: ["Livres", "Alugados"], datasets: [{ data: [data.availableBooks, data.rentedBooks], backgroundColor: ["#007bff", "#dc3545"] }] },
            options: { plugins: { legend: { labels: { color: color } } } }
        });
        if (monthlyChart) monthlyChart.destroy();
        monthlyChart = new Chart(document.getElementById("chartMonthly"), {
            type: "bar",
            data: { labels: ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"], datasets: [{ label: "Empréstimos", data: data.monthlyData, backgroundColor: "#0d6efd" }] },
            options: { scales: { y: { beginAtZero: true, ticks: { color: color, stepSize: 1 } }, x: { ticks: { color: color } } }, plugins: { legend: { labels: { color: color } } } }
        });
    } catch (e) { console.error(e); }
}

async function loadBooks() {
    const res = await fetch(`${API_URL}/books`);
    allBooks = await res.json();
    renderBooks(allBooks);
}

function renderBooks(list) {
    const tbody = document.getElementById("table-books-body");
    tbody.innerHTML = "";
    const datalist = document.getElementById("books-datalist");
    datalist.innerHTML = "";
    list.forEach(b => {
        tbody.innerHTML += `
        <tr>
            <td>${b.id}</td>
            <td>${b.title}</td>
            <td>${b.author}</td>
            <td class="status-${b.status}">${b.status}</td>
            <td>
                <button onclick="openEditBookModal('${b.id}', '${b.title}', '${b.author}')" class="btn-edit-row">✏️</button>
                <button onclick="deleteBook('${b.id}')" class="btn-delete-row">🗑️</button>
            </td>
        </tr>`;
        if (b.status === "Disponível") datalist.innerHTML += `<option value="${b.title} | ID: ${b.id}">`;
    });
}

// EDIÇÃO DE LIVRO
function openEditBookModal(id, title, author) {
    currentBookId = id;
    document.getElementById("edit-book-title").value = title;
    document.getElementById("edit-book-author").value = author;
    document.getElementById("modal-edit-book").style.display = "block";
}

function closeEditBookModal() { document.getElementById("modal-edit-book").style.display = "none"; }

async function updateBook() {
    const res = await fetch(`${API_URL}/books/${currentBookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            title: document.getElementById("edit-book-title").value, 
            author: document.getElementById("edit-book-author").value 
        })
    });
    if (res.ok) { closeEditBookModal(); loadBooks(); }
}

async function deleteBook(id) {
    if (confirm("Remover livro do acervo?")) {
        const res = await fetch(`${API_URL}/books/${id}`, { method: "DELETE" });
        if (res.ok) { loadBooks(); loadDashboard(); } else { alert((await res.json()).error); }
    }
}

document.getElementById("form-book").onsubmit = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: document.getElementById("book-title").value, author: document.getElementById("book-author").value })
    });
    e.target.reset(); loadBooks();
};

async function loadLoans() {
    const res = await fetch(`${API_URL}/loans`);
    const loans = await res.json();
    const tbody = document.getElementById("table-loans-body");
    tbody.innerHTML = "";
    const today = new Date().setHours(0,0,0,0);
    loans.forEach(l => {
        const p = l.returnDate.split("/");
        const isLate = new Date(p[2], p[1]-1, p[0]).getTime() < today;
        tbody.innerHTML += `
        <tr onclick='openModal(${JSON.stringify(l)})' style="cursor:pointer">
            <td>${l.studentName}</td>
            <td>${l.school}</td>
            <td>${l.grade}</td>
            <td>${l.bookTitle}</td>
            <td>${l.returnDate} ${isLate ? '<span class="badge-late">ATRASADO</span>' : ""}</td>
            <td><button class="btn-ver">🔍 Detalhes</button></td>
        </tr>`;
    });
}

// EDIÇÃO DE ALUNO (DENTRO DO MODAL DE EMPRÉSTIMO)
function openModal(l) {
    currentLoanId = l.id;
    document.getElementById("modal-details").innerHTML = `
        <label>Aluno:</label><input type="text" id="edit-loan-student" value="${l.studentName}">
        <label>Telefone:</label><input type="tel" id="edit-loan-phone" value="${l.phone}">
        <label>Escola:</label><input type="text" id="edit-loan-school" value="${l.school}">
        <label>Série:</label><input type="text" id="edit-loan-grade" value="${l.grade}">
        <p style="margin-top:10px"><b>Livro:</b> ${l.bookTitle}</p>
        <p><b>Devolução:</b> ${l.returnDate}</p>
    `;
    document.getElementById("modal-loan").style.display = "block";
}

async function updateLoan() {
    const res = await fetch(`${API_URL}/loans/${currentLoanId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            studentName: document.getElementById("edit-loan-student").value,
            phone: document.getElementById("edit-loan-phone").value,
            school: document.getElementById("edit-loan-school").value,
            grade: document.getElementById("edit-loan-grade").value
        })
    });
    if (res.ok) { closeModal(); loadLoans(); }
}

function closeModal() { document.getElementById("modal-loan").style.display = "none"; }

document.getElementById("btn-confirm-return").onclick = async () => {
    await fetch(`${API_URL}/loans/${currentLoanId}`, { method: "DELETE" });
    closeModal(); loadLoans(); loadDashboard();
};

document.getElementById("btn-delete-loan").onclick = async () => {
    if (confirm("Remover registro permanente?")) {
        await fetch(`${API_URL}/loans/${currentLoanId}`, { method: "DELETE" });
        closeModal(); loadLoans(); loadDashboard();
    }
};

document.getElementById("search-book-input").addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    renderBooks(allBooks.filter(b => b.title.toLowerCase().includes(term) || b.author.toLowerCase().includes(term)));
});

function toggleTheme() {
    const isDark = document.body.classList.contains("dark-theme");
    document.body.classList.toggle("light-theme", isDark);
    document.body.classList.toggle("dark-theme", !isDark);
    document.getElementById("theme-toggle").textContent = isDark ? "⚫" : "⚪";
    localStorage.setItem("theme", isDark ? "light" : "dark");
    loadDashboard();
}

document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
        document.body.className = "light-theme";
        document.getElementById("theme-toggle").textContent = "⚫";
    }
    document.getElementById("loan-date").valueAsDate = new Date();
    loadDashboard();
});