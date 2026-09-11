'use strict';

const express = require('express');

/** @constant {number} DEFAULT_PORT - Standard-Port für das Frontend */
const DEFAULT_PORT = 3000;
const PORT = process.env.PORT || DEFAULT_PORT;

// Die URL zum Backend: Im Docker-Netzwerk greifen wir direkt auf den Service-Namen "backend" zu.
// Lokal ohne Docker fällt es auf localhost:5000 zurück.
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

/* -----------------------------------------------------------------------
 * View-Layer: HTML/CSS/JS für die GUI des Taschenrechners
 * --------------------------------------------------------------------- */

const CALCULATOR_HTML_PAGE = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Taschenrechner (Frontend-Backend Architektur)</title>
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
  <h1 id="app-title">Taschenrechner (Frontend)</h1>

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
              // WICHTIG: Das Frontend schickt den API-Request an den Backend-Endpunkt
              const response = await fetch('/api/calculate', {
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
 * Express Server Setup für das Frontend
 * --------------------------------------------------------------------- */

const app = express();
app.use(express.json());

// 1. Liefert die HTML-Oberfläche an den Browser aus
app.get('/', (req, res) => {
    res.status(200).type('html').send(CALCULATOR_HTML_PAGE);
});

// 2. Server-to-Server Proxy/Weiterleitung: 
// Nimmt den Request vom Browser entgegen und leitet ihn intern an das Backend im Docker-Netzwerk weiter
app.post('/api/calculate', async (req, res) => {
    try {
        const backendResponse = await fetch(`${BACKEND_URL}/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const data = await backendResponse.json();
        
        if (!backendResponse.ok) {
            return res.status(backendResponse.status).json(data);
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Fehler bei der Kommunikation mit dem Backend:', error.message);
        res.status(500).json({ error: 'Verbindung zum Backend fehlgeschlagen.' });
    }
});

app.listen(PORT, () => {
    console.log(`Frontend-Server läuft auf Port ${PORT} und verbindet sich mit Backend unter ${BACKEND_URL}`);
});