#!/bin/sh
# Lance Playwright en ajoutant les bibliothèques système si disponibles localement.
# En CI (ubuntu-latest + --with-deps), les libs sont dans les chemins standard.
set -e

LOCAL_LIBS="/tmp/chromium-libs/usr/lib/x86_64-linux-gnu:/tmp/chromium-libs/usr/lib"
LOCAL_CACHE=".playwright-cache"

if [ -d "/tmp/chromium-libs/usr/lib/x86_64-linux-gnu" ]; then
  export LD_LIBRARY_PATH="${LOCAL_LIBS}${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi

if [ -z "$PLAYWRIGHT_BROWSERS_PATH" ] && [ -d "$LOCAL_CACHE" ]; then
  export PLAYWRIGHT_BROWSERS_PATH="$LOCAL_CACHE"
fi

exec npx playwright test "$@"
