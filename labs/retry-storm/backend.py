"""Trivial backend: logs every request it actually receives, responds
instantly. Stands in for "Fraud" from circuit-breakers.md's Why This
Exists section — a dependency that is otherwise healthy and fast, whose
only problem is that responses aren't reaching the caller in time
(simulated by Toxiproxy, not by this server)."""
import http.server
import sys


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        # /health is the container healthcheck's path — deliberately not
        # logged, so it never contaminates the request counts the retry-storm
        # exercises measure via `docker logs | grep -c`.
        if self.path == "/health":
            self.send_response(200)
            self.end_headers()
            return
        print(f"backend received request from {self.client_address}", flush=True)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    http.server.HTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
