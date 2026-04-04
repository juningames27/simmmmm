    const express = require("express");
    const cors = require("cors");
    const fs = require("fs");
    const path = require("path");
    const app = express();

    app.use(cors());
    app.use(express.json());

    const DB_FILE = path.join(__dirname, "db.json");

    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(
            DB_FILE,
            JSON.stringify({ books: [], loans: [], nextBookId: 1 })
        );
    }

    const readDB = () => JSON.parse(fs.readFileSync(DB_FILE));
    const writeDB = (data) =>
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

    app.get("/", (req, res) => res.send("Servidor Biblioteca NTE Online!"));

    // --- LIVROS ---
    app.get("/api/books", (req, res) => res.json(readDB().books));

    app.post("/api/books", (req, res) => {
        const db = readDB();
        if (db.nextBookId === undefined) {
            const maxId = db.books.reduce((max, book) => Math.max(max, parseInt(book.id) || 0), 0);
            db.nextBookId = maxId + 1;
        }
        const newId = db.nextBookId.toString();
        const newBook = {
            id: newId,
            title: req.body.title,
            author: req.body.author,
            status: "Disponível",
        };
        db.books.push(newBook);
        db.nextBookId++;
        writeDB(db);
        res.json(newBook);
    });

    app.put("/api/books/:id", (req, res) => {
        const db = readDB();
        const bookIndex = db.books.findIndex((b) => String(b.id) === String(req.params.id));
        if (bookIndex !== -1) {
            db.books[bookIndex].title = req.body.title;
            db.books[bookIndex].author = req.body.author;
            writeDB(db);
            res.json(db.books[bookIndex]);
        } else {
            res.status(404).json({ error: "Livro não encontrado." });
        }
    });

    app.delete("/api/books/:id", (req, res) => {
        const db = readDB();
        const bookIndex = db.books.findIndex((b) => String(b.id) === String(req.params.id));
        if (bookIndex !== -1) {
            if (db.books[bookIndex].status === "Alugado") {
                return res.status(400).json({ error: "Não é possível remover um livro alugado!" });
            }
            db.books.splice(bookIndex, 1);
            writeDB(db);
            res.json({ message: "Livro removido!" });
        } else {
            res.status(404).json({ error: "Livro não encontrado." });
        }
    });

    // --- EMPRÉSTIMOS ---
    app.get("/api/loans", (req, res) => {
        const db = readDB();
        res.json(db.loans.filter((l) => l.status === "Ativo"));
    });

    app.post("/api/loans", (req, res) => {
        const db = readDB();
        const book = db.books.find((b) => String(b.id).trim() === String(req.body.bookId).trim());
        if (book && book.status.toLowerCase() === "disponível") {
            const dateObj = new Date(req.body.rentalDate);
            dateObj.setDate(dateObj.getDate() + 7);
            const day = String(dateObj.getDate()).padStart(2, "0");
            const month = String(dateObj.getMonth() + 1).padStart(2, "0");
            const year = dateObj.getFullYear();
            const formattedReturnDate = `${day}/${month}/${year}`;

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
                status: "Ativo",
            };
            book.status = "Alugado";
            db.loans.push(newLoan);
            writeDB(db);
            res.json(newLoan);
        } else {
            res.status(400).json({ error: "Livro indisponível ou não encontrado." });
        }
    });

    // ATUALIZAR DADOS DO ALUNO (INCLUINDO TELEFONE)
    app.put("/api/loans/:id", (req, res) => {
        const db = readDB();
        const idx = db.loans.findIndex(l => String(l.id) === String(req.params.id));
        
        if (idx !== -1) {
            // Atualiza apenas os campos enviados no corpo da requisição
            if (req.body.studentName !== undefined) db.loans[idx].studentName = req.body.studentName;
            if (req.body.phone !== undefined) db.loans[idx].phone = req.body.phone;
            if (req.body.school !== undefined) db.loans[idx].school = req.body.school;
            if (req.body.grade !== undefined) db.loans[idx].grade = req.body.grade;
            
            writeDB(db);
            res.json(db.loans[idx]);
        } else {
            res.status(404).json({ error: "Empréstimo não encontrado" });
        }
    });

    app.delete("/api/loans/:id", (req, res) => {
        const db = readDB();
        const loanIndex = db.loans.findIndex((l) => l.id === req.params.id);
        if (loanIndex !== -1) {
            const book = db.books.find((b) => b.id === db.loans[loanIndex].bookId);
            if (book) book.status = "Disponível";
            db.loans.splice(loanIndex, 1);
            writeDB(db);
            res.json({ message: "Removido!" });
        } else {
            res.status(404).json({ error: "Empréstimo não encontrado." });
        }
    });

    app.get("/api/dashboard", (req, res) => {
        const db = readDB();
        const totalBooks = db.books.length;
        const rentedBooks = db.books.filter((b) => b.status.toLowerCase() === "alugado").length;
        const today = new Date().setHours(0, 0, 0, 0);
        const lateLoans = db.loans.filter((l) => {
            const parts = l.returnDate.split("/");
            return new Date(parts[2], parts[1] - 1, parts[0]).getTime() < today;
        }).length;
        const monthlyData = new Array(12).fill(0);
        db.loans.forEach((loan) => {
            const d = new Date(loan.rentalDate);
            if (!isNaN(d.getTime())) monthlyData[d.getMonth()]++;
        });
        res.json({ totalBooks, rentedBooks, availableBooks: totalBooks - rentedBooks, lateLoans, monthlyData });
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
