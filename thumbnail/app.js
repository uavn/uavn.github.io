'use strict';

/*
 * Thumbnail — YouTube thumbnails made of layers: photos with film looks
 * (presets, adjustments, .cube LUTs), text on drawn backgrounds (brush, tape,
 * torn paper, film strip…), shapes, and a film finish on top (grain,
 * vignette, light leaks, dust). Everything lives in a 1280×720 design space
 * and is drawn at any scale, so the preview and the export match.
 */

const W = 1280;
const H = 720;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const uid = () => Math.random().toString(36).slice(2, 10);
const newSeed = () => (Math.random() * 2 ** 31) | 0;

function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex, a) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function canvasOf(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
}

function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    addRoundRect(ctx, x, y, w, h, r);
}

function addRoundRect(ctx, x, y, w, h, r) {
    const radius = clamp(r || 0, 0, Math.min(Math.abs(w), Math.abs(h)) / 2);

    if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, radius);
    } else {
        ctx.rect(x, y, w, h);
    }
}

/* ---------------------------------------------------------------- catalogue */

// System fonts (Helvetica, Futura) fall back to look-alikes with Cyrillic where they're missing.
const FONTS = [
    { id: 'helvetica', name: 'Helvetica Bold', family: 'Helvetica Neue', stack: '"Helvetica Neue", Helvetica, Arimo, Arial, sans-serif', weight: 700, load: 'Arimo' },
    { id: 'helveticareg', name: 'Helvetica', family: 'Helvetica Neue', stack: '"Helvetica Neue", Helvetica, Arimo, Arial, sans-serif', weight: 400, load: 'Arimo' },
    { id: 'futura', name: 'Futura Bold', family: 'Futura', stack: 'Futura, Jost, "Century Gothic", sans-serif', weight: 700, load: 'Jost' },
    { id: 'futuramed', name: 'Futura Medium', family: 'Futura', stack: 'Futura, Jost, "Century Gothic", sans-serif', weight: 500, load: 'Jost' },
    { id: 'unbounded', name: 'Unbounded', family: 'Unbounded', weight: 900 },
    { id: 'montserrat', name: 'Montserrat Black', family: 'Montserrat', weight: 900 },
    { id: 'rubik', name: 'Rubik Black', family: 'Rubik', weight: 900 },
    { id: 'inter', name: 'Inter Black', family: 'Inter', weight: 900 },
    { id: 'russo', name: 'Russo One', family: 'Russo One', weight: 400 },
    { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
    { id: 'dela', name: 'Dela Gothic', family: 'Dela Gothic One', weight: 400 },
    { id: 'rubikmono', name: 'Rubik Mono', family: 'Rubik Mono One', weight: 400 },
    { id: 'seymour', name: 'Seymour', family: 'Seymour One', weight: 400 },
    { id: 'train', name: 'Train One', family: 'Train One', weight: 400 },
    { id: 'playfair', name: 'Playfair Black', family: 'Playfair Display', weight: 900 },
    { id: 'yeseva', name: 'Yeseva', family: 'Yeseva One', weight: 400 },
    { id: 'kelly', name: 'Kelly Slab', family: 'Kelly Slab', weight: 400 },
    { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400 },
    { id: 'pacifico', name: 'Pacifico', family: 'Pacifico', weight: 400 },
    { id: 'caveat', name: 'Caveat', family: 'Caveat', weight: 700 },
    { id: 'marck', name: 'Marck Script', family: 'Marck Script', weight: 400 },
    { id: 'badscript', name: 'Bad Script', family: 'Bad Script', weight: 400 },
    { id: 'neucha', name: 'Neucha', family: 'Neucha', weight: 400 },
    { id: 'amatic', name: 'Amatic SC', family: 'Amatic SC', weight: 700 },
    { id: 'comfortaa', name: 'Comfortaa', family: 'Comfortaa', weight: 700 },
    { id: 'mono', name: 'JetBrains Mono', family: 'JetBrains Mono', weight: 800 },
    { id: 'ptmono', name: 'PT Mono', family: 'PT Mono', weight: 400 },
    { id: 'pixel', name: 'Pixel', family: 'Press Start 2P', weight: 400 }
];
const FONT_BY_ID = Object.fromEntries(FONTS.map(f => [f.id, f]));

const SWATCHES = ['#f5a500', '#ffffff', '#111111', '#f4efe6', '#ffd400', '#ff7a00', '#ff3b30', '#ff4fa3', '#8b5cf6', '#2f7bff', '#00c2d1', '#39ff88', '#f2a03d'];

const TEXT_BGS = [
    ['none', 'None'], ['box', 'Box'], ['pill', 'Pill'], ['brush', 'Brush'], ['marker', 'Marker'],
    ['tape', 'Tape'], ['paper', 'Torn paper'], ['sticker', 'Sticker'], ['brutal', 'Hard shadow'],
    ['label', 'Label tape'], ['film', 'Film strip'], ['stamp', 'Stamp'], ['bubble', 'Speech bubble'], ['burst', 'Burst'],
    ['gradient', 'Gradient'], ['outline', 'Outline']
];
// Colours that suit a background style, applied when you pick it.
const BG_COLOURS = {
    brush: { bgColor: '#f5a500', color: '#111111' },
    marker: { bgColor: '#f5a500', color: '#111111' },
    tape: { bgColor: '#eadcae', color: '#2a2622' },
    paper: { bgColor: '#f4efe6', color: '#111111' },
    label: { bgColor: '#151515', color: '#ffffff' },
    film: { bgColor: '#141110', color: '#f2a03d' },
    stamp: { bgColor: '#e8473a', color: '#e8473a' },
    bubble: { bgColor: '#ffffff', bgColor2: '#111111', color: '#111111' },
    burst: { bgColor: '#f5a500', bgColor2: '#111111', color: '#111111' }
};
const TWO_COLOUR_BGS = ['gradient', 'brutal', 'bubble', 'burst'];

// Emoji and icons in themed groups for the picker.
const EMOJI = [
    { t: 'Photo & film', k: 'фото плівка кіно', i: ['📷', '📸', '🎞️', '📽️', '🎬', '🎥', '📼', '📹', '🔍', '🧪', '🌡️', '⏱️', '⏳', '💡', '🔦', '🖼️'] },
    { t: 'Reactions', k: 'реакції емоції', i: ['🔥', '✨', '⭐', '🌟', '💥', '⚡', '💯', '🆕', '🆓', '🔴', '❗', '❓', '⚠️', '✅', '❌', '🚫', '😱', '🤯', '😍', '🥲', '😂', '🤔', '😎', '🙃', '😴', '🤩', '😳', '🥶', '🥵', '🤫', '🫠', '🤡', '💀', '🙈'] },
    { t: 'Hands & hearts', k: 'руки серця', i: ['👉', '👈', '👇', '👆', '👀', '🙌', '👍', '👎', '🤞', '✌️', '👏', '🫶', '💪', '🤝', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔'] },
    { t: 'Cats', k: 'коти кіт', i: ['🐈', '🐈‍⬛', '🐱', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🐾', '🧶', '🐟', '🥛', '📦'] },
    { t: 'Moto & auto', k: 'мото авто машина дорога', i: ['🏍️', '🛵', '🚗', '🚙', '🏎️', '🚐', '🛻', '🚚', '🚕', '🚌', '🚓', '🚑', '🚲', '🛞', '⛽', '🔋', '🛣️', '🚦', '🚧', '🅿️', '🔧', '🔩', '🪛', '🪖', '🏁', '💨'] },
    { t: 'Travel', k: 'подорож мандри', i: ['✈️', '🛫', '🛬', '🚆', '🚂', '🚇', '⛴️', '🚢', '⛵', '🗺️', '📍', '🧭', '🧳', '🎒', '🛂', '🎫', '🏕️', '⛺', '🏔️', '⛰️', '🌋', '🏖️', '🏝️', '🌅', '🌄', '🌇', '🌃', '🏙️', '🌉', '🗽', '🗼', '🏰', '⛪', '🏠', '🌍', '🌎', '🌏'] },
    { t: 'Groceries & food', k: 'продукти їжа покупки', i: ['🛒', '🛍️', '🧺', '🧾', '🥖', '🥐', '🧀', '🥚', '🥛', '🧈', '🍎', '🍌', '🍋', '🍅', '🥑', '🥕', '🥦', '🧅', '🧄', '🥔', '🍗', '🥩', '🐟', '🍝', '🍕', '🍔', '🌭', '🍜', '🍣', '☕', '🍷', '🍺', '🧃', '🍫', '🍪', '🎂'] },
    { t: 'Money', k: 'гроші фінанси', i: ['💰', '💵', '💶', '💷', '💸', '💳', '🪙', '🏦', '📈', '📉', '🤑', '💎', '🏷️', '🧮', '💹', '🧾'] },
    { t: 'Nature & weather', k: 'природа погода', i: ['🌊', '🌲', '🌳', '🌸', '🌻', '🍂', '❄️', '☀️', '🌙', '🌈', '☁️', '🌧️', '⛈️', '🐕', '🐦', '🦆', '🦋'] },
    { t: 'Fun & stuff', k: 'розваги', i: ['🎁', '🎉', '🎈', '🎧', '🎵', '🎸', '🕹️', '🏆', '🥇', '🎯', '🧩', '📚', '✏️', '📌', '🗓️', '⌛'] }
];
// Words to find each emoji by, in English and Ukrainian.
const EMOJI_WORDS = new Map([
    ['📷', 'camera photo фото камера фотоапарат'],
    ['📸', 'camera flash photo фото камера спалах'],
    ['🎞️', 'film strip плівка кадри'],
    ['📽️', 'projector film кіно проектор'],
    ['🎬', 'clapper movie кіно фільм хлопавка'],
    ['🎥', 'movie camera video відео кіно'],
    ['📼', 'vhs tape касета відео'],
    ['📹', 'video camera відеокамера'],
    ['🔍', 'search zoom magnifier лупа пошук'],
    ['🧪', 'test tube chemistry хімія пробірка'],
    ['🌡️', 'thermometer temperature градусник температура'],
    ['⏱️', 'stopwatch timer секундомір таймер'],
    ['⏳', 'hourglass time пісочний годинник час'],
    ['💡', 'idea light bulb ідея лампочка'],
    ['🔦', 'flashlight ліхтарик'],
    ['🖼️', 'picture frame картина рамка'],
    ['🔥', 'fire hot вогонь вогник гаряче'],
    ['✨', 'sparkles magic блиск іскри магія'],
    ['⭐', 'star зірка'],
    ['🌟', 'glowing star зірка сяйво'],
    ['💥', 'boom explosion вибух бум'],
    ['⚡', 'lightning zap блискавка'],
    ['💯', 'hundred perfect сто'],
    ['🆕', 'new новий'],
    ['🆓', 'free безкоштовно'],
    ['🔴', 'red dot record запис червоний'],
    ['❗', 'exclamation important оклик увага'],
    ['❓', 'question питання'],
    ['⚠️', 'warning увага попередження'],
    ['✅', 'check done yes галочка так готово'],
    ['❌', 'cross no ні хрестик'],
    ['🚫', 'forbidden no заборона'],
    ['😱', 'scream shock шок крик жах'],
    ['🤯', 'mind blown вибух мозку шок'],
    ['😍', 'love heart eyes закоханий'],
    ['🥲', 'smile tear сльоза усмішка'],
    ['😂', 'laugh lol сміх ржака'],
    ['🤔', 'thinking думаю хм'],
    ['😎', 'cool sunglasses круто окуляри'],
    ['🙃', 'upside down перевернутий'],
    ['😴', 'sleep сон спати'],
    ['🤩', 'star struck wow вау захват'],
    ['😳', 'flushed embarrassed збентеження'],
    ['🥶', 'cold frozen холод мороз'],
    ['🥵', 'hot жара спека'],
    ['🤫', 'shh secret тихо секрет'],
    ['🫠', 'melting тану'],
    ['🤡', 'clown клоун'],
    ['💀', 'skull dead череп смерть'],
    ['🙈', 'see no evil monkey мавпа соромно'],
    ['👉', 'point right вказівник вправо'],
    ['👈', 'point left вліво'],
    ['👇', 'point down вниз'],
    ['👆', 'point up вгору'],
    ['👀', 'eyes look очі дивись'],
    ['🙌', 'hooray hands ура'],
    ['👍', 'thumbs up like лайк клас'],
    ['👎', 'thumbs down dislike дизлайк'],
    ['🤞', 'fingers crossed удачі'],
    ['✌️', 'peace victory мир'],
    ['👏', 'clap оплески'],
    ['🫶', 'heart hands серце руки'],
    ['💪', 'strong muscle сила м\'язи'],
    ['🤝', 'handshake deal рукостискання'],
    ['❤️', 'red heart love серце любов'],
    ['🧡', 'orange heart серце'],
    ['💛', 'yellow heart серце'],
    ['💚', 'green heart серце'],
    ['💙', 'blue heart серце'],
    ['💜', 'purple heart серце'],
    ['🖤', 'black heart серце'],
    ['🤍', 'white heart серце'],
    ['💔', 'broken heart розбите серце'],
    ['🐈', 'cat кіт котик'],
    ['🐈‍⬛', 'black cat чорний кіт'],
    ['🐱', 'cat face кіт котик'],
    ['😺', 'cat smile кіт'],
    ['😸', 'cat grin кіт'],
    ['😹', 'cat laugh tears кіт сміх'],
    ['😻', 'cat love кіт любов'],
    ['😼', 'cat smirk кіт'],
    ['😽', 'cat kiss кіт поцілунок'],
    ['🙀', 'cat scream shock кіт шок'],
    ['😿', 'cat cry кіт плаче'],
    ['😾', 'cat angry кіт злий'],
    ['🐾', 'paws лапки сліди'],
    ['🧶', 'yarn клубок'],
    ['🐟', 'fish риба'],
    ['🥛', 'milk молоко'],
    ['📦', 'box коробка посилка'],
    ['🏍️', 'motorcycle moto bike мотоцикл мото'],
    ['🛵', 'scooter моторолер скутер'],
    ['🚗', 'car auto машина авто'],
    ['🚙', 'suv car позашляховик авто'],
    ['🏎️', 'race car гонка болід'],
    ['🚐', 'van camper бус кемпер'],
    ['🛻', 'pickup truck пікап'],
    ['🚚', 'truck вантажівка'],
    ['🚕', 'taxi таксі'],
    ['🚌', 'bus автобус'],
    ['🚓', 'police поліція'],
    ['🚑', 'ambulance швидка'],
    ['🚲', 'bicycle bike велосипед ровер'],
    ['🛞', 'wheel tire колесо шина'],
    ['⛽', 'fuel gas petrol бензин заправка пальне'],
    ['🔋', 'battery батарея'],
    ['🛣️', 'road highway дорога траса'],
    ['🚦', 'traffic light світлофор'],
    ['🚧', 'construction ремонт'],
    ['🅿️', 'parking паркінг'],
    ['🔧', 'wrench tool ключ ремонт'],
    ['🔩', 'bolt болт'],
    ['🪛', 'screwdriver викрутка'],
    ['🪖', 'helmet шолом каска'],
    ['🏁', 'finish flag фініш прапор'],
    ['💨', 'dash fast швидко пил'],
    ['✈️', 'airplane plane flight літак переліт'],
    ['🛫', 'departure виліт'],
    ['🛬', 'arrival приліт'],
    ['🚆', 'train поїзд потяг'],
    ['🚂', 'locomotive паротяг'],
    ['🚇', 'metro метро'],
    ['⛴️', 'ferry пором'],
    ['🚢', 'ship корабель'],
    ['⛵', 'sailboat вітрило яхта'],
    ['🗺️', 'map мапа карта'],
    ['📍', 'pin location місце мітка'],
    ['🧭', 'compass компас'],
    ['🧳', 'luggage suitcase валіза багаж'],
    ['🎒', 'backpack рюкзак'],
    ['🛂', 'passport паспорт кордон'],
    ['🎫', 'ticket квиток'],
    ['🏕️', 'camping кемпінг табір'],
    ['⛺', 'tent намет'],
    ['🏔️', 'snowy mountain гори'],
    ['⛰️', 'mountain гора'],
    ['🌋', 'volcano вулкан'],
    ['🏖️', 'beach пляж'],
    ['🏝️', 'island острів'],
    ['🌅', 'sunrise схід сонця'],
    ['🌄', 'sunrise mountains світанок гори'],
    ['🌇', 'sunset city захід місто'],
    ['🌃', 'night city нічне місто'],
    ['🏙️', 'city місто'],
    ['🌉', 'bridge міст'],
    ['🗽', 'statue liberty new york нью-йорк'],
    ['🗼', 'tower вежа'],
    ['🏰', 'castle замок'],
    ['⛪', 'church церква'],
    ['🏠', 'home house дім хата'],
    ['🌍', 'earth world europe світ земля'],
    ['🌎', 'earth world america світ'],
    ['🌏', 'earth world asia світ'],
    ['🛒', 'cart shopping візок покупки'],
    ['🛍️', 'shopping bags покупки пакети'],
    ['🧺', 'basket кошик'],
    ['🧾', 'receipt чек'],
    ['🥖', 'bread baguette хліб багет'],
    ['🥐', 'croissant круасан'],
    ['🧀', 'cheese сир'],
    ['🥚', 'egg яйце'],
    ['🧈', 'butter масло'],
    ['🍎', 'apple яблуко'],
    ['🍌', 'banana банан'],
    ['🍋', 'lemon лимон'],
    ['🍅', 'tomato помідор'],
    ['🥑', 'avocado авокадо'],
    ['🥕', 'carrot морква'],
    ['🥦', 'broccoli броколі'],
    ['🧅', 'onion цибуля'],
    ['🧄', 'garlic часник'],
    ['🥔', 'potato картопля'],
    ['🍗', 'chicken курка'],
    ['🥩', 'meat steak мʼясо стейк'],
    ['🍝', 'pasta паста'],
    ['🍕', 'pizza піца'],
    ['🍔', 'burger бургер'],
    ['🌭', 'hot dog хот-дог'],
    ['🍜', 'noodles ramen локшина'],
    ['🍣', 'sushi суші'],
    ['☕', 'coffee кава'],
    ['🍷', 'wine вино'],
    ['🍺', 'beer пиво'],
    ['🧃', 'juice сік'],
    ['🍫', 'chocolate шоколад'],
    ['🍪', 'cookie печиво'],
    ['🎂', 'cake birthday торт день народження'],
    ['💰', 'money bag гроші мішок'],
    ['💵', 'dollar cash гроші долар'],
    ['💶', 'euro гроші євро'],
    ['💷', 'pound гроші фунт'],
    ['💸', 'money flying витрати гроші летять'],
    ['💳', 'card credit картка'],
    ['🪙', 'coin монета'],
    ['🏦', 'bank банк'],
    ['📈', 'chart up ріст графік'],
    ['📉', 'chart down падіння графік'],
    ['🤑', 'money face гроші'],
    ['💎', 'diamond gem діамант'],
    ['🏷️', 'tag price ціна ціник'],
    ['🧮', 'abacus рахувати рахівниця'],
    ['💹', 'chart market ринок'],
    ['🌊', 'wave sea хвиля море'],
    ['🌲', 'pine tree сосна ялина'],
    ['🌳', 'tree дерево'],
    ['🌸', 'flower blossom квітка'],
    ['🌻', 'sunflower соняшник'],
    ['🍂', 'autumn leaves осінь листя'],
    ['❄️', 'snow winter сніг зима'],
    ['☀️', 'sun сонце'],
    ['🌙', 'moon night місяць ніч'],
    ['🌈', 'rainbow веселка'],
    ['☁️', 'cloud хмара'],
    ['🌧️', 'rain дощ'],
    ['⛈️', 'storm гроза'],
    ['🐕', 'dog собака пес'],
    ['🐦', 'bird птах'],
    ['🦆', 'duck качка'],
    ['🦋', 'butterfly метелик'],
    ['🎁', 'gift present подарунок'],
    ['🎉', 'party celebration свято вечірка'],
    ['🎈', 'balloon кулька'],
    ['🎧', 'headphones навушники музика'],
    ['🎵', 'music note музика нота'],
    ['🎸', 'guitar гітара'],
    ['🕹️', 'joystick game гра джойстик'],
    ['🏆', 'trophy win кубок перемога'],
    ['🥇', 'gold medal first медаль перше'],
    ['🎯', 'target ціль'],
    ['🧩', 'puzzle пазл'],
    ['📚', 'books книги'],
    ['✏️', 'pencil олівець'],
    ['📌', 'pin кнопка'],
    ['🗓️', 'calendar календар'],
    ['⌛', 'hourglass пісочний годинник']
]);
const ICONS = [
    { t: 'Photo & video', k: 'фото відео камера плівка музика', i: ['camera', 'camera-fill', 'camera2', 'camera-reels-fill', 'film', 'image', 'images', 'aspect-ratio', 'crop', 'sliders', 'palette-fill', 'brush-fill', 'magic', 'play-fill', 'play-circle-fill', 'pause-fill', 'stop-fill', 'record-circle', 'record-fill', 'skip-forward-fill', 'mic-fill', 'music-note-beamed', 'headphones', 'volume-up-fill', 'vinyl-fill', 'cassette-fill', 'badge-4k-fill', 'badge-hd-fill', 'tv-fill', 'phone-fill'] },
    { t: 'Arrows & marks', k: 'стрілки знаки галочка хрестик цифри', i: ['arrow-right', 'arrow-left', 'arrow-up', 'arrow-down', 'arrow-up-right', 'arrow-down-right', 'arrow-right-circle-fill', 'arrow-repeat', 'chevron-double-right', 'check-circle-fill', 'x-circle-fill', 'exclamation-triangle-fill', 'exclamation-circle-fill', 'question-circle-fill', 'info-circle-fill', 'plus-circle-fill', 'dash-circle-fill', '1-circle-fill', '2-circle-fill', '3-circle-fill', '4-circle-fill', '5-circle-fill'] },
    { t: 'Moto & auto', k: 'мото авто машина дорога бензин знак', i: ['car-front-fill', 'car-front', 'truck', 'truck-front-fill', 'bus-front-fill', 'scooter', 'bicycle', 'fuel-pump-fill', 'fuel-pump-diesel-fill', 'ev-station-fill', 'speedometer2', 'speedometer', 'signpost-2-fill', 'signpost-split-fill', 'sign-turn-right-fill', 'sign-stop-fill', 'sign-railroad-fill', 'stoplights-fill', 'cone-striped', 'p-circle-fill', 'tools', 'wrench-adjustable', 'gear-fill', 'shield-fill-check'] },
    { t: 'Travel', k: 'подорож літак мапа карта валіза', i: ['airplane-fill', 'airplane-engines-fill', 'train-front-fill', 'globe-europe-africa', 'globe-americas', 'map-fill', 'geo-alt-fill', 'pin-map-fill', 'compass-fill', 'luggage-fill', 'suitcase-lg-fill', 'backpack-fill', 'passport-fill', 'ticket-perforated-fill', 'building-fill', 'house-fill', 'tree-fill', 'sunrise-fill', 'umbrella-fill', 'cloud-sun-fill', 'snow', 'binoculars-fill', 'flag-fill'] },
    { t: 'Shopping & money', k: 'покупки гроші магазин кошик чек картка', i: ['cart-fill', 'cart4', 'basket2-fill', 'basket-fill', 'bag-fill', 'bag-check-fill', 'shop', 'receipt', 'receipt-cutoff', 'wallet-fill', 'wallet2', 'credit-card-fill', 'cash-stack', 'cash-coin', 'coin', 'piggy-bank-fill', 'bank2', 'currency-dollar', 'currency-euro', 'currency-exchange', 'percent', 'tag-fill', 'tags-fill', 'graph-up-arrow', 'graph-down-arrow', 'calculator-fill', 'gift-fill', 'cup-hot-fill', 'egg-fried'] },
    { t: 'Everything else', k: 'інше серце зірка вогонь', i: ['stopwatch-fill', 'hourglass-split', 'thermometer-half', 'droplet-fill', 'sun-fill', 'moon-fill', 'lightning-charge-fill', 'star-fill', 'stars', 'heart-fill', 'fire', 'gem', 'award-fill', 'trophy-fill', 'patch-check-fill', 'bookmark-fill', 'bell-fill', 'lightbulb-fill', 'eye-fill', 'search', 'clock-fill', 'calendar-event-fill', 'scissors', 'box-seam-fill', 'emoji-smile-fill', 'emoji-heart-eyes-fill', 'emoji-dizzy-fill', 'emoji-surprise-fill', 'hand-thumbs-up-fill', 'hand-thumbs-down-fill', 'hand-index-thumb-fill', 'chat-fill', 'chat-quote-fill', 'chat-heart-fill', 'person-fill', 'people-fill', 'youtube', 'instagram', 'telegram', 'tiktok'] }
];
// Graphics: drawn shapes, plus the film illustrations from Film Dev.
const GRAPHIC_SHAPES = [
    ['scribble', 'Drawn circle'], ['scribblebox', 'Drawn box'], ['arrowline', 'Arrow'], ['curved', 'Curved arrow'], ['underline', 'Underline'], ['cross', 'Cross'], ['check', 'Tick'], ['tick', 'Tick (simple)'],
    ['sparkle', 'Sparkle'], ['burst', 'Burst'], ['arrow', 'Block arrow'], ['ellipse', 'Ellipse'], ['rect', 'Rectangle']
];
const STROKE_SHAPES = ['scribble', 'scribblebox', 'arrowline', 'curved', 'underline', 'cross', 'check', 'tick'];
// Pictures: the Film Dev illustrations plus sticker sets drawn for this app.
const PICTURES = [
    { t: 'Family', k: 'сімʼя софійка дитина кіт', dir: './stickers', i: ['sofia-photographer', 'sofia-serious', 'cat-sunbathing'] },
    { t: 'Cats', k: 'коти кіт котик мем', dir: './stickers', i: ['cat-sunbathing', 'cat-shocked', 'cat-crying-thumbs-up', 'cat-sunglasses', 'cat-side-eye', 'cat-screaming', 'cat-loaf', 'cat-rich', 'cat-groceries', 'cat-biker', 'cat-photographer', 'cat-in-cart', 'cat-driver'] },
    { t: 'Moto & travel', k: 'мото мотоцикл подорож шолом валіза карта намет', dir: './stickers', i: ['moto-adventure-bike', 'moto-helmet', 'travel-suitcase', 'travel-map', 'travel-campfire', 'travel-thermos', 'travel-mountains-badge', 'travel-compass'] },
    { t: 'Auto & road', k: 'авто машина дорога бензин кемпер', dir: './stickers', i: ['auto-retro-car', 'auto-camper-van', 'auto-fuel-pump', 'auto-winding-road'] },
    { t: 'Groceries & money', k: 'продукти покупки гроші гаманець чек візок', dir: './stickers', i: ['shop-cart', 'shop-receipt', 'shop-veggie-bag', 'shop-price-tag', 'money-piggy-bank', 'money-wallet', 'money-flying-away', 'money-empty-wallet'] },
    { t: 'Film', k: 'плівка проявка бачок хімія', dir: '../film-dev/art', i: ['tank', 'canister', 'stopwatch', 'thermometer', 'developer', 'bleach', 'fixer', 'stabilizer', 'pour', 'drain', 'wash', 'drying', 'loading'] }
];
const ROUGH_BGS = ['brush', 'marker', 'tape', 'paper', 'stamp'];
const RADIUS_BGS = ['box', 'gradient', 'outline', 'brutal', 'sticker', 'stamp'];

const TEXT_PRESETS = [
    { name: 'Bold outline', p: { font: 'montserrat', color: '#ffffff', fill: 'solid', stroke: 0.09, strokeColor: '#000000', bg: 'none', shadow: 0.15, shadowOffset: 0.05, shadowColor: '#000000', shadowAlpha: 0.7, distress: 0 } },
    { name: 'School bus brush', p: { font: 'helvetica', color: '#111111', fill: 'solid', stroke: 0, bg: 'brush', bgColor: '#f5a500', shadow: 0, distress: 0 } },
    { name: 'Torn paper', p: { font: 'caveat', color: '#111111', fill: 'solid', stroke: 0, bg: 'paper', bgColor: '#f4efe6', shadow: 0, distress: 0 } },
    { name: 'Masking tape', p: { font: 'marck', color: '#2a2622', fill: 'solid', stroke: 0, bg: 'tape', bgColor: '#eadcae', shadow: 0, distress: 0 } },
    { name: 'Film strip', p: { font: 'mono', color: '#f2a03d', fill: 'solid', stroke: 0, bg: 'film', bgColor: '#141110', shadow: 0, spacing: 0.08, distress: 0 } },
    { name: 'Label maker', p: { font: 'ptmono', color: '#ffffff', fill: 'solid', stroke: 0, bg: 'label', bgColor: '#c8102e', shadow: 0, spacing: 0.1, distress: 0 } },
    { name: 'Neon', p: { font: 'unbounded', color: '#ffffff', fill: 'solid', stroke: 0, bg: 'none', shadow: 0.4, shadowOffset: 0, shadowColor: '#ff2bd6', shadowAlpha: 1, distress: 0 } },
    { name: 'Sticker', p: { font: 'dela', color: '#111111', fill: 'solid', stroke: 0, bg: 'sticker', bgColor: '#f5a500', shadow: 0, distress: 0 } },
    { name: 'Hard shadow', p: { font: 'unbounded', color: '#000000', fill: 'solid', stroke: 0, bg: 'brutal', bgColor: '#f5a500', bgColor2: '#000000', shadow: 0, distress: 0 } },
    { name: 'Stamp', p: { font: 'russo', color: '#e8473a', fill: 'solid', stroke: 0, bg: 'stamp', bgColor: '#e8473a', shadow: 0, distress: 0.35, spacing: 0.06 } },
    { name: 'Marker', p: { font: 'caveat', color: '#111111', fill: 'solid', stroke: 0, bg: 'marker', bgColor: '#f5a500', shadow: 0, distress: 0 } },
    { name: 'Sunset fill', p: { font: 'unbounded', color: '#f5a500', color2: '#ff3b30', fill: 'gradient', stroke: 0.06, strokeColor: '#111111', bg: 'none', shadow: 0.2, shadowOffset: 0.06, shadowColor: '#000000', shadowAlpha: 0.6, distress: 0 } },
    { name: 'Serif', p: { font: 'playfair', color: '#ffffff', fill: 'solid', stroke: 0, bg: 'none', shadow: 0.3, shadowOffset: 0.02, shadowColor: '#000000', shadowAlpha: 0.7, distress: 0 } },
    { name: 'Worn print', p: { font: 'oswald', color: '#f4efe6', fill: 'solid', stroke: 0, bg: 'none', shadow: 0, spacing: 0.04, distress: 0.45 } },
    { name: 'Comic bubble', p: { font: 'neucha', color: '#111111', fill: 'solid', stroke: 0, bg: 'bubble', bgColor: '#ffffff', bgColor2: '#111111', shadow: 0, distress: 0 } },
    { name: 'Burst badge', p: { font: 'dela', color: '#111111', fill: 'solid', stroke: 0, bg: 'burst', bgColor: '#f5a500', bgColor2: '#111111', shadow: 0, distress: 0 } },
    { name: 'Pixel', p: { font: 'pixel', color: '#39ff88', fill: 'solid', stroke: 0, bg: 'box', bgColor: '#000000', radius: 0, shadow: 0, distress: 0 } }
];

// Film looks: parameters for the colour pipeline in grade().
const NEUTRAL = {
    exposure: 0, contrast: 0, saturation: 1, temp: 0, tint: 0, fade: 0, bw: 0, halation: 0,
    gamma: [1, 1, 1], shadows: [0, 0, 0], highlights: [0, 0, 0]
};
const LOOKS = [
    { id: 'none', name: 'Original', p: {} },
    { id: 'portrait400', name: 'Portrait 400', p: { exposure: 0.05, contrast: -0.12, saturation: 0.88, temp: 0.18, tint: 0.03, fade: 0.04, gamma: [1.02, 1, 0.97], shadows: [0, 0.01, 0.025], highlights: [0.03, 0.015, -0.01] } },
    { id: 'gold200', name: 'Gold 200', p: { exposure: 0.03, contrast: 0.05, saturation: 1.08, temp: 0.3, fade: 0.03, shadows: [0.02, 0.01, -0.01], highlights: [0.04, 0.025, -0.03] } },
    { id: 'everyday400', name: 'Everyday 400', p: { contrast: 0.1, saturation: 1.1, tint: -0.1, fade: 0.02, shadows: [-0.015, 0.02, 0.01], highlights: [0.01, 0.01, -0.01] } },
    { id: 'pastel400', name: 'Pastel 400', p: { exposure: 0.12, contrast: -0.2, saturation: 0.8, temp: -0.05, tint: -0.08, fade: 0.07, shadows: [-0.01, 0.025, 0.03], highlights: [0, 0.01, 0.01] } },
    { id: 'vivid100', name: 'Vivid 100', p: { contrast: 0.25, saturation: 1.3, temp: 0.05, shadows: [-0.01, 0, 0.03], highlights: [0.02, 0.01, -0.02] } },
    { id: 'tungsten800', name: 'Tungsten 800', p: { contrast: 0.1, saturation: 0.95, temp: -0.35, tint: 0.05, fade: 0.03, halation: 0.55, shadows: [-0.02, 0.01, 0.04], highlights: [0.03, 0, -0.02] } },
    { id: 'slide64', name: 'Slide 64', p: { contrast: 0.35, saturation: 1.2, temp: 0.1, gamma: [0.97, 1, 1.05], highlights: [0.03, 0.01, -0.02] } },
    { id: 'slide100', name: 'Slide 100', p: { contrast: 0.25, saturation: 1.15, temp: -0.08, shadows: [-0.01, 0, 0.02] } },
    { id: 'velvet50', name: 'Velvet 50', p: { contrast: 0.35, saturation: 1.45, tint: 0.05, shadows: [-0.01, -0.01, 0.03] } },
    { id: 'expired', name: 'Expired', p: { exposure: 0.08, contrast: -0.15, saturation: 0.75, temp: 0.2, tint: 0.25, fade: 0.1, shadows: [0.04, -0.01, 0.03], highlights: [0.04, 0.02, -0.03] } },
    { id: 'cross', name: 'Cross process', p: { contrast: 0.3, saturation: 1.2, tint: -0.15, gamma: [1.05, 0.97, 1.15], shadows: [-0.02, 0, 0.08], highlights: [0.03, 0.06, -0.1] } },
    { id: 'lomo', name: 'Lomo', p: { contrast: 0.45, saturation: 1.25, gamma: [0.95, 1, 1.15], shadows: [-0.03, 0, 0.06], highlights: [0.04, 0.05, -0.06] } },
    { id: 'tealorange', name: 'Teal & orange', p: { contrast: 0.2, saturation: 1.15, shadows: [-0.04, 0.01, 0.05], highlights: [0.06, 0.02, -0.05] } },
    { id: 'punchy', name: 'Punchy', p: { exposure: 0.05, contrast: 0.3, saturation: 1.35 } },
    { id: 'bw400', name: 'B&W 400', p: { bw: 1, contrast: 0.3, exposure: 0.02 } },
    { id: 'bwsoft', name: 'B&W soft', p: { bw: 1, contrast: 0.05, fade: 0.05 } },
    { id: 'bwpush', name: 'B&W pushed', p: { bw: 1, contrast: 0.6, exposure: 0.1 } },
    { id: 'sepia', name: 'Sepia', p: { bw: 1, contrast: 0.1, fade: 0.03, shadows: [0.04, 0.01, -0.03], highlights: [0.06, 0.03, -0.04] } }
];
const LOOK_BY_ID = Object.fromEntries(LOOKS.map(l => [l.id, l]));

const BG_PRESETS = [
    ['#0f2027', '#2c5364'], ['#141e30', '#243b55'], ['#232526', '#414345'], ['#000000', '#434343'],
    ['#200122', '#6f0000'], ['#1d4350', '#a43931'], ['#ff512f', '#dd2476'], ['#0b5d2c', '#39ff88'],
    ['#ff9a9e', '#fad0c4'], ['#ffecd2', '#fcb69f'], ['#a1c4fd', '#c2e9fb'], ['#d4fc79', '#96e6a1'],
    ['#fbc2eb', '#a6c1ee'], ['#f6d365', '#fda085'], ['#f4efe6', '#e2d6c3'], ['#141110', '#3a2a1c']
];

/* -------------------------------------------------------------------- model */

const LOOK_DEFAULT = { preset: 'none', strength: 1, exposure: 0, contrast: 0, saturation: 0, temp: 0, tint: 0, fade: 0, halation: 0, lut: '', lutAmount: 1 };

function makeText(over = {}) {
    return {
        id: uid(), type: 'text', name: '', x: W / 2, y: H / 2, rot: 0, opacity: 1, hidden: false, locked: false,
        text: 'Your title', font: 'unbounded', size: 92, upper: false, align: 'center', spacing: 0, lineHeight: 1.05,
        fill: 'solid', color: '#ffffff', color2: '#f5a500',
        stroke: 0, strokeColor: '#000000',
        shadow: 0, shadowOffset: 0.04, shadowColor: '#000000', shadowAlpha: 0.6,
        bg: 'none', bgColor: '#f5a500', bgColor2: '#000000', padX: 0.4, padY: 0.2, radius: 0.12, seed: newSeed(),
        distress: 0,
        ...over
    };
}

function makeShape(over = {}) {
    return {
        id: uid(), type: 'shape', name: 'Shape', x: W / 2, y: H / 2, rot: 0, opacity: 1, hidden: false, locked: false,
        shape: 'scribble', w: 360, h: 220, bend: 0.3, head: 'open', fillOn: false, fill: '#f5a500', strokeW: 12, stroke: '#f5a500', radius: 18, shadow: 0, seed: newSeed(),
        ...over
    };
}

function makeSticker(over = {}) {
    return {
        id: uid(), type: 'sticker', name: '', x: W / 2, y: H / 2, rot: 0, opacity: 1, hidden: false, locked: false,
        kind: 'emoji', glyph: '📷', icon: '', size: 150, color: '#f5a500',
        outline: 0, outlineColor: '#ffffff', shadow: 0.12, badge: 'none', badgeColor: '#f5a500', badgePad: 0.22,
        ...over
    };
}

function makeImage(over = {}) {
    return {
        id: uid(), type: 'image', name: 'Photo', x: W / 2, y: H / 2, rot: 0, opacity: 1, hidden: false, locked: false,
        imageId: '', w: W, h: H, flip: false, border: 0, borderColor: '#ffffff', radius: 0, shadow: 0,
        look: { ...LOOK_DEFAULT },
        ...over
    };
}

function newDoc() {
    return {
        version: 1,
        bg: { type: 'gradient', color: '#0f2027', color2: '#2c5364', angle: 135 },
        finish: { grain: 0.22, grainSize: 1.2, grainColor: false, vignette: 0.25, leak: 0, leakSeed: newSeed(), dust: 0, dustSeed: newSeed(), overText: false },
        luts: [],
        layers: [makeText({ text: 'Your title', bg: 'box', bgColor: '#f5a500', color: '#111111', font: 'helvetica', radius: 0.06, y: 560 })]
    };
}

let doc = newDoc();
let selectedId = null;
let hoverId = null;
const images = new Map(); // imageId → { bitmap, w, h, name, thumb }
const luts = new Map(); // lutId → { size, data }

function selected() {
    return doc.layers.find(l => l.id === selectedId) || null;
}

function layerName(l) {
    if (l.type === 'text') {
        return (l.text || 'Text').split('\n')[0].slice(0, 28) || 'Text';
    }

    if (l.type === 'shape') {
        return (GRAPHIC_SHAPES.find(([k]) => k === l.shape) || [0, 'Shape'])[1];
    }

    if (l.type === 'sticker') {
        return l.kind === 'icon' ? l.icon : `Emoji ${l.glyph}`;
    }

    return l.name || 'Photo';
}

/* ---------------------------------------------------------------- IndexedDB */

const DB = {
    db: null,
    async open() {
        if (!this.db) {
            this.db = await new Promise((resolve, reject) => {
                const req = indexedDB.open('thumbnail-maker', 1);
                req.onupgradeneeded = () => {
                    req.result.createObjectStore('files');
                    req.result.createObjectStore('meta');
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }

        return this.db;
    },
    async run(store, mode, fn) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, mode);
            const req = fn(tx.objectStore(store));
            tx.oncomplete = () => resolve(req ? req.result : undefined);
            tx.onerror = () => reject(tx.error);
        });
    },
    get(store, key) { return this.run(store, 'readonly', s => s.get(key)); },
    put(store, key, value) { return this.run(store, 'readwrite', s => s.put(value, key)); },
    del(store, key) { return this.run(store, 'readwrite', s => s.delete(key)); },
    keys(store) { return this.run(store, 'readonly', s => s.getAllKeys()); }
};

let saveTimer = 0;

function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        DB.put('meta', 'doc', JSON.stringify(doc)).catch(() => {});
    }, 400);
}

/* ---------------------------------------------------------------- history */

const history = { stack: [], index: -1, timer: 0 };

function snapshot() {
    const json = JSON.stringify(doc);

    if (history.stack[history.index] === json) {
        return;
    }

    history.stack.length = history.index + 1;
    history.stack.push(json);

    if (history.stack.length > 80) {
        history.stack.shift();
    }

    history.index = history.stack.length - 1;
    updateUndoButtons();
}

// Every finished change: redraw, remember for undo (debounced) and save.
function commit({ immediate = false } = {}) {
    requestRender();
    renderLayerList();
    clearTimeout(history.timer);

    if (immediate) {
        snapshot();
    } else {
        history.timer = setTimeout(snapshot, 350);
    }

    scheduleSave();
}

function undo(step) {
    clearTimeout(history.timer);
    snapshot();
    const next = history.index + step;

    if (next < 0 || next >= history.stack.length) {
        return;
    }

    history.index = next;
    doc = JSON.parse(history.stack[next]);

    if (!selected()) {
        selectedId = null;
    }

    clearCaches();
    renderAll();
    scheduleSave();
    updateUndoButtons();
}

function updateUndoButtons() {
    $('undo').disabled = history.index <= 0;
    $('redo').disabled = history.index >= history.stack.length - 1;
}

/* ---------------------------------------------------------------- images */

async function decodeImage(blob) {
    const probe = await createImageBitmap(blob);
    const max = 3840;
    const s = Math.min(1, max / Math.max(probe.width, probe.height));

    if (s >= 1) {
        return probe;
    }

    const bitmap = await createImageBitmap(blob, {
        resizeWidth: Math.round(probe.width * s),
        resizeHeight: Math.round(probe.height * s),
        resizeQuality: 'high'
    });
    probe.close();
    return bitmap;
}

async function registerImage(id, blob, name) {
    const bitmap = await decodeImage(blob);
    const t = canvasOf(68, 44);
    const tc = t.getContext('2d');
    const s = Math.max(68 / bitmap.width, 44 / bitmap.height);
    tc.drawImage(bitmap, (68 - bitmap.width * s) / 2, (44 - bitmap.height * s) / 2, bitmap.width * s, bitmap.height * s);
    images.set(id, { bitmap, w: bitmap.width, h: bitmap.height, name, thumb: t.toDataURL('image/jpeg', 0.7) });
}

async function addImageFiles(files) {
    const list = [...files].filter(f => f.type.startsWith('image/'));

    for (const file of list) {
        const id = uid();

        try {
            await registerImage(id, file, file.name);
        } catch (err) {
            setStatus(`Could not open ${file.name}`, true);
            continue;
        }

        DB.put('files', id, file).catch(() => {});
        const img = images.get(id);
        const first = !doc.layers.some(l => l.type === 'image' && !l.graphic);
        const s = first ? Math.max(W / img.w, H / img.h) : Math.min(W / img.w, H / img.h) * 0.62;
        const layer = makeImage({ imageId: id, name: (file.name || 'Photo').replace(/\.[a-z0-9]+$/i, ''), w: img.w * s, h: img.h * s });
        // New photos go under the text so titles stay on top.
        const firstText = doc.layers.findIndex(l => l.type === 'text');
        const at = first ? 0 : firstText === -1 ? doc.layers.length : firstText;
        doc.layers.splice(at, 0, layer);
        selectedId = layer.id;
    }

    if (list.length) {
        renderProps();
        commit({ immediate: true });
    }
}

/* ---------------------------------------------------------------- colour grading */

function effectiveLook(look) {
    const P = { ...NEUTRAL, ...(LOOK_BY_ID[look.preset] || LOOKS[0]).p };
    const s = look.preset === 'none' ? 0 : look.strength ?? 1;
    const mix = (a, b) => a + (b - a) * s;
    const arr = (a, b) => a.map((v, i) => mix(v, b[i]));
    return {
        exposure: mix(0, P.exposure) + look.exposure,
        contrast: mix(0, P.contrast) + look.contrast,
        saturation: Math.max(0, mix(1, P.saturation) * (1 + look.saturation)),
        temp: mix(0, P.temp) + look.temp,
        tint: mix(0, P.tint) + look.tint,
        fade: Math.min(0.5, mix(0, P.fade) + look.fade),
        bw: clamp01(mix(0, P.bw)),
        halation: mix(0, P.halation) + look.halation,
        gamma: arr([1, 1, 1], P.gamma),
        shadows: arr([0, 0, 0], P.shadows),
        highlights: arr([0, 0, 0], P.highlights)
    };
}

function isNeutralGrade(e) {
    return !e.exposure && !e.contrast && e.saturation === 1 && !e.temp && !e.tint && !e.fade && !e.bw
        && e.gamma.every(v => v === 1) && e.shadows.every(v => !v) && e.highlights.every(v => !v);
}

function sCurve(x, s) {
    if (!s) {
        return x;
    }

    const e = Math.exp(s);
    return x < 0.5 ? 0.5 * Math.pow(2 * x, e) : 1 - 0.5 * Math.pow(2 - 2 * x, e);
}

function grade(r, g, b, p) {
    const k = 2 ** p.exposure;
    r *= k * (1 + 0.14 * p.temp + 0.04 * p.tint);
    g *= k * (1 - 0.07 * p.tint);
    b *= k * (1 - 0.14 * p.temp + 0.04 * p.tint);
    r = Math.pow(clamp01(r), 1 / p.gamma[0]);
    g = Math.pow(clamp01(g), 1 / p.gamma[1]);
    b = Math.pow(clamp01(b), 1 / p.gamma[2]);
    r = sCurve(r, p.contrast);
    g = sCurve(g, p.contrast);
    b = sCurve(b, p.contrast);
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = l + (r - l) * p.saturation;
    g = l + (g - l) * p.saturation;
    b = l + (b - l) * p.saturation;

    if (p.bw) {
        r += (l - r) * p.bw;
        g += (l - g) * p.bw;
        b += (l - b) * p.bw;
    }

    const ws = (1 - l) * (1 - l);
    const wh = l * l;
    r += p.shadows[0] * ws + p.highlights[0] * wh;
    g += p.shadows[1] * ws + p.highlights[1] * wh;
    b += p.shadows[2] * ws + p.highlights[2] * wh;
    r = p.fade + clamp01(r) * (1 - p.fade);
    g = p.fade + clamp01(g) * (1 - p.fade);
    b = p.fade + clamp01(b) * (1 - p.fade);
    return [r, g, b];
}

function sampleCube(cube, r, g, b) {
    const n = cube.size;
    const n1 = n - 1;
    const fx = clamp01(r) * n1;
    const fy = clamp01(g) * n1;
    const fz = clamp01(b) * n1;
    const x0 = Math.min(n1 - 1, Math.floor(fx));
    const y0 = Math.min(n1 - 1, Math.floor(fy));
    const z0 = Math.min(n1 - 1, Math.floor(fz));
    const dx = fx - x0;
    const dy = fy - y0;
    const dz = fz - z0;
    const d = cube.data;
    const at = (x, y, z, c) => d[(x + y * n + z * n * n) * 3 + c];
    const out = [0, 0, 0];

    for (let c = 0; c < 3; c++) {
        const c00 = at(x0, y0, z0, c) + (at(x0 + 1, y0, z0, c) - at(x0, y0, z0, c)) * dx;
        const c10 = at(x0, y0 + 1, z0, c) + (at(x0 + 1, y0 + 1, z0, c) - at(x0, y0 + 1, z0, c)) * dx;
        const c01 = at(x0, y0, z0 + 1, c) + (at(x0 + 1, y0, z0 + 1, c) - at(x0, y0, z0 + 1, c)) * dx;
        const c11 = at(x0, y0 + 1, z0 + 1, c) + (at(x0 + 1, y0 + 1, z0 + 1, c) - at(x0, y0 + 1, z0 + 1, c)) * dx;
        const c0 = c00 + (c10 - c00) * dy;
        const c1 = c01 + (c11 - c01) * dy;
        out[c] = c0 + (c1 - c0) * dz;
    }

    return out;
}

// The whole grade (look + adjustments + optional .cube) baked into one 33³ table.
const LUT_N = 33;
const bakedLuts = new Map();

function bakeLut(grade_, cube, amount) {
    const key = JSON.stringify(grade_) + '|' + (cube ? cube.id : '') + '|' + amount;
    const hit = bakedLuts.get(key);

    if (hit) {
        return hit;
    }

    const N = LUT_N;
    const out = new Float32Array(N * N * N * 3);
    let o = 0;

    for (let bi = 0; bi < N; bi++) {
        for (let gi = 0; gi < N; gi++) {
            for (let ri = 0; ri < N; ri++) {
                let [r, g, b] = grade(ri / (N - 1), gi / (N - 1), bi / (N - 1), grade_);

                if (cube && amount > 0) {
                    const [cr, cg, cb] = sampleCube(cube, r, g, b);
                    r += (cr - r) * amount;
                    g += (cg - g) * amount;
                    b += (cb - b) * amount;
                }

                out[o++] = clamp01(r) * 255;
                out[o++] = clamp01(g) * 255;
                out[o++] = clamp01(b) * 255;
            }
        }
    }

    if (bakedLuts.size > 40) {
        bakedLuts.delete(bakedLuts.keys().next().value);
    }

    bakedLuts.set(key, out);
    return out;
}

const LUT_IDX = new Int32Array(256);
const LUT_FRAC = new Float32Array(256);

for (let v = 0; v < 256; v++) {
    const f = (v / 255) * (LUT_N - 1);
    const i = Math.min(LUT_N - 2, Math.floor(f));
    LUT_IDX[v] = i;
    LUT_FRAC[v] = f - i;
}

function applyLut(px, lut) {
    const N = LUT_N;
    const sy = N * 3;
    const sz = N * N * 3;

    for (let p = 0; p < px.length; p += 4) {
        const r = px[p];
        const g = px[p + 1];
        const b = px[p + 2];
        const fr = LUT_FRAC[r];
        const fg = LUT_FRAC[g];
        const fb = LUT_FRAC[b];
        const i000 = (LUT_IDX[r] + LUT_IDX[g] * N + LUT_IDX[b] * N * N) * 3;

        for (let c = 0; c < 3; c++) {
            const a = i000 + c;
            const c00 = lut[a] + (lut[a + 3] - lut[a]) * fr;
            const c10 = lut[a + sy] + (lut[a + sy + 3] - lut[a + sy]) * fr;
            const c01 = lut[a + sz] + (lut[a + sz + 3] - lut[a + sz]) * fr;
            const c11 = lut[a + sy + sz] + (lut[a + sy + sz + 3] - lut[a + sy + sz]) * fr;
            const c0 = c00 + (c10 - c00) * fg;
            px[p + c] = c0 + (c01 + (c11 - c01) * fg - c0) * fb;
        }
    }
}

// Red glow around highlights, as on film without an anti-halation layer.
function halate(ctx, c, amount) {
    const sw = Math.max(8, Math.round(c.width / 10));
    const sh = Math.max(8, Math.round(c.height / 10));
    const small = canvasOf(sw, sh);
    const sx = small.getContext('2d', { willReadFrequently: true });
    sx.drawImage(c, 0, 0, sw, sh);
    const d = sx.getImageData(0, 0, sw, sh);
    const px = d.data;

    for (let p = 0; p < px.length; p += 4) {
        const l = (0.2126 * px[p] + 0.7152 * px[p + 1] + 0.0722 * px[p + 2]) / 255;
        const v = Math.max(0, (l - 0.68) / 0.32);
        px[p] = 255 * v;
        px[p + 1] = 70 * v;
        px[p + 2] = 30 * v;
        px[p + 3] = 255;
    }

    sx.putImageData(d, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = clamp01(amount);
    ctx.filter = `blur(${Math.max(1, c.width / 260)}px)`;
    ctx.drawImage(small, 0, 0, c.width, c.height);
    ctx.restore();
}

function gradeCanvas(src, look, w, h) {
    const c = canvasOf(w, h);
    const x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, c.width, c.height);
    const e = effectiveLook(look);
    const cube = look.lut ? luts.get(look.lut) : null;

    if (!isNeutralGrade(e) || (cube && look.lutAmount > 0)) {
        const d = x.getImageData(0, 0, c.width, c.height);
        applyLut(d.data, bakeLut(e, cube, look.lutAmount));
        x.putImageData(d, 0, 0);
    }

    if (e.halation > 0) {
        halate(x, c, e.halation);
    }

    return c;
}

const procCache = new Map();

function processed(l, maxSide) {
    const img = images.get(l.imageId);
    const key = `${l.imageId}|${maxSide}|${JSON.stringify(l.look)}|${luts.has(l.look.lut)}`;
    const hit = procCache.get(l.id);

    if (hit && hit.key === key) {
        return hit.canvas;
    }

    const s = Math.min(1, maxSide / Math.max(img.w, img.h));
    const canvas = gradeCanvas(img.bitmap, l.look, img.w * s, img.h * s);
    procCache.set(l.id, { key, canvas });
    return canvas;
}

function parseCube(text, name) {
    let size = 0;
    const values = [];
    let min = [0, 0, 0];
    let max = [1, 1, 1];

    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();

        if (!line || line.startsWith('#') || line.startsWith('TITLE')) {
            continue;
        }

        if (line.startsWith('LUT_1D_SIZE')) {
            throw new Error('1D LUTs are not supported');
        }

        if (line.startsWith('LUT_3D_SIZE')) {
            size = parseInt(line.split(/\s+/)[1], 10);
            continue;
        }

        if (line.startsWith('DOMAIN_MIN')) {
            min = line.split(/\s+/).slice(1).map(Number);
            continue;
        }

        if (line.startsWith('DOMAIN_MAX')) {
            max = line.split(/\s+/).slice(1).map(Number);
            continue;
        }

        if (/^[-\d.]/.test(line)) {
            const [r, g, b] = line.split(/\s+/).map(Number);
            values.push(r, g, b);
        }
    }

    if (!size || values.length < size * size * size * 3) {
        throw new Error('Not a 3D .cube LUT');
    }

    const data = new Float32Array(size * size * size * 3);

    for (let i = 0; i < data.length; i++) {
        const c = i % 3;
        data[i] = (values[i] - min[c]) / ((max[c] - min[c]) || 1);
    }

    return { size, data, name };
}

/* ---------------------------------------------------------------- text */

let fontsVersion = 0;
const fontsRequested = new Set();

function ensureFont(id) {
    const f = FONT_BY_ID[id] || FONTS[0];

    if (fontsRequested.has(f.id)) {
        return;
    }

    fontsRequested.add(f.id);
    document.fonts.load(fontSpec(f), 'AaЖж').then((faces) => {
        if (!faces.length) {
            // The stylesheet wasn't ready yet: try again on the next draw.
            fontsRequested.delete(f.id);
            return;
        }

        fontsVersion++;
        textCache.clear();
        requestRender();
        renderLayerList();
    }).catch(() => {});
}

// What to ask document.fonts for: the web fallback of a system font, or the font itself.
function fontSpec(f) {
    return `${f.weight} 40px "${f.load || f.family}"`;
}

function fontString(l) {
    const f = FONT_BY_ID[l.font] || FONTS[0];
    return `${f.weight} ${l.size}px ${f.stack || `"${f.family}", sans-serif`}`;
}

const measureCtx = document.createElement('canvas').getContext('2d');

function setSpacing(ctx, px) {
    if ('letterSpacing' in ctx) {
        ctx.letterSpacing = `${px}px`;
    }
}

function textBox(l) {
    ensureFont(l.font);
    measureCtx.font = fontString(l);
    const spacing = l.spacing * l.size;
    setSpacing(measureCtx, spacing);
    const lines = (l.upper ? l.text.toUpperCase() : l.text).split('\n');
    const widths = lines.map(s => Math.max(0, measureCtx.measureText(s).width - (s ? spacing : 0)));
    const capH = measureCtx.measureText('H').actualBoundingBoxAscent || l.size * 0.7;
    const lineH = l.size * l.lineHeight;
    const tw = Math.max(l.size * 0.5, ...widths);
    const th = lineH * lines.length;
    let padX = l.bg === 'none' ? l.stroke * l.size + 4 : l.padX * l.size;
    let padY = l.bg === 'none' ? l.stroke * l.size + 4 : l.padY * l.size;

    if (l.bg === 'film') {
        padY = Math.max(padY, l.size * 0.55);
    }

    if (l.bg === 'brush' || l.bg === 'tape') {
        padX = Math.max(padX, l.size * 0.35);
    }

    if (l.bg === 'burst') {
        padX = Math.max(padX, l.size * 0.75);
        padY = Math.max(padY, l.size * 0.7);
    }

    return { lines, widths, capH, lineH, tw, th, padX, padY, bw: tw + padX * 2, bh: th + padY * 2, spacing };
}

function drawTextBg(ctx, l, box, s) {
    const { bw, bh } = box;
    const c = l.bgColor;
    const R = rng(l.seed);
    const r = l.radius * l.size;

    switch (l.bg) {
        case 'box':
            ctx.fillStyle = c;
            rr(ctx, 0, 0, bw, bh, r);
            ctx.fill();
            break;
        case 'pill':
            ctx.fillStyle = c;
            rr(ctx, 0, 0, bw, bh, bh / 2);
            ctx.fill();
            break;
        case 'gradient': {
            const g = ctx.createLinearGradient(0, 0, bw, bh);
            g.addColorStop(0, c);
            g.addColorStop(1, l.bgColor2);
            ctx.fillStyle = g;
            rr(ctx, 0, 0, bw, bh, r);
            ctx.fill();
            break;
        }
        case 'outline': {
            const lw = Math.max(2, l.size * 0.06);
            ctx.strokeStyle = c;
            ctx.lineWidth = lw;
            rr(ctx, lw / 2, lw / 2, bw - lw, bh - lw, r);
            ctx.stroke();
            break;
        }
        case 'brutal': {
            const o = l.size * 0.09;
            ctx.fillStyle = l.bgColor2;
            rr(ctx, o, o, bw, bh, r);
            ctx.fill();
            ctx.fillStyle = c;
            rr(ctx, 0, 0, bw, bh, r);
            ctx.fill();
            ctx.lineWidth = Math.max(2, l.size * 0.035);
            ctx.strokeStyle = l.bgColor2;
            ctx.stroke();
            break;
        }
        case 'sticker': {
            const e = l.size * 0.08;
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
            ctx.shadowBlur = l.size * 0.15 * s;
            ctx.shadowOffsetY = l.size * 0.05 * s;
            ctx.fillStyle = '#ffffff';
            rr(ctx, -e, -e, bw + e * 2, bh + e * 2, r + e);
            ctx.fill();
            ctx.restore();
            ctx.fillStyle = c;
            rr(ctx, 0, 0, bw, bh, r);
            ctx.fill();
            break;
        }
        case 'label': {
            const lr = l.size * 0.08;
            ctx.fillStyle = c;
            rr(ctx, 0, 0, bw, bh, lr);
            ctx.fill();
            const g = ctx.createLinearGradient(0, 0, 0, bh);
            g.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
            g.addColorStop(0.45, 'rgba(255, 255, 255, 0.04)');
            g.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
            ctx.fillStyle = g;
            ctx.fill();
            ctx.save();
            ctx.clip();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;

            for (let x = 2; x < bw; x += 3) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, bh);
                ctx.stroke();
            }

            ctx.restore();
            break;
        }
        case 'film':
            drawFilmBg(ctx, l, box);
            break;
        case 'tape':
            drawTapeBg(ctx, l, box, s, R);
            break;
        case 'paper':
            drawPaperBg(ctx, l, box, s, R);
            break;
        case 'brush':
            drawBrushBg(ctx, l, box, s, R);
            break;
        case 'marker':
            drawMarkerBg(ctx, l, box, s, R);
            break;
        case 'bubble': {
            const br = Math.min(bh / 2, l.size * 0.35);
            const tail = l.size * 0.5;
            ctx.beginPath();
            addRoundRect(ctx, 0, 0, bw, bh, br);
            ctx.moveTo(bw * 0.3, bh - 0.5);
            ctx.lineTo(bw * 0.14, bh + tail);
            ctx.lineTo(bw * 0.16, bh - 0.5);
            ctx.closePath();
            ctx.fillStyle = c;
            ctx.lineJoin = 'round';
            ctx.lineWidth = Math.max(2, l.size * 0.05);
            ctx.strokeStyle = l.bgColor2;
            ctx.stroke();
            ctx.fill();
            break;
        }
        case 'burst': {
            const n = 18;
            ctx.beginPath();

            for (let i = 0; i < n * 2; i++) {
                const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
                const k = i % 2 ? 0.8 + R() * 0.04 : 1;
                const x = bw / 2 + Math.cos(a) * (bw / 2) * k;
                const y = bh / 2 + Math.sin(a) * (bh / 2) * k;

                if (i) {
                    ctx.lineTo(x, y);
                } else {
                    ctx.moveTo(x, y);
                }
            }

            ctx.closePath();
            ctx.fillStyle = c;
            ctx.fill();
            ctx.lineJoin = 'round';
            ctx.lineWidth = Math.max(2, l.size * 0.05);
            ctx.strokeStyle = l.bgColor2;
            ctx.stroke();
            break;
        }
        case 'stamp': {
            const lw = l.size * 0.07;
            ctx.strokeStyle = c;
            ctx.lineWidth = lw;
            rr(ctx, lw / 2, lw / 2, bw - lw, bh - lw, r);
            ctx.stroke();
            const inset = lw * 1.9;
            ctx.lineWidth = lw * 0.4;
            rr(ctx, inset, inset, bw - inset * 2, bh - inset * 2, Math.max(0, r - inset));
            ctx.stroke();
            break;
        }
        default:
    }
}

function drawFilmBg(ctx, l, box) {
    const { bw, bh, padY } = box;
    const band = padY;
    const hh = Math.min(band * 0.42, l.size * 0.22);
    const hw = hh * 1.35;
    const pitch = hw * 1.9;
    ctx.beginPath();
    ctx.rect(0, 0, bw, bh);

    for (let x = pitch * 0.4; x + hw < bw; x += pitch) {
        addRoundRect(ctx, x, (band - hh) / 2, hw, hh, hh * 0.25);
        addRoundRect(ctx, x, bh - band + (band - hh) / 2, hw, hh, hh * 0.25);
    }

    ctx.fillStyle = l.bgColor;
    ctx.fill('evenodd');
    // Thin frame lines where the image area starts, like a real strip.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, band - 1, bw, 1);
    ctx.fillRect(0, bh - band, bw, 1);
}

/*
 * Textured backgrounds are painted pixel by pixel at the output scale, so
 * they look like real materials (bristles, paper fibres) at any size.
 */

function valueNoise(R, n = 2048) {
    const t = new Float32Array(n);

    for (let i = 0; i < n; i++) {
        t[i] = R();
    }

    return (x) => {
        const i = Math.floor(x);
        const f = x - i;
        const a = t[((i % n) + n) % n];
        const b = t[(((i + 1) % n) + n) % n];
        return a + (b - a) * f * f * (3 - 2 * f);
    };
}

function paintCanvas(wd, hd, paint) {
    const c = canvasOf(wd, hd);
    const x = c.getContext('2d');
    const img = x.createImageData(c.width, c.height);
    paint(img.data, c.width, c.height);
    x.putImageData(img, 0, 0);
    return c;
}

/*
 * One stroke of paint: bristle by bristle, with a rounded or chisel start,
 * ragged top and bottom, and a dry, streaky end.
 *   top/bottom: band of the box the stroke covers (0..1)
 *   dry: how long the dry tail is, in stroke heights
 *   alpha: [min, max] opacity per bristle (a marker is a little see-through)
 */
function strokeCanvas(l, box, s, R, opt) {
    const { bw, bh } = box;
    const ov = l.size * (opt.overhang ?? 0.3);
    const top = bh * opt.top;
    const sh = bh * (opt.bottom - opt.top);
    const ovy = sh * 0.15;
    const wd = Math.ceil((bw + ov * 2) * s);
    const hd = Math.ceil((bh + ovy * 2) * s);
    const [cr, cg, cb] = hexToRgb(l.bgColor);
    const nz = valueNoise(R);
    const phase = R() * 10;
    const tilt = (R() - 0.5) * 0.012;
    // Where the letters are (canvas coords, design px): always solid paint there.
    const pad = l.size * 0.08;
    const tx0 = ov + box.padX - pad;
    const tx1 = ov + bw - box.padX + pad;
    const ty0 = ovy + box.padY - pad;
    const ty1 = ovy + bh - box.padY + pad;
    const rowPx = Math.max(1, (sh * s) / 90);
    const streak = l.size * 0.2; // length of dry streaks, in design px
    const rows = Math.ceil((sh * s) / rowPx);
    const total = bw + ov * 2;

    const canvas = paintCanvas(wd, hd, (d, cw, chh) => {
        for (let i = 0; i < rows; i++) {
            const yN = (i + 0.5) / rows;
            const e = Math.abs(2 * yN - 1);
            const load = 0.78 + 0.22 * R() - Math.pow(e, 5) * 0.5;
            const shade = opt.flat ? 0.97 + R() * 0.05 : 0.95 + R() * 0.08;
            const alpha = 255 * (opt.alpha[0] + (opt.alpha[1] - opt.alpha[0]) * R());
            const cap = opt.chisel
                ? (yN - 0.5) * sh * 0.45
                : (1 - Math.sqrt(Math.max(0, 1 - (2 * yN - 1) ** 2))) * sh * 0.32;
            const startX = Math.min(ov * 0.35 + cap + R() * l.size * 0.03, tx0 - l.size * 0.05);
            const endX = Math.max(ov + bw + ov * (0.25 + 0.6 * R()) + (opt.chisel ? cap : -Math.pow(e, 3) * sh * 0.8 * R()), tx1 + l.size * 0.1);
            // The dry, streaky part only starts after the last letter.
            const dryStart = Math.max(tx1, endX - sh * (opt.dry[0] + R() * (opt.dry[1] - opt.dry[0])));
            const dry = Math.max(1e-3, endX - dryStart);
            const seed = R() * 1000;
            const y0 = ovy + top + yN * sh;

            for (let xd = Math.max(0, Math.floor(startX * s)); xd < Math.min(cw, endX * s); xd++) {
                const x = xd / s;
                const dryness = Math.min(1, Math.max(0, (x - dryStart) / dry));
                const wet = Math.min(1, Math.max(0, 1 - (x - startX) / (l.size * 0.12)));
                // Long, soft-edged streaks rather than pixel noise.
                const n = nz(seed + x / streak) * 0.6 + nz(seed * 1.7 + x / (streak * 0.25)) * 0.4;
                const edgeBreak = e > 0.8 ? (e - 0.8) * 2.5 : 0;
                const threshold = dryness * 1.1 + (1 - load) * 0.4 + edgeBreak + wet * 0.1 - 0.05;
                const cover = Math.min(1, (n - threshold) / 0.07);

                if (cover <= 0) {
                    continue;
                }

                const wave = Math.sin((x / total) * Math.PI * 1.3 + phase) * sh * 0.015 + (x - total / 2) * tilt;
                const yp = Math.round((y0 + wave) * s - rowPx / 2);
                const tone = shade * (0.97 + 0.06 * nz(seed + x / (l.size * 0.6))) * (1 - dryness * 0.06);
                const a = alpha * cover;

                for (let k = 0; k < Math.ceil(rowPx) + 1; k++) {
                    const yy = yp + k;

                    if (yy < 0 || yy >= chh) {
                        continue;
                    }

                    const o = (yy * cw + xd) * 4;
                    d[o] = cr * tone;
                    d[o + 1] = cg * tone;
                    d[o + 2] = cb * tone;
                    d[o + 3] = Math.max(d[o + 3], a);
                }
            }
        }

        // Fill any gap left under the letters.
        if (opt.coverText) {
            const fa = 255 * opt.alpha[1];

            for (let yy = Math.max(0, Math.floor(ty0 * s)); yy < Math.min(chh, ty1 * s); yy++) {
                for (let xd = Math.max(0, Math.floor(tx0 * s)); xd < Math.min(cw, tx1 * s); xd++) {
                    const o = (yy * cw + xd) * 4;

                    if (d[o + 3] < fa) {
                        const k = d[o + 3] / 255;
                        d[o] = d[o] * k + cr * 0.99 * (1 - k);
                        d[o + 1] = d[o + 1] * k + cg * 0.99 * (1 - k);
                        d[o + 2] = d[o + 2] * k + cb * 0.99 * (1 - k);
                        d[o + 3] = fa;
                    }
                }
            }
        }
    });

    // A few drops flicked off the end of the brush.
    if (opt.splatter) {
        const x = canvas.getContext('2d');
        x.fillStyle = l.bgColor;

        for (let i = 0; i < 7; i++) {
            const px = (ov + bw + ov * (0.2 + R() * 0.9)) * s;
            const py = (ovy + top + sh * (0.1 + R() * 0.8)) * s;
            x.beginPath();
            x.arc(px, py, (0.6 + R() * R() * 2.6) * s * (l.size / 60), 0, Math.PI * 2);
            x.fill();
        }
    }

    return { canvas, ox: -ov, oy: -ovy, w: bw + ov * 2, h: bh + ovy * 2 };
}

function drawBrushBg(ctx, l, box, s, R) {
    const t = strokeCanvas(l, box, s, R, { top: 0.02, bottom: 0.98, dry: [0.7, 1.6], alpha: [1, 1], splatter: true, coverText: true });
    ctx.save();
    ctx.filter = 'blur(0.35px)';
    ctx.drawImage(t.canvas, t.ox, t.oy, t.w, t.h);
    ctx.restore();
}

function drawMarkerBg(ctx, l, box, s, R) {
    const t = strokeCanvas(l, box, s, R, { top: 0.34, bottom: 0.97, dry: [0.05, 0.2], alpha: [0.78, 0.9], chisel: true, flat: true, overhang: 0.12 });
    ctx.save();
    ctx.filter = 'blur(0.35px)';
    ctx.drawImage(t.canvas, t.ox, t.oy, t.w, t.h);
    ctx.restore();
}

// Masking tape: crepe paper, a bit see-through, torn into fine fibrous zigzags at the ends.
function drawTapeBg(ctx, l, box, s, R) {
    const { bw, bh } = box;
    const [cr, cg, cb] = hexToRgb(l.bgColor);
    const depth = Math.min(bh * 0.14, l.size * 0.14);
    const teeth = Math.max(4, Math.round(bh / (l.size * 0.11)));
    const nz = valueNoise(R);
    const s1 = R() * 500;
    const s2 = R() * 500;
    const tear = (y, sd) => {
        const p = (y / bh) * teeth;
        const tri = Math.abs((p % 1) * 2 - 1);
        return depth * (0.25 + 0.75 * tri * (0.6 + 0.4 * nz(sd + Math.floor(p) * 3.1))) + (R() - 0.5) * (1.2 / s) * 2;
    };
    const canvas = paintCanvas(bw * s, bh * s, (d, cw, chh) => {
        for (let yd = 0; yd < chh; yd++) {
            const y = yd / s;
            const left = tear(y, s1);
            const right = bw - tear(y, s2);
            const fibre = (nz(s1 + yd / 1.3) - 0.5) * 0.07;

            for (let xd = 0; xd < cw; xd++) {
                const x = xd / s;

                if (x < left || x > right) {
                    continue;
                }

                const edge = Math.min(x - left, right - x) < 1.5 / s;
                const crepe = Math.sin(x * 0.9 + nz(s2 + yd / 6) * 6) * 0.02;
                const tone = 1 + fibre + crepe + (R() - 0.5) * 0.06;
                const o = (yd * cw + xd) * 4;
                d[o] = cr * tone;
                d[o + 1] = cg * tone;
                d[o + 2] = cb * tone;
                d[o + 3] = edge ? 170 : 232;
            }
        }
    });
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = l.size * 0.06 * s;
    ctx.shadowOffsetY = l.size * 0.02 * s;
    ctx.drawImage(canvas, 0, 0, bw, bh);
    ctx.restore();
}

// Torn paper: wavering edges, a white fibrous rim where the paper's core shows, loose fibres.
function drawPaperBg(ctx, l, box, s, R) {
    const { bw, bh } = box;
    const ov = l.size * 0.12;
    const [cr, cg, cb] = hexToRgb(l.bgColor);
    const nz = valueNoise(R);
    const seeds = [R() * 900, R() * 900, R() * 900, R() * 900, R() * 900];
    const amp = l.size * 0.16;
    const edge = (sd, t) => (nz(sd + t / (l.size * 0.7)) * 0.55 + nz(sd * 1.3 + t / (l.size * 0.14)) * 0.3 + nz(sd * 1.9 + t / (l.size * 0.03)) * 0.15) * amp;
    const rimW = l.size * 0.09;
    const canvas = paintCanvas((bw + ov * 2) * s, (bh + ov * 2) * s, (d, cw, chh) => {
        const tops = new Float32Array(cw);
        const bottoms = new Float32Array(cw);

        for (let xd = 0; xd < cw; xd++) {
            const x = xd / s - ov;
            tops[xd] = edge(seeds[0], x);
            bottoms[xd] = bh - edge(seeds[1], x);
        }

        for (let yd = 0; yd < chh; yd++) {
            const y = yd / s - ov;
            const left = edge(seeds[2], y) * 0.6;
            const right = bw - edge(seeds[3], y) * 0.6;

            for (let xd = 0; xd < cw; xd++) {
                const x = xd / s - ov;
                const dTop = y - tops[xd];
                const inside = Math.min(dTop, bottoms[xd] - y, x - left, right - x);
                const o = (yd * cw + xd) * 4;

                if (inside < 0) {
                    // Loose fibres sticking out of the tear.
                    if (inside > -l.size * 0.05 && R() < 0.12 * (1 + inside / (l.size * 0.05))) {
                        d[o] = d[o + 1] = d[o + 2] = 250;
                        d[o + 3] = 150;
                    }

                    continue;
                }

                // The white rim is wider along the top tear, as when paper is ripped towards you.
                const rim = (dTop === inside ? rimW * 1.6 : rimW * 0.6) * (0.4 + nz(seeds[4] + (x + y) / (l.size * 0.05)));

                if (inside < rim) {
                    const t = 248 + (R() - 0.5) * 10;
                    d[o] = t;
                    d[o + 1] = t;
                    d[o + 2] = t - 4;
                    d[o + 3] = inside < 1 / s ? 200 : 255;
                    continue;
                }

                // A thin shadow where the printed surface meets the torn rim.
                const lip = inside < rim + 1.5 / s ? 0.88 : 1;
                const tone = lip * (1 + (R() - 0.5) * 0.05 + (nz(seeds[4] + xd / 9 + yd / 23) - 0.5) * 0.04);
                d[o] = cr * tone;
                d[o + 1] = cg * tone;
                d[o + 2] = cb * tone;
                d[o + 3] = 255;
            }
        }
    });
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.32)';
    ctx.shadowBlur = l.size * 0.12 * s;
    ctx.shadowOffsetY = l.size * 0.04 * s;
    ctx.drawImage(canvas, -ov, -ov, bw + ov * 2, bh + ov * 2);
    ctx.restore();
}

function distressCanvas(ctx, c, amount, seed, s) {
    const R = rng(seed + 99);
    const area = (c.width * c.height) / (s * s);
    const count = Math.round(area * amount * 0.0035);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';

    for (let i = 0; i < count; i++) {
        const r = (0.4 + R() * R() * 3) * s;
        ctx.globalAlpha = 0.35 + R() * 0.65;
        ctx.beginPath();
        ctx.arc(R() * c.width, R() * c.height, r, 0, Math.PI * 2);
        ctx.fill();
    }

    for (let i = 0; i < count / 120; i++) {
        const x = R() * c.width;
        const y = R() * c.height;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = (0.6 + R()) * s;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (R() - 0.5) * 120 * s, y + (R() - 0.5) * 30 * s);
        ctx.stroke();
    }

    ctx.restore();
}

function drawGlyphs(ctx, l, box, s) {
    ctx.font = fontString(l);
    setSpacing(ctx, box.spacing);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    let fill = l.color;

    if (l.fill === 'gradient') {
        const g = ctx.createLinearGradient(0, box.padY, 0, box.padY + box.th);
        g.addColorStop(0, l.color);
        g.addColorStop(1, l.color2);
        fill = g;
    }

    const place = (i) => {
        const w = box.widths[i];
        const x = l.align === 'left' ? box.padX : l.align === 'right' ? box.bw - box.padX - w : (box.bw - w) / 2;
        const y = box.padY + i * box.lineH + box.lineH / 2 + box.capH / 2;
        return [x, y];
    };

    if (l.shadow > 0 || l.stroke > 0) {
        ctx.save();

        if (l.shadow > 0) {
            ctx.shadowColor = rgba(l.shadowColor, l.shadowAlpha);
            ctx.shadowBlur = l.shadow * l.size * s;
            ctx.shadowOffsetX = l.shadowOffset * l.size * s * 0.6;
            ctx.shadowOffsetY = l.shadowOffset * l.size * s;
        }

        ctx.lineJoin = 'round';
        ctx.lineWidth = l.stroke * l.size * 2;
        ctx.strokeStyle = l.strokeColor;
        ctx.fillStyle = fill;
        box.lines.forEach((line, i) => {
            const [x, y] = place(i);

            if (l.stroke > 0) {
                ctx.strokeText(line, x, y);
            } else {
                ctx.fillText(line, x, y);
            }
        });
        ctx.restore();
    }

    ctx.fillStyle = fill;
    box.lines.forEach((line, i) => {
        const [x, y] = place(i);
        ctx.fillText(line, x, y);
    });
}

const textCache = new Map();
const TEXT_KEY_SKIP = new Set(['x', 'y', 'rot', 'opacity', 'hidden', 'locked', 'name', 'id']);

function textKey(l) {
    return Object.keys(l).filter(k => !TEXT_KEY_SKIP.has(k)).map(k => l[k]).join('|');
}

function textCanvas(l, s) {
    const key = `${textKey(l)}|${s}|${fontsVersion}`;
    const hit = textCache.get(l.id);

    if (hit && hit.key === key) {
        return hit;
    }

    const box = textBox(l);
    const m = Math.ceil(l.size * 0.5 + l.shadow * l.size * 2.5 + Math.abs(l.shadowOffset) * l.size + 12);
    const canvas = canvasOf((box.bw + m * 2) * s, (box.bh + m * 2) * s);
    const ctx = canvas.getContext('2d');
    ctx.scale(s, s);
    ctx.translate(m, m);
    drawTextBg(ctx, l, box, s);
    drawGlyphs(ctx, l, box, s);
    const worn = Math.max(l.distress, l.bg === 'stamp' ? 0.3 : 0);

    if (worn > 0) {
        distressCanvas(ctx, canvas, worn, l.seed, s);
    }

    const out = { key, canvas, m, box };
    textCache.set(l.id, out);
    return out;
}

/* ---------------------------------------------------------------- stickers */

const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

function stickerFont(l) {
    return l.kind === 'icon' ? `${l.size}px "bootstrap-icons"` : `${l.size}px ${EMOJI_FONT}`;
}

function stickerBox(l) {
    measureCtx.font = stickerFont(l);
    setSpacing(measureCtx, 0);
    const m = measureCtx.measureText(l.glyph);
    const left = m.actualBoundingBoxLeft || 0;
    const right = m.actualBoundingBoxRight || l.size;
    const asc = m.actualBoundingBoxAscent || l.size * 0.8;
    const desc = m.actualBoundingBoxDescent || l.size * 0.2;
    const gw = Math.max(1, left + right);
    const gh = Math.max(1, asc + desc);
    const ol = l.outline * l.size;
    let bw = gw + ol * 2 + 4;
    let bh = gh + ol * 2 + 4;

    if (l.badge !== 'none') {
        bw = bh = Math.max(gw, gh) * (1 + l.badgePad * 2) + ol * 2;
    }

    return { left, right, asc, desc, gw, gh, bw, bh };
}

let iconFontReady = false;

function stickerCanvas(l, s) {
    if (l.kind === 'icon' && !iconFontReady) {
        document.fonts.load('40px "bootstrap-icons"', l.glyph).then(() => {
            iconFontReady = true;
            fontsVersion++;
            textCache.clear();
            requestRender();
        });
    }

    const key = `${textKey(l)}|${s}|${fontsVersion}`;
    const hit = textCache.get(l.id);

    if (hit && hit.key === key) {
        return hit;
    }

    const box = stickerBox(l);
    const m = Math.ceil(l.size * 0.35 + l.shadow * l.size * 2 + 8);
    const W2 = (box.bw + m * 2) * s;
    const H2 = (box.bh + m * 2) * s;
    const canvas = canvasOf(W2, H2);
    const ctx = canvas.getContext('2d');
    const cx = m + box.bw / 2;
    const cy = m + box.bh / 2;

    // The glyph alone.
    const glyph = canvasOf(W2, H2);
    const g = glyph.getContext('2d');
    g.scale(s, s);
    g.font = stickerFont(l);
    g.textBaseline = 'alphabetic';
    g.textAlign = 'left';
    g.fillStyle = l.kind === 'icon' ? l.color : '#000000';
    g.fillText(l.glyph, cx - (box.right - box.left) / 2, cy + (box.asc - box.desc) / 2);

    // Die-cut outline: the glyph's silhouette stamped all around it.
    const art = canvasOf(W2, H2);
    const a = art.getContext('2d');

    if (l.outline > 0) {
        const sil = canvasOf(W2, H2);
        const sc = sil.getContext('2d');
        sc.drawImage(glyph, 0, 0);
        sc.globalCompositeOperation = 'source-in';
        sc.fillStyle = l.outlineColor;
        sc.fillRect(0, 0, W2, H2);
        const r = l.outline * l.size * s;

        for (let i = 0; i < 24; i++) {
            const t = (i / 24) * Math.PI * 2;
            a.drawImage(sil, Math.cos(t) * r, Math.sin(t) * r);
        }

        a.drawImage(sil, 0, 0);
    }

    a.drawImage(glyph, 0, 0);

    if (l.badge !== 'none') {
        ctx.save();
        ctx.scale(s, s);

        if (l.shadow > 0) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
            ctx.shadowBlur = l.shadow * l.size * s;
            ctx.shadowOffsetY = l.shadow * l.size * 0.3 * s;
        }

        ctx.fillStyle = l.badgeColor;
        ctx.beginPath();

        if (l.badge === 'circle') {
            ctx.arc(cx, cy, box.bw / 2, 0, Math.PI * 2);
        } else {
            addRoundRect(ctx, m, m, box.bw, box.bh, box.bw * 0.22);
        }

        ctx.fill();
        ctx.restore();
        ctx.drawImage(art, 0, 0);
    } else {
        ctx.save();

        if (l.shadow > 0) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = l.shadow * l.size * s;
            ctx.shadowOffsetY = l.shadow * l.size * 0.3 * s;
        }

        ctx.drawImage(art, 0, 0);
        ctx.restore();
    }

    const out = { key, canvas, m, box };
    textCache.set(l.id, out);
    return out;
}

// Bootstrap Icons glyphs, read from the icon font's CSS so names stay names.
const iconChars = new Map();

function iconChar(name) {
    if (!iconChars.has(name)) {
        const i = document.createElement('i');
        i.className = `bi bi-${name}`;
        i.style.position = 'absolute';
        i.style.visibility = 'hidden';
        document.body.append(i);
        const content = getComputedStyle(i, '::before').content;
        i.remove();
        const ch = content && content !== 'none' && content !== 'normal' ? content.replace(/^["']|["']$/g, '') : '';
        iconChars.set(name, ch);
    }

    return iconChars.get(name);
}

/* ---------------------------------------------------------------- layers */

function layerSize(l) {
    if (l.type === 'text') {
        const b = textBox(l);
        return { w: b.bw, h: b.bh };
    }

    if (l.type === 'sticker') {
        const b = stickerBox(l);
        return { w: b.bw, h: b.bh };
    }

    return { w: l.w, h: l.h };
}

function drawImageLayer(ctx, l, s) {
    const img = images.get(l.imageId);
    const { w, h } = l;

    if (!img) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(-w / 2, -h / 2, w, h);
        return;
    }

    const side = Math.max(w, h) * s;
    const maxSide = Math.min(Math.max(img.w, img.h), Math.ceil(side / 256) * 256);
    const src = processed(l, maxSide);
    const b = l.border;
    const r = l.radius;

    // Plain images (e.g. cut-out graphics) cast a shadow that follows their shape.
    const plain = !b && !r;

    if (plain && l.shadow > 0) {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = l.shadow * s;
        ctx.shadowOffsetY = l.shadow * 0.35 * s;

        if (l.flip) {
            ctx.scale(-1, 1);
        }

        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(src, -w / 2, -h / 2, w, h);
        ctx.restore();
        return;
    }

    if (l.shadow > 0 || b > 0) {
        ctx.save();

        if (l.shadow > 0) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
            ctx.shadowBlur = l.shadow * s;
            ctx.shadowOffsetY = l.shadow * 0.35 * s;
        }

        ctx.fillStyle = b > 0 ? l.borderColor : '#000000';
        rr(ctx, -w / 2 - b, -h / 2 - b, w + b * 2, h + b * 2, r + (r ? b : 0));
        ctx.fill();
        ctx.restore();
    }

    ctx.save();
    rr(ctx, -w / 2, -h / 2, w, h, r);
    ctx.clip();

    if (l.flip) {
        ctx.scale(-1, 1);
    }

    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, -w / 2, -h / 2, w, h);
    ctx.restore();
}

function drawTextLayer(ctx, l, s) {
    const t = textCanvas(l, s);
    const { bw, bh } = t.box;
    ctx.drawImage(t.canvas, -bw / 2 - t.m, -bh / 2 - t.m, bw + t.m * 2, bh + t.m * 2);
}

function drawShapeLayer(ctx, l, s) {
    const { w, h } = l;
    ctx.save();

    if (l.shadow > 0) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = l.shadow * s;
        ctx.shadowOffsetY = l.shadow * 0.3 * s;
    }

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (l.shape === 'scribble') {
        const R = rng(l.seed);
        const a0 = R() * Math.PI * 2;
        const turns = 1.8 + R() * 0.15;
        const steps = 120;
        ctx.beginPath();

        for (let k = 0; k <= steps; k++) {
            const t = k / steps;
            const a = a0 + t * turns * Math.PI * 2;
            const wob = 1 + Math.sin(a * 3 + l.seed) * 0.015 + (t - 0.5) * 0.09;
            const x = Math.cos(a) * (w / 2) * wob;
            const y = Math.sin(a) * (h / 2) * wob;

            if (k) {
                ctx.lineTo(x, y);
            } else {
                ctx.moveTo(x, y);
            }
        }

        ctx.strokeStyle = l.stroke;
        ctx.lineWidth = Math.max(1, l.strokeW);
        ctx.stroke();
        ctx.restore();
        return;
    }

    if (STROKE_SHAPES.includes(l.shape) && l.shape !== 'scribble') {
        const R = rng(l.seed);
        const j = () => (R() - 0.5) * Math.min(w, h) * 0.06;
        const lw = Math.max(1, l.strokeW);
        ctx.strokeStyle = l.stroke;
        ctx.lineWidth = lw;
        ctx.beginPath();

        if (l.shape === 'arrowline') {
            // Along the layer's x axis, tail at the left, head at the right, bowed by `bend`.
            const x0 = -w / 2 + lw / 2;
            const x1 = w / 2 - lw / 2;
            const cyp = -(l.bend ?? 0.3) * h + j() * 0.5;
            const head = Math.min(w * 0.35, lw * 3.2 + 18);
            ctx.moveTo(x0, 0);
            ctx.quadraticCurveTo(j() * 0.5, cyp, x1, 0);
            const back = Math.atan2(cyp, -x1);
            const tip = [x1, 0];
            const wing = (da) => [x1 + Math.cos(back + da) * head, Math.sin(back + da) * head];

            if (l.head === 'filled') {
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x1 + Math.cos(back) * -lw * 0.6, Math.sin(back) * -lw * 0.6);
                ctx.lineTo(...wing(-0.45));
                ctx.lineTo(...wing(0.45));
                ctx.closePath();
                ctx.fillStyle = l.stroke;
                ctx.fill();
                ctx.stroke();
                ctx.restore();
                return;
            }

            ctx.moveTo(...wing(-0.5));
            ctx.lineTo(...tip);
            ctx.lineTo(...wing(0.5));
        } else if (l.shape === 'scribblebox') {
            // Two quick passes around the box, corners overshooting a little like a marker.
            for (let pass = 0; pass < 2; pass++) {
                const o = pass * lw * 0.4;
                const c = [[-w / 2 + j(), -h / 2 + j() - o], [w / 2 + j() + o, -h / 2 + j()], [w / 2 + j(), h / 2 + j() + o], [-w / 2 + j() - o, h / 2 + j()]];
                ctx.moveTo(c[0][0] - lw * 0.6, c[0][1]);

                for (let i = 1; i <= 4; i++) {
                    const [x, y] = c[i % 4];
                    ctx.lineTo(x + (i === 4 ? lw * 0.8 : 0), y);
                }

                if (pass === 0 && R() < 0.5) {
                    break;
                }
            }
        } else if (l.shape === 'curved') {
            const x0 = -w / 2 + lw;
            const y0 = h / 2 - lw;
            const x1 = w / 2 - lw;
            const y1 = -h / 2 + lw * 1.5;
            const cxp = -w * 0.15 + j();
            const cyp = -h * 0.55 + j();
            ctx.moveTo(x0, y0);
            ctx.quadraticCurveTo(cxp, cyp, x1, y1);
            const tx = x1 - cxp;
            const ty = y1 - cyp;
            const tl = Math.hypot(tx, ty) || 1;
            const head = Math.min(w, h) * 0.32 + lw;
            const back = Math.atan2(-ty / tl, -tx / tl);

            for (const da of [-0.5, 0.5]) {
                ctx.moveTo(x1, y1);
                ctx.lineTo(x1 + Math.cos(back + da) * head, y1 + Math.sin(back + da) * head);
            }
        } else if (l.shape === 'underline') {
            ctx.moveTo(-w / 2, -h * 0.15 + j());
            ctx.quadraticCurveTo(0, -h * 0.35 + j(), w / 2, -h * 0.25 + j());
            ctx.quadraticCurveTo(w * 0.1, -h * 0.05, -w * 0.38, h * 0.3 + j());
            ctx.quadraticCurveTo(0, h * 0.12, w * 0.42, h * 0.2 + j());
        } else if (l.shape === 'cross') {
            ctx.moveTo(-w / 2 + j(), -h / 2 + j());
            ctx.quadraticCurveTo(j(), j(), w / 2 + j(), h / 2 + j());
            ctx.moveTo(w / 2 + j(), -h / 2 + j());
            ctx.quadraticCurveTo(j(), j(), -w / 2 + j(), h / 2 + j());
        } else if (l.shape === 'tick') {
            // One clean stroke: short leg down, long leg up. No wobble, no curl.
            ctx.moveTo(-w / 2 + lw, h * 0.02);
            ctx.lineTo(-w * 0.14, h / 2 - lw);
            ctx.lineTo(w / 2 - lw, -h / 2 + lw);
        } else {
            ctx.moveTo(-w / 2 + lw, h * 0.05);
            ctx.quadraticCurveTo(-w * 0.3, h * 0.2, -w * 0.12, h / 2 - lw);
            ctx.quadraticCurveTo(w * 0.05, -h * 0.1, w / 2 - lw, -h / 2 + lw);
        }

        ctx.stroke();
        ctx.restore();
        return;
    }

    ctx.beginPath();

    if (l.shape === 'sparkle') {
        const p = [[0, -h / 2], [w / 2, 0], [0, h / 2], [-w / 2, 0]];
        ctx.moveTo(...p[0]);

        for (let i = 1; i <= 4; i++) {
            ctx.quadraticCurveTo(0, 0, ...p[i % 4]);
        }

        ctx.closePath();
    } else if (l.shape === 'burst') {
        const n = 16;

        for (let i = 0; i < n * 2; i++) {
            const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
            const k = i % 2 ? 0.74 : 1;
            const x = Math.cos(a) * (w / 2) * k;
            const y = Math.sin(a) * (h / 2) * k;

            if (i) {
                ctx.lineTo(x, y);
            } else {
                ctx.moveTo(x, y);
            }
        }

        ctx.closePath();
    } else if (l.shape === 'ellipse') {
        ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else if (l.shape === 'arrow') {
        const head = Math.min(w * 0.45, h);
        const shaft = h * 0.42;
        ctx.moveTo(-w / 2, -shaft / 2);
        ctx.lineTo(w / 2 - head, -shaft / 2);
        ctx.lineTo(w / 2 - head, -h / 2);
        ctx.lineTo(w / 2, 0);
        ctx.lineTo(w / 2 - head, h / 2);
        ctx.lineTo(w / 2 - head, shaft / 2);
        ctx.lineTo(-w / 2, shaft / 2);
        ctx.closePath();
    } else {
        addRoundRect(ctx, -w / 2, -h / 2, w, h, l.radius);
    }

    if (l.fillOn) {
        ctx.fillStyle = l.fill;
        ctx.fill();
        ctx.shadowColor = 'transparent';
    }

    if (l.strokeW > 0) {
        ctx.strokeStyle = l.stroke;
        ctx.lineWidth = l.strokeW;
        ctx.stroke();
    }

    ctx.restore();
}

function drawLayer(ctx, l, s) {
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate((l.rot * Math.PI) / 180);
    ctx.globalAlpha = l.opacity ?? 1;

    if (l.type === 'image') {
        drawImageLayer(ctx, l, s);
    } else if (l.type === 'text') {
        drawTextLayer(ctx, l, s);
    } else if (l.type === 'sticker') {
        const t = stickerCanvas(l, s);
        const { bw, bh } = t.box;
        ctx.drawImage(t.canvas, -bw / 2 - t.m, -bh / 2 - t.m, bw + t.m * 2, bh + t.m * 2);
    } else {
        drawShapeLayer(ctx, l, s);
    }

    ctx.restore();
}

/* ---------------------------------------------------------------- background & finish */

function drawBackground(ctx) {
    const b = doc.bg;

    if (b.type === 'solid') {
        ctx.fillStyle = b.color;
    } else {
        const a = (b.angle * Math.PI) / 180;
        const dx = Math.sin(a);
        const dy = -Math.cos(a);
        const half = (Math.abs(W * dx) + Math.abs(H * dy)) / 2;
        const g = ctx.createLinearGradient(W / 2 - dx * half, H / 2 - dy * half, W / 2 + dx * half, H / 2 + dy * half);
        g.addColorStop(0, b.color);
        g.addColorStop(1, b.color2);
        ctx.fillStyle = g;
    }

    ctx.fillRect(0, 0, W, H);
}

const noiseTiles = {};

function noiseTile(colour) {
    const k = colour ? 'c' : 'm';

    if (!noiseTiles[k]) {
        const size = 512;
        const c = canvasOf(size, size);
        const x = c.getContext('2d');
        const d = x.createImageData(size, size);
        const R = rng(1234);
        const gauss = () => (R() + R() + R() + R() - 2) * 1.2;

        for (let p = 0; p < d.data.length; p += 4) {
            const v = gauss();
            d.data[p] = 128 + (colour ? gauss() : v) * 60;
            d.data[p + 1] = 128 + v * 60;
            d.data[p + 2] = 128 + (colour ? gauss() : v) * 60;
            d.data[p + 3] = 255;
        }

        x.putImageData(d, 0, 0);
        noiseTiles[k] = c;
    }

    return noiseTiles[k];
}

function drawFinish(ctx) {
    const f = doc.finish;

    if (f.leak > 0) {
        const R = rng(f.leakSeed);
        const colours = ['255, 90, 20', '255, 40, 30', '255, 190, 90', '255, 120, 160'];
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const n = 2 + Math.floor(R() * 2);

        for (let i = 0; i < n; i++) {
            const left = R() < 0.5;
            const x = left ? -W * 0.05 + R() * W * 0.12 : W * 1.05 - R() * W * 0.12;
            const y = R() * H;
            const r = H * (0.45 + R() * 0.6);
            const c = colours[Math.floor(R() * colours.length)];
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, `rgba(${c}, ${0.9 * f.leak})`);
            g.addColorStop(0.4, `rgba(${c}, ${0.45 * f.leak})`);
            g.addColorStop(1, `rgba(${c}, 0)`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        }

        // A burnt streak along one edge.
        const left = R() < 0.5;
        const g = ctx.createLinearGradient(left ? 0 : W, 0, left ? W * 0.18 : W * 0.82, 0);
        g.addColorStop(0, `rgba(255, 110, 30, ${0.7 * f.leak})`);
        g.addColorStop(1, 'rgba(255, 110, 30, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }

    if (f.vignette > 0) {
        const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, Math.hypot(W, H) / 2);
        g.addColorStop(0, 'rgba(0, 0, 0, 0)');
        g.addColorStop(1, `rgba(0, 0, 0, ${f.vignette})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }

    if (f.dust > 0) {
        const R = rng(f.dustSeed);
        const count = Math.round(f.dust * 140);
        ctx.save();

        for (let i = 0; i < count; i++) {
            const light = R() < 0.8;
            ctx.globalAlpha = 0.45 + R() * 0.5;
            ctx.fillStyle = light ? '#ffffff' : '#000000';
            ctx.strokeStyle = ctx.fillStyle;
            const x = R() * W;
            const y = R() * H;

            if (R() < 0.15) {
                const len = 12 + R() * 50;
                const a = R() * Math.PI * 2;
                ctx.lineWidth = 0.6 + R() * 0.7;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.bezierCurveTo(
                    x + Math.cos(a) * len * 0.4 + (R() - 0.5) * 20, y + Math.sin(a) * len * 0.4 + (R() - 0.5) * 20,
                    x + Math.cos(a) * len * 0.8 + (R() - 0.5) * 20, y + Math.sin(a) * len * 0.8 + (R() - 0.5) * 20,
                    x + Math.cos(a) * len, y + Math.sin(a) * len
                );
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(x, y, 0.5 + R() * R() * 2.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    if (f.grain > 0) {
        const pattern = ctx.createPattern(noiseTile(f.grainColor), 'repeat');
        pattern.setTransform(new DOMMatrix().scale(f.grainSize));
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = clamp01(f.grain);
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }
}

function renderDoc(ctx, s) {
    ctx.save();
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    drawBackground(ctx);
    const layers = doc.layers;
    let finishAt = -1;

    if (doc.finish.overText) {
        finishAt = layers.length - 1;
    } else {
        layers.forEach((l, i) => {
            // Photos only: cut-out graphics sit on top like the text.
            if (l.type === 'image' && !l.graphic && !l.hidden) {
                finishAt = i;
            }
        });
    }

    if (finishAt === -1) {
        drawFinish(ctx);
    }

    layers.forEach((l, i) => {
        if (!l.hidden) {
            drawLayer(ctx, l, s);
        }

        if (i === finishAt) {
            drawFinish(ctx);
        }
    });
    ctx.restore();
}

function clearCaches() {
    procCache.clear();
    textCache.clear();
}

/* ---------------------------------------------------------------- canvas view */

const canvas = $('canvas');
const view = canvas.getContext('2d');
const docCanvas = document.createElement('canvas');
let viewScale = 1; // device px per design px
let cssScale = 1; // css px per design px
let dirty = true;
let frame = 0;
let guides = { v: false, h: false };
let dragging = null;

function layoutCanvas() {
    const box = $('viewport').getBoundingClientRect();
    const availW = Math.max(100, box.width - 36);
    const availH = Math.max(100, box.height - 36);
    cssScale = Math.min(availW / W, availH / H);
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${Math.floor(W * cssScale)}px`;
    canvas.style.height = `${Math.floor(H * cssScale)}px`;
    canvas.width = Math.round(W * cssScale * dpr);
    canvas.height = Math.round(H * cssScale * dpr);
    docCanvas.width = canvas.width;
    docCanvas.height = canvas.height;
    viewScale = canvas.width / W;
    dirty = true;
    requestRender();
}

function requestRender(docChanged = true) {
    if (docChanged) {
        dirty = true;
    }

    if (!frame) {
        frame = requestAnimationFrame(paint);
    }
}

let feedTimer = 0;

function paint() {
    frame = 0;

    if (dirty) {
        const dctx = docCanvas.getContext('2d');
        dctx.setTransform(1, 0, 0, 1, 0, 0);
        dctx.clearRect(0, 0, docCanvas.width, docCanvas.height);
        renderDoc(dctx, viewScale);
        dirty = false;
        clearTimeout(feedTimer);
        feedTimer = setTimeout(renderFeed, 150);
    }

    view.setTransform(1, 0, 0, 1, 0, 0);
    view.drawImage(docCanvas, 0, 0);
    drawOverlay();
}

function corners(l) {
    const { w, h } = layerSize(l);
    const a = (l.rot * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const pt = (x, y) => [l.x + x * cos - y * sin, l.y + x * sin + y * cos];
    const rotOff = 26 / cssScale;
    return {
        w, h, pt,
        box: [pt(-w / 2, -h / 2), pt(w / 2, -h / 2), pt(w / 2, h / 2), pt(-w / 2, h / 2)],
        top: pt(0, -h / 2),
        rot: pt(0, -h / 2 - rotOff)
    };
}

function drawOverlay() {
    const v = view;
    v.save();
    v.setTransform(viewScale, 0, 0, viewScale, 0, 0);
    const px = 1 / cssScale;

    if ($('show-badge').checked) {
        // Where YouTube puts the video length on the thumbnail.
        const bw = 150;
        const bh = 66;
        v.fillStyle = 'rgba(0, 0, 0, 0.8)';
        rr(v, W - bw - 26, H - bh - 26, bw, bh, 12);
        v.fill();
        v.fillStyle = '#ffffff';
        v.font = '600 40px Inter, sans-serif';
        v.textAlign = 'center';
        v.textBaseline = 'middle';
        v.fillText('12:34', W - bw / 2 - 26, H - bh / 2 - 26);
    }

    if (!doc.layers.some(l => l.type === 'image' && !l.graphic)) {
        v.fillStyle = 'rgba(255, 255, 255, 0.5)';
        v.font = `500 ${15 * px}px Inter, sans-serif`;
        v.textAlign = 'left';
        v.textBaseline = 'top';
        v.fillText('Drop, paste or add a photo', 14 * px, 12 * px);
    }

    const hov = doc.layers.find(l => l.id === hoverId);

    if (hov && hov.id !== selectedId && !hov.hidden) {
        const c = corners(hov);
        v.strokeStyle = 'rgba(57, 255, 136, 0.6)';
        v.lineWidth = px;
        v.beginPath();
        c.box.forEach(([x, y], i) => (i ? v.lineTo(x, y) : v.moveTo(x, y)));
        v.closePath();
        v.stroke();
    }

    const sel = selected();

    if (sel && !sel.hidden) {
        const c = corners(sel);
        v.strokeStyle = '#39ff88';
        v.lineWidth = 1.5 * px;
        v.setLineDash([5 * px, 4 * px]);
        v.beginPath();
        c.box.forEach(([x, y], i) => (i ? v.lineTo(x, y) : v.moveTo(x, y)));
        v.closePath();
        v.stroke();
        v.setLineDash([]);

        if (!sel.locked) {
            v.beginPath();
            v.moveTo(...c.top);
            v.lineTo(...c.rot);
            v.stroke();
            const hs = 9 * px;
            v.fillStyle = '#04110a';
            c.box.forEach(([x, y]) => {
                v.fillRect(x - hs / 2, y - hs / 2, hs, hs);
                v.strokeRect(x - hs / 2, y - hs / 2, hs, hs);
            });
            v.beginPath();
            v.arc(c.rot[0], c.rot[1], 5.5 * px, 0, Math.PI * 2);
            v.fillStyle = '#39ff88';
            v.fill();
        }
    }

    if (dragging && (guides.v || guides.h)) {
        v.strokeStyle = '#ff4fa3';
        v.lineWidth = px;
        v.beginPath();

        if (guides.v) {
            v.moveTo(W / 2, 0);
            v.lineTo(W / 2, H);
        }

        if (guides.h) {
            v.moveTo(0, H / 2);
            v.lineTo(W, H / 2);
        }

        v.stroke();
    }

    v.restore();
}

function toDesign(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
}

function toLocal(l, p) {
    const a = (-l.rot * Math.PI) / 180;
    const dx = p.x - l.x;
    const dy = p.y - l.y;
    return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) };
}

function hitTest(p) {
    for (let i = doc.layers.length - 1; i >= 0; i--) {
        const l = doc.layers[i];

        if (l.hidden) {
            continue;
        }

        const { w, h } = layerSize(l);
        const q = toLocal(l, p);

        if (Math.abs(q.x) <= w / 2 && Math.abs(q.y) <= h / 2) {
            return l;
        }
    }

    return null;
}

function handleAt(l, p) {
    const tol = 9 / cssScale;
    const c = corners(l);

    if (Math.hypot(p.x - c.rot[0], p.y - c.rot[1]) <= tol) {
        return { kind: 'rotate' };
    }

    const i = c.box.findIndex(([x, y]) => Math.abs(p.x - x) <= tol && Math.abs(p.y - y) <= tol);
    return i >= 0 ? { kind: 'scale', corner: i } : null;
}

/* Drawing tools: drag on the canvas to draw an arrow (tail → head) or to ring something. */

let tool = 'select';
const TOOL_SHAPES = { arrow: 'arrowline', circle: 'scribble', box: 'scribblebox' };

function setTool(t) {
    tool = t;
    document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('is-on', b.dataset.tool === t));
    canvas.style.cursor = t === 'select' ? 'default' : 'crosshair';
}

function shapeFromDrag(l, p0, p, square) {
    const dx = p.x - p0.x;
    const dy = p.y - p0.y;

    if (l.shape === 'arrowline') {
        const len = Math.hypot(dx, dy);
        Object.assign(l, { x: (p0.x + p.x) / 2, y: (p0.y + p.y) / 2, w: Math.max(20, len), h: Math.max(40, len * 0.3), rot: (Math.atan2(dy, dx) * 180) / Math.PI });
    } else {
        let w = Math.abs(dx);
        let h = Math.abs(dy);

        if (square) {
            w = h = Math.max(w, h);
        }

        // Ring a little wider than the box you dragged, so it goes around the thing.
        const grow = l.shape === 'scribble' ? 1.12 : 1.04;
        Object.assign(l, { x: p0.x + (Math.sign(dx) * w) / 2, y: p0.y + (Math.sign(dy) * h) / 2, w: Math.max(20, w * grow), h: Math.max(20, h * grow), rot: 0 });
    }
}

canvas.addEventListener('pointerdown', (e) => {
    const p = toDesign(e);

    if (tool !== 'select') {
        const l = makeShape({ shape: TOOL_SHAPES[tool], fillOn: false, strokeW: 12, stroke: '#f5a500', x: p.x, y: p.y, w: 1, h: 1 });
        doc.layers.push(l);
        selectedId = l.id;
        canvas.setPointerCapture(e.pointerId);
        dragging = { kind: 'create', id: l.id, p0: p, moved: false, start: { ...l } };
        renderLayerList();
        requestRender();
        return;
    }

    const sel = selected();
    let handle = sel && !sel.locked && !sel.hidden ? handleAt(sel, p) : null;
    let target = sel;

    if (!handle) {
        const hit = hitTest(p);

        if (hit && hit.id !== selectedId) {
            selectedId = hit.id;
            renderProps();
            renderLayerList();
        } else if (!hit) {
            if (selectedId) {
                selectedId = null;
                renderProps();
                renderLayerList();
            }

            requestRender(false);
            return;
        }

        target = hit;
        handle = { kind: 'move' };
    }

    if (target.locked) {
        requestRender(false);
        return;
    }

    canvas.setPointerCapture(e.pointerId);
    dragging = {
        kind: handle.kind, id: target.id, p0: p, moved: false,
        start: JSON.parse(JSON.stringify(target)),
        d0: Math.hypot(p.x - target.x, p.y - target.y) || 1
    };
    requestRender(false);
});

canvas.addEventListener('pointermove', (e) => {
    const p = toDesign(e);

    if (!dragging) {
        const sel = selected();
        const handle = sel && !sel.locked && !sel.hidden ? handleAt(sel, p) : null;
        const hit = handle ? null : hitTest(p);
        canvas.style.cursor = handle ? (handle.kind === 'rotate' ? 'grab' : 'nwse-resize') : hit && !hit.locked ? 'move' : 'default';
        const id = hit ? hit.id : null;

        if (id !== hoverId) {
            hoverId = id;
            requestRender(false);
        }

        return;
    }

    const l = doc.layers.find(x => x.id === dragging.id);
    const st = dragging.start;

    if (!l) {
        return;
    }

    dragging.moved = true;
    guides = { v: false, h: false };

    if (dragging.kind === 'create') {
        shapeFromDrag(l, dragging.p0, p, e.shiftKey);
    } else if (dragging.kind === 'move') {
        let x = st.x + p.x - dragging.p0.x;
        let y = st.y + p.y - dragging.p0.y;
        const snap = 7 / cssScale;

        if (!e.altKey && Math.abs(x - W / 2) < snap) {
            x = W / 2;
            guides.v = true;
        }

        if (!e.altKey && Math.abs(y - H / 2) < snap) {
            y = H / 2;
            guides.h = true;
        }

        l.x = x;
        l.y = y;
    } else if (dragging.kind === 'scale') {
        if (l.type === 'shape' && !e.shiftKey) {
            const q = toLocal(st, p);
            l.w = Math.max(12, Math.abs(q.x) * 2);
            l.h = Math.max(12, Math.abs(q.y) * 2);
        } else {
            const k = Math.max(0.05, Math.hypot(p.x - st.x, p.y - st.y) / dragging.d0);

            if (l.type === 'text' || l.type === 'sticker') {
                l.size = clamp(Math.round(st.size * k), 8, 800);
            } else {
                l.w = Math.max(12, st.w * k);
                l.h = Math.max(12, st.h * k);
            }
        }
    } else if (dragging.kind === 'rotate') {
        let a = (Math.atan2(p.y - st.y, p.x - st.x) * 180) / Math.PI + 90;
        a = ((a + 540) % 360) - 180;

        if (e.shiftKey) {
            a = Math.round(a / 15) * 15;
        } else {
            const near = Math.round(a / 90) * 90;

            if (Math.abs(a - near) < 4) {
                a = near;
            }
        }

        l.rot = Math.round(a * 10) / 10;
    }

    requestRender();
});

function endDrag() {
    if (!dragging) {
        return;
    }

    const moved = dragging.moved;
    const created = dragging.kind === 'create' ? doc.layers.find(x => x.id === dragging.id) : null;
    dragging = null;
    guides = { v: false, h: false };

    if (created) {
        // A click without much of a drag: drop a default-sized one there.
        const small = created.shape === 'arrowline' ? created.w < 30 : created.w < 30 && created.h < 30;

        if (small) {
            const { x, y } = created;
            shapeFromDrag(created, { x: x - (created.shape === 'arrowline' ? 120 : 160), y: y - (created.shape === 'arrowline' ? 0 : 90) },
                { x: x + (created.shape === 'arrowline' ? 120 : 160), y: y + (created.shape === 'arrowline' ? 0 : 90) }, false);

            if (created.shape !== 'arrowline') {
                created.x = x;
                created.y = y;
            }
        }

        setTool('select');
        renderProps();
        commit({ immediate: true });
        return;
    }

    if (moved) {
        syncProps();
        commit({ immediate: true });
    } else {
        requestRender(false);
    }
}

canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('pointerleave', () => {
    if (!dragging && hoverId) {
        hoverId = null;
        requestRender(false);
    }
});

canvas.addEventListener('dblclick', (e) => {
    const hit = hitTest(toDesign(e));

    if (hit && hit.type === 'text') {
        selectedId = hit.id;
        renderProps();
        const ta = document.querySelector('#props textarea');

        if (ta) {
            ta.focus();
            ta.select();
        }
    }
});

/* ---------------------------------------------------------------- feed preview */

function renderFeed() {
    const title = doc.layers.filter(l => l.type === 'text' && !l.hidden).map(l => l.text.replace(/\n/g, ' ')).join(' — ') || 'Video title';

    ['feed-dark', 'feed-light', 'feed-small'].forEach(id => {
        const c = $(id);
        const x = c.getContext('2d');
        x.imageSmoothingQuality = 'high';
        x.drawImage(docCanvas, 0, 0, c.width, c.height);
        // Duration badge, as YouTube draws it.
        const k = c.width / 640;
        x.fillStyle = 'rgba(0, 0, 0, 0.8)';
        rr(x, c.width - 76 * k, c.height - 40 * k, 68 * k, 32 * k, 6 * k);
        x.fill();
        x.fillStyle = '#ffffff';
        x.font = `600 ${20 * k}px Inter, sans-serif`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText('12:34', c.width - 42 * k, c.height - 24 * k);
    });

    $('feed-title-dark').textContent = title;
    $('feed-title-light').textContent = title;
}

/* ---------------------------------------------------------------- fields */

function getPath(o, path) {
    return path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
}

function setPath(o, path, v) {
    const keys = path.split('.');
    const last = keys.pop();
    keys.reduce((a, k) => a[k], o)[last] = v;
}

let fieldRefreshers = [];

// The value a setting has on a freshly made layer (or a new document), for the slider reset buttons.
const TEMPLATES = {};

function defaultFor(target, key) {
    if (target === doc.bg || target === doc.finish) {
        const fresh = TEMPLATES.doc || (TEMPLATES.doc = newDoc());
        return getPath(target === doc.bg ? fresh.bg : fresh.finish, key);
    }

    const make = { text: makeText, shape: makeShape, image: makeImage, sticker: makeSticker }[target.type];

    if (!make) {
        return undefined;
    }

    TEMPLATES[target.type] = TEMPLATES[target.type] || make();
    return getPath(TEMPLATES[target.type], key);
}

function syncProps() {
    fieldRefreshers.forEach(fn => fn());
}

/*
 * Builds controls from a list of field definitions bound to `target`:
 * { key, label, type: range|select|color|check|text|seg|tiles|buttons|heading|note, … }
 */
function buildFields(host, defs, getTarget, onChange) {
    const rows = [];

    const refreshVisibility = () => {
        const t = getTarget();

        if (!t) {
            return;
        }

        rows.forEach(({ row, def, update }) => {
            if (def.show) {
                row.hidden = !def.show(t);
            }

            update?.(t);
        });
    };

    const changed = (def, value) => {
        const t = getTarget();

        if (!t) {
            return;
        }

        if (def.key) {
            setPath(t, def.key, value);
        }

        def.after?.(t, value);
        onChange(def);
        refreshVisibility();
    };

    for (const def of defs) {
        let row;
        let update = null;

        if (def.type === 'heading') {
            row = document.createElement('h4');
            row.textContent = def.label;
        } else if (def.type === 'note') {
            row = document.createElement('p');
            row.className = 'note';
            row.textContent = def.label;
        } else if (def.type === 'text' || def.type === 'tiles' || def.type === 'buttons') {
            row = document.createElement('div');
            row.className = 'field-block';
        } else {
            row = document.createElement('div');
            row.className = 'field';
            const label = document.createElement('label');
            label.textContent = def.label;
            row.append(label);
        }

        if (def.type === 'range') {
            const wrap = document.createElement('div');
            wrap.className = 'field-range';
            const input = document.createElement('input');
            input.type = 'range';
            input.min = def.min;
            input.max = def.max;
            input.step = def.step;
            const out = document.createElement('output');
            const fmt = def.format || (v => `${Math.round(v * 100) / 100}`);
            const resetBtn = document.createElement('button');
            resetBtn.type = 'button';
            resetBtn.className = 'reset-btn';
            resetBtn.title = 'Reset';
            resetBtn.innerHTML = '<i class="bi bi-arrow-counterclockwise"></i>';
            const fallback = () => {
                const t = getTarget();
                const v = t ? defaultFor(t, def.key) : undefined;
                return typeof v === 'number' ? v : def.reset;
            };
            const showReset = (v) => {
                const d = fallback();
                resetBtn.classList.toggle('is-shown', d !== undefined && Math.abs(Number(v) - d) > 1e-9);
            };
            const doReset = () => {
                const d = fallback();

                if (d === undefined) {
                    return;
                }

                input.value = d;
                out.textContent = fmt(d);
                changed(def, d);
                showReset(d);
            };
            update = t => {
                const v = getPath(t, def.key);
                input.value = v;
                out.textContent = fmt(Number(v));
                showReset(v);
            };
            input.addEventListener('input', () => {
                out.textContent = fmt(Number(input.value));
                changed(def, Number(input.value));
                showReset(input.value);
            });
            input.addEventListener('dblclick', doReset);
            resetBtn.addEventListener('click', doReset);
            input.title = 'Double-click to reset';
            wrap.append(input, out, resetBtn);
            row.append(wrap);
        } else if (def.type === 'select') {
            const sel = document.createElement('select');
            const fill = () => {
                sel.innerHTML = '';
                (typeof def.options === 'function' ? def.options() : def.options).forEach(([v, label]) => {
                    const o = document.createElement('option');
                    o.value = v;
                    o.textContent = label;
                    sel.append(o);
                });
            };
            fill();
            update = t => {
                if (typeof def.options === 'function') {
                    fill();
                }

                sel.value = getPath(t, def.key);
            };
            sel.addEventListener('change', () => {
                if (def.onPick && def.onPick(sel.value, sel) === false) {
                    return;
                }

                changed(def, def.number ? Number(sel.value) : sel.value);
            });
            row.append(sel);
        } else if (def.type === 'color') {
            const wrap = document.createElement('div');
            wrap.className = 'field-color';
            const input = document.createElement('input');
            input.type = 'color';
            const sw = SWATCHES.map(hex => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'swatch';
                b.style.background = hex;
                b.title = hex;
                b.addEventListener('click', () => {
                    input.value = hex;
                    changed(def, hex);
                    update(getTarget());
                });
                wrap.append(b);
                return [hex, b];
            });
            update = t => {
                const v = getPath(t, def.key);
                input.value = v;
                sw.forEach(([hex, b]) => b.classList.toggle('is-active', hex.toLowerCase() === String(v).toLowerCase()));
            };
            input.addEventListener('input', () => changed(def, input.value));
            wrap.append(input);
            row.append(wrap);
        } else if (def.type === 'check') {
            const input = document.createElement('input');
            input.type = 'checkbox';
            update = t => {
                input.checked = !!getPath(t, def.key);
            };
            input.addEventListener('change', () => changed(def, input.checked));
            row.append(input);
        } else if (def.type === 'text') {
            const ta = document.createElement('textarea');
            ta.rows = 2;
            ta.spellcheck = false;
            update = t => {
                if (document.activeElement !== ta) {
                    ta.value = getPath(t, def.key);
                }
            };
            ta.addEventListener('input', () => changed(def, ta.value));
            row.append(ta);
        } else if (def.type === 'seg') {
            const wrap = document.createElement('div');
            wrap.className = 'seg';
            const btns = def.options.map(([v, html, title]) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'btn btn--mini';
                b.innerHTML = html;
                b.title = title || '';
                b.addEventListener('click', () => {
                    changed(def, v);
                    update(getTarget());
                });
                wrap.append(b);
                return [v, b];
            });
            update = t => btns.forEach(([v, b]) => b.classList.toggle('is-on', getPath(t, def.key) === v));
            row.append(wrap);
        } else if (def.type === 'tiles') {
            const wrap = document.createElement('div');
            wrap.className = `tiles ${def.className || ''}`;
            const tiles = def.options.map(opt => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'tile';
                b.title = opt.label;
                const c = canvasOf(def.tileW || 150, def.tileH || 84);
                const span = document.createElement('span');
                span.textContent = opt.label;
                b.append(c, span);
                b.addEventListener('click', () => {
                    changed(def, opt.value);
                    update(getTarget());
                });
                wrap.append(b);
                return { opt, b, c };
            });
            update = t => {
                tiles.forEach(({ opt, b }) => b.classList.toggle('is-active', def.key ? getPath(t, def.key) === opt.value : false));
            };
            // Tiles are drawn a few at a time so the panel opens at once.
            let i = 0;
            const drawSome = () => {
                const t = getTarget();

                if (!t || !wrap.isConnected && i > 0) {
                    return;
                }

                const until = performance.now() + 12;

                while (i < tiles.length && performance.now() < until) {
                    def.draw(tiles[i].c, tiles[i].opt, t);
                    i++;
                }

                if (i < tiles.length) {
                    requestAnimationFrame(drawSome);
                }
            };
            requestAnimationFrame(drawSome);
            row.append(wrap);
        } else if (def.type === 'buttons') {
            const wrap = document.createElement('div');
            wrap.className = 'buttons';
            def.buttons.forEach(bd => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'btn btn--mini';
                b.innerHTML = bd.label;
                b.title = bd.title || '';
                b.addEventListener('click', () => {
                    bd.onClick(getTarget());
                    onChange(def);
                    refreshVisibility();
                });
                wrap.append(b);
            });
            row.append(wrap);
        }

        host.append(row);
        rows.push({ row, def, update });
    }

    refreshVisibility();
    return refreshVisibility;
}

const pct = v => `${Math.round(v * 100)}%`;
const signed = v => `${v > 0 ? '+' : ''}${Math.round(v * 100)}`;
const deg = v => `${Math.round(v)}°`;
const pxf = v => `${Math.round(v)}px`;

function drawTextTile(c, overrides, base) {
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, c.width, c.height);
    x.fillStyle = '#4a5450';
    x.fillRect(0, 0, c.width, c.height);
    const g = x.createLinearGradient(0, 0, c.width, c.height);
    g.addColorStop(0, '#5d6b66');
    g.addColorStop(1, '#2c3431');
    x.fillStyle = g;
    x.fillRect(0, 0, c.width, c.height);
    const l = { ...makeText(), ...base, ...overrides, id: 'tile', text: overrides.sample || 'Film', size: 60, seed: base?.seed || 7 };
    delete l.sample;
    textCache.delete('tile');
    const t = textCanvas(l, 1);
    textCache.delete('tile');
    const w = t.box.bw + t.m * 2;
    const h = t.box.bh + t.m * 2;
    const k = Math.min((c.width * 0.9) / t.box.bw, (c.height * 0.8) / t.box.bh, 1.4);
    x.drawImage(t.canvas, c.width / 2 - (w * k) / 2, c.height / 2 - (h * k) / 2, w * k, h * k);
}

function fontOptions() {
    return FONTS.map(f => [f.id, f.name]);
}

function textDefs() {
    return [
        { type: 'text', key: 'text' },
        { type: 'heading', label: 'Style presets' },
        {
            type: 'tiles', options: TEXT_PRESETS.map(p => ({ value: p.name, label: p.name, p: p.p })),
            draw: (c, opt) => drawTextTile(c, { ...opt.p, sample: 'Film' }, {}),
            after: (l, name) => {
                const preset = TEXT_PRESETS.find(p => p.name === name);
                Object.assign(l, { spacing: 0, radius: 0.12 }, preset.p);
                renderProps();
            }
        },
        { type: 'heading', label: 'Type' },
        { key: 'font', label: 'Font', type: 'select', options: fontOptions },
        { key: 'size', label: 'Size', type: 'range', min: 12, max: 320, step: 1, format: pxf },
        { key: 'upper', label: 'Uppercase', type: 'check' },
        { key: 'align', label: 'Align', type: 'seg', options: [['left', '<i class="bi bi-text-left"></i>'], ['center', '<i class="bi bi-text-center"></i>'], ['right', '<i class="bi bi-text-right"></i>']] },
        { key: 'spacing', label: 'Spacing', type: 'range', min: -0.08, max: 0.5, step: 0.01, reset: 0, format: v => `${Math.round(v * 100)}` },
        { key: 'lineHeight', label: 'Line height', type: 'range', min: 0.7, max: 1.8, step: 0.05, reset: 1.05 },
        { key: 'fill', label: 'Fill', type: 'seg', options: [['solid', 'Solid'], ['gradient', 'Gradient']] },
        { key: 'color', label: 'Colour', type: 'color' },
        { key: 'color2', label: 'Colour 2', type: 'color', show: l => l.fill === 'gradient' },
        { key: 'stroke', label: 'Outline', type: 'range', min: 0, max: 0.25, step: 0.005, reset: 0, format: pct },
        { key: 'strokeColor', label: 'Outline col.', type: 'color', show: l => l.stroke > 0 },
        { key: 'shadow', label: 'Shadow', type: 'range', min: 0, max: 0.8, step: 0.01, reset: 0, format: pct },
        { key: 'shadowOffset', label: 'Shadow drop', type: 'range', min: -0.2, max: 0.3, step: 0.005, reset: 0.04, format: pct, show: l => l.shadow > 0 },
        { key: 'shadowColor', label: 'Shadow col.', type: 'color', show: l => l.shadow > 0 },
        { key: 'shadowAlpha', label: 'Shadow str.', type: 'range', min: 0, max: 1, step: 0.05, format: pct, show: l => l.shadow > 0 },
        { type: 'heading', label: 'Background' },
        {
            type: 'tiles', key: 'bg', options: TEXT_BGS.map(([value, label]) => ({ value, label })),
            draw: (c, opt, l) => drawTextTile(c, { bg: opt.value, ...(BG_COLOURS[opt.value] || {}), sample: 'Aa', shadow: 0, stroke: 0, distress: 0 }, { font: l.font, upper: false }),
            after: (l, v) => {
                Object.assign(l, BG_COLOURS[v] || {});

                if (v !== 'none' && l.stroke > 0.05 && ['box', 'pill', 'sticker', 'label'].includes(v)) {
                    l.stroke = 0;
                }

                syncProps();
            }
        },
        { key: 'bgColor', label: 'Colour', type: 'color', show: l => l.bg !== 'none' },
        { key: 'bgColor2', label: 'Colour 2', type: 'color', show: l => TWO_COLOUR_BGS.includes(l.bg) },
        { key: 'padX', label: 'Padding ↔', type: 'range', min: 0, max: 1.5, step: 0.02, format: pct, show: l => l.bg !== 'none' },
        { key: 'padY', label: 'Padding ↕', type: 'range', min: 0, max: 1, step: 0.02, format: pct, show: l => l.bg !== 'none' },
        { key: 'radius', label: 'Corners', type: 'range', min: 0, max: 0.6, step: 0.01, format: pct, show: l => RADIUS_BGS.includes(l.bg) },
        { type: 'buttons', show: l => ROUGH_BGS.includes(l.bg) || l.bg === 'burst' || l.distress > 0, buttons: [{ label: '<i class="bi bi-shuffle"></i> New shape', title: 'Another random edge, brush or wear pattern', onClick: l => { l.seed = newSeed(); } }] },
        { key: 'distress', label: 'Worn', type: 'range', min: 0, max: 1, step: 0.02, reset: 0, format: pct },
        ...commonDefs()
    ];
}

function commonDefs() {
    return [
        { type: 'heading', label: 'Layer' },
        { key: 'opacity', label: 'Opacity', type: 'range', min: 0, max: 1, step: 0.01, reset: 1, format: pct },
        { key: 'rot', label: 'Rotation', type: 'range', min: -180, max: 180, step: 0.5, reset: 0, format: deg },
        {
            type: 'buttons', buttons: [
                { label: '<i class="bi bi-align-center"></i> Centre', title: 'Centre on the canvas', onClick: l => { l.x = W / 2; l.y = H / 2; } },
                { label: '<i class="bi bi-distribute-horizontal"></i> Centre ↔', onClick: l => { l.x = W / 2; } },
                { label: '<i class="bi bi-copy"></i> Duplicate', onClick: () => duplicateSelected() },
                { label: '<i class="bi bi-trash3"></i> Delete', onClick: () => deleteSelected() }
            ]
        }
    ];
}

function lookTileDraw(c, opt, l) {
    const img = images.get(l.imageId);
    const x = c.getContext('2d');

    if (!img) {
        return;
    }

    const s = Math.max(c.width / img.w, c.height / img.h);
    const small = lookSource(l, img);
    const graded = gradeCanvas(small, { ...l.look, preset: opt.value, strength: 1, lut: '', halation: 0 }, small.width, small.height);
    x.drawImage(graded, (c.width - img.w * s) / 2, (c.height - img.h * s) / 2, img.w * s, img.h * s);
}

const lookSources = new Map();

function lookSource(l, img) {
    let c = lookSources.get(l.imageId);

    if (!c) {
        const s = 220 / Math.max(img.w, img.h);
        c = canvasOf(img.w * s, img.h * s);
        c.getContext('2d').drawImage(img.bitmap, 0, 0, c.width, c.height);
        lookSources.set(l.imageId, c);
    }

    return c;
}

function lutOptions() {
    return [['', 'None'], ...doc.luts.map(x => [x.id, x.name]), ['__import', 'Import .cube…']];
}

function imageDefs() {
    return [
        { type: 'heading', label: 'Film look' },
        { type: 'tiles', key: 'look.preset', className: 'tiles--looks', tileW: 150, tileH: 96, options: LOOKS.map(x => ({ value: x.id, label: x.name })), draw: lookTileDraw },
        { key: 'look.strength', label: 'Strength', type: 'range', min: 0, max: 1.5, step: 0.05, reset: 1, format: pct, show: l => l.look.preset !== 'none' },
        { type: 'heading', label: 'Colour' },
        { key: 'look.exposure', label: 'Exposure', type: 'range', min: -1.5, max: 1.5, step: 0.05, reset: 0, format: v => `${v > 0 ? '+' : ''}${v.toFixed(2)}` },
        { key: 'look.contrast', label: 'Contrast', type: 'range', min: -0.8, max: 0.8, step: 0.02, reset: 0, format: signed },
        { key: 'look.saturation', label: 'Saturation', type: 'range', min: -1, max: 1, step: 0.02, reset: 0, format: signed },
        { key: 'look.temp', label: 'Warmth', type: 'range', min: -1, max: 1, step: 0.02, reset: 0, format: signed },
        { key: 'look.tint', label: 'Tint', type: 'range', min: -1, max: 1, step: 0.02, reset: 0, format: signed },
        { key: 'look.fade', label: 'Fade', type: 'range', min: 0, max: 0.35, step: 0.01, reset: 0, format: pct },
        { key: 'look.halation', label: 'Halation', type: 'range', min: 0, max: 1, step: 0.02, reset: 0, format: pct },
        {
            key: 'look.lut', label: 'LUT', type: 'select', options: lutOptions,
            onPick: (v, sel) => {
                if (v === '__import') {
                    sel.value = selected()?.look.lut || '';
                    $('lut-input').click();
                    return false;
                }

                return true;
            }
        },
        { key: 'look.lutAmount', label: 'LUT amount', type: 'range', min: 0, max: 1, step: 0.02, reset: 1, format: pct, show: l => !!l.look.lut },
        { type: 'buttons', buttons: [{ label: '<i class="bi bi-arrow-counterclockwise"></i> Reset colour', onClick: l => { l.look = { ...LOOK_DEFAULT }; renderProps(); } }] },
        { type: 'heading', label: 'Frame' },
        { key: 'border', label: 'Border', type: 'range', min: 0, max: 60, step: 1, reset: 0, format: pxf },
        { key: 'borderColor', label: 'Border col.', type: 'color', show: l => l.border > 0 },
        { key: 'radius', label: 'Corners', type: 'range', min: 0, max: 120, step: 1, reset: 0, format: pxf },
        { key: 'shadow', label: 'Shadow', type: 'range', min: 0, max: 120, step: 1, reset: 0, format: pxf },
        { key: 'flip', label: 'Mirror', type: 'check' },
        {
            type: 'buttons', buttons: [
                { label: '<i class="bi bi-arrows-fullscreen"></i> Fill canvas', onClick: l => fitImage(l, true) },
                { label: '<i class="bi bi-fullscreen-exit"></i> Fit inside', onClick: l => fitImage(l, false) }
            ]
        },
        ...commonDefs()
    ];
}

function fitImage(l, cover) {
    const img = images.get(l.imageId);

    if (!img) {
        return;
    }

    const s = cover ? Math.max(W / img.w, H / img.h) : Math.min(W / img.w, H / img.h);
    Object.assign(l, { w: img.w * s, h: img.h * s, x: W / 2, y: H / 2, rot: 0 });
}

function shapeDefs() {
    return [
        { type: 'heading', label: 'Shape' },
        { key: 'shape', label: 'Kind', type: 'select', options: GRAPHIC_SHAPES, after: (l, v) => { Object.assign(l, shapeDefaults(v)); syncProps(); } },
        { key: 'fillOn', label: 'Fill', type: 'check', show: l => !STROKE_SHAPES.includes(l.shape) },
        { key: 'fill', label: 'Fill colour', type: 'color', show: l => l.fillOn && !STROKE_SHAPES.includes(l.shape) },
        { key: 'strokeW', label: 'Line', type: 'range', min: 0, max: 60, step: 1, format: pxf },
        { key: 'bend', label: 'Bend', type: 'range', min: -1, max: 1, step: 0.02, reset: 0, format: signed, show: l => l.shape === 'arrowline' },
        { key: 'head', label: 'Head', type: 'seg', options: [['open', 'Open'], ['filled', 'Filled']], show: l => l.shape === 'arrowline' },
        { key: 'stroke', label: 'Line colour', type: 'color', show: l => l.strokeW > 0 },
        { key: 'radius', label: 'Corners', type: 'range', min: 0, max: 200, step: 1, format: pxf, show: l => l.shape === 'rect' },
        { key: 'shadow', label: 'Shadow', type: 'range', min: 0, max: 80, step: 1, reset: 0, format: pxf },
        { type: 'buttons', show: l => STROKE_SHAPES.includes(l.shape), buttons: [{ label: '<i class="bi bi-shuffle"></i> Redraw', onClick: l => { l.seed = newSeed(); } }] },
        ...commonDefs()
    ];
}

function shapeDefaults(kind) {
    if (STROKE_SHAPES.includes(kind)) {
        return { fillOn: false, strokeW: 12 };
    }

    if (kind === 'sparkle' || kind === 'burst' || kind === 'arrow') {
        return { fillOn: true, strokeW: 0 };
    }

    return {};
}

function stickerDefs() {
    return [
        { type: 'buttons', buttons: [{ label: '<i class="bi bi-arrow-left-right"></i> Change…', onClick: () => openPicker('replace') }] },
        { key: 'size', label: 'Size', type: 'range', min: 16, max: 600, step: 1, format: pxf },
        { key: 'color', label: 'Colour', type: 'color', show: l => l.kind === 'icon' },
        { key: 'outline', label: 'Die-cut edge', type: 'range', min: 0, max: 0.15, step: 0.005, reset: 0, format: pct },
        { key: 'outlineColor', label: 'Edge colour', type: 'color', show: l => l.outline > 0 },
        { key: 'shadow', label: 'Shadow', type: 'range', min: 0, max: 0.5, step: 0.01, reset: 0, format: pct },
        { key: 'badge', label: 'Badge', type: 'seg', options: [['none', 'None'], ['circle', '<i class="bi bi-circle-fill"></i>'], ['square', '<i class="bi bi-square-fill"></i>']] },
        { key: 'badgeColor', label: 'Badge colour', type: 'color', show: l => l.badge !== 'none' },
        { key: 'badgePad', label: 'Badge size', type: 'range', min: 0, max: 0.8, step: 0.02, format: pct, show: l => l.badge !== 'none' },
        ...commonDefs()
    ];
}

function onLayerChange(def) {
    const l = selected();

    if (def.key === 'look.preset' || def.key?.startsWith('look')) {
        requestRender();
    }

    if (l && def.key === 'look.preset' && l.look.preset !== 'none' && l.look.strength === 0) {
        l.look.strength = 1;
    }

    commit();
}

function renderProps() {
    const host = $('props');
    host.innerHTML = '';
    fieldRefreshers = fieldRefreshers.filter(fn => fn.persistent);
    const l = selected();

    if (!l) {
        const p = document.createElement('div');
        p.className = 'empty';
        p.textContent = 'Click a layer on the canvas or in the list to edit it.';
        host.append(p);
        return;
    }

    const sec = document.createElement('section');
    sec.className = 'section';
    const h = document.createElement('h3');
    h.textContent = { text: 'Text', image: 'Photo', shape: 'Graphic', sticker: l.kind === 'icon' ? 'Icon' : 'Emoji' }[l.type];
    sec.append(h);
    host.append(sec);
    const defs = { text: textDefs, image: imageDefs, shape: shapeDefs, sticker: stickerDefs }[l.type]();
    const refresh = buildFields(sec, defs, () => selected(), onLayerChange);
    fieldRefreshers.push(refresh);
}

function buildDocFields() {
    const bgDefs = [
        { key: 'type', label: 'Type', type: 'seg', options: [['gradient', 'Gradient'], ['solid', 'Solid']] },
        {
            type: 'tiles', options: BG_PRESETS.map(([a, b]) => ({ value: `${a},${b}`, label: '' })), className: 'tiles--bg', tileW: 60, tileH: 34,
            draw: (c, opt) => {
                const [a, b] = opt.value.split(',');
                const x = c.getContext('2d');
                const g = x.createLinearGradient(0, 0, c.width, c.height);
                g.addColorStop(0, a);
                g.addColorStop(1, b);
                x.fillStyle = g;
                x.fillRect(0, 0, c.width, c.height);
            },
            after: (bg, v) => {
                const [a, b] = v.split(',');
                Object.assign(bg, { color: a, color2: b, type: 'gradient' });
                syncProps();
            }
        },
        { key: 'color', label: 'Colour', type: 'color' },
        { key: 'color2', label: 'Colour 2', type: 'color', show: b => b.type === 'gradient' },
        { key: 'angle', label: 'Direction', type: 'range', min: 0, max: 360, step: 5, format: deg, show: b => b.type === 'gradient' }
    ];
    const r1 = buildFields($('bg-fields'), bgDefs, () => doc.bg, () => commit());
    r1.persistent = true;

    const finishDefs = [
        { key: 'grain', label: 'Grain', type: 'range', min: 0, max: 1, step: 0.01, reset: 0, format: pct },
        { key: 'grainSize', label: 'Grain size', type: 'range', min: 0.5, max: 4, step: 0.1, reset: 1.2, show: f => f.grain > 0 },
        { key: 'grainColor', label: 'Colour grain', type: 'check', show: f => f.grain > 0 },
        { key: 'vignette', label: 'Vignette', type: 'range', min: 0, max: 1, step: 0.01, reset: 0, format: pct },
        { key: 'leak', label: 'Light leak', type: 'range', min: 0, max: 1, step: 0.01, reset: 0, format: pct },
        { key: 'dust', label: 'Dust', type: 'range', min: 0, max: 1, step: 0.01, reset: 0, format: pct },
        {
            type: 'buttons', show: f => f.leak > 0 || f.dust > 0, buttons: [
                { label: '<i class="bi bi-shuffle"></i> New leak', onClick: f => { f.leakSeed = newSeed(); } },
                { label: '<i class="bi bi-shuffle"></i> New dust', onClick: f => { f.dustSeed = newSeed(); } }
            ]
        },
        { key: 'overText', label: 'Over text too', type: 'check' },
        { type: 'note', label: 'The finish sits right above the top photo, so text over it stays clean unless “over text too” is on.' }
    ];
    const r2 = buildFields($('finish-fields'), finishDefs, () => doc.finish, () => commit());
    r2.persistent = true;
    fieldRefreshers.push(r1, r2);
}

/* ---------------------------------------------------------------- layer list */

let dragLayerId = null;

function renderLayerList() {
    const list = $('layer-list');
    list.innerHTML = '';

    [...doc.layers].reverse().forEach(l => {
        const li = document.createElement('li');
        li.className = `layer${l.id === selectedId ? ' is-selected' : ''}${l.hidden ? ' is-hidden' : ''}`;
        li.dataset.id = l.id;
        li.draggable = true;

        const eye = document.createElement('button');
        eye.type = 'button';
        eye.className = 'icon-btn';
        eye.title = l.hidden ? 'Show' : 'Hide';
        eye.innerHTML = `<i class="bi ${l.hidden ? 'bi-eye-slash' : 'bi-eye'}"></i>`;
        eye.addEventListener('click', (e) => {
            e.stopPropagation();
            l.hidden = !l.hidden;
            commit({ immediate: true });
        });

        const thumb = document.createElement('span');
        thumb.className = 'layer-thumb';

        if (l.type === 'image' && images.get(l.imageId)) {
            thumb.style.backgroundImage = `url(${images.get(l.imageId).thumb})`;
        } else if (l.type === 'sticker') {
            thumb.innerHTML = l.kind === 'icon' ? `<i class="bi bi-${l.icon}"></i>` : `<span class="layer-emoji">${l.glyph}</span>`;
        } else {
            thumb.innerHTML = `<i class="bi ${l.type === 'text' ? 'bi-fonts' : 'bi-bezier2'}"></i>`;
        }

        const name = document.createElement('span');
        name.className = 'layer-name';
        name.textContent = layerName(l);

        const tools = document.createElement('span');
        tools.className = 'layer-tools';
        const lock = document.createElement('button');
        lock.type = 'button';
        lock.className = `icon-btn${l.locked ? ' is-on' : ''}`;
        lock.title = l.locked ? 'Unlock' : 'Lock (stops dragging on the canvas)';
        lock.innerHTML = `<i class="bi ${l.locked ? 'bi-lock-fill' : 'bi-unlock'}"></i>`;
        lock.addEventListener('click', (e) => {
            e.stopPropagation();
            l.locked = !l.locked;
            commit({ immediate: true });
        });
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'icon-btn';
        del.title = 'Delete';
        del.innerHTML = '<i class="bi bi-x-lg"></i>';
        del.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedId = l.id;
            deleteSelected();
        });
        tools.append(lock, del);

        li.append(eye, thumb, name, tools);
        li.addEventListener('click', () => {
            selectedId = l.id;
            renderProps();
            renderLayerList();
            requestRender(false);
        });
        li.addEventListener('mouseenter', () => {
            hoverId = l.id;
            requestRender(false);
        });
        li.addEventListener('mouseleave', () => {
            hoverId = null;
            requestRender(false);
        });
        li.addEventListener('dragstart', (e) => {
            dragLayerId = l.id;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/x-layer', l.id);
        });
        li.addEventListener('dragover', (e) => {
            if (!dragLayerId) {
                return;
            }

            e.preventDefault();
            const r = li.getBoundingClientRect();
            const above = e.clientY < r.top + r.height / 2;
            li.classList.toggle('is-drop-above', above);
            li.classList.toggle('is-drop-below', !above);
        });
        li.addEventListener('dragleave', () => li.classList.remove('is-drop-above', 'is-drop-below'));
        li.addEventListener('drop', (e) => {
            if (!dragLayerId) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            const above = li.classList.contains('is-drop-above');
            li.classList.remove('is-drop-above', 'is-drop-below');
            moveLayer(dragLayerId, l.id, above);
            dragLayerId = null;
        });
        li.addEventListener('dragend', () => {
            dragLayerId = null;
        });
        list.append(li);
    });
}

// The list shows the top layer first, so "above" in the list means later in doc.layers.
function moveLayer(id, targetId, above) {
    if (id === targetId) {
        return;
    }

    const from = doc.layers.findIndex(l => l.id === id);
    const [layer] = doc.layers.splice(from, 1);
    let to = doc.layers.findIndex(l => l.id === targetId);
    to = above ? to + 1 : to;
    doc.layers.splice(to, 0, layer);
    commit({ immediate: true });
}

function addText() {
    const l = makeText({ text: 'New text', size: 72, y: H / 2 });
    doc.layers.push(l);
    selectedId = l.id;
    renderProps();
    commit({ immediate: true });
}

function addLayer(l) {
    doc.layers.push(l);
    selectedId = l.id;
    renderProps();
    commit({ immediate: true });
}

/* Sticker picker: emoji, icons and graphics. "replace" swaps the selected sticker's glyph. */

let pickerMode = 'add';
let pickerTab = 'emoji';

function openPicker(mode = 'add') {
    pickerMode = mode;
    const l = selected();

    if (mode === 'replace' && l?.type === 'sticker') {
        pickerTab = l.kind === 'icon' ? 'icons' : 'emoji';
    }

    $('picker-search').value = '';
    renderPicker();
    $('picker').showModal();
    $('picker-search').focus();
}

function pickSticker(over) {
    $('picker').close();
    const l = selected();

    if (pickerMode === 'replace' && l?.type === 'sticker') {
        Object.assign(l, over);
        renderProps();
        commit({ immediate: true });
        return;
    }

    addLayer(makeSticker({ ...over, x: W / 2 + (Math.random() - 0.5) * 200, y: H / 2 + (Math.random() - 0.5) * 120 }));
}

async function addArt(src, name) {
    $('picker').close();

    try {
        const blob = await fetch(src).then(r => {
            if (!r.ok) {
                throw new Error(r.status);
            }

            return r.blob();
        });
        const id = uid();
        await registerImage(id, blob, name);
        DB.put('files', id, blob).catch(() => {});
        const img = images.get(id);
        const s = 300 / Math.max(img.w, img.h);
        addLayer(makeImage({ imageId: id, name, w: img.w * s, h: img.h * s, shadow: 24, graphic: true }));
    } catch {
        setStatus(`Could not load ${name}`, true);
    }
}

function renderPicker() {
    document.querySelectorAll('[data-picker-tab]').forEach(b => b.classList.toggle('is-on', b.dataset.pickerTab === pickerTab));
    const grid = $('picker-grid');
    grid.innerHTML = '';
    grid.className = `picker-grid picker-grid--${pickerTab}`;
    const replacing = pickerMode === 'replace';

    const heading = (text) => {
        const h = document.createElement('h4');
        h.className = 'picker-group';
        h.textContent = text;
        grid.append(h);
    };

    // Search: every word must appear in the item's words, its group's title or group words.
    const words = ($('picker-search').value || '').toLowerCase().split(/\s+/).filter(Boolean);
    const hit = (...texts) => {
        const hay = texts.join(' ').toLowerCase();
        return words.every(w => hay.includes(w));
    };
    const groupOf = (group, test) => {
        const items = group.i.filter(test);
        return items;
    };

    if (pickerTab === 'emoji') {
        EMOJI.forEach(group => {
            const items = groupOf(group, e => hit(e, EMOJI_WORDS.get(e) || '', group.t, group.k || ''));

            if (!items.length) {
                return;
            }

            heading(group.t);
            items.forEach(e => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'pick';
                b.textContent = e;
                b.addEventListener('click', () => pickSticker({ kind: 'emoji', glyph: e, icon: '' }));
                grid.append(b);
            });
        });
    } else if (pickerTab === 'icons') {
        ICONS.forEach(group => {
            const items = groupOf(group, name => hit(name.replace(/-/g, ' '), group.t, group.k || ''));

            if (!items.length) {
                return;
            }

            heading(group.t);
            items.forEach(name => {
                const ch = iconChar(name);

                if (!ch) {
                    return;
                }

                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'pick';
                b.title = name;
                b.innerHTML = `<i class="bi bi-${name}"></i>`;
                b.addEventListener('click', () => pickSticker({ kind: 'icon', glyph: ch, icon: name, ...(replacing ? {} : { size: 130 }) }));
                grid.append(b);
            });
        });
    } else {
        const shapes = GRAPHIC_SHAPES.filter(([kind, label]) => hit(kind, label, 'drawn мальоване стрілка коло обвести галочка хрестик'));

        if (shapes.length) {
            heading('Drawn');
        }

        shapes.forEach(([kind, label]) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'pick pick--graphic';
            b.title = label;
            const c = canvasOf(120, 84);
            const x = c.getContext('2d');
            const demo = makeShape({ shape: kind, ...shapeDefaults(kind), x: 60, y: 42, w: 78, h: 50, seed: 11, strokeW: 6, stroke: '#f5a500', fill: '#f5a500' });
            drawLayer(x, demo, 1);
            b.append(c);
            b.addEventListener('click', () => {
                $('picker').close();
                const w = kind === 'underline' ? 420 : kind === 'curved' ? 260 : kind === 'sparkle' || kind === 'burst' ? 200 : 360;
                const h = kind === 'underline' ? 70 : kind === 'curved' ? 200 : kind === 'sparkle' || kind === 'burst' ? 200 : 220;
                addLayer(makeShape({ shape: kind, ...shapeDefaults(kind), w, h }));
            });
            grid.append(b);
        });
        PICTURES.forEach(group => {
            const items = groupOf(group, name => hit(name.replace(/-/g, ' '), group.t, group.k || ''));

            if (!items.length) {
                return;
            }

            heading(group.t);
            items.forEach(name => {
                const src = `${group.dir}/${name}.webp`;
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'pick pick--graphic';
                b.title = name.replace(/-/g, ' ');
                b.innerHTML = `<img src="${src}" alt="${b.title}" loading="lazy" />`;
                b.addEventListener('click', () => addArt(src, name));
                grid.append(b);
            });
        });
    }

    if (!grid.children.length) {
        const p = document.createElement('p');
        p.className = 'picker-empty';
        p.textContent = 'Nothing found. Try another word, or another tab.';
        grid.append(p);
    }
}

function duplicateSelected() {
    const l = selected();

    if (!l) {
        return;
    }

    const copy = { ...JSON.parse(JSON.stringify(l)), id: uid(), x: l.x + 24, y: l.y + 24 };
    doc.layers.splice(doc.layers.indexOf(l) + 1, 0, copy);
    selectedId = copy.id;
    renderProps();
    commit({ immediate: true });
}

function deleteSelected() {
    const l = selected();

    if (!l) {
        return;
    }

    doc.layers = doc.layers.filter(x => x !== l);
    selectedId = null;
    renderProps();
    commit({ immediate: true });
}

/* ---------------------------------------------------------------- export */

function setStatus(text, error = false) {
    const s = $('status');
    s.textContent = text;
    s.classList.toggle('is-error', error);
}

function toBlob(c, type, quality) {
    return new Promise(resolve => c.toBlob(resolve, type, quality));
}

async function exportImage() {
    const w = Number($('export-size').value);
    const h = Math.round((w * 9) / 16);
    const format = $('export-format').value;
    setStatus('Rendering…');
    $('export').disabled = true;

    try {
        await document.fonts.ready;
        const c = canvasOf(w, h);
        renderDoc(c.getContext('2d'), w / W);
        let blob;

        if (format === 'png') {
            blob = await toBlob(c, 'image/png');
        } else if (format === 'webp') {
            blob = await toBlob(c, 'image/webp', 0.92);
        } else {
            // YouTube takes thumbnails up to 2 MB.
            for (const q of [0.95, 0.92, 0.88, 0.84, 0.78, 0.7, 0.6]) {
                blob = await toBlob(c, 'image/jpeg', q);

                if (blob.size < 2 * 1024 * 1024 - 20000) {
                    break;
                }
            }
        }

        const title = doc.layers.find(l => l.type === 'text')?.text || 'thumbnail';
        const slug = title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40) || 'thumbnail';
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${slug}.${format === 'jpeg' ? 'jpg' : format}`;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        setStatus(`${w} × ${h} · ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (err) {
        setStatus(`Export failed: ${err.message}`, true);
    } finally {
        $('export').disabled = false;
        // The export rendered big copies; let the preview rebuild its own.
        procCache.clear();
        textCache.clear();
        requestRender();
    }
}

/* ---------------------------------------------------------------- wiring */

$('file-input').addEventListener('change', (e) => {
    addImageFiles(e.target.files);
    e.target.value = '';
});
$('add-text').addEventListener('click', addText);
document.querySelectorAll('[data-open-picker]').forEach(b => b.addEventListener('click', () => {
    pickerTab = b.dataset.openPicker;
    openPicker('add');
}));
document.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
document.querySelectorAll('[data-picker-tab]').forEach(b => b.addEventListener('click', () => {
    pickerTab = b.dataset.pickerTab;
    renderPicker();
}));
$('picker-close').addEventListener('click', () => $('picker').close());
$('picker-search').addEventListener('input', () => renderPicker());
$('picker').addEventListener('click', (e) => {
    if (e.target === $('picker')) {
        $('picker').close();
    }
});
$('undo').addEventListener('click', () => undo(-1));
$('redo').addEventListener('click', () => undo(1));
$('show-badge').addEventListener('change', () => requestRender(false));
$('export').addEventListener('click', exportImage);

let newArmed = 0;
$('new-doc').addEventListener('click', () => {
    const b = $('new-doc');

    if (!newArmed) {
        b.classList.add('is-armed');
        b.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Click again to clear';
        newArmed = setTimeout(() => {
            newArmed = 0;
            b.classList.remove('is-armed');
            b.innerHTML = '<i class="bi bi-file-earmark"></i> New';
        }, 3000);
        return;
    }

    clearTimeout(newArmed);
    newArmed = 0;
    b.classList.remove('is-armed');
    b.innerHTML = '<i class="bi bi-file-earmark"></i> New';
    const keepLuts = doc.luts;
    doc = newDoc();
    doc.luts = keepLuts;
    selectedId = null;
    clearCaches();
    renderAll();
    commit({ immediate: true });
});

$('lut-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';

    if (!file) {
        return;
    }

    try {
        const text = await file.text();
        const id = `lut-${uid()}`;
        const cube = parseCube(text, file.name.replace(/\.cube$/i, ''));
        cube.id = id;
        luts.set(id, cube);
        doc.luts.push({ id, name: cube.name });
        DB.put('files', id, text).catch(() => {});
        const l = selected();

        if (l && l.type === 'image') {
            l.look.lut = id;
            l.look.lutAmount = 1;
        }

        syncProps();
        commit({ immediate: true });
        setStatus(`LUT “${cube.name}” loaded (${cube.size}³)`);
    } catch (err) {
        setStatus(`LUT: ${err.message}`, true);
    }
});

function isTyping(e) {
    const t = e.target;
    return t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
}

document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;

    if (mod && e.key.toLowerCase() === 'z' && !isTyping(e)) {
        e.preventDefault();
        undo(e.shiftKey ? 1 : -1);
        return;
    }

    if (isTyping(e)) {
        return;
    }

    const l = selected();

    if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelected();
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && l) {
        e.preventDefault();
        deleteSelected();
    } else if (!mod && !e.altKey && e.key.toLowerCase() === 't') {
        addText();
    } else if (!mod && !e.altKey && ['v', 'a', 'o', 'b'].includes(e.key.toLowerCase())) {
        setTool({ v: 'select', a: 'arrow', o: 'circle', b: 'box' }[e.key.toLowerCase()]);
    } else if (e.key === 'Escape' && tool !== 'select') {
        setTool('select');
    } else if (e.key === 'Escape' && l) {
        selectedId = null;
        renderProps();
        renderLayerList();
        requestRender(false);
    } else if (l && !l.locked && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        l.x += e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        l.y += e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        commit();
    }
});

// Pasting: image data, an image file, or a link / <img> pointing at an image.
async function fileFromUrl(url) {
    if (!/^(https?:|data:image\/)/i.test(url)) {
        return null;
    }

    try {
        const blob = await fetch(url).then(r => r.blob());

        if (!blob.type.startsWith('image/')) {
            return null;
        }

        const name = url.startsWith('data:') ? 'pasted' : decodeURIComponent(url.split('/').pop().split('?')[0]) || 'pasted';
        return new File([blob], name, { type: blob.type });
    } catch {
        return null;
    }
}

function imageUrlIn(html, text) {
    const m = html && html.match(/<img[^>]+src=["']([^"']+)["']/i);

    if (m) {
        return m[1].replace(/&amp;/g, '&');
    }

    const t = (text || '').trim();
    return /^(https?:\/\/\S+|data:image\/\S+)$/i.test(t) ? t : '';
}

async function addFromUrl(url) {
    const file = await fileFromUrl(url);

    if (file) {
        await addImageFiles([file]);
        setStatus('Pasted a photo');
    } else {
        setStatus('Couldn’t load that image (the site may not allow it). Copy the image itself, or save and drop it.', true);
    }
}

document.addEventListener('paste', (e) => {
    if (isTyping(e)) {
        return;
    }

    const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));

    if (files.length) {
        e.preventDefault();
        addImageFiles(files).then(() => setStatus(`Pasted ${files.length > 1 ? `${files.length} photos` : 'a photo'}`));
        return;
    }

    const url = imageUrlIn(e.clipboardData?.getData('text/html'), e.clipboardData?.getData('text/plain'));

    if (url) {
        e.preventDefault();
        addFromUrl(url);
    }
});

// The Paste button: reads the clipboard directly (the browser may ask once).
async function pasteButton() {
    if (!navigator.clipboard?.read) {
        setStatus('Press ⌘V (Ctrl+V) to paste a photo', true);
        return;
    }

    try {
        const items = await navigator.clipboard.read();
        const files = [];
        let url = '';

        for (const item of items) {
            const type = item.types.find(t => t.startsWith('image/'));

            if (type) {
                const blob = await item.getType(type);
                files.push(new File([blob], `pasted.${type.split('/')[1]}`, { type }));
            } else if (!url) {
                const html = item.types.includes('text/html') ? await (await item.getType('text/html')).text() : '';
                const text = item.types.includes('text/plain') ? await (await item.getType('text/plain')).text() : '';
                url = imageUrlIn(html, text);
            }
        }

        if (files.length) {
            await addImageFiles(files);
            setStatus('Pasted a photo');
        } else if (url) {
            await addFromUrl(url);
        } else {
            setStatus('No image in the clipboard', true);
        }
    } catch {
        setStatus('The browser blocked the clipboard here. Press ⌘V (Ctrl+V) instead.', true);
    }
}

$('paste-photo').addEventListener('click', pasteButton);

let dragDepth = 0;
const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
document.addEventListener('dragenter', (e) => {
    if (hasFiles(e)) {
        dragDepth++;
        $('drop-hint').hidden = false;
    }
});
document.addEventListener('dragleave', (e) => {
    if (hasFiles(e) && --dragDepth <= 0) {
        dragDepth = 0;
        $('drop-hint').hidden = true;
    }
});
document.addEventListener('dragover', (e) => {
    if (hasFiles(e)) {
        e.preventDefault();
    }
});
document.addEventListener('drop', (e) => {
    if (!hasFiles(e)) {
        return;
    }

    e.preventDefault();
    dragDepth = 0;
    $('drop-hint').hidden = true;
    addImageFiles(e.dataTransfer.files);
});

window.addEventListener('resize', layoutCanvas);
new ResizeObserver(layoutCanvas).observe($('viewport'));

function renderAll() {
    renderProps();
    renderLayerList();
    syncProps();
    requestRender();
}

async function init() {
    buildDocFields();

    try {
        const saved = await DB.get('meta', 'doc');

        if (saved) {
            const parsed = JSON.parse(saved);
            const fresh = newDoc();
            doc = { ...fresh, ...parsed, bg: { ...fresh.bg, ...parsed.bg }, finish: { ...fresh.finish, ...parsed.finish }, luts: parsed.luts || [] };
            doc.layers.forEach(l => {
                if (l.type === 'image') {
                    l.look = { ...LOOK_DEFAULT, ...l.look };
                }
            });
        }

        const used = new Set(doc.layers.filter(l => l.type === 'image').map(l => l.imageId));
        const keys = await DB.keys('files');

        for (const key of keys) {
            if (String(key).startsWith('lut-')) {
                if (doc.luts.some(x => x.id === key)) {
                    try {
                        const cube = parseCube(await DB.get('files', key), '');
                        cube.id = key;
                        luts.set(key, cube);
                    } catch {
                        // An unreadable LUT is simply skipped.
                    }
                }
            } else if (used.has(key)) {
                try {
                    await registerImage(key, await DB.get('files', key), '');
                } catch {
                    // Missing photo: the layer shows a placeholder.
                }
            } else {
                // Photos no layer uses any more.
                DB.del('files', key).catch(() => {});
            }
        }
    } catch {
        // No storage (private window): start fresh.
    }

    doc.layers.filter(l => l.type === 'text').forEach(l => ensureFont(l.font));
    // Load every font once, so preset tiles and the font list draw in their real faces.
    Promise.all(FONTS.map(f => document.fonts.load(fontSpec(f), 'AaЖж').catch(() => []))).then(() => {
        FONTS.forEach(f => fontsRequested.add(f.id));
        fontsVersion++;
        textCache.clear();
        requestRender();

        if (!$('props').contains(document.activeElement)) {
            renderProps();
        }
    });
    snapshot();
    layoutCanvas();
    renderAll();
}

init();
