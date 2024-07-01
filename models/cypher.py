#!/usr/bin/python3
"""Cypher class for encrypting and decrypting cookie data"""
from cryptography.fernet import Fernet
from os import environ


# secret_key = Fernet.generate_key()  # Gets a new key & ends previous sessions

# Load secret key from environment variable and initialise Fernet client
secret_key = environ.get('am_cypher_key').encode()
cypher = Fernet(secret_key)


class Cypher:
    """Cryptography class"""
    cypher = cypher

    @staticmethod
    def encrypt(message: bytes | str) -> str:
        """Encrypts the given message using a secret key"""
        encoded = cypher.encrypt(str(message).encode())
        return encoded.decode()

    @staticmethod
    def decrypt(code: bytes | str) -> str:
        """Decrypts the given message using a secret key"""
        message = cypher.decrypt(str(code).encode())
        return message.decode()

    @staticmethod
    def generate_key() -> bytes:
        """Returns a new cryptography key"""
        return Fernet.generate_key()

    def __getattr__(self, item) -> None:
        """Prevents error when unknown attribute is requested."""
        print(f'{item} is not a valid attribute of {self.__class__.__name__}')
        return None


if __name__ == '__main__':
    print('\n ----------------------------------------------------------- \n')
    b = Cypher.encrypt('Mad o!')
    print(b)
    print(Cypher.decrypt(b))
    print(Cypher.cypher)
    print(Cypher.generate_key())
