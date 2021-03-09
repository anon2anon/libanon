#!/usr/bin/env python3
import os
import subprocess

subprocess.run(['clang++', '-fsanitize=address,undefined', '-x', 'c++', '-std=c++17', '-O2', '-Wall', '-Werror', '-Wsign-compare', 'sortsubs.cpp', '-o', 'sortsubs'])
inputs = [i for i in os.listdir('.') if i.endswith('.in')]

for i in inputs:
    print('Running', i, 'in pad mode')
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

for i in inputs:
    print('Running', i, 'in cmp mode')
    p = subprocess.Popen(['./sortsubs', 'dummy'], stdin=open(i), stdout=subprocess.PIPE)
    out, err = p.communicate()
    out = out.decode()
    filename = i.replace('.in', '.cmp')
    if not os.path.isfile(filename):
        filename = i.replace('.in', '.out')
    with open(filename) as f:
        expected = ''.join(f)
        if out != expected:
            print('out:')
            print(out)
            print('expected:')
            print(expected)
