#!/usr/bin/env bash
# Runs ON the VPS (uploaded and started by validate-on-vps.ps1). Everything happens under a temp directory and
# on loopback ports 3091/8081/8443. It never edits /etc/nginx, never reloads the live Nginx, never touches PM2
# or the production site, and copies no real secrets (it uses a dummy env file).
set -u
SRC=${1:-/tmp/koko-validate.tgz}
D=$(mktemp -d /tmp/koko-validate.XXXXXX)
IMG=koko-validate:test
CTR=koko-validate-test
RESULTS=()
pass() { RESULTS+=("PASS  $1"); echo "[PASS] $1"; }
fail() { RESULTS+=("FAIL  $1"); echo "[FAIL] $1"; }
step() { echo; echo "=== $1"; }
cleanup() {
  [ -f "$D/nginx.pid" ] && kill "$(cat "$D/nginx.pid")" 2>/dev/null
  docker rm -f "$CTR" >/dev/null 2>&1
  docker rmi "$IMG" >/dev/null 2>&1
  rm -rf "$D" "$SRC"
  echo; echo "Temp files, test container and test image removed."
}
trap cleanup EXIT

step "0. Environment"
docker --version; docker compose version; nginx -v 2>&1; df -h / | tail -1
echo "-- existing containers (read-only)"; docker ps -a --format "table {{.Names}}	{{.Image}}	{{.Status}}	{{.Ports}}"
echo "-- listening TCP ports"; ss -ltn | awk "NR==1||/LISTEN/"
for p in 3091 8081 8443; do ss -ltn | grep -q ":$p " && { echo "Port $p is already in use; aborting."; exit 1; }; done
cd "$D" && tar xzf "$SRC" || { echo "could not unpack source"; exit 1; }

step "1. Dummy environment (public build values only, no secrets)"
cat > .env.staging <<'ENV'
STUDIO_ENV=staging
STUDIO_LICENSE_ENABLED=false
STUDIO_WEB_ORIGIN=https://studio-staging.kokomemory.com
NEXT_PUBLIC_APP_URL=https://studio-staging.kokomemory.com
NEXT_PUBLIC_SITE_URL=https://studio-staging.kokomemory.com
NEXT_PUBLIC_FIREBASE_API_KEY=dummy-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=dummy.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=dummy-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=dummy.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1
NEXT_PUBLIC_FIREBASE_APP_ID=1:1:web:dummy
NEXT_PUBLIC_R2_PUBLIC_URL=
ENV

step "2. docker compose config"
if docker compose --env-file .env.staging -f deploy/hostinger/docker-compose.staging.yml config >"$D/compose.out" 2>"$D/compose.err"; then
  pass "docker compose config (file valid, all variables resolve)"; grep -E "published|host_ip|image:|container_name" "$D/compose.out"
else fail "docker compose config"; cat "$D/compose.err"; fi
# a missing required variable must be refused, not silently built
if docker compose --env-file /dev/null -f deploy/hostinger/docker-compose.staging.yml config >/dev/null 2>&1; then fail "compose accepted an empty env (required-variable guard not working)"; else pass "compose refuses to build when required variables are missing"; fi

step "3. docker build (the real image build; takes a few minutes and some CPU/RAM)"
ARGS=$(grep -E '^NEXT_PUBLIC_' .env.staging | sed 's/^/--build-arg /' | tr '\n' ' ')
if docker build -f deploy/hostinger/Dockerfile $ARGS -t "$IMG" . >"$D/build.log" 2>&1; then pass "docker build"; else fail "docker build"; tail -40 "$D/build.log"; fi

step "4. Run the container the way compose does"
if docker image inspect "$IMG" >/dev/null 2>&1; then
  docker run -d --name "$CTR" -p 127.0.0.1:3091:3000 --env-file .env.staging -e NODE_ENV=production "$IMG" >/dev/null
  for i in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:3091/api/studio/health && break; sleep 1; done
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3091/api/studio/health)
  [ "$code" = "200" ] && pass "container serves /api/studio/health (200)" || { fail "container health returned $code"; docker logs "$CTR" 2>&1 | tail -20; }
  [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3091/koko-studio)" = "200" ] && pass "/koko-studio renders (200)" || fail "/koko-studio"
  [ "$(docker exec "$CTR" id -u)" != "0" ] && pass "runs as non-root user" || fail "container runs as root"
  docker exec "$CTR" node -e "fetch('http://127.0.0.1:3000/api/studio/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" && pass "healthcheck command works inside the container" || fail "healthcheck command"
  docker exec "$CTR" sh -c 'ls .env* 2>/dev/null | wc -l' | grep -q '^0$' && pass "no .env files baked into the image" || fail ".env file found inside image"
  docker image inspect "$IMG" --format 'image size: {{.Size}} bytes'
fi

step "5. Nginx: syntax check of the real vhost files on the VPS's Nginx, in an isolated config"
openssl req -x509 -nodes -newkey rsa:2048 -days 1 -subj "/CN=studio-staging.kokomemory.com" -keyout "$D/key.pem" -out "$D/cert.pem" >/dev/null 2>&1
mkdir -p "$D/tmp"
wrap() { # $1 vhost file  $2 output conf  $3 mode(check|run)
  sed -e "s#/etc/letsencrypt/live/studio-staging.kokomemory.com/fullchain.pem#$D/cert.pem#" \
      -e "s#/etc/letsencrypt/live/studio-staging.kokomemory.com/privkey.pem#$D/key.pem#" \
      -e "s#root /var/www/html;#root $D;#" "$1" > "$D/vhost.tmp"
  if [ "$3" = "run" ]; then
    sed -i -e '/listen \[::\]/d' -e 's#listen 80;#listen 127.0.0.1:8081;#' -e 's#listen 443 ssl;#listen 127.0.0.1:8443 ssl;#' \
        -e 's#proxy_pass http://127.0.0.1:3001#proxy_pass http://127.0.0.1:3091#' -e 's#return 301 https://\$host\$request_uri;#return 301 https://$host:8443$request_uri;#' "$D/vhost.tmp"
  fi
  cat > "$2" <<CONF
pid $D/nginx.pid;
error_log $D/error.log;
events {}
http {
  access_log off;
  client_body_temp_path $D/tmp/body; proxy_temp_path $D/tmp/proxy; fastcgi_temp_path $D/tmp/fcgi; uwsgi_temp_path $D/tmp/uwsgi; scgi_temp_path $D/tmp/scgi;
  include $D/vhost.tmp;
}
CONF
}
for f in nginx-http-bootstrap.conf.example nginx-https.conf.example; do
  wrap "deploy/hostinger/$f" "$D/check.conf" check
  if nginx -t -c "$D/check.conf" >"$D/nginx-t.out" 2>&1; then pass "nginx -t: $f"; else fail "nginx -t: $f"; cat "$D/nginx-t.out"; fi
done

step "6. Nginx proxy behaviour on private ports (separate instance, live Nginx untouched)"
if docker ps --format '{{.Names}}' | grep -q "^$CTR$"; then
  wrap deploy/hostinger/nginx-https.conf.example "$D/run.conf" run
  if nginx -c "$D/run.conf" 2>"$D/nginx-run.err"; then
    sleep 1
    r=$(curl -sk --resolve studio-staging.kokomemory.com:8443:127.0.0.1 -o /dev/null -w '%{http_code}' https://studio-staging.kokomemory.com:8443/api/studio/health -H 'X-Real-IP: 6.6.6.6')
    [ "$r" = "200" ] && pass "HTTPS vhost proxies to the app (200)" || fail "HTTPS proxy returned $r"
    r=$(curl -s -o /dev/null -w '%{http_code}' --resolve studio-staging.kokomemory.com:8081:127.0.0.1 http://studio-staging.kokomemory.com:8081/)
    [ "$r" = "301" ] && pass "HTTP redirects to HTTPS (301)" || fail "HTTP redirect returned $r"
    curl -skI --resolve studio-staging.kokomemory.com:8443:127.0.0.1 https://studio-staging.kokomemory.com:8443/ | grep -i strict-transport >/dev/null && pass "HSTS header present" || fail "HSTS header missing"
  else fail "could not start the isolated Nginx"; cat "$D/nginx-run.err"; fi
else echo "(skipped: container not running)"; fi

step "7. Live site untouched"
for h in kokomemory.com admin.kokomemory.com; do printf "%s: " "$h"; curl -s -o /dev/null -m 15 -w '%{http_code}\n' "https://$h/"; done

echo; echo "================ SUMMARY ================"
printf '%s\n' "${RESULTS[@]}"
