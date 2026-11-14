#!/usr/bin/python3
"""Feedback: the submission API, the admin tickets pages (/v1/tickets) and the read-only ticket views
(JSON) that the web app shows."""
import hmac
import re
import threading
import time
from datetime import datetime, timezone
from api.controllers_app import asset
from api.controllers_auxiliary import error_handler
from flask import jsonify, make_response, render_template, request
from models import DBTickets
from models.db_tickets import (CODE, FIELDS, MAX_RESPONSE, OWN_FIELDS, PER_PAGE, STATUSES,
                               CodeTaken, clean_fields, public_view)
from os import environ
from urllib.parse import quote, urlencode, urlparse
from utils import db, mailer

# ── Rules for a submission ──────────────────────────────────────────────────
MAX_IMAGES = 6
MAX_TOTAL_BYTES = 4 * 1024 * 1024       # all images together (every request is also capped at 10 MB, see api.py)
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


TOKEN = re.compile(r'^[A-Za-z0-9_-]{8,64}$')  # a ticket's public token (never the word "shared")


def _base() -> str:
    """The public address of the web app (for links in mail and on pages)."""
    return environ.get('am_app_url', '').rstrip('/') or request.host_url.rstrip('/')


def _shared_link(code: str) -> str:
    """The web app's read-only screen for a shared ticket. Everyone but the admin reads tickets there."""
    return f'{_base()}/#feedback/shared/{code}'


def _own_link(tid: str) -> str:
    """The web app's screen for a sender's own ticket."""
    return f'{_base()}/#feedback/{tid}'


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
        data = file.read()
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
        saved = DBTickets().add(ticket, images)
    except Exception:
        return _bad('We could not save that just now. Please try again.', 503)

    # Email it to the owner (in the background, so the player isn't kept waiting). The link is the
    # ticket's share link in the web app, which every ticket has from the start: a reply to this email
    # may quote it to the sender, so it must not be an admin address. It is only added when the app's
    # address is configured, because anyone can send this request with a made-up Host header.
    link = _shared_link(saved['code']) if environ.get('am_app_url') else None
    subject, text, html, reply_to = mailer.ticket_email({**ticket, 'status': 'pending', 'images': images}, link)
    attachments = [(f'screenshot-{i + 1}.{mime.split("/")[1].replace("jpeg", "jpg")}', mime, data)
                   for i, (mime, data) in enumerate(images)]
    mailer.send_in_background(subject, text, html, reply_to, attachments)
    return jsonify({'ok': True, 'id': saved['tid']})


# ── The tickets pages (admin) ───────────────────────────────────────────────

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


def _assets() -> dict:
    """Files borrowed from the front end's build (their names carry a hash, so they are found by pattern)."""
    return {'font': asset('outfit-latin-wght-normal-*.woff2'), 'logo': asset('logo-horizontal-????????.webp')}


def _page(template: str, **context):
    context = {**context, 'assets': _assets(), 'year': datetime.now(timezone.utc).year}
    response = make_response(render_template(template, **context))
    response.headers['Cache-Control'] = 'private, no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response


def _image_response(found):
    mime, data = found
    response = make_response(data)
    response.headers['Content-Type'] = mime
    response.headers['Content-Disposition'] = 'inline'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Cache-Control'] = 'private, no-store'
    response.headers['Content-Security-Policy'] = "default-src 'none'; sandbox"
    return response


def _int(value, default: int, low: int = 0, high: int = 10**6) -> int:
    try:
        return min(max(int(value), low), high)
    except (TypeError, ValueError):
        return default


def _list_args() -> dict:
    """The list's search, filters and sort from the address (anything unknown is ignored)."""
    status, category, sort, reply = (request.args.get(k) for k in ('status', 'category', 'sort', 'reply'))
    return {
        'q': (request.args.get('q') or '').strip()[:100],
        'status': status if status in STATUSES else '',
        'category': category if category in CATEGORIES else '',
        'rating': _int(request.args.get('rating'), 0, 0, 5),
        'reply': reply if reply in ('none', 'yes') else '',
        'sort': sort if sort in ('new', 'old', 'high', 'low') else 'new',
    }


def _list_query(args: dict, page: int = 1) -> str:
    """The list's address query for these filters ('' when they are all the defaults)."""
    keep = {k: v for k, v in {**args, 'page': page}.items()
            if v not in ('', 0, None) and not (k == 'sort' and v == 'new') and not (k == 'page' and v == 1)}
    return urlencode(keep)


def tickets():
    """The tickets: search, filters, sorting and pages (needs the login)."""
    denied = _gate()
    if denied:
        return denied
    args = _list_args()
    page = _int(request.args.get('page'), 1, 1)
    try:
        model = DBTickets()
        items, total = model.list(**args, page=page)
        counts = model.counts()
        stats = model.stats()
    except Exception:
        return error_handler(500)
    pages = max(1, -(-total // PER_PAGE))
    page = min(page, pages)

    def link(**changes):
        """This list's address with some filters changed (back to page 1 unless a page is given)."""
        query = _list_query({**args, **{k: v for k, v in changes.items() if k != 'page'}}, changes.get('page', 1))
        return '/v1/tickets?' + (query or 'reset=1')

    # Each ticket opens with this list's query, so its page can offer Previous/Next and a way back to the same list.
    return _page('tickets.htm', tickets=items, total=total, counts=counts, stats=stats, args=args, page=page,
                 pages=pages, link=link, here=_list_query(args, page))


def _contact(ticket: dict, share_url: str | None) -> dict:
    """Ready-made ways to answer the sender, with the share link in the default message."""
    who = ticket.get('name') or ticket.get('player')
    lines = [f'Hi{" " + who if who else ""}, thanks for your feedback on Anagram Master.']
    if share_url:
        lines.append(f'You can follow it here: {share_url}')
    text = '\n\n'.join(lines)
    out = {'text': text, 'whatsapp': None, 'email': None}
    if ticket.get('whatsapp'):
        out['whatsapp'] = f'https://wa.me/{ticket["whatsapp"].lstrip("+")}?text={quote(text)}'
    if ticket.get('email'):
        out['email'] = (f'mailto:{quote(ticket["email"])}?subject={quote("Your Anagram Master feedback")}'
                        f'&body={quote(text)}')
    return out


def _same_origin() -> bool:
    """Writes come only from this site's own page (the browser sends the login by itself, so check)."""
    site = request.headers.get('Sec-Fetch-Site')
    if site:
        return site in ('same-origin', 'none')
    origin = request.headers.get('Origin')
    return bool(origin) and urlparse(origin).netloc == request.host


def ticket_detail(ticket_id: str):
    """One ticket, with its images, reply form and sharing (GET); its status and reply saved (POST)."""
    denied = _gate()
    if denied:
        return denied
    try:
        model = DBTickets()
        if request.method == 'POST':
            if not _same_origin() or not request.is_json:
                return _bad('Not allowed', 403)
            body = request.get_json(silent=True) or {}
            status, response = body.get('status'), body.get('response')
            if status not in STATUSES or not (response is None or isinstance(response, str)):
                return _bad('A status is needed, and a reply (possibly empty) if one is sent')
            if response is not None:
                response = response.replace('\x00', '').strip()
            if response is not None and len(response) > MAX_RESPONSE:
                return _bad(f'The reply is too long (up to {MAX_RESPONSE} characters)')
            if not model.update(ticket_id, status, response):
                return _not_found()
            return jsonify({'ok': True, 'status': status})
        ticket = model.find(id=ticket_id)
    except Exception:
        return error_handler(500)
    if not ticket:
        return _not_found()
    share = ticket.get('share')
    share_url = _shared_link(share['code']) if share else None
    # Where this ticket sits in the list it was opened from (the list's own query comes along in the address).
    args = _list_args()
    near = {'prev': None, 'next': None, 'at': 0, 'of': 0}
    try:
        order = DBTickets().ids(**args)
        if ticket['id'] in order:
            i = order.index(ticket['id'])
            near = {'prev': order[i - 1] if i else None, 'next': order[i + 1] if i + 1 < len(order) else None,
                    'at': i + 1, 'of': len(order)}
    except Exception:
        pass
    here = _list_query(args, _int(request.args.get('page'), 1, 1))
    return _page('ticket.htm', t=ticket, near=near, here=here, share=share, share_url=share_url, fields=FIELDS,
                 statuses=STATUSES, contact=_contact(ticket, share_url),
                 share_base=_shared_link(''), own_url=_own_link(ticket['tid']))


def ticket_share(ticket_id: str):
    """Starts or changes (PUT: code and fields) or stops (DELETE) sharing a ticket."""
    denied = _gate()
    if denied:
        return denied
    if not _same_origin():
        return _bad('Not allowed', 403)
    try:
        model = DBTickets()
        if request.method == 'DELETE':
            return jsonify({'ok': True}) if model.clear_share(ticket_id) else _not_found()
        if not request.is_json:
            return _bad('Not allowed', 403)
        body = request.get_json(silent=True) or {}
        code, fields = body.get('code'), clean_fields(body.get('fields'))
        if not isinstance(code, str) or not CODE.match(code):
            return _bad('The link name needs 3 to 60 letters, digits, - or _')
        if fields is None:
            return _bad('Those fields are not recognised')
        try:
            found = model.set_share(ticket_id, code, fields)
        except CodeTaken:
            return _bad('That link name is taken. Pick another.', 409)
        if not found:
            return _not_found()
        return jsonify({'ok': True, 'url': _shared_link(code)})
    except Exception:
        return error_handler(500)


def ticket_image(ticket_id: str, n: int):
    """One of a ticket's images (needs the login)."""
    denied = _gate()
    if denied:
        return denied
    try:
        found = DBTickets().image(n, id=ticket_id)
    except Exception:
        return error_handler(500)
    return _image_response(found) if found else _not_found()


# ── Read-only views for the web app (JSON, no login) ────────────────────────
# The app shows these on its own screens: #feedback/<token> for the sender and #feedback/shared/<code>
# for anyone the admin gave the link to. public_view() decides what each may see.

def _view_response(view: dict):
    """A ticket view as JSON, never cached (the status and reply change)."""
    for key in ('date', 'responded_at'):
        if view.get(key):
            # MongoDB hands the dates back without a zone; they are UTC, and the app needs to be told so.
            view[key] = view[key].replace(tzinfo=timezone.utc).isoformat()
    response = jsonify(view)
    response.headers['Cache-Control'] = 'no-store'
    return response


def own_ticket_json(tid: str):
    """The sender's own ticket: everything they sent, its status and the reply (never the app details)."""
    if not TOKEN.match(tid):
        return _not_found()
    try:
        ticket = DBTickets().find(tid=tid)
    except Exception:
        return error_handler(500)
    if not ticket:
        return _not_found()
    return _view_response(public_view(ticket, OWN_FIELDS))


def own_ticket_image(tid: str, n: int):
    if not TOKEN.match(tid):
        return _not_found()
    try:
        found = DBTickets().image(n, tid=tid)
    except Exception:
        return error_handler(500)
    return _image_response(found) if found else _not_found()


def _shared(code: str):
    """(ticket, shared fields), or (None, None) when there is no such ticket or it isn't shared."""
    ticket = DBTickets().find(code=code)
    share = (ticket or {}).get('share')
    return (ticket, share['fields']) if share else (None, None)


def shared_ticket_json(code: str):
    """A shared ticket: only the fields the admin chose to share."""
    try:
        ticket, fields = _shared(code)
    except Exception:
        return error_handler(500)
    if not ticket:
        return _not_found()
    return _view_response(public_view(ticket, fields))


def shared_ticket_image(code: str, n: int):
    try:
        ticket, fields = _shared(code)
        found = DBTickets().image(n, code=code) if ticket and 'images' in fields else None
    except Exception:
        return error_handler(500)
    return _image_response(found) if found else _not_found()
