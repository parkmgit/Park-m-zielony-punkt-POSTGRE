---
title: Hosting trees.park-m.pl na IIS (Windows Server)
---

# Wdrozenie Zielony Punkt na IIS - trees.park-m.pl

## Wymagania na serwerze

- Windows Server 2016/2019/2022 z zainstalowanym IIS
- Node.js 20+ LTS (https://nodejs.org)
- iisnode (https://github.com/tjanczuk/iisnode/releases)
- URL Rewrite Module dla IIS (https://www.iis.net/downloads/microsoft/url-rewrite)
- PostgreSQL 15+ (zainstalowany lokalnie lub zdalny)

---

## KROK 1 - Przygotuj aplikacje lokalnie

Na swoim komputerze (tam gdzie jest kod):

```powershell
# 1. Wejdz do katalogu projektu
cd C:\sciezka\do\Park-m-zielony-punkt-POSTGRE

# 2. Zainstaluj zaleznosci
npm install

# 3. Zbuduj aplikacje produkcyjnie
npm run build
```

Po `npm run build` powstanie katalog `.next/`.

---

## KROK 2 - Skopiuj pliki na serwer

Skopiuj przez FTP/RDP/SMB te katalogi i pliki:

```
[katalog na serwerze, np. C:\inetpub\trees]
  .next\                  <- WYMAGANE (skompilowana aplikacja)
  public\                 <- WYMAGANE (zdjecia, ikony, manifest)
  node_modules\           <- WYMAGANE (lub zainstaluj npm install na serwerze)
  app\                    <- WYMAGANE (kod aplikacji)
  lib\                    <- WYMAGANE (db, auth)
  components\             <- WYMAGANE
  middleware.ts           <- WYMAGANE
  next.config.ts          <- WYMAGANE
  package.json            <- WYMAGANE
  server.js               <- WYMAGANE
  web.config              <- WYMAGANE
  tsconfig.json           <- WYMAGANE
```

**NIE kopiuj:**
- `.env.local` (zawiera hasla - ustaw zmienne w IIS, patrz Krok 4)
- `.git\`

---

## KROK 3 - Konfiguracja IIS

### 3a. Stworz nowa witryne w IIS

1. Otworz **Menedzer IIS** (inetmgr)
2. Prawy przycisk na **Sites** -> **Add Website**
3. Wypelnij:
   - **Site name:** `trees.park-m.pl`
   - **Physical path:** `C:\inetpub\trees`  (katalog z plikami)
   - **Binding type:** `http`
   - **Host name:** `trees.park-m.pl`
   - **Port:** `80`
4. Kliknij **OK**

### 3b. Dodaj HTTPS (SSL)

1. Zainstaluj certyfikat SSL (np. darmowy Let's Encrypt przez win-acme.com)
2. W IIS: witryna `trees.park-m.pl` -> **Bindings** -> **Add**
   - Type: `https`, Port: `443`, Host name: `trees.park-m.pl`
   - Wybierz certyfikat SSL

### 3c. Uprawnienia do katalogu

Konto uslugi IIS (`IIS_IUSRS` lub `IUSR`) musi miec uprawnienia **Modify** do katalogu aplikacji:

```powershell
icacls "C:\inetpub\trees" /grant "IIS_IUSRS:(OI)(CI)M" /T
icacls "C:\inetpub\trees" /grant "IUSR:(OI)(CI)M" /T
```

---

## KROK 4 - Zmienne srodowiskowe w IIS

W IIS nie uzywamy `.env.local`. Zmienne ustawiamy w menedzerze IIS:

1. Kliknij na witryne `trees.park-m.pl`
2. Dwuklik na **Configuration Editor**
3. Section: `system.webServer/iisnode` -> ustaw `node_env = production`

**LUB** dodaj sekcje `<environmentVariables>` do `web.config`:

```xml
<configuration>
  <system.webServer>
    <!-- ... istniejaca konfiguracja ... -->
    <iisnode node_env="production" ... />
  </system.webServer>
  <appSettings>
    <add key="DATABASE_URL" value="postgresql://postgres:HASLO@localhost:5432/park_m_trees?sslmode=disable" />
    <add key="NODE_ENV" value="production" />
  </appSettings>
</configuration>
```

**Lub przez PowerShell (najlepiej):**

```powershell
# Ustaw zmienne srodowiskowe dla konta IIS na poziomie systemu
[System.Environment]::SetEnvironmentVariable("DATABASE_URL", "postgresql://postgres:HASLO@localhost:5432/park_m_trees?sslmode=disable", "Machine")
[System.Environment]::SetEnvironmentVariable("NODE_ENV", "production", "Machine")
# Zrestartuj IIS po ustawieniu zmiennych
iisreset
```

---

## KROK 5 - DNS

W panelu zarzadzania domena `park-m.pl` dodaj rekord:

```
Typ:   A
Nazwa: trees
Wartosc: [IP serwera Windows]
TTL:   3600
```

Lub jesli serwer jest za NAT/routerem - uzyj IP publicznego + przekierowanie portow 80/443.

---

## KROK 6 - Sprawdz iisnode

Wejdz na: `http://trees.park-m.pl`

Jesli strona nie dziala, sprawdz logi iisnode:
```
C:\inetpub\trees\iisnode\
```

Najczestsze bledy:
- `Cannot find module` -> zainstaluj `npm install` w katalogu aplikacji
- `Error: listen EACCES` -> port juz zajety, zmien port w `server.js`
- `ECONNREFUSED` (baza) -> sprawdz DATABASE_URL i czy PostgreSQL dziala

---

## KROK 7 - Inicjalizacja bazy danych

Po pierwszym uruchomieniu otworz w przegladarce:
```
https://trees.park-m.pl/api/init
```

Odpowiedz powinna byc:
```json
{"message":"Database initialized successfully"}
```

Jesli baza juz zawiera dane (po migracji z Neon) - to zapytanie jest bezpieczne, nie nadpisze istniejacych danych (`CREATE TABLE IF NOT EXISTS`).

---

## Checklist wdrozenia

- [ ] Node.js 20+ zainstalowany na serwerze
- [ ] iisnode zainstalowany
- [ ] URL Rewrite Module zainstalowany
- [ ] Pliki skopiowane do `C:\inetpub\trees`
- [ ] Witryna IIS `trees.park-m.pl` skonfigurowana
- [ ] Zmienne srodowiskowe (DATABASE_URL, NODE_ENV) ustawione
- [ ] Uprawnienia `IIS_IUSRS` do katalogu nadane
- [ ] DNS rekord A dla `trees.park-m.pl` ustawiony
- [ ] SSL (HTTPS) skonfigurowany
- [ ] `/api/init` zwraca sukces
- [ ] Logowanie dziala: `admin@park-m.pl` / `password123`

