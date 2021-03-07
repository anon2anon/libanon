#!/usr/bin/env python3
import argparse
import os
import pathlib
import re
import subprocess


PART_SIZE_SEC = 120
RESERVE_SEC = 4


def get_duration_sec(video_path):
    p = subprocess.Popen(['ffmpeg', '-i', video_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    out, err = p.communicate()
    t = re.search(r'Duration: (\d+):(\d+):(\d+)', err.decode())
    if t is None:
        print(err.decode())
        print('Cannot find the video')
        exit(1)
    return 3600 * int(t.group(1)) + 60 * int(t.group(2)) + int(t.group(3))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Split audio from video into pieces of length 2m.')
    parser.add_argument('-i', '--input', required=True, help='path to video')
    parser.add_argument('-o', '--output', required=True, help='output directory')
    args = parser.parse_args()
    duration = get_duration_sec(args.input)
    parts = max(1, int(round(duration / PART_SIZE_SEC)))
    pathlib.Path(args.output).mkdir(parents=True, exist_ok=True)
    for i in range(parts):
        cmd = ['ffmpeg', '-i', args.input, '-vn']
        if i != 0:
            cmd += ['-ss', str(i * PART_SIZE_SEC - RESERVE_SEC)]
        if i != parts - 1:
            cmd += ['-t', str(PART_SIZE_SEC + (2 if i != 0 else 1) * RESERVE_SEC)]
        cmd.append(os.path.join(args.output, '{}_{:0>2}_{:0>2}.ogg'
            .format(os.path.basename(args.input), i * 2, (i + 1) * 2)))
        print(' '.join('"%s"' % arg for arg in cmd))
        subprocess.run(cmd)
