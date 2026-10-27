"""
Предметы, которые персонаж держит в руках (рендер той же изометрической камерой):
  public/assets/sprites3d/held_<предмет>.webp — кадр 128×128, центр кадра = точка между ладонями.
Запуск: C:/Tools/blender/blender.exe -b --python blender/build_items.py -- [preview|final]
"""
import math
import os
import sys

sys.path.append(os.path.dirname(__file__))
import bpy  # noqa: E402
import lib  # noqa: E402
import models  # noqa: E402
from lib import TEX, PPU, CAM_FORWARD, CAM_ROT, box, cyl, mat, hex_rgb, text, FONT_SIGN  # noqa: E402
from mathutils import Vector  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
QUALITY = args[0] if args else 'preview'
SIZE = 128
OUT = lib.ensure_dir(os.path.abspath('public/assets/sprites3d'))
TMP = lib.ensure_dir(os.path.join(os.environ.get('TEMP', '.'), 'items_render'))
R = math.radians

sc = lib.reset_scene()
sc.cycles.samples = 48 if QUALITY == 'final' else 16
sc.render.film_transparent = True
sc.view_settings.exposure = 0.2
lib.world_color(sc, (0.18, 0.17, 0.2), 1.0)

cam_data = bpy.data.cameras.new('Cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = SIZE / (PPU * TEX)
cam = bpy.data.objects.new('Cam', cam_data)
sc.collection.objects.link(cam)
cam.location = Vector((0, 0, 0)) - CAM_FORWARD * 30
cam.rotation_euler = CAM_ROT
sc.camera = cam
sc.render.resolution_x = sc.render.resolution_y = SIZE
key = lib.area_light('key', (-3, -3, 4), (0, 0, 0), (1.5, 1.5), (1.0, 0.85, 0.66), 300)
key.rotation_euler = (-key.location).to_track_quat('-Z', 'Y').to_euler()

# Предмет «смотрит» на зрителя: лицевая сторона повёрнута к камере (как будто персонаж показывает его нам)
FACE = (-CAM_FORWARD).to_track_quat('Z', 'Y').to_euler()


def holder(name):
    e = lib.empty(name)
    e.rotation_euler = FACE
    return e


def newspaper():
    p = holder('newspaper')
    paper = mat('np_paper', hex_rgb('#efe6d2'), rough=0.9)
    ink = mat('np_ink', hex_rgb('#2a2230'))
    box('page', (0.36, 0.26, 0.012), (0, 0, 0), paper, p, bevel=0)
    text('mast', 'МЕДИАКИТ', 0.05, (0, 0.09, 0.008), ink, p, font=FONT_SIGN, rot=(0, 0, 0), extrude=0.001)
    for i in range(5):
        box('line', (0.14, 0.012, 0.004), (-0.08, 0.04 - i * 0.03, 0.008), ink, p, bevel=0)
    box('photo', (0.12, 0.1, 0.004), (0.09, -0.01, 0.008), mat('np_photo', hex_rgb('#5a7a9a')), p, bevel=0)


def phone():
    p = holder('phone')
    box('body', (0.09, 0.17, 0.014), (0, 0, 0), mat('ph_body', hex_rgb('#1f2230'), rough=0.3, metal=0.4), p, bevel=0.006)
    box('screen', (0.078, 0.15, 0.004), (0, 0, 0.008), mat('ph_screen', hex_rgb('#3de0e8'), emit=(0.3, 0.85, 1.0),
                                                            emit_strength=1.5), p, bevel=0)


def folder():
    p = holder('folder')
    manila = mat('folder', hex_rgb('#e3b25e'), rough=0.8)
    box('cover', (0.32, 0.24, 0.02), (0, 0, 0), manila, p, bevel=0.004)
    box('tab', (0.1, 0.03, 0.02), (-0.1, 0.13, 0), manila, p, bevel=0.004)
    box('label', (0.14, 0.04, 0.004), (0, 0.03, 0.012), mat('label', hex_rgb('#fffaf0')), p, bevel=0)
    text('label_t', 'РЕЗЮМЕ', 0.026, (0, 0.03, 0.016), mat('np_ink', hex_rgb('#2a2230')), p, font=FONT_SIGN, rot=(0, 0, 0),
         extrude=0.001)


def sneaker_item(color):
    """Кроссовок, стоящий вдоль оси X сетки: тот же вид для пола, полки и рук. Центр кадра — точка на полу под ним."""
    def build():
        models.sneaker(lib.empty('root'), color, (0, 0, 0))
    return build


ITEMS = {'newspaper': newspaper, 'phone': phone, 'folder': folder}
for i, c in enumerate(models.SECTION_COLORS):
    ITEMS[f'sneaker{i}'] = sneaker_item(c)
for name, build in ITEMS.items():
    for o in list(bpy.data.objects):
        if o.type in ('MESH', 'FONT', 'EMPTY') and o.name != 'Cam':
            bpy.data.objects.remove(o)
    build()
    tmp = os.path.join(TMP, f'{name}.png')
    lib.render_to(tmp, sc)
    lib.save_pixels(lib.load_pixels(tmp), os.path.join(OUT, f'held_{name}.webp'), quality=92)
    print('[items]', name)
