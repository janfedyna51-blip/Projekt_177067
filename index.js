"use strict";

const express = require("express");
const { execFile } = require("child_process");
const app = express();
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcrypt");
const supabaseUrl = "https://qnfsciegunavcmpfwmrp.supabase.co";
const supabaseKey = "sb_publishable_o8cJr1JPEHCY9IljEMt4vg_aBniO419"; // użyj prawdziwego anon public key z Supabase!

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Supabase client utworzony poprawnie");

// opcjonalnie sprawdzenie statusu (np. fetchowanie wersji bazy)

console.log("Supabase client utworzony poprawnie");

// Prosty test - np. pobranie wersji klienta JS
console.log("Supabase JS SDK version:", supabase.libVersion);

app.use(express.urlencoded({ extended: true }));
app.get("/", (req, res) => {
  res.send(`
    <html>
      <body>
        <button onclick="location.href='/login'">Logowanie</button>
        <button onclick="location.href='/rejestracja'">Rejestracja</button>
      </body>
    </html>
  `);
});
app
  .route("/login")
  .get((req, res) => {
    res.send(`
      <form method="POST">
        <input type="text" name="tekst" placeholder="podaj numer Pesel">
        <input type="text" name="tekst2" placeholder="podaj hasło">
        <button type="submit">Wyślij</button> 
      </form>
       <button onclick="location.href='/'">Powrót do strony głównej</button>
    `);
  })
  .post(async (req, res) => {
    const tekst = String(req.body.tekst);
    const tekst2 = String(req.body.tekst2);
    const DLUGOSC = 11;

    if (tekst.length !== DLUGOSC) {
      return res.status(400).send(`Błąd: niepoprawny numer Pesel`);
    } else {
      const { data: użytkownik, error } = await supabase
        .from("Użytkownicy")
        .select("*")
        .eq("Pesel", tekst)
        .maybeSingle();
      console.log("Hasło z formularza (tekst2):", tekst2);
      console.log("Hash z bazy (user.hasło):", użytkownik.hasło);
      const poprawność = await bcrypt.compare(tekst2, użytkownik.hasło);
      if (!użytkownik) {
        res.status(400).send(`
        <form method="POST">
            <input type="text" name="tekst" placeholder="podaj numer Pesel" value="${tekst}">
            <input type="text" name="haslo" placeholder="podaj hasło" value="${tekst2}">
            <button type="submit">Wyślij</button>
          </form>
          <button onclick="location.href='/'">Powrót do strony głównej</button>
          <div style="color: red; margin-top: 10px;">"Pesel nie istnieje w bazie danych"</div>
        `);
      } else if (!poprawność) {
        res.status(400).send(`
        <form method="POST">
            <input type="text" name="tekst" placeholder="podaj numer Pesel" value="${tekst}">
            <input type="text" name="haslo" placeholder="podaj hasło" value="${tekst2}">
            <button type="submit">Wyślij</button>
          </form>
          <button onclick="location.href='/'">Powrót do strony głównej</button>
          <div style="color: red; margin-top: 10px;">"Błędne hasło"</div>
        `);
      } 
      else if (użytkownik.admin == 1)
      {
         return res.redirect('/admin');
        } else {
         return res.redirect('/gry');
      }
    }
  });

app
  .route("/rejestracja")
  .get((req, res) => {
    res.send(`
      <form method="POST">
        <input type="text" name="tekst" placeholder="podaj numer Pesel">
        <input type="text" name="haslo" placeholder="podaj hasło">
        <input type="text" name="haslo2" placeholder="powtórz hasło">
        <button type="submit">Wyślij</button>
      </form>
       <button onclick="location.href='/'">Powrót do strony głównej</button>
    `);
  })
  .post(async (req, res) => {
    const tekst = String(req.body.tekst);
    const haslo = String(req.body.haslo);
    const haslo2 = String(req.body.haslo2);
    const DLUGOSC = 11;

    if (tekst.length !== DLUGOSC) {
      return res.status(400).send(`Błąd: niepoprawny numer Pesel`);
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
            return res.status(500).send("Błąd bazy danych");
          }

          res.send(`
              <p>Rejestracja zakończona sukcesem</p>
              <button onclick="location.href='/'">Powrót</button>
            `);
        } else {
          res.status(400).send(`
          <form method="POST">
              <input type="text" name="tekst" placeholder="podaj numer Pesel" value="${tekst}">
              <input type="text" name="haslo" placeholder="podaj hasło" value="${haslo}">
              <input type="text" name="haslo2" placeholder="powtórz hasło" value="${haslo2}">
              <button type="submit">Wyślij</button>
            </form>
            <button onclick="location.href='/'">Powrót do strony głównej</button>
            <div style="color: red; margin-top: 10px;">"hasła nie są takie same"</div>
          `);
        }
      } else if (wynik === "1") {
        res.status(400).send(`
        <form method="POST">
            <input type="text" name="tekst" placeholder="podaj numer Pesel" value="${tekst}">
            <input type="text" name="haslo" placeholder="podaj hasło" value="${haslo}">
            <input type="text" name="haslo2" placeholder="powtórz hasło" value="${haslo2}">
            <button type="submit">Wyślij</button>
          </form>
          <button onclick="location.href='/'">Powrót do strony głównej</button>
          <div style="color: red; margin-top: 10px;">"błędny pesel"</div>
        `);
      }
    });
  });
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
