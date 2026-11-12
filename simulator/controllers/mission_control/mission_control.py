# Stabilization/motor mixing adapted from Cyberbotics mavic2pro_patrol.py.
# Copyright 1996-2025 Cyberbotics Ltd. Apache-2.0; see NOTICE and LICENSE.
"""Sensor-driven Webots mission executor. No pose writes, teleporting or network waits."""
import json
import math
import queue
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from transport import BridgeTransport
from camera_stream import CameraStream

ROOT = Path(__file__).resolve().parents[3]

def clamp(v, low, high):
    return min(high, max(low, v))


def angle_error(target, current):
    """Shortest signed angular difference, including the +/-pi crossing."""
    return math.atan2(math.sin(target-current), math.cos(target-current))


def next_heading(current, desired, seconds, rate=0.35):
    return current + clamp(angle_error(desired, current), -rate*seconds, rate*seconds)


def desired_velocity(target, pos, speed):
    desired = [0.2*(target[i]-pos[i]) for i in (0, 1)]
    magnitude = math.hypot(*desired)
    return [v*speed/magnitude for v in desired] if magnitude > speed else desired


def validate(command, state, flight):
    if datetime.fromisoformat(command['expiresAt'].replace('Z', '+00:00')) <= datetime.now(timezone.utc):
        raise ValueError('Command expired')
    if command['action'] == 'START_MISSION':
        if state not in ('IDLE', 'COMPLETED'):
            raise ValueError('Drone busy')
        s = command['snapshot']
        if s['worldId'] != 'training-ground-v1' or s['frame'] != 'WORLD_LOCAL_V1':
            raise ValueError('Wrong world/frame')
        points = s['waypoints']
        if not 1 <= len(points) <= 20:
            raise ValueError('Invalid route length')
        for p in points:
            if not all(isinstance(p[k], (int, float)) and not isinstance(p[k], bool) and math.isfinite(p[k]) for k in ('x', 'y', 'altitude')):
                raise ValueError('Non-finite coordinate')
            speed = p.get('speed', 1)
            if isinstance(speed, bool) or not isinstance(speed, (int, float)) or not math.isfinite(speed) or not 0.2 <= speed <= 2:
                raise ValueError('Waypoint speed outside 0.2–2 m/s')
            if abs(p['x']) > 50 or abs(p['y']) > 50 or not 2 <= p['altitude'] <= 15:
                raise ValueError('Waypoint outside bounds')
    elif command['flightId'] != flight or (command['action'], state) not in (
        ('PAUSE', 'EXECUTING'), ('RESUME', 'PAUSED'), ('LAND', 'TAKING_OFF'),
        ('LAND', 'EXECUTING'), ('LAND', 'PAUSED')):
        raise ValueError('Illegal command/state')


class MissionController:
    def __init__(self):
        from controller import Robot
        self.robot = Robot()
        self.dt = int(self.robot.getBasicTimeStep())
        self.gps = self.robot.getDevice('gps')
        self.imu = self.robot.getDevice('inertial unit')
        self.gyro = self.robot.getDevice('gyro')
        for sensor in (self.gps, self.imu, self.gyro):
            sensor.enable(self.dt)
        self.motors = [self.robot.getDevice(n + ' propeller') for n in
                       ('front left', 'front right', 'rear left', 'rear right')]
        for motor in self.motors:
            motor.setPosition(float('inf'))
            motor.setVelocity(0)
        cache = ROOT / 'simulator/.runtime'
        cache.mkdir(exist_ok=True)
        self.db = sqlite3.connect(cache / 'commands.sqlite')
        self.db.execute('CREATE TABLE IF NOT EXISTS commands (id TEXT PRIMARY KEY, flight TEXT, status TEXT)')
        self.db.execute('CREATE TABLE IF NOT EXISTS flights (id TEXT PRIMARY KEY, status TEXT)')
        self.db.commit()
        # Never replay prior movement after restart. Explicit operator reconciliation required.
        self.blocked = bool(self.db.execute("SELECT 1 FROM commands WHERE status='ACCEPTED'").fetchone() or
                            self.db.execute("SELECT 1 FROM flights WHERE status='ACTIVE'").fetchone())
        self.transport = BridgeTransport(ROOT)
        self.camera = self.robot.getDevice('camera')
        self.camera.enable(200)
        self.robot.getDevice('camera pitch').setPosition(0.7)
        self.camera_stream = CameraStream(self.transport)
        self.next_camera = 0.2
        self.state = 'IDLE' 
        self.flight = None
        self.sequence = 0
        self.target = [0, 0, 0]
        self.previous = None
        self.last_sample = -1
        self.pending = None
        self.start = None
        self.index = 0
        self.settled = 0
        self.reason = None
        self.started_at = 0
        self.horizontal = [0.0, 0.0]
        self.heading = 0.0

    def result(self, identity, status, error=None):
        payload = {'commandId': identity, 'status': status}
        if error:
            payload['error'] = error[:200]
        self.db.execute('UPDATE commands SET status=? WHERE id=?', (status, identity))
        self.db.commit()
        self.transport.send('command_result', payload)
        print(json.dumps({'event': 'command_result', **payload}), flush=True)

    def sample(self, pos, attitude, speed):
        if not self.flight:
            return
        self.sequence += 1
        payload = dict(flightId=self.flight, epochId=self.transport.epoch, sequence=self.sequence,
            simulationTime=self.robot.getTime()-self.started_at, x=pos[0], y=pos[1], altitude=max(0, pos[2]),
            speed=speed, roll=attitude[0], pitch=attitude[1], yaw=attitude[2], waypoint=self.index,
            state=self.state, battery=max(0, 100-(self.robot.getTime()-self.started_at)*0.03),
            batterySource='synthetic')
        if self.reason:
            payload['reason'] = self.reason
        self.transport.send('telemetry', payload)
        self.last_sample = self.robot.getTime()
        print(json.dumps({'event': 'flight_sample', **payload}), flush=True)

    def command(self, c, pos, attitude, speed):
        identity = c.get('id')
        try:
            prior = self.db.execute('SELECT status FROM commands WHERE id=?', (identity,)).fetchone()
            if prior:
                self.transport.send('command_result', {'commandId': identity, 'status': prior[0]})
                return
            validate(c, self.state, self.flight)
            if self.blocked:
                raise ValueError('Prior controller outcome needs reconciliation')
            self.db.execute('INSERT INTO commands VALUES (?,?,?)', (identity, c['flightId'], 'ACCEPTED'))
            self.db.commit()
            self.result(identity, 'ACCEPTED')
            if c['action'] == 'START_MISSION':
                self.flight, self.points = c['flightId'], c['snapshot']['waypoints']
                self.start, self.index, self.sequence = identity, 0, 0
                self.reason = None
                self.heading = attitude[2]
                self.started_at = self.robot.getTime()
                self.target = [pos[0], pos[1], self.points[0]['altitude']]
                self.db.execute('INSERT INTO flights VALUES (?,?)', (self.flight, 'ACTIVE'))
                self.db.commit()
                self.state = 'TAKING_OFF' 
            elif c['action'] == 'PAUSE':
                self.heading = attitude[2]
                self.target = list(pos)
                self.state = 'PAUSED'
            elif c['action'] == 'RESUME':
                self.state = 'EXECUTING'
            else:
                self.heading = attitude[2]
                self.state = 'LANDING'
                self.target = list(pos)
                self.pending = identity
            self.sample(pos, attitude, speed)
            if c['action'] in ('PAUSE', 'RESUME'):
                self.result(identity, 'COMPLETED')
        except (ValueError, KeyError, TypeError) as error:
            self.transport.send('command_result', {'commandId': identity, 'status': 'REJECTED', 'error': str(error)[:200]})

    def run(self):
        while self.robot.step(self.dt) != -1:
            now = self.robot.getTime()
            if now >= self.next_camera:
                raw = self.camera.getImage()
                if raw:
                    self.camera_stream.offer(raw, self.camera.getWidth(), self.camera.getHeight(), now)
                self.next_camera = now + 0.2
            pos = list(self.gps.getValues())
            attitude = list(self.imu.getRollPitchYaw())
            gyro = self.gyro.getValues()
            if not all(math.isfinite(v) for v in pos + attitude + list(gyro)):
                continue
            velocity = [(a-b)/(self.dt/1000) for a,b in zip(pos, self.previous or pos)]
            self.previous = pos
            speed = math.hypot(*velocity[:2])
            try:
                self.command(self.transport.incoming.get_nowait(), pos, attitude, speed)
            except queue.Empty:
                pass
            if self.state in ('IDLE', 'COMPLETED', 'FAILED'):
                continue
            if self.state != 'LANDING' and (self.transport.failed or time.monotonic()-self.transport.last_ack > 5):
                self.state, self.target, self.reason = 'LANDING', list(pos), 'Local contact-loss landing'
                self.sample(pos, attitude, speed)
            if self.state == 'TAKING_OFF' and abs(pos[2]-self.target[2]) < 0.4 and abs(velocity[2]) < 0.3:
                self.state = 'EXECUTING'
                self.sample(pos, attitude, speed)
                self.result(self.start, 'COMPLETED')
            if self.state == 'EXECUTING':
                point = self.points[self.index]
                self.target = [point['x'], point['y'], point['altitude']]
                if math.hypot(pos[0]-self.target[0], pos[1]-self.target[1]) < 0.6 and abs(pos[2]-self.target[2]) < 0.4 and speed < 0.45:
                    self.settled += self.dt/1000
                else:
                    self.settled = 0
                if self.settled > 0.5:
                    self.settled = 0
                    if self.index + 1 < len(self.points):
                        self.index += 1
                    else:
                        self.state, self.target = 'LANDING', list(pos)
                        self.sample(pos, attitude, speed)
            if self.state == 'LANDING':
                self.target[2] = max(-0.5, self.target[2] - 0.5*self.dt/1000)
                if pos[2] < 0.12 and abs(velocity[2]) < 0.15 and speed < 0.2:
                    self.settled += self.dt/1000
                else:
                    self.settled = 0
                if self.settled > 0.5:
                    for motor in self.motors:
                        motor.setVelocity(0)
                    self.db.execute("UPDATE flights SET status='LANDED' WHERE id=?", (self.flight,))
                    self.db.commit()
                    self.state = 'COMPLETED' 
                    self.reason = self.reason or 'Sensor-confirmed touchdown in Webots'
                    self.sample(pos, attitude, speed)
                    if self.pending:
                        self.result(self.pending, 'COMPLETED')
                        self.pending = None
                    if self.start:
                        # Early landing can supersede an uncompleted takeoff.
                        self.db.execute("UPDATE commands SET status='COMPLETED' WHERE flight=? AND status='ACCEPTED'", (self.flight,))
                        self.db.commit()
                    continue
            if abs(roll := attitude[0]) > 0.7 or abs(attitude[1]) > 0.7:
                for motor in self.motors:
                    motor.setVelocity(0)
                self.state, self.reason = 'FAILED', 'Attitude limit exceeded; motors stopped'
                self.db.execute("UPDATE flights SET status='FAILED' WHERE id=?", (self.flight,))
                self.db.commit()
                self.sample(pos, attitude, speed)
                if self.pending:
                    self.result(self.pending, 'FAILED', self.reason)
                continue
            # PD position hold in the measured body frame; slew-limited route heading.
            # Speed belongs to the incoming leg ending at the current waypoint.
            limit = self.points[self.index].get('speed', 1) if self.state == 'EXECUTING' else 1
            desired = desired_velocity(self.target, pos, limit)
            ax = clamp(1.5*(desired[0]-velocity[0]), -0.6, 0.6)
            ay = clamp(1.5*(desired[1]-velocity[1]), -0.6, 0.6)
            self.horizontal[0] += clamp(ax-self.horizontal[0], -0.008, 0.008)
            self.horizontal[1] += clamp(ay-self.horizontal[1], -0.008, 0.008)
            ax, ay = self.horizontal
            roll, pitch, yaw = attitude
            forward = ax*math.cos(yaw)+ay*math.sin(yaw)
            left = -ax*math.sin(yaw)+ay*math.cos(yaw)
            r = 50*clamp(roll,-1,1)+gyro[0]+left
            p = 30*clamp(pitch,-1,1)+gyro[1]-forward
            if self.state == 'EXECUTING':
                dx, dy = self.target[0]-pos[0], self.target[1]-pos[1]
                if math.hypot(dx, dy) > 1.2:
                    self.heading = next_heading(self.heading, math.atan2(dy, dx), self.dt/1000)
            y = clamp(angle_error(self.heading, yaw)*0.8-gyro[2]*0.2,-1,1)
            vertical = 3*clamp(self.target[2]-pos[2]+0.6,-1,1)**3
            thrust = 68.5+vertical
            for motor, value in zip(self.motors, (thrust-y+p-r, -(thrust+y+p+r), -(thrust+y-p-r), thrust-y-p+r)):
                motor.setVelocity(clamp(value,-100,100))
            if now-self.last_sample >= 0.5:
                self.sample(pos, attitude, speed)


if __name__ == '__main__':
    MissionController().run()
