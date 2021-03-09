#!/usr/bin/env python3
import os
import subprocess

subprocess.run(['clang++', '-fsanitize=address,undefined', '-x', 'c++', '-std=c++17', '-O2', '-Wall', '-Werror', '-Wsign-compare', 'sortsubs.cpp', '-o', 'sortsubs'])
inputs = [i for i in os.listdir('.') if i.endswith('.in')]
for i in inputs:
    print('Running', i)
    p = subprocess.Popen(['./sortsubs'], stdin=open(i), stdout=subprocess.PIPE)
    out, err = p.communicate()
    out = out.decode()
    with open(i.replace('.in', '.out')) as f:
        expected = ''.join(f)
        if out != expected:
            print('out:')
            print(out)
            print('expected:')
            print(expected)
            raise RuntimeError('test failed')
