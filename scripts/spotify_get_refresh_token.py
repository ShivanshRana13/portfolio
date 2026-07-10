#!/usr/bin/env python3
"""One-time helper to obtain a Spotify refresh token for the now-playing pill."""

from __future__ import annotations

import base64
import os
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer


SCOPES = "user-read-currently-playing"
REDIRECT_URI = "http://127.0.0.1:8888/callback"


def load_env(path: str) -> dict[str, str]:
    values: dict[str, str] = {}
    if not os.path.exists(path):
        return values
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip()
    return values


def main() -> None:
    env = load_env(".env")
    client_id = os.environ.get("SPOTIFY_CLIENT_ID") or env.get("SPOTIFY_CLIENT_ID", "")
    client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET") or env.get("SPOTIFY_CLIENT_SECRET", "")

    if not client_id or not client_secret:
        print("Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to .env first.")
        return

    params = urllib.parse.urlencode(
        {
            "client_id": client_id,
            "response_type": "code",
            "redirect_uri": REDIRECT_URI,
            "scope": SCOPES,
        }
    )
    auth_url = f"https://accounts.spotify.com/authorize?{params}"
    print("Opening Spotify login...")
    webbrowser.open(auth_url)

    code_holder: dict[str, str] = {}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            query = urllib.parse.urlparse(self.path).query
            data = urllib.parse.parse_qs(query)
            code = data.get("code", [""])[0]
            if code:
                code_holder["code"] = code
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(b"<h1>Spotify connected. You can close this tab.</h1>")
            else:
                self.send_response(400)
                self.end_headers()

        def log_message(self, _format: str, *_args: object) -> None:
            return

    server = HTTPServer(("127.0.0.1", 8888), Handler)
    print("Waiting for Spotify redirect on http://127.0.0.1:8888/callback ...")
    while "code" not in code_holder:
        server.handle_request()

    body = urllib.parse.urlencode(
        {
            "grant_type": "authorization_code",
            "code": code_holder["code"],
            "redirect_uri": REDIRECT_URI,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://accounts.spotify.com/api/token",
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic "
            + base64.b64encode(f"{client_id}:{client_secret}".encode()).decode(),
        },
    )

    with urllib.request.urlopen(request) as response:
        payload = response.read().decode("utf-8")

    print("Spotify response:")
    print(payload)
    print("\nCopy refresh_token into Netlify env vars as SPOTIFY_REFRESH_TOKEN.")


if __name__ == "__main__":
    main()
