/**
 * server.js
 *
 * Taschenrechner-Server (Calculator Server)
 *
 * Implementiert nach Java-ähnlichen Konventionen:
 *  - Klassenbasierte Kapselung der Geschäftslogik (CalculatorService)
 *  - Strenge Eingabevalidierung (Guard Clauses)
 *  - Zentrales Error-Handling (Middleware, vergleichbar mit @ExceptionHandler)
 *  - Konstanten in UPPER_CASE, explizite JSDoc-Typannotationen
 *
 * Laufzeit: Node.js + Express
 * Deployment: Docker / CI-CD Pipeline
 */

'use strict';

const express = require('express');

/** @constant {number} DEFAULT_PORT - Standard-Port, falls keine ENV-Variable gesetzt ist */
const DEFAULT_PORT = 3000;

/** @constant {number} PORT - Tatsächlich verwendeter Port */
const PORT = process.env.PORT || DEFAULT_PORT;

/**
 * CalculatorService
 *
 * Kapselt die gesamte Rechenlogik analog zu einer Java-Service-Klasse
 * (z. B. @Service in Spring). Alle Methoden sind statisch, da kein
 * interner State gehalten wird.
 */
class CalculatorService {
    /**
     * Addiert zwei Zahlen.
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    static add(a, b) {
        return a + b;
    }

    /**
     * Subtrahiert b von a.
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    static subtract(a, b) {
        return a - b;
    }

    /**
     * Multipliziert zwei Zahlen.
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    static multiply(a, b) {
        return a * b;
    }

    /**
     * Dividiert a durch b.
     * @param {number} a
     * @param {number} b
     * @returns {number}
     * @throws {CalculationException} bei Division durch 0
     */
    static divide(a, b) {
        if (b === 0) {
            throw new CalculationException('Division durch 0 ist nicht erlaubt.');
        }
        return a / b;
    }

    /**
     * Führt die Operation anhand des übergebenen Operator-Strings aus.
     * Vergleichbar mit einem switch-case Dispatch in Java.
     *
     * @param {string} operator - einer von: add, subtract, multiply, divide
     * @param {number} a
     * @param {number} b
     * @returns {number}
     * @throws {CalculationException} bei unbekanntem Operator
     */
    static calculate(operator, a, b) {
        switch (operator) {
            case 'add':
                return CalculatorService.add(a, b);
            case 'subtract':
                return CalculatorService.subtract(a, b);
            case 'multiply':
                return CalculatorService.multiply(a, b);
            case 'divide':
                return CalculatorService.divide(a, b);
            default:
                throw new CalculationException(`Unbekannter Operator: '${operator}'`);
        }
    }
}

/**
 * CalculationException
 *
 * Benutzerdefinierte Exception-Klasse, analog zu einer
 * checked/unchecked Exception in Java (extends RuntimeException).
 */
class CalculationException extends Error {
    /**
     * @param {string} message
     */
    constructor(message) {
        super(message);
        this.name = 'CalculationException';
        this.statusCode = 400;
    }
}

/**
 * InputValidator
 *
 * Statische Hilfsklasse zur Validierung eingehender Request-Parameter.
 */
class InputValidator {
    /**
     * Validiert, dass der übergebene Wert eine gültige, endliche Zahl ist.
     *
     * @param {*} value
     * @param {string} fieldName
     * @returns {number}
     * @throws {CalculationException}
     */
    static validateNumber(value, fieldName) {
        const parsed = Number(value);
        if (value === undefined || value === null || value === '' || Number.isNaN(parsed) || !Number.isFinite(parsed)) {
            throw new CalculationException(`Ungültiger Wert für Parameter '${fieldName}': '${value}'`);
        }
        return parsed;
    }

    /**
     * Validiert, dass ein Operator vorhanden und unterstützt ist.
     *
     * @param {*} operator
     * @returns {string}
     * @throws {CalculationException}
     */
    static validateOperator(operator) {
        const SUPPORTED_OPERATORS = ['add', 'subtract', 'multiply', 'divide'];
        if (!SUPPORTED_OPERATORS.includes(operator)) {
            throw new CalculationException(
                `Ungültiger Operator: '${operator}'. Erlaubt: ${SUPPORTED_OPERATORS.join(', ')}`
            );
        }
        return operator;
    }
}

/* -----------------------------------------------------------------------
 * Express-Anwendung / Controller-Layer (analog zu @RestController in Java)
 * --------------------------------------------------------------------- */

const app = express();
app.use(express.json());

/**
 * Health-Check-Endpoint.
 * GET /health
 */
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
});

/**
 * Haupt-Endpoint für Berechnungen.
 * POST /calculate
 * Body: { "operator": "add" | "subtract" | "multiply" | "divide", "a": number, "b": number }
 */
app.post('/calculate', (req, res, next) => {
    try {
        const { operator, a, b } = req.body;

        const validatedOperator = InputValidator.validateOperator(operator);
        const numberA = InputValidator.validateNumber(a, 'a');
        const numberB = InputValidator.validateNumber(b, 'b');

        const result = CalculatorService.calculate(validatedOperator, numberA, numberB);

        res.status(200).json({
            operator: validatedOperator,
            a: numberA,
            b: numberB,
            result
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Bequemlichkeits-Endpoints via GET, z. B. /add?a=2&b=3
 * Analog zu zusätzlichen @GetMapping-Routen in Java.
 */
app.get('/:operator', (req, res, next) => {
    try {
        const { operator } = req.params;
        const { a, b } = req.query;

        const validatedOperator = InputValidator.validateOperator(operator);
        const numberA = InputValidator.validateNumber(a, 'a');
        const numberB = InputValidator.validateNumber(b, 'b');

        const result = CalculatorService.calculate(validatedOperator, numberA, numberB);

        res.status(200).json({
            operator: validatedOperator,
            a: numberA,
            b: numberB,
            result
        });
    } catch (error) {
        next(error);
    }
});
/**
 * Root-Endpoint mit kurzer API-Übersicht.
 * GET /
 */
app.get('/', (req, res) => {
    res.status(200).json({
        service: 'Taschenrechner-Server',
        endpoints: {
            health: 'GET /health',
            calculate: 'POST /calculate  { "operator": "add", "a": 2, "b": 3 }',
            shortcuts: 'GET /add|subtract|multiply|divide?a=2&b=3'
        }
    });
});
/**
 * 404-Handler für nicht existierende Routen.
 */
app.use((req, res) => {
    res.status(404).json({ error: 'Route nicht gefunden.' });
});

/**
 * Zentrales Error-Handling-Middleware.
 * Analog zu @ExceptionHandler / @ControllerAdvice in Java/Spring.
 */
app.use((error, req, res, next) => {
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Interner Serverfehler.' : error.message;
    res.status(statusCode).json({ error: message });
});

/**
 * Startet den Server.
 * Wird beim Container-Start (Docker/CI-CD) direkt ausgeführt.
 */
app.listen(PORT, () => {
    console.log(`Taschenrechner-Server läuft auf Port ${PORT}`);
});

module.exports = app;