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
    const newBook = { id: (db.nextBookId++).toString(), title: req.body.title, author: req.body.author, status: "Disponível" };
    db.books.push(newBook);
    writeDB(db);
    res.json(newBook);
});

// --- EMPRÉSTIMOS ---
app.get("/api/loans", (req, res) => res.json(readDB().loans));

app.post("/api/loans", (req, res) => {
    const db = readDB();
    const book = db.books.find(b => b.id === req.body.bookId);
    if (book && book.status === "Disponível") {
        const dateObj = new Date(req.body.rentalDate);
        dateObj.setDate(dateObj.getDate() + 7);
        const returnDate = dateObj.toLocaleDateString('pt-BR');
        const newLoan = {
            id: Date.now().toString(),
            studentName: req.body.studentName,
            phone: req.body.phone,
            school: req.body.school,
            grade: req.body.grade,
            bookId: book.id,
            bookTitle: book.title,
            rentalDate: req.body.rentalDate,
            returnDate,
            status: "Ativo"
        };
        book.status = "Alugado";
        db.loans.push(newLoan);
        writeDB(db);
        res.json(newLoan);
    } else res.status(400).json({ error: "Livro indisponível" });
});

app.put("/api/loans/:id", (req, res) => {
    const db = readDB();
    const idx = db.loans.findIndex(l => l.id === req.params.id);
    if (idx !== -1) {
        db.loans[idx].studentName = req.body.studentName || db.loans[idx].studentName;
        db.loans[idx].phone = req.body.phone || db.loans[idx].phone;
        db.loans[idx].school = req.body.school || db.loans[idx].school;
        db.loans[idx].grade = req.body.grade || db.loans[idx].grade;
        writeDB(db);
        res.json(db.loans[idx]);
    } else res.status(404).send("Não encontrado");
});

app.delete("/api/loans/:id", (req, res) => {
    const db = readDB();
    const idx = db.loans.findIndex(l => l.id === req.params.id);
    if (idx !== -1) {
        const book = db.books.find(b => b.id === db.loans[idx].bookId);
        if (book) book.status = "Disponível";
        db.loans.splice(idx, 1);
        writeDB(db);
        res.send({ message: "Removido" });
    } else res.status(404).send("Não encontrado");
});

app.get("/api/dashboard", (req, res) => {
    const db = readDB();
    const rented = db.books.filter(b => b.status === "Alugado").length;
    res.json({ totalBooks: db.books.length, rentedBooks: rented, lateLoans: 0 });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor Rodando!"));