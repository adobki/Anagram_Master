# ___Anagram Master___

A timed word game. Each round deals you a long word: make as many new words as you can from its letters before the two-minute clock runs out. There are twenty rounds, and good scores make the leaderboard.

Anagram Master began as the Research/Portfolio Project at the end of the _Software Engineering Foundations_ stage of the [ALX Software Engineering Course](https://www.alxafrica.com/software-engineering). It is now an installable, touch-friendly web app (PWA), with the original version still playable at `/v1/`.

## Table of Contents
* [How it's built](#how-its-built)
* [Folder structure](#folder-structure)
* [Running it](#running-it)
* [API](#api)
* [Authors](#authors)
* [License](#license)

## How it's built
* **API:** Python 3.12, Flask, MongoDB (Atlas), served by waitress. The server owns the rules, the score and the round clock.
* **Web app:** Svelte 5 and TypeScript, built with Vite, made installable and offline-capable with vite-plugin-pwa.
* **Classic version:** the original jQuery pages, served at `/v1/`.

One Flask server serves all three: the web app at `/`, the classic pages at `/v1/`, and the JSON API at `/api/v1/`.

## Folder structure
| Path | Contents |
|---|---|
| `src/backend/` | The Flask API, game engine and database layer, plus the classic `/v1/` pages (`api/templates`, `api/static`) |
| `src/frontend/` | The web app. See [its README](src/frontend/README.md) for development details |
| `src/build.sh`, `src/build.cmd` | Install, build and run everything |
| `ref/` | The original specification and design diagrams |

## Running it
Requirements: Python 3.12 and Node.js 20.19+. The server reads these environment variables:

| Variable | Purpose |
|---|---|
| `am_cypher_key` | Fernet key that encrypts the player's game cookie |
| `am_database_host`, `am_database_user`, `am_database_pass` | MongoDB Atlas credentials |
| `am_database_name` | Database to use (optional, default `AM`) |

Build and run everything, then open http://localhost:5555:

```sh
src/build.sh      # Windows: src\build.cmd
```

For development, run the API and the web app's dev server side by side:

```sh
cd src/backend && python -m api.api      # API on port 5555
cd src/frontend && npm run dev           # web app on http://localhost:5173, proxied to the API
```

## API
All routes are under `/api/v1`. The player's game is identified by an encrypted, HttpOnly `session` cookie, so clients must be served from the same origin.

| Method and route | Purpose |
|---|---|
| `GET /health` | API, database and word-list status |
| `POST /init` `{"name"}` | Start a game |
| `GET /status` | The current game |
| `POST /play` `{"word"}` | Submit a word |
| `POST /play` `{"new_word": true}` | Skip to the next round |
| `POST /close` | End the game (scores of 10+ are saved) |
| `GET /scores` | The top 20 scores |

## Authors
[Donald Ajaps](https://github.com/adobki)

## License
Anagram Master is the intellectual property of Donald Ajaps, Copyright © 2023. No part of it should be copied or reproduced without express permission from him.
