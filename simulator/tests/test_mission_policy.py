import copy
from datetime import datetime, timedelta, timezone
import sys
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'controllers/mission_control'))
from mission_control import validate
from transport import validate_command_envelope
from uuid import uuid4

class MissionPolicyTest(unittest.TestCase):
    def setUp(self):
        self.command = dict(id='test', flightId='flight', action='START_MISSION',
            expiresAt=(datetime.now(timezone.utc)+timedelta(seconds=10)).isoformat(),
            snapshot=dict(worldId='training-ground-v1', frame='WORLD_LOCAL_V1',
                          waypoints=[dict(x=4, y=3, altitude=3)]))

    def test_transport_envelope_rejects_malformed_commands(self):
        c = dict(self.command, id=str(uuid4()), flightId=str(uuid4()))
        self.assertEqual(validate_command_envelope(c), c)
        for bad in [None, [], dict(c, id='bad'), dict(c, action='ARM'), dict(c, expiresAt=None)]:
            with self.assertRaises((ValueError, KeyError, TypeError)):
                validate_command_envelope(bad)

    def test_valid_start_and_busy_rejection(self):
        validate(self.command, 'IDLE', None)
        with self.assertRaises(ValueError): validate(self.command, 'EXECUTING', 'flight')

    def test_expired_command(self):
        self.command['expiresAt'] = '2020-01-01T00:00:00Z'
        with self.assertRaises(ValueError): validate(self.command, 'IDLE', None)

    def test_invalid_frame_and_coordinate_boundary(self):
        for key, value in [('frame','GPS'), ('worldId','other')]:
            c = copy.deepcopy(self.command)
            c['snapshot'][key] = value
            with self.assertRaises(ValueError): validate(c, 'IDLE', None)
        for key, value in [('x',51), ('y',float('nan')), ('altitude',1), ('x',True)]:
            c = copy.deepcopy(self.command)
            c['snapshot']['waypoints'][0][key] = value
            with self.assertRaises(ValueError): validate(c, 'IDLE', None)

    def test_command_state_and_flight_fencing(self):
        self.command['action'] = 'PAUSE'
        validate(self.command, 'EXECUTING', 'flight')
        for state, flight in [('TAKING_OFF','flight'), ('EXECUTING','other')]:
            with self.assertRaises(ValueError): validate(self.command, state, flight)
        self.command['action'] = 'LAND'
        validate(self.command, 'TAKING_OFF', 'flight')
        self.command['action'] = 'RESUME'
        validate(self.command, 'PAUSED', 'flight')
        with self.assertRaises(ValueError): validate(self.command, 'LANDING', 'flight')

if __name__ == '__main__': unittest.main()
