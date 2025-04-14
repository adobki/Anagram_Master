#!/usr/bin/python3
"""Client for MongoDB Atlas database access"""
from datetime import datetime
from os import environ
from pymongo import MongoClient, ReturnDocument, DESCENDING, errors as PyMongoErrors
from time import sleep

# Load credentials from environment variables and initialise MongoDB client
host = environ.get('am_database_host')
usr = environ.get('am_database_user')
pwd = environ.get('am_database_pass')
uri = f'mongodb+srv://{usr}:{pwd}@{host}/?retryWrites=true&w=majority'
client = MongoClient(uri)
db = client['AnagramMaster']
now = datetime.now


def isAlive():
    """Returns the connection status of the MongoDB client"""
    try:
        return db.command('ping')
    # except (PyMongoErrors.ConnectionFailure, PyMongoErrors.OperationFailure):
    except Exception:
        return False


# Log connection status
if not isAlive():
    msg = {'error': 'MongoDB database connection failed!'}
else:
    msg = {'success': 'MongoDB database connected!'}
print(f'\n MongoDB: {msg}\n')


sleep(.1)  # Prevents shutdown error if script terminates before end of init


class DBRecords:
    """Records Game Engine's database CRUD operations"""
    def __init__(self):
        """Initialises a new instance of the class"""
        self.__db = db['admin']
        self.__id = {'_id': 'GameEngine'}
        self.__records = self.__db.find_one_and_update(self.__id, {
                '$inc': {'run_count': 1},
                '$set': {'boot_time': now(), 'updated_at': now()},
                '$setOnInsert': {'created_at': now(), 'sessions_created': 0,
                                 'sessions_reads': 0, 'sessions_updates': 0,
                                 'sessions_deleted': 0},
        }, upsert=True, return_document=ReturnDocument.AFTER)
        if not self.__records:
            error = 'MongoDB IO error'
            raise IOError(error)

    def log(self, key: str = 'create | read | update | delete'):
        """Logs a CRUD operation"""
        if key == 'create' or key == 'delete':
            key = f'sessions_{key}d'
        elif key == 'read' or key == 'update':
            key = f'sessions_{key}s'
        else:
            error = 'Invalid key! Valid keys are create, update, and delete'
            raise ValueError(error)

        update = {'$inc': {key: 1}, '$set': {'updated_at': now()}}
        return self.__db.update_one(self.__id, update)

    @property
    def all(self):
        """Returns current records"""
        return self.__db.find_one(self.__id)


if __name__ == '__main__':
    records = DBRecords()
    print(f'\n\nrecords = {records.all}\n\n')
    sleep(0.321)
    records.log('create')
    records.log('read')
    records.log('update')
    records.log('delete')
    sleep(0.321)
    print(f'\n\nrecords = {records.all}\n\n')
    records.log('del')
