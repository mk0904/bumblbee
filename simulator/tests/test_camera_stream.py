import queue
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'controllers/mission_control'))
from camera_stream import CameraStream

class CameraBufferTest(unittest.TestCase):
    def test_bounded_buffer_keeps_latest_owned_frame(self):
        # Exercise handoff without starting a real socket/worker.
        stream=CameraStream.__new__(CameraStream)
        stream.frames=queue.Queue(1)
        stream.dropped=0
        raw=bytearray(b'first')
        stream.offer(raw,640,360,1)
        raw[0]=0
        self.assertEqual(stream.frames.queue[0][0],b'first')
        stream.offer(b'second',640,360,2)
        self.assertEqual(stream.frames.qsize(),1)
        self.assertEqual(stream.frames.get_nowait(),(b'second',640,360,2))
        self.assertEqual(stream.dropped,1)

if __name__=='__main__':unittest.main()
