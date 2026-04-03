const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, "db.json");

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ books: [], loans: [], nextBookId: 1 }));
}

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

app.get("/", (req, res) => res.send("Servidor Biblioteca NTE Online!"));

// --- LIVROS ---
app.get("/api/books", (req, res) => res.json(readDB().books));

app.post("/api/books", (req, res) => {
    const db = readDB();
    const newId = (db.nextBookId || 1).toString();
    const newBook = { id: newId, title: req.body.title, author: req.body.author, status: "Disponível" };
    db.books.push(newBook);
    db.nextBookId = (db.nextBookId || 1) + 1;
    writeDB(db);
    res.json(newBook);
});

// EDITAR LIVRO
app.put("/api/books/:id", (req, res) => {
    const db = readDB();
    const book = db.books.find(b => String(b.id) === String(req.params.id));
    if (book) {
        book.title = req.body.title || book.title;
        book.author = req.body.author || book.author;
        writeDB(db);
        res.json(book);
    } else {
        res.status(404).json({ error: "Livro não encontrado" });
    }
});

app.delete("/api/books/:id", (req, res) => {
    const db = readDB();
    const idx = db.books.findIndex(b => String(b.id) === String(req.params.id));
    if (idx !== -1) {
        if (db.books[idx].status === "Alugado") return res.status(400).json({ error: "Livro alugado!" });
        db.books.splice(idx, 1);
        writeDB(db);
        res.json({ message: "Removido" });
    } else res.status(404).json({ error: "Não encontrado" });
});

// --- EMPRÉSTIMOS ---
app.get("/api/loans", (req, res) => res.json(readDB().loans.filter(l => l.status === "Ativo")));

app.post("/api/loans", (req, res) => {
    const db = readDB();
    const book = db.books.find(b => String(b.id).trim() === String(req.body.bookId).trim());
    if (book && book.status === "Disponível") {
        const dateObj = new Date(req.body.rentalDate);
        dateObj.setDate(dateObj.getDate() + 7);
        const formattedReturnDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
        
        const newLoan = {
            id: Date.now().toString(),
            studentName: req.body.studentName,
            phone: req.body.phone,
            school: req.body.school,
            grade: req.body.grade,
            bookId: book.id,
            bookTitle: book.title,
            rentalDate: req.body.rentalDate,
            returnDate: formattedReturnDate,
            status: "Ativo"
        };
        book.status = "Alugado";
        db.loans.push(newLoan);
        writeDB(db);
        res.json(newLoan);
    } else res.status(400).json({ error: "Livro indisponível" });
});

// EDITAR EMPRÉSTIMO (DADOS DO ALUNO)
app.put("/api/loans/:id", (req, res) => {
    const db = readDB();
    const loan = db.loans.find(l => l.id === req.params.id);
    if (loan) {
        loan.studentName = req.body.studentName || loan.studentName;
        loan.phone = req.body.phone || loan.phone;
        loan.school = req.body.school || loan.school;
        loan.grade = req.body.grade || loan.grade;
        writeDB(db);
        res.json(loan);
    } else res.status(404).json({ error: "Empréstimo não encontrado" });
});

app.delete("/api/loans/:id", (req, res) => {
    const db = readDB();
    const idx = db.loans.findIndex(l => l.id === req.params.id);
    if (idx !== -1) {
        const book = db.books.find(b => b.id === db.loans[idx].bookId);
        if (book) book.status = "Disponível";
        db.loans.splice(idx, 1);
        writeDB(db);
        res.json({ message: "OK" });
    } else res.status(404).json({ error: "Não encontrado" });
});

app.get("/api/dashboard", (req, res) => {
    const db = readDB();
    const rented = db.books.filter(b => b.status === "Alugado").length;
    const today = new Date().setHours(0,0,0,0);
    const late = db.loans.filter(l => {
        if (l.status !== "Ativo") return false;
        const p = l.returnDate.split("/");
        return new Date(p[2], p[1]-1, p[0]).getTime() < today;
    }).length;
    const monthly = new Array(12).fill(0);
    db.loans.forEach(l => { const m = new Date(l.rentalDate).getMonth(); if(!isNaN(m)) monthly[m]++; });
    res.json({ totalBooks: db.books.length, rentedBooks: rented, availableBooks: db.books.length - rented, lateLoans: late, monthlyData: monthly });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));