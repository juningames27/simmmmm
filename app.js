server js
const express = require('express');
    const cors = require('cors');
    const fs = require('fs');
    const app = express();

    app.use(cors());
    app.use(express.json());

    const DB_FILE = 'db.json';

    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ books: [], loans: [] }));
    }

    const readDB = () => JSON.parse(fs.readFileSync(DB_FILE));
    const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

    // --- LIVROS ---
    app.get('/api/books', (req, res) => res.json(readDB().books));

    app.post('/api/books', (req, res) => {
        const db = readDB();
        const newBook = { ...req.body, status: 'Disponível' };
        if (!newBook.id) newBook.id = Date.now().toString().slice(-6);
        db.books.push(newBook);
        writeDB(db);
        res.json(newBook);
    });

    // REMOVER LIVRO
    app.delete('/api/books/:id', (req, res) => {
        const db = readDB();
        const bookIndex = db.books.findIndex(b => String(b.id) === String(req.params.id));
 
        if (bookIndex !== -1) {
            if (db.books[bookIndex].status === 'Alugado') {
                return res.status(400).json({ error: 'Não é possível remover um livro alugado!' });
            }
            db.books.splice(bookIndex, 1);
            writeDB(db);
            res.json({ message: 'Livro removido!' });
        } else {
            res.status(404).json({ error: 'Livro não encontrado.' });
        }
    });

    // --- EMPRÉSTIMOS ---
    app.get('/api/loans', (req, res) => {
        const db = readDB();
        const activeLoans = db.loans.filter(l => l.status === 'Ativo');
        res.json(activeLoans);
    });

    app.post('/api/loans', (req, res) => {
        const db = readDB();
        const book = db.books.find(b => String(b.id).trim() === String(req.body.bookId).trim());
 
        if (book && book.status && book.status.toLowerCase() === 'disponível') {
            const dateObj = new Date(req.body.rentalDate);
            dateObj.setDate(dateObj.getDate() + 7);

            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            const formattedReturnDate = `${day}/${month}/${year}`;

            const newLoan = {
                id: Date.now().toString(),
                studentName: req.body.studentName,
                school: req.body.school,
                grade: req.body.grade,
                bookId: book.id,
                bookTitle: book.title,
                rentalDate: req.body.rentalDate,
                returnDate: formattedReturnDate,
                status: 'Ativo'
            };

            book.status = 'Alugado';
            db.loans.push(newLoan);
            writeDB(db);
            res.json(newLoan);
        } else {
            res.status(400).json({ error: 'Livro indisponível ou não encontrado.' });
        }
    });

    app.post('/api/loans/:id/return', (req, res) => {
        const db = readDB();
        const loan = db.loans.find(l => l.id === req.params.id);
        if (loan) {
            const book = db.books.find(b => b.id === loan.bookId);
            if (book) book.status = 'Disponível';
            loan.status = 'Finalizado';
            writeDB(db);
            res.json({ message: 'Devolvido!' });
        } else {
            res.status(404).json({ error: 'Não encontrado.' });
        }
    });

    app.delete('/api/loans/:id', (req, res) => {
        const db = readDB();
        const loanIndex = db.loans.findIndex(l => l.id === req.params.id);
 
        if (loanIndex !== -1) {
            const loan = db.loans[loanIndex];
            const book = db.books.find(b => b.id === loan.bookId);
            if (book) book.status = 'Disponível';
            db.loans.splice(loanIndex, 1);
            writeDB(db);
            res.json({ message: 'Removido!' });
        } else {
            res.status(404).json({ error: 'Empréstimo não encontrado.' });
        }
    });

    app.get('/api/dashboard', (req, res) => {
        const db = readDB();
        const totalBooks = db.books.length;
        const rentedBooks = db.books.filter(b => b.status && b.status.toLowerCase() === 'alugado').length;
        const availableBooks = totalBooks - rentedBooks;
 
        const today = new Date().setHours(0,0,0,0);
        const lateLoans = db.loans.filter(l => {
            if(l.status !== 'Ativo') return false;
            const parts = l.returnDate.split('/');
            const dateLimit = new Date(parts[2], parts[1]-1, parts[0]).getTime();
            return dateLimit < today;
        }).length;

        const monthlyData = new Array(12).fill(0);
        db.loans.forEach(loan => {
            const d = new Date(loan.rentalDate);
            if (!isNaN(d.getTime())) monthlyData[d.getMonth()]++;
        });

        res.json({ totalBooks, rentedBooks, availableBooks, lateLoans, monthlyData });
    });

    app.listen(3000, () => console.log('Servidor rodando com funções de exclusão!'));

app js
const API_URL = 'https://simmmmm-1.onrender.com/api';
let statusChart, monthlyChart, currentLoanId;

async function navigate(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
 
    if (viewId === 'view-dashboard') loadDashboard();
    if (viewId === 'view-books') loadBooks();
    if (viewId === 'view-loans') { await loadBooks(); loadLoans(); }
}

async function loadDashboard() {
    try {
        const res = await fetch(`${API\_URL}/dashboard`);
        const data = await res.json();
        document.getElementById('dash-total-books').textContent = data.totalBooks;
        document.getElementById('dash-rented-books').textContent = data.rentedBooks;
        document.getElementById('dash-late-loans').textContent = data.lateLoans;

        const isDark = document.body.classList.contains('dark-theme');
        const color = isDark ? '#fff' : '#333';

        if (statusChart) statusChart.destroy();
        statusChart = new Chart(document.getElementById('chartStatus'), {
            type: 'doughnut',
            data: {
                labels: ['Livres', 'Alugados'],
                datasets: [{ data: [data.availableBooks, data.rentedBooks], backgroundColor: ['#198754', '#ffc107'] }]
            },
            options: { plugins: { legend: { labels: { color: color } } } }
        });

        if (monthlyChart) monthlyChart.destroy();
        monthlyChart = new Chart(document.getElementById('chartMonthly'), {
            type: 'bar',
            data: {
                labels: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
                datasets: [{ label: 'Empréstimos', data: data.monthlyData, backgroundColor: '#0d6efd' }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true, ticks: { color: color, stepSize: 1 } },
                    x: { ticks: { color: color } }
                },
                plugins: { legend: { labels: { color: color } } }
            }
        });
    } catch (e) { console.error(e); }
}

async function loadBooks() {
    const res = await fetch(`${API\_URL}/books`);
    const books = await res.json();
    const tbody = document.getElementById('table-books-body');
    tbody.innerHTML = '';
    const datalist = document.getElementById('books-datalist');
    datalist.innerHTML = '';

    books.forEach(b => {
        tbody.innerHTML += `
            <tr>
                <td>${b.id}</td>
                <td>${b.title}</td>
                <td>${b.author}</td>
                <td class="status-${b.status}">${b.status}</td>
                <td><button onclick="deleteBook('${b.id}')" class="btn-delete-row">🗑️</button></td>
            </tr>`;
        if (b.status === 'Disponível') datalist.innerHTML += `<option value="${b.title} | ID: ${b.id}">`;
    });
}

async function deleteBook(id) {
    if(confirm("Deseja remover este livro do acervo?")) {
        const res = await fetch(`${API\_URL}/books/${id}`, { method: 'DELETE' });
        if(res.ok) { loadBooks(); loadDashboard(); }
        else { const err = await res.json(); alert(err.error); }
    }
}

document.getElementById('form-book').onsubmit = async (e) => {
    e.preventDefault();
    await fetch(`${API\_URL}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: document.getElementById('book-id').value,
            title: document.getElementById('book-title').value,
            author: document.getElementById('book-author').value
        })
    });
    e.target.reset();
    loadBooks();
};

async function loadLoans() {
    const res = await fetch(`${API\_URL}/loans`);
    const loans = await res.json();
    const tbody = document.getElementById('table-loans-body');
    tbody.innerHTML = '';
    const today = new Date().setHours(0,0,0,0);

    loans.forEach(l => {
        const parts = l.returnDate.split('/');
        const dateLimit = new Date(parts[2], parts[1]-1, parts[0]).getTime();
        const isLate = dateLimit < today;

        tbody.innerHTML += `
            <tr onclick="openModal('${l.id}', '${l.studentName}', '${l.bookTitle}', '${l.returnDate}')" style="cursor:pointer">
                <td>${l.studentName}</td>
                <td>${l.school}</td>
                <td>${l.grade || '---'}</td>
                <td>${l.bookTitle}</td>
                <td>${l.returnDate} ${isLate ? '<span class="badge-late">ATRASADO</span>' : ''}</td>
                <td><button class="btn-ver">🔍 Detalhes</button></td>
            </tr>`;
    });
}

document.getElementById('form-loan').onsubmit = async (e) => {
    e.preventDefault();
    const searchValue = document.getElementById('loan-book-search').value;
    const bookId = searchValue.includes('ID: ') ? searchValue.split('ID: ')[1].trim() : "";

    const res = await fetch(`${API\_URL}/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentName: document.getElementById('loan-student').value,
            school: document.getElementById('loan-school').value,
            grade: document.getElementById('loan-grade').value,
            bookId: bookId,
            rentalDate: document.getElementById('loan-date').value
        })
    });

    if (res.ok) {
        e.target.reset();
        document.getElementById('loan-date').valueAsDate = new Date();
        loadLoans(); loadDashboard();
    } else {
        const err = await res.json(); alert(err.error);
    }
};

function openModal(id, student, book, date) {
    currentLoanId = id;
    document.getElementById('modal-details').innerHTML = `<p><b>Aluno:</b> ${student}</p><p><b>Livro:</b> ${book}</p><p><b>Entrega:</b> ${date}</p>`;
    document.getElementById('modal-loan').style.display = 'block';
}

function closeModal() { document.getElementById('modal-loan').style.display = 'none'; }

document.getElementById('btn-confirm-return').onclick = async () => {
    await fetch(`${API\_URL}/loans/${currentLoanId}/return`, { method: 'POST' });
    closeModal(); loadLoans(); loadDashboard();
};

document.getElementById('btn-delete-loan').onclick = async () => {
    if(confirm("Remover registro do banco de dados?")) {
        await fetch(`${API\_URL}/loans/${currentLoanId}`, { method: 'DELETE' });
        closeModal(); loadLoans(); loadDashboard();
    }
};

function toggleTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    document.body.classList.toggle('light-theme', isDark);
    document.body.classList.toggle('dark-theme', !isDark);
    document.getElementById('theme-toggle').textContent = isDark ? '🌑' : '☀️';
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    loadDashboard();
}

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.className = 'dark-theme';
        document.getElementById('theme-toggle').textContent = '☀️';
    }
    document.getElementById('loan-date').valueAsDate = new Date();
    loadDashboard();
});

index html
