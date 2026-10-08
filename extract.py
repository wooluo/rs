"""从 GitHub tarball 解出 book/ + README + LICENSE 到 src/（Windows / Linux 通用）。

用法：python extract.py  （需先下载 repo.tar.gz）
      python extract.py --download  （自动从 GitHub 下载最新 main 分支）
"""
import tarfile, os, sys, urllib.request

TARBALL_URL = 'https://codeload.github.com/eternity4719/HowToLiveBetter/tar.gz/refs/heads/main'
TARBALL = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'repo.tar.gz')
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src')
PREFIX = 'HowToLiveBetter-main/'


def main():
    if '--download' in sys.argv:
        print('downloading', TARBALL_URL)
        urllib.request.urlretrieve(TARBALL_URL, TARBALL)

    if not os.path.exists(TARBALL):
        sys.exit('repo.tar.gz 不存在；用 python extract.py --download 先下载')

    os.makedirs(SRC, exist_ok=True)
    with tarfile.open(TARBALL, 'r:gz') as t:
        members = [m for m in t.getmembers()
                   if m.name.startswith(PREFIX + 'book/')
                   or m.name == PREFIX + 'README.md'
                   or m.name == PREFIX + 'LICENSE']
        t.extractall(SRC, members=members, filter='data')
    print('extracted', len(members), 'files ->', SRC)


if __name__ == '__main__':
    main()
