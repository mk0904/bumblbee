"""Grounded sensor baseline for FR-10 / NFR-08; no flight or network execution."""

import json
import math
import sys

from controller import Robot


def main():
    robot = Robot()
    timestep = int(robot.getBasicTimeStep())
    for name in (
        "front left propeller", "front right propeller",
        "rear left propeller", "rear right propeller",
    ):
        motor = robot.getDevice(name)
        motor.setPosition(float("inf"))
        motor.setVelocity(0.0)

    gps = robot.getDevice("gps")
    imu = robot.getDevice("inertial unit")
    gyro = robot.getDevice("gyro")
    for sensor in (gps, imu, gyro):
        sensor.enable(timestep)
    print(json.dumps({
        "event": "world_check_started", "worldId": "training-ground-v1",
        "frame": "WORLD_LOCAL_V1", "timestepMs": timestep,
        "python": sys.version.split()[0], "executable": sys.executable,
        "motors": "OFF", "backendConnected": False,
    }), flush=True)
    next_report = 1.0
    while robot.step(timestep) != -1:
        if robot.getTime() < next_report:
            continue
        position = list(gps.getValues())
        attitude = list(imu.getRollPitchYaw())
        angular_velocity = list(gyro.getValues())
        valid = all(math.isfinite(v) for v in position + attitude + angular_velocity)
        print(json.dumps({
            "event": "world_check_sample", "simulationTime": robot.getTime(),
            "sensorsFinite": valid, "position": position if valid else None,
            "rollPitchYaw": attitude if valid else None,
            "gyro": angular_velocity if valid else None, "motors": "OFF",
        }, allow_nan=False), flush=True)
        next_report = robot.getTime() + 1.0


if __name__ == "__main__":
    main()
