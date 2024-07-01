#!/usr/bin/python3
"""Game session class for MongoDB database abstraction"""
from bson import ObjectId
from copy import deepcopy
from datetime import datetime
from utils import db, isAlive, records
from uuid import uuid4


# Alias used for typedef in the DBGame class below
# type GameSession = dict[str, datetime | str | bool | int | None]
GameSession = dict[str, datetime | str | bool | int | None]


class DBGame:
    """Game engine class for game sessions"""
    __db = db['sessions']
    __word_len_min = 8
    __word_len_max = 17
    __rounds_limit = 20
    __time_limit = 120

    @staticmethod
    def now():
        """Creates timestamp of current date/time"""
        return datetime.now()

    @staticmethod
    def isAlive() -> bool:
        """Checks MongoDB database connection status"""
        if not isAlive():
            raise ConnectionError('MongoDB database connection failed!')
        return True

    def __init__(self):
        """Initialises a new game session"""
        # Create new, temporary session
        self.__isNew = True
        self.__synced = False
        self.__init = True
        self.__temp = True
        self.__session = self.new(name=None, words=None)

    def __validate(self, session: dict):
        """Protected method used to validate game session data"""
        # Validate session_id
        session_id = session.get('session_id')
        if not session_id or not isinstance(session_id, str):
            error = 'session_id must be a session_id string'
            raise ValueError(error)
        # Validate status
        status = session.get('status')
        if not isinstance(status, bool):
            error = 'status must be of type bool'
            raise ValueError(error)
        # Validate word_len_min
        word_len_min = session.get('word_len_min')
        if not isinstance(word_len_min, int) or word_len_min <= 1:
            error = 'word_len_min must be an integer > 1'
            raise ValueError(error)
        # Validate word_len_max
        word_len_max = session.get('word_len_max')
        if not isinstance(word_len_max, int) or word_len_max < word_len_min:
            error = 'word_len_max must be an integer >= word_len_min'
            raise ValueError(error)
        # Validate time_limit
        time_limit = session.get('time_limit')
        if not isinstance(time_limit, int) or time_limit < 1:
            error = 'time_limit must be a positive integer'
            raise ValueError(error)
        # Validate round_limit
        rounds_limit = session.get('rounds_limit')
        if not isinstance(rounds_limit, int) or rounds_limit < 1:
            error = 'rounds_limit must be a positive integer'
            raise ValueError(error)
        # Validate score
        score = session.get('score')
        if not isinstance(score, int) or score < 0:
            error = 'score must be an integer >= 0'
            raise ValueError(error)
        # Validate name
        name = session.get('name')
        if not isinstance(name, str) or len(name) < 3:
            error = 'name must be a string with 3 or more characters'
            raise ValueError(error)
        # Validate host_id                              (OPTIONAL: can be None)
        host_id = session.get('host_id')
        if host_id is not None and not isinstance(host_id, str):
            error = 'host_id must be a session_id string or None'
            raise ValueError(error)
        # Validate round_time                           (OPTIONAL: can be None)
        round_time = session.get('round_time')
        if round_time is not None and not isinstance(round_time, datetime):
            error = 'round_time must be type datetime.datetime or None'
            raise ValueError(error)
        # Validate timestamps                         (SPECIAL: Fixed on error)
        if not isinstance(session.get('created_at'), datetime):
            session['created_at'] = None
        if not isinstance(session.get('updated_at'), datetime):
            session['updated_at'] = self.now()
        # Validate words
        words_dict = session.get('words')
        if not isinstance(words_dict, dict) or not words_dict:
            error = 'words must be dict({"words": [], "used": []})'
            raise ValueError(error)
        words = session.get('words').get('words')  # (OPTIONAL: can be [])
        # if not isinstance(words, list) or not words:
        if not isinstance(words, list):
            error = 'words["words"] must be a list of words'
            raise ValueError(error)
        for i, word in enumerate(words):
            if not isinstance(word, str) or not word:
                error = f'invalid word: `{word}`[{i}]'
                raise ValueError(error)
        used = session.get('words').get('used')
        if not isinstance(used, dict):
            error = 'words["used"] must be a dictionary of round words'
            raise ValueError(error)
        for i, used_words in enumerate(used.items()):
            word, answers = used_words
            if not isinstance(answers, list):
                error = f'words["used"][{i}]: {word} must be a list of answers'
                raise ValueError(error)
            for j, value in enumerate(answers):
                ans, correct = value
                if not isinstance(ans, str):
                    error = f'words["used"][{i}][{j}] must be a string'
                    raise ValueError(error)
                if not isinstance(correct, bool):
                    error = f'words["used"][{i}][{j}]: {ans} must be type bool'
                    raise ValueError(error)

        # Apply validated session to current one and mark session as ready
        self.__session = session
        self.__synced = False
        self.__init = False

    def __save(self) -> GameSession:
        """Protected method used to save a new game session to the database"""
        self.isAlive()  # Check connection status before proceeding

        # Prevent saving if changes haven't been made
        if self.__synced:
            return self.__session
        # Prevent saving temporary session
        if self.__isNew and self.__init:
            error = 'No active game session! Use new or load method first'
            raise SyntaxError(error)
        # Ensure game session is a new one to prevent duplication
        if not self.__isNew:
            error = 'Only new games can be saved. Use update instead'
            raise SyntaxError(error)
        # Check data validation status
        if self.__init:
            self.__validate(self.__session)
        # Start round timer if new game session
        if not self.__session.get('round_time'):
            self.__session['round_time'] = self.now()

        # Add update timestamp
        self.__session['round_time'] = self.now()

        # Create new player_id and write game session to database
        saved = self.__db.insert_one({**self.__session, '_id': ObjectId()})
        if not saved.acknowledged:
            error = 'Save operation failed'
            raise IOError(error)

        # Update player_id and return session
        self.__session['_id'] = str(saved.inserted_id)
        self.__synced = True
        records.log('create')  # Log current database CRUD operation
        return self.__session

    def new(self, name: str, words: list[str],
            host_id: str = None) -> GameSession:
        """Creates a new game session"""
        session = {
            'created_at':   self.now(),
            '_id':          None,
            'session_id':   uuid4().__str__(),
            'host_id':      host_id if host_id else None,
            'status':       True,
            'name':         name,
            'round_time':   None,
            'word_len_min': self.word_len_min,
            'word_len_max': self.word_len_max,
            'time_limit':   self.time_limit,
            'rounds_limit': self.rounds_limit,
            'score':        0,
            'words':        {'words': None, 'used': None} if not words else
                            {'words': words[:-1], 'used': {words[-1]: []}},
            'updated_at':   None,
        }

        # Return new session if called from init
        if self.__temp:
            self.__temp = False
            return session

        # Validate session data and apply, then save and return it
        self.__validate(session)
        self.__isNew = True
        return self.__save()

    def load(self, _id: ObjectId) -> GameSession:
        """Loads an existing game session from the database"""
        self.isAlive()  # Check connection status before proceeding

        # Load game with current ID from the database
        session = self.__db.find_one({'_id': ObjectId(_id)})
        if not session:
            error = 'No game with given player_id exists'
            raise ValueError(error)
        # Convert _id to str for easy processing
        session['_id'] = str(session['_id'])

        # Validate loaded session and apply it to current
        self.__validate(session)

        self.__init = False
        self.__isNew = False
        self.__synced = True
        records.log('read')  # Log current database CRUD operation
        return self.__session

    def update(self, update: dict) -> GameSession:
        """Updates an existing game session in the database then returns it"""
        self.isAlive()  # Check connection status before proceeding

        # Prevent updating temporary session
        if self.__isNew and self.__init:
            error = 'No active game session! Use new or load method first'
            raise SyntaxError(error)
        # Check data validation status
        if self.__init:
            self.__validate(self.__session)
        # Start round timer if new game session
        if not self.__session.get('round_time'):
            self.__session['round_time'] = self.now()
        # Data validation
        if not isinstance(update, dict):
            error = f'update must be a dict of mutable session data'
            raise ValueError(error)

        # Process given values
        session = self.__session
        valid_keys = self.mutable
        updates = 0
        for key in update.keys():
            if key not in valid_keys:
                error = f'{key} is invalid. Only {valid_keys} can be updated'
                raise ValueError(error)
            # Skip key if value is unchanged
            if session[key] != update[key]:
                session[key] = update[key]
                updates += 1

        # Do nothing if no values were changed
        if not updates:
            return self.__session

        # Validate and apply updates to current session
        self.__validate(session)

        # Add update timestamp
        self.__session['updated_at'] = update['updated_at'] = self.now()

        # Write updated game session to database
        _filter = {'_id': ObjectId(self.id)}
        updated = self.__db.find_one_and_update(_filter, {'$set': update})
        if not updated:
            error = 'Update operation failed'
            raise IOError(error)

        # Return updated session
        self.__synced = True
        records.log('update')  # Log current database CRUD operation
        return self.__session

    def delete(self, _id: ObjectId = None) -> GameSession:
        """Removes a game session from the database"""
        self.isAlive()  # Check connection status before proceeding

        # Data validation
        if _id is not None:
            _id = ObjectId(_id)
        else:
            # Check session status
            if self.__isNew and self.__init:
                error = 'No active game session! Use new or load method first'
                raise SyntaxError(error)

        # Load and cache game with current ID from the database
        cache = self.__db.find_one({'_id': ObjectId(_id if _id else self.id)})
        if not cache:
            error = 'No game with given player_id exists'
            raise ValueError(error)

        # Remove game session from the database
        deleted = self.__db.delete_one({'_id': _id if _id else self.id})
        if not deleted.deleted_count:
            adjective = 'given' if _id else 'current'
            error = f'No game with {adjective} player_id exists'
            raise ValueError(error)

        # Reset current session and return the deleted one
        self.__init__()
        records.log('delete')  # Log current database CRUD operation
        return cache

    @property
    def mutable(self):
        """List of attributes that can be changed with the update method"""
        return 'round_time', 'score', 'status', 'words'

    @property
    def id(self):
        """Getter for game session/player's id"""
        return self.__session['_id']

    @property
    def word_len_min(self):
        """Minimum word length for round words in a game session"""
        return self.__word_len_min

    @property
    def word_len_max(self):
        """Maximum word length for round words in a game session"""
        return self.__word_len_max

    @property
    def rounds_limit(self):
        """Total number of rounds in a game session"""
        return self.__rounds_limit

    @property
    def time_limit(self):
        """Time limit for each round in a game session"""
        return self.__time_limit

    @property
    def session(self):
        """Getter for game session"""
        return deepcopy(self.__session) if not self.__init else None

    @property
    def keys(self):
        """List of keys/attributes in a game session (self.__session.keys())"""
        return list(self.__session.keys())

    def __getattr__(self, item):
        """Prevents error when unknown attribute is requested"""
        # print(f'{item} is not a valid attribute of {self.__class__.__name__}')
        if item in self.keys:
            return self.session[item]
        return None

    def __repr__(self):
        """Returns string representation of this object"""
        name = self.__class__.__name__
        return f'< {name} >' if self.__init else f'{name}({self.__session})'

    def __str__(self):
        """Returns string of this object"""
        name = self.__class__.__name__
        return f'< {name} >' if self.__init else f'{name}({self.__session})'
