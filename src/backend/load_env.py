"""Optional `.env` file for local runs: `src/backend/.env`, copied from `.env.example`.

Import this before anything that reads the environment (`api/api.py` and
`server.py` do). It only fills in variables the operating system hasn't set, so
real environment variables (Render's dashboard, your shell) always win. A missing
file is fine, and nothing is printed, because the values are secrets.
"""
from os import environ
from pathlib import Path

FILE = Path(__file__).resolve().parent / '.env'


def _read(path: Path) -> str:
    """Reads the file as UTF-8, or UTF-16 when it starts with a byte order mark (Windows editors)."""
    raw = path.read_bytes()
    if raw.startswith((b'\xff\xfe', b'\xfe\xff')):
        return raw.decode('utf-16').lstrip('\ufeff')
    return raw.decode('utf-8-sig')


def parse(text: str) -> dict[str, str]:
    """Turns `KEY=value` lines into a dict. Comments (#), blank lines and `export ` are ignored."""
    values = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        if line.startswith('export '):
            line = line[len('export '):]
        key, _, value = line.partition('=')
        key, value = key.strip(), value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in '"\'':
            value = value[1:-1]
        elif ' #' in value:
            value = value.split(' #', 1)[0].rstrip()
        if key:
            values[key] = value
    return values


def load(path: Path = FILE) -> int:
    """Sets the variables from the file that the OS hasn't set. Returns how many it added."""
    try:
        values = parse(_read(path))
    except (OSError, UnicodeError):
        return 0
    added = 0
    for key, value in values.items():
        if key not in environ:
            environ[key] = value
            added += 1
    return added


load()
