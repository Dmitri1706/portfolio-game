"""
Процедурные low-poly модели для комнат.
Каждая функция строит предмет вокруг пустышки parent: «лицо» предмета смотрит в −Y локально,
ширина W — вдоль локального X, глубина D — вдоль локального Y, пол — z = 0.
"""
import math
import random

from lib import box, cyl, sphere, text, mat, wood_mat, hex_rgb, point_light, area_light, empty, FONT_BOLD, FONT_SERIF, FONT_SIGN

R = math.radians
WARM = (1.0, 0.66, 0.36)
COLD = (0.62, 0.78, 1.0)


def M():
    """Набор материалов комнаты."""
    return {
        'plaster': mat('plaster', hex_rgb('#cdb592'), rough=0.92),
        'wainscot': wood_mat('wainscot', '#5b3a25'),
        'molding': wood_mat('molding', '#6e4a31'),
        'dark_wood': wood_mat('dark_wood', '#4a2f1f'),
        'mid_wood': wood_mat('mid_wood', '#8a5a36'),
        'light_wood': wood_mat('light_wood', '#b98a5a'),
        'metal': mat('metal', hex_rgb('#3a3d47'), rough=0.4, metal=0.8),
        'steel': mat('steel', hex_rgb('#7c8394'), rough=0.35, metal=0.9),
        'brass': mat('brass', hex_rgb('#c9a04a'), rough=0.3, metal=1.0),
        'black': mat('black', hex_rgb('#1d1b22'), rough=0.5),
        'shade': mat('shade', hex_rgb('#f2d9a8'), rough=0.6, emit=WARM, emit_strength=6),
        'bulb': mat('bulb', (1, 0.9, 0.7), emit=(1.0, 0.75, 0.45), emit_strength=25),
        'glass_cold': mat('glass_cold', hex_rgb('#6f9be0'), rough=0.1, emit=(0.38, 0.58, 1.0), emit_strength=2.0),
        'fabric_terra': mat('fabric_terra', hex_rgb('#a8553a'), rough=0.95),
        'fabric_mustard': mat('fabric_mustard', hex_rgb('#c58f2f'), rough=0.95),
        'fabric_cream': mat('fabric_cream', hex_rgb('#e6d8bd'), rough=0.95),
        'leaf': mat('leaf', hex_rgb('#3f7f3c'), rough=0.6),
        'leaf2': mat('leaf2', hex_rgb('#5fa04a'), rough=0.6),
        'pot': mat('pot', hex_rgb('#b8653f'), rough=0.8),
        'pot2': mat('pot2', hex_rgb('#e4ddcf'), rough=0.5),
        'soil': mat('soil', hex_rgb('#3a2a1e'), rough=1.0),
        'paper': mat('paper', hex_rgb('#f3ead6'), rough=0.9),
        'ink': mat('ink', hex_rgb('#2a2230'), rough=0.6),
    }


BOOK_COLORS = ['#7a2e2e', '#2e4a7a', '#3b6b44', '#b07a2e', '#5a3a6e', '#c4b48a', '#8a3b2a', '#2f5d62', '#d6c9a8']


def _book_mats():
    return [mat(f'book{i}', hex_rgb(c), rough=0.7) for i, c in enumerate(BOOK_COLORS)]


# ================================================================ мебель

def bookshelf(m, p, W, D, rng):
    H = 2.3
    d = 0.4
    y0 = D / 2 - d / 2  # прижат к стене (стена — сзади, +Y)
    box('bs_back', (W - 0.04, 0.03, H), (0, D / 2 - 0.02, H / 2), m['dark_wood'], p)
    for sx in (-1, 1):
        box('bs_side', (0.05, d, H), (sx * (W / 2 - 0.025), y0, H / 2), m['mid_wood'], p)
    box('bs_top', (W, d + 0.02, 0.06), (0, y0, H - 0.03), m['mid_wood'], p)
    books = _book_mats()
    shelves = [0.05, 0.5, 0.95, 1.4, 1.85]
    for z in shelves:
        box('bs_shelf', (W - 0.1, d - 0.02, 0.035), (0, y0, z), m['mid_wood'], p)
        x = -W / 2 + 0.08
        while x < W / 2 - 0.12:
            bw = rng.uniform(0.035, 0.07)
            bh = rng.uniform(0.25, 0.38)
            tilt = rng.random() < 0.08
            if rng.random() < 0.1:
                x += 0.06  # промежуток
                continue
            box('book', (bw, d * rng.uniform(0.6, 0.85), bh), (x + bw / 2, y0 + 0.02, z + 0.02 + bh / 2),
                rng.choice(books), p, bevel=0.004, rot=(0, R(12) if tilt else 0, 0))
            x += bw + 0.004
        if rng.random() < 0.5:  # мелочь на полке
            sphere('globe', 0.06, (W / 2 - 0.15, y0 - 0.05, z + 0.09), m['brass'], p)


def bench(m, p, W, D, rng):
    for sx in (-1, 1):
        for sy in (-1, 1):
            box('leg', (0.06, 0.06, 0.4), (sx * (W / 2 - 0.12), sy * 0.14, 0.2), m['dark_wood'], p)
    box('seat', (W - 0.1, 0.42, 0.06), (0, 0, 0.43), m['mid_wood'], p)
    box('cushion', (W - 0.2, 0.36, 0.08), (0, 0, 0.5), m['fabric_mustard'], p, bevel=0.03)
    for i in range(2):
        box('pillow', (0.32, 0.12, 0.28), (-W / 4 + i * W / 2, 0.12, 0.66), m['fabric_terra' if i else 'fabric_cream'], p,
            bevel=0.04, rot=(R(-10), 0, R(6 - 12 * i)))


def umbrella_stand(m, p, W, D, rng):
    cyl('stand', 0.13, 0.5, (0, 0, 0), m['brass'], p, verts=14)
    cols = [mat('umb1', hex_rgb('#2a3f6e')), mat('umb2', hex_rgb('#7a2a2a')), mat('umb3', hex_rgb('#1f1f24'))]
    for i, c in enumerate(cols):
        a = i * 2.1
        cyl('umb', 0.035, 0.9, (0.05 * math.cos(a), 0.05 * math.sin(a), 0.1), c, p, verts=8, r_top=0.012,
            rot=(R(8) * math.sin(a), R(8) * math.cos(a), 0))
        sphere('handle', 0.03, (0.05 * math.cos(a) + 0.07 * math.sin(a), 0.05 * math.sin(a), 1.0), m['dark_wood'], p)


def side_table_lamp(m, p, W, D, rng):
    cyl('tbl_leg', 0.04, 0.6, (0, 0, 0), m['dark_wood'], p)
    cyl('tbl_foot', 0.18, 0.04, (0, 0, 0), m['dark_wood'], p)
    cyl('tbl_top', 0.28, 0.05, (0, 0, 0.6), m['mid_wood'], p, verts=20, bevel=0.01)
    cyl('lamp_base', 0.09, 0.22, (0, 0.05, 0.65), m['pot2'], p, r_top=0.05)
    cyl('lamp_shade', 0.17, 0.2, (0, 0.05, 0.9), m['shade'], p, r_top=0.11, verts=16)
    point_light('lamp_light', (0, 0.05, 0.98), WARM, 90, 0.06, p)
    for i in range(3):
        box('tbl_book', (0.18, 0.12, 0.03), (-0.1, -0.12, 0.665 + i * 0.032), _book_mats()[i + 2], p, bevel=0.003,
            rot=(0, 0, R(i * 9)))


def _leafy(m, p, rng, n, z0, height, spread, size):
    """Куст из вытянутых листьев: каждый лист смотрит наружу и вверх от центра."""
    for i in range(n):
        a = rng.uniform(0, 2 * math.pi)
        h = z0 + rng.uniform(0.25, 1.0) * height
        r = rng.uniform(0.3, 1.0) * spread
        tilt = rng.uniform(R(25), R(60))
        sphere('leaf', size, (r * math.cos(a), r * math.sin(a), h), m['leaf' if i % 3 else 'leaf2'], p,
               scale=(1.0, 0.32, 0.12), seg=8, rings=5, rot=(0, -tilt, a))
        cyl('stem', 0.01, h - z0 + 0.05, (0, 0, z0 - 0.05), m['leaf'], p, verts=5,
            rot=(-math.sin(a) * r * 0.9, math.cos(a) * r * 0.9, 0))


def plant_big(m, p, W, D, rng):
    cyl('pot', 0.22, 0.48, (0, 0, 0), m['pot'], p, verts=16, r_top=0.28, bevel=0.01)
    cyl('pot_rim', 0.29, 0.06, (0, 0, 0.46), m['pot'], p, verts=16, bevel=0.01)
    cyl('soil', 0.26, 0.02, (0, 0, 0.5), m['soil'], p, verts=16)
    _leafy(m, p, rng, 26, 0.55, 1.25, 0.32, 0.26)


def plant_small(m, p, W, D, rng):
    cyl('pot', 0.15, 0.32, (0, 0, 0), m['pot2'], p, verts=14, r_top=0.17)
    cyl('soil', 0.16, 0.02, (0, 0, 0.31), m['soil'], p, verts=14)
    _leafy(m, p, rng, 12, 0.35, 0.35, 0.16, 0.15)


def runner_rug(m, p, W, D, rng):
    """Длинная дорожка (по ней можно ходить)."""
    cols = ['#5a2a2a', '#c2924a', '#5a2a2a']
    for i, c in enumerate(cols):
        inset = i * 0.08
        box('runner', (W - 0.2 - inset * 2, D - 0.3 - inset * 2, 0.012 + i * 0.002), (0, 0, 0.006 + i * 0.001),
            mat(f'runner{i}', hex_rgb(c), rough=1.0), p, bevel=0)
    for k in range(int(W / 0.3)):
        box('tassel', (0.02, 0.08, 0.01), (-W / 2 + 0.15 + k * 0.3, -(D - 0.3) / 2 - 0.03, 0.005),
            mat('tassel', hex_rgb('#d8c08a')), p, bevel=0)


def pouf(m, p, W, D, rng):
    cyl('pouf', 0.27, 0.38, (0, 0, 0), m['fabric_cream'], p, verts=20, bevel=0.06)
    for i in range(8):
        a = i * math.pi / 4
        box('pouf_seam', (0.01, 0.01, 0.3), (0.272 * math.cos(a), 0.272 * math.sin(a), 0.19),
            mat('seam', hex_rgb('#b9a582')), p, bevel=0)


def cat(m, p, W, D, rng):
    """Спящий рыжий кот (ставится на скамейку/кресло — высота задаётся в описании)."""
    fur = mat('cat', hex_rgb('#d0803a'), rough=0.9)
    z = 0.62
    sphere('cat_body', 0.2, (0, 0, z), fur, p, scale=(1.3, 0.85, 0.55))
    sphere('cat_head', 0.11, (0.22, -0.05, z + 0.02), fur, p, scale=(1, 1, 0.85))
    for sy in (-1, 1):
        cyl('ear', 0.04, 0.07, (0.24, -0.05 + sy * 0.06, z + 0.09), fur, p, verts=4, r_top=0.002)
    cyl('tail', 0.035, 0.35, (-0.2, 0.05, z - 0.05), fur, p, verts=6, rot=(R(80), 0, R(30)))


def books_floor(m, p, W, D, rng):
    books = _book_mats()
    for s in range(2):
        for i in range(rng.randint(4, 7)):
            box('book', (0.3, 0.22, 0.05), (-0.15 + s * 0.35, rng.uniform(-0.05, 0.05), 0.025 + i * 0.052),
                rng.choice(books), p, bevel=0.004, rot=(0, 0, R(rng.uniform(-14, 14))))
    cyl('candle', 0.04, 0.16, (0.2, -0.25, 0), m['paper'], p, verts=10)
    sphere('flame', 0.02, (0.2, -0.25, 0.185), m['bulb'], p, scale=(1, 1, 1.8))
    point_light('candle_light', (0.2, -0.25, 0.22), WARM, 8, 0.02, p)


def console_table(m, p, W, D, rng):
    """Консоль у стены: лампа, ваза с ветками, рамки с фото."""
    for sx in (-1, 1):
        for sy in (-1, 1):
            box('leg', (0.05, 0.05, 0.8), (sx * (W / 2 - 0.12), sy * 0.13 + 0.1, 0.4), m['dark_wood'], p)
    box('top', (W - 0.1, 0.42, 0.05), (0, 0.1, 0.82), m['mid_wood'], p, bevel=0.012)
    box('drawer', (W - 0.3, 0.02, 0.12), (0, -0.115, 0.72), m['dark_wood'], p, bevel=0.004)
    cyl('lamp_base', 0.08, 0.25, (-W / 2 + 0.3, 0.12, 0.845), m['brass'], p, r_top=0.03)
    cyl('lamp_shade', 0.16, 0.2, (-W / 2 + 0.3, 0.12, 1.08), m['shade'], p, r_top=0.1, verts=16)
    point_light('console_lamp', (-W / 2 + 0.3, 0.12, 1.16), WARM, 80, 0.06, p)
    cyl('vase', 0.07, 0.3, (0.1, 0.15, 0.845), mat('vase', hex_rgb('#2f5d62'), rough=0.3), p, verts=12, r_top=0.05)
    for i in range(5):
        cyl('twig', 0.006, 0.5, (0.1, 0.15, 1.1), m['dark_wood'], p, verts=4, rot=(R(rng.uniform(-25, 25)), R(rng.uniform(-25, 25)), 0))
    for i in range(2):
        box('photo', (0.16, 0.02, 0.2), (W / 2 - 0.35 + i * 0.2, 0.2, 0.95), m['brass'], p, bevel=0.003,
            rot=(R(-12), 0, R(10 - 20 * i)))


def rug_round(m, p, W, D, rng):
    r = min(W, D) / 2 - 0.1
    rings = [('#6e2b2b', r), ('#c2924a', r - 0.18), ('#2e3f62', r - 0.3), ('#8a3a2c', r - 0.9), ('#c2924a', r - 1.05),
             ('#2e3f62', r - 1.2)]
    for i, (c, rr) in enumerate(rings):
        cyl('rug', rr, 0.012 + i * 0.002, (0, 0, 0), mat(f'rug{i}', hex_rgb(c), rough=1.0), p, verts=40)


def coffee_table(m, p, W, D, rng):
    for sx in (-1, 1):
        for sy in (-1, 1):
            box('leg', (0.06, 0.06, 0.38), (sx * (W / 2 - 0.25), sy * 0.22, 0.19), m['dark_wood'], p)
    box('top', (W - 0.3, 0.62, 0.06), (0, 0, 0.41), m['mid_wood'], p, bevel=0.015)
    box('shelf', (W - 0.4, 0.5, 0.03), (0, 0, 0.12), m['dark_wood'], p)
    books = _book_mats()
    for i in range(3):
        box('book', (0.3, 0.22, 0.04), (-0.35, 0.05, 0.46 + i * 0.042), books[i], p, bevel=0.004, rot=(0, 0, R(8 * i - 6)))
    cyl('cup', 0.045, 0.09, (0.25, -0.1, 0.44), m['pot2'], p, verts=12)
    cyl('candle', 0.035, 0.12, (0.45, 0.12, 0.44), m['paper'], p, verts=10)
    sphere('flame', 0.018, (0.45, 0.12, 0.585), m['bulb'], p, scale=(1, 1, 1.8))
    point_light('candle_light', (0.45, 0.12, 0.62), WARM, 6, 0.02, p)
    for i in range(4):
        box('magazine', (0.2, 0.28, 0.01), (0.0 + i * 0.02, 0.12, 0.13 + i * 0.012), books[(i + 4) % len(books)], p,
            bevel=0, rot=(0, 0, R(10 * i)))


def sofa(m, p, W, D, rng):
    f = m['fabric_terra']
    box('base', (W - 0.1, D - 0.15, 0.3), (0, 0, 0.22), f, p, bevel=0.05)
    box('back', (W - 0.1, 0.22, 0.48), (0, D / 2 - 0.18, 0.6), f, p, bevel=0.07)
    for sx in (-1, 1):
        box('arm', (0.2, D - 0.15, 0.32), (sx * (W / 2 - 0.15), 0, 0.5), f, p, bevel=0.06)
    for i in range(2):
        box('cushion', (W / 2 - 0.3, D - 0.42, 0.14), (-W / 4 + 0.03 + i * (W / 2 - 0.06), -0.08, 0.43), f, p, bevel=0.05)
    box('pillow', (0.36, 0.14, 0.32), (-W / 2 + 0.45, D / 2 - 0.38, 0.65), m['fabric_mustard'], p, bevel=0.06,
        rot=(R(-12), 0, R(-8)))
    box('pillow', (0.34, 0.14, 0.3), (W / 2 - 0.45, D / 2 - 0.38, 0.64), m['fabric_cream'], p, bevel=0.06,
        rot=(R(-12), 0, R(10)))
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl('foot', 0.03, 0.07, (sx * (W / 2 - 0.15), sy * (D / 2 - 0.15), 0), m['dark_wood'], p, verts=8)
    box('throw', (0.5, 0.5, 0.02), (W / 2 - 0.5, -0.05, 0.505), m['fabric_cream'], p, bevel=0.005, rot=(0, 0, R(14)))


def armchair(m, p, W, D, rng):
    f = m['fabric_mustard']
    box('base', (0.8, 0.75, 0.28), (0, 0, 0.21), f, p, bevel=0.05)
    box('back', (0.8, 0.2, 0.55), (0, 0.27, 0.62), f, p, bevel=0.07)
    for sx in (-1, 1):
        box('arm', (0.16, 0.72, 0.3), (sx * 0.33, 0, 0.48), f, p, bevel=0.06)
    box('cushion', (0.5, 0.5, 0.12), (0, -0.07, 0.41), f, p, bevel=0.05)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl('foot', 0.025, 0.07, (sx * 0.32, sy * 0.28, 0), m['dark_wood'], p, verts=8)


def floor_lamp(m, p, W, D, rng):
    cyl('base', 0.17, 0.04, (0, 0, 0), m['brass'], p, verts=20)
    cyl('pole', 0.018, 1.45, (0, 0, 0.04), m['brass'], p, verts=8)
    cyl('shade', 0.25, 0.32, (0, 0, 1.42), m['shade'], p, r_top=0.16, verts=18)
    sphere('bulb', 0.05, (0, 0, 1.5), m['bulb'], p)
    point_light('floor_lamp_light', (0, 0, 1.52), WARM, 220, 0.08, p)


def coat_rack(m, p, W, D, rng):
    cyl('base', 0.2, 0.05, (0, 0, 0), m['dark_wood'], p, verts=10)
    cyl('pole', 0.03, 1.75, (0, 0, 0.05), m['dark_wood'], p, verts=8)
    sphere('top', 0.05, (0, 0, 1.82), m['brass'], p)
    coats = [('#2f3b52', 0), ('#6b4a2e', 2.2), ('#7a2e2e', 4.1)]
    for c, a in coats:
        box('coat', (0.28, 0.16, 0.85), (0.14 * math.cos(a), 0.14 * math.sin(a), 1.2), mat(f'coat{c}', hex_rgb(c), rough=0.9),
            p, bevel=0.05, rot=(0, R(6), a))
    cyl('hat', 0.14, 0.04, (0.05, 0.0, 1.66), m['black'], p, verts=14, rot=(R(10), 0, 0))
    cyl('hat_top', 0.09, 0.1, (0.05, 0.0, 1.69), m['black'], p, verts=14, rot=(R(10), 0, 0))
    box('scarf', (0.06, 0.08, 0.6), (-0.1, 0.1, 1.3), mat('scarf', hex_rgb('#c58f2f'), rough=0.95), p, bevel=0.02)


def crate_books(m, p, W, D, rng):
    box('crate', (0.7, 0.55, 0.4), (0, 0, 0.2), m['light_wood'], p, bevel=0.015)
    for i in range(3):
        box('slat', (0.72, 0.02, 0.05), (0, -0.28, 0.08 + i * 0.13), m['mid_wood'], p, bevel=0.005)
    books = _book_mats()
    for i in range(6):
        box('book', (0.05, 0.28, 0.3), (-0.25 + i * 0.09, 0, 0.45), books[i], p, bevel=0.004, rot=(0, R(rng.uniform(-8, 8)), 0))
    box('box_top', (0.4, 0.3, 0.2), (0.05, 0.05, 0.72), mat('cardboard', hex_rgb('#b08a5a'), rough=0.9), p, bevel=0.01,
        rot=(0, 0, R(15)))


# ================================================================ двери

def _door_frame(m, p, wd, ht, frame_mat):
    box('frame_l', (0.1, 0.12, ht + 0.1), (-wd / 2 - 0.05, -0.02, (ht + 0.1) / 2), frame_mat, p)
    box('frame_r', (0.1, 0.12, ht + 0.1), (wd / 2 + 0.05, -0.02, (ht + 0.1) / 2), frame_mat, p)
    box('frame_t', (wd + 0.2, 0.12, 0.1), (0, -0.02, ht + 0.05), frame_mat, p)
    box('void', (wd, 0.02, ht), (0, 0.03, ht / 2), mat('void', (0.01, 0.008, 0.012), rough=1.0), p, bevel=0)


def door_wall(m, p, spec, rng):
    """Дверь на стене. Полотно — отдельный объект «leaf» (петля слева), чтобы отрендерить открытое состояние."""
    style = spec.get('style')
    wd, ht = 1.05, 2.25
    if style == 'shop':
        wd = 1.5
    frame_mat = {'tech': m['steel'], 'shop': mat('shop_frame', hex_rgb('#1d3f86'), rough=0.4, metal=0.5),
                 'boarded': m['dark_wood'], 'exit': m['metal']}[style]
    _door_frame(m, p, wd, ht, frame_mat)
    hinge = empty(f"{spec['id']}_leaf", (-wd / 2, -0.04, 0), 0, p)
    if style == 'tech':
        leaf = mat('tech_leaf', hex_rgb('#5d6475'), rough=0.45, metal=0.7)
        box('leaf', (wd, 0.05, ht), (wd / 2, 0, ht / 2), leaf, hinge)
        for z in (0.35, 0.42, 0.49, 0.56):
            box('vent', (0.5, 0.02, 0.025), (wd / 2, -0.03, z), m['black'], hinge, bevel=0)
        box('push', (0.55, 0.05, 0.05), (wd / 2 + 0.05, -0.06, 1.05), m['steel'], hinge)
        box('sticker', (0.22, 0.01, 0.22), (wd / 2, -0.03, 1.6), mat('warn', hex_rgb('#f2c230'), rough=0.6), hinge, bevel=0)
        for i in range(4):
            box('rivet', (0.03, 0.02, 0.03), (0.12 + (i % 2) * (wd - 0.24), -0.03, 0.15 + (i // 2) * (ht - 0.3)), m['steel'],
                hinge, bevel=0)
    elif style == 'shop':
        glass = mat('shop_glass', hex_rgb('#cfe8ff'), rough=0.05, emit=(0.85, 0.93, 1.0), emit_strength=1.2)
        for half in (0, 1):
            x0 = half * wd / 2
            box('leaf_frame', (wd / 2 - 0.02, 0.06, ht), (x0 + wd / 4, 0, ht / 2), frame_mat, hinge)
            box('leaf_glass', (wd / 2 - 0.16, 0.07, ht - 0.35), (x0 + wd / 4, 0, ht / 2 + 0.08), glass, hinge, bevel=0)
            box('handle', (0.04, 0.06, 0.6), (x0 + (wd / 2 - 0.12 if half == 0 else 0.12), -0.07, 1.05), m['steel'], hinge)
        box('mat', (wd + 0.3, 0.7, 0.02), (0, -0.5, 0.01), mat('doormat', hex_rgb('#24365c'), rough=1), p, bevel=0)
    elif style == 'exit':
        box('leaf', (wd, 0.05, ht), (wd / 2, 0, ht / 2), mat('exit_leaf', hex_rgb('#e8ebf1'), rough=0.4), hinge)
        box('leaf_window', (0.3, 0.02, 0.6), (wd / 2, -0.03, 1.55), m['glass_cold'], hinge, bevel=0)
        box('push', (0.5, 0.05, 0.05), (wd / 2 + 0.05, -0.06, 1.05), m['steel'], hinge)
    else:  # заколоченная
        box('leaf', (wd, 0.05, ht), (wd / 2, 0, ht / 2), m['mid_wood'], hinge)
        for i in range(4):
            box('panel', (wd / 2 - 0.12, 0.02, ht / 2 - 0.25), (wd / 4 + (i % 2) * wd / 2, -0.03, ht / 4 + (i // 2) * ht / 2),
                m['dark_wood'], hinge)
        planks = mat('planks', hex_rgb('#9a7048'), rough=0.85)
        for a, z in ((R(28), 1.4), (R(-24), 0.8), (0, 1.95)):
            box('plank', (wd + 0.35, 0.05, 0.16), (wd / 2, -0.08, z), planks, hinge, rot=(0, a, 0))
            for sx in (-1, 1):
                box('nail', (0.025, 0.03, 0.025), (wd / 2 + sx * (wd / 2) * math.cos(a), -0.11,
                                                   z - sx * (wd / 2) * math.sin(a)), m['steel'], hinge, bevel=0)
    # вывеска / табличка над дверью
    if style == 'tech':
        box('sign', (2.1, 0.1, 0.58), (0, -0.06, ht + 0.38), m['black'], p, bevel=0.02)
        neon = mat('neon_cyan', hex_rgb('#3de0e8'), emit=(0.25, 0.9, 1.0), emit_strength=3.5)
        text('sign_text', spec.get('sign', ''), 0.42, (0, -0.12, ht + 0.41), neon, p, font=FONT_SIGN)
        box('underline', (1.6, 0.02, 0.025), (0, -0.12, ht + 0.16),
            mat('neon_pink', hex_rgb('#ff4fd8'), emit=(1, 0.3, 0.85), emit_strength=8), p, bevel=0)
        point_light('sign_glow', (0, -0.5, ht + 0.38), (0.4, 0.9, 1.0), 25, 0.3, p)
    elif style == 'shop':
        blue = mat('sm_blue', hex_rgb('#1d4fa0'), rough=0.5, emit=(0.12, 0.3, 0.75), emit_strength=0.6)
        box('sign', (3.2, 0.12, 0.62), (0, -0.06, ht + 0.38), blue, p, bevel=0.02)
        box('stripe', (3.2, 0.13, 0.08), (0, -0.065, ht + 0.11), mat('sm_red', hex_rgb('#e0383e'), emit=(1, 0.2, 0.2),
                                                                      emit_strength=1.5), p, bevel=0)
        white = mat('sign_white', (1, 1, 1), emit=(1, 1, 1), emit_strength=2.2)
        text('sign_text', spec.get('sign', ''), 0.34, (0.16, -0.13, ht + 0.41), white, p, font=FONT_SIGN)
        for i in range(3):  # логотип-шеврон
            box('chev', (0.2, 0.03, 0.06), (-1.38 + i * 0.04, -0.13, ht + 0.4 + 0.1 * (1 - i)),
                mat('sm_red', hex_rgb('#e0383e')), p, bevel=0, rot=(0, R(-40), 0))
        point_light('sign_glow', (0, -0.5, ht + 0.38), (0.6, 0.75, 1.0), 20, 0.3, p)
    elif style == 'exit':
        green = mat('exit_green', hex_rgb('#2fbf62'), emit=(0.2, 0.9, 0.4), emit_strength=2.5)
        box('sign', (1.3, 0.08, 0.42), (0, -0.05, ht + 0.38), green, p, bevel=0.02)
        white = mat('sign_white', (1, 1, 1), emit=(1, 1, 1), emit_strength=2.2)
        text('sign_text', spec.get('sign', ''), 0.3, (0, -0.1, ht + 0.38), white, p, font=FONT_SIGN)
        point_light('sign_glow', (0, -0.5, ht + 0.38), (0.3, 1.0, 0.5), 15, 0.3, p)
    else:
        lines = spec.get('plaque', [])
        box('plaque', (2.95, 0.05, 0.72), (0, -0.05, ht + 0.38), m['paper'], p, bevel=0.01)
        for i, line in enumerate(lines):
            text('plaque_text', line, 0.34, (0, -0.085, ht + 0.54 - i * 0.33), m['ink'], p, font=FONT_SIGN, extrude=0.002)
        for sx in (-1, 1):
            box('nail', (0.03, 0.03, 0.03), (sx * 1.3, -0.08, ht + 0.68), m['steel'], p, bevel=0)
    return hinge


def door_free(m, p, W, D, spec, rng):
    """Отдельно стоящая заколоченная дверь «Проекты» (рама на полу, табличка сверху)."""
    wd, ht = 1.25, 2.3
    frame = m['dark_wood']
    box('post_l', (0.14, 0.2, ht + 0.12), (-wd / 2 - 0.07, 0, (ht + 0.12) / 2), frame, p)
    box('post_r', (0.14, 0.2, ht + 0.12), (wd / 2 + 0.07, 0, (ht + 0.12) / 2), frame, p)
    box('lintel', (wd + 0.4, 0.22, 0.14), (0, 0, ht + 0.07), frame, p)
    for sx in (-1, 1):
        box('foot', (0.3, 0.6, 0.08), (sx * (wd / 2 + 0.07), 0, 0.04), frame, p)
    box('leaf', (wd, 0.06, ht), (0, 0, ht / 2), m['fabric_cream'], p)
    planks = mat('planks', hex_rgb('#9a7048'), rough=0.85)
    for a, z in ((R(30), 1.45), (R(-26), 0.75)):
        box('plank', (wd + 0.3, 0.05, 0.17), (0, -0.06, z), planks, p, rot=(0, a, 0))
    box('plank_h', (wd + 0.3, 0.05, 0.15), (0, -0.06, 1.95), planks, p)
    box('sign', (2.1, 0.06, 0.62), (0, -0.04, ht + 0.54), m['paper'], p, bevel=0.01)
    for sx in (-1, 1):
        box('sign_post', (0.04, 0.04, 0.24), (sx * 0.7, 0, ht + 0.22), m['dark_wood'], p, bevel=0)
    text('plaque_text', spec.get('plaque', ''), 0.44, (0, -0.075, ht + 0.54), m['ink'], p, font=FONT_SIGN, extrude=0.002)
    # ведро с краской и стремянка — «тут кипит работа»
    cyl('bucket', 0.13, 0.25, (wd / 2 + 0.4, -0.25, 0), mat('bucket', hex_rgb('#3a6fb0'), rough=0.5), p, verts=14,
        r_top=0.15)
    box('brush', (0.04, 0.3, 0.02), (wd / 2 + 0.4, -0.25, 0.27), m['mid_wood'], p, bevel=0, rot=(R(20), 0, R(30)))


# ================================================================ на стенах

def window(m, p, spec, rng):
    w = spec.get('width', 1.6)
    h = 1.5
    z0 = 0.95
    box('glass', (w, 0.04, h), (0, -0.01, z0 + h / 2), m['glass_cold'], p, bevel=0)
    fr = m['molding']
    for sx in (-1, 1):
        box('wfr', (0.08, 0.1, h + 0.12), (sx * (w / 2 + 0.02), -0.04, z0 + h / 2), fr, p)
    for z in (z0 - 0.02, z0 + h + 0.02):
        box('wfr', (w + 0.12, 0.1, 0.08), (0, -0.04, z), fr, p)
    box('mullion', (0.05, 0.08, h), (0, -0.04, z0 + h / 2), fr, p)
    box('mullion', (w, 0.08, 0.05), (0, -0.04, z0 + h * 0.62), fr, p)
    box('sill', (w + 0.3, 0.22, 0.06), (0, -0.12, z0 - 0.07), m['mid_wood'], p)
    cyl('sill_pot', 0.07, 0.13, (w / 2 - 0.15, -0.14, z0 - 0.04), m['pot'], p, verts=10)
    sphere('sill_leaf', 0.09, (w / 2 - 0.15, -0.14, z0 + 0.15), m['leaf2'], p, scale=(1, 1, 0.8), seg=8, rings=5)
    curtain = mat('curtain', hex_rgb('#6b2f2f'), rough=0.95)
    for sx in (-1, 1):
        for k in range(3):
            box('curtain', (0.12, 0.06, h + 0.5), (sx * (w / 2 + 0.15 + k * 0.08), -0.12 - k * 0.01, z0 + h / 2 + 0.1),
                curtain, p, bevel=0.03)
    box('rod', (w + 0.9, 0.03, 0.03), (0, -0.14, z0 + h + 0.38), m['brass'], p, bevel=0)
    area_light('window_light', (0, -0.3, z0 + h / 2 + 0.4), (R(-60), 0, 0), (w, h), (0.45, 0.62, 1.0), 520, p)


def sconce(m, p, spec, rng):
    z = 2.1
    box('plate', (0.12, 0.03, 0.2), (0, -0.015, z), m['brass'], p, bevel=0.005)
    box('arm', (0.03, 0.18, 0.03), (0, -0.1, z), m['brass'], p, bevel=0)
    cyl('shade', 0.11, 0.16, (0, -0.2, z - 0.02), m['shade'], p, r_top=0.07, verts=14)
    sphere('bulb', 0.035, (0, -0.2, z + 0.03), m['bulb'], p)
    point_light('sconce_light', (0, -0.22, z + 0.05), WARM, 110, 0.05, p)


def sign_hello(m, p, spec, rng):
    w = spec.get('width', 2.8)
    z = 1.75
    box('board', (w, 0.06, 1.2), (0, -0.03, z), m['dark_wood'], p, bevel=0.02)
    box('inner', (w - 0.16, 0.02, 1.04), (0, -0.065, z), m['paper'], p, bevel=0)
    text('hello1', 'Привет! Я Дмитрий,', 0.3, (0, -0.08, z + 0.2), m['ink'], p, font=FONT_SIGN, extrude=0.003)
    text('hello2', 'выбери дверь', 0.3, (-0.25, -0.08, z - 0.2), m['ink'], p, font=FONT_SIGN, extrude=0.003)
    box('arrow', (0.5, 0.02, 0.06), (w / 2 - 0.55, -0.08, z - 0.2), mat('accent', hex_rgb('#d0801a')), p, bevel=0)
    for s in (1, -1):
        box('arrow_tip', (0.16, 0.02, 0.05), (w / 2 - 0.36, -0.08, z - 0.2 + s * 0.045), mat('accent', hex_rgb('#d0801a')), p,
            bevel=0, rot=(0, s * R(35), 0))
    # подсветка картины
    box('pic_lamp', (0.8, 0.12, 0.05), (0, -0.12, z + 0.7), m['brass'], p, bevel=0.01)
    point_light('pic_light', (0, -0.35, z + 0.6), WARM, 45, 0.1, p)


def painting(m, p, spec, rng):
    z = 1.8
    box('frame', (1.0, 0.05, 0.75), (0, -0.025, z), m['brass'], p, bevel=0.015)
    box('canvas', (0.86, 0.02, 0.61), (0, -0.055, z), mat('canvas', hex_rgb('#e7dcc3')), p, bevel=0)
    hills = [('#4f7a5a', -0.15, 0.22), ('#2f5d62', 0.2, 0.3), ('#c58f2f', 0.0, 0.08)]
    for c, x, hh in hills:
        box('hill', (0.5, 0.01, hh), (x, -0.068, z - 0.3 + hh / 2), mat(f'h{c}', hex_rgb(c)), p, bevel=0)
    cyl('sun', 0.07, 0.01, (0.25, -0.07, z + 0.15), mat('sun', hex_rgb('#e0a030')), p, verts=14, rot=(R(90), 0, 0))


def clock(m, p, spec, rng):
    z = 2.0
    cyl('clock', 0.24, 0.05, (0, -0.0, z), m['dark_wood'], p, verts=24, rot=(R(90), 0, 0))
    cyl('face', 0.2, 0.01, (0, -0.05, z), m['paper'], p, verts=24, rot=(R(90), 0, 0))
    box('hand_h', (0.02, 0.01, 0.11), (0.02, -0.065, z + 0.04), m['black'], p, bevel=0, rot=(0, R(-30), 0))
    box('hand_m', (0.015, 0.01, 0.16), (-0.03, -0.065, z + 0.05), m['black'], p, bevel=0, rot=(0, R(35), 0))
    for i in range(12):
        a = i * math.pi / 6
        box('tick', (0.012, 0.01, 0.03), (0.17 * math.sin(a), -0.06, z + 0.17 * math.cos(a)), m['black'], p, bevel=0,
            rot=(0, a, 0))


# ================================================================ офис «В ХОД»

NEON = (0.24, 0.88, 1.0)
NEON2 = (1.0, 0.3, 0.85)


def office_mats():
    return {
        'navy': mat('vh_navy', hex_rgb('#1f2240'), rough=0.5),
        'white': mat('vh_white', hex_rgb('#eef0f4'), rough=0.4),
        'grey': mat('vh_grey', hex_rgb('#9aa1b0'), rough=0.5),
        'neon': mat('vh_neon', hex_rgb('#3de0e8'), emit=NEON, emit_strength=6),
        'neon2': mat('vh_neon2', hex_rgb('#ff4fd8'), emit=NEON2, emit_strength=5),
        'screen': mat('vh_screen', hex_rgb('#1d2a4a'), emit=(0.1, 0.2, 0.45), emit_strength=1.2),
        'code': mat('vh_code', hex_rgb('#7ae8f0'), emit=(0.5, 0.95, 1.0), emit_strength=4),
        'led_on': mat('led_on', hex_rgb('#5cff8a'), emit=(0.3, 1.0, 0.45), emit_strength=12),
        'led_blue': mat('led_blue', hex_rgb('#3de0e8'), emit=NEON, emit_strength=12),
        'led_off': mat('led_off', hex_rgb('#1f2a24'), rough=0.6),
    }


def desk_pc(m, p, W, D, rng):
    o = office_mats()
    for sx in (-1, 1):
        box('desk_leg', (0.06, D - 0.25, 0.72), (sx * (W / 2 - 0.1), 0.0, 0.36), m['metal'], p)
    box('desk_top', (W - 0.05, D - 0.18, 0.05), (0, 0, 0.745), m['light_wood'], p, bevel=0.012)
    box('drawers', (0.45, D - 0.3, 0.5), (W / 2 - 0.35, 0.02, 0.45), o['white'], p, bevel=0.01)
    for z in (0.32, 0.5):
        box('drawer_handle', (0.18, 0.02, 0.02), (W / 2 - 0.35, -(D - 0.3) / 2 - 0.01, z), m['steel'], p, bevel=0)
    # монитор (экраном к стулу, в сторону −Y)
    box('mon_stand', (0.06, 0.06, 0.2), (-0.35, 0.12, 0.87), m['metal'], p)
    box('mon_foot', (0.25, 0.18, 0.02), (-0.35, 0.12, 0.78), m['metal'], p)
    box('monitor', (0.78, 0.05, 0.46), (-0.35, 0.08, 1.15), m['black'], p, bevel=0.012)
    box('mon_screen', (0.72, 0.01, 0.4), (-0.35, 0.05, 1.15), o['screen'], p, bevel=0)
    for i in range(7):
        ln = rng.uniform(0.15, 0.5)
        box('code', (ln, 0.004, 0.022), (-0.35 - 0.33 + 0.04 + ln / 2 + (0.05 if i % 3 else 0), 0.043, 1.31 - i * 0.05),
            o['code'] if i % 3 else o['neon2'], p, bevel=0)
    box('keyboard', (0.45, 0.15, 0.025), (-0.35, -0.2, 0.785), m['black'], p, bevel=0.006)
    box('mouse', (0.06, 0.1, 0.03), (0.0, -0.2, 0.785), m['black'], p, bevel=0.012)
    cyl('mug', 0.045, 0.1, (0.2, 0.05, 0.77), o['neon2'], p, verts=12)
    box('laptop_closed', (0.35, 0.25, 0.025), (0.45, 0.05, 0.785), m['steel'], p, bevel=0.006, rot=(0, 0, R(-8)))
    cyl('lamp_arm', 0.015, 0.45, (0.75, 0.2, 0.77), m['metal'], p, verts=6, rot=(R(-20), 0, 0))
    cyl('lamp_head', 0.08, 0.1, (0.75, 0.06, 1.15), m['metal'], p, verts=12, rot=(R(140), 0, 0))
    point_light('desk_lamp', (0.75, 0.0, 1.05), WARM, 40, 0.05, p)


def office_chair(m, p, W, D, rng):
    """Офисный стул: сиденье (в фоне) и спинка «backrest» — отдельной вырезкой поверх сидящего."""
    o = office_mats()
    for i in range(5):
        a = i * 2 * math.pi / 5
        box('chair_leg', (0.28, 0.04, 0.03), (0.14 * math.cos(a), 0.14 * math.sin(a), 0.05), m['metal'], p, bevel=0,
            rot=(0, 0, a))
    cyl('chair_post', 0.03, 0.35, (0, 0, 0.06), m['metal'], p, verts=8)
    box('chair_seat', (0.48, 0.46, 0.08), (0, 0, 0.44), o['navy'], p, bevel=0.03)
    back = lib_empty('backrest', p)
    box('backrest_post', (0.05, 0.04, 0.3), (0, 0.24, 0.55), m['metal'], back)
    box('backrest_pad', (0.46, 0.08, 0.42), (0, 0.27, 0.85), o['navy'], back, bevel=0.04)
    box('backrest_neon', (0.3, 0.01, 0.02), (0, 0.312, 1.0), o['neon'], back, bevel=0)


def audience_chair(m, p, W, D, rng):
    o = office_mats()
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl('leg', 0.02, 0.44, (sx * 0.2, sy * 0.18, 0), m['metal'], p, verts=6)
    box('chair_seat', (0.48, 0.44, 0.05), (0, 0, 0.45), o['navy'], p, bevel=0.015)
    back = lib_empty('backrest', p)
    box('backrest_pad', (0.48, 0.05, 0.38), (0, 0.22, 0.72), o['navy'], back, bevel=0.015)
    box('backrest_edge', (0.48, 0.055, 0.03), (0, 0.22, 0.9), o['neon'], back, bevel=0)


def stage(m, p, W, D, rng):
    o = office_mats()
    box('stage', (W, D, 0.3), (0, 0, 0.15), o['navy'], p, bevel=0.02)
    box('stage_edge', (W + 0.02, 0.03, 0.03), (0, -D / 2, 0.29), o['neon'], p, bevel=0)
    for i in range(int(W / 0.4)):
        box('board', (0.38, D - 0.06, 0.004), (-W / 2 + 0.2 + i * 0.4, 0, 0.302), mat('stage_wood', hex_rgb('#2a2d4e')), p,
            bevel=0)
    # трибуна
    box('lectern', (0.5, 0.4, 0.95), (W / 2 - 0.8, -0.1, 0.78), m['light_wood'], p, bevel=0.02)
    box('lectern_top', (0.58, 0.46, 0.04), (W / 2 - 0.8, -0.1, 1.27), m['dark_wood'], p, bevel=0.01, rot=(R(-12), 0, 0))
    box('lectern_logo', (0.3, 0.01, 0.08), (W / 2 - 0.8, -0.305, 0.95), o['neon'], p, bevel=0)
    cyl('mic', 0.01, 0.3, (W / 2 - 0.7, -0.15, 1.28), m['metal'], p, verts=6, rot=(R(-25), 0, 0))
    # прожекторы на краю сцены
    for x in (-W / 2 + 0.4, W / 2 - 0.4):
        cyl('spot', 0.08, 0.15, (x, -D / 2 + 0.2, 0.3), m['black'], p, verts=10, rot=(R(-60), 0, 0))
        point_light('spot_light', (x, -D / 2 + 0.25, 0.5), (0.8, 0.9, 1.0), 25, 0.05, p)


def podium(m, p, W, D, rng):
    """Трибуна с микрофоном (кейс «Мероприятие по HR-автоматизации»): лицом к зрителю, выступающий стоит за ней."""
    o = office_mats()
    box('pd_body', (0.62, 0.42, 1.0), (0, 0.04, 0.5), o['navy'], p, bevel=0.03)
    box('pd_front', (0.56, 0.02, 0.62), (0, -0.18, 0.56), o['white'], p, bevel=0.01)
    box('pd_logo', (0.34, 0.012, 0.05), (0, -0.192, 0.74), o['neon'], p, bevel=0)
    box('pd_logo2', (0.22, 0.012, 0.03), (0, -0.192, 0.64), o['neon2'], p, bevel=0)
    box('pd_base', (0.72, 0.5, 0.06), (0, 0.04, 0.03), m['black'], p, bevel=0.01)
    box('pd_top', (0.7, 0.5, 0.04), (0, 0.06, 1.04), m['dark_wood'], p, bevel=0.01, rot=(R(10), 0, 0))
    box('pd_paper', (0.2, 0.28, 0.006), (0.12, 0.08, 1.07), o['white'], p, bevel=0, rot=(R(10), 0, R(-6)))
    # микрофон на гибкой ножке
    cyl('pd_mic_base', 0.04, 0.03, (-0.16, -0.04, 1.03), m['black'], p, verts=10)
    cyl('pd_mic_neck', 0.008, 0.32, (-0.16, -0.04, 1.05), m['metal'], p, verts=6, rot=(R(-35), 0, 0))
    sphere('pd_mic', 0.035, (-0.16, -0.22, 1.32), m['black'], p, scale=(1, 1, 1.4), seg=10, rings=6)
    point_light('pd_glow', (0, -0.5, 0.7), (0.4, 0.9, 1.0), 6, 0.2, p)


def server_rack(m, p, W, D, rng):
    o = office_mats()
    box('rack', (0.7, 0.65, 2.1), (0, 0.05, 1.05), m['metal'], p, bevel=0.02)
    box('rack_door', (0.62, 0.02, 1.95), (0, -0.28, 1.05), mat('rack_glass', hex_rgb('#1b1e29'), rough=0.2), p, bevel=0)
    for u in range(14):
        z = 0.2 + u * 0.13
        box('unit', (0.56, 0.01, 0.1), (0, -0.292, z), m['black'], p, bevel=0)
        for k in range(4):
            led = box(f'led_{u}_{k}', (0.02, 0.01, 0.02), (-0.24 + k * 0.035, -0.3, z), o['led_on'], p, bevel=0)
            led['phase'] = rng.randint(0, 3)
            led['kind'] = 'blue' if k == 3 else 'green'


def set_blink(root, frame):
    """Кадр мигания огоньков серверной стойки (0 или 1)."""
    o = office_mats()
    for c in _all_children(root):
        if c.name.startswith('led_'):
            on = (c.get('phase', 0) + frame) % 3 != 0
            c.data.materials[0] = (o['led_blue'] if c.get('kind') == 'blue' else o['led_on']) if on else o['led_off']


def _all_children(o):
    out = []
    for c in o.children:
        out += [c] + _all_children(c)
    return out


def filing_cabinet(m, p, W, D, rng):
    o = office_mats()
    box('cabinet', (0.6, 0.55, 0.95), (0, 0.08, 0.475), o['white'], p, bevel=0.015)
    for z in (0.2, 0.5, 0.8):
        box('drawer_line', (0.56, 0.01, 0.01), (0, -0.2, z + 0.13), o['grey'], p, bevel=0)
        box('drawer_handle', (0.16, 0.025, 0.025), (0, -0.215, z), m['steel'], p, bevel=0)
    box('plant_tiny_pot', (0.1, 0.1, 0.1), (0.2, 0.2, 1.0), m['pot2'], p, bevel=0.01)
    sphere('plant_tiny', 0.08, (0.2, 0.2, 1.1), m['leaf2'], p, scale=(1, 1, 0.8), seg=8, rings=5)


def water_cooler(m, p, W, D, rng):
    o = office_mats()
    box('cooler', (0.4, 0.4, 1.0), (0, 0.05, 0.5), o['white'], p, bevel=0.03)
    cyl('bottle', 0.15, 0.42, (0, 0.05, 1.0), mat('water', hex_rgb('#7fc4ff'), rough=0.05, transmission=0.8), p, verts=16,
        bevel=0.03)
    box('tap', (0.06, 0.04, 0.06), (0, -0.17, 0.7), o['neon'], p, bevel=0)
    for i in range(3):
        cyl('cup', 0.035, 0.08, (-0.12 + i * 0.03, -0.1, 0.02 + i * 0.08), o['white'], p, verts=8)


def rug_rect(m, p, W, D, rng):
    o = office_mats()
    box('rug', (W - 0.3, D - 0.3, 0.014), (0, 0, 0.007), mat('rug_grey', hex_rgb('#3a3f55'), rough=1), p, bevel=0)
    box('rug_in', (W - 0.7, D - 0.7, 0.016), (0, 0, 0.008), mat('rug_grey2', hex_rgb('#4a506a'), rough=1), p, bevel=0)
    box('rug_line', (W - 0.5, 0.04, 0.018), (0, 0, 0.009), o['neon'], p, bevel=0)


def coffee_table_low(m, p, W, D, rng):
    o = office_mats()
    box('ct_top', (W - 0.3, 0.65, 0.05), (0, 0, 0.38), o['white'], p, bevel=0.02)
    for sx in (-1, 1):
        box('ct_leg', (0.05, 0.55, 0.36), (sx * (W / 2 - 0.25), 0, 0.18), m['metal'], p, bevel=0.005)
    cyl('ct_cup', 0.045, 0.09, (0.45, 0.1, 0.405), o['neon2'], p, verts=12)
    box('ct_tablet', (0.24, 0.17, 0.012), (0.1, 0.15, 0.41), m['black'], p, bevel=0.004, rot=(0, 0, R(20)))


def beanbag(m, p, W, D, rng):
    sphere('beanbag', 0.42, (0, 0, 0.25), mat('beanbag', hex_rgb('#e0563a'), rough=0.9), p, scale=(1, 1, 0.65), seg=16,
           rings=10)
    sphere('beanbag_dent', 0.3, (0.05, -0.05, 0.45), mat('beanbag2', hex_rgb('#c8462e'), rough=0.9), p, scale=(1, 1, 0.35),
           seg=12, rings=6)


def bar_table(m, p, W, D, rng):
    cyl('bt_foot', 0.25, 0.03, (0, 0, 0), m['metal'], p, verts=16)
    cyl('bt_post', 0.04, 1.0, (0, 0, 0.03), m['steel'], p, verts=10)
    cyl('bt_top', 0.36, 0.04, (0, 0, 1.02), office_mats()['white'], p, verts=24, bevel=0.01)
    cyl('bt_edge', 0.365, 0.01, (0, 0, 1.02), office_mats()['neon'], p, verts=24)


def bar_stool(m, p, W, D, rng):
    cyl('st_foot', 0.18, 0.02, (0, 0, 0), m['metal'], p, verts=14)
    cyl('st_post', 0.025, 0.7, (0, 0, 0.02), m['steel'], p, verts=8)
    cyl('st_seat', 0.2, 0.06, (0, 0, 0.72), office_mats()['navy'], p, verts=16, bevel=0.02)


def whiteboard(m, p, W, D, rng):
    o = office_mats()
    for sx in (-1, 1):
        box('wb_leg', (0.04, 0.4, 0.04), (sx * 0.8, 0, 0.04), m['metal'], p, bevel=0)
        box('wb_post', (0.04, 0.04, 1.8), (sx * 0.8, 0, 0.9), m['metal'], p, bevel=0)
    box('wb_board', (1.5, 0.04, 1.0), (0, 0, 1.35), o['white'], p, bevel=0.01)
    box('wb_frame', (1.54, 0.03, 1.04), (0, 0.01, 1.35), o['grey'], p, bevel=0.005)
    pts = [(-0.6, 1.0), (-0.3, 1.12), (0.0, 1.18), (0.3, 1.4), (0.6, 1.62)]
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        ln = math.hypot(x1 - x0, z1 - z0)
        box('wb_line', (ln, 0.005, 0.025), ((x0 + x1) / 2, -0.025, (z0 + z1) / 2), o['neon2'], p, bevel=0,
            rot=(0, -math.atan2(z1 - z0, x1 - x0), 0))
    for i in range(3):
        box('wb_note', (0.14, 0.006, 0.14), (-0.55 + i * 0.2, -0.026, 1.65), mat(f'note{i}', hex_rgb(['#ffe066', '#ff9ec7',
                                                                                                    '#9ed8ff'][i])),
            p, bevel=0)


def item_newspaper(m, p, W, D, rng):
    z = 0.0
    box('np', (0.42, 0.3, 0.012), (0, 0, z + 0.006), m['paper'], p, bevel=0.002, rot=(0, 0, R(18)))
    box('np_head', (0.3, 0.05, 0.004), (0.02, 0.07, z + 0.014), m['ink'], p, bevel=0, rot=(0, 0, R(18)))


def item_phone(m, p, W, D, rng):
    box('phone', (0.09, 0.17, 0.014), (0, 0, 0.007), m['black'], p, bevel=0.005, rot=(0, 0, R(-25)))
    box('phone_screen', (0.075, 0.15, 0.004), (0, 0, 0.016), office_mats()['code'], p, bevel=0, rot=(0, 0, R(-25)))


def item_folder(m, p, W, D, rng):
    box('folder', (0.34, 0.26, 0.03), (-0.08, 0.05, 0.015), mat('folder', hex_rgb('#e3b25e'), rough=0.8), p, bevel=0.005,
        rot=(0, 0, R(12)))
    box('folder_tab', (0.1, 0.04, 0.03), (-0.18, 0.2, 0.015), mat('folder', hex_rgb('#e3b25e')), p, bevel=0.005,
        rot=(0, 0, R(12)))


def lib_empty(name, parent):
    return empty(name, (0, 0, 0), 0, parent)


# ---------- на стенах офиса

def office_window(m, p, spec, rng):
    """Большое офисное окно: тонкая рама, жалюзи, холодный свет."""
    o = office_mats()
    w = spec.get('width', 1.8)
    h = 1.9
    z0 = 0.7
    box('glass', (w, 0.04, h), (0, -0.01, z0 + h / 2), m['glass_cold'], p, bevel=0)
    for sx in (-1, 1):
        box('wfr', (0.06, 0.08, h + 0.08), (sx * (w / 2 + 0.01), -0.04, z0 + h / 2), m['metal'], p)
    for z in (z0 - 0.02, z0 + h + 0.02):
        box('wfr', (w + 0.08, 0.08, 0.06), (0, -0.04, z), m['metal'], p)
    box('mullion', (0.04, 0.06, h), (0, -0.04, z0 + h / 2), m['metal'], p)
    for i in range(9):  # жалюзи, подняты наполовину
        box('blind', (w, 0.06, 0.02), (0, -0.09, z0 + h - 0.06 - i * 0.05), o['white'], p, bevel=0)
    box('sill', (w + 0.2, 0.2, 0.04), (0, -0.1, z0 - 0.04), o['white'], p)
    area_light('window_light', (0, -0.3, z0 + h / 2 + 0.3), (R(-60), 0, 0), (w, h), (0.45, 0.62, 1.0), 380, p)


def stage_screen(m, p, spec, rng):
    o = office_mats()
    w = spec.get('width', 4.4)
    z = 1.55
    box('screen_frame', (w - 1.0, 0.06, 1.7), (0, -0.03, z + 0.2), m['black'], p, bevel=0.02)
    box('screen', (w - 1.16, 0.02, 1.54), (0, -0.065, z + 0.2), mat('slide', hex_rgb('#e8ecf5'), emit=(0.9, 0.95, 1.0),
                                                                    emit_strength=0.35), p, bevel=0)
    box('slide_bar', (w - 1.5, 0.01, 0.16), (0, -0.075, z + 0.78), o['navy'], p, bevel=0)
    for i, hh in enumerate((0.3, 0.45, 0.6, 0.85)):
        box('slide_col', (0.22, 0.01, hh), (-0.6 + i * 0.4, -0.075, z - 0.4 + hh / 2), o['neon2'] if i == 3 else o['neon'],
            p, bevel=0)
    curtain = mat('stage_curtain', hex_rgb('#8f2236'), rough=0.95)
    for sx in (-1, 1):
        for k in range(4):
            box('curtain', (0.13, 0.08, 2.6), (sx * (w / 2 - 0.08 - k * 0.11), -0.1 - (k % 2) * 0.03, 1.4), curtain, p,
                bevel=0.04)
    box('valance', (w, 0.14, 0.25), (0, -0.12, 2.82), curtain, p, bevel=0.04)
    box('neon_top', (w - 0.2, 0.02, 0.03), (0, -0.2, 2.68), o['neon'], p, bevel=0)
    point_light('screen_glow', (0, -0.8, z + 0.2), (0.85, 0.92, 1.0), 60, 0.4, p)


def neon_logo(m, p, spec, rng):
    o = office_mats()
    box('logo_back', (1.6, 0.04, 0.7), (0, -0.02, 1.9), o['navy'], p, bevel=0.02)
    text('logo_text', spec.get('text', ''), 0.36, (0, -0.05, 1.95), o['neon'], p, font=FONT_SIGN)
    box('logo_under', (1.2, 0.01, 0.025), (0, -0.05, 1.7), o['neon2'], p, bevel=0)
    point_light('logo_glow', (0, -0.5, 1.9), NEON, 30, 0.3, p)


def growth_chart(m, p, spec, rng):
    o = office_mats()
    box('chart_frame', (1.5, 0.04, 1.05), (0, -0.02, 1.75), o['white'], p, bevel=0.015)
    for i, hh in enumerate((0.2, 0.32, 0.45, 0.6, 0.8)):
        box('bar', (0.16, 0.02, hh), (-0.5 + i * 0.25, -0.05, 1.3 + hh / 2), o['neon'] if i % 2 else o['neon2'], p, bevel=0)
    box('axis', (1.3, 0.01, 0.015), (0, -0.05, 1.29), o['navy'], p, bevel=0)
    box('arrow', (1.0, 0.015, 0.03), (0.05, -0.06, 1.85), mat('green', hex_rgb('#5cff8a'), emit=(0.3, 1, 0.45),
                                                            emit_strength=2), p, bevel=0, rot=(0, R(-28), 0))


def sticky_board(m, p, spec, rng):
    w = spec.get('width', 2.2)
    box('cork', (w, 0.04, 1.1), (0, -0.02, 1.7), mat('cork', hex_rgb('#c99a63'), rough=1), p, bevel=0.015)
    box('cork_frame', (w + 0.06, 0.03, 1.16), (0, 0.0, 1.7), m['light_wood'], p, bevel=0.01)
    cols = ['#ffe066', '#ff9ec7', '#9ed8ff', '#b4f08c']
    for i in range(int(w / 0.3) * 3):
        r_, c_ = divmod(i, int(w / 0.3))
        box('note', (0.2, 0.01, 0.2), (-w / 2 + 0.25 + c_ * 0.3 + rng.uniform(-0.03, 0.03), -0.045,
                                       2.05 - r_ * 0.33 + rng.uniform(-0.03, 0.03)),
            mat(f'note{i % 4}', hex_rgb(cols[i % 4])), p, bevel=0, rot=(0, R(rng.uniform(-8, 8)), 0))


def wall_shelf(m, p, spec, rng):
    box('shelf', (1.2, 0.25, 0.04), (0, -0.12, 1.6), m['light_wood'], p, bevel=0.01)
    books = _book_mats()
    for i in range(6):
        box('book', (0.05, 0.18, 0.24), (-0.45 + i * 0.07, -0.12, 1.74), books[i], p, bevel=0.004)
    sphere('trophy', 0.07, (0.35, -0.12, 1.72), m['brass'], p)


# ================================================================ магазин «Спортмастер»

SNEAKER_COLORS = ['#e0383e', '#2f6fd6', '#3fbf6a', '#ffcc33', '#f4f4f6', '#3a3f55', '#ff8c2e', '#8a5cd6']
SECTION_COLORS = SNEAKER_COLORS[:4]  # красный, синий, зелёный, жёлтый — секции мини-игры


def sport_mats():
    return {
        'blue': mat('sm_blue_m', hex_rgb('#1d4fa0'), rough=0.45),
        'blue_light': mat('sm_blue_l', hex_rgb('#3a72c8'), rough=0.45),
        'red': mat('sm_red_m', hex_rgb('#e0383e'), rough=0.45),
        'white': mat('sm_white', hex_rgb('#f1f2f5'), rough=0.4),
        'chrome': mat('sm_chrome', hex_rgb('#c9ced8'), rough=0.2, metal=1.0),
        'led': mat('sm_led', (1, 1, 1), emit=(1.0, 0.97, 0.9), emit_strength=6),
    }


def sneaker(p, color_hex, loc, rot_z=0.0, scale=1.0, name='sneaker'):
    """Кроссовок длиной вдоль локального X (носок в +X)."""
    s = scale
    e = empty(name, loc, rot_z, p)
    upper = mat(f'sn_{color_hex}', hex_rgb(color_hex), rough=0.55)
    white = mat('sn_white', hex_rgb('#f6f6f8'), rough=0.5)
    sole = mat('sn_sole', hex_rgb('#d7dae0'), rough=0.6)
    box('sole', (0.29 * s, 0.11 * s, 0.035 * s), (0, 0, 0.0175 * s), sole, e, bevel=0.012 * s)
    box('upper', (0.24 * s, 0.1 * s, 0.075 * s), (-0.02 * s, 0, 0.07 * s), upper, e, bevel=0.03 * s)
    sphere('toe', 0.05 * s, (0.09 * s, 0, 0.055 * s), upper, e, scale=(1.2, 1, 0.7), seg=10, rings=6)
    box('heel', (0.06 * s, 0.1 * s, 0.1 * s), (-0.11 * s, 0, 0.085 * s), upper, e, bevel=0.025 * s)
    box('collar', (0.08 * s, 0.07 * s, 0.02 * s), (-0.08 * s, 0, 0.12 * s), mat('sn_inner', hex_rgb('#2a2a30')), e,
        bevel=0.008 * s)
    box('laces', (0.1 * s, 0.05 * s, 0.012 * s), (0.02 * s, 0, 0.11 * s), white, e, bevel=0.004 * s)
    box('stripe', (0.12 * s, 0.104 * s, 0.018 * s), (-0.02 * s, 0, 0.065 * s), white, e, bevel=0, rot=(0, R(-20), 0))
    return e


def shoe_shelf(m, p, W, D, rng, spec=None):
    """Стеллаж с обувью у стены. Секция мини-игры (spec.section = 0..3) — цветные ценники и места-«слоты»."""
    sm = sport_mats()
    section = (spec or {}).get('section')
    H = 2.25
    y0 = D / 2 - 0.22
    box('back', (W - 0.02, 0.04, H), (0, D / 2 - 0.04, H / 2), sm['white'], p, bevel=0.01)
    for sx in (-1, 1):
        box('side', (0.05, 0.42, H), (sx * (W / 2 - 0.03), y0, H / 2), sm['white'], p, bevel=0.01)
    box('header', (W, 0.44, 0.22), (0, y0, H + 0.08), sm['blue'], p, bevel=0.01)
    box('header_stripe', (W, 0.445, 0.04), (0, y0, H - 0.02), sm['red'], p, bevel=0)
    box('led', (W - 0.1, 0.02, 0.02), (0, y0 - 0.15, H - 0.07), sm['led'], p, bevel=0)
    box('plinth', (W, 0.42, 0.12), (0, y0, 0.06), sm['blue'], p, bevel=0.01)
    tag = mat(f'tag_{section}', hex_rgb(SECTION_COLORS[section]), emit=hex_rgb(SECTION_COLORS[section]),
              emit_strength=0.8) if section is not None else sm['white']
    for lvl, z in enumerate((0.5, 1.0, 1.5)):
        box('shelf', (W - 0.1, 0.38, 0.025), (0, y0, z), sm['white'], p, bevel=0.005, rot=(R(-6), 0, 0))
        box('tag', (0.2 if section is not None else 0.12, 0.01, 0.06), (0, y0 - 0.2, z - 0.035), tag, p, bevel=0)
        if section is not None:
            empty(f'slot_{lvl}', (0, y0 - 0.02, z + 0.02), 0, p)  # сюда игра ставит кроссовок
        else:
            for k in (-1, 1):
                sneaker(p, rng.choice(SNEAKER_COLORS[4:] + SNEAKER_COLORS[:4]), (k * 0.2, y0 - 0.02, z + 0.02))
    point_light('shelf_light', (0, y0 - 0.25, H - 0.15), (1, 0.95, 0.88), 18, 0.1, p)


def clothes_rack(m, p, W, D, rng):
    sm = sport_mats()
    for sx in (-1, 1):
        box('rack_foot', (0.06, 0.5, 0.04), (sx * (W / 2 - 0.15), 0, 0.02), sm['chrome'], p, bevel=0)
        cyl('rack_post', 0.018, 1.5, (sx * (W / 2 - 0.15), 0, 0.04), sm['chrome'], p, verts=8)
    cyl('rack_bar', 0.015, W - 0.3, (-(W / 2 - 0.15), 0, 1.5), sm['chrome'], p, verts=8, rot=(0, R(90), 0))
    cols = ['#e0383e', '#1d4fa0', '#f1f2f5', '#ffcc33', '#2a2a30', '#3fbf6a', '#8a5cd6', '#ff8c2e']
    n = int((W - 0.4) / 0.13)
    for i in range(n):
        x = -(W / 2 - 0.25) + i * 0.13
        c = mat(f'cloth{cols[i % len(cols)]}', hex_rgb(cols[i % len(cols)]), rough=0.9)
        box('hanger', (0.012, 0.3, 0.02), (x, 0, 1.47), sm['chrome'], p, bevel=0)
        box('shirt', (0.05, 0.42, 0.6), (x, 0, 1.16), c, p, bevel=0.02)
        box('sleeve', (0.045, 0.1, 0.25), (x, -0.25, 1.27), c, p, bevel=0.015, rot=(R(-25), 0, 0))


def cash_counter(m, p, W, D, rng):
    sm = sport_mats()
    box('counter', (W - 0.1, D - 0.3, 1.0), (0, 0.05, 0.5), sm['blue'], p, bevel=0.02)
    box('counter_top', (W, D - 0.2, 0.05), (0, 0.05, 1.025), sm['white'], p, bevel=0.01)
    box('counter_stripe', (W - 0.08, 0.01, 0.1), (0, -(D - 0.3) / 2 + 0.05 - 0.005, 0.75), sm['red'], p, bevel=0)
    text('counter_logo', 'СПОРТМАСТЕР', 0.12, (0, -(D - 0.3) / 2 + 0.04, 0.5), sm['white'], p, font=FONT_SIGN)
    box('register', (0.35, 0.3, 0.12), (-0.4, 0.15, 1.11), m['black'], p, bevel=0.02)
    box('reg_screen', (0.3, 0.04, 0.22), (-0.4, 0.3, 1.27), m['black'], p, bevel=0.01, rot=(R(-15), 0, 0))
    box('reg_glow', (0.26, 0.01, 0.18), (-0.4, 0.27, 1.27), office_mats()['code'], p, bevel=0, rot=(R(-15), 0, 0))
    box('terminal', (0.1, 0.16, 0.05), (0.15, -0.05, 1.075), m['black'], p, bevel=0.01)
    for i, c in enumerate(('#1d4fa0', '#e0383e')):
        box('bag', (0.3, 0.12, 0.35), (0.55 + i * 0.12, 0.15, 1.225), mat(f'bag{c}', hex_rgb(c), rough=0.8), p, bevel=0.02,
            rot=(0, 0, R(10 * i)))


def fitting_room(m, p, W, D, rng):
    """Примерочные у левой стены: кабинки вдоль стены (длина по локальному X), шторы в сторону зала (−Y)."""
    sm = sport_mats()
    n = max(1, int(W))
    box('fr_roof', (W, D - 0.1, 0.08), (0, 0.05, 2.25), sm['blue'], p, bevel=0.01)
    curtain = mat('fr_curtain', hex_rgb('#2b5cb0'), rough=0.95)
    for i in range(n + 1):
        box('fr_wall', (0.06, D - 0.1, 2.25), (-W / 2 + i * (W / n), 0.05, 1.125), sm['white'], p, bevel=0.01)
    for i in range(n):
        cx = -W / 2 + (i + 0.5) * (W / n)
        for k in range(6):
            box('curtain_fold', (W / n / 6, 0.06, 1.9), (cx - W / n / 2 + (k + 0.5) * W / n / 6, -(D - 0.1) / 2 + 0.05 +
                                                         (0.02 if k % 2 else -0.02), 1.15), curtain, p, bevel=0.02)
        cyl('fr_lamp', 0.05, 0.04, (cx, -(D - 0.1) / 2 + 0.1, 2.21), sm['led'], p, verts=10)
        box('fr_sign', (0.25, 0.02, 0.12), (cx, -(D - 0.1) / 2 + 0.02, 2.12), sm['red'], p, bevel=0)


def ball_basket(m, p, W, D, rng):
    sm = sport_mats()
    cyl('basket', 0.38, 0.55, (0, 0, 0), m['metal'], p, verts=16, r_top=0.42)
    for i in range(8):
        a = i * math.pi / 4
        cyl('wire', 0.008, 0.56, (0.4 * math.cos(a), 0.4 * math.sin(a), 0), sm['chrome'], p, verts=4)
    balls = [('#ff8c2e', 0.13), ('#f4f4f6', 0.11), ('#ffcc33', 0.1), ('#e0383e', 0.12), ('#1d4fa0', 0.11)]
    for i, (c, r) in enumerate(balls):
        a = i * 1.3
        sphere('ball', r, (0.18 * math.cos(a), 0.18 * math.sin(a), 0.58 + (i % 2) * 0.08), mat(f'ball{c}', hex_rgb(c),
                                                                                             rough=0.5), p)


def mannequin(m, p, W, D, rng):
    sm = sport_mats()
    cyl('mq_base', 0.2, 0.04, (0, 0, 0), sm['chrome'], p, verts=16)
    cyl('mq_pole', 0.02, 0.9, (0, 0, 0.04), sm['chrome'], p, verts=8)
    box('mq_legs', (0.3, 0.16, 0.5), (0, 0, 0.95), m['black'], p, bevel=0.06)
    box('mq_torso', (0.42, 0.24, 0.55), (0, 0, 1.45), sm['red'], p, bevel=0.09)
    box('mq_stripe', (0.43, 0.245, 0.05), (0, 0, 1.4), sm['white'], p, bevel=0)
    sphere('mq_head', 0.11, (0, 0, 1.86), sm['white'], p, scale=(1, 1, 1.2))


def display_table(m, p, W, D, rng):
    sm = sport_mats()
    box('dt_body', (W - 0.2, D - 0.3, 0.6), (0, 0, 0.3), sm['white'], p, bevel=0.02)
    box('dt_top', (W - 0.15, D - 0.25, 0.04), (0, 0, 0.62), m['light_wood'], p, bevel=0.01)
    for i in range(3):
        sneaker(p, rng.choice(SNEAKER_COLORS), (-0.5 + i * 0.5, -0.05, 0.64), R(rng.uniform(-30, 30)))
    for i in range(2):
        box('shoebox', (0.34, 0.2, 0.12), (-0.25 + i * 0.5, 0.18, 0.7), sm['red' if i else 'blue'], p, bevel=0.008)


def try_bench(m, p, W, D, rng):
    sm = sport_mats()
    for sx in (-1, 1):
        box('tb_leg', (0.06, 0.4, 0.42), (sx * (W / 2 - 0.15), 0, 0.21), sm['chrome'], p, bevel=0)
    box('tb_seat', (W - 0.1, 0.42, 0.1), (0, 0, 0.47), sm['blue'], p, bevel=0.03)
    for i in range(3):
        box('tb_box', (0.32, 0.2, 0.12), (-0.4 + i * 0.12, 0.05, 0.06 + i * 0.12), mat('shoebox_o', hex_rgb('#ff8c2e')), p,
            bevel=0.008, rot=(0, 0, R(5 * i)))
    sneaker(p, '#3fbf6a', (0.35, -0.05, 0.52), R(20))


def stack_boxes(m, p, W, D, rng):
    sm = sport_mats()
    for i in range(5):
        box('box', (0.36, 0.22, 0.13), (rng.uniform(-0.05, 0.05), rng.uniform(-0.05, 0.05), 0.065 + i * 0.13),
            sm['red'] if i % 2 else sm['blue'], p, bevel=0.008, rot=(0, 0, R(rng.uniform(-12, 12))))


def sport_banner(m, p, spec, rng):
    sm = sport_mats()
    w = spec.get('width', 4.0)
    z = 2.62
    box('banner', (w, 0.08, 0.5), (0, -0.05, z), mat('banner_blue', hex_rgb('#1d4fa0'), emit=(0.12, 0.3, 0.8),
                                                    emit_strength=0.8), p, bevel=0.02)
    box('banner_stripe', (w, 0.085, 0.07), (0, -0.05, z - 0.21), sm['red'], p, bevel=0)
    white = mat('sign_white', (1, 1, 1), emit=(1, 1, 1), emit_strength=2.2)
    text('banner_text', spec.get('text', ''), 0.3, (0.15, -0.1, z + 0.02), white, p, font=FONT_SIGN)
    for i in range(3):
        box('chev', (0.2, 0.03, 0.06), (-w / 2 + 0.35 + i * 0.04, -0.1, z + 0.02 + 0.1 * (1 - i)), sm['red'], p, bevel=0,
            rot=(0, R(-40), 0))


def board_best(m, p, spec, rng):
    sm = sport_mats()
    z = 1.7
    gold = mat('gold', hex_rgb('#e8b83a'), rough=0.3, metal=0.9)
    box('bb_frame', (1.9, 0.05, 1.25), (0, -0.025, z), gold, p, bevel=0.02)
    box('bb_board', (1.75, 0.02, 1.1), (0, -0.06, z), sm['blue'], p, bevel=0)
    text('bb_t1', 'ЛУЧШИЙ', 0.24, (0.1, -0.075, z + 0.22), sm['white'], p, font=FONT_SIGN)
    text('bb_t2', 'ПРОДАВЕЦ', 0.24, (0.1, -0.075, z - 0.08), sm['white'], p, font=FONT_SIGN)
    star = mat('star', hex_rgb('#ffd34a'), emit=(1, 0.8, 0.3), emit_strength=1.5)
    for i in range(5):  # звёзды рейтинга
        box('star', (0.1, 0.01, 0.1), (-0.45 + i * 0.2, -0.075, z - 0.36), star, p, bevel=0, rot=(0, R(45), 0))
    box('bb_photo', (0.36, 0.01, 0.44), (-0.62, -0.075, z + 0.08), sm['white'], p, bevel=0)
    sphere('bb_face', 0.09, (-0.62, -0.085, z + 0.14), mat('skin_ph', hex_rgb('#e9b892')), p, scale=(1, 0.3, 1.1))
    box('bb_body', (0.24, 0.01, 0.14), (-0.62, -0.085, z - 0.04), mat('shirt_ph', hex_rgb('#2f8f88')), p, bevel=0)
    point_light('bb_light', (0, -0.4, z + 0.8), WARM, 40, 0.1, p)


def sport_poster(m, p, spec, rng):
    sm = sport_mats()
    box('poster', (1.0, 0.03, 1.4), (0, -0.015, 1.7), sm['white'], p, bevel=0.01)
    box('poster_img', (0.86, 0.01, 1.0), (0, -0.035, 1.82), mat('poster_bg', hex_rgb(spec.get('color', '#ff8c2e'))), p,
        bevel=0)
    # силуэт бегуна
    sil = m['black']
    sphere('run_head', 0.07, (0.05, -0.045, 2.05), sil, p, scale=(1, 0.2, 1))
    box('run_body', (0.1, 0.01, 0.3), (0.0, -0.045, 1.85), sil, p, bevel=0, rot=(0, R(15), 0))
    box('run_leg1', (0.06, 0.01, 0.3), (-0.08, -0.045, 1.6), sil, p, bevel=0, rot=(0, R(-35), 0))
    box('run_leg2', (0.06, 0.01, 0.3), (0.1, -0.045, 1.62), sil, p, bevel=0, rot=(0, R(40), 0))
    text('poster_text', spec.get('text', 'БЕГИ!'), 0.12, (0, -0.04, 1.2), sm['red'], p, font=FONT_SIGN)


def mirror(m, p, spec, rng):
    sm = sport_mats()
    box('mirror_frame', (0.8, 0.04, 1.8), (0, -0.02, 1.2), sm['white'], p, bevel=0.02)
    box('mirror', (0.7, 0.01, 1.7), (0, -0.045, 1.2), mat('mirror', hex_rgb('#cfe4f2'), rough=0.02, metal=1.0), p, bevel=0)


FLOOR = {
    'bookshelf': bookshelf, 'bench': bench, 'umbrella_stand': umbrella_stand, 'side_table_lamp': side_table_lamp,
    'plant_big': plant_big, 'plant_small': plant_small, 'rug_round': rug_round, 'coffee_table': coffee_table,
    'sofa': sofa, 'armchair': armchair, 'floor_lamp': floor_lamp, 'coat_rack': coat_rack, 'crate_books': crate_books,
    'runner_rug': runner_rug, 'pouf': pouf, 'cat': cat, 'books_floor': books_floor, 'console_table': console_table,
    # офис «В ХОД»
    'desk_pc': desk_pc, 'office_chair': office_chair, 'audience_chair': audience_chair, 'stage': stage,
    'server_rack': server_rack, 'filing_cabinet': filing_cabinet, 'water_cooler': water_cooler, 'rug_rect': rug_rect,
    'coffee_table_low': coffee_table_low, 'beanbag': beanbag, 'bar_table': bar_table, 'bar_stool': bar_stool,
    'whiteboard': whiteboard, 'podium': podium, 'item_newspaper': item_newspaper, 'item_phone': item_phone, 'item_folder': item_folder,
    # магазин «Спортмастер»
    'shoe_shelf': shoe_shelf, 'clothes_rack': clothes_rack, 'cash_counter': cash_counter, 'fitting_room': fitting_room,
    'ball_basket': ball_basket, 'mannequin': mannequin, 'display_table': display_table, 'try_bench': try_bench,
    'stack_boxes': stack_boxes,
}
WALL = {'window': lambda m, p, s, r: (office_window if s.get('style') == 'office' else window)(m, p, s, r),
        'sconce': sconce, 'sign_hello': sign_hello, 'painting': painting, 'clock': clock,
        'stage_screen': stage_screen, 'neon_logo': neon_logo, 'growth_chart': growth_chart, 'sticky_board': sticky_board,
        'wall_shelf': wall_shelf, 'sport_banner': sport_banner, 'board_best': board_best, 'sport_poster': sport_poster,
        'mirror': mirror}
