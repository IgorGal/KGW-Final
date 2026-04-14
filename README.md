# KGW Jezierzany - panel admina chroniony haslem

Ten projekt uruchamia strony KGW przez backend Express. Panel admina nie jest juz publicznym plikiem statycznym - jest serwowany tylko po poprawnym logowaniu.

## Dlaczego hasla nie widac pod F12

Haslo (dokladnie: hash hasla) jest przechowywane po stronie serwera w zmiennej srodowiskowej `ADMIN_PASSWORD_HASH`.

- frontend wysyla tylko wpisane haslo do `/auth/login`
- serwer porownuje je z hashem (`bcrypt`)
- po sukcesie tworzy sesje i ustawia cookie `HttpOnly`
- bez sesji wejscie na `/admin` przekierowuje na `/login`

## Szybki start

1. Zainstaluj zaleznosci.
2. Skopiuj `.env.example` do `.env`.
3. Ustaw bezpieczny `SESSION_SECRET`.
4. Wygeneruj hash hasla i wpisz do `ADMIN_PASSWORD_HASH`.
5. Uruchom serwer.

### Generowanie hasha hasla

```powershell
node -e "console.log(require('bcryptjs').hashSync('TU_TWOJE_BARDZO_DLUGIE_HASLO', 12))"
```

### Uruchomienie

```powershell
npm install
Copy-Item .env.example .env
npm run start
```

Aplikacja bedzie pod adresem `http://localhost:3000`.

## Trasy

- publiczne: `/`, `/index.html`, `/about.html`, `/recent.html`, `/work.html`, `/contact.html`, `/login`
- chronione: `/admin`
- auth: `POST /auth/login`, `POST /auth/logout`

## Test manualny

1. Otworz `http://localhost:3000/admin` - powinien byc redirect do `/login`.
2. Zaloguj z poprawnym haslem - powinno otworzyc panel.
3. Odswiez `/admin` - sesja powinna nadal dzialac.
4. Kliknij `Wyloguj` - powrot do `/login`.
5. Po wylogowaniu wejscie na `/admin` znow powinno przekierowac na logowanie.

