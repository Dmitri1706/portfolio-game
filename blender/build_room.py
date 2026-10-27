"""
Рендер комнаты по описанию rooms/<id>.json.

Запуск (из папки проекта):
  C:/Tools/blender/blender.exe -b --python blender/build_room.py -- rooms/lobby.json [preview|final] [bg|layers|all]

Результат — в public/assets/rooms/<id>/:
  bg.webp       — вся комната одним рендером (пол, стены, мебель, свет, свечение);
  <слой>.webp   — вырезки: предметы на полу, за которые может зайти персонаж, и интерактивные двери
                  (у дверей два состояния: closed и open);
  src/assets/rooms/<id>.layout.json — где лежит каждая картинка и как она совмещается с игровой сеткой.
"""
import json
import math
import os
import random
import sys
import time

sys.path.append(os.path.dirname(__file__))
import bpy  # noqa: E402
import lib  # noqa: E402
import models  # noqa: E402
from lib import TEX, box, cell, hex_rgb, mat, wood_mat  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOM_PATH = args[0] if args else 'rooms/lobby.json'
QUALITY = args[1] if len(args) > 1 else 'preview'
ONLY = args[2] if len(args) > 2 else 'all'

room = json.load(open(ROOM_PATH, encoding='utf-8'))
OUT = lib.ensure_dir(os.path.abspath(os.path.join('public', 'assets', 'rooms', room['id'])))
TMP = lib.ensure_dir(os.path.join(os.environ.get('TEMP', '.'), 'room_render', room['id']))
COLS, ROWS, WH = room['cols'], room['rows'], room.get('wallHeight', 3.0)
BG_HEX = '#010103'  # уточняется по готовому рендеру
FACE_ROT = {'sw': 0.0, 'se': math.radians(90), 'ne': math.radians(180), 'nw': math.radians(-90)}

rng = random.Random(7)
sc = lib.reset_scene()
lib.set_quality(sc, QUALITY)
lib.world_color(sc, hex_rgb(BG_HEX), 1.0)
sc.view_settings.exposure = 0.35 if room.get('theme', {}).get('walls') != 'office' else 0.0
m = models.M()

# ================================================================ пол и «срез» диорамы

floor = lib.empty('floor')
THEME = room.get('theme', {})
if THEME.get('floor') == 'tiles':
    # светлая плитка 1×1 м с тонкими швами (офис)
    tiles = [mat(f'tile{i}', hex_rgb(c), rough=0.35) for i, c in enumerate(['#d9dce3', '#d2d6de', '#dfe2e8'])]
    grout = mat('grout', hex_rgb('#aab0bd'), rough=0.8)
    box('grout', (COLS, ROWS, 0.02), ((COLS - 1) / 2, -(ROWS - 1) / 2, -0.012), grout, floor, bevel=0)
    for gy in range(ROWS):
        for gx in range(COLS):
            box('tile', (0.97, 0.97, 0.03), (gx, -gy, -0.015), rng.choice(tiles), floor, bevel=0.006)
else:
    # паркет из досок: тёплый (холл) или светлый (магазин)
    tones = ['#c9a274', '#bf986b', '#d1ab7e', '#b8925f'] if THEME.get('floor') == 'light_planks' else \
        ['#8a5a37', '#80533a', '#925f3b', '#7b4f32']
    woods = [wood_mat(f'floor{THEME.get("floor", "")}{i}', c) for i, c in enumerate(tones)]
    y = 0.5
    row = 0
    while y > -ROWS + 0.5 - 1e-6:
        x = -0.5 - (0.6 if row % 2 else 0) * rng.random()
        while x < COLS - 0.5:
            ln = rng.uniform(1.8, 3.4)
            x1 = min(x + ln, COLS - 0.5)
            x0 = max(x, -0.5)
            if x1 - x0 > 0.05:
                box('board', (x1 - x0 - 0.006, 0.194, 0.03), ((x0 + x1) / 2, y - 0.1, -0.015), rng.choice(woods), floor,
                    bevel=0.004)
            x = x1
        y -= 0.2
        row += 1
slab = mat('slab', hex_rgb('#2a1e18'), rough=0.9)
stone = mat('slab_stone', hex_rgb('#4a403c'), rough=0.95)
box('slab', (COLS + 0.35, ROWS + 0.35, 0.2), ((COLS - 1) / 2 + 0.1, -(ROWS - 1) / 2 - 0.1, -0.13), slab, floor, bevel=0.02)
box('slab_stone', (COLS + 0.25, ROWS + 0.25, 0.45), ((COLS - 1) / 2 + 0.1, -(ROWS - 1) / 2 - 0.1, -0.45), stone, floor,
    bevel=0.04)
box('slab_soil', (COLS + 0.1, ROWS + 0.1, 0.3), ((COLS - 1) / 2 + 0.1, -(ROWS - 1) / 2 - 0.1, -0.8),
    mat('slab_soil', hex_rgb('#2b2320'), rough=1), floor, bevel=0.05)

# ================================================================ стены

def wall(side):
    """Стена: штукатурка сверху, деревянные панели снизу, плинтус, карниз."""
    root = lib.empty(f'wall_{side}')
    L = (ROWS if side == 'left' else COLS) + 0.25
    t = 0.25
    if side == 'left':
        root.location = (-0.5, -(ROWS - 1) / 2 + 0.125 - 0.5 + 0.5, 0)
        root.rotation_euler = (0, 0, math.radians(90))
    else:
        root.location = ((COLS - 1) / 2 - 0.125, 0.5, 0)
    # в локальных координатах стены: длина — X, комната — в сторону −Y, сама стена — от y=0 до y=+t
    if THEME.get('walls') == 'office':
        # светлые стены, тёмно-синяя панель снизу с неоновой полосой
        o = models.office_mats()
        box('wall_body', (L, t, WH), (0, t / 2, WH / 2), mat('office_wall', hex_rgb('#e4e7ee'), rough=0.85), root, bevel=0.01)
        box('wall_cap', (L + 0.02, t + 0.04, 0.08), (0, t / 2 - 0.02, WH + 0.04), o['navy'], root)
        box('panel', (L, 0.03, 0.9), (0, -0.015, 0.45), o['navy'], root, bevel=0.005)
        box('neon_line', (L, 0.02, 0.025), (0, -0.035, 0.92), o['neon'], root, bevel=0)
        box('neon_top', (L, 0.02, 0.02), (0, -0.02, WH - 0.12), o['neon2'], root, bevel=0)
        return root
    if THEME.get('walls') == 'shop':
        # магазин: белые стены, синяя панель снизу, красная полоса
        sm = models.sport_mats()
        box('wall_body', (L, t, WH), (0, t / 2, WH / 2), mat('shop_wall', hex_rgb('#eceef2'), rough=0.85), root, bevel=0.01)
        box('wall_cap', (L + 0.02, t + 0.04, 0.08), (0, t / 2 - 0.02, WH + 0.04), sm['blue'], root)
        box('panel', (L, 0.03, 0.75), (0, -0.015, 0.375), sm['blue'], root, bevel=0.005)
        box('stripe', (L, 0.035, 0.08), (0, -0.018, 0.79), sm['red'], root, bevel=0)
        return root
    box('wall_body', (L, t, WH), (0, t / 2, WH / 2), lib.stripes_mat('wallpaper', '#b99a72', '#c7a983', 42), root, bevel=0.01)
    box('wall_cap', (L + 0.02, t + 0.04, 0.08), (0, t / 2 - 0.02, WH + 0.04), mat('cap', hex_rgb('#2b1e17')), root)
    box('wainscot', (L, 0.03, 1.05), (0, -0.015, 0.525), m['wainscot'], root, bevel=0.005)
    box('rail', (L, 0.06, 0.06), (0, -0.03, 1.07), m['molding'], root)
    box('base', (L, 0.05, 0.14), (0, -0.025, 0.07), m['molding'], root)
    box('crown', (L, 0.1, 0.12), (0, -0.05, WH - 0.06), m['molding'], root)
    n = int(L / 0.9)
    for i in range(n + 1):
        x = -L / 2 + i * (L / n)
        box('stile', (0.05, 0.02, 0.85), (x, -0.035, 0.55), m['molding'], root, bevel=0.003)
    return root


walls = {'left': wall('left'), 'right': wall('right')}


def wall_anchor(side, at):
    """Пустышка на поверхности стены в точке at (в клетках), локальный −Y смотрит в комнату."""
    if side == 'left':
        e = lib.empty(f'wa_{side}_{at}', (-0.5, -at, 0), math.radians(90))
    else:
        e = lib.empty(f'wa_{side}_{at}', (at, 0.5, 0), 0.0)
    return e


layers = []  # {'id', 'root', 'kind', 'depth', 'hinge'}
obj_roots = []  # корневые пустышки предметов на полу (для точек-«слотов»)

for side in ('left', 'right'):
    for it in room['walls'].get(side, []):
        a = wall_anchor(side, it['at'])
        if it['type'] == 'door':
            hinge = models.door_wall(m, a, it, rng)
            layers.append({'id': it['id'], 'root': a, 'kind': 'door', 'hinge': hinge, 'side': side, 'at': it['at']})
        else:
            models.WALL[it['type']](m, a, it, rng)
            if it.get('id'):  # интерактивный предмет на стене (например, доска «Лучший продавец»)
                layers.append({'id': it['id'], 'root': a, 'kind': 'wall', 'side': side, 'at': it['at']})

# ================================================================ предметы на полу

for i, o in enumerate(room['objects']):
    w, d = o.get('w', 1), o.get('d', 1)
    face = o.get('face', 'sw')
    cx, cy = o['x'] + (w - 1) / 2, o['y'] + (d - 1) / 2
    root = lib.empty(o.get('id', f"obj{i}_{o['type']}"), cell(cx, cy, o.get('z', 0.0)), FACE_ROT[face])
    W, D = (d, w) if face in ('se', 'nw') else (w, d)
    obj_roots.append(root)
    if o['type'] == 'door_free':
        models.door_free(m, root, W, D, o, rng)
    else:
        fn = models.FLOOR[o['type']]
        # некоторым моделям нужны параметры из описания (например, номер секции полки)
        fn(m, root, W, D, rng, o) if fn.__code__.co_argcount >= 6 else fn(m, root, W, D, rng)
    cell_info = {'x': o['x'], 'y': o['y'], 'w': w, 'd': d}
    if o['type'].startswith('item_'):
        # предмет на мебели, который берут в руки — своя картинка поверх мебели
        layers.append({'id': root.name, 'root': root, 'kind': 'item', **cell_info})
        continue
    if o.get('walkable'):
        continue
    backrest = [c for c in lib.descendants(root) if c.name.startswith('backrest')]
    if backrest:
        # у стульев отдельной вырезкой — только спинка: она закрывает спину сидящего, сиденье остаётся в фоне
        layers.append({'id': root.name, 'root': backrest[0], 'kind': 'occluder', 'bias': 0.6, **cell_info})
    else:
        kind = 'door_free' if o['type'] == 'door_free' else 'occluder'
        layers.append({'id': root.name, 'root': root, 'kind': kind, 'blink': o.get('blink', False), **cell_info})
# ================================================================ общий свет

if THEME.get('walls') == 'office':  # офис светлее и холоднее
    lib.area_light('fill', (COLS / 2, -ROWS / 2, 7.5), (0, 0, 0), (COLS, ROWS), (0.95, 0.95, 1.0), 1100)
else:
    lib.area_light('fill', (COLS / 2, -ROWS / 2, 7.5), (0, 0, 0), (COLS, ROWS), (1.0, 0.86, 0.7),
                   1500 if THEME.get('walls') == 'shop' else 1300)
lib.area_light('fill_cold', (COLS + 4, -ROWS / 2, 5), (0, math.radians(60), 0), (6, 10), (0.55, 0.65, 1.0), 300)

# ================================================================ кадр

bpy.context.view_layer.update()
all_meshes = [o for o in bpy.data.objects if o.type in ('MESH', 'FONT')]
x0, y0, x1, y1 = lib.bbox_px(all_meshes)
PAD = 36
minx, miny = math.floor(x0 - PAD), math.floor(y0 - PAD)
maxx, maxy = math.ceil(x1 + PAD), math.ceil(y1 + PAD)
res = ((maxx - minx) * TEX, (maxy - miny) * TEX)
lib.make_camera(sc, ((minx + maxx) / 2, (miny + maxy) / 2), res)
print(f'[room] кадр {res[0]}×{res[1]}, качество {QUALITY}')


def tex_rect(objs, pad=10):
    """Прямоугольник объектов в пикселях текстуры (x0, y0, x1, y1), выровненный и в пределах кадра."""
    a, b, c, d = lib.bbox_px(objs)
    tx0 = max(0, int(math.floor((a - minx) * TEX)) - pad)
    ty0 = max(0, int(math.floor((b - miny) * TEX)) - pad)
    tx1 = min(res[0], int(math.ceil((c - minx) * TEX)) + pad)
    ty1 = min(res[1], int(math.ceil((d - miny) * TEX)) + pad)
    return tx0, ty0, tx1, ty1


def render_bg():
    t = time.time()
    sc.render.film_transparent = False
    sc.render.use_border = False
    tmp = os.path.join(TMP, 'bg.png')
    lib.render_to(tmp, sc)
    px = lib.load_pixels(tmp)
    px = lib.bloom(px)
    lib.save_pixels(px, os.path.join(OUT, 'bg.webp'), quality=88 if QUALITY == 'final' else 80)
    # настоящий цвет фона после тонировки (угол кадра) — игра заливает им всё вокруг диорамы
    c = px[2, 2, :3]
    global BG_HEX
    BG_HEX = '#' + ''.join(f'{int(round(v * 255)):02x}' for v in c)
    print(f'[room] фон готов за {time.time() - t:.0f} с')


def render_layer(name, objs, rect):
    """Вырезка: всё, кроме objs, становится «дыркой» (holdout); рендерится только прямоугольник rect."""
    keep = set(o.name for o in objs)
    for o in bpy.data.objects:
        if o.type in ('MESH', 'FONT'):
            o.is_holdout = o.name not in keep
    tx0, ty0, tx1, ty1 = rect
    sc.render.film_transparent = True
    sc.render.use_border = True
    sc.render.use_crop_to_border = True
    sc.render.border_min_x, sc.render.border_max_x = tx0 / res[0], tx1 / res[0]
    sc.render.border_min_y, sc.render.border_max_y = 1 - ty1 / res[1], 1 - ty0 / res[1]
    tmp = os.path.join(TMP, f'{name}.png')
    lib.render_to(tmp, sc)
    px = lib.load_pixels(tmp)
    lib.save_pixels(px, os.path.join(OUT, f'{name}.webp'), quality=90)
    h, w = px.shape[:2]
    return {'file': f'{name}.webp', 'x': tx0, 'y': ty0, 'w': w, 'h': h}


out_layers = []
if ONLY in ('all', 'layers'):
    for L in layers:
        objs = lib.descendants(L['root'])
        meshes = [o for o in objs if o.type in ('MESH', 'FONT')]
        t = time.time()
        entry = {'id': L['id'], 'kind': L['kind']}
        if L['kind'] == 'door':
            closed_rect = tex_rect(meshes)
            L['hinge'].rotation_euler[2] = math.radians(-100)
            bpy.context.view_layer.update()
            open_rect = tex_rect(meshes)
            rect = (min(closed_rect[0], open_rect[0]), min(closed_rect[1], open_rect[1]),
                    max(closed_rect[2], open_rect[2]), max(closed_rect[3], open_rect[3]))
            entry['open'] = render_layer(f"{L['id']}_open", meshes, rect)
            L['hinge'].rotation_euler[2] = 0
            bpy.context.view_layer.update()
            entry['closed'] = render_layer(f"{L['id']}_closed", meshes, rect)
            entry.update({'side': L['side'], 'at': L['at']})
        elif L['kind'] == 'wall':
            entry.update(render_layer(L['id'], meshes, tex_rect(meshes)))
            entry.update({'side': L['side'], 'at': L['at']})
        elif L.get('blink'):
            # мигающие огоньки: два кадра одной и той же вырезки
            rect = tex_rect(meshes)
            frames = []
            for fr in (0, 1):
                models.set_blink(L['root'], fr)
                frames.append(render_layer(f"{L['id']}_{fr}", meshes, rect))
            models.set_blink(L['root'], 0)
            entry.update(frames[0])
            entry['frames'] = [fr['file'] for fr in frames]
            entry.update({'cell': {'x': L['x'], 'y': L['y'], 'w': L['w'], 'd': L['d']}})
        else:
            entry.update(render_layer(L['id'], meshes, tex_rect(meshes)))
            entry.update({'cell': {'x': L['x'], 'y': L['y'], 'w': L['w'], 'd': L['d']}})
            if L.get('bias'):
                entry['bias'] = L['bias']
        out_layers.append(entry)
        print(f"[room] слой {L['id']} за {time.time() - t:.0f} с")
    for o in bpy.data.objects:
        if o.type in ('MESH', 'FONT'):
            o.is_holdout = False

if ONLY in ('all', 'bg'):
    render_bg()

layout_path = os.path.join(lib.ensure_dir(os.path.abspath('src/assets/rooms')), f"{room['id']}.layout.json")
layout = json.load(open(layout_path, encoding='utf-8')) if os.path.exists(layout_path) and ONLY != 'all' else {}
layout.update({
    'id': room['id'],
    'image': 'bg.webp',
    'width': res[0],
    'height': res[1],
    'tex': TEX,
    'originX': -minx * TEX,
    'originY': -miny * TEX,
    'bg': BG_HEX,
})
if ONLY in ('all', 'layers'):
    layout['layers'] = out_layers
# точки-«слоты» (например, места для кроссовков на полках): игровые пиксели, по id предмета
bpy.context.view_layer.update()
points = {}
for r in obj_roots:
    slots = sorted((c for c in lib.descendants(r) if c.name.startswith('slot_')), key=lambda c: c.name)
    if slots:
        points[r.name] = [[round(v, 2) for v in lib.screen_of(c.matrix_world.translation)] for c in slots]
layout['points'] = points
json.dump(layout, open(layout_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('[room] готово:', layout_path)
