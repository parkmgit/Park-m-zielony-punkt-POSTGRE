# Zielony Punkt — ewidencja drzew i krzewów

Prywatna aplikacja PWA Grupy Park M do ewidencji nasadzeń, działań pielęgnacyjnych, zdjęć, lokalizacji GPS, projektów i przypomnień.

## Stos technologiczny

- Next.js 15 (App Router), React 19 i TypeScript
- PostgreSQL przez `pg`
- Tailwind CSS 4
- Leaflet / OpenStreetMap
- Cloudinary
- `next-pwa`

## Uruchomienie lokalne

1. Zainstaluj zależności:

   ```bash
   npm install
   ```

2. Skopiuj `env.example` do `.env.local` i ustaw połączenie z PostgreSQL oraz sekrety aplikacji.

3. Uruchom aplikację:

   ```bash
   npm run dev
   ```

Aplikacja będzie dostępna pod adresem `http://localhost:3000`.

## Pierwsza inicjalizacja bazy

Schemat jest definiowany w `lib/db.ts`. Projekt nie korzysta obecnie z wersjonowanych migracji.

Dla pustej bazy ustaw co najmniej:

- `SESSION_SECRET` — długi, losowy klucz podpisujący sesje,
- `SETUP_TOKEN` — oddzielny token jednorazowej inicjalizacji,
- `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` — dane pierwszego administratora.

Następnie wywołaj raz chroniony endpoint inicjalizacyjny:

```bash
curl -X POST http://localhost:3000/api/init -H "x-setup-token: TWOJ_SETUP_TOKEN"
```

Endpoint inicjalizacyjny nie jest wywoływany automatycznie przez przeglądarkę. Po utworzeniu bazy usuń `SETUP_TOKEN` ze środowiska wdrożeniowego.

## Konta i role

- Publiczna rejestracja tworzy wyłącznie konto z rolą `pracownik`.
- Dostępne role to `admin`, `brygadzista` i `pracownik`.
- Administrator ma na stronie głównej panel **Użytkownicy**, w którym może zmienić rolę oraz ręcznie ustawić nowe hasło wybranemu użytkownikowi.
- Nie można zdegradować ostatniego aktywnego administratora.
- Hasła są hashowane przez bcrypt i nie są zwracane przez API.
- Sesja jest przechowywana w podpisanym ciasteczku `httpOnly`.

## Struktura projektu

```text
app/                  strony i endpointy Next.js App Router
  admin/users/        panel zarządzania hasłami użytkowników
  api/                API aplikacji
components/           współdzielone komponenty React
lib/                  baza danych, sesje, autoryzacja i typy
public/               zasoby statyczne PWA
middleware.ts         ochrona stron i API
```

## Ważne zasady bezpieczeństwa

- Nie umieszczaj haseł, tokenów, `.env` ani backupów bazy w repozytorium.
- Pliki `*.dump`, `*.backup` oraz `*_backup.sql` są lokalnie ignorowane przez Git.
- Endpoint resetu bazy wymaga roli administratora i pozostaje wyłączony, dopóki `ALLOW_DATABASE_RESET` nie ma wartości `true`.
- Po wdrożeniu przez HTTPS pozostaw `NODE_ENV=production`, aby ciasteczko sesji miało flagę `Secure`.

## Dostępne polecenia

```bash
npm run dev       # serwer deweloperski
npm run dev:network
npm run build
npm start
npx tsc --noEmit  # kontrola typów
```

Projekt prywatny — Park M.
