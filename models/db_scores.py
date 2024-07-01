#!/usr/bin/python3
"""Highscores class for MongoDB database abstraction"""
from datetime import datetime
from utils import db, isAlive, DESCENDING


class DBScores:
    """Highscores class"""
    __min_score = 10

    @staticmethod
    def isAlive() -> bool:
        """Checks MongoDB database connection status"""
        if not isAlive():
            raise ConnectionError('MongoDB database connection failed!')
        return True

    def __init__(self):
        """Set private attributes for new instance"""
        self.__db = db['scores']

    def load(self, limit: int = 0) -> list[tuple]:
        """Loads specified number of top highscores scores from the database"""
        self.isAlive()  # Check connection status before proceeding

        sort = [('score', DESCENDING), 'date']
        scores = []
        for doc in self.__db.find().sort(sort).limit(limit):
            try:
                scores.append((doc['score'], doc['name'], doc['date']))
            except KeyError:
                continue  # Skip invalid database record
        return scores

    def add(self, name: str, score: int) -> None:
        """Adds a player's score to the database"""
        self.isAlive()  # Check connection status before proceeding

        # Data validation
        if not isinstance(name, str):
            error = 'ERROR: name must be a string'
            raise ValueError(error)
        if not isinstance(score, int) or score < self.min_score:
            error = f'ERROR: score must be an integer >= {self.min_score}'
            raise ValueError(error)
        # Save player's score
        add = self.__db.insert_one({'name': name,
                                    'score': score,
                                    'date': datetime.now()})
        if not add.acknowledged:
            error = 'ERROR: Failed to save player\'s score'
            raise IOError(error)

    def remove(self, name: str, score: int) -> None:
        """Removes a player's score from the database"""
        self.isAlive()  # Check connection status before proceeding

        # Data validation
        if not isinstance(name, str):
            error = 'ERROR: name must be a string'
            raise ValueError(error)
        if not isinstance(score, int):
            error = 'ERROR: score must be an int'
            raise ValueError(error)
        # Remove score
        remove = self.__db.delete_one({'name': name, 'score': score})
        if not remove.deleted_count:
            error = 'ERROR: Failed to remove player\'s score'
            raise IOError(error)

    @property
    def min_score(self):
        """Minimum score/score threshold for highscores"""
        return self.__min_score

    def __getattr__(self, item) -> None:
        """Prevents error when unknown attribute is requested."""
        print(f'{item} is not a valid attribute of {self.__class__.__name__}')
        return None
