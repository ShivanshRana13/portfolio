from __future__ import annotations

import http.server
import os
import socketserver
import time
from typing import Iterable


WATCH_EXTS = (".html", ".css", ".js")


def newest_mtime(root: str) -> float:
    latest = 0.0
    for dirpath, _dirnames, filenames in os.walk(root):
        # Skip hidden directories (e.g., .git) to keep polling cheap.
        if "/." in dirpath.replace("\\", "/"):
            continue
        for name in filenames:
            if not name.endswith(WATCH_EXTS):
                continue
            path = os.path.join(dirpath, name)
            try:
                latest = max(latest, os.path.getmtime(path))
            except OSError:
                # File may have been deleted between walk and stat.
                continue
    return latest


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        # Avoid caching during local development so edits show up immediately.
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def do_GET(self) -> None:
        if self.path == "/__live":
            self._serve_sse()
            return
        super().do_GET()

    def _serve_sse(self) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

        root = os.getcwd()
        last = newest_mtime(root)

        try:
            # Initial ping so the browser knows we're connected.
            self.wfile.write(b"event: connected\ndata: ok\n\n")
            self.wfile.flush()

            while True:
                time.sleep(0.5)
                now = newest_mtime(root)
                if now > last:
                    last = now
                    self.wfile.write(b"event: reload\ndata: 1\n\n")
                    self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            return


def main() -> None:
    # Simple local static server. No user input is used for paths/commands.
    port = 5173
    with socketserver.ThreadingTCPServer(("127.0.0.1", port), Handler) as httpd:
        print(f"Serving on http://127.0.0.1:{port}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
