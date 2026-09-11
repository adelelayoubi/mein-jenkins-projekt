'use strict';
const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5000;

class CalculatorService {
    static add(a, b) { return a + b; }
    static subtract(a, b) { return a - b; }
    static multiply(a, b) { return a * b; }
    static divide(a, b) {
        if (b === 0) throw new Error('Division durch 0 ist nicht erlaubt.');
        return a / b;
    }
    static calculate(op, a, b) {
        switch(op) {
            case 'add': return CalculatorService.add(a, b);
            case 'subtract': return CalculatorService.subtract(a, b);
            case 'multiply': return CalculatorService.multiply(a, b);
            case 'divide': return CalculatorService.divide(a, b);
            default: throw new Error(`Unbekannter Operator: '${op}'`);
        }
    }
}

app.get('/health', (req, res) => res.status(200).json({ status: 'UP' }));

app.post('/calculate', (req, res) => {
    try {
        const { operator, a, b } = req.body;
        const result = CalculatorService.calculate(operator, Number(a), Number(b));
        res.json({ operator, a, b, result });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Backend läuft auf Port ${PORT}`));