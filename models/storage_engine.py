#!/usr/bin/python3
"""Contains file storage engine class for loading/saving data to file system"""
from json import dumps, loads


class Storage:
    """Class serialises/deserialises words and scores to/from a JSON file"""

    def __init__(self):
        """Set private attributes for new instance."""
        self.__types = ('words', 'scores')
        self.__paths = {'words': 'api/v1/storage_data/words.txt',
                        'scores': 'api/v1/storage_data/scores.json'}

    def save(self, f_type: str, data: list):
        """Serialises data to a JSON file"""
        # Data validation
        if f_type not in self.__types:
            return {'error': 'ERROR: Invalid storage type was specified'}
        elif f_type != self.__types[1]:
            return {'error':
                    'ERROR: Read-only storage type. Only scores can be saved'}
        # Open and write to file then return written data or error on failure
        try:
            data = dumps(sorted(data, reverse=True))
            with open(self.__paths[f_type], 'w', encoding='UTF-8') as my_file:
                my_file.write(data)
            return data
        except Exception as e:
            return {'error': f'ERROR: {e}'}

    def load(self, f_type: str):
        """Deserialises data from a JSON file"""
        # Data validation
        if f_type not in self.__types:
            return {'error': 'ERROR: Invalid storage type was specified'}
        # Open and read file then return read data or error on failure
        try:
            with open(self.__paths[f_type], 'r', encoding='UTF-8') as my_file:
                if f_type == 'words':
                    data = my_file.readlines()
                else:
                    data = loads(my_file.read())
                    # Convert lists back to tuple and sort it
                    data = sorted([tuple(item) for item in data])
            return data
        except Exception as e:
            return {'error': f'ERROR: {e}'}

    def __getattr__(self, item):
        """Prevents error when unknown attribute is requested."""
        print(f'{item} is not a valid attribute of {self.__class__.__name__}')
        return None


if __name__ == '__main__':
    print(Storage().save('words', [None, True]), end='\n\n')

    scores = [(1024, "Erick Kiminza"),
              (999, "Bernie"),
              (900, "Klopp"),
              (900, "Donald"),
              (880, "Brandon"),
              (850, "Kelechukwu"),
              (800, "Trident"),
              (800, "I am Groot"),
              (800, "China"),
              (720, "Bernie Gets Man"),
              (700, "Samuel"),
              (690, "Stacey"),
              (686, "Clark"),
              (680, "Tesla"),
              (666, "Willis"),
              (404, "Smith"),
              (240, "Angela"),
              (120, "Christiana"),
              (64, "Ocean"),
              (10, "Jason")]
    print(scores)
    fs = Storage()
    fs.save('scores', scores)
    scores = fs.load('scores')
    print(scores)

    with open('storage_data/words.txt', 'rt', encoding='UTF-8') as file:
        words = file.readlines()
    print()
    print(len(words), '=', words[:9])
    # Remove trailing newline character and print again
    words = list(map(str.strip, words))
    print(len(words), '=', words[:9])
