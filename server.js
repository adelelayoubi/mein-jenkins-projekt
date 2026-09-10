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
 * GET  /            -> GUI (HTML) mit Überschrift, Buttons, Ergebnis-Feld,
 *                       Größenänderung per Maus und letzter Berechnung
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
  html, body {
    height: 100%;
    margin: 0;
  }
  body {
    font-family: Arial, Helvetica, sans-serif;
    background: #2b2b2b;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 16px;
  }
  h1#app-title {
    color: #fff;
    font-size: 24px;
    margin: 0;
    letter-spacing: 1px;
  }
  /* Resizable Wrapper: per Maus an der unteren rechten Ecke ziehen */
  .calculator {
    position: relative;
    background: #1e1e1e;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.5);
    width: 320px;
    height: 480px;
    min-width: 260px;
    min-height: 400px;
    max-width: 700px;
    max-height: 900px;
    resize: both;
    overflow: auto;
    display: flex;
    flex-direction: column;
  }
  .expression-line {
    color: #9a9a9a;
    font-size: calc(0.9em);
    text-align: right;
    min-height: 18px;
    padding: 0 4px;
    overflow-x: auto;
    white-space: nowrap;
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
    flex-shrink: 0;
  }
  .buttons {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(5, 1fr);
    gap: 10px;
  }
  button {
    padding: 0;
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
    margin-bottom: 4px;
  }
  #last-memory {
    color: #8f8f8f;
    font-size: 12px;
    text-align: center;
    min-height: 16px;
    width: 320px;
    max-width: 90vw;
  }
  #last-memory span {
    color: #cfcfcf;
    font-weight: bold;
  }
  .resize-hint {
    position: absolute;
    bottom: 4px;
    right: 6px;
    color: #555;
    font-size: 10px;
    pointer-events: none;
    user-select: none;
  }
</style>
</head>
<body>
  <h1 id="app-title">Taschenrechner</h1>

  <div class="calculator" id="calculator">
    <div id="error-message"></div>
    <div class="expression-line" id="expression-line">&nbsp;</div>
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
    <div class="resize-hint">⇲ ziehen zum Skalieren</div>
  </div>

  <div id="last-memory">Letzte Berechnung: <span id="last-memory-value">–</span></div>

<script>
  /**
   * Calculator (Frontend-Controller)
   *
   * Kapselt den GUI-State und kommuniziert mit dem Backend
   * über den /calculate Endpoint. Aufbau angelehnt an eine
   * Java-Controller-Klasse mit gekapseltem State.
   */
  const Calculator = (() => {
      const OPERATOR_SYMBOLS = {
          add: '+',
          subtract: '−',
          multiply: '×',
          divide: '÷'
      };

      let currentValue = '0';
      let pendingOperand = null;
      let pendingOperator = null;

      const resultField = document.getElementById('result-field');
      const errorMessage = document.getElementById('error-message');
      const expressionLine = document.getElementById('expression-line');
      const lastMemoryValue = document.getElementById('last-memory-value');

      function render() {
          resultField.value = currentValue;

          if (pendingOperator !== null) {
              expressionLine.textContent = pendingOperand + ' ' + OPERATOR_SYMBOLS[pendingOperator] + ' ' + currentValue;
          } else {
              expressionLine.innerHTML = '&nbsp;';
          }
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
          render();
      }

      async function evaluate() {
          if (pendingOperator === null || pendingOperand === null) {
              return;
          }
          const secondOperand = parseFloat(currentValue);
          const expressionText = pendingOperand + ' ' + OPERATOR_SYMBOLS[pendingOperator] + ' ' + secondOperand;

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

              lastMemoryValue.textContent = expressionText + ' = ' + data.result;

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

  /**
   * ResizeScaler
   *
   * Beobachtet die per Maus veränderte Größe des Taschenrechners
   * (CSS resize: both) und skaliert Schriftgrößen proportional mit,
   * damit Buttons und Anzeige beim Vergrößern/Verkleinern mitwachsen.
   */
  (function initResizeScaler() {
      const calculatorElement = document.getElementById('calculator');
      const resultField = document.getElementById('result-field');
      const buttons = calculatorElement.querySelectorAll('button');

      const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
              const width = entry.contentRect.width;
              resultField.style.fontSize = Math.max(16, width / 11) + 'px';
              buttons.forEach((button) => {
                  button.style.fontSize = Math.max(12, width / 18) + 'px';
              });
          }
      });

      resizeObserver.observe(calculatorElement);
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