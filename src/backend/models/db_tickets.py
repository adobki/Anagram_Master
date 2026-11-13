#!/usr/bin/python3
"""Feedback tickets in the MongoDB database.

One document per submission in the `tickets` collection. Screenshots are kept
inside the document as binary (at most 6 and 4 MB in all, far below MongoDB's
16 MB document limit), so no file storage is needed.
"""
from bson import Binary, ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone
from utils import db, isAlive, DESCENDING


class DBTickets:
    """Feedback tickets"""
    __db = db['tickets']

    @staticmethod
    def isAlive() -> bool:
        """Checks MongoDB database connection status"""
        if not isAlive():
            raise ConnectionError('MongoDB database connection failed!')
        return True

    def add(self, ticket: dict, images: list[tuple[str, bytes]]) -> str:
        """Saves a ticket. `images` is a list of (mime type, bytes). Returns the new id."""
        self.isAlive()
        doc = {**ticket, 'created_at': datetime.now(timezone.utc),
               'images': [{'type': mime, 'size': len(data), 'data': Binary(data)}
                          for mime, data in images]}
        return str(self.__db.insert_one(doc).inserted_id)

    def list(self, limit: int = 200) -> list[dict]:
        """Newest tickets first, without the image bytes (they have their own route)."""
        self.isAlive()
        tickets = []
        for doc in self.__db.find({}, {'images.data': 0}).sort('created_at', DESCENDING).limit(limit):
            doc['id'] = str(doc.pop('_id'))
            tickets.append(doc)
        return tickets

    def image(self, ticket_id: str, n: int) -> tuple[str, bytes] | None:
        """(mime type, bytes) of a ticket's nth image, or None."""
        self.isAlive()
        try:
            doc = self.__db.find_one({'_id': ObjectId(ticket_id)}, {'images': 1})
        except InvalidId:
            return None
        images = (doc or {}).get('images') or []
        if not 0 <= n < len(images):
            return None
        return images[n]['type'], bytes(images[n]['data'])
