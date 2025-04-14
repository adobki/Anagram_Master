#!/usr/bin/python3
""" Contains Game engine class used to manage game sessions """
from copy import deepcopy
from datetime import datetime
from math import ceil
from models.db_game import DBGame
from models.db_scores import DBScores
from utils import isAnagram, getRoundWords, dictionary


class Game:
    """Class used to manage game engine data."""

    @staticmethod
    def now():
        """Returns current date and time"""
        return datetime.now()

    def __init__(self, name: str = None, host_id: str = None, _id: str = None):
        """Initialises game session."""
        self.__db = DBGame()
        self.__db_scores = DBScores()
        if name:
            self.new(name, host_id)  # New game requested
        elif _id:
            self.__id = str(_id)     # Load game requested
            self.load(_init=True)
        else:
            error = 'ERROR: name or _id must be given to create/load game'
            raise SyntaxError(error)

        # self.players = []  # Use for multiplayer sessions

    def __update(self, payload: dict):
        """Updates the current game session using data from a payload"""
        self.__session_id = payload.get('session_id')
        self.__host_id = payload.get('host_id')
        # self.__priority .get()(= load['priority'])
        self.__status = payload['status']
        self.__name = payload.get('name')
        self.__round_time = payload.get('round_time')
        self.__time_limit = payload.get('time_limit')
        self.__rounds_limit = payload.get('rounds_limit')
        self.__score = payload.get('score')
        self.__words = payload.get('words')
        self.__created_at = payload.get('created_at')
        self.__updated_at = payload.get('updated_at')

    def __save(self, **kwargs):
        """Updates the current game session in the database then returns"""
        if not self.active:  # Check if current session is active
            error = 'Save Failed! Game session is already over'
            raise SyntaxError(error)

        update = dict()
        for key in self.db.mutable:
            if key in kwargs.keys():
                update[key] = kwargs[key]

        return self.db.update(update)

    def load(self, _init: bool = False):
        """Reads a game session from the database"""
        self.__update(self.db.load(self.id))
        return self.status if not _init else None

    def new(self, name, host_id: str = None):
        """Creates a new game session."""
        # Prevents accidental game resets
        if self.__id:
            error = 'ERROR: Can\'t create a new game session from an active one'
            raise SyntaxError(error)

        # Check words dictionary status
        if not dictionary:
            error = 'FileStorage I/O Error. Contact admin to fix it'
            raise IOError(error)

        words = getRoundWords(dictionary, self.db.rounds_limit,
                              self.db.word_len_min, self.db.word_len_max)
        payload = self.db.new(name, words, host_id)
        self.__id = payload['_id']
        self.__update(payload)

        return {'id': payload['_id'], **self.status}

    def new_round(self, forced: bool = False) -> str | None:
        """Starts a new game round in the current game session"""
        if not self.active:  # Check if current session is active
            return 'Game session is already over'

        words, used = self.words, self.used_words
        # End game session if there are no new round words left
        if not words:
            if forced:
                self.end()
            return 'ERROR: This is the last word for the game'

        # Update words and return True
        self.__words = {'words': words[:-1], 'used': {**used, words[-1]: []}}
        self.__round_time = self.now()
        self.__new_round = True
        self.__update(self.db.update({
            'words': self.__words,
            'round_time': self.__round_time,
            'score': self.score,  # This is for easy bonus computation in play()
        }))

    def play(self, word: str = None):
        """Submits a word from player and updates the current game's status"""
        if not self.active:  # Check if current session is active
            error = 'Game session is already over'
            # raise SyntaxError(error)
            return {**self.status, 'error': error}
        if not dictionary:  # Check words dictionary status
            error = 'FileStorage I/O Error. Contact admin to fix it'
            raise IOError(error)
        if self.time <= 0:  # Check if time is up for the current round
            self.__error = self.new_round(forced=True)
            return self.status
        if not word or not isinstance(word, str):  # Data validation
            return self.status

        word = word.lower()
        root_word = self.word.lower()
        used_words = [key[0] for key in self.used_words[root_word]]
        correct = [key[1] for key in self.used_words[root_word]].count(True)
        score, updates, new_round, error = self.score, dict(), False, None

        # Check if given word is the root word for the current round
        if word == root_word:
            error = 'You can\'t use the given word!<br>' \
                      'Try forming a new word from it instead.'
        # Check if given word has already been played in this round
        elif word in used_words:
            score -= 2               # Penalise player for invalid input
            error = f'ERROR: Duplicate word! Try another'
        # Validate and score given word
        else:
            # valid = isAnagram(word, root_word)
            valid = isAnagram(word, root_word) and word in dictionary
            if valid:  # Reward player for valid input
                bonus = 10 if len(word) == len(root_word) else 0
                # Add bonus if correct words limit reached
                if correct == self.__rounds_limit - 1:
                    bonus += 50
                    new_round = True  # Triggers round switch below
                score += ceil(10 * len(word) / len(root_word)) + bonus
            else:
                score -= 2  # Penalise player for invalid input
                error = f'ERROR: Invalid word! Try another'
            # Add new word to player's used words
            self.__words['used'][root_word].append([word, valid])
            updates['words'] = self.__words

        # Fix negative score and check if score has changed
        score = 0 if score < 0 else score
        if score != self.score:
            updates['score'] = score

        # Update and save game session if scores or used words was updated
        if new_round:
            self.__score = score
            error = self.new_round()
        elif updates:
            payload = self.__save(**updates)
            self.__update(payload)

        # Sort player's submitted words for the current root word
        # self.__words['used'][root_word].sort()
        words = {**deepcopy(self.used_words),  # # # MOVE SORTING TO FRONTEND !!!
                 root_word: sorted(self.used_words[root_word])}
        # deepcopy(self.__words['used'][root_word])

        # Return updated game session (with error message if any)
        if error:
            return {**self.status, 'words': words, 'error': error}
        return {**self.status, 'words': words}

    def end(self) -> str | None:
        """Ends the current game session"""
        if not self.active:  # Check if current session is active
            return 'Game session is already over'

        # Add player's score to highscores database if it's up to the threshold
        if self.score >= self.__db_scores.min_score:
            self.__db_scores.add(name=self.name, score=self.score)
            self.__save(status=False)
        else:
            self.db.delete(_id=self.id)

        # Update game's status
        self.__status = False

    @property
    def db(self) -> DBGame:
        """Getter for db attribute"""
        return self.__db

    @property
    def id(self) -> str:
        """Getter for id attribute"""
        return str(self.__id)

    @property
    def active(self) -> bool:
        """Getter for status attribute"""
        return self.__status

    @property
    def name(self) -> str:
        """Getter for name attribute"""
        return self.__name

    @property
    def words(self) -> list[str]:
        """Getter for words attribute"""
        return self.__words['words']

    @property
    def used_words(self) -> dict[str, list[str, bool]]:
        """Getter for words attribute"""
        return self.__words['used']

    @property
    def word(self) -> str | None:
        """Getter for word attribute"""
        if not self.active:  # Check if current session is active
            return None
        return list(self.used_words.keys())[-1]

    @property
    def score(self) -> int:
        """Getter for score attribute"""
        return self.__score

    @property
    def time(self):
        """Getter for time_limit attribute"""
        if not self.active:  # Check if current session is active
            return 0
        time = self.__time_limit - ceil(
            self.now().timestamp() - self.__round_time.timestamp())
        return 0 if time <= 0 else time

    @property
    def status(self) -> dict:
        date_format = '%d/%m/%Y %H:%M:%S'

        """Returns dictionary of Game statistics."""
        status = {
            'created_at':   self.__created_at.strftime(date_format),
            'session_id':   self.__session_id,
            'host_id':      self.__host_id,
            # 'priority':     self.__priority,
            'status':       self.active,
            'name':         self.name,
            'time':         self.time,
            'time_limit':   self.__time_limit,
            'round':        self.__rounds_limit - len(self.words),
            'rounds_limit': self.__rounds_limit,
            'score':        self.__score,
            'word':         self.word,
            'words':        self.used_words,
            'updated_at':   self.__updated_at.strftime(date_format),
        }

        # End game if last round and player has run out of time
        if self.active and not self.time and \
                status['round'] == status['rounds_limit']:
            self.end()
            return {'error': 'Time up! Game is over'}

        # Notifies frontend that round has changed
        if self.__new_round:
            status['new_round'] = True
            self.__new_round = False

        # Append new_round() error if any
        if self.__error:
            status['error'] = self.__error
            del self.__error

        # Return player's game statistics
        return status

    def __getattr__(self, attr):
        """Prevents error when unknown attribute is requested"""
        # print(f'{item} is not a valid attribute of {self.__class__.__name__}')
        # if attr in attributes.keys():
        #     return attributes[attr]
        return None

    def __repr__(self):
        """Returns string representation of game object"""
        return f'{self.__class__.__name__}({self.status})'

    def __str__(self):
        """String representation of Game statistics for printing"""
        return str(self.status)
