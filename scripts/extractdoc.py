#!/usr/bin/env python3
import os
import re
import sys
import glob
import textwrap
import subprocess


def sh(*args):
    return subprocess.check_output(*args, shell=True).decode()


def cat(*s, delimiter='\n'):
    return delimiter.join(s)


def renderf(filename, basedir=os.curdir):
    lang = os.path.splitext(filename)[1][1:]
    show = False
    code = []
    body = []
    with open(filename) as fp:
        for line in fp:
            if (not show) and re.search(r'^\s*/// !show', line, re.MULTILINE):
                show = True
                continue

            if show and re.search(r'^\s*/// !hide', line, re.MULTILINE):
                show = False
                if len(body):
                    body.append(cat(
                        f'```{lang}',
                        textwrap.dedent(cat(*code)),
                        '```',
                        f'<small>[{os.path.basename(filename)}]({os.path.relpath(filename, basedir)})</small>',
                    ))
                continue

            if show:
                code.append(line.rstrip())
                continue
            else:
                code = []

            if re.search(r'^\s*/// !tree', line, re.MULTILINE):
                body.append(cat(
                    '```',
                    sh(f'cd {os.path.dirname(filename)} && tree -L 3 -F .').rstrip(),
                    '```',
                ))
                continue

            m = re.search(r'^\s*/// !!\s+(.*)', line, re.MULTILINE)
            if m:
                body.append(m.group(1))
                continue

    return cat(*body)


def _render(path, basedir=os.curdir, level=3):
    if os.path.isfile(path):
        yield renderf(path, basedir)
    if os.path.isdir(path) and (level > 0):
        for p in map(lambda f: os.path.join(path, f), sorted(os.listdir(path))):
            for s in _render(p, basedir, level-1):
                if s:
                    yield s


def render(path, basedir=os.curdir, level=3):
    return cat(*_render(path, basedir, level))


def main():
    pathname = sys.argv[1]

    if sys.argv[2] == '-':
        fp = sys.stdout
        basedir = os.path.curdir
    else:
        name = os.path.abspath(sys.argv[2])
        basedir = os.path.dirname(name)
        fp = open(name, 'w')

    for each in glob.iglob(pathname, recursive=True):
        fp.write(render(each, basedir))
        fp.write('\n')

    fp.close()

if __name__ == '__main__':
    main()
