#!/usr/bin/python3
"""Feedback: the submission API (/api/v1/feedback) and the private tickets page (/v1/tickets)."""
import hmac
import re
import threading
import time
from api.controllers_auxiliary import error_handler
from flask import jsonify, make_response, render_template, request
from models import DBTickets
from os import environ
from utils import db, mailer

# ── Rules for a submission ──────────────────────────────────────────────────
MAX_IMAGES = 6
MAX_IMAGE_BYTES = 2 * 1024 * 1024       # each image
MAX_TOTAL_BYTES = 4 * 1024 * 1024       # all images together
BODY_HEADROOM = 256 * 1024              # text fields and multipart framing on top of the images
MAX_MESSAGE = 1000
CATEGORIES = ('bug', 'idea', 'praise')
E164 = re.compile(r'^\+[1-9]\d{6,14}$')
EMAIL = re.compile(r'^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$')
SUBMITS_PER_WINDOW = 5                  # per IP address...
SUBMIT_WINDOW = 10 * 60                 # ...in this many seconds

# ── Rules for the tickets page ──────────────────────────────────────────────
FAILS_ALLOWED = 1                       # wrong logins tolerated before the address is blocked
BLOCK_SECONDS = 5 * 60                  # how long a blocked address is shown a 404

_lock = threading.Lock()
_submits: dict[str, list[float]] = {}
_fails: dict[str, int] = {}
_blocked: dict[str, float] = {}


def _bad(message: str, code: int = 400):
    return jsonify({'error': message}), code


def _sniff(data: bytes) -> str | None:
    """The image type from its first bytes (a file's name and declared type can't be trusted)."""
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'image/png'
    if data.startswith(b'\xff\xd8\xff'):
        return 'image/jpeg'
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return 'image/webp'
    return None


def _limited(ip: str) -> bool:
    """Counts a submission from this address, and says whether it is over the limit."""
    now = time.time()
    with _lock:
        for key in [k for k, v in _submits.items() if not v or now - v[-1] > SUBMIT_WINDOW]:
            del _submits[key]
        recent = [t for t in _submits.get(ip, []) if now - t < SUBMIT_WINDOW]
        if len(recent) >= SUBMITS_PER_WINDOW:
            _submits[ip] = recent
            return True
        _submits[ip] = recent + [now]
        return False


def feedback():
    """Receives a feedback form: text fields and up to six images (multipart/form-data)."""
    ip = request.remote_addr or '?'
    length = request.content_length
    if length is None:
        return _bad('Content-Length is required')
    if length > MAX_TOTAL_BYTES + BODY_HEADROOM:
        return _bad('That is too much to upload at once (4 MB of images at most)', 413)

    form = request.form
    if (form.get('website') or '').strip():
        return jsonify({'ok': True})  # a bot filled the hidden field: pretend it worked

    message = (form.get('message') or '').replace('\x00', '').strip()
    if not message:
        return _bad('Please write a message')
    if len(message) > MAX_MESSAGE:
        return _bad(f'The message is too long (up to {MAX_MESSAGE} characters)')

    rating = None
    if (form.get('rating') or '').strip():
        try:
            rating = int(form['rating'])
        except ValueError:
            return _bad('rating must be a number from 1 to 5')
        if not 1 <= rating <= 5:
            return _bad('rating must be a number from 1 to 5')

    category = (form.get('category') or '').strip().lower() or None
    if category and category not in CATEGORIES:
        return _bad('category must be bug, idea or praise')

    name = ' '.join((form.get('name') or '').split())[:40] or None
    player = ' '.join((form.get('player') or '').split())[:15] or None

    whatsapp = (form.get('whatsapp') or '').strip() or None
    if whatsapp and not E164.match(whatsapp):
        return _bad('The WhatsApp number must look like +2348012345678 (a + and 7 to 15 digits)')

    email = (form.get('email') or '').strip() or None
    if email and (len(email) > 120 or not EMAIL.match(email)):
        return _bad('That email address does not look right')

    files = [f for f in request.files.getlist('images') if f and f.filename]
    if len(files) > MAX_IMAGES:
        return _bad(f'At most {MAX_IMAGES} images', 413)
    images, total = [], 0
    for file in files:
        data = file.read(MAX_IMAGE_BYTES + 1)
        if len(data) > MAX_IMAGE_BYTES:
            return _bad('Each image must be 2 MB or smaller', 413)
        total += len(data)
        if total > MAX_TOTAL_BYTES:
            return _bad('The images are over 4 MB in all', 413)
        mime = _sniff(data)
        if not mime:
            return _bad('Images must be PNG, JPEG or WebP')
        images.append((mime, data))

    if _limited(ip):
        return _bad('You have sent a few already. Please try again in a little while.', 429)

    ticket = {'message': message, 'rating': rating, 'category': category, 'name': name,
              'player': player, 'whatsapp': whatsapp, 'email': email,
              'client': (request.headers.get('X-Client') or '')[:300] or None}
    try:
        ticket_id = DBTickets().add(ticket, images)
    except Exception:
        return _bad('We could not save that just now. Please try again.', 503)

    # Email it to the owner (in the background, so the player isn't kept waiting).
    base = environ.get('am_app_url', '').rstrip('/')
    link = f'{base}/v1/tickets' if base else None
    subject, text, html, reply_to = mailer.ticket_email({**ticket, 'images': images}, link)
    attachments = [(f'screenshot-{i + 1}.{mime.split("/")[1].replace("jpeg", "jpg")}', mime, data)
                   for i, (mime, data) in enumerate(images)]
    mailer.send_in_background(subject, text, html, reply_to, attachments)
    return jsonify({'ok': True, 'id': ticket_id})


# ── The tickets page ────────────────────────────────────────────────────────

def _not_found():
    """What every unknown address gets, and what a blocked address gets for everything."""
    return error_handler(404)


def _challenge():
    response = make_response(jsonify({'error': '401: Unauthorised'}), 401)
    response.headers['WWW-Authenticate'] = 'Basic realm="Tickets", charset="UTF-8"'
    return response


def _gate():
    """None when the visitor may see the page, otherwise the response to send instead.

    No login yet: a 401 so the browser asks for one. A wrong login: the address is
    blocked for BLOCK_SECONDS and shown the ordinary 404, as is every later request
    from it (even with the right password), so the block can't be told from a missing page.
    """
    ip = request.remote_addr or '?'
    now = time.time()
    with _lock:
        for key in [k for k, until in _blocked.items() if until <= now]:
            del _blocked[key]
            _fails.pop(key, None)
        if ip in _blocked:
            return _not_found()

    try:
        login = db['admin'].find_one({'_id': 'auth'})
    except Exception:
        return _not_found()
    if not login or not login.get('user') or not login.get('pass'):
        return _not_found()  # nothing set up: the page doesn't exist

    auth = request.authorization
    if not auth or auth.type != 'basic':
        return _challenge()

    # Both are always compared, so the time taken doesn't say which was wrong.
    user_ok = hmac.compare_digest((auth.username or '').encode(), str(login['user']).encode())
    pass_ok = hmac.compare_digest((auth.password or '').encode(), str(login['pass']).encode())
    if user_ok and pass_ok:
        with _lock:
            _fails.pop(ip, None)
        return None
    with _lock:
        _fails[ip] = _fails.get(ip, 0) + 1
        if _fails[ip] >= FAILS_ALLOWED:
            _blocked[ip] = now + BLOCK_SECONDS
    return _not_found()


def tickets():
    """The tickets, newest first (needs the login)."""
    denied = _gate()
    if denied:
        return denied
    try:
        items = DBTickets().list()
    except Exception:
        return error_handler(500)
    response = make_response(render_template('tickets.htm', tickets=items))
    response.headers['Cache-Control'] = 'private, no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response


def ticket_image(ticket_id: str, n: int):
    """One of a ticket's images (needs the login)."""
    denied = _gate()
    if denied:
        return denied
    try:
        found = DBTickets().image(ticket_id, n)
    except Exception:
        return error_handler(500)
    if not found:
        return _not_found()
    mime, data = found
    response = make_response(data)
    response.headers['Content-Type'] = mime
    response.headers['Content-Disposition'] = 'inline'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Cache-Control'] = 'private, no-store'
    response.headers['Content-Security-Policy'] = "default-src 'none'; sandbox"
    return response
