"use strict";

const express = require("express");
const { execFile } = require("child_process");
const session = require("express-session");
const app = express();
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcrypt");
const supabaseUrl = "https://qnfsciegunavcmpfwmrp.supabase.co";
const supabaseKey = "sb_publishable_o8cJr1JPEHCY9IljEMt4vg_aBniO419";

const supabase = createClient(supabaseUrl, supabaseKey);
app.use(
  session({
    secret: "twoj-tajny-klucz-sesji",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  }),
);

let stan_gry = {
  talia: "",
  karty_gracza: [],
  karty_krupiera: [],
  punkty_gracza: 0,
  punkty_krupiera: 0,
  pesel: "",
  bet: 0,
};

function przeliczPunkty(karty) {
  let punkty = 0;
  let asy = 0;
  for (const karta of karty) {
    const wartosc = karta[0];
    if (wartosc === "A") {
      punkty += 11;
      asy++;
    } else if (["J", "Q", "K"].includes(wartosc)) {
      punkty += 10;
    } else {
      punkty += parseInt(wartosc);
    }
  }
  while (punkty > 21 && asy > 0) {
    punkty -= 10;
    asy--;
  }
  return punkty;
}

// Wspólne style CSS
const commonStyles = `
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      color: #333;
    }
    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
      max-width: 800px;
      width: 100%;
      margin: 20px auto;
    }
    h1 {
      color: #667eea;
      text-align: center;
      margin-bottom: 30px;
      font-size: 2.5em;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
    }
    h2 {
      color: #764ba2;
      margin-bottom: 20px;
    }
    h3 {
      color: #667eea;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    .btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 15px 30px;
      font-size: 18px;
      font-weight: bold;
      border-radius: 50px;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      transition: all 0.3s ease;
      margin: 10px;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    }
    .btn:active {
      transform: translateY(0);
    }
    .btn:disabled {
      background: #ccc;
      cursor: not-allowed;
      box-shadow: none;
    }
    .btn-secondary {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
    }
    .btn-secondary:hover {
      box-shadow: 0 6px 20px rgba(245, 87, 108, 0.6);
    }
    .btn-success {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      box-shadow: 0 4px 15px rgba(79, 172, 254, 0.4);
    }
    .btn-success:hover {
      box-shadow: 0 6px 20px rgba(79, 172, 254, 0.6);
    }
    .btn-danger {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
      box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
    }
    .btn-danger:hover {
      box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6);
    }
    input[type="text"],
    input[type="number"],
    input[type="password"] {
      width: 100%;
      padding: 15px;
      margin: 10px 0;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      font-size: 16px;
      transition: border 0.3s ease;
    }
    input:focus {
      outline: none;
      border-color: #667eea;
    }
    .info-box {
      background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
      padding: 20px;
      border-radius: 15px;
      margin: 20px 0;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    .error {
      color: #f5576c;
      background: #ffe0e6;
      padding: 15px;
      border-radius: 10px;
      margin: 10px 0;
      border-left: 4px solid #f5576c;
    }
    .success {
      color: #00b894;
      background: #d5f4e6;
      padding: 15px;
      border-radius: 10px;
      margin: 10px 0;
      border-left: 4px solid #00b894;
    }
    .warning {
      color: #ff6b6b;
      background: #ffe0e0;
      padding: 15px;
      border-radius: 10px;
      margin: 10px 0;
      border-left: 4px solid #ff6b6b;
    }
    .button-group {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 15px;
      margin: 20px 0;
    }
    form {
      margin: 20px 0;
    }
    .account-section {
      background: #f8f9ff;
      padding: 20px;
      border-radius: 15px;
      margin: 20px 0;
    }
  </style>
`;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function requireLogin(req, res, next) {
  if (!req.session.pesel) {
    return res.redirect("/login");
  }
  next();
}

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kasyno - Strona Główna</title>
        ${commonStyles}
      </head>
      <body>
        <div class="container">
          <h1>🎰 Witaj w Kasynie Online 🎰</h1>
          <div class="info-box">
            <p style="text-align: center; font-size: 18px; color: #764ba2;">
              Zagraj w swoje ulubione gry kasynowe i wygraj wielkie nagrody!
            </p>
          </div>
          <div class="button-group">
            <button class="btn" onclick="location.href='/login'">🔐 Logowanie</button>
            <button class="btn btn-secondary" onclick="location.href='/rejestracja'">📝 Rejestracja</button>
          </div>
        </div>
      </body>
    </html>
  `);
});

app.get("/gry", requireLogin, (req, res) => {
  res.send(`
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Wybierz Grę</title>
        ${commonStyles}
      </head>
      <body>
        <div class="container">
          <h1>🎮 Wybierz Grę 🎮</h1>
          <div class="info-box">
            <p style="text-align: center; font-size: 18px; color: #764ba2;">
              Wybierz jedną z dostępnych gier i spróbuj szczęścia!
            </p>
          </div>
          <div class="button-group">
            <button class="btn" onclick="location.href='/black_jack'">🃏 Black Jack</button>
            <button class="btn btn-secondary" onclick="location.href='/slots'">🎰 Jednoręki Bandyta</button>
          </div>
          <div class="button-group">
            <button class="btn btn-success" onclick="location.href='/account'">👤 Moje Konto</button>
            <button class="btn btn-danger" onclick="location.href='/logout'">🚪 Wyloguj</button>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Strona konta użytkownika
app.get("/account", requireLogin, async (req, res) => {
  const { data: użytkownik, error } = await supabase
    .from("Użytkownicy")
    .select("Pesel, Saldo")
    .eq("Pesel", req.session.pesel)
    .single();

  if (error || !użytkownik) {
    return res.redirect("/logout");
  }

  res.send(`
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Moje Konto</title>
        ${commonStyles}
      </head>
      <body>
        <div class="container">
          <h1>👤 Moje Konto</h1>

          <div class="account-section">
            <h3>Informacje o koncie</h3>
            <p><strong>PESEL:</strong> ${użytkownik.Pesel}</p>
            <p><strong>Saldo:</strong> ${użytkownik.Saldo.toFixed(2)} PLN</p>
          </div>

          <div class="account-section">
            <h3>⚠️ Strefa niebezpieczna</h3>
            <div class="warning">
              <p><strong>Uwaga!</strong> Usunięcie konta jest nieodwracalne. Stracisz całe saldo i historię gier.</p>
            </div>
            <div class="button-group">
              <button class="btn btn-danger" onclick="confirmDelete()">🗑️ Usuń konto</button>
            </div>
          </div>

          <div class="button-group">
            <button class="btn" onclick="location.href='/gry'">Powrót do gier</button>
            <button class="btn btn-danger" onclick="location.href='/logout'">🚪 Wyloguj</button>
          </div>
        </div>

        <script>
          function confirmDelete() {
            const confirmation = confirm("Czy na pewno chcesz usunąć konto? Ta operacja jest nieodwracalna!");
            if (confirmation) {
              const doubleConfirm = confirm("Ostatnia szansa! Czy NA PEWNO chcesz usunąć konto i stracić całe saldo?");
              if (doubleConfirm) {
                window.location.href = '/delete-account';
              }
            }
          }
        </script>
      </body>
    </html>
  `);
});

// Wylogowanie
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Błąd wylogowania:", err);
    }
    res.redirect("/");
  });
});

// Usunięcie konta
app.get("/delete-account", requireLogin, async (req, res) => {
  const pesel = req.session.pesel;

  const { error } = await supabase
    .from("Użytkownicy")
    .delete()
    .eq("Pesel", pesel);

  if (error) {
    console.error("Błąd usuwania konta:", error);
    return res.send(`
      <html>
        <head>
          <meta charset="UTF-8">
          ${commonStyles}
        </head>
        <body>
          <div class="container">
            <h1>❌ Błąd</h1>
            <div class="error">
              Wystąpił błąd podczas usuwania konta. Spróbuj ponownie później.
            </div>
            <div class="button-group">
              <button class="btn" onclick="location.href='/account'">Powrót</button>
            </div>
          </div>
        </body>
      </html>
    `);
  }

  req.session.destroy((err) => {
    if (err) {
      console.error("Błąd niszczenia sesji:", err);
    }
    res.send(`
      <html>
        <head>
          <meta charset="UTF-8">
          ${commonStyles}
        </head>
        <body>
          <div class="container">
            <h1>✅ Konto usunięte</h1>
            <div class="success">
              Twoje konto zostało pomyślnie usunięte. Dziękujemy za wspólnie spędzony czas!
            </div>
            <div class="button-group">
              <button class="btn" onclick="location.href='/'">Strona główna</button>
            </div>
          </div>
        </body>
      </html>
    `);
  });
});

app.get("/black_jack", requireLogin, (req, res) => {
  res.send(`
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Black Jack</title>
        ${commonStyles}
        <style>
          .game-card {
            background: white;
            border: 3px solid #667eea;
            border-radius: 10px;
            padding: 10px;
            margin: 5px;
            min-width: 50px;
            text-align: center;
            font-size: 24px;
            display: inline-block;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .cards-container {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            margin: 10px 0;
          }
          .game-section {
            background: #f8f9ff;
            padding: 20px;
            border-radius: 15px;
            margin: 20px 0;
          }
          #result {
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            padding: 15px;
            border-radius: 10px;
          }
          .stat-box {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 15px;
            margin: 10px;
            font-size: 18px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🃏 Black Jack 🃏</h1>

          <div class="info-box">
            <p style="text-align: center; font-size: 20px;">
              <strong>Twoje saldo:</strong> <span id="saldo">Ładowanie...</span> PLN
            </p>
          </div>

          <div id="betSection" class="game-section">
            <h3 style="text-align: center;">Ustaw stawkę</h3>
            <div style="text-align: center;">
              <input type="number" id="betAmount" min="1" step="1" placeholder="Kwota zakładu" style="max-width: 300px;">
              <div class="button-group">
                <button class="btn" id="startBtn">Rozpocznij grę</button>
              </div>
            </div>
          </div>

          <div id="gameSection" style="display:none;">
            <div class="info-box">
              <p style="text-align: center; font-size: 18px;">
                <strong>Obstawiona kwota:</strong> <span id="currentBet">0</span> PLN
              </p>
            </div>

            <div class="game-section">
              <h3>🎴 Twoje karty</h3>
              <div class="cards-container">
                <div id="playerCardsDisplay"></div>
              </div>
              <div class="stat-box">
                Punkty: <span id="playerPoints">0</span>
              </div>
            </div>

            <div class="game-section">
              <h3>🎴 Karty krupiera</h3>
              <div class="cards-container">
                <div id="enemyCardsDisplay"></div>
              </div>
              <div class="stat-box">
                Punkty: <span id="enemyPoints">0</span>
              </div>
            </div>

            <div class="button-group">
              <button class="btn" id="drawBtn" disabled>Dobierz kartę</button>
              <button class="btn btn-secondary" id="standBtn" disabled>Pasuj</button>
            </div>
          </div>

          <div id="result"></div>

          <div class="button-group">
            <button class="btn btn-success" id="newGameBtn" style="display:none;">Nowa gra</button>
            <button class="btn btn-success" onclick="location.href='/gry'">Powrót do menu</button>
            <button class="btn btn-danger" onclick="location.href='/logout'">🚪 Wyloguj</button>
          </div>
        </div>

        <script>
          const saldoEl = document.getElementById("saldo");
          const betAmountInput = document.getElementById("betAmount");
          const startBtn = document.getElementById("startBtn");
          const betSection = document.getElementById("betSection");
          const gameSection = document.getElementById("gameSection");
          const currentBetEl = document.getElementById("currentBet");
          const playerPointsEl = document.getElementById("playerPoints");
          const enemyPointsEl = document.getElementById("enemyPoints");
          const playerCardsDisplay = document.getElementById("playerCardsDisplay");
          const enemyCardsDisplay = document.getElementById("enemyCardsDisplay");
          const drawBtn = document.getElementById("drawBtn");
          const standBtn = document.getElementById("standBtn");
          const newGameBtn = document.getElementById("newGameBtn");
          const resultEl = document.getElementById("result");

          function displayCards(cards, container) {
            container.innerHTML = cards.map(card => 
              \`<div class="game-card">\${card}</div>\`
            ).join('');
          }

          async function loadSaldo() {
            const res = await fetch("/get_saldo", { method: "POST" });
            const data = await res.json();

            if(data.error){
              alert(data.error);
              window.location.href = '/login';
              return;
            }

            saldoEl.innerText = data.saldo.toFixed(2);
            betAmountInput.max = data.saldo;
          }

          startBtn.onclick = async () => {
            const bet = parseFloat(betAmountInput.value);
            const maxBet = parseFloat(saldoEl.innerText);

            if(!bet || bet <= 0){
              alert("Podaj poprawną kwotę!");
              return;
            }

            if(bet > maxBet){
              alert("Nie masz wystarczającego salda!");
              return;
            }

            const res = await fetch("/start", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bet: bet })
            });
            const data = await res.json();

            if(data.error){
              alert(data.error);
              return;
            }

            playerPointsEl.innerText = data.playerPoints;
            enemyPointsEl.innerText = data.enemyPoints;
            displayCards(data.playerCards, playerCardsDisplay);
            displayCards(data.enemyCards, enemyCardsDisplay);
            currentBetEl.innerText = bet.toFixed(2);

            betSection.style.display = "none";
            gameSection.style.display = "block";
            drawBtn.disabled = false;
            standBtn.disabled = false;
            resultEl.innerText = "";
            resultEl.className = "";
          };

          drawBtn.onclick = async () => {
            const res = await fetch("/draw", { method: "POST" });
            const data = await res.json();

            if(data.error){
              alert(data.error);
              return;
            }

            playerPointsEl.innerText = data.playerPoints;
            enemyPointsEl.innerText = data.enemyPoints;
            displayCards(data.playerCards, playerCardsDisplay);
            displayCards(data.enemyCards, enemyCardsDisplay);

            if(data.gameOver){
              resultEl.innerText = data.message;
              resultEl.className = "error";
              saldoEl.innerText = data.newSaldo.toFixed(2);
              drawBtn.disabled = true;
              standBtn.disabled = true;
              newGameBtn.style.display = "inline-block";
            }
          };

          standBtn.onclick = async () => {
            const res = await fetch("/stand", { method: "POST" });
            const data = await res.json();

            playerPointsEl.innerText = data.playerPoints;
            enemyPointsEl.innerText = data.enemyPoints;
            displayCards(data.playerCards, playerCardsDisplay);
            displayCards(data.enemyCards, enemyCardsDisplay);
            resultEl.innerText = data.message;
            resultEl.className = data.message.includes("Wygra") ? "success" : "error";
            saldoEl.innerText = data.newSaldo.toFixed(2);

            drawBtn.disabled = true;
            standBtn.disabled = true;
            newGameBtn.style.display = "inline-block";
          };

          newGameBtn.onclick = () => {
            betSection.style.display = "block";
            gameSection.style.display = "none";
            newGameBtn.style.display = "none";
            resultEl.innerText = "";
            resultEl.className = "";
            betAmountInput.value = "";
            betAmountInput.max = saldoEl.innerText;
          };

          loadSaldo();
        </script>
      </body>
    </html>
  `);
});

// Pozostałe endpointy bez zmian...
app.post("/get_saldo", async (req, res) => {
  if (!req.session.pesel) {
    return res.status(401).json({ error: "Nie zalogowano" });
  }

  const { data: użytkownik, error } = await supabase
    .from("Użytkownicy")
    .select("Saldo")
    .eq("Pesel", req.session.pesel)
    .single();

  if (error || !użytkownik) {
    return res.status(400).json({ error: "Nie znaleziono użytkownika" });
  }

  res.json({ saldo: użytkownik.Saldo });
});

app.post("/start", async (req, res) => {
  if (!req.session.pesel) {
    return res.status(401).json({ error: "Nie zalogowano" });
  }

  const { bet } = req.body;
  const pesel = req.session.pesel;

  const { data: użytkownik, error } = await supabase
    .from("Użytkownicy")
    .select("Saldo")
    .eq("Pesel", pesel)
    .single();

  if (error || !użytkownik) {
    return res.status(400).json({ error: "Nie znaleziono użytkownika" });
  }

  if (użytkownik.Saldo < bet) {
    return res.status(400).json({ error: "Niewystarczające saldo" });
  }

  execFile("./talia", (error, stdout) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const talia = stdout
      .trim()
      .split("")
      .filter((k) => k.trim().length > 0);

    stan_gry.talia = talia;
    stan_gry.karty_gracza = [talia.pop(), talia.pop()];
    stan_gry.karty_krupiera = [talia.pop()];
    stan_gry.punkty_gracza = przeliczPunkty(stan_gry.karty_gracza);
    stan_gry.punkty_krupiera = przeliczPunkty(stan_gry.karty_krupiera);
    stan_gry.pesel = pesel;
    stan_gry.bet = bet;

    res.json({
      playerCards: stan_gry.karty_gracza,
      enemyCards: stan_gry.karty_krupiera,
      playerPoints: stan_gry.punkty_gracza,
      enemyPoints: stan_gry.punkty_krupiera,
    });
  });
});

app.post("/draw", async (req, res) => {
  if (!req.session.pesel) {
    return res.status(401).json({ error: "Nie zalogowano" });
  }

  if (stan_gry.talia.length === 0) {
    return res.json({ error: "Brak kart w talii!" });
  }

  stan_gry.karty_gracza.push(stan_gry.talia.pop());
  stan_gry.punkty_gracza = przeliczPunkty(stan_gry.karty_gracza);

  if (stan_gry.punkty_gracza > 21) {
    const { data: aktualnyUzytkownik, error: errorGet } = await supabase
      .from("Użytkownicy")
      .select("Saldo")
      .eq("Pesel", stan_gry.pesel)
      .single();

    if (errorGet) {
      return res.status(500).json({ error: "Błąd pobierania salda" });
    }

    const noweSaldo = aktualnyUzytkownik.Saldo - stan_gry.bet;

    const { data, error } = await supabase
      .from("Użytkownicy")
      .update({ Saldo: noweSaldo })
      .eq("Pesel", stan_gry.pesel)
      .select("Saldo")
      .single();

    if (error) {
      return res.status(500).json({ error: "Błąd aktualizacji salda" });
    }

    return res.json({
      playerCards: stan_gry.karty_gracza,
      enemyCards: stan_gry.karty_krupiera,
      playerPoints: stan_gry.punkty_gracza,
      enemyPoints: stan_gry.punkty_krupiera,
      gameOver: true,
      message: `Przegrałeś! Przekroczyłeś 21 punktów. Strata: ${stan_gry.bet} PLN`,
      newSaldo: data.Saldo,
    });
  }

  res.json({
    playerCards: stan_gry.karty_gracza,
    enemyCards: stan_gry.karty_krupiera,
    playerPoints: stan_gry.punkty_gracza,
    enemyPoints: stan_gry.punkty_krupiera,
    gameOver: false,
  });
});

app.post("/stand", async (req, res) => {
  if (!req.session.pesel) {
    return res.status(401).json({ error: "Nie zalogowano" });
  }

  while (stan_gry.punkty_krupiera < 17 && stan_gry.talia.length > 0) {
    stan_gry.karty_krupiera.push(stan_gry.talia.pop());
    stan_gry.punkty_krupiera = przeliczPunkty(stan_gry.karty_krupiera);
  }

  let message = "";
  let saldoChange = 0;

  if (stan_gry.punkty_krupiera > 21) {
    message = `Wygrałeś! Krupier przekroczył 21 punktów. Wygrana: ${stan_gry.bet} PLN`;
    saldoChange = stan_gry.bet;
  } else if (stan_gry.punkty_gracza > stan_gry.punkty_krupiera) {
    message = `Wygrałeś! Wygrana: ${stan_gry.bet} PLN`;
    saldoChange = stan_gry.bet;
  } else if (stan_gry.punkty_gracza < stan_gry.punkty_krupiera) {
    message = `Przegrałeś! Strata: ${stan_gry.bet} PLN`;
    saldoChange = -stan_gry.bet;
  } else {
    message = "Remis! Zwrot stawki.";
    saldoChange = 0;
  }

  const { data: aktualnyUzytkownik, error: errorGet } = await supabase
    .from("Użytkownicy")
    .select("Saldo")
    .eq("Pesel", stan_gry.pesel)
    .single();

  if (errorGet) {
    return res.status(500).json({ error: "Błąd pobierania salda" });
  }

  const noweSaldo = aktualnyUzytkownik.Saldo + saldoChange;

  const { data, error } = await supabase
    .from("Użytkownicy")
    .update({ Saldo: noweSaldo })
    .eq("Pesel", stan_gry.pesel)
    .select("Saldo")
    .single();

  if (error) {
    return res.status(500).json({ error: "Błąd aktualizacji salda" });
  }

  res.json({
    playerCards: stan_gry.karty_gracza,
    enemyCards: stan_gry.karty_krupiera,
    playerPoints: stan_gry.punkty_gracza,
    enemyPoints: stan_gry.punkty_krupiera,
    message: message,
    newSaldo: data.Saldo,
  });
});

app
  .route("/login")
  .get((req, res) => {
    res.send(`
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Logowanie</title>
          ${commonStyles}
        </head>
        <body>
          <div class="container">
            <h1>🔐 Logowanie</h1>
            <form method="POST">
              <input type="text" name="tekst" placeholder="Podaj numer PESEL" required>
              <input type="password" name="tekst2" placeholder="Podaj hasło" required>
              <div class="button-group">
                <button type="submit" class="btn">Zaloguj się</button>
              </div>
            </form>
            <div class="button-group">
              <button class="btn btn-secondary" onclick="location.href='/'">Powrót do strony głównej</button>
            </div>
          </div>
        </body>
      </html>
    `);
  })
  .post(async (req, res) => {
    const tekst = String(req.body.tekst);
    const tekst2 = String(req.body.tekst2);
    const DLUGOSC = 11;

    if (tekst.length !== DLUGOSC) {
      return res.status(400).send(`
        <html>
          <head>
            <meta charset="UTF-8">
            ${commonStyles}
          </head>
          <body>
            <div class="container">
              <h1>🔐 Logowanie</h1>
              <div class="error">Błąd: niepoprawny numer PESEL</div>
              <form method="POST">
                <input type="text" name="tekst" placeholder="Podaj numer PESEL" value="${tekst}" required>
                <input type="password" name="tekst2" placeholder="Podaj hasło" required>
                <div class="button-group">
                  <button type="submit" class="btn">Zaloguj się</button>
                </div>
              </form>
              <div class="button-group">
                <button class="btn btn-secondary" onclick="location.href='/'">Powrót do strony głównej</button>
              </div>
            </div>
          </body>
        </html>
      `);
    }

    const { data: użytkownik, error } = await supabase
      .from("Użytkownicy")
      .select("*")
      .eq("Pesel", tekst)
      .maybeSingle();

    if (!użytkownik) {
      return res.status(400).send(`
        <html>
          <head>
            <meta charset="UTF-8">
            ${commonStyles}
          </head>
          <body>
            <div class="container">
              <h1>🔐 Logowanie</h1>
              <div class="error">PESEL nie istnieje w bazie danych</div>
              <form method="POST">
                <input type="text" name="tekst" placeholder="Podaj numer PESEL" value="${tekst}" required>
                <input type="password" name="tekst2" placeholder="Podaj hasło" required>
                <div class="button-group">
                  <button type="submit" class="btn">Zaloguj się</button>
                </div>
              </form>
              <div class="button-group">
                <button class="btn btn-secondary" onclick="location.href='/'">Powrót do strony głównej</button>
              </div>
            </div>
          </body>
        </html>
      `);
    }

    const poprawność = await bcrypt.compare(tekst2, użytkownik.hasło);

    if (!poprawność) {
      return res.status(400).send(`
        <html>
          <head>
            <meta charset="UTF-8">
            ${commonStyles}
          </head>
          <body>
            <div class="container">
              <h1>🔐 Logowanie</h1>
              <div class="error">Błędne hasło</div>
              <form method="POST">
                <input type="text" name="tekst" placeholder="Podaj numer PESEL" value="${tekst}" required>
                <input type="password" name="tekst2" placeholder="Podaj hasło" required>
                <div class="button-group">
                  <button type="submit" class="btn">Zaloguj się</button>
                </div>
              </form>
              <div class="button-group">
                <button class="btn btn-secondary" onclick="location.href='/'">Powrót do strony głównej</button>
              </div>
            </div>
          </body>
        </html>
      `);
    }

    req.session.pesel = tekst;
    req.session.admin = użytkownik.admin;

    if (użytkownik.admin == 1) {
      return res.redirect("/admin");
    } else {
      return res.redirect("/gry");
    }
  });

app
  .route("/rejestracja")
  .get((req, res) => {
    res.send(`
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Rejestracja</title>
          ${commonStyles}
        </head>
        <body>
          <div class="container">
            <h1>📝 Rejestracja</h1>
            <form method="POST">
              <input type="text" name="tekst" placeholder="Podaj numer PESEL" required>
              <input type="password" name="haslo" placeholder="Podaj hasło" required>
              <input type="password" name="haslo2" placeholder="Powtórz hasło" required>
              <div class="button-group">
                <button type="submit" class="btn">Zarejestruj się</button>
              </div>
            </form>
            <div class="button-group">
              <button class="btn btn-secondary" onclick="location.href='/'">Powrót do strony głównej</button>
            </div>
          </div>
        </body>
      </html>
    `);
  })
  .post(async (req, res) => {
    const tekst = String(req.body.tekst);
    const haslo = String(req.body.haslo);
    const haslo2 = String(req.body.haslo2);
    const DLUGOSC = 11;

    if (tekst.length !== DLUGOSC) {
      return res.status(400).send(`
        <html>
          <head>
            <meta charset="UTF-8">
            ${commonStyles}
          </head>
          <body>
            <div class="container">
              <h1>📝 Rejestracja</h1>
              <div class="error">Błąd: niepoprawny numer PESEL</div>
              <form method="POST">
                <input type="text" name="tekst" placeholder="Podaj numer PESEL" value="${tekst}" required>
                <input type="password" name="haslo" placeholder="Podaj hasło" required>
                <input type="password" name="haslo2" placeholder="Powtórz hasło" required>
                <div class="button-group">
                  <button type="submit" class="btn">Zarejestruj się</button>
                </div>
              </form>
              <div class="button-group">
                <button class="btn btn-secondary" onclick="location.href='/'">Powrót do strony głównej</button>
              </div>
            </div>
          </body>
        </html>
      `);
    }

    execFile("./program", [tekst], async (error, stdout, stderr) => {
      const wynik = stdout.trim();

      if (wynik === "0") {
        if (haslo === haslo2) {
          const hashedPassword = await bcrypt.hash(haslo, 10);

          const { error } = await supabase
            .from("Użytkownicy")
            .insert([{ Pesel: tekst, hasło: hashedPassword }]);

          if (error) {
            console.error(error);
            return res.status(500).send(`
              <html>
                <head>
                  <meta charset="UTF-8">
                  ${commonStyles}
                </head>
                <body>
                  <div class="container">
                    <h1>📝 Rejestracja</h1>
                    <div class="error">Błąd bazy danych</div>
                    <div class="button-group">
                      <button class="btn" onclick="location.href='/rejestracja'">Spróbuj ponownie</button>
                      <button class="btn btn-secondary" onclick="location.href='/'">Powrót</button>
                    </div>
                  </div>
                </body>
              </html>
            `);
          }

          res.send(`
            <html>
              <head>
                <meta charset="UTF-8">
                ${commonStyles}
              </head>
              <body>
                <div class="container">
                  <h1>📝 Rejestracja</h1>
                  <div class="success">✅ Rejestracja zakończona sukcesem!</div>
                  <div class="button-group">
                    <button class="btn" onclick="location.href='/login'">Przejdź do logowania</button>
                    <button class="btn btn-secondary" onclick="location.href='/'">Strona główna</button>
                  </div>
                </div>
              </body>
            </html>
          `);
        } else {
          res.status(400).send(`
            <html>
              <head>
                <meta charset="UTF-8">
                ${commonStyles}
              </head>
              <body>
                <div class="container">
                  <h1>📝 Rejestracja</h1>
                  <div class="error">Hasła nie są takie same</div>
                  <form method="POST">
                    <input type="text" name="tekst" placeholder="Podaj numer PESEL" value="${tekst}" required>
                    <input type="password" name="haslo" placeholder="Podaj hasło" required>
                    <input type="password" name="haslo2" placeholder="Powtórz hasło" required>
                    <div class="button-group">
                      <button type="submit" class="btn">Zarejestruj się</button>
                    </div>
                  </form>
                  <div class="button-group">
                    <button class="btn btn-secondary" onclick="location.href='/'">Powrót do strony głównej</button>
                  </div>
                </div>
              </body>
            </html>
          `);
        }
      } else if (wynik === "1") {
        res.status(400).send(`
          <html>
            <head>
              <meta charset="UTF-8">
              ${commonStyles}
            </head>
            <body>
              <div class="container">
                <h1>📝 Rejestracja</h1>
                <div class="error">Błędny numer PESEL</div>
                <form method="POST">
                  <input type="text" name="tekst" placeholder="Podaj numer PESEL" value="${tekst}" required>
                  <input type="password" name="haslo" placeholder="Podaj hasło" required>
                  <input type="password" name="haslo2" placeholder="Powtórz hasło" required>
                  <div class="button-group">
                    <button type="submit" class="btn">Zarejestruj się</button>
                  </div>
                </form>
                <div class="button-group">
                  <button class="btn btn-secondary" onclick="location.href='/'">Powrót do strony głównej</button>
                </div>
              </div>
            </body>
          </html>
        `);
      }
    });
  });

app.get("/slots", requireLogin, (req, res) => {
  res.send(`
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Jednoręki Bandyta</title>
        ${commonStyles}
        <style>
          .slot-machine {
            background: linear-gradient(135deg, #FFD700, #FFA500);
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            margin: 20px auto;
            max-width: 500px;
          }
          .slots-container {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin: 20px 0;
          }
          .slot {
            width: 100px;
            height: 100px;
            background: white;
            border: 3px solid #764ba2;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 60px;
            box-shadow: inset 0 0 10px rgba(0,0,0,0.2);
          }
          .spinning {
            animation: spin 0.1s linear infinite;
          }
          @keyframes spin {
            0% { transform: translateY(0); }
            100% { transform: translateY(-20px); }
          }
          #spinBtn {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            border: none;
            padding: 20px 40px;
            font-size: 24px;
            font-weight: bold;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 5px 15px rgba(245, 87, 108, 0.4);
            margin: 20px;
          }
          #spinBtn:hover:not(:disabled) {
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(245, 87, 108, 0.6);
          }
          #spinBtn:disabled {
            background: #ccc;
            cursor: not-allowed;
            box-shadow: none;
          }
          #result {
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            padding: 15px;
            border-radius: 10px;
            min-height: 30px;
          }
          .win {
            background: #d5f4e6;
            color: #00b894;
            border-left: 4px solid #00b894;
          }
          .lose {
            background: #ffe0e6;
            color: #f5576c;
            border-left: 4px solid #f5576c;
          }
          .payout-table {
            background: #f8f9ff;
            padding: 20px;
            border-radius: 15px;
            margin: 20px 0;
          }
          .payout-table div {
            padding: 8px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 16px;
          }
          .payout-table div:last-child {
            border-bottom: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎰 Jednoręki Bandyta 🎰</h1>

          <div class="info-box">
            <p style="text-align: center; font-size: 20px;">
              <strong>Twoje saldo:</strong> <span id="saldo">Ładowanie...</span> PLN
            </p>
            <div style="text-align: center; margin-top: 15px;">
              <label style="font-size: 18px; font-weight: bold;">Stawka:</label><br>
              <input type="number" id="betAmount" min="1" step="1" value="10" style="max-width: 200px; margin-top: 10px;">
            </div>
          </div>

          <div class="slot-machine">
            <div class="slots-container">
              <div class="slot" id="slot1">🍒</div>
              <div class="slot" id="slot2">🍋</div>
              <div class="slot" id="slot3">🍊</div>
            </div>
            <div style="text-align: center;">
              <button id="spinBtn">SPIN</button>
            </div>
          </div>

          <div id="result"></div>

          <div class="payout-table">
            <h3 style="text-align: center;">Tabela wypłat</h3>
            <div>7️⃣ 7️⃣ 7️⃣ = x50 stawki (MEGA JACKPOT!)</div>
            <div>⭐ ⭐ ⭐ = x20 stawki (JACKPOT!)</div>
            <div>🍒 🍒 🍒 = x10 stawki</div>
            <div>🍋 🍋 🍋 = x8 stawki</div>
            <div>🍊 🍊 🍊 = x6 stawki</div>
            <div>🍉 🍉 🍉 = x5 stawki</div>
            <div>🍇 🍇 🍇 = x4 stawki</div>
            <div>Dwa takie same = x2 stawki</div>
          </div>

          <div class="button-group">
            <button class="btn btn-success" onclick="location.href='/gry'">Powrót do menu</button>
            <button class="btn btn-danger" onclick="location.href='/logout'">🚪 Wyloguj</button>
          </div>
        </div>

        <script>
          const saldoEl = document.getElementById("saldo");
          const betAmountInput = document.getElementById("betAmount");
          const spinBtn = document.getElementById("spinBtn");
          const resultEl = document.getElementById("result");
          const slot1 = document.getElementById("slot1");
          const slot2 = document.getElementById("slot2");
          const slot3 = document.getElementById("slot3");

          const symbols = ['🍒', '🍋', '🍊', '🍉', '🍇', '⭐', '7️⃣'];
          let isSpinning = false;

          async function loadSaldo() {
            const res = await fetch("/get_saldo", { method: "POST" });
            const data = await res.json();

            if(data.error){
              alert(data.error);
              window.location.href = '/login';
              return;
            }

            saldoEl.innerText = data.saldo.toFixed(2);
            betAmountInput.max = data.saldo;
          }

          function animateSlot(slotEl, duration) {
            return new Promise(resolve => {
              slotEl.classList.add('spinning');
              const interval = setInterval(() => {
                slotEl.textContent = symbols[Math.floor(Math.random() * symbols.length)];
              }, 100);

              setTimeout(() => {
                clearInterval(interval);
                slotEl.classList.remove('spinning');
                resolve();
              }, duration);
            });
          }

          spinBtn.onclick = async () => {
            if(isSpinning) return;

            const bet = parseFloat(betAmountInput.value);
            const maxBet = parseFloat(saldoEl.innerText);

            if(!bet || bet <= 0){
              alert("Podaj poprawną stawkę!");
              return;
            }

            if(bet > maxBet){
              alert("Nie masz wystarczającego salda!");
              return;
            }

            isSpinning = true;
            spinBtn.disabled = true;
            resultEl.textContent = "";
            resultEl.className = "";

            await Promise.all([
              animateSlot(slot1, 1000),
              animateSlot(slot2, 1500),
              animateSlot(slot3, 2000)
            ]);

            const res = await fetch("/spin_slots", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bet: bet })
            });

            const data = await res.json();

            if(data.error){
              alert(data.error);
              isSpinning = false;
              spinBtn.disabled = false;
              return;
            }

            slot1.textContent = data.results[0];
            slot2.textContent = data.results[1];
            slot3.textContent = data.results[2];

            resultEl.textContent = data.message;
            resultEl.className = data.win ? 'win' : 'lose';

            saldoEl.textContent = data.newSaldo.toFixed(2);
            betAmountInput.max = data.newSaldo;

            isSpinning = false;
            spinBtn.disabled = false;
          };

          loadSaldo();
        </script>
      </body>
    </html>
  `);
});

app.post("/spin_slots", async (req, res) => {
  if (!req.session.pesel) {
    return res.status(401).json({ error: "Nie zalogowano" });
  }

  const { bet } = req.body;
  const pesel = req.session.pesel;

  const { data: użytkownik, error: errorGet } = await supabase
    .from("Użytkownicy")
    .select("Saldo")
    .eq("Pesel", pesel)
    .single();

  if (errorGet || !użytkownik) {
    return res.status(400).json({ error: "Nie znaleziono użytkownika" });
  }

  if (użytkownik.Saldo < bet) {
    return res.status(400).json({ error: "Niewystarczające saldo" });
  }

  const symbols = ["🍒", "🍋", "🍊", "🍉", "🍇", "⭐", "7️⃣"];
  const results = [
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  let multiplier = 0;
  let message = "";
  let win = false;

  if (results[0] === results[1] && results[1] === results[2]) {
    win = true;
    switch (results[0]) {
      case "7️⃣":
        multiplier = 50;
        message = `🎉 MEGA JACKPOT! 🎉 Wygrałeś ${(bet * multiplier).toFixed(2)} PLN!`;
        break;
      case "⭐":
        multiplier = 20;
        message = `⭐ JACKPOT! ⭐ Wygrałeś ${(bet * multiplier).toFixed(2)} PLN!`;
        break;
      case "🍒":
        multiplier = 10;
        message = `Świetnie! Wygrałeś ${(bet * multiplier).toFixed(2)} PLN!`;
        break;
      case "🍋":
        multiplier = 8;
        message = `Bardzo dobrze! Wygrałeś ${(bet * multiplier).toFixed(2)} PLN!`;
        break;
      case "🍊":
        multiplier = 6;
        message = `Dobrze! Wygrałeś ${(bet * multiplier).toFixed(2)} PLN!`;
        break;
      case "🍉":
        multiplier = 5;
        message = `Nieźle! Wygrałeś ${(bet * multiplier).toFixed(2)} PLN!`;
        break;
      case "🍇":
        multiplier = 4;
        message = `Wygrałeś ${(bet * multiplier).toFixed(2)} PLN!`;
        break;
    }
  } else if (
    results[0] === results[1] ||
    results[1] === results[2] ||
    results[0] === results[2]
  ) {
    win = true;
    multiplier = 2;
    message = `Dwa takie same! Wygrałeś ${(bet * multiplier).toFixed(2)} PLN!`;
  } else {
    win = false;
    multiplier = -1;
    message = `Przegrałeś ${bet.toFixed(2)} PLN. Spróbuj ponownie!`;
  }

  const saldoChange = win ? bet * multiplier - bet : -bet;
  const noweSaldo = użytkownik.Saldo + saldoChange;

  const { data: updatedUser, error: errorUpdate } = await supabase
    .from("Użytkownicy")
    .update({ Saldo: noweSaldo })
    .eq("Pesel", pesel)
    .select("Saldo")
    .single();

  if (errorUpdate) {
    return res.status(500).json({ error: "Błąd aktualizacji salda" });
  }

  res.json({
    results: results,
    win: win,
    message: message,
    newSaldo: updatedUser.Saldo,
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});