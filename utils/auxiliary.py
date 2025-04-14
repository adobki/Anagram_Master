#!/usr/bin/python3
""" Contains auxiliary/miscellaneous functions """
from random import sample
from models.storage_engine import Storage
from utils.MongoDB import isAlive


def getWords():
    """Loads words list from storage."""
    fs = Storage()
    words = fs.load('words')
    # Return words in lowercase with hanging whitespace characters removed
    return [word.lower().strip() for word in words]


def getRoundWords(words: list | tuple, count: int = 20,
                  min_len: int = 8, max_len: int = 17) -> list[str] | dict:
    """
    Returns from the given list the specified number of words with a length
    that is between the specified minimum and maximum number of characters.

    :param words: Given words list.
    :param count: Number of words to return.
    :param min_len: Minimum number of letters a chosen word must have.
    :param max_len: Maximum number of letters a chosen word must have.
    :return: New list with specified words on success,
             empty list otherwise.
    """
    if not isinstance(words, list) and not isinstance(words, tuple) or not words:
        return {'error': 'ValueError: words must be a list/tuple of strings'}
    if not isinstance(count, int) or count <= 0:
        return {'error': 'ValueError: count must be a positive integer'}
    if not isinstance(min_len, int) or min_len <= 0:
        return {'error': 'ValueError: min_len must be a positive integer'}
    if not isinstance(max_len, int) or max_len < min_len:
        return {'error': 'ValueError: max_len must be an integer >= min_len'}

    try:
        valid_words = filter(lambda x: min_len <= len(x) <= max_len, words)
        return sample(list(valid_words), k=count)
    except TypeError:
        return {'error': 'TypeError: words must be a list of ONLY strings'}
    except ValueError:
        err = f'{len(list(valid_words))} < {count}'
        return {'error': f'ValueError: matched words less than count ({err})'}


def isAnagram(word: str, root: str) -> bool:
    """Function checks if a user's word can be formed using only
    the letters from the given root word, provided word != root.

    :param word: Letters to be checked in root.
    :param root: Should contain all letters in word.
    :return: True if word can be formed from root,
             False otherwise.
    """

    if not isinstance(word, str) or not isinstance(root, str):
        return False
    if word.lower() == root.lower():
        return False

    word_idx = root_idx = 0
    word, root = sorted(word.lower()), sorted(root.lower())
    while word_idx < len(word) and root_idx < len(root):
        if word[word_idx] == root[root_idx]:
            word_idx += 1
        root_idx += 1
    return True if word_idx == len(word) else False


def health():
    """Returns connection statuses for MongoDB and FileStorage utilities"""
    return {'Database':    bool(isAlive()),
            'FileStorage': bool(dictionary)}


# Prepare words dictionary
dictionary = None
try:
    dictionary = getWords()
except Exception as err:
    print(f'ERROR: {err}')


if __name__ == '__main__':
    word_list = ('developer', 'programming', 'javA', 'JAVA', 'JavaScript',
                 8748934, 'ChatGPT', 'API', 'YouTube', 'YOUTUBE', 'youtube')
    w = 0
    worded = 'lOeEeRV'
    rooted = word_list[w]

    print(f'{worded}\n{rooted}\n')
    print('Success!') if isAnagram(worded, rooted) else print('Error!')

    word_list = tuple(str(val) for val in word_list)
    print(word_list)
    print()
    print(getRoundWords(word_list, 1, 8, 17))
