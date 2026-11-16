# Phase 1 flight evidence

Status: WORLD/SENSOR BASELINE PASSED; FLIGHT NOT RUN.

Observed 2026-11-16 on macOS 27.2:
- Webots: R2025b Nightly Build 13/11/2026, commit c85603f2280c68ebdcc0a4102e43026fcbf2bc71.
- Interpreter reported by controller: Python 3.9.6, /Library/Developer/CommandLineTools/usr/bin/python3.
- World: simulator/worlds/training-ground-v1.wbt; project-authored ground/markings.
- Model: pinned Cyberbotics Mavic2Pro EXTERNPROTO, Webots assets license; source and attribution in simulator/README.md.
- Controller: project-authored world_check.py, motors explicitly OFF; no backend connection.
- Axes: explicit ENU, pad surface (0,0,0), x/y horizontal, z positive up. Dynamic direction verification pending.
- Timestep: 8 ms.
- Actual launch: --port=1250 --mode=realtime --stdout --stderr simulator/worlds/training-ground-v1.wbt.
- Controller started and repeated finite GPS/IMU/gyro samples through at least 80 simulation seconds.
- At t=2 s: position [-0.0053082553373, -2.2057e-9, 0.0657087278743] m;
  roll/pitch/yaw [1.1202e-6, -0.0697419895828, 1.32159e-5] rad, gyro [0,0,0].
  The ground contact/reference-point offset is expected; not flight evidence.
- Webots emitted an Apple GPU compatibility warning and reduced visual quality; physics/sensor controller ran.
- Initial asset download required Internet; clean offline reproducibility not yet verified.

## Remaining acceptance
- Original bundled flight example: NOT RUN.
- Takeoff/hover: NOT RUN.
- Target navigation accuracy and dynamic coordinate validation: NOT RUN.
- Landing and three repeat flights: NOT RUN.
- Dashboard transport/watchdog/reconciliation: NOT RUN.

Do not mark complete based on grounded diagnostics, mocked telemetry or frontend animation.
