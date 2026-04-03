const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, 'db.json');

// Inicializa o banco
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ books: [], loans: [], nextBookId: 1 }));
}

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

app.get('/', (req, res) => res.send('Servidor Biblioteca NTE Online!'));

// --- LIVROS ---
app.get('/api/books', (req, res) => res.json(readDB().books));

app.post('/api/books', (req, res) => {
    const db = readDB();
    const newId = (db.nextBookId || 1).toString();
    const newBook = { id: newId, title: req.body.title, author: req.body.author, status: 'Disponível' };
    db.books.push(newBook);
    db.nextBookId = (parseInt(newId) + 1);
    writeDB(db);
    res.json(newBook);
});

// EDITAR LIVRO
app.put('/api/books/:id', (req, res) => {
    const db = readDB();
    const index = db.books.findIndex(b => String(b.id) === String(req.params.id));
    if (index !== -1) {
        db.books[index].title = req.body.title;
        db.books[index].author = req.body.author;
        writeDB(db);
        res.json(db.books[index]);
    } else { res.status(404).send(); }
});

app.delete('/api/books/:id', (req, res) => {
    const db = readDB();
    const bookIndex = db.books.findIndex(b => String(b.id) === String(req.params.id));
    if (bookIndex !== -1) {
        if (db.books[bookIndex].status === 'Alugado') return res.status(400).json({error: "Livro alugado!"});
        db.books.splice(bookIndex, 1);
        writeDB(db);
        res.json({message: "OK"});
    } else { res.status(404).send(); }
});

// --- EMPRÉSTIMOS ---
app.get('/api/loans', (req, res) => res.json(readDB().loans));

app.post('/api/loans', (req, res) => {
    const db = readDB();
    const book = db.books.find(b => String(b.id) === String(req.body.bookId));
    if (book && book.status === 'Disponível') {
        const dateObj = new Date(req.body.rentalDate);
        dateObj.setDate(dateObj.getDate() + 7);
        const returnD = `${String(dateObj.getDate()).padStart(2,'0')}/${String(dateObj.getMonth()+1).padStart(2,'0')}/${dateObj.getFullYear()}`;
        
        const newLoan = {
            id: Date.now().toString(),
            studentName: req.body.studentName,
            phone: req.body.phone,
            school: req.body.school,
            grade: req.body.grade,
            bookId: book.id,
            bookTitle: book.title,
            rentalDate: req.body.rentalDate,
            returnDate: returnD,
            status: 'Ativo'
        };
        book.status = 'Alugado';
        db.loans.push(newLoan);
        writeDB(db);
        res.json(newLoan);
    } else { res.status(400).json({error: "Indisponível"}); }
});

// EDITAR ALUNO NO EMPRÉSTIMO
app.put('/api/loans/:id', (req, res) => {
    const db = readDB();
    const index = db.loans.findIndex(l => l.id === req.params.id);
    if (index !== -1) {
        db.loans[index].studentName = req.body.studentName;
        db.loans[index].phone = req.body.phone;
        db.loans[index].school = req.body.school;
        db.loans[index].grade = req.body.grade;
        writeDB(db);
        res.json(db.loans[index]);
    } else { res.status(404).send(); }
});

app.delete('/api/loans/:id', (req, res) => {
    const db = readDB();
    const idx = db.loans.findIndex(l => l.id === req.params.id);
    if (idx !== -1) {
        const book = db.books.find(b => b.id === db.loans[idx].bookId);
        if (book) book.status = 'Disponível';
        db.loans.splice(idx, 1);
        writeDB(db);
        res.json({message: "OK"});
    } else { res.status(404).send(); }
});

app.get('/api/dashboard', (req, res) => {
    const db = readDB();
    const rented = db.books.filter(b => b.status === 'Alugado').length;
    const monthly = new Array(12).fill(0);
    db.loans.forEach(l => { const m = new Date(l.rentalDate).getMonth(); if(m>=0) monthly[m]++; });
    res.json({ totalBooks: db.books.length, rentedBooks: rented, availableBooks: db.books.length - rented, monthlyData: monthly });
});

app.listen(process.env.PORT || 3000);