""" Starts Anagram Master WSGI Web Application Server """

if __name__ == "__main__":
    from os import name

    if name == 'nt':
        # Actions for Windows OS
        from api.api import app as am_api
        from paste.translogger import TransLogger
        from waitress import serve

        log_format = (' %(REMOTE_ADDR)s %(REMOTE_USER)s [%(time)s]'
                      ' %(REQUEST_METHOD)s "%(REQUEST_URI)s"'
                      ' %(status)s %(bytes)s\n')

        options = {'application':           am_api,
                   'setup_console_handler': False,
                   'logger_name':           'AnagramMaster',
                   'format':                log_format}

        serve(TransLogger(**options),
              port=5555, threads=4, ident='AnagramMaster')
    else:
        # Actions for other/UNIX-based operating systems
        from subprocess import check_output

        check_output('python -m gunicorn --bind :5555 --workers=3 api.api:app')
