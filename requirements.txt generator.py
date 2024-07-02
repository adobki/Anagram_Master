#!/usr/bin/python3
"""Generates a requirements.txt file for building/deploying this project"""

if __name__ == '__main__':
    # from os import system
    # system('pip freeze > requirements.txt')

    from subprocess import check_output

    file_name = 'requirements.txt'
    with open(file_name, 'w', newline='\n') as file:
        cmd = 'pip freeze'
        requirements = check_output(cmd).decode().replace('\r\n', '\n')
        file.write(requirements)
        print(f'`{cmd}`: \n{requirements}')
    with open(file_name) as file:
        print(f'{file_name}: \n{file.read()}')
