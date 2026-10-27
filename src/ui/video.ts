/**
 * Обычная ссылка на видео (VK Видео, Rutube, YouTube) → адрес для встраивания в iframe.
 * Если ссылка уже «встраиваемая» — возвращается как есть. Пустая/непонятная — null.
 */
export function videoEmbedUrl(url: string): string | null {
  const u = url.trim();
  if (!u) return null;
  let m: RegExpMatchArray | null;

  // YouTube
  if ((m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/)))
    return `https://www.youtube-nocookie.com/embed/${m[1]}`;

  // Rutube
  if (/rutube\.ru\/play\/embed\//.test(u)) return u;
  if ((m = u.match(/rutube\.ru\/video\/(?:private\/)?([\w]+)\/?(?:\?(?:.*&)?p=([\w-]+))?/)))
    // у приватного видео ключ доступа ?p=… нужен и в адресе для встраивания
    return `https://rutube.ru/play/embed/${m[1]}/${m[2] ? `?p=${m[2]}` : ''}`;

  // VK Видео: vk.com/video-123_456, vkvideo.ru/video-123_456, а также ?z=video-123_456
  if (/video_ext\.php/.test(u)) return u;
  if ((m = u.match(/video(-?\d+)_(\d+)/))) return `https://vk.com/video_ext.php?oid=${m[1]}&id=${m[2]}&hd=2`;

  return /^https?:\/\//.test(u) ? u : null;
}
