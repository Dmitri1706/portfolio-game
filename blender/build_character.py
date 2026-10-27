"""
Персонаж игрока: low-poly парень в очках, футболка, джинсы, белые кроссовки.
Собирается из «суставов» (пустышек) и простых фигур, позы задаются углами суставов.
Рендерит все анимации в 4 изометрических направлениях в спрайт-листы:
  public/assets/sprites3d/player_<анимация>.webp — строки: se, sw, ne, nw; столбцы — кадры.
  src/assets/player3d.json — размеры кадров, точка опоры, анимации (читает игра).

Запуск: C:/Tools/blender/blender.exe -b --python blender/build_character.py -- [preview|final] [вариант] [анимация…]
Варианты (VARIANTS ниже): player — наш персонаж; spectator1–3 — зрители в зале; customer, shopper1–3 — покупатели.
Другие варианты пишутся в public/assets/sprites3d/<вариант>_<анимация>.webp и src/assets/characters/<вариант>.json.
"""
import json
import math
import os
import sys
import time

sys.path.append(os.path.dirname(__file__))
import bpy  # noqa: E402
import numpy as np  # noqa: E402
import lib  # noqa: E402
from lib import TEX, PPU, CAM_FORWARD, CAM_ROT, box, cyl, sphere, empty, mat, hex_rgb  # noqa: E402
from mathutils import Vector  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
QUALITY = args[0] if args else 'preview'
VARIANT = args[1] if len(args) > 1 else 'player'
ONLY = set(args[2:])

# Внешность и набор анимаций каждого варианта
ALL_DIRS = ['se', 'sw', 'ne', 'nw']
VARIANTS = {
    'player': dict(glasses=True, hair='short', colors={}, anims=None, dirs=ALL_DIRS),
    'spectator1': dict(glasses=False, hair='short', anims=['sit', 'clap'], dirs=['nw'],
                       colors=dict(hair='#1f1a1a', shirt='#e8665a', jeans='#2a3452')),
    'spectator2': dict(glasses=False, hair='long', anims=['sit', 'clap'], dirs=['nw'],
                       colors=dict(hair='#e2bf5c', shirt='#7a5cc8', jeans='#3b3f4f', skin='#f1c7a6')),
    'spectator3': dict(glasses=True, hair='short', anims=['sit', 'clap'], dirs=['nw'],
                       colors=dict(hair='#c4622d', shirt='#e0a630', jeans='#4d5a7a', skin='#c98b62')),
    'customer': dict(glasses=False, hair='short', anims=['idle', 'walk'], dirs=ALL_DIRS,
                     colors=dict(hair='#6b4a38', shirt='#f4f4f6', jeans='#2a3452')),
    'shopper1': dict(glasses=False, hair='long', anims=['idle', 'walk'], dirs=ALL_DIRS,
                     colors=dict(hair='#e2bf5c', shirt='#ff7aa8', jeans='#262a3b', skin='#f1c7a6')),
    'shopper2': dict(glasses=False, hair='short', anims=['idle', 'walk'], dirs=ALL_DIRS,
                     colors=dict(hair='#231a1a', shirt='#ff8c2e', jeans='#6f8fc9', skin='#b07a55')),
    'shopper3': dict(glasses=True, hair='long', anims=['idle', 'walk'], dirs=ALL_DIRS,
                     colors=dict(hair='#c4622d', shirt='#7a5cc8', jeans='#36466f')),
}
V = VARIANTS[VARIANT]
COL = dict(skin='#e9b892', hair='#4a3124', shirt='#2f8f88', jeans='#36466f')
COL.update(V['colors'])

FRAME_W, FRAME_H = 160, 272       # пиксели текстуры
ANCHOR_X, ANCHOR_Y = 80, 250      # где в кадре точка на полу под персонажем
DIRS = {d: a for d, a in {'se': math.radians(90), 'sw': 0.0, 'ne': math.radians(180), 'nw': math.radians(-90)}.items()
        if d in V['dirs']}
OUT = lib.ensure_dir(os.path.abspath('public/assets/sprites3d'))
TMP = lib.ensure_dir(os.path.join(os.environ.get('TEMP', '.'), 'char_render'))
R = math.radians

sc = lib.reset_scene()
sc.cycles.samples = 48 if QUALITY == 'final' else 20
sc.render.film_transparent = True
sc.view_settings.exposure = 0.2
lib.world_color(sc, (0.18, 0.17, 0.2), 1.0)

# ---------------------------------------------------------------- материалы
SKIN = mat('skin', hex_rgb(COL['skin']), rough=0.6)
HAIR = mat('hair', hex_rgb(COL['hair']), rough=0.7)
SHIRT = mat('shirt', hex_rgb(COL['shirt']), rough=0.85)
JEANS = mat('jeans', hex_rgb(COL['jeans']), rough=0.85)
SHOE = mat('shoe', hex_rgb('#f2f2f2'), rough=0.5)
SOLE = mat('sole', hex_rgb('#a3a9b3'), rough=0.7)
FRAME = mat('glasses', hex_rgb('#1c1a20'), rough=0.3, metal=0.3)
LENS = mat('lens', hex_rgb('#d4ecff'), rough=0.05, coat=1.0)
DARK = mat('eye', hex_rgb('#1d1a1f'), rough=0.3)
LIP = mat('lip', hex_rgb('#b47862'), rough=0.6)

# ---------------------------------------------------------------- скелет и тело
J = {}


def joint(name, loc, parent):
    J[name] = empty(name, loc, 0, parent)
    return J[name]


root = empty('root')
PEL = 0.8  # высота таза над полом
pelvis = joint('pelvis', (0, 0, PEL), root)
box('hips', (0.38, 0.24, 0.17), (0, 0, 0.0), JEANS, pelvis, bevel=0.05)
box('belt', (0.39, 0.25, 0.035), (0, 0, 0.08), mat('belt', hex_rgb('#3a2a20')), pelvis, bevel=0.01)
spine = joint('spine', (0, 0, 0.06), pelvis)
box('torso', (0.46, 0.28, 0.44), (0, 0, 0.24), SHIRT, spine, bevel=0.09)
cyl('neck', 0.06, 0.06, (0, 0, 0.45), SKIN, spine, verts=10)
head = joint('head', (0, 0, 0.5), spine)
box('head_mesh', (0.31, 0.3, 0.33), (0, 0, 0.165), SKIN, head, bevel=0.1)
for sx in (-1, 1):
    sphere('ear', 0.04, (sx * 0.157, 0.01, 0.15), SKIN, head, scale=(0.6, 1, 1.2), seg=8, rings=5)
# волосы: шапка сверху, затылок, чёлка набок
box('hair_top', (0.34, 0.33, 0.13), (0, 0.01, 0.32), HAIR, head, bevel=0.06)
box('hair_back', (0.33, 0.1, 0.25), (0, 0.12, 0.22), HAIR, head, bevel=0.045)
for sx in (-1, 1):
    box('hair_side', (0.035, 0.24, 0.12), (sx * 0.158, 0.03, 0.25), HAIR, head, bevel=0.015)
box('fringe', (0.25, 0.06, 0.075), (0.035, -0.145, 0.285), HAIR, head, bevel=0.025, rot=(0, R(-12), 0))
if V['hair'] == 'long':  # длинные волосы до плеч
    box('hair_long', (0.36, 0.14, 0.36), (0, 0.11, 0.08), HAIR, head, bevel=0.06)
    for sx in (-1, 1):
        box('hair_long_side', (0.05, 0.2, 0.3), (sx * 0.17, 0.02, 0.1), HAIR, head, bevel=0.025)
# лицо: глаза, нос, рот
for sx in (-1, 1):
    sphere('eye', 0.02, (sx * 0.065, -0.15, 0.17), DARK, head, seg=8, rings=5)
box('nose', (0.035, 0.035, 0.05), (0, -0.16, 0.12), SKIN, head, bevel=0.012)
box('mouth', (0.07, 0.01, 0.014), (0, -0.151, 0.07), LIP, head, bevel=0)
# очки: оправа, стёкла, перемычка, дужки
if V['glasses']:
    for sx in (-1, 1):
        cyl('rim', 0.055, 0.016, (sx * 0.068, -0.156, 0.17), FRAME, head, verts=14, rot=(R(90), 0, 0))
        cyl('lens', 0.044, 0.018, (sx * 0.068, -0.157, 0.17), LENS, head, verts=14, rot=(R(90), 0, 0))
        box('temple', (0.01, 0.16, 0.014), (sx * 0.158, -0.08, 0.18), FRAME, head, bevel=0)
    box('bridge', (0.035, 0.012, 0.012), (0, -0.165, 0.178), FRAME, head, bevel=0)

for side, sx in (('L', -1), ('R', 1)):
    sh = joint(f'shoulder{side}', (sx * 0.285, 0, 0.39), spine)
    cyl('sleeve', 0.08, 0.16, (0, 0, -0.15), SHIRT, sh, verts=10)
    cyl('upper_arm', 0.056, 0.25, (0, 0, -0.25), SKIN, sh, verts=10)
    el = joint(f'elbow{side}', (0, 0, -0.25), sh)
    cyl('forearm', 0.05, 0.21, (0, 0, -0.21), SKIN, el, verts=10, r_top=0.055)
    sphere('hand', 0.062, (0, -0.005, -0.25), SKIN, el, scale=(0.85, 1, 1.1), seg=10, rings=6)
    hp = joint(f'hip{side}', (sx * 0.1, 0, -0.03), pelvis)
    cyl('thigh', 0.092, 0.36, (0, 0, -0.36), JEANS, hp, verts=10, r_top=0.1)
    kn = joint(f'knee{side}', (0, 0, -0.35), hp)
    cyl('shin', 0.076, 0.33, (0, 0, -0.33), JEANS, kn, verts=10, r_top=0.086)
    an = joint(f'ankle{side}', (0, 0, -0.33), kn)
    box('shoe', (0.14, 0.28, 0.1), (0, -0.05, -0.06), SHOE, an, bevel=0.035)
    box('sole', (0.145, 0.285, 0.03), (0, -0.05, -0.105), SOLE, an, bevel=0.01)
    box('laces', (0.06, 0.08, 0.01), (0, -0.1, -0.005), mat('laces', hex_rgb('#c9ced6')), an, bevel=0)

# ---------------------------------------------------------------- позы

def reset_pose():
    for j in J.values():
        j.rotation_euler = (0, 0, 0)
    J['pelvis'].location = (0, 0, PEL)


def limb(name, fwd=0.0, out=0.0):
    """Конечность, висящая вниз: fwd — вперёд (градусы), out — в сторону от тела."""
    side = name[-1]
    J[name].rotation_euler = (R(-fwd), R(out if side == 'R' else -out), 0)


def bend(name, deg):
    """Колено: сгиб назад (положительный). Локоть: сгиб вперёд (передавайте отрицательное в fwd через limb)."""
    J[name].rotation_euler = (R(deg), 0, 0)


def lean(deg, twist=0.0):
    J['spine'].rotation_euler = (R(deg), 0, R(twist))


def arms_hold():
    for s in 'LR':
        limb(f'shoulder{s}', 30, -10)
        J[f'elbow{s}'].rotation_euler = (R(-75), 0, 0)


def legs_walk(ph, amp=26):
    for s, off in (('L', 0), ('R', math.pi)):
        a = amp * math.sin(ph + off)
        limb(f'hip{s}', a)
        bend(f'knee{s}', 38 * max(0.0, math.cos(ph + off)) + 6)
        J[f'ankle{s}'].rotation_euler = (R(-0.3 * a), 0, 0)
    J['pelvis'].location = (0, 0, PEL - 0.025 * abs(math.sin(ph)))


def walk(i, n, carry=False):
    ph = 2 * math.pi * i / n
    legs_walk(ph)
    lean(4, 5 * math.sin(ph))
    if carry:
        arms_hold()
    else:
        for s, off in (('L', math.pi), ('R', 0)):
            limb(f'shoulder{s}', 22 * math.sin(ph + off), 4)
            J[f'elbow{s}'].rotation_euler = (R(-18), 0, 0)


def idle(i, n, hold=False):
    b = math.sin(2 * math.pi * i / n)
    J['pelvis'].location = (0, 0, PEL + 0.004 * b)
    lean(1.5 * b)
    if hold:
        arms_hold()
    else:
        for s in 'LR':
            limb(f'shoulder{s}', 2 * b, 5)
            J[f'elbow{s}'].rotation_euler = (R(-8), 0, 0)


def sit(i, n):
    J['pelvis'].location = (0, 0.1, 0.45)
    for s in 'LR':
        limb(f'hip{s}', 88, 4)
        bend(f'knee{s}', 88)
        limb(f'shoulder{s}', 30, 6)
        J[f'elbow{s}'].rotation_euler = (R(-45), 0, 0)
    lean(6)


def stumble(i, n):
    P = [  # наклон, правая нога назад, левая вперёд, руки вперёд-вверх, присед
        (14, 25, -18, 40, 0.0),
        (30, 38, -25, 85, 0.03),
        (36, 30, -40, 110, 0.1),
        (22, 15, -20, 60, 0.05),
        (9, 6, -8, 25, 0.01),
        (2, 0, 0, 5, 0.0),
    ][i]
    lean(P[0])
    limb('hipR', -P[1])
    limb('hipL', -P[2])
    bend('kneeL', 20 + P[4] * 200)
    bend('kneeR', 10)
    for s in 'LR':
        limb(f'shoulder{s}', P[3], 25)
        J[f'elbow{s}'].rotation_euler = (R(-20), 0, 0)
    J['pelvis'].location = (0, 0, PEL - P[4])


def fall(i, n):
    a = 8 * (1 if i % 2 else -1)
    lean(-6)
    for s, k in (('L', 1), ('R', -1)):
        limb(f'shoulder{s}', 165 + a * k, 20)
        J[f'elbow{s}'].rotation_euler = (R(-15), 0, 0)
        limb(f'hip{s}', 8 * k + a * 0.5)
        bend(f'knee{s}', 25)


def land(i, n):
    P = [(PEL - 0.26, 62, 105, 26, 45), (PEL - 0.16, 40, 70, 15, 30), (PEL - 0.05, 15, 28, 6, 12), (PEL, 0, 0, 0, 0)][i]
    J['pelvis'].location = (0, 0, P[0])
    lean(P[3])
    for s in 'LR':
        limb(f'hip{s}', P[1], 8)
        bend(f'knee{s}', P[2])
        J[f'ankle{s}'].rotation_euler = (R(-(P[2] - P[1])), 0, 0)
        limb(f'shoulder{s}', P[4], 30)
        J[f'elbow{s}'].rotation_euler = (R(-20), 0, 0)


def clap(i, n):
    """Аплодисменты сидя: руки перед собой, ладони сходятся и расходятся."""
    sit(i, n)
    apart = 22 if i % 2 else 2
    for s in 'LR':
        limb(f'shoulder{s}', 75, -apart)
        J[f'elbow{s}'].rotation_euler = (R(-55), 0, 0)
    lean(2)


ANIMS = {
    # имя: (кадров, кадров в секунду, повтор, функция позы)
    'clap': (2, 7, 8, clap),
    'idle': (4, 3, -1, lambda i, n: idle(i, n)),
    'walk': (8, 12, -1, lambda i, n: walk(i, n)),
    'sit': (1, 1, -1, sit),
    'hold': (2, 2, -1, lambda i, n: idle(i, n, hold=True)),
    'carry': (8, 12, -1, lambda i, n: walk(i, n, carry=True)),
    'stumble': (6, 10, 0, stumble),
    'fall': (2, 8, -1, fall),
    'land': (4, 10, 0, land),
}

# ---------------------------------------------------------------- камера и свет

cam_data = bpy.data.cameras.new('Cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = max(FRAME_W, FRAME_H) / (PPU * TEX)
cam = bpy.data.objects.new('Cam', cam_data)
sc.collection.objects.link(cam)
h = (ANCHOR_Y - FRAME_H / 2) / TEX / (PPU * math.sin(math.radians(60)))
cam.location = Vector((0, 0, h)) - CAM_FORWARD * 30
cam.rotation_euler = CAM_ROT
sc.camera = cam
sc.render.resolution_x, sc.render.resolution_y = FRAME_W, FRAME_H

right = Vector((0.707, 0.707, 0))
up = Vector((-0.354, 0.354, 0.866))
toward = -CAM_FORWARD
lib.area_light('key', tuple(-right * 3 + up * 2.5 + toward * 2.5 + Vector((0, 0, 1))), (0, 0, 0), (1.5, 1.5),
               (1.0, 0.82, 0.62), 420)
key = bpy.data.objects['key']
key.rotation_euler = (-key.location).to_track_quat('-Z', 'Y').to_euler()
lib.area_light('rim', tuple(right * 3 + up * 1.2 - toward * 1.5 + Vector((0, 0, 1))), (0, 0, 0), (1.2, 1.2),
               (0.55, 0.7, 1.0), 260)
rim = bpy.data.objects['rim']
rim.rotation_euler = (Vector((0, 0, 1)) - rim.location).to_track_quat('-Z', 'Y').to_euler()

# ---------------------------------------------------------------- рендер

if VARIANT == 'player':
    meta_path = os.path.abspath('src/assets/player3d.json')
else:
    meta_path = os.path.join(lib.ensure_dir(os.path.abspath('src/assets/characters')), f'{VARIANT}.json')
meta = json.load(open(meta_path, encoding='utf-8')) if os.path.exists(meta_path) else {}
meta.update({'frameW': FRAME_W, 'frameH': FRAME_H, 'anchorX': ANCHOR_X, 'anchorY': ANCHOR_Y, 'tex': TEX,
             'dirs': list(DIRS.keys())})
meta.setdefault('anims', {})
wanted = V['anims'] or [a for a in ANIMS if a != 'clap']

for name, (n, fps, repeat, fn) in ANIMS.items():
    if name not in wanted or (ONLY and name not in ONLY):
        continue
    t = time.time()
    sheet = np.zeros((FRAME_H * len(DIRS), FRAME_W * n, 4), dtype=np.float32)
    for r, (d, rz) in enumerate(DIRS.items()):
        root.rotation_euler = (0, 0, rz)
        for i in range(n):
            reset_pose()
            fn(i, n)
            bpy.context.view_layer.update()
            tmp = os.path.join(TMP, f'{name}_{d}_{i}.png')
            lib.render_to(tmp, sc)
            px = lib.load_pixels(tmp)[::-1]  # сверху вниз
            sheet[r * FRAME_H:(r + 1) * FRAME_H, i * FRAME_W:(i + 1) * FRAME_W] = px
    lib.save_pixels(sheet[::-1], os.path.join(OUT, f'{VARIANT}_{name}.webp'), quality=92)
    meta['anims'][name] = {'file': f'{VARIANT}_{name}.webp', 'frames': n, 'fps': fps, 'repeat': repeat}
    print(f'[char] {name}: {n}×{len(DIRS)} кадров за {time.time() - t:.0f} с')

json.dump(meta, open(meta_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('[char] готово:', meta_path)
