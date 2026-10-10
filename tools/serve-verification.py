"""Serve local browser checks without filling the command session's log pipe."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Browser checks retain HTTP failures in their own results.


class VerificationServer(ThreadingHTTPServer):
    request_queue_size = 128


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8772)
    parser.add_argument("--directory", default=".")
    args = parser.parse_args()
    directory = Path(args.directory).resolve()
    if not directory.is_dir():
        parser.error("directory must exist")
    handler = partial(QuietHandler, directory=str(directory))
    with VerificationServer(("127.0.0.1", args.port), handler) as server:
        print(f"Verification HTTP: http://127.0.0.1:{args.port}/ ({directory}; queue 128)", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
