// Генератор пиксельных спрайтов: npm run sprites
// Рисует все спрайты кодом и сохраняет PNG в public/assets/sprites/.
// Размеры и раскладка берутся из src/assets/sprites.json (тот же файл читает игра).
//
// Чтобы генератор НЕ перезаписывал ваш собственный спрайт, впишите имя файла
// (например player.png) отдельной строкой в public/assets/sprites/custom-sprites.txt
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { P } from './lib/palette.mjs';
import { playerSheet } from './sprites/character.mjs';
import * as W from './sprites/world.mjs';
import * as V from './sprites/vhod.mjs';
import * as S from './sprites/sport.mjs';
import * as X from './sprites/social.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'src/assets/sprites.json'), 'utf8'));
const outDir = path.join(root, 'public/assets/sprites');
const keepFile = path.join(outDir, 'custom-sprites.txt');
const keep = new Set(
  fs.existsSync(keepFile)
    ? fs.readFileSync(keepFile, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'))
    : [],
);

const side = (key) => spec[key].wall;

const drawers = {
  floor_lobby: () => W.floorTile(P.white2, P.gray1, P.white),
  floor_vhod: () => W.floorTile(P.tile, P.tileDark, P.tileLight),
  floor_sport: () => W.floorParquet(),
  floor_edge_left: () => W.floorEdge('left'),
  floor_edge_right: () => W.floorEdge('right'),

  wall_lobby_left: () => W.wall('left', W.lobbyWall(P.gray1)),
  wall_lobby_right: () => W.wall('right', W.lobbyWall(P.white)),
  wall_vhod_left: () => W.wall('left', W.vhodWall(P.gray1)),
  wall_vhod_right: () => W.wall('right', W.vhodWall(P.white2)),
  wall_sport_left: () => W.wall('left', W.sportWall(P.gray1)),
  wall_sport_right: () => W.wall('right', W.sportWall(P.white)),

  door_vhod: () => W.doorVhod(side('door_vhod')),
  door_sport: () => W.doorSport(side('door_sport')),
  door_boarded: () => W.doorBoarded(side('door_boarded')),
  door_exit: () => W.doorExit(side('door_exit')),

  sign_vhod: () => W.signVhod(side('sign_vhod')),
  sign_sport: () => W.signSport(side('sign_sport')),
  plaque_next: () => W.plaqueNext(side('plaque_next')),
  sign_hello: () => W.signHello(side('sign_hello')),
  sign_exit: () => W.signExit(side('sign_exit')),

  door_free_boarded: W.doorFreeBoarded,

  plant: V.plant,
  server_rack: V.serverRack,
  desk_pc: V.deskPc,
  chair_office: V.chairOffice,
  chair_audience: V.chairAudience,
  spectators: V.spectators,
  stage: V.stage,
  coffee_table: V.coffeeTable,
  bar_table: V.barTable,
  cabinet: V.cabinet,
  item_newspaper: V.itemNewspaper,
  item_phone: V.itemPhone,
  item_folder: V.itemFolder,
  held_newspaper: V.heldNewspaper,
  held_phone: V.heldPhone,
  held_folder: V.heldFolder,
  stage_screen: () => V.stageScreen(side('stage_screen')),
  chart_growth: () => V.chartGrowth(side('chart_growth')),
  chart_line: () => V.chartLine(side('chart_line')),
  sticky_board: () => V.stickyBoard(side('sticky_board')),

  shelf_wall: () => S.shelfWall(side('shelf_wall')),
  sneaker_iso: S.sneakerIso,
  held_sneaker: S.heldSneaker,
  clothes_rack: S.clothesRack,
  cash_counter: S.cashCounter,
  fitting_room: S.fittingRoom,
  ball_basket: S.ballBasket,
  board_best: () => S.boardBest(side('board_best')),
  npc_customer: () => S.npcSheet('customer'),
  shopper1: () => S.npcSheet('shopper1'),
  shopper2: () => S.npcSheet('shopper2'),
  shopper3: () => S.npcSheet('shopper3'),
  icon_talk: S.iconTalk,
  arrow_down: S.arrowDown,

  shadow: W.shadow,
  marker: W.marker,
  dust: W.dust,
  sparkle: W.sparkle,
  player: () => playerSheet(spec.player),
};

let made = 0;
for (const [key, s] of Object.entries(spec)) {
  const draw = drawers[key];
  if (!draw) {
    console.warn(`⚠ Для «${key}» нет рисовальщика — пропускаю`);
    continue;
  }
  if (keep.has(s.file)) {
    console.log(`• ${s.file} — оставляю ваш файл (custom-sprites.txt)`);
    continue;
  }
  const c = draw();
  const expectW = s.columns ? s.width * s.columns : s.frames ? s.width * s.frames : s.width;
  const rows = s.columns && !s.anims ? Math.ceil(c.h / s.height) : 1;
  if (c.w !== expectW || (!s.anims && c.h !== s.height * rows)) {
    console.warn(`⚠ ${s.file}: размер ${c.w}×${c.h} не совпадает с sprites.json`);
  }
  c.save(path.join(outDir, s.file));
  made++;
}
console.log(`Готово: ${made} спрайтов в public/assets/sprites/`);

// Превью для соцсетей и иконки сайта — в корень public/
const SOCIAL = {
  'og-image.png': X.ogImage,
  'favicon-16.png': X.favicon16,
  'favicon-32.png': X.favicon32,
  'apple-touch-icon.png': X.appleTouch,
};
for (const [file, draw] of Object.entries(SOCIAL)) {
  if (keep.has(file)) {
    console.log(`• ${file} — оставляю ваш файл (custom-sprites.txt)`);
    continue;
  }
  draw().save(path.join(root, 'public', file));
}
console.log('Готово: превью для соцсетей и иконки в public/');
