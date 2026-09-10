/**
 * server.js
 *
 * Taschenrechner-Server (Calculator Server) mit grafischer Oberfläche
 *
 * Implementiert nach Java-ähnlichen Konventionen:
 *  - Klassenbasierte Kapselung der Geschäftslogik (CalculatorService)
 *  - Strenge Eingabevalidierung (Guard Clauses)
 *  - Zentrales Error-Handling (Middleware, vergleichbar mit @ExceptionHandler)
 *  - Konstanten in UPPER_CASE, explizite JSDoc-Typannotationen
 *
 * Laufzeit: Node.js + Express
 * Deployment: Docker / CI-CD Pipeline
 *
 * GET  /            -> GUI (HTML) mit Buttons und Ergebnis-Feld
 * GET  /health      -> Health-Check für Docker
 * POST /calculate   -> Berechnungs-API (JSON)
 * GET  /:operator   -> Berechnungs-API Shortcut (JSON, Query-Params a, b)
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
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    static add(a, b) {
        return a + b;
    }

    /**
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    static subtract(a, b) {
        return a - b;
    }

    /**
     * @param {number} a
     * @param {number} b
     * @returns {number}
     */
    static multiply(a, b) {
        return a * b;
    }

    /**
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
 * View-Layer: HTML/CSS/JS für die GUI als einzelner String.
 * (In Java wäre dies z. B. eine Thymeleaf-Template-Datei; hier aus
 * Gründen der Single-File-Vorgabe direkt im Server eingebettet.)
 * --------------------------------------------------------------------- */

const CALCULATOR_HTML_PAGE = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Taschenrechner</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    background: #2b2b2b;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    margin: 0;
  }
  .calculator {
    background: #1e1e1e;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.5);
    width: 300px;
  }
  #result-field {
    width: 100%;
    height: 60px;
    background: #000;
    color: #fff;
    font-size: 28px;
    text-align: right;
    border: none;
    border-radius: 8px;
    padding: 10px 15px;
    margin-bottom: 12px;
    box-sizing: border-box;
    overflow-x: auto;
    white-space: nowrap;
  }
  .buttons {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  button {
    padding: 18px 0;
    font-size: 18px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    background: #3a3a3a;
    color: #fff;
    transition: background 0.15s ease;
  }
  button:hover { background: #4a4a4a; }
  button.operator { background: #ff9500; }
  button.operator:hover { background: #ffab33; }
  button.equals { background: #34c759; grid-column: span 2; }
  button.equals:hover { background: #4fd873; }
  button.clear { background: #d84343; }
  button.clear:hover { background: #e85c5c; }
  #error-message {
    color: #ff6b6b;
    font-size: 13px;
    min-height: 16px;
    text-align: right;
    margin-bottom: 6px;
  }
</style>
</head>
<body>
  <div class="calculator">
    <div id="error-message"></div>
    <input id="result-field" type="text" value="0" readonly>
    <div class="buttons">
      <button class="clear" onclick="Calculator.clear()">C</button>
      <button onclick="Calculator.backspace()">⌫</button>
      <button class="operator" onclick="Calculator.setOperator('divide')">÷</button>
      <button class="operator" onclick="Calculator.setOperator('multiply')">×</button>

      <button onclick="Calculator.appendDigit('7')">7</button>
      <button onclick="Calculator.appendDigit('8')">8</button>
      <button onclick="Calculator.appendDigit('9')">9</button>
      <button class="operator" onclick="Calculator.setOperator('subtract')">−</button>

      <button onclick="Calculator.appendDigit('4')">4</button>
      <button onclick="Calculator.appendDigit('5')">5</button>
      <button onclick="Calculator.appendDigit('6')">6</button>
      <button class="operator" onclick="Calculator.setOperator('add')">+</button>

      <button onclick="Calculator.appendDigit('1')">1</button>
      <button onclick="Calculator.appendDigit('2')">2</button>
      <button onclick="Calculator.appendDigit('3')">3</button>
      <button onclick="Calculator.appendDigit('0')" style="grid-row: span 2;">0</button>

      <button onclick="Calculator.appendDigit('.')">.</button>
      <button class="equals" onclick="Calculator.evaluate()">=</button>
    </div>
  </div>

<script>
  /**
   * Calculator (Frontend-Controller)
   *
   * Kapselt den GUI-State und kommuniziert mit dem Backend
   * über den /calculate Endpoint. Aufbau angelehnt an eine
   * Java-Controller-Klasse mit gekapseltem State.
   */
  const Calculator = (() => {
      let currentValue = '0';
      let pendingOperand = null;
      let pendingOperator = null;

      const resultField = document.getElementById('result-field');
      const errorMessage = document.getElementById('error-message');

      function render() {
          resultField.value = currentValue;
      }

      function showError(message) {
          errorMessage.textContent = message;
      }

      function clearError() {
          errorMessage.textContent = '';
      }

      function appendDigit(digit) {
          clearError();
          if (digit === '.' && currentValue.includes('.')) {
              return;
          }
          currentValue = currentValue === '0' && digit !== '.' ? digit : currentValue + digit;
          render();
      }

      function backspace() {
          clearError();
          currentValue = currentValue.length > 1 ? currentValue.slice(0, -1) : '0';
          render();
      }

      function clear() {
          clearError();
          currentValue = '0';
          pendingOperand = null;
          pendingOperator = null;
          render();
      }

      function setOperator(operator) {
          clearError();
          pendingOperand = parseFloat(currentValue);
          pendingOperator = operator;
          currentValue = '0';
      }

      async function evaluate() {
          if (pendingOperator === null || pendingOperand === null) {
              return;
          }
          const secondOperand = parseFloat(currentValue);

          try {
              const response = await fetch('/calculate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      operator: pendingOperator,
                      a: pendingOperand,
                      b: secondOperand
                  })
              });

              const data = await response.json();

              if (!response.ok) {
                  throw new Error(data.error || 'Unbekannter Fehler.');
              }

              currentValue = String(data.result);
              pendingOperand = null;
              pendingOperator = null;
              render();
          } catch (error) {
              showError(error.message);
          }
      }

      return { appendDigit, backspace, clear, setOperator, evaluate };
  })();
</script>
</body>
</html>`;

/* -----------------------------------------------------------------------
 * Express-Anwendung / Controller-Layer (analog zu @RestController in Java)
 * --------------------------------------------------------------------- */

const app = express();
app.use(express.json());

/**
 * GUI-Endpoint: liefert die HTML-Oberfläche des Taschenrechners aus.
 * GET /
 */
app.get('/', (req, res) => {
    res.status(200).type('html').send(CALCULATOR_HTML_PAGE);
});

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
 * Bequemlichkeits-Endpoint via GET, z. B. /add?a=2&b=3
 * Analog zu zusätzlichen @GetMapping-Routen in Java.
 */
app.get('/:operator(add|subtract|multiply|divide)', (req, res, next) => {
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