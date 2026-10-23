"""Render the code-native won mark to PNG using only Python's standard library."""
import argparse
import math
import struct
import zlib
from pathlib import Path


def render(size):
    scale = size / 512
    points = [(162, 142), (204, 370), (256, 225), (308, 370), (350, 142)]
    segments = [((136, 166), (376, 166)), ((136, 212), (376, 212))]
    segments += list(zip(points, points[1:]))
    pixels = bytearray(bytes([18, 60, 53, 255]) * size * size)
    for start, end in segments:
        ax, ay = start[0] * scale, start[1] * scale
        bx, by = end[0] * scale, end[1] * scale
        radius = 13.5 * scale
        vx, vy = bx - ax, by - ay
        length = vx * vx + vy * vy
        for y in range(max(0, int(min(ay, by) - radius - 1)), min(size, math.ceil(max(ay, by) + radius + 1))):
            for x in range(max(0, int(min(ax, bx) - radius - 1)), min(size, math.ceil(max(ax, bx) + radius + 1))):
                t = max(0, min(1, ((x + .5 - ax) * vx + (y + .5 - ay) * vy) / length))
                distance = math.hypot(x + .5 - (ax + t * vx), y + .5 - (ay + t * vy))
                alpha = max(0, min(1, radius + .5 - distance))
                if alpha:
                    offset = (y * size + x) * 4
                    for channel, color in enumerate((212, 234, 179)):
                        pixels[offset + channel] = round(pixels[offset + channel] * (1 - alpha) + color * alpha)
    raw = b''.join(b'\x00' + pixels[y * size * 4:(y + 1) * size * 4] for y in range(size))
    def chunk(kind, content):
        return struct.pack('!I', len(content)) + kind + content + struct.pack('!I', zlib.crc32(kind + content) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', size, size, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--size', type=int, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(render(args.size))
