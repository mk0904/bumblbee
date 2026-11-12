#!/bin/sh
set -eu
SIM_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
WEBOTS_EXECUTABLE=${WEBOTS_EXECUTABLE:-/Applications/Webots.app/Contents/MacOS/webots}
if [ ! -x "$SIM_ROOT/simulator/.venv/bin/python3" ]; then
  echo 'Create simulator/.venv with Python 3.11, then pip install -r simulator/requirements.txt.' >&2
  exit 1
fi
export PATH="$SIM_ROOT/simulator/.venv/bin:$PATH"
exec "$WEBOTS_EXECUTABLE" --port=1250 --mode=realtime --stdout --stderr "$SIM_ROOT/simulator/worlds/training-ground-v1.wbt"
