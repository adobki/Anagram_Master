#!/usr/bin/python3
"""Feedback tickets in the MongoDB database.

One document per submission in the `tickets` collection. Screenshots are kept
inside the document as binary (at most 6 and 4 MB in all, far below MongoDB's
16 MB document limit), so no file storage is needed.

Besides what the player sent, a ticket has:
  tid        a random public token (the "ticket id" the player's device keeps; not the Mongo `_id`,
             which is partly predictable);
  status     pending (new) | active | closed, changed only by the admin;
  response   the admin's reply, shown to the player;
  share      `{code, fields}` while the ticket can be viewed at its share link, `None` once sharing was
             cancelled. `code` is unique across tickets (a unique index, so the database enforces it).
"""
from __future__ import annotations
import re
import secrets
from bson import Binary, ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone
from pymongo.errors import DuplicateKeyError
from pymongo import ASCENDING
from utils import db, isAlive, DESCENDING

STATUSES = ('pending', 'active', 'closed')
# What a share link can show. `app` (the client's version/settings text) is for the admin unless ticked.
FIELDS = ('message', 'rating', 'category', 'status', 'response', 'images', 'date',
          'player', 'name', 'email', 'whatsapp', 'app')
SHARED_BY_DEFAULT = ('message', 'rating', 'category', 'status', 'response', 'images', 'date')
# The submitter sees their own ticket: everything they sent plus the status and reply, but not `app`.
OWN_FIELDS = tuple(f for f in FIELDS if f != 'app')
CODE = re.compile(r'^[A-Za-z0-9_-]{3,60}$')
MAX_RESPONSE = 2000
PER_PAGE = 20
_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'  # no look-alikes (i, l, o, 0, 1)

SORTS = {
    'new': [('created_at', DESCENDING)],
    'old': [('created_at', ASCENDING)],
    'high': [('rating', DESCENDING), ('created_at', DESCENDING)],
    'low': [('rating', ASCENDING), ('created_at', DESCENDING)],
}


class CodeTaken(Exception):
    """A share code is already used by another ticket."""


def random_code() -> str:
    return ''.join(secrets.choice(_ALPHABET) for _ in range(8))


def _share(fields=SHARED_BY_DEFAULT) -> dict:
    return {'code': random_code(), 'fields': list(fields)}


def _migrate() -> None:
    """Indexes, and a token, status and share for tickets saved before those existed. Safe to repeat."""
    col = db['tickets']
    col.create_index('share.code', unique=True, name='share_code_unique',
                     partialFilterExpression={'share.code': {'$type': 'string'}})
    col.create_index('tid', unique=True, name='tid_unique',
                     partialFilterExpression={'tid': {'$type': 'string'}})
    for doc in col.find({'tid': {'$exists': False}}, {'_id': 1}):
        col.update_one({'_id': doc['_id']}, {'$set': {'tid': secrets.token_urlsafe(9)}})
    col.update_many({'status': {'$exists': False}}, {'$set': {'status': 'pending'}})
    for doc in col.find({'share': {'$exists': False}}, {'_id': 1}):  # a cancelled share is None, not missing
        for _ in range(5):
            try:
                col.update_one({'_id': doc['_id']}, {'$set': {'share': _share()}})
                break
            except DuplicateKeyError:
                continue


class DBTickets:
    """Feedback tickets"""
    __db = db['tickets']

    @staticmethod
    def isAlive() -> bool:
        """Checks MongoDB database connection status"""
        if not isAlive():
            raise ConnectionError('MongoDB database connection failed!')
        return True

    @staticmethod
    def _out(doc: dict | None) -> dict | None:
        if doc:
            doc['id'] = str(doc.pop('_id'))
        return doc

    def add(self, ticket: dict, images: list[tuple[str, bytes]]) -> dict:
        """Saves a ticket. `images` is a list of (mime type, bytes). Returns {'id', 'tid', 'code'}."""
        self.isAlive()
        for _ in range(5):
            tid, share = secrets.token_urlsafe(9), _share()
            doc = {**ticket, 'tid': tid, 'status': 'pending', 'response': None, 'share': share,
                   'created_at': datetime.now(timezone.utc),
                   'images': [{'type': mime, 'size': len(data), 'data': Binary(data)}
                              for mime, data in images]}
            try:
                inserted = self.__db.insert_one(doc).inserted_id
            except DuplicateKeyError:  # a one-in-a-trillion token or code clash: draw again
                continue
            return {'id': str(inserted), 'tid': tid, 'code': share['code']}
        raise RuntimeError('Could not create a unique ticket token')

    # ── reading ────────────────────────────────────────────────────────────
    @staticmethod
    def _query(q: str = '', status: str = '', category: str = '', rating: int = 0, reply: str = '') -> dict:
        """The MongoDB filter for the admin list's search and filters.
        `reply` is 'none' (needs a reply: nothing written yet and not closed) or 'yes' (has a reply)."""
        query: dict = {}
        if status in STATUSES:
            query['status'] = status
        if category:
            query['category'] = category
        if rating:
            query['rating'] = rating
        clauses = []
        if q.strip():
            rx = {'$regex': re.escape(q.strip()), '$options': 'i'}
            clauses.append({'$or': [{k: rx} for k in ('message', 'name', 'player', 'email', 'whatsapp', 'response')]})
        if reply == 'none':
            clauses.append({'response': {'$in': [None, '']}, 'status': {'$ne': 'closed'}})
        elif reply == 'yes':
            clauses.append({'response': {'$nin': [None, '']}})
        if clauses:
            query['$and'] = clauses
        return query

    def ids(self, sort: str = 'new', **filters) -> list[str]:
        """The ids of every ticket that matches, in list order (for Previous and Next)."""
        self.isAlive()
        cursor = self.__db.find(self._query(**filters), {'_id': 1}).sort(SORTS.get(sort, SORTS['new']))
        return [str(doc['_id']) for doc in cursor]

    def stats(self) -> dict:
        """The numbers for the list's summary: ratings, this week, kinds and tickets needing a reply."""
        self.isAlive()
        week_ago = datetime.now(timezone.utc).timestamp() - 7 * 86400
        out = {'rated': 0, 'rating_sum': 0, 'week': 0, 'needs_reply': 0, 'bug': 0, 'idea': 0, 'praise': 0}
        fields = {'rating': 1, 'category': 1, 'created_at': 1, 'response': 1, 'status': 1}
        for doc in self.__db.find({}, fields):
            if doc.get('rating'):
                out['rated'] += 1
                out['rating_sum'] += doc['rating']
            if doc.get('category') in ('bug', 'idea', 'praise'):
                out[doc['category']] += 1
            made = doc.get('created_at')
            if made is not None:
                made = made if made.tzinfo else made.replace(tzinfo=timezone.utc)
                if made.timestamp() >= week_ago:
                    out['week'] += 1
            if not doc.get('response') and doc.get('status') != 'closed':
                out['needs_reply'] += 1
        out['average'] = round(out['rating_sum'] / out['rated'], 1) if out['rated'] else None
        return out

    def list(self, q: str = '', status: str = '', category: str = '', rating: int = 0, reply: str = '',
             sort: str = 'new', page: int = 1, per_page: int = PER_PAGE) -> tuple[list[dict], int]:
        """One page of tickets (without image bytes) and the number that match."""
        self.isAlive()
        query = self._query(q, status, category, rating, reply)
        total = self.__db.count_documents(query)
        cursor = (self.__db.find(query, {'images.data': 0})
                  .sort(SORTS.get(sort, SORTS['new']))
                  .skip(max(page - 1, 0) * per_page).limit(per_page))
        return [self._out(doc) for doc in cursor], total

    def counts(self) -> dict:
        """Tickets per status, and 'all'."""
        self.isAlive()
        counts = {s: 0 for s in STATUSES}
        for row in self.__db.aggregate([{'$group': {'_id': '$status', 'n': {'$sum': 1}}}]):
            if row['_id'] in counts:
                counts[row['_id']] = row['n']
        counts['all'] = sum(counts.values())
        return counts

    def find(self, **match) -> dict | None:
        """A ticket without its image bytes, by `id`, `tid` or `code` (share code)."""
        self.isAlive()
        if 'id' in match:
            try:
                query = {'_id': ObjectId(match['id'])}
            except (InvalidId, TypeError):
                return None
        elif 'tid' in match:
            query = {'tid': str(match['tid'])}
        else:
            query = {'share.code': str(match['code'])}
        return self._out(self.__db.find_one(query, {'images.data': 0}))

    def image(self, n: int, **match) -> tuple[str, bytes] | None:
        """(mime type, bytes) of the nth image of the ticket found by `id`, `tid` or `code`, or None."""
        self.isAlive()
        if 'id' in match:
            try:
                query = {'_id': ObjectId(match['id'])}
            except (InvalidId, TypeError):
                return None
        elif 'tid' in match:
            query = {'tid': str(match['tid'])}
        else:
            query = {'share.code': str(match['code'])}
        doc = self.__db.find_one(query, {'images': 1})
        images = (doc or {}).get('images') or []
        if not 0 <= n < len(images):
            return None
        return images[n]['type'], bytes(images[n]['data'])

    # ── admin changes ──────────────────────────────────────────────────────
    def update(self, ticket_id: str, status: str, response: str | None = None) -> bool:
        """Sets the status and the reply (None keeps the reply as it is). False when there is no such ticket."""
        self.isAlive()
        try:
            _id = ObjectId(ticket_id)
        except InvalidId:
            return False
        current = self.__db.find_one({'_id': _id}, {'response': 1})
        if current is None:
            return False
        change: dict = {'status': status}
        if response is not None:
            change['response'] = response or None
            if (response or None) != current.get('response'):
                change['responded_at'] = datetime.now(timezone.utc) if response else None
        self.__db.update_one({'_id': _id}, {'$set': change})
        return True

    def set_share(self, ticket_id: str, code: str, fields: list[str]) -> bool:
        """Starts or updates sharing. Raises CodeTaken if another ticket has the code."""
        self.isAlive()
        try:
            _id = ObjectId(ticket_id)
        except InvalidId:
            return False
        try:
            result = self.__db.update_one({'_id': _id}, {'$set': {'share': {'code': code, 'fields': fields}}})
        except DuplicateKeyError:
            raise CodeTaken(code)
        return result.matched_count == 1

    def clear_share(self, ticket_id: str) -> bool:
        self.isAlive()
        try:
            _id = ObjectId(ticket_id)
        except InvalidId:
            return False
        return self.__db.update_one({'_id': _id}, {'$set': {'share': None}}).matched_count == 1


def public_view(ticket: dict, fields) -> dict:
    """Only the allowed fields of a ticket, in the shape the public pages and the API use.

    This is the one place that decides what a visitor without the admin login can see."""
    allowed = set(fields)
    out: dict = {}
    for key in ('message', 'rating', 'category', 'status', 'player', 'name', 'email', 'whatsapp'):
        if key in allowed and ticket.get(key) not in (None, ''):
            out[key] = ticket[key]
    if 'response' in allowed and ticket.get('response'):
        out['response'] = ticket['response']
        out['responded_at'] = ticket.get('responded_at')
    if 'date' in allowed:
        out['date'] = ticket.get('created_at')
    if 'app' in allowed and ticket.get('client'):
        out['app'] = ticket['client']
    if 'images' in allowed:
        out['images'] = len(ticket.get('images') or [])
    return out


def clean_fields(fields) -> list[str] | None:
    """The field list as a list of known names, or None when it isn't one."""
    if not isinstance(fields, list) or not all(isinstance(f, str) for f in fields):
        return None
    if any(f not in FIELDS for f in fields):
        return None
    return [f for f in FIELDS if f in fields]  # canonical order, no duplicates


try:
    _migrate()
except Exception as _error:  # a database that is down is reported by the first request
    print(f' tickets: migration skipped ({_error})')
