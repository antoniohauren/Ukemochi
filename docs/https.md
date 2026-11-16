# HTTPS on the LAN

nginx serves the apps over HTTPS with a certificate signed by a local CA made with `mkcert`.
Every phone and PC that opens the app must trust that CA once.

## Create the certificate
```
make certs                          # or ./docker/certs.sh
./docker/certs.sh 192.168.0.50      # add names/IPs not detected automatically
```
- Runs `mkcert` in a container. No install on the host.
- Covers `localhost`, the PC hostname (`<name>`, `<name>.local`) and its LAN IPs.
- Output in `docker/certs/` (git-ignored): `cert.pem`, `key.pem`, and the CA in `ca/`.
- `make dev` runs it when `docker/certs/cert.pem` is missing.
- LAN IP changed? Run it again. The CA stays the same, so devices keep trusting it.
- Never share `ca/rootCA-key.pem`. Anyone with it can impersonate any site to devices that trust the CA.

## Get the CA onto a device
With the stack running, open `http://<pc-ip>/ca.crt` on the device (plain HTTP).
Or copy `docker/certs/ca/rootCA.pem` to the device.

The download is plain HTTP, so check it is the real CA: compare the SHA-256 fingerprint the device shows
(certificate details) with the one `./docker/certs.sh` prints. They must match exactly.

## Install the CA
**Android** (10+, menu names vary by brand)
1. Download `ca.crt`.
2. Settings → Security → More security settings → Encryption & credentials → Install a certificate → CA certificate.
3. Confirm "Install anyway" and pick the file.

**iOS / iPadOS**
1. Open `http://<pc-ip>/ca.crt` in Safari → Allow (downloads a profile).
2. Settings → Profile Downloaded → Install.
3. Settings → General → About → Certificate Trust Settings → turn on full trust for "mkcert ...".

**Windows**
1. Copy `rootCA.pem`, rename it to `rootCA.crt`, double-click it.
2. Install Certificate → Local Machine → Place in "Trusted Root Certification Authorities" → Finish.
3. Restart the browser.

**Linux (the server PC)**
```
sudo trust anchor docker/certs/ca/rootCA.pem         # Arch / Fedora
sudo cp docker/certs/ca/rootCA.pem /usr/local/share/ca-certificates/ukemochi.crt && sudo update-ca-certificates   # Debian / Ubuntu
```
Chrome and Firefox on Linux keep their own store: import it under Settings → Certificates → Authorities.

## Check
Open `https://<pc-ip>/up`. It shows a page with no certificate warning.
