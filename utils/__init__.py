#!/usr/bin/python3
"""Initializes the utilities package"""
from .MongoDB import DBRecords, db, isAlive, DESCENDING, PyMongoErrors

records = DBRecords()
def health():
    """Returns health status of utilities"""
    return { 'Database':    bool(isAlive()) }

print(f' status: {health()}\n')
