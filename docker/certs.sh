#!/bin/sh
# Creates a local CA (docker/certs/ca/) and a server cert (docker/certs/cert.pem, key.pem) with mkcert in a container.
# The cert covers localhost, this machine's hostname and LAN IPs, plus any extra names given as arguments:
#   ./docker/certs.sh 192.168.0.50 ukemochi.local
# Re-run after the LAN IP changes; the CA is reused, so phones keep trusting it.
set -eu

dir="$(cd "$(dirname "$0")" && pwd)/certs"
mkdir -p "$dir/ca"

name="$(uname -n)"
# LAN IPv4s, skipping Docker bridges.
ips="$(ip -4 -o addr show scope global 2>/dev/null | awk '$2 !~ /^(docker|br-|veth)/ {split($4, a, "/"); print a[1]}' || true)"

docker run --rm \
  -v "$dir:/certs" \
  -e CAROOT=/certs/ca \
  golang:1.26-alpine sh -c '
    set -eu
    go install filippo.io/mkcert@v1.4.4
    mkcert -cert-file /certs/cert.pem -key-file /certs/key.pem "$@"
    apk add -q openssl
    echo "CA fingerprint (compare on each device):"
    openssl x509 -in /certs/ca/rootCA.pem -noout -fingerprint -sha256
    chown -R '"$(id -u):$(id -g)"' /certs
  ' mkcert localhost 127.0.0.1 ::1 "$name" "$name.local" $ips "$@"

echo "CA to install on devices: $dir/ca/rootCA.pem (also served at http://<this-pc>/ca.crt)"
