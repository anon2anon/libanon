#!/usr/bin/env python3
# Run without arguments to see the help message. Requires Python 3.5+
import os
import sys


def log_error(message: str):
    print(message, file=sys.stderr)


def get_stylename(line_type: str, line: str, style_spot: int):
    if not line.startswith(line_type + ':'):
        return
    if line.count(',') <= style_spot:
        log_error('Malformed line: ' + line.rstrip())
        return
    return line[len(line_type) + 1:].split(',', style_spot)[-2].strip()


def remove_extra_styles(path: str):
    if not os.path.isfile(path):
        log_error('File not found: ' + path)
        return
    if not os.path.basename(path).endswith('.ass'):
        log_error("Error: '%s' can't be processed, since only .ass files are supported." % path)
        return
    lines = list(open(path, encoding='utf-8'))

    styles_in_events = set()
    for line in lines:
        event_stylename = get_stylename('Dialogue', line, 4)
        if event_stylename is not None:
            styles_in_events.add(event_stylename)

    output_lines = []
    existing_styles = set()
    for line in lines:
        style_stylename = get_stylename('Style', line, 1)
        if style_stylename is None:
            output_lines.append(line)
        elif style_stylename in existing_styles:
            log_error("Duplicate style in '%s': %s" % (path, style_stylename))
            return
        else:
            existing_styles.add(style_stylename)
            if style_stylename in styles_in_events:
                output_lines.append(line)
    if not styles_in_events.issubset(existing_styles):
        print("Warning! The following styles in '%s' will be displayed as Default: " % path +
              ', '.join(styles_in_events - existing_styles))
    with open(path, 'w', encoding='utf-8') as file:
        file.write(''.join(output_lines))


if len(sys.argv) == 1:
    print('Usage: %s subs_file1.ass subs_file2.ass <...> subs_fileN.ass' % sys.argv[0])
    print('Result: the listed files will be cleared from extra styles.')
for arg in sys.argv[1:]:
    remove_extra_styles(arg)
