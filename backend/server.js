const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

// Configurações básicas
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');

// --- FUNÇÕES DE PERSISTÊNCIA (Banco de Dados JSON) ---
const readData = () => {
    if (!fs.existsSync(DATA_FILE)) {
        // Estrutura inicial se o arquivo não existir
        fs.writeFileSync(DATA_FILE, JSON.stringify({ books: [], loans: [] }));
        return { books: [], loans: [] };
    }
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content || '{"books":[], "loans":[]}');
};

const writeData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// --- ROTAS DE LIVROS ---

// Listar todos os livros
app.get('/api/books', (req, res) => {
    const data = readData();
    res.json(data.books);
});

// Cadastrar novo livro
app.post('/api/books', (req, res) => {
    const data = readData();
    const newBook = {
        id: Date.now().toString(),
        title: req.body.title,
        author: req.body.author,
        status: 'Disponível'
    };
    data.books.push(newBook);
    writeData(data);
    res.status(201).json(newBook);
});

// Deletar livro
app.delete('/api/books/:id', (req, res) => {
    let data = readData();
    const book = data.books.find(b => b.id === req.params.id);
    
    if (book && book.status === 'Alugado') {
        return res.status(400).json({ error: "Não é possível remover um livro que está alugado no momento." });
    }
    
    data.books = data.books.filter(b => b.id !== req.params.id);
    writeData(data);
    res.status(200).json({ message: "Livro removido com sucesso." });
});

// --- ROTAS DE EMPRÉSTIMOS ---

// Listar empréstimos ativos
app.get('/api/loans', (req, res) => {
    const data = readData();
    res.json(data.loans);
});

// Registrar saída (Empréstimo)
app.post('/api/loans', (req, res) => {
    const data = readData();
    const { studentName, school, grade, bookId, rentalDate } = req.body;

    const bookIndex = data.books.findIndex(b => b.id === bookId);
    
    if (bookIndex === -1 || data.books[bookIndex].status !== 'Disponível') {
        return res.status(400).json({ error: "Livro indisponível para empréstimo." });
    }

    // Calcular data de devolução (7 dias após a retirada)
    const dateObj = new Date(rentalDate);
    dateObj.setDate(dateObj.getDate() + 7);
    const returnDateStr = dateObj.toLocaleDateString('pt-BR');

    const newLoan = {
        id: Date.now().toString(),
        studentName,
        school,
        grade,
        bookId,
        bookTitle: data.books[bookIndex].title,
        rentalDate,
        returnDate: returnDateStr,
        monthIndex: new Date(rentalDate).getMonth() // Salva o mês para o gráfico anual
    };

    // Atualiza status do livro para Alugado
    data.books[bookIndex].status = 'Alugado';
    data.loans.push(newLoan);
    
    writeData(data);
    res.status(201).json(newLoan);
});

// Devolver/Remover empréstimo
app.delete('/api/loans/:id', (req, res) => {
    let data = readData();
    const loan = data.loans.find(l => l.id === req.params.id);

    if (loan) {
        // Quando devolve, o livro volta a ficar Disponível
        const bookIndex = data.books.findIndex(b => b.id === loan.bookId);
        if (bookIndex !== -1) {
            data.books[bookIndex].status = 'Disponível';
        }
        
        data.loans = data.loans.filter(l => l.id !== req.params.id);
        writeData(data);
        return res.status(200).json({ message: "Livro devolvido com sucesso." });
    }
    res.status(404).json({ error: "Empréstimo não encontrado." });
});

// --- ROTA DO DASHBOARD (Estatísticas) ---
app.get('/api/dashboard', (req, res) => {
    const data = readData();
    const today = new Date().setHours(0,0,0,0);
    
    const rentedBooks = data.books.filter(b => b.status === 'Alugado').length;
    
    // Contagem de atrasados
    const lateLoans = data.loans.filter(l => {
        const parts = l.returnDate.split('/');
        const deadline = new Date(parts[2], parts[1]-1, parts[0]).getTime();
        return deadline < today;
    }).length;

    // Dados para o gráfico mensal (12 meses)
    const monthlyStats = new Array(12).fill(0);
    data.loans.forEach(l => {
        if (l.monthIndex !== undefined) monthlyStats[l.monthIndex]++;
    });

    res.json({
        totalBooks: data.books.length,
        availableBooks: data.books.length - rentedBooks,
        rentedBooks: rentedBooks,
        lateLoans: lateLoans,
        monthlyData: monthlyStats
    });
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`>>> Servidor NTE rodando na porta ${PORT}`);
    console.log(`>>> Banco de dados em: ${DATA_FILE}`);
});