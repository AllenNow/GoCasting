"""
生成符合微信 tabBar 要求的 PNG 图标
- 尺寸：81x81 像素
- 格式：RGB（不用 RGBA，避免兼容问题）
- 内容：圆形色块（灰色 / 主题绿色）
"""
import struct, zlib, os

def make_rgb_png(size, r, g, b):
    """生成 RGB 模式 PNG（无 alpha 通道）"""
    w = h = size

    def chunk(name, data):
        crc = zlib.crc32(name + data) & 0xffffffff
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', crc)

    sig  = b'\x89PNG\r\n\x1a\n'
    # bit depth=8, color type=2(RGB), compression=0, filter=0, interlace=0
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))

    bg_r, bg_g, bg_b = 246, 246, 246   # 浅灰背景
    cx, cy, cr = w // 2, h // 2, w // 2 - 8

    rows = []
    for y in range(h):
        row = b'\x00'  # filter type None
        for x in range(w):
            if (x - cx) ** 2 + (y - cy) ** 2 <= cr * cr:
                row += bytes([r, g, b])
            else:
                row += bytes([bg_r, bg_g, bg_b])
        rows.append(row)

    raw  = b''.join(rows)
    idat = chunk(b'IDAT', zlib.compress(raw, 9))
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend


d = '/Users/mac/GoCasting/wechat/miniprogram/images/tab'
os.makedirs(d, exist_ok=True)

gray  = (153, 153, 153)   # 未选中
green = (26,  127,  90)   # 选中

icons = [
    ('catch.png',          *gray),
    ('catch-active.png',   *green),
    ('gear.png',           *gray),
    ('gear-active.png',    *green),
    ('map.png',            *gray),
    ('map-active.png',     *green),
    ('profile.png',        *gray),
    ('profile-active.png', *green),
]

for name, r, g, b in icons:
    path = os.path.join(d, name)
    data = make_rgb_png(81, r, g, b)
    with open(path, 'wb') as f:
        f.write(data)
    print(f'{name:30s}  {len(data):5d} bytes')

print('\nAll icons generated OK')
