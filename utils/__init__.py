#!/usr/bin/python3
"""Initializes the utilities package"""
from .auxiliary import dictionary, health, getRoundWords, isAnagram
from .MongoDB import DBRecords, db, isAlive, DESCENDING, PyMongoErrors

records = DBRecords()

// Print health status on module import
print(f' status: {health()}\n')
