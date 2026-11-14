#!/usr/bin/python3
"""Sends email through the Gmail API (OAuth2 with a stored refresh token).

Only the standard library and `requests` are used: the refresh token is traded
for a short-lived access token at Google's token endpoint, and the message goes
to `users.messages.send` as base64url-encoded MIME. Everything is read from the
environment each time (see `.env.example`), and when it is not all set,
`send()` logs once and does nothing, so local runs and tests send no mail.
"""
import base64
import html as _html
import logging
import threading
import time
from email.message import EmailMessage
from email.utils import formataddr
from os import environ
from urllib.parse import quote

import requests

log = logging.getLogger('AnagramMaster')

TOKEN_URL = 'https://oauth2.googleapis.com/token'
SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
TIMEOUT = 10  # seconds, for each call to Google

_lock = threading.Lock()
_token = {'value': None, 'expires': 0.0}
_warned = False
# Whether the last email went through. None until one has been tried: then it is just "is it set up".
# (The Gmail API has no cheap "are my credentials good" call, so each send updates this instead.)
_live: bool | None = None


def is_live() -> bool:
    """Whether feedback email is working: set up at launch, then the outcome of the latest send."""
    return configured() if _live is None else _live


def _config() -> dict | None:
    """The mail settings, or None when any required one is missing."""
    config = {
        'user': environ.get('am_gmail_user', '').strip(),
        'client_id': environ.get('am_gmail_client_id', '').strip(),
        'client_secret': environ.get('am_gmail_client_secret', '').strip(),
        'refresh_token': environ.get('am_gmail_refresh_token', '').strip(),
    }
    if not all(config.values()):
        return None
    config['to'] = environ.get('am_feedback_to', '').strip() or config['user']
    config['name'] = environ.get('am_mail_from_name', '').strip() or 'Anagram Master'
    return config


def configured() -> bool:
    return _config() is not None


def _access_token(config: dict) -> str:
    """A valid access token, reused until a minute before it expires."""
    with _lock:
        if _token['value'] and time.time() < _token['expires'] - 60:
            return _token['value']
        reply = requests.post(TOKEN_URL, data={
            'client_id': config['client_id'],
            'client_secret': config['client_secret'],
            'refresh_token': config['refresh_token'],
            'grant_type': 'refresh_token',
        }, timeout=TIMEOUT)
        reply.raise_for_status()
        data = reply.json()
        _token['value'] = data['access_token']
        _token['expires'] = time.time() + float(data.get('expires_in', 3600))
        return _token['value']


def build(config: dict, subject: str, text: str, html: str,
          reply_to: str | None = None,
          attachments: list[tuple[str, str, bytes]] = ()) -> EmailMessage:
    """The MIME message: plain text and HTML alternatives, with the attachments."""
    message = EmailMessage()  # header values with line breaks are refused by the email package
    message['From'] = formataddr((config['name'], config['user']))
    message['To'] = config['to']
    message['Subject'] = subject
    if reply_to:
        message['Reply-To'] = reply_to
    message.set_content(text)
    message.add_alternative(html, subtype='html')
    for filename, mime, data in attachments:
        maintype, _, subtype = mime.partition('/')
        message.add_attachment(data, maintype=maintype, subtype=subtype, filename=filename)
    return message


def send(subject: str, text: str, html: str, reply_to: str | None = None,
         attachments: list[tuple[str, str, bytes]] = ()) -> bool:
    """Emails the feedback address. Returns whether Google accepted it. Never raises."""
    global _warned, _live
    config = _config()
    if not config:
        if not _warned:
            _warned = True
            log.warning('Gmail API is not configured: feedback emails are skipped.')
        return False
    try:
        message = build(config, subject, text, html, reply_to, attachments)
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        reply = requests.post(SEND_URL, json={'raw': raw}, timeout=TIMEOUT,
                              headers={'Authorization': f'Bearer {_access_token(config)}'})
        reply.raise_for_status()
        _live = True
        log.info('Feedback email sent')
        return True
    except requests.HTTPError as error:  # Google answered, but refused (bad credentials, quota, ...)
        _live = False
        status = error.response.status_code if error.response is not None else '?'
        log.error('Feedback email failed: Google answered %s', status)
        return False
    except Exception as error:  # a failed email must never fail the request
        _live = False
        log.error('Feedback email error: %s', error)
        return False


def send_in_background(*args, **kwargs) -> None:
    """Sends on another thread, so the request that caused it isn't held up."""
    threading.Thread(target=send, args=args, kwargs=kwargs, daemon=True).start()


# ── The feedback email ──────────────────────────────────────────────────────

LABELS = {'bug': 'Bug', 'idea': 'Idea', 'praise': 'Praise'}


def _wa_link(number: str) -> str:
    greeting = quote('Hi, this is about your Anagram Master feedback.')
    return f'https://wa.me/{number.lstrip("+")}?text={greeting}'


def ticket_email(ticket: dict, link: str | None) -> tuple[str, str, str, str | None]:
    """(subject, text, html, reply_to) for a new ticket. Every value is escaped in the HTML."""
    e = _html.escape
    category = LABELS.get(ticket.get('category') or '', 'Feedback')
    rating = ticket.get('rating')
    who = ticket.get('name') or ticket.get('player') or 'a player'
    subject = f'[Anagram Master] {category}' + (f' ({rating}/5)' if rating else '') + f' from {who}'
    subject = ' '.join(subject.split())  # one line, whatever the name held

    rows = [
        ('Category', category),
        ('Rating', f'{"★" * rating}{"☆" * (5 - rating)} ({rating}/5)' if rating else ''),
        ('Status', (ticket.get('status') or 'pending').capitalize()),
        ('Player', ticket.get('player') or ''),
        ('Name', ticket.get('name') or ''),
        ('WhatsApp', ticket.get('whatsapp') or ''),
        ('Email', ticket.get('email') or ''),
        ('Images', str(len(ticket.get('images') or [])) or ''),
    ]
    rows = [(k, v) for k, v in rows if v and v != '0']

    text = [f'{category} from {who}', '', ticket.get('message', ''), '']
    text += [f'{k}: {v}' for k, v in rows]
    if ticket.get('whatsapp'):
        text += ['', f'Chat on WhatsApp: {_wa_link(ticket["whatsapp"])}']
    if link:
        text += ['', f'This ticket: {link}']

    cells = ''.join(f'<tr><td style="padding:2px 12px 2px 0;color:#666">{e(k)}</td><td>{e(v)}</td></tr>' for k, v in rows)
    button = ''
    if ticket.get('whatsapp'):
        button = ('<p><a href="' + e(_wa_link(ticket['whatsapp'])) + '" style="display:inline-block;padding:10px 18px;'
                  'background:#25d366;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">'
                  'Chat on WhatsApp</a></p>')
    body = (
        f'<div style="font-family:sans-serif;font-size:15px;color:#222">'
        f'<h2 style="margin:0 0 8px">{e(category)} from {e(who)}</h2>'
        f'<p style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:6px">{e(ticket.get("message", ""))}</p>'
        f'<table>{cells}</table>{button}'
        + (f'<p><a href="{e(link)}">Open this ticket</a></p>' if link else '')
        + '</div>'
    )
    return subject, '\n'.join(text), body, ticket.get('email') or None
