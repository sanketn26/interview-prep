"""Backend identity server: answers with its own BACKEND_ID env var so the
load balancer's distribution is directly observable, and slow-sleeps for
SLEEP_MS to simulate one backend being genuinely slower (for least-conn
vs round-robin comparisons)."""
import http.server
import os
import time

BACKEND_ID = os.environ.get("BACKEND_ID", "unknown")
SLEEP_MS = int(os.environ.get("SLEEP_MS", "0"))


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.end_headers()
            return
        if SLEEP_MS:
            time.sleep(SLEEP_MS / 1000)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(BACKEND_ID.encode())

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    http.server.HTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
