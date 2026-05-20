// Ptolemaic Astrology — full-screen standalone app.
// Exported: buildAstrologyApp(model) → { show, hide }
//
// Four tabs: Chart · Profiles · Transits · Synastry
// Planet interpretations are keyword-only placeholders.
// ⚠️  TODO: Ask Kat for full interpretation content before publishing.

import {
  buildNatalChart,
  ZODIAC_SYMBOLS, PLANET_SYMBOLS,
  lonToZodiac, computeAscendant,
} from '../core/astrology.js';
import { computePlacidusHouses, computeWholeSignHouses, wholeSignHouseOf, obliquity } from '../core/houses.js';
import { renderZodiacWheel } from './zodiacWheelTab.js';
import { computeAspects, computeCrossAspects, ASPECT_DEFS } from '../core/aspects.js';
import { greenwichSiderealDeg } from '../core/ephemeris.js';
import {
  getPlanetDignity, getAccidentalDignity, getFullDignity,
  PLANET_NATURE, HOUSE_MEANINGS, dignityColor,
  DOMICILE, moietyOrb,
} from '../core/dignities.js';
import { solarPhase } from '../core/solarPhase.js';
import { computeLots, lordNameOfLon } from '../core/lots.js';
import { selectApheta, findAnaretae, primaryDirections } from '../core/lifespan.js';
import {
  upcomingEclipses, detectGreatConjunctions, cardinalIngresses,
  weatherFromChart,
} from '../core/mundane.js';
import {
  FIXED_STARS as STAR_CATALOG,
  fixedStarsAt, starPlanetConjunctions, starPlanetWholeSignAspects, precessedLon,
} from '../core/fixedStars.js';
import { solarReturnDate } from '../core/solarReturn.js';
import { heliacalPhase, PHASE_LABEL, PHASE_GLYPH } from '../core/heliacal.js';
import { buildNatalReport } from '../core/natalReport.js';
import { buildNatalChart as buildNatalChartV2 } from '../core/natalChartBuilder.js';
import { renderChartWheelSvg } from './chartWheelSvg.js';
import {
  migrateLegacyProfiles, loadAllCharts, saveChart, deleteChart,
  setPrimaryChart, getPrimaryChart, recordToLegacy, legacyToRecord,
} from '../core/chartStore.js';
import { compatibility as classicalCompatibility } from '../core/synastry.js';
import { maybeRunAstrologyOnboarding } from './astrologyOnboarding.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const R = Math.PI / 180;
const PROFILES_KEY = 'ptol-astro-profiles';

// ─── Ptolemaic Interpretations ────────────────────────────────────────────────
// Drawn from Tetrabiblos Books I–IV (Ashmand trans., 1822).
// Each entry combines: the planet's elemental nature (Book I Ch. IV),
// the sign's elemental quality (Ch. X–XII), dignity state (Ch. XX–XXII),
// and what Ptolemy says the planet produces in the soul (Book III Ch. XVIII).
const PTOLEMY_INTERP = {
  sun: {
    aries:       'The Sun enters its Exaltation in Aries, where Ptolemy\'s "greater degree of heat" finds its clearest expression in the world. You are built to lead by going first — your will is cleanest when it charges ahead without apology. Bold action is your native language; the work is learning when to pause long enough to let others catch up.',
    taurus:      'Where the solar force meets Taurus\'s cold, earthy gravity, willpower settles into something that lasts. You don\'t need to announce yourself — you build, and the work speaks. Your greatest asset is the patience to see things through when everyone else has already moved on.',
    gemini:      'Mercury\'s bright, airy sign quickens the solar principle into a nimble, curious force. You think fast and communicate faster; your will finds its highest expression through ideas, conversation, and the pleasure of being perpetually interesting. The restlessness is a feature, not a flaw.',
    cancer:      'At the summer tropic the Sun\'s warmth turns inward even at its peak — you carry great warmth, yet reveal it selectively. Your solar force flows through feeling, memory, and the fierce instinct to protect what you love. Authority comes naturally to you when you trust your instincts rather than perform your confidence.',
    leo:         'In Leo, its own domicile, Ptolemy writes that the Sun "approaches nearer than the other signs to the zenith" and "causes warmth and heat." This is your sun at full power — you radiate, you draw people in, and rooms feel different when you enter. The challenge is learning that your light does not diminish anyone else\'s.',
    virgo:       'Mercury\'s precise, earthy sign channels your solar force through devotion to the craft. You don\'t shine by commanding attention — you shine by being irreplaceable, by noticing what others miss and fixing it before anyone asks. Excellence is your highest form of self-expression.',
    libra:       'The Sun falls in Libra, the autumnal equinox where its heating nature begins its annual decline and Saturn is exalted in opposition. You see every side, which is both your gift and your perpetual struggle with decisive action. Your real power lives in your ability to bring people together — claim it rather than defer to it.',
    scorpius:'In the nocturnal house of Mars, your solar will moves underground — strategic, patient, and formidable. You rarely show your hand until the moment you choose to, and that moment is always calculated. Your intensity is unmistakable even when you say nothing; the question is what you do with that quiet, extraordinary power.',
    sagittarius: 'Jupiter\'s fire receives the Sun with great elemental sympathy. You are built for big ideas, long horizons, and the particular joy of learning something that changes how you see everything. Your optimism is genuinely contagious; your frankness occasionally bruises, but it is always honest.',
    capricornus:'Saturn\'s cold, contracting earth is not comfortable for solar warmth — this is a Sun that earns its authority the hard way, through discipline and patient achievement. You are not impressed by shortcuts. What you build, you intend to keep; your ambitions are serious, and you take yourself seriously in the best possible sense.',
    aquarius:    'The Sun is in its Detriment in Aquarius — Saturn\'s wintry airy house, opposite Leo. You resist the idea of being ordinary with every fibre, and that resistance can make it harder to simply be yourself. Your deepest sense of self often emerges through a cause larger than you, which is both your gift and your way of keeping a certain distance from the centre.',
    pisces:      'Jupiter\'s mutable waters diffuse your solar light through a compassionate, imaginative medium. Your sense of self is porous in the best possible way — you absorb and reflect the world around you with unusual depth and empathy. The practice is distinguishing your own will from the feelings of everyone in the room.',
  },
  moon: {
    aries:       'The Moon\'s cold, moist sensitivity collides with Mars\'s hot, dry fire — your emotions arrive fast and loud. Ptolemy notes the Moon governs "animal bodies by relaxation and putrefaction" — yours is particularly alive to stimulus, which means your instincts are often right, but your reactions can startle people who haven\'t learned to keep up.',
    taurus:      'The Moon reaches her Exaltation in Taurus, her first earth triplicity. Emotionally, you are a fixed point of warmth and reliability — people feel safe around you because you genuinely are safe. Your security comes from sensory reality: good food, physical comfort, the pleasure of things that last and people who stay.',
    gemini:      'Mercury\'s airy sign quickens lunar feeling into mental movement — you process emotion by talking it through, circling it, understanding it until it makes sense. Your moods shift like weather and you need variety the way others need stability. Intelligence is one of the primary ways you feel at home in the world.',
    cancer:      'In her own domicile, Ptolemy writes that "things animate and inanimate sympathize and vary" with the Moon — and so it is with you. You feel everything, often before you can name it, and the people around you register that attunement as something close to magic. The work is learning whose feelings are actually yours.',
    leo:         'The Moon\'s private, nocturnal nature is pulled into Leo\'s desire to be seen. Your inner world is vivid and expressive, and you need people to notice and appreciate what you feel — not from vanity, but from the genuine need to matter to the people you love. Emotional security comes through recognition, and there\'s nothing wrong with that.',
    virgo:       'Mercury\'s discriminating earth sign channels your emotional life through order and usefulness. You care through doing — through making things right, anticipating needs, and fixing what\'s broken before anyone had to ask. The self-criticism that comes with this Moon is real; try to extend the same devoted care to yourself that you offer so readily to others.',
    libra:       'Venus\'s airy, moist sign creates an emotional life oriented around harmony and mutual beauty. You are a natural diplomat of feeling — you smooth things over, seek fairness, and need balance to feel genuinely safe. Conflict is painful for you; learning to tolerate the discomfort of it briefly is always worth the peace you reach on the other side.',
    scorpius:'The Moon falls in Scorpius— opposite her Taurus exaltation. You feel at the deepest register, and nothing is casual, nothing is surface. The intensity of your emotional life is your greatest power and your most demanding companion. You need to go all the way in; half-measures leave you cold in a way that is difficult to explain to people who feel more lightly.',
    sagittarius: 'Jupiter\'s fire warms your lunar moisture into an emotional life that loves freedom above comfort. Security means room to expand — to travel, to believe, to keep learning. Your optimism is a form of emotional resilience; you can find the horizon even in dark weather, and people around you draw on that instinctively.',
    capricornus:'The Moon is in her Detriment in Capricornus — Saturn\'s contracting cold is opposite Cancer\'s nurturing warmth. You learned early to manage your feelings rather than feel them freely, and you may confuse achievement with emotional security. What you\'ve built is real. So are the feelings you sometimes keep behind the wall.',
    aquarius:    'Saturn\'s airy sign rationalises your emotional life into principle. You connect deeply through ideas and shared values — the right conversation can feel more intimate than physical closeness. Emotional intimacy sometimes arrives from a careful distance; that\'s not coldness, it\'s the particular shape of your warmth.',
    pisces:      'Jupiter\'s mutable waters fully harmonise with the Moon\'s cold, moist nature. Your empathy is extraordinary and your intuition is rarely wrong — you pick up on things people haven\'t said aloud, sometimes things they haven\'t admitted to themselves. The practice is maintaining your own emotional centre in a world you feel so completely.',
  },
  mercury: {
    aries:       'Mars\'s fire sharpens Ptolemy\'s "faculty of perception" into something that cuts. You decide fast, speak direct, and don\'t much like hearing yourself go in circles. The speed is a genuine asset; the impatience is the thing to watch — not every idea needs to be finished before the next one begins.',
    taurus:      'Taurus\'s earthy cold slows Mercury\'s quick current into something deliberately built. You form opinions slowly and defend them with admirable stubbornness; your understanding goes down like roots. The limitation is flexibility — once you\'ve thought something through, rethinking it feels like unnecessary work, and sometimes it actually is.',
    gemini:      'In its own domicile, Mercury is entirely in its element — quick, curious, perpetually alive to the next connection. Ptolemy notes Mercury is "at no time far distant in longitude" from the Sun, always close to the light of understanding. You collect ideas the way others collect experiences, and your mind is genuinely one of your most pleasurable possessions.',
    cancer:      'The Moon\'s watery sign colours Mercury\'s logic with memory and feeling. You think in associations and images; your mind moves like water, finding its way around rather than through. The gift is emotional intelligence and a memory that keeps everything; the practice is separating what you think from what you feel.',
    leo:         'The Sun\'s fire amplifies your communicative power into something theatrical and confident. You speak with authority and expect to be heard — and you usually are. The mind is drawn to the grand, the creative, and the persuasive; you were born to make a case, and you know how to make people want to believe it.',
    virgo:       'Mercury occupies both its Domicile and Exaltation in Virgo, where Ptolemy writes "autumnal dryness makes its first appearance." This is Mercury at its most exact — your mind notices what others miss, organises what others lose track of, and solves what others give up on. The standard you hold your thinking to is genuinely high, and it shows.',
    libra:       'Venus\'s harmonising air gives your mind a diplomatic, elegantly balanced quality. You weigh before you speak; you argue fairly and make room for the other side. The social grace of this Mercury is real — and so is the paralysis that can arrive from seeing every perspective so clearly that commitment becomes difficult.',
    scorpius:'Mars\'s fixed water drives your mind to depth rather than breadth. You research, probe, and don\'t accept the surface explanation when there\'s clearly something underneath it. Your communication is strategic — you reveal what you choose, when you choose. People sense you know more than you\'re saying, and they\'re usually right.',
    sagittarius: 'Jupiter\'s fire gives your mind a philosophical appetite and a fondness for blunt honesty. You think in large patterns, love ideas that explain everything at once, and say exactly what you mean with minimal decoration. The breadth of this Mercury is magnificent; the precision is what to cultivate alongside it.',
    capricornus:'Saturn\'s cold, earthy discipline structures Mercury\'s quickness into measured, purposeful thought. You think before you speak, speak with authority, and mean what you say. Your communication is taken seriously because it is serious; the goal is always utility and result, and people learn quickly that you are worth listening to.',
    aquarius:    'Saturn\'s airy sign combines with Mercury\'s variability to produce ideas that don\'t quite look like anyone else\'s. You see systems, patterns, and futures that aren\'t obvious yet. The unconventionality is genuine — and so is the slight difficulty of explaining yourself to people who are still catching up to where your mind already went.',
    pisces:      'Mercury is in its Fall in Pisces — Virgo\'s precision dissolves in the mutable waters opposite. Your mind works through image, intuition, and feeling rather than analysis and argument. The gift is creative and empathic thinking of unusual depth; the practice is holding a line of reasoning when the waters beneath it keep shifting.',
  },
  venus: {
    aries:       'Mars\'s fire makes your Venus bold and direct in love — you pursue what you want and you know immediately what that is. Ptolemy\'s "fertilizing breezes" need time to ripen fully in the cardinal fire, and so does your patience in relationships; the attraction is fast, the art of sustaining it is what you\'re here to learn.',
    taurus:      'In her own domicile, Venus\'s warm, moist nature blossoms in the fertile earth sign. You love beauty, loyalty, and the deep pleasure of things that last. This is Venus at her most tangible — you give generously with your time and presence, and you need the same quality of steadiness returned to you.',
    gemini:      'Mercury\'s airy sign gives your Venus a lively, verbal, endlessly curious quality. You fall for minds as much as faces; love is a conversation that never quite gets boring. You keep affections light enough to breathe and bright enough to hold attention — yours as much as theirs.',
    cancer:      'The Moon\'s watery sign deepens Venus\'s sympathy into something homebound and fiercely tender. You love with protective warmth, and your instinct is to build a safe world for the people you care about. Being loved means being taken care of, and offering that care in return feels like the most natural thing in the world.',
    leo:         'The Sun\'s fire amplifies your Venus into generous, theatrical romance. You love with your whole heart and want that love celebrated — grand gestures, warmth given openly, the particular joy of being chosen visibly. Your heart is genuinely open-handed; you deserve someone whose warmth matches yours.',
    virgo:       'Venus is in its Fall in Virgo — opposite her Pisces exaltation. You show love through service rather than sentiment, and you may be more comfortable doing something genuinely helpful than saying something beautiful. The perfectionism can make love feel like something to get right; sometimes it just needs to be felt, not perfected.',
    libra:       'In its second domicile, Ptolemy writes that Venus\'s Libra house is preserved "by the sextile distance." You are naturally gracious, aesthetically gifted, and most fully yourself in partnership. Love is where you find your balance — you flourish alongside someone rather than alone, and you know instinctively how to make a relationship beautiful.',
    scorpius:'Mars\'s fixed, watery sign gives your Venus an intensity that nothing half-hearted can satisfy. You love all the way in or not at all; the bonds you form are transformative by nature. The depth is your greatest gift in love, and it is also your greatest vulnerability — which is precisely what makes it worth it.',
    sagittarius: 'Jupiter\'s expansive fire gives your Venus a generous, freedom-loving quality. You love with open hands, philosophical warmth, and a genuine desire for your partner to grow alongside you. The relationship needs to be a horizon, not a cage; you bring the same expansiveness you need, which is the perfect place to start.',
    capricornus:'Saturn\'s cold, dry domicile restrains your Venus into love that is loyal, long-term, and deliberately offered. You don\'t fall easily, but when you do, you stay. Love is shown through reliability and investment rather than performance; it ripens slowly here and lasts longer than most.',
    aquarius:    'Saturn\'s airy detachment gives your Venus a warmly unconventional quality — you form bonds through ideas and shared ideals, and you may need a certain intellectual distance to feel genuinely safe. Your love is real even when it feels unusual; you care most in the largest possible way.',
    pisces:      'Venus is Exalted in Pisces. Ptolemy writes that she "derives an augmentation of her own proper influence" when here — a moist, compassionate nature meeting its deepest resonance. You love with boundless, self-sacrificing empathy; the capacity for beauty and feeling in this Venus is extraordinary. The practice is learning to receive as openly as you give.',
  },
  mars: {
    aries:       'In its own domicile, Ptolemy writes that Mars "chiefly causes dryness, and is also strongly heating, by means of his own fiery nature." You are initiative itself — the first to move, the last to back down. The sheer force of this Mars is formidable; directed, it achieves anything; unchecked, it can consume the very thing it was built to protect.',
    taurus:      'Taurus slows your Mars from a sprint into a siege — you don\'t strike fast, but you don\'t stop. Once you\'ve committed your energy to something, the patience becomes its own form of force. Anger here is rare and slow to surface, but when it finally breaks through, it has been building for a very long time.',
    gemini:      'Mercury\'s airy sign disperses your martian heat through the mind and the mouth. You fight with words, ideas, and the speed of your argument; your energy is mental and rarely at rest. The challenge is focus — so many fronts at once means some never receive the sustained effort they actually deserve.',
    cancer:      'Mars is in its Fall in Cancer, opposite Capricornus\'s exaltation. Your energy turns inward and defensive rather than outward and conquering — you act from feeling, protect fiercely, and anger arrives as a response to hurt rather than pure aggression. The strength here is emotional courage; the work is not turning that force against yourself.',
    leo:         'The Sun\'s fire and Mars\'s fire together produce a spectacular, courageous force. You act with pride and expect results commensurate with the effort, which is entirely reasonable given what you bring. The will to prevail is real and warranted; just watch whether pride is motivating the drive, or quietly complicating it.',
    virgo:       'Mercury\'s critical earth channels your Mars into precision and methodical mastery. You work with exceptional care; the energy is applied to getting things exactly right, not merely done. This Mars wins through competence rather than force — which is often far more durable in the long run.',
    libra:       'Mars is in its Detriment in Libra, opposite Aries. The desire for balance and the need for direct action pull against each other — you often hesitate where you should commit, or smooth over conflict that actually needs to be had. Your full power returns when you trust your instincts over your diplomatic impulse, and act before the moment passes.',
    scorpius:'In its second domicile, your Mars operates through strategic, inexhaustible depth. You don\'t show your hand — you plan, wait, and move when the moment is precisely right. Ptolemy\'s "hot, dry" force is here made patient and penetrating; nothing about your will is casual, and nothing about your commitment is ever truly finished.',
    capricornus:'Mars is Exalted in Capricornus. Ptolemy writes that "Mars possesses a fiery nature, which receives its greatest intensity in Capricornus." Saturn\'s structure gives your drive a direction and a timeline — this is ambition that builds rather than burns, that endures rather than erupts. The most powerful Mars in the zodiac, and the most formidable.',
    aquarius:    'Saturn\'s airy house gives your energy a collective, unconventional direction. You act through ideas, reform, and the dismantling of constraints that no longer serve. The cause matters more to you than the credit; you bring formidable Mars energy to whatever in the world actually needs changing.',
    pisces:      'Jupiter\'s mutable waters diffuse your Mars through compassionate, imaginative channels. You act from empathy and spiritual motivation rather than pure will, and the strength here is subtle and the direction can shift like the tide. The depth of care that drives you is absolutely real — the practice is finding the clean, committed edge of it.',
  },
  jupiter: {
    aries:       'Mars\'s fire energises Jupiter\'s beneficence into bold, pioneering generosity. You expand through initiative — you don\'t wait for permission to be great, and you tend to give other people that permission just by the way you operate. Your optimism has a directness to it that moves things.',
    taurus:      'The earthy stability of Taurus grounds Jupiter\'s warmth into tangible, productive abundance. You accumulate blessings steadily and share them generously; your growth is solid and lasting. The good fortune of this Jupiter arrives through patient building rather than sudden strokes, which makes it genuinely yours.',
    gemini:      'Jupiter is in its Detriment in Gemini, opposite Sagittarius. Your expansive beneficence disperses across too many ideas, conversations, and possibilities — the breadth is real but the depth sometimes isn\'t. The wisdom grows when you commit to following one thread all the way to its end before picking up the next.',
    cancer:      'Jupiter is Exalted in Cancer. Ptolemy writes that he "augments his peculiar influence when in Cancer." Your generosity flows through nurturing — you make people feel genuinely cared for, safe, and expanded simply by being around you. The wisdom here is emotional, protective, and deeply human in the best sense.',
    leo:         'The Sun\'s fire gives Jupiter\'s warm moisture a magnificent, generous quality — you do things grandly and you mean it completely. Your gifts arrive with celebration; your optimism is theatrical and infectious. At your best you are genuinely magnanimous, and you have the solar confidence to make it look entirely effortless.',
    virgo:       'Jupiter is in its Detriment in Virgo, opposite Pisces. The philosophical scope narrows to practicality; you help best through useful service rather than grand vision. The wisdom is hard-won and detailed; you are most generous when you can see exactly where the help will land and what it will actually build.',
    libra:       'Venus\'s airy sign gives your Jupiter an elegant, just, and socially gifted quality. You expand through beauty, diplomacy, and the relationships you carefully cultivate. The blessing of this Jupiter is the genuine ease you bring to social exchange — and the fairness you instinctively apply to every situation you touch.',
    scorpius:'Mars\'s fixed, watery depth transforms Jupiter\'s warm beneficence into penetrating wisdom. You understand things about people that they haven\'t told you, sometimes things they haven\'t admitted to themselves. The generosity here arrives through insight — you help by going all the way to the root of things.',
    sagittarius: 'In its own domicile, Ptolemy notes that Sagittarius is "airy and fruitful," perfectly suited to Jupiter\'s nature. You carry the broadest possible vision — philosophical, adventurous, and instinctively searching for what\'s sacred in the ordinary. This is Jupiter at full power, and you feel the freedom of that in everything you do.',
    capricornus:'Jupiter is in its Fall in Capricornus, opposite Cancer. Saturn\'s contraction limits the expansion; growth is slow, cautious, and genuinely hard-won. The wisdom is practical and durable; the faith is tested and therefore real. What you believe, you\'ve earned the right to believe through endurance rather than assumption.',
    aquarius:    'Saturn\'s airy sign gives your generosity a progressive, idealistic dimension. You expand through vision, collective action, and the advancement of ideas that could benefit everyone. The gift is the ability to care at scale — to see what could be and work toward it with sustained, committed conviction.',
    pisces:      'In its second domicile, Ptolemy notes Pisces is "airy and fruitful." Your Jupiter dissolves into compassionate spiritual wisdom — you sense the sacred everywhere, care without judgment, and expand through surrender as much as through achievement. This is a Jupiter that knows, with rare grace, when to let go.',
  },
  saturn: {
    aries:       'Saturn is in its Fall in Aries — opposite its Libra exaltation. The cold, contracting saturnine nature and Aries\'s hot, impulsive fire are at genuine odds — discipline tends to break when urgency strikes. The gift comes when you find patience within the impulse, and build something from that tension rather than losing both.',
    taurus:      'Taurus\'s earthy cold is sympathetic to Saturn\'s nature — steady, patient, and accumulative in the most productive sense. You build carefully and keep what you build; the saturnine discipline expressed here is productive rather than punishing. You find genuine meaning in the slow work and the lasting result.',
    gemini:      'Mercury\'s airy variability introduces intellectual seriousness into your Saturn. You are a careful, structured thinker who masters language rather than playing with it. The saturnine quality here is a disciplined mind — ideas are built, not browsed; understanding is earned, not assumed, and that shows in everything you say.',
    cancer:      'Saturn is in its Detriment in Cancer, opposite Capricornus. Saturn\'s cold, contracting nature is most uncomfortable in the Moon\'s nurturing, moist sign. You may have learned early to manage vulnerability rather than express it; the walls you build are both your protection and your isolation. The work is allowing the softness that Saturn here is suppressing.',
    leo:         'Saturn is in its Detriment in Leo, opposite Aquarius. The Sun\'s warm pride and Saturn\'s cold austerity are in constant negotiation — you feel the pull between humility and the need to shine, and often the former wins too completely and too early. The real task is accepting that you deserve recognition, not as an exception, but as a given.',
    virgo:       'Mercury\'s cold, analytical earth is highly congenial to Saturn\'s nature. You express the saturnine principle through impeccable attention to detail, critical self-mastery, and devotion to doing things exactly right. This is Saturn as productive perfectionism — exacting, useful, and quietly formidable in a way most people underestimate until they see the work.',
    libra:       'Saturn is Exalted in Libra. Ptolemy writes that Libra tempers Saturn\'s cold through its airy, harmonising quality — "the increase of heat must be attended by a diminution of cold." You are judicious, measured, and capable of real authority in matters of fairness and law. You take the long view of what is right, and that patience is its own form of power.',
    scorpius:'Mars\'s fixed, watery intensity combined with Saturn\'s cold endurance produces an unyielding, concentrated force. You absorb hardship without breaking; the determination runs deep and quiet. The saturnine melancholy is genuinely present here, and so is the extraordinary depth of what you are capable of building from it.',
    sagittarius: 'Jupiter\'s expansive fire gives Saturn\'s discipline a philosophical direction. Your worldview is seriously constructed and genuinely tested; what you believe, you believe because you\'ve examined it, doubted it, and returned to it anyway. What you understand about life, you\'ve understood the long way, and that makes it real.',
    capricornus:'In its own house, Saturn\'s cold, dry nature finds its fullest expression. Ptolemy assigns Capricornus to Saturn "in consideration of their cold and wintry nature." You achieve through relentless discipline, patient ambition, and the willing acceptance of limitation as the necessary price of mastery. The summit is real, and so is every step of the climb that got you there.',
    aquarius:    'In its second house, Saturn\'s intelligence operates through fixed air — innovation disciplined by structure, vision grounded by patience. You are a systematic thinker of ideas that reach beyond the individual; the reform you build is designed to last because you know that real change requires real architecture beneath it.',
    pisces:      'Jupiter\'s mutable, compassionate waters soften Saturn\'s cold, dry discipline through spiritual acceptance. You apply your discipline to the inner life — to practice, solitude, and the art of releasing what cannot be held. The surrender is not weakness; it is the particular and considerable strength that this placement of Saturn asks of you.',
  },
};

function getInterpretation(planetName, signName) {
  const pKey = planetName.toLowerCase();
  const sKey = signName.toLowerCase();
  return PTOLEMY_INTERP[pKey]?.[sKey] || null;
}

// ─── Profile storage ──────────────────────────────────────────────────────────

// Profile storage — IndexedDB-backed via chartStore.js, with a sync cache
// of legacy-shape records for existing call sites that can't await.
//
// On app init we run migrateLegacyProfiles() and then refreshProfilesCache().
// All write operations update both stores so a tab close before async flush
// doesn't lose data.
let _profilesCache = [];
let _profilesReady = false;

async function refreshProfilesCache() {
  try {
    const records = await loadAllCharts();
    _profilesCache = records
      .map(recordToLegacy)
      .filter(Boolean)
      .sort((a, b) => (b.created || 0) - (a.created || 0));
    _profilesReady = true;
  } catch (e) {
    console.warn('[chartStore] cache refresh failed, falling back to localStorage:', e);
    // Fallback to localStorage if IndexedDB is unavailable
    try { _profilesCache = JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]'); } catch { _profilesCache = []; }
    _profilesReady = true;
  }
}

function loadProfiles() {
  // Synchronous read from the cache. If the cache isn't warm yet (very
  // first call), seed it from localStorage so renderProfiles never sees
  // an empty list during the IndexedDB warmup.
  if (!_profilesReady) {
    try { _profilesCache = JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]'); } catch { _profilesCache = []; }
  }
  return _profilesCache.slice();
}

function saveProfiles(list) {
  // Mirror to localStorage for backward compat / fallback.
  localStorage.setItem(PROFILES_KEY, JSON.stringify(list));
}

function addProfile(p) {
  p.id = p.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  p.created = p.created || Date.now();
  _profilesCache = [p, ..._profilesCache.filter(x => x.id !== p.id)];
  saveProfiles(_profilesCache);
  // Fire-and-forget IndexedDB mirror
  saveChart(legacyToRecord(p)).catch(e => console.warn('[chartStore] saveChart:', e));
  return p;
}

function deleteProfile(id) {
  _profilesCache = _profilesCache.filter(p => p.id !== id);
  saveProfiles(_profilesCache);
  deleteChart(id).catch(e => console.warn('[chartStore] deleteChart:', e));
}

async function markProfilePrimary(id) {
  try {
    await setPrimaryChart(id);
    await refreshProfilesCache();
  } catch (e) {
    console.warn('[chartStore] setPrimary:', e);
  }
}

// ─── Chart computation ────────────────────────────────────────────────────────

function chartFromProfile(p, source = 'ibnshatir') {
  const [y, mo, d] = p.birthDate.split('-').map(Number);
  const [h, mi]    = (p.birthTime || '12:00').split(':').map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi, 0));
  return computeFullChart(date, +p.birthLat, +p.birthLon, source);
}

// Guide 07 — delegate to the master builder. Existing call sites pass
// (date, lat, lon, source); map onto the birthData shape the new builder
// expects. The returned object carries both the PART 20.10 structured tree
// and flat backward-compat fields, so legacy renderers still work.
function computeFullChart(date, lat, lon, source = 'ibnshatir') {
  const birthData = {
    name:   '',
    year:   date.getUTCFullYear(),
    month:  date.getUTCMonth() + 1,
    day:    date.getUTCDate(),
    hour:   date.getUTCHours(),
    minute: date.getUTCMinutes(),
    utcOffset:      0,       // input is already UTC
    latitude:       lat,
    longitude:      lon,
    locationName:   '',
    timezone:       'UTC',
    birthTimeKnown: true,
    source,
  };
  return buildNatalChartV2(birthData);
}

// ─── Canvas chart wheel renderer ─────────────────────────────────────────────

const ZODIAC_ELEM = [
  'fire','earth','air','water',
  'fire','earth','air','water',
  'fire','earth','air','water',
];

const PLANET_COLORS = {
  sun: '#ffd700', moon: '#c8c8f0', mercury: '#a0c080',
  venus: '#ffb0c8', mars: '#ff6644', jupiter: '#c8a060', saturn: '#a09060',
};

// ─── Element colours with gradients and glyph glows ─────────────────────────
const ELEM_COLORS = {
  fire:  { inner: 'rgba(130,35,22,0.9)',  outer: 'rgba(170,55,30,0.75)', glyph: '#ff9970' },
  earth: { inner: 'rgba(58,52,14,0.9)',   outer: 'rgba(88,75,22,0.75)',  glyph: '#c4e077' },
  air:   { inner: 'rgba(14,46,84,0.9)',   outer: 'rgba(24,65,118,0.75)', glyph: '#77ccff' },
  water: { inner: 'rgba(10,24,95,0.9)',   outer: 'rgba(14,34,126,0.75)', glyph: '#99aaff' },
};

// Roman numerals for house labels
const ROMAN_NUM = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
// Greek-warm planet colours
const PLANET_COLORS_GK = {
  sun: '#ffd060', moon: '#dcdcf0', mercury: '#a8d888',
  venus: '#ffb8cc', mars: '#ff7055', jupiter: '#d4b878', saturn: '#c4aa78',
};
// Greek serif font stack
const GK_FONT = "'Cinzel','Trajan Pro',Georgia,serif";

/**
 * Draw a full natal chart wheel onto `canvas` with Ancient Greek aesthetic.
 * `outerChart` (optional) draws a bi-wheel (synastry/transit outer ring).
 */
function drawChartWheel(canvas, chart, { outerChart = null, outerColor = '#88ccee', label = '' } = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;

  ctx.clearRect(0, 0, W, H);

  // ASC at 9-o'clock (left); toAngle decreases as ecliptic lon increases.
  const ascLon  = chart.ascLon || 0;
  const toXY    = (lon, r) => { const a = (180-(lon-ascLon))*R; return [cx+r*Math.cos(a), cy+r*Math.sin(a)]; };
  const toAngle = (lon) => (180-(lon-ascLon))*R;

  // ── Radii (outer deco ring + zodiac + house + inner) ─────────────────────
  const rDecoOut  = Math.min(cx, cy) - (outerChart ? 38 : 4);
  const rZodOuter = rDecoOut - 10;   // deco ring = 10px
  const rZodInner = rZodOuter - 38;  // zodiac ring = 38px
  const rHouseOut = rZodInner;
  const rHouseIn  = rZodInner - 22;
  const rInner    = rHouseIn - 5;

  // ── 0. Warm parchment-night background ────────────────────────────────────
  {
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rDecoOut);
    bg.addColorStop(0,    '#120e06');
    bg.addColorStop(0.65, '#0d0904');
    bg.addColorStop(1,    '#080500');
    ctx.beginPath();
    ctx.arc(cx, cy, rDecoOut, 0, Math.PI*2);
    ctx.fillStyle = bg;
    ctx.fill();
  }

  // ── 0b. Stars inside inner circle (warm, not blue) ────────────────────────
  {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rInner, 0, Math.PI*2);
    ctx.clip();
    let seed2 = 87654321;
    const rng2 = () => { seed2 = (seed2*1664525+1013904223)>>>0; return seed2/4294967296; };
    for (let i = 0; i < 130; i++) {
      const px = cx + (rng2()-0.5)*rInner*2;
      const py = cy + (rng2()-0.5)*rInner*2;
      ctx.beginPath();
      ctx.arc(px, py, rng2()*0.85+0.2, 0, Math.PI*2);
      ctx.fillStyle = `rgba(225,215,185,${(rng2()*0.35+0.08).toFixed(2)})`;
      ctx.fill();
    }
    ctx.restore();
  }

  // ── 1. Zodiac ring — Greek warm element palette ───────────────────────────
  // Arc direction: toAngle decreases as lon increases, so for sector i:
  //   aStart = toAngle((i+1)*30)  [smaller angle], aEnd = toAngle(i*30) [larger]
  //   ctx.arc(…, aStart, aEnd, false) = clockwise 30° arc ✓
  const ELEM_GK = {
    fire:  { inner:'rgba(110,40,14,0.92)', outer:'rgba(148,58,20,0.80)', glyph:'#ff9060' },
    earth: { inner:'rgba(76,60,16,0.92)',  outer:'rgba(102,80,26,0.80)', glyph:'#d8c458' },
    air:   { inner:'rgba(18,50,82,0.92)',  outer:'rgba(26,70,116,0.80)', glyph:'#60cce8' },
    water: { inner:'rgba(14,26,92,0.92)',  outer:'rgba(20,38,128,0.80)', glyph:'#8898ff' },
  };

  for (let i = 0; i < 12; i++) {
    const aStart = toAngle((i+1)*30);
    const aEnd   = toAngle(i*30);
    const col    = ELEM_GK[ZODIAC_ELEM[i]];
    const midA   = (aStart+aEnd)/2;

    // Clip to ring band
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rZodOuter, 0, Math.PI*2);
    ctx.arc(cx, cy, rZodInner, 0, Math.PI*2, true);
    ctx.clip();

    // Sector with linear gradient inner→outer
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, rZodOuter, aStart, aEnd, false);
    ctx.closePath();
    const grad = ctx.createLinearGradient(
      cx+rZodInner*Math.cos(midA), cy+rZodInner*Math.sin(midA),
      cx+rZodOuter*Math.cos(midA), cy+rZodOuter*Math.sin(midA)
    );
    grad.addColorStop(0, col.inner);
    grad.addColorStop(1, col.outer);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    // 5° tick marks within this sign (minor, inside zodiac ring)
    for (let d = 5; d < 30; d += 5) {
      const [tx0, ty0] = toXY(i*30+d, rZodInner+2);
      const [tx1, ty1] = toXY(i*30+d, rZodInner+7);
      ctx.beginPath(); ctx.moveTo(tx0, ty0); ctx.lineTo(tx1, ty1);
      ctx.strokeStyle='rgba(160,130,48,0.32)'; ctx.lineWidth=0.5; ctx.stroke();
    }

    // Sign boundary divider (bold at 30° marks)
    const [lx0, ly0] = toXY(i*30, rZodInner);
    const [lx1, ly1] = toXY(i*30, rZodOuter);
    ctx.beginPath(); ctx.moveTo(lx0, ly0); ctx.lineTo(lx1, ly1);
    ctx.strokeStyle='rgba(188,152,60,0.50)'; ctx.lineWidth=0.8; ctx.stroke();

    // Zodiac glyph — larger, Greek font, element glow
    const [gx, gy] = toXY(i*30+15, (rZodOuter+rZodInner)/2);
    ctx.save();
    ctx.font = `bold 16px ${GK_FONT}`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowColor=col.glyph; ctx.shadowBlur=12;
    ctx.fillStyle=col.glyph;
    ctx.fillText(ZODIAC_SYMBOLS[i], gx, gy);
    ctx.restore();
  }

  // ── 1b. Outer degree-tick ring (rZodOuter → rDecoOut) ────────────────────
  {
    // Dark gold fill for deco band
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rDecoOut, 0, Math.PI*2);
    ctx.arc(cx, cy, rZodOuter, 0, Math.PI*2, true);
    ctx.fillStyle='rgba(14,10,3,0.92)';
    ctx.fill();
    ctx.restore();

    // 5° major ticks, every-degree minor ticks
    for (let deg = 0; deg < 360; deg++) {
      const isMajor = deg % 30 === 0;
      const isMid   = deg % 5  === 0;
      if (!isMajor && !isMid) continue;
      const tickLen  = isMajor ? 7 : 4;
      const [tx0, ty0] = toXY(deg, rZodOuter+1);
      const [tx1, ty1] = toXY(deg, rZodOuter+tickLen);
      ctx.beginPath(); ctx.moveTo(tx0,ty0); ctx.lineTo(tx1,ty1);
      ctx.strokeStyle = isMajor ? 'rgba(212,160,32,0.90)' : 'rgba(180,140,48,0.38)';
      ctx.lineWidth   = isMajor ? 1.1 : 0.5;
      ctx.stroke();
    }
  }

  // Ring borders
  [rDecoOut, rZodOuter, rZodInner].forEach((r, idx) => {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.strokeStyle = idx===0 ? 'rgba(212,160,32,0.95)' : idx===1 ? 'rgba(200,155,50,0.60)' : 'rgba(185,142,44,0.42)';
    ctx.lineWidth   = idx===0 ? 1.8 : 0.9;
    ctx.stroke();
  });

  // ── 2. House ring with Roman numerals ─────────────────────────────────────
  const houses = chart.houses || [];
  const ANGLE_LABELS = { 0: 'ASC', 3: 'IC', 6: 'DSC', 9: 'MC' };

  ctx.beginPath(); ctx.arc(cx, cy, rHouseIn, 0, Math.PI*2);
  ctx.strokeStyle='rgba(148,112,38,0.35)'; ctx.lineWidth=0.7; ctx.stroke();

  for (let i = 0; i < 12; i++) {
    const cuspLon = houses[i];
    if (cuspLon === undefined) continue;
    const isAngle = (i===0||i===3||i===6||i===9);

    const [x0, y0] = toXY(cuspLon, rInner);
    const [x1, y1] = toXY(cuspLon, rHouseOut);
    ctx.save();
    if (isAngle) { ctx.shadowColor='#d4a020'; ctx.shadowBlur=5; }
    ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1);
    ctx.strokeStyle = isAngle ? 'rgba(212,160,32,0.95)' : 'rgba(158,118,38,0.38)';
    ctx.lineWidth   = isAngle ? 1.6 : 0.7;
    ctx.stroke();
    ctx.restore();

    // ASC / MC / IC / DSC labels
    if (isAngle) {
      const [lx, ly] = toXY(cuspLon, rHouseOut+15);
      ctx.save();
      ctx.font=`bold 9px ${GK_FONT}`;
      ctx.fillStyle='#d4a020'; ctx.shadowColor='#d4a020'; ctx.shadowBlur=7;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(ANGLE_LABELS[i], lx, ly);
      ctx.restore();
    }

    // Roman numeral house label
    const nextLon = houses[(i+1)%12];
    const midL    = cuspLon + angleDiff(cuspLon, nextLon)/2;
    const [nx, ny] = toXY(midL, (rHouseOut+rHouseIn)/2);
    ctx.save();
    ctx.font=`9px ${GK_FONT}`;
    ctx.fillStyle='rgba(188,148,56,0.78)';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(ROMAN_NUM[i], nx, ny);
    ctx.restore();
  }

  // ── 3. Inner circle + Earth symbol at centre ──────────────────────────────
  ctx.beginPath(); ctx.arc(cx, cy, rInner, 0, Math.PI*2);
  ctx.strokeStyle='rgba(155,118,40,0.52)'; ctx.lineWidth=0.9; ctx.stroke();

  // ⊕ Earth glyph at the exact centre
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI*2);
  ctx.fillStyle='rgba(14,10,4,0.95)'; ctx.fill();
  ctx.strokeStyle='rgba(212,160,32,0.65)'; ctx.lineWidth=1; ctx.stroke();
  ctx.font=`bold 11px Georgia,serif`;
  ctx.fillStyle='rgba(212,160,32,0.88)'; ctx.shadowColor='#d4a020'; ctx.shadowBlur=6;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('⊕', cx, cy+1);
  ctx.restore();

  // ── 4. Aspect lines — coloured, glowing ───────────────────────────────────
  const aspects = chart.aspects || [];
  for (const {planetA, planetB, aspect} of aspects) {
    if (aspect.name === 'Quincunx') continue;
    const [ax, ay] = toXY(planetA.lon, rInner*0.82);
    const [bx, by] = toXY(planetB.lon, rInner*0.82);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by);
    ctx.strokeStyle=aspect.color+'52'; ctx.shadowColor=aspect.color+'88'; ctx.shadowBlur=4;
    ctx.lineWidth=0.9; ctx.stroke();
    ctx.restore();
  }

  // ── 5. Planet markers — warm Greek palette, glowing ───────────────────────
  const planets = chart.planets || [];
  const placed  = [];
  const plotted = planets.map((p) => {
    let lon = p.lon;
    for (const prev of placed) {
      let diff = Math.abs(lon-prev);
      if (diff>180) diff=360-diff;
      if (diff<6) lon+=7;
    }
    placed.push(lon);
    return {...p, plotLon:lon};
  });

  for (const p of plotted) {
    const retro = p.retrograde||false;
    const sym   = p.symbol||PLANET_SYMBOLS[p.name]||'?';
    const color = PLANET_COLORS_GK[p.name]||PLANET_COLORS[p.name]||'#cccccc';
    const rSym  = rZodInner - 16;

    // Glowing dot at zodiac boundary
    const [dx, dy] = toXY(p.plotLon, rZodInner+2);
    ctx.save();
    ctx.beginPath(); ctx.arc(dx,dy,3.5,0,Math.PI*2);
    ctx.shadowColor=color; ctx.shadowBlur=12; ctx.fillStyle=color; ctx.fill();
    ctx.restore();

    // Tick spanning house ring
    const [t0x,t0y] = toXY(p.plotLon, rHouseOut+1);
    const [t1x,t1y] = toXY(p.plotLon, rZodInner+3);
    ctx.beginPath(); ctx.moveTo(t0x,t0y); ctx.lineTo(t1x,t1y);
    ctx.strokeStyle=color+'70'; ctx.lineWidth=0.7; ctx.stroke();

    // Planet symbol
    const [sx, sy] = toXY(p.plotLon, rSym);
    ctx.save();
    ctx.font=`14px ${GK_FONT}`;
    ctx.fillStyle=color; ctx.shadowColor=color; ctx.shadowBlur=retro?15:8;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(sym, sx, sy);
    ctx.restore();

    // ℞ retrograde glyph
    if (retro) {
      const [rx2,ry2] = toXY(p.plotLon, rSym-14);
      ctx.save();
      ctx.font='8px Georgia,serif';
      ctx.fillStyle='#ff6060'; ctx.shadowColor='#ff3030'; ctx.shadowBlur=8;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('℞', rx2, ry2);
      ctx.restore();
    }

    // Degree°min label (e.g. "14°32'")
    const zod3 = lonToZodiac(p.lon);
    const [degX, degY] = toXY(p.plotLon, rSym-28);
    ctx.save();
    ctx.font='7.5px Georgia,serif';
    ctx.fillStyle='rgba(215,188,118,0.62)';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(`${zod3.deg}°${String(zod3.min).padStart(2,'0')}'`, degX, degY);
    ctx.restore();
  }

  // ── 6. Bi-wheel outer ring ────────────────────────────────────────────────
  if (outerChart) {
    const rOut      = rDecoOut + 30;
    const rOutInner = rDecoOut + 4;

    ctx.beginPath(); ctx.arc(cx, cy, rOut, 0, Math.PI*2);
    ctx.strokeStyle=outerColor+'52'; ctx.lineWidth=1; ctx.stroke();

    for (const p of outerChart.planets||[]) {
      const sym   = p.symbol||PLANET_SYMBOLS[p.name]||'?';
      const retro = p.retrograde||false;

      const [t0x,t0y] = toXY(p.lon, rOutInner);
      const [t1x,t1y] = toXY(p.lon, rOut-2);
      ctx.beginPath(); ctx.moveTo(t0x,t0y); ctx.lineTo(t1x,t1y);
      ctx.strokeStyle=outerColor+'77'; ctx.lineWidth=0.7; ctx.stroke();

      const [sx,sy] = toXY(p.lon, (rOut+rOutInner)/2);
      ctx.save();
      ctx.font=`12px ${GK_FONT}`;
      ctx.fillStyle=retro?'#ff8866':outerColor; ctx.shadowColor=outerColor; ctx.shadowBlur=6;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(sym, sx, sy);
      ctx.restore();

      const crossAspects = computeCrossAspects(
        chart.planets.map((q) => ({name:q.name,lon:q.lon,symbol:q.symbol})),
        [{name:p.name,lon:p.lon,symbol:p.symbol}]
      );
      for (const {natal:n, aspect} of crossAspects) {
        const [ax,ay] = toXY(n.lon, rInner*0.82);
        const [bx,by] = toXY(p.lon, rOutInner);
        ctx.save();
        ctx.setLineDash([3,4]);
        ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by);
        ctx.strokeStyle=aspect.color+'3c'; ctx.lineWidth=0.7; ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
      }
    }
  }

  // ── Label (transit "Now" etc.) ────────────────────────────────────────────
  if (label) {
    ctx.save();
    ctx.font=`10px ${GK_FONT}`;
    ctx.fillStyle='rgba(178,148,78,0.75)';
    ctx.textAlign='right'; ctx.textBaseline='top';
    ctx.fillText(label, W-6, 4);
    ctx.restore();
  }
}

/** Signed angular difference lon2 - lon1 (0–360, CCW). */
function angleDiff(lon1, lon2) {
  return ((lon2 - lon1) % 360 + 360) % 360;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function fmtZodiac(zod) {
  return `${zod.sign} ${zod.symbol} ${zod.deg}°${String(zod.min).padStart(2,'0')}'`;
}

function toDateInput(d) {
  return d.toISOString().slice(0, 10);
}
function toTimeInput(d) {
  return d.toISOString().slice(11, 16);
}

// ─── HTML builders ────────────────────────────────────────────────────────────

function buildPlanetRows(planets) {
  const sunLon = planets?.find(p => p.name === 'sun')?.lon;
  return planets.map((p) => {
    const zod   = lonToZodiac(p.lon);
    const sym   = p.symbol || PLANET_SYMBOLS[p.name] || '?';
    const retro = p.retrograde;
    const color = PLANET_COLORS[p.name] || 'inherit';
    const dig   = getPlanetDignity(p.name, p.lon, true);
    const nat   = PLANET_NATURE[p.name];
    const digCol = dignityColor(dig);
    const natureTag = nat ? `<span class="pa-nature-tag pa-nature-${nat.nature}">${nat.nature}</span>` : '';
    const digTag    = `<span class="pa-dig-tag" style="color:${digCol}" title="${dig.breakdown.join(', ') || 'no dignity'}">${dig.label}${dig.score !== 0 ? ` (${dig.score > 0 ? '+' : ''}${dig.score})` : ''}</span>`;
    // Guide 09 — heliacal phase badge for the five non-luminary planets.
    let helioTag = '';
    if (sunLon !== undefined && p.name !== 'sun' && p.name !== 'moon') {
      const elong = ((p.lon - sunLon + 540) % 360) - 180;
      const ph = heliacalPhase(p.name, elong, !!p.retrograde);
      if (ph.phase) {
        const g = PHASE_GLYPH[ph.phase] || '·';
        helioTag = `<span class="pa-helio pa-helio-${ph.phase}" title="${PHASE_LABEL[ph.phase] || ph.phase}">${g}</span>`;
      }
    }
    return `
      <div class="pa-planet-row">
        <span class="pa-planet-sym" style="color:${color}">${sym}</span>
        <span class="pa-planet-name">${p.name.charAt(0).toUpperCase()+p.name.slice(1)}</span>
        <span class="pa-planet-sign">${fmtZodiac(zod)}</span>
        ${retro ? '<span class="pa-planet-retro">℞</span>' : ''}
        ${helioTag}
        ${digTag}
        ${natureTag}
      </div>`;
  }).join('');
}

function buildInterpPanel(planets) {
  return planets.map((p) => {
    const zod   = lonToZodiac(p.lon);
    const sym   = p.symbol || PLANET_SYMBOLS[p.name] || '?';
    const color = PLANET_COLORS[p.name] || 'inherit';
    const dig   = getPlanetDignity(p.name, p.lon, true);
    const nat   = PLANET_NATURE[p.name];
    const digCol = dignityColor(dig);
    const text  = getInterpretation(p.name, zod.sign);
    const pName = p.name.charAt(0).toUpperCase() + p.name.slice(1);

    // Dignity note for the interpretation box
    let digNote = '';
    if (dig.domicile)   digNote = 'In its own Domicile — the planet operates with full native power.';
    else if (dig.exaltation) digNote = 'Exalted — operating at the height of its particular influence.';
    else if (dig.detriment)  digNote = 'In Detriment — the planet\'s nature is at odds with the sign\'s quality.';
    else if (dig.fall)       digNote = 'In Fall — the planet\'s influence is diminished and constrained.';
    else if (dig.peregrine)  digNote = 'Peregrine — "dissipated and lost … from the dissimilar temperament." (Tet. I.XXVI)';

    return `
      <div class="pa-interp-box">
        <div class="pa-interp-header">
          <strong style="color:${color}">${sym} ${pName}</strong>
          <span class="pa-interp-in"> in </span>
          <strong>${zod.sign} ${zod.symbol}</strong>
          <span class="pa-dig-tag" style="color:${digCol};margin-left:6px">${dig.label}</span>
        </div>
        ${nat ? `<div class="pa-interp-nature">${nat.quality} · ${nat.nature} · ${nat.sect} sect</div>` : ''}
        ${text ? `<div class="pa-interp-text">${text}</div>` : '<div class="pa-interp-text pa-muted">Interpretation pending.</div>'}
        ${digNote ? `<div class="pa-interp-dig-note">${digNote}</div>` : ''}
        ${dig.breakdown.length > 0 ? `<div class="pa-interp-breakdown">${dig.breakdown.join(' · ')}</div>` : ''}
      </div>`;
  }).join('');
}

function buildAspectRows(aspects) {
  // Sort: exact desc, tight desc, signDiff asc — whole-sign produces more
  // rows than the old orb-gated engine, so foreground the strongest first.
  const sorted = [...aspects].sort((a, b) => {
    const A = a.aspect, B = b.aspect;
    if (!!B.exact - !!A.exact) return !!B.exact - !!A.exact;
    if (!!B.tight - !!A.tight) return !!B.tight - !!A.tight;
    return (A.signDiff ?? 0) - (B.signDiff ?? 0);
  });
  return sorted.map(({ planetA, planetB, aspect }) => {
    const cls = `pa-asp-${aspect.harmony}`;
    const ptName = aspect.ptolemyName || aspect.name;
    const tightnessTag = aspect.exact ? 'exact'
                       : aspect.tight ? 'tight'
                       : 'wide';
    const moveTag = aspect.applying ? 'applying' : 'separating';
    return `
      <div class="pa-aspect-row ${cls}">
        <span style="color:${PLANET_COLORS[planetA.name]||'inherit'}">${planetA.symbol||'?'}</span>
        <span style="color:${aspect.color};font-size:14px">${aspect.symbol}</span>
        <span style="color:${PLANET_COLORS[planetB.name]||'inherit'}">${planetB.symbol||'?'}</span>
        <span style="color:var(--muted);font-size:10px;flex:1">${planetA.name} · ${ptName} · ${planetB.name}</span>
        <span class="pa-asp-tag ${tightnessTag}" title="${(aspect.degreeOffExact ?? aspect.orb ?? 0).toFixed(2)}° from exact">${tightnessTag}</span>
        <span class="pa-asp-tag ${moveTag}">${moveTag}</span>
        <span style="color:var(--muted);font-size:10px">${(aspect.degreeOffExact ?? aspect.orb ?? 0).toFixed(1)}°</span>
        <span style="font-size:9px;padding:1px 4px;border-radius:2px;background:var(--row);color:${aspect.harmony==='easy'?'#66dd88':aspect.harmony==='hard'?'#ff6644':'#aaaaaa'}">${aspect.harmony}</span>
      </div>`;
  }).join('');
}

// ─── Main factory ─────────────────────────────────────────────────────────────

export function buildAstrologyApp(model) {
  // ── Build DOM ──────────────────────────────────────────────────────────────
  const app = document.createElement('div');
  app.id = 'astrology-app';
  app.hidden = true;
  app.innerHTML = `
    <div class="pa-header">
      <button class="pa-back pa-btn" type="button">&#8592; Astronomy</button>
      <h1 class="pa-title">Ptolemaic Astrology</h1>
      <nav class="pa-nav">
        <!-- Rework 2026-05-20: removed Chart, Profiles, Transits, Sect,
             Dignities, Profect, Lots, Almuten, Condition. The 6 below
             are kept as standalone info; new tabs will be added here as
             the rework progresses. Safety tag: pre-astrology-rework-v1. -->
        <button class="pa-tab-btn active" data-tab="zodiacwheel" type="button">♈ Zodiac Wheel</button>
        <button class="pa-tab-btn" data-tab="synastry" type="button">Synastry</button>
        <button class="pa-tab-btn" data-tab="houses" type="button">⌂ Houses</button>
        <button class="pa-tab-btn" data-tab="stars" type="button">★ Stars</button>
        <button class="pa-tab-btn" data-tab="modernity" type="button">⚖ Old/New Astrology</button>
        <button class="pa-tab-btn" data-tab="lifespan" type="button">◉ Lifespan</button>
        <button class="pa-tab-btn" data-tab="mundane" type="button">⊕ Mundane</button>
        <button class="pa-tab-btn" data-tab="returns" type="button">☀ Returns</button>
        <button class="pa-tab-btn" data-tab="report" type="button">📜 Report</button>
        <button class="pa-tab-btn pa-tab-btn-cards" data-tab="cards" type="button">📜 Scrolls</button>
      </nav>
    </div>
    <div class="pa-body">
      <div class="pa-tab" id="pa-tab-zodiacwheel">
        <div id="pa-zodiacwheel-content"></div>
      </div>
      <!-- Rework 2026-05-20: removed pa-tab-chart, pa-tab-profiles, pa-tab-transits.
           Their JS render functions remain in this file (renderChart etc.) so
           the kept tabs that share helpers (Synastry / Houses) continue to work,
           but the DOM nodes they wrote into are gone. -->

      <div class="pa-tab" id="pa-tab-synastry" style="display:none">
        <div class="pa-synastry-selectors" style="margin-bottom:14px;flex-wrap:wrap;gap:8px">
          <label style="font-size:12px;color:var(--muted)">Person A:
            <select class="pa-input" id="pa-syn-a" style="margin-left:4px"></select>
          </label>
          <select class="pa-input" id="pa-syn-gender-a" style="font-size:11px;padding:2px 4px" title="Sex for marriage significators">
            <option value="m">Male nativity</option>
            <option value="f">Female nativity</option>
          </select>
          <label style="font-size:12px;color:var(--muted)">Person B:
            <select class="pa-input" id="pa-syn-b" style="margin-left:4px"></select>
          </label>
          <select class="pa-input" id="pa-syn-gender-b" style="font-size:11px;padding:2px 4px" title="Sex for marriage significators">
            <option value="m">Male nativity</option>
            <option value="f">Female nativity</option>
          </select>
          <button class="pa-btn pa-btn-primary" id="pa-syn-draw" type="button">Compare</button>
          <button class="pa-btn" id="pa-syn-report" type="button" style="margin-left:auto">📋 Copy Report</button>
        </div>
        <div id="pa-syn-need-profiles" style="color:var(--muted);font-size:13px;display:none">
          Save at least 2 profiles to use Synastry.
        </div>
        <div id="pa-syn-content">
          <!-- Ptolemy marriage quote strip -->
          <div class="pa-ptolemy-quote" id="pa-syn-quote" style="margin-bottom:14px"></div>
          <!-- Marriage significators panel (Book IV, Ch. IV) -->
          <div id="pa-syn-marriage-sig" style="margin-bottom:14px"></div>
          <!-- Main layout: bi-wheel + right column -->
          <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap">
            <div class="pa-chart-canvas-wrap">
              <canvas id="pa-synastry-wheel" width="520" height="520"></canvas>
            </div>
            <div style="flex:1;min-width:260px">
              <!-- Key Ptolemaic connections -->
              <div id="pa-syn-key-connections" style="margin-bottom:12px"></div>
              <!-- All cross-aspects -->
              <div style="color:var(--accent);font-weight:700;font-size:12px;margin-bottom:6px;font-family:var(--font-greek)">All Cross-Aspects</div>
              <div class="pa-transit-list" id="pa-syn-aspect-list"></div>
              <!-- Mutual reception -->
              <div id="pa-syn-mutual-reception" style="margin-top:12px"></div>
              <!-- Sign relationships -->
              <div id="pa-syn-sign-relations" style="margin-top:12px"></div>
              <!-- Compatibility score -->
              <div style="height:14px"></div>
              <div style="font-size:12px;color:var(--muted);margin-bottom:4px;font-family:var(--font-greek)">Ptolemaic Compatibility</div>
              <div id="pa-compat-label" style="font-size:13px;color:var(--fg);margin-bottom:6px"></div>
              <div class="pa-compat-bar">
                <div class="pa-compat-fill" id="pa-compat-fill" style="width:50%"></div>
              </div>
              <div id="pa-compat-breakdown" style="margin-top:8px;font-size:11px;color:var(--muted)"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="pa-tab" id="pa-tab-houses" style="display:none">
        <div id="pa-houses-content"></div>
      </div>

      <div class="pa-tab" id="pa-tab-stars" style="display:none">
        <div id="pa-stars-content"></div>
      </div>

      <div class="pa-tab" id="pa-tab-modernity" style="display:none">
        <div id="pa-modernity-content"></div>
      </div>

      <div class="pa-tab" id="pa-tab-cards" style="display:none">
        <div id="pa-cards-content"></div>
      </div>

      <!-- Tabs added by the Tetrabiblos overhaul (Guides 06, 07, 09, 10). -->
      <div class="pa-tab" id="pa-tab-lifespan" style="display:none">
        <div id="pa-lifespan-content"></div>
      </div>
      <div class="pa-tab" id="pa-tab-mundane" style="display:none">
        <div id="pa-mundane-content"></div>
      </div>
      <div class="pa-tab" id="pa-tab-returns" style="display:none">
        <div id="pa-returns-content"></div>
      </div>
      <div class="pa-tab" id="pa-tab-report" style="display:none">
        <div id="pa-report-content"></div>
      </div>
      <!-- Rework 2026-05-20: removed pa-tab-sect, dignities, profections, lots,
           almuten, bonification. Helper functions (renderSect, renderDignities,
           etc.) are still defined in this file, but with no DOM target they're
           never called and could be deleted later in a follow-up cleanup. -->
    </div>
  `;
  document.body.appendChild(app);

  // ── State ──────────────────────────────────────────────────────────────────
  let currentChart = null;

  // Migrate legacy localStorage profiles into IndexedDB on first boot,
  // then warm the sync cache so existing render paths read live data.
  // Fire-and-forget; UI re-renders after the cache lands.
  (async () => {
    try { await migrateLegacyProfiles(); } catch (e) { console.warn('[chartStore] migrate:', e); }
    try { await refreshProfilesCache(); } catch (e) { console.warn('[chartStore] refresh:', e); }
    // If a Profiles tab is currently rendered, refresh it
    const grid = app.querySelector('#pa-profiles-grid');
    if (grid && typeof renderProfiles === 'function' && tabs.profiles && tabs.profiles.style.display !== 'none') {
      renderProfiles();
    }
  })();

  // ── Tab switching ──────────────────────────────────────────────────────────
  // Post-rework (2026-05-20) only 6 tabs are wired: Zodiac Wheel (default),
  // Synastry, Houses, Stars, Old/New Astrology, Scrolls. The render fns for
  // the removed tabs (renderProfiles, renderTransits, renderSect etc.) still
  // exist further down so the kept tabs that share helpers keep working;
  // they're just never called from the dispatcher below. .querySelector
  // returns null for the removed pa-tab-* IDs, which is fine because the
  // for-each below skips falsy entries.
  const tabBtns = app.querySelectorAll('.pa-tab-btn');
  const tabs = {
    zodiacwheel: app.querySelector('#pa-tab-zodiacwheel'),
    synastry:    app.querySelector('#pa-tab-synastry'),
    houses:      app.querySelector('#pa-tab-houses'),
    stars:       app.querySelector('#pa-tab-stars'),
    modernity:   app.querySelector('#pa-tab-modernity'),
    cards:       app.querySelector('#pa-tab-cards'),
    lifespan:    app.querySelector('#pa-tab-lifespan'),
    mundane:     app.querySelector('#pa-tab-mundane'),
    returns:     app.querySelector('#pa-tab-returns'),
    report:      app.querySelector('#pa-tab-report'),
  };

  function switchTab(name) {
    tabBtns.forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    Object.entries(tabs).forEach(([k, el]) => {
      if (!el) return;
      el.style.display = k === name ? '' : 'none';
    });
    if (name === 'zodiacwheel') renderZodiacWheel(app.querySelector('#pa-zodiacwheel-content'));
    if (name === 'synastry')    renderSynastry();
    if (name === 'houses')      renderHouses();
    if (name === 'stars')       renderStars();
    if (name === 'modernity')   renderModernity();
    if (name === 'cards')       renderCards();
    if (name === 'lifespan')    renderLifespan();
    if (name === 'mundane')     renderMundane();
    if (name === 'returns')     renderReturns();
    if (name === 'report')      renderReport();
  }

  tabBtns.forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  // ── Back button ────────────────────────────────────────────────────────────
  app.querySelector('.pa-back').addEventListener('click', hide);

  // ── Chart tab ─────────────────────────────────────────────────────────────
  const nameEl  = app.querySelector('#pa-name');
  const dateEl  = app.querySelector('#pa-date');
  const timeEl  = app.querySelector('#pa-time');
  const latEl   = app.querySelector('#pa-lat');
  const lonEl   = app.querySelector('#pa-lon');
  const placeEl = app.querySelector('#pa-place');

  function fillFromModel() {
    const now = new Date(
      Date.UTC(2017, 0, 1) + (model.state?.DateTime ?? 0) * 86400000
    );
    dateEl.value = toDateInput(now);
    timeEl.value = toTimeInput(now);
    latEl.value  = (model.state?.ObserverLat  ?? 40.7).toFixed(4);
    lonEl.value  = (model.state?.ObserverLong ?? -74.0).toFixed(4);
  }

  app.querySelector('#pa-use-now')?.addEventListener('click', fillFromModel);

  app.querySelector('#pa-draw')?.addEventListener('click', () => {
    const dateStr = dateEl.value || toDateInput(new Date());
    const timeStr = timeEl.value || '12:00';
    const lat  = parseFloat(latEl.value)  || 40.7;
    const lon  = parseFloat(lonEl.value)  || -74.0;
    const source = model.state?.BodySource || 'ibnshatir';
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, mi]    = timeStr.split(':').map(Number);
    const date = new Date(Date.UTC(y, mo - 1, d, h, mi, 0));
    try {
      currentChart = computeFullChart(date, lat, lon, source);
      currentChart._name      = nameEl.value.trim() || 'Unnamed';
      currentChart._place     = placeEl.value.trim();
      currentChart._profileId = null; // cleared on manual draw
      renderChartOutput(currentChart);
    } catch (err) {
      console.error('Chart computation error:', err);
    }
  });

  app.querySelector('#pa-save')?.addEventListener('click', () => {
    if (!currentChart) { alert('Draw a chart first.'); return; }
    const dateStr = dateEl.value;
    const timeStr = timeEl.value || '12:00';
    const p = {
      name:       nameEl.value.trim() || 'Unnamed',
      birthDate:  dateStr,
      birthTime:  timeStr,
      birthLat:   parseFloat(latEl.value) || 0,
      birthLon:   parseFloat(lonEl.value) || 0,
      birthPlace: placeEl.value.trim(),
    };
    addProfile(p);
    alert(`Profile "${p.name}" saved.`);
  });

  function renderChartOutput(chart) {
    const canvas = app.querySelector('#pa-chart-wheel');
    drawChartWheel(canvas, chart);

    const planetListEl = app.querySelector('#pa-planet-list');
    planetListEl.innerHTML = buildPlanetRows(chart.planets);

    // chart.houses is now whole-sign (sign-boundary cusps); use ascLon/mcLon
    // for the actual angle longitudes (PART 9.1).
    const ascZod = lonToZodiac(chart.ascLon ?? 0);
    const mcZod  = lonToZodiac(chart.mcLon  ?? 0);

    // Planetary natures summary bar
    const natsHtml = chart.planets.map((p) => {
      const n = PLANET_NATURE[p.name];
      if (!n) return '';
      const sym = p.symbol || PLANET_SYMBOLS[p.name] || '?';
      const cls = `pa-nat-${n.nature}`;
      return `<span class="${cls}" title="${p.name}: ${n.quality}">${sym}</span>`;
    }).join('');

    {
      const m = computeAscendant._lastMethod;
      const ps = computeAscendant._lastParallels || [];
      let methodNote = '';
      if (m === 'tabular' && ps.length === 2) {
        methodNote = `<div style="font-size:10px;color:var(--muted);margin-top:2px">Almagest II.8 interpolation: ${ps.join(' ↔ ')}</div>`;
      } else if (m === 'modern-fallback') {
        methodNote = `<div style="font-size:10px;color:var(--muted);margin-top:2px">Latitude outside Ptolemy's range — modern formula</div>`;
      }
      app.querySelector('#pa-asc-row').innerHTML =
        `<span>&#8593; ASC (Rising): <strong>${fmtZodiac(ascZod)}</strong></span>${methodNote}`;
    }
    app.querySelector('#pa-mc-row').innerHTML =
      `<span>&#8853; MC (Midheaven): <strong>${fmtZodiac(mcZod)}</strong></span>`;

    app.querySelector('#pa-aspect-list').innerHTML = buildAspectRows(chart.aspects || []);
    app.querySelector('#pa-interp-list').innerHTML = buildInterpPanel(chart.planets);

    // Ptolemy quote
    const quotes = [
      '"The stars incline; they do not compel." — Tetrabiblos I.III',
      '"The power of the Sun however predominates, because it is more generally distributed." — Tet. I.II',
      '"Jupiter … will render the mind generous, gracious, pious, reverent, joyous." — Tet. III.XVIII',
      '"Mortal though I be, yea ephemeral, if but a moment I gaze up to the night\'s starry domain…" — Ptolemy',
      '"Astrology demands the greatest study and a constant attention to a multitude of different points." — Tet. I.III',
      '"All bodies … are subjected to the motion of the stars." — Tetrabiblos I.II',
    ];
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    const quoteEl = app.querySelector('#pa-ptolemy-quote');
    if (quoteEl) quoteEl.textContent = quote;

    app.querySelector('#pa-chart-output').style.display = '';
  }

  // ── Profiles tab ──────────────────────────────────────────────────────────
  const PLANET_ORDER = ['sun','moon','mercury','venus','mars','jupiter','saturn'];
  const SIGN_ABBR    = ['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis'];
  const SIGN_COLORS  = ['#ff7055','#88ccaa','#88ccee','#66aacc','#d4b878','#a8d888',
                        '#c4a0c4','#cc6655','#c8a060','#a0b080','#88aac8','#8899cc'];

  function renderProfiles() {
    const grid     = app.querySelector('#pa-profiles-grid');
    const emptyEl  = app.querySelector('#pa-profiles-empty');
    const profiles = loadProfiles();
    if (profiles.length === 0) {
      grid.innerHTML = '';
      emptyEl.style.display = '';
      return;
    }
    emptyEl.style.display = 'none';
    const activeId = currentChart?._profileId || null;
    const source   = model.state?.BodySource || 'ibnshatir';

    grid.innerHTML = profiles.map((p) => {
      let planetCells = '';
      let ascLine     = '';
      let ruleLine    = '';
      const isActive  = p.id === activeId;
      try {
        const c      = chartFromProfile(p, source);
        const isDawn = (c.sunLon !== undefined && c.ascLon !== undefined)
          ? (c.sunLon > c.ascLon && c.sunLon < (c.ascLon + 180))
          : true;
        // Planet grid: all 7 bodies
        planetCells = PLANET_ORDER.map(name => {
          const pl  = c.planets.find(x => x.name === name);
          if (!pl) return '';
          const z   = lonToZodiac(pl.lon);
          const si  = Math.floor(pl.lon / 30) % 12;
          const dig = getPlanetDignity(name, pl.lon, isDawn);
          const sym = PLANET_SYMBOLS[name] || name[0];
          const col = PLANET_COLORS[name] || '#aaa';
          const badge = dig.domicile ? '★' : dig.exaltation ? '↑' : dig.detriment ? '↓' : dig.fall ? '▼' : '';
          const badgeCol = (dig.domicile||dig.exaltation) ? '#f0d060' : (dig.detriment||dig.fall) ? '#ff7055' : '';
          return `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;min-width:28px">
            <span style="font-size:13px;color:${col}">${sym}</span>
            <span style="font-size:9px;color:${SIGN_COLORS[si]}">${z.symbol}</span>
            <span style="font-size:8px;color:${SIGN_COLORS[si]};opacity:0.8">${SIGN_ABBR[si]}</span>
            ${badge ? `<span style="font-size:8px;color:${badgeCol}">${badge}</span>` : '<span style="font-size:8px"> </span>'}
          </div>`;
        }).join('');
        // ASC line (uses actual Ascendant longitude, not whole-sign cusp)
        if (c.ascLon !== undefined) {
          const az  = lonToZodiac(c.ascLon);
          const asi = Math.floor(((c.ascLon % 360) + 360) % 360 / 30) % 12;
          ascLine = `<div style="font-size:10px;color:var(--muted);margin-top:6px">&#8593; ASC <span style="color:${SIGN_COLORS[asi]}">${az.symbol} ${az.sign} ${az.deg}°</span></div>`;
        }
      } catch (_) {}

      const border = isActive ? '1px solid #c8960a' : '1px solid rgba(255,255,255,0.08)';
      const glow   = isActive ? 'box-shadow:0 0 10px rgba(200,150,10,0.25)' : '';

      return `
        <div class="pa-profile-card" data-id="${p.id}" style="border:${border};${glow}">
          ${isActive ? '<div style="font-size:9px;color:#c8960a;letter-spacing:1px;margin-bottom:4px">★ ACTIVE</div>' : ''}
          <div class="pa-profile-name">${escHtml(p.name)}</div>
          <div class="pa-profile-date">${fmtDate(p.birthDate + 'T' + (p.birthTime || '12:00') + ':00Z')}</div>
          ${p.birthPlace ? `<div style="font-size:10px;color:var(--muted);margin-bottom:4px">${escHtml(p.birthPlace)}</div>` : ''}
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin:8px 0 2px;padding:8px 6px;background:rgba(255,255,255,0.03);border-radius:6px">
            ${planetCells}
          </div>
          ${ascLine}
          <div class="pa-profile-actions" style="margin-top:10px">
            <button class="pa-btn pa-btn-primary pa-load-profile" data-id="${p.id}" type="button">${isActive ? '↻ Reload' : 'Load'}</button>
            <button class="pa-btn pa-del-profile" data-id="${p.id}" type="button" style="color:#ff6644">Delete</button>
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.pa-load-profile').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = loadProfiles().find((x) => x.id === btn.dataset.id);
        if (!p) return;
        nameEl.value  = p.name;
        dateEl.value  = p.birthDate;
        timeEl.value  = p.birthTime || '12:00';
        latEl.value   = p.birthLat;
        lonEl.value   = p.birthLon;
        placeEl.value = p.birthPlace || '';
        switchTab('chart');
        app.querySelector('#pa-draw').click();
        // Tag the loaded profile so the Profiles tab can highlight it
        setTimeout(() => { if (currentChart) currentChart._profileId = p.id; }, 50);
      });
    });

    grid.querySelectorAll('.pa-del-profile').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete this profile?')) return;
        deleteProfile(btn.dataset.id);
        renderProfiles();
      });
    });
  }

  // ── Transits tab ──────────────────────────────────────────────────────────
  // ── Notification opt-in ───────────────────────────────────────────────────
  const NOTIF_KEY = 'ptol-notif-pref'; // 'granted'|'denied'|null
  function initNotifBanner() {
    const banner = app.querySelector('#pa-notif-banner');
    const status = app.querySelector('#pa-notif-status');
    const pref   = localStorage.getItem(NOTIF_KEY);
    if (pref || !('Notification' in window)) return;
    banner.style.display = 'flex';
    app.querySelector('#pa-notif-yes').addEventListener('click', async () => {
      banner.style.display = 'none';
      const result = await Notification.requestPermission();
      localStorage.setItem(NOTIF_KEY, result);
      status.style.display = '';
      status.textContent = result === 'granted'
        ? '🔔 Notifications enabled — you\'ll be alerted when key transits perfect.'
        : 'Notifications blocked by browser. You can enable them in browser settings.';
    });
    app.querySelector('#pa-notif-no').addEventListener('click', () => {
      banner.style.display = 'none';
      localStorage.setItem(NOTIF_KEY, 'denied');
    });
  }

  function maybeNotifyTransits(crossAsp, natalName) {
    if (Notification.permission !== 'granted') return;
    const exact = crossAsp.filter(({ aspect }) => aspect.orb < 0.5);
    const key   = 'ptol-notif-sent-' + new Date().toDateString();
    if (localStorage.getItem(key)) return;
    if (exact.length === 0) return;
    localStorage.setItem(key, '1');
    const { natal: n, transiting: tr, aspect } = exact[0];
    new Notification(`Exact Transit: ${tr.name} ${aspect.name} natal ${n.name}`, {
      body: `${natalName || 'Your chart'} · orb ${aspect.orb.toFixed(2)}° · ${new Date().toLocaleDateString()}`,
      icon: 'assets/icons/icon-192.png',
    });
  }

  // ── 7-day transit digest ──────────────────────────────────────────────────
  function buildWeekDigest(lat, lon, source) {
    if (!currentChart) return [];
    const natal = currentChart.planets.map(p => ({ name: p.name, lon: p.lon, symbol: p.symbol }));
    const events = [];
    const OUTER = new Set(['saturn','jupiter','mars']);
    for (let d = 0; d <= 6; d++) {
      const date = new Date(); date.setDate(date.getDate() + d);
      try {
        const tc = computeFullChart(date, lat, lon, source);
        const cross = computeCrossAspects(natal, tc.planets.map(p => ({ name: p.name, lon: p.lon, symbol: p.symbol })));
        for (const { natal: n, transiting: tr, aspect } of cross) {
          if (!OUTER.has(tr.name)) continue;
          if (aspect.orb < 1.5) {
            events.push({ d, date, tr, n, aspect });
          }
        }
      } catch (_) {}
    }
    // Deduplicate: keep tightest orb per tr+asp+natal combo
    const seen = new Map();
    for (const e of events) {
      const k = `${e.tr.name}${e.aspect.name}${e.n.name}`;
      if (!seen.has(k) || e.aspect.orb < seen.get(k).aspect.orb) seen.set(k, e);
    }
    return [...seen.values()].sort((a, b) => a.d - b.d || a.aspect.orb - b.aspect.orb);
  }

  // ── Ptolemaic Transit Interpretations ────────────────────────────────────
  // All values use double-quoted strings to allow apostrophes without escaping.
  const TI = {
    saturn_Conjunction_sun:     { q:"m", h:"Saturn's Trial of Vitality",     t:"Saturn's cold, contracting nature is fused directly with the vital force and solar authority. This marks a season of restriction, delay, and enforced endurance — the native's constitution and dignity are tested by labour and obscure conditions. Honour recedes before it may be rebuilt on firmer ground. 'Saturn's conjunction with the Sun produces grief and loss of substance.' — Tet. I.IV" },
    saturn_Conjunction_moon:    { q:"m", h:"Saturn Suppresses the Lunar Body", t:"The Moon governs the moist, fluctuating principle of the body and popular esteem. Saturn's cold dryness presses upon it, bringing melancholic humours, bodily heaviness, and estrangement from the mother or prominent women. The public life contracts and nourishment — literal and emotional — may be withheld." },
    saturn_Conjunction_mercury: { q:"x", h:"Saturn Weighs the Mind",           t:"The swift intellectual faculty of Mercury is slowed and deepened by Saturn's gravity. Commerce and communication encounter obstruction; yet the mind may turn productively toward philosophy, mathematics, and solitary study. Guard against melancholy and the paralysis of excessive caution." },
    saturn_Conjunction_venus:   { q:"m", h:"Saturn Restrains Desire",          t:"Venus governs pleasure, desire, and the fruitful bond between persons. Saturn's cold hand withholds — relationships undergo tests of endurance, ornament is stripped away, and love may feel distant or dutiful rather than warm. Beware coldness becoming permanent estrangement." },
    saturn_Conjunction_mars:    { q:"m", h:"Two Malefics United",              t:"The violence of Mars acquires Saturn's cold deliberation — strife becomes calculated and prolonged. This is among the more dangerous transits of traditional astrology: accidents, conflict with authority, and ruin through stubbornness are all possible. Proceed with the utmost caution." },
    saturn_Conjunction_jupiter: { q:"x", h:"Expansion Meets Contraction",     t:"Jupiter's warm beneficence is weighed against Saturn's cold restriction. Gains may come slowly and honours are delayed; expansion is tempered by scarcity or obligation. Yet patience under this transit produces lasting, structural achievement — what is built now is built to endure." },
    saturn_Conjunction_saturn:  { q:"x", h:"The Saturn Return — A Life Reckoned", t:"Saturn completes his cycle and returns to the degree he occupied at birth. This is the great reckoning: the native must account fully for the foundations laid, dissolve whatever no longer serves, and accept the weight of accumulated responsibility. The first return (~age 29) initiates full adult gravity; the second (~58) demands wisdom." },
    saturn_Trine_sun:           { q:"b", h:"Discipline Rewards Authority",    t:"Saturn's disciplining nature works in harmonious concordance with the vital principle. Labours now undertaken bear lasting fruit; authority is consolidated through patient and consistent effort. Advancement in property, inheritance, or any matter requiring sustained application is favoured." },
    saturn_Trine_moon:          { q:"b", h:"Steadiness of Body and Fortune",  t:"The moist, fluctuating Moon is stabilised by Saturn's gravity in its most productive form. Bodily constitution is strengthened through regulation and routine; the native handles public affairs with greater reliability and gravity. An auspicious period for practical undertakings." },
    saturn_Trine_mercury:       { q:"b", h:"The Philosopher's Mind",          t:"Mercury's swiftness is deepened without being obstructed. The native may apply intellectual gifts to systematic, enduring works — mathematics, law, historical research, and the organisation of practical knowledge. Communications carry weight and authority." },
    saturn_Trine_venus:         { q:"b", h:"Enduring Affections",             t:"Love and pleasure are given a serious, loyal character. Relationships formed or consolidated under this transit tend to be durable, grounded in mutual respect rather than fleeting passion. The native may find beauty in simplicity and mature forms of art." },
    saturn_Trine_mars:          { q:"x", h:"Disciplined Force",               t:"Mars's drive and heat are channelled through Saturn's structural patience. The native may accomplish great physical or martial works through disciplined, persistent effort. The danger of rashness is reduced; but guard that Saturn's caution does not extinguish necessary courage." },
    saturn_Trine_jupiter:       { q:"b", h:"Measured Prosperity",             t:"The two social planets in harmonious aspect promise slow but solid advancement in wealth, honour, and the affairs of religion or law. What is gained now is protected by prudence; the native earns respect from elders and institutions." },
    saturn_Trine_saturn:        { q:"b", h:"Structural Consolidation",        t:"A harmonious return of Saturn's energies to natal Saturn. Structures in the life that are well-founded are confirmed; those that need strengthening may be quietly reinforced without the disruption of a full return." },
    saturn_Sextile_sun:         { q:"b", h:"Labour Bears Honour",             t:"A mild but productive cooperation between discipline and vitality. Old matters reach resolution; the native advances through perseverance and attention to established structures. Authority is enhanced through demonstrated reliability rather than bold action." },
    saturn_Sextile_moon:        { q:"b", h:"Practical Grounding",             t:"The body and daily habits may be brought under better regulation. Popular esteem is earned through consistency and dependability. A favourable period for health routines and domestic organisation." },
    saturn_Sextile_mercury:     { q:"b", h:"Methodical Reasoning",            t:"Saturn lends Mercury's quick mind a steadying hand. Communications, contracts, and intellectual projects benefit from greater care and structure. An auspicious time for legal documents, detailed plans, and systematic study." },
    saturn_Sextile_venus:       { q:"x", h:"Modest Pleasures",                t:"Pleasures are moderate and grounded; extravagance is naturally restrained. Existing relationships are reliable; new bonds formed now tend toward friendship and mutual usefulness rather than passionate ardour." },
    saturn_Sextile_mars:        { q:"x", h:"Contained Drive",                 t:"Physical energy and ambition are present but directed with unusual patience. This period favours tasks requiring both endurance and initiative — building, athletic training, and long-term competitive strategies." },
    saturn_Sextile_jupiter:     { q:"b", h:"Prudent Expansion",               t:"Opportunities for modest growth arrive, but only if approached with care and sound judgment. Advances that come now are proportionate to the effort and responsibility accepted." },
    saturn_Square_sun:          { q:"m", h:"Authority Under Siege",           t:"Saturn's cold obstruction presses the vital principle from a position of maximum tension. The native's dignity, health, and reputation face trials; obstacles from persons of authority or through the weight of accumulated duties may feel crushing. Endurance is required — rashness will worsen the position. 'Saturn in quartile with the Sun diminishes the vital force.' — Tet. I.IV" },
    saturn_Square_moon:         { q:"m", h:"Bodily Heaviness and Estrangement", t:"The moist principle of the body and popular esteem is afflicted by conflict and tension. Physical health may suffer from cold, phlegmatic imbalances; the relationship with the mother or the public turns difficult. Emotional burdens accumulate and separations from those depended upon may occur." },
    saturn_Square_mercury:      { q:"m", h:"Obstructed Intellect",            t:"Communications break down; contracts meet delays; the mind is burdened by worry, cold pessimism, or the weight of unsolved problems. Guard against signing binding agreements under this transit, and be patient with misunderstandings." },
    saturn_Square_venus:        { q:"m", h:"Love Withheld",                   t:"Pleasure is frustrated; desires go unmet or are achieved only with great effort. Relationships face tests of commitment — coldness and duty intrude where warmth is sought. Financial matters related to Venus (luxuries, adornment, art) may suffer loss." },
    saturn_Square_mars:         { q:"m", h:"Dangerous Frustration",           t:"Mars's hot impatience is met by Saturn's cold obstruction — the result is explosive frustration, accidents born of recklessness, or conflict with authority. Both planets are malefic; this transit demands the utmost caution in all competitive, physical, and confrontational matters." },
    saturn_Square_jupiter:      { q:"m", h:"Fortune Delayed",                 t:"Jupiter's expansive beneficence is blocked by Saturn's contracting gravity. Opportunities that seem promising are slowed by bureaucracy, obligation, or ill-timed circumstances. Guard against overcommitting resources in an attempt to force expansion that Saturn resists." },
    saturn_Square_saturn:       { q:"m", h:"The Quarter-Cycle Trial",         t:"At approximately ages 7, 14-15, 21-22, 36-37, 43-44, and 51-52, Saturn squares his natal position. The foundations built since the previous Saturn station are tested; weaknesses surface. Necessary adjustments are demanded before the cycle can continue." },
    saturn_Opposition_sun:      { q:"m", h:"Saturn Opposes the Vital Principle", t:"The full diameter of Saturn's cold and drying influence is directed against the native's vitality, spirit, and authority. Public setbacks, health trials, and enforced humility characterise the period. That which was achieved through pride may now be taken; only genuine substance will survive. 'By opposition, Saturn's malice operates in full force.' — Tet. I.XVI" },
    saturn_Opposition_moon:     { q:"m", h:"The Body Contested",              t:"Saturn in diametrical opposition to natal Moon brings the greatest pressure to bear on the moist, bodily principle. Illness of a cold or phlegmatic character, public disgrace, and the loss of maternal or domestic support are all signified. The native must guard health carefully." },
    saturn_Opposition_mercury:  { q:"m", h:"Reason Under Siege",              t:"Intellectual projects face maximum external opposition — communications are distorted, contracts fail, and the native's words may be weaponised against them. Legal matters and business dealings require extreme caution. Melancholy and irrational fear may cloud judgment." },
    saturn_Opposition_venus:    { q:"m", h:"Desire and Loss",                 t:"Relationships face the full brunt of Saturn's separating, cold nature. Partnerships may dissolve or reach a point of decisive reckoning; pleasures that have been excessive are now forcibly curtailed. Financial loss through luxury or over-indulgence may occur." },
    saturn_Opposition_mars:     { q:"m", h:"Maximum Conflict",                t:"Two malefics in diametrical opposition — the most dangerous of all Saturn-Mars combinations. Violence, legal conflict, serious accident, and ruin through intransigence are all heightened possibilities. Retreat and wait is far wiser than any form of confrontation." },
    saturn_Opposition_jupiter:  { q:"m", h:"Fortune Besieged",                t:"Saturn's full weight opposes Jupiter's generous expansions. What has been built with optimism or overextension now faces its reckoning. Debts, obligations, and deferred problems come due. Those who have built honestly will find this period clarifying rather than catastrophic." },
    saturn_Opposition_saturn:   { q:"x", h:"Mid-Cycle Reckoning",             t:"At approximately ages 14-15 and 43-44, Saturn reaches opposition to his natal position. The structures built in the preceding half of the cycle are placed under full review. What stands on solid foundations will be confirmed; what does not will show the cracks that demand attention." },
    jupiter_Conjunction_sun:    { q:"b", h:"Jupiter Exalts the Vital Principle", t:"Jupiter's warm, expansive nature is joined directly with the solar spirit and authority. This marks a season of honour, increase of substance, and distinguished activity — the native's vitality is amplified and opportunities for advancement arrive with unusual generosity. 'Jupiter joined with the Sun increases the native's dignity and fortune.' — Tet. I.V" },
    jupiter_Conjunction_moon:   { q:"b", h:"Jupiter Fills the Vessel",        t:"The Moon governs the bodily principle and popular esteem; Jupiter fills it with warmth and abundance. The native enjoys favour from the public, from women of prominence, and from those of rank. Bodily health flourishes; emotional life is generous and joyful." },
    jupiter_Conjunction_mercury:{ q:"b", h:"Wisdom and Eloquence",             t:"Jupiter enlarges the intellectual gifts of Mercury and turns them toward distinguished ends. The native may achieve recognition through writing, oratory, law, or philosophy. Commerce prospers; communications are fortunate. An excellent period for important agreements and intellectual undertakings." },
    jupiter_Conjunction_venus:  { q:"b", h:"Abundant Grace",                  t:"Two benefics united — this is one of the most auspicious of all transit contacts. Pleasure, beauty, love, and creative activity are all amplified. The native radiates warmth and attraction; social life flourishes, and financial gain through Venusian pursuits is likely." },
    jupiter_Conjunction_mars:   { q:"x", h:"Honour Through Bold Action",      t:"Jupiter softens and ennobles Mars's heat and drive. Military, athletic, or competitive ventures may achieve distinction rather than mere violence. The native's courage is elevated to honourable ambition. Guard that Mars's impulsiveness is not merely magnified rather than refined." },
    jupiter_Conjunction_jupiter:{ q:"b", h:"Jupiter Returns — A New Cycle",   t:"Jupiter returns to his natal position approximately every 12 years, inaugurating a fresh cycle of growth, honour, and philosophical development. Opportunities that align with the native's deepest aspirations tend to arrive at these moments. The themes of the natal Jupiter sign are amplified and renewed for the coming 12-year cycle." },
    jupiter_Conjunction_saturn: { q:"x", h:"Structured Prosperity",           t:"Jupiter's expansion tempers Saturn's restriction; gains are possible but must be earned through sustained effort and responsibility. This is a period for consolidating past labours into genuine advancement. Speculative ventures are less favoured than patient, institutional growth." },
    jupiter_Trine_sun:          { q:"b", h:"Distinguished Honour",            t:"Jupiter in triangular harmony with the vital principle brings the most stable and enduring form of good fortune. The native's authority is recognised; honours, promotions, and advancement in public life arrive naturally. Health is robust; the spirit is generous. 'The trine of Jupiter with the Sun produces the most distinguished and fortunate persons.' — Tet. I.V" },
    jupiter_Trine_moon:         { q:"b", h:"Popular Favour and Abundance",    t:"The warm, expansive beneficence of Jupiter flows easily into the Lunar domain — public life, the body, and the home. The native is well regarded by the many; domestic life is joyful; travel, if undertaken, is prosperous. Bodily vigour is increased." },
    jupiter_Trine_mercury:      { q:"b", h:"Eloquence and Prosperity",        t:"The intellectual faculty is enriched without being overstimulated. Writing, speech, negotiations, and all Mercury-ruled pursuits reach a high and distinguished level. Contracts entered now are likely to be honourable and beneficial; journeys for trade or education are favoured." },
    jupiter_Trine_venus:        { q:"b", h:"Pleasure, Love, and Artistic Grace", t:"Jupiter's generosity harmonises fully with Venus's pleasure and beauty. Social life is abundant and joyful; love affairs are warm and fortunate; artistic and creative works may achieve genuine distinction. Financial gain through Venusian pursuits is strongly favoured." },
    jupiter_Trine_mars:         { q:"b", h:"Noble Courage",                   t:"The fire and drive of Mars are channelled through Jupiter's sense of honour and justice. Athletic achievement, military distinction, and bold ventures undertaken for honourable purposes are all favoured. The native combines the fire of Mars with the wisdom of Jupiter to achieve distinguished results." },
    jupiter_Trine_jupiter:      { q:"b", h:"Fortune's Confirmation",          t:"Jupiter in harmonious aspect to natal Jupiter marks a period of flow, abundance, and philosophical clarity. The native's aspirations find their natural expression; expansion in the areas ruled by natal Jupiter's sign and house comes easily. Generosity given returns multiplied." },
    jupiter_Trine_saturn:       { q:"b", h:"Measured and Enduring Gain",      t:"Jupiter's expansive warmth and Saturn's structural patience unite productively. Slow but solid advancement in career, property, and institutional standing is indicated. The native builds lasting prosperity through a combination of optimism and practical discipline." },
    jupiter_Sextile_sun:        { q:"b", h:"Fortunate Opportunity",           t:"Jupiter casts a friendly ray toward the vital principle, bringing opportunities for advancement and favour from those in authority. The native's good name is enhanced; practical benefits arrive through honest effort and goodwill." },
    jupiter_Sextile_moon:       { q:"b", h:"Domestic and Popular Blessing",   t:"Mild but genuine good fortune in domestic affairs, the body's health, and public esteem. The native is treated generously by the public and those who govern daily life; nourishment — physical and emotional — is readily available." },
    jupiter_Sextile_mercury:    { q:"b", h:"Profitable Communications",       t:"A favourable period for commercial negotiations, correspondence, and intellectual exchanges. The mind is clear and optimistic; agreements entered into tend toward mutual benefit." },
    jupiter_Sextile_venus:      { q:"b", h:"Social Warmth",                   t:"Pleasures multiply without excess; social connections expand pleasantly. A mild but auspicious period for art, entertainment, and the cultivation of new friendships and alliances." },
    jupiter_Sextile_mars:       { q:"b", h:"Energetic Initiative",            t:"Drive and ambition are infused with good judgment and a degree of fortunate support. Initiatives begun now have good prospects; the native possesses both the energy to act and the wisdom to act well." },
    jupiter_Square_sun:         { q:"x", h:"Hubris and Opportunity",          t:"Jupiter's expansiveness presses against the vital principle from a position of tension. Opportunities appear large but may be overestimated; the native may overextend, promise more than can be delivered, or provoke envy through conspicuous success. Guard against the vanity of Jupiter's excesses." },
    jupiter_Square_moon:        { q:"x", h:"Emotional Excess",                t:"The Moon's fluctuating nature is overloaded by Jupiter's exaggeration. Expectations become unrealistic; popular favour may be sought through lavish generosity that ultimately exhausts the native's resources. Domestic extravagance should be restrained." },
    jupiter_Square_mercury:     { q:"x", h:"Grand Plans, Impractical Details", t:"The intellect soars toward ambitious schemes but neglects precision. Agreements may be entered carelessly; contracts should be reviewed with particular thoroughness. Intellectual overconfidence is the primary hazard." },
    jupiter_Square_venus:       { q:"x", h:"Indulgence",                      t:"Pleasures are available but in excess of what is prudent. Financial overindulgence, romantic extravagance, and the cultivation of hollow social pleasures may drain resources. The gift of Jupiter's square is opportunity; the cost is the discipline required to use it wisely." },
    jupiter_Square_mars:        { q:"x", h:"Ambition Outrunning Prudence",    t:"Bold action is undertaken with great enthusiasm but insufficient preparation. The native may overreach in competitive or physical matters, and suffer setbacks proportionate to the excess of confidence. Channel this energy into calculated rather than reckless endeavours." },
    jupiter_Square_jupiter:     { q:"x", h:"Overextension of Fortune",        t:"Jupiter in tense aspect to natal Jupiter magnifies aspirations to the point of impracticality. Review whether recent growth has outpaced the foundations beneath it; consolidation may be more prudent than further expansion for the present." },
    jupiter_Square_saturn:      { q:"x", h:"Growth Versus Obligation",        t:"An internal tension between the desire for expansion and the demands of existing responsibilities. Opportunities for growth arrive, but duties and debts constrain the ability to seize them freely. The native must choose priorities carefully." },
    jupiter_Opposition_sun:     { q:"x", h:"Fortune at Full Extension",       t:"Jupiter's gifts reach their maximum expression — and therefore their most vulnerable point. Honours and opportunities peak, but overconfidence and the envy of others become genuine hazards. Consolidate gains rather than seeking further expansion." },
    jupiter_Opposition_moon:    { q:"x", h:"Popularity and Its Discontents",  t:"Public favour peaks but may attract as much envy as goodwill. Emotional life is expansive — perhaps too expansive. Guard that generosity does not become recklessness, and that public largesse does not exhaust private reserves." },
    jupiter_Opposition_mercury: { q:"x", h:"Ambitious Promises",              t:"Grand intellectual and commercial ventures are announced but the opposing tension means delivery may fall short of the promise. What sounds auspicious may carry hidden costs; be cautious in commitments made during this period." },
    jupiter_Opposition_venus:   { q:"x", h:"Love and Excess",                 t:"Emotional and romantic life reaches a dramatic peak, but opposition introduces imbalance. Relationships may feel simultaneously intensely pleasurable and somehow unsatisfying. Overindulgence in pleasure, luxury, and social display should be moderated." },
    jupiter_Opposition_mars:    { q:"x", h:"Courage and Recklessness",        t:"The fullest tension between Mars's drive and Jupiter's confidence. Bold action may achieve spectacular results or spectacular failures — the margin between heroism and hubris is thin. Competitive ventures should be entered with a clear-eyed assessment of actual capacity." },
    jupiter_Opposition_saturn:  { q:"x", h:"The Great Conjunction Axis",      t:"Jupiter's optimism is in full dialogue with Saturn's restraint. The native must weigh opportunity against obligation, expansion against consolidation. This is a pivotal transit for matters of career, social standing, and long-term strategy." },
    jupiter_Opposition_jupiter: { q:"x", h:"Fortune at the Crossroads",       t:"At the Jupiter half-return (~age 6, 18, 30, 42, 54), the native's aspirations and philosophical assumptions face their most penetrating external test. What has been pursued idealistically is now examined against the reality of results." },
    mars_Conjunction_sun:       { q:"m", h:"Mars Inflames the Vital Spirit",  t:"Mars joins his hot, desiccating nature directly to the solar principle. Fevers, inflammatory conditions, impulsive conflicts with authority, and rash acts that damage the native's standing are all possible. Courage is amplified but easily tips into recklessness. 'Mars in conjunction with the Sun causes headstrong and violent conditions.' — Tet. I.IV" },
    mars_Conjunction_moon:      { q:"m", h:"Mars Heats the Body",             t:"The moist, bodily Moon is directly inflamed by Mars. Fever, inflammatory illness, emotional eruptions, accidents involving the body, and conflict with women of prominence are signified. The native's temper is shortened; guard against impulsive actions in domestic and emotional life." },
    mars_Conjunction_mercury:   { q:"x", h:"Sharp and Contentious Mind",      t:"Mercury's quickness is inflamed by Mars. The native's speech and writing become forceful, cutting, and potentially combative. Disputes in commerce or correspondence are possible; yet this period also favours decisive action in matters requiring both sharpness and speed." },
    mars_Conjunction_venus:     { q:"x", h:"Passionate Desire",               t:"Venus's pleasures are heated to passion and urgency. Romantic and creative life becomes intensely active, sometimes to the point of rashness. Desire that is uncontrolled may lead to scandalous liaisons; channelled, it produces great artistic or amorous vitality." },
    mars_Conjunction_mars:      { q:"m", h:"Mars Returns — Strife Renewed",   t:"Mars returns to his natal position approximately every two years, amplifying the native's natal Mars qualities — courage, aggression, physical drive, and all matters of initiative. A powerful moment for Mars-ruled endeavours; but recklessness brings injury in proportion to the boldness of the excess." },
    mars_Conjunction_jupiter:   { q:"x", h:"Martial Ambition",                t:"Jupiter's honour-seeking instinct is inflamed by Mars's urgency. Ambitious ventures are pursued with great energy; military, athletic, and competitive endeavours may win distinction. The danger is that noble aims are abandoned for the immediate satisfaction of conquest." },
    mars_Conjunction_saturn:    { q:"m", h:"Heat Meets Cold — Explosive",     t:"Mars's heat and Saturn's cold are fundamentally opposed; in conjunction they produce volatile, unpredictable conditions. Long-suppressed anger may erupt; chronic structural problems break open suddenly. All matters involving conflict, authority, and physical safety demand the greatest caution." },
    mars_Trine_sun:             { q:"b", h:"Vigorous Achievement",            t:"Mars's heat and drive flow harmoniously into the solar principle. The native's vitality and authority are strengthened by bold, decisive action. Athletic, military, and competitive ventures undertaken now are likely to succeed. Courage combines with authority to lead." },
    mars_Trine_moon:            { q:"b", h:"Physical Vigour",                 t:"The bodily principle is energised by Mars's warming drive without being inflamed. Physical health and stamina are increased; the native may undertake demanding physical labours with good results. Decisiveness in personal matters is favoured." },
    mars_Trine_mercury:         { q:"b", h:"Decisive Intellect",              t:"The mind is quick, incisive, and bold. Communications have impact; the native may succeed through directness and speed of decision. An auspicious period for writing, debate, and all Mercury-ruled matters requiring both sharpness and energy." },
    mars_Trine_venus:           { q:"b", h:"Creative and Romantic Vitality",  t:"Passion and artistry are united in productive harmony. Love life is active and joyful; creative works have both beauty and force. The native radiates an attractive combination of warmth and vigour." },
    mars_Trine_jupiter:         { q:"b", h:"Honourable Conquest",             t:"Bold action is guided by good judgment; ambitions are both courageous and honourable. Military, athletic, and competitive endeavours are favoured; the native combines the fire of Mars with the wisdom of Jupiter to achieve distinguished results." },
    mars_Trine_saturn:          { q:"x", h:"Disciplined Force",               t:"Mars's drive is channelled through Saturn's structural patience — great physical and mechanical works become possible. The native can sustain demanding effort over long periods. This is a favourable period for engineering, construction, and any work requiring both strength and endurance." },
    mars_Trine_mars:            { q:"b", h:"Confident Initiative",            t:"Mars in harmonious aspect to natal Mars brings a period of natural physical and competitive confidence. The native acts with decisive energy and encounters less resistance than usual. An excellent period for initiating demanding physical undertakings." },
    mars_Sextile_sun:           { q:"b", h:"Animated Authority",              t:"The vital principle receives a mild but energising influence from Mars. The native is more decisive and physically vigorous than usual; leadership opportunities may arise and are handled with appropriate confidence." },
    mars_Sextile_moon:          { q:"b", h:"Bodily Energy",                   t:"A mild increase in physical vitality and personal drive. The native may feel more confident and capable in domestic and personal affairs. Guard that this increased energy does not tip into irritability." },
    mars_Sextile_mercury:       { q:"b", h:"Sharp Communication",             t:"A productive period for writing, negotiation, and all Mercury-ruled matters requiring directness and speed. The native thinks quickly and communicates with impact." },
    mars_Sextile_venus:         { q:"b", h:"Active Pleasures",                t:"Social and romantic life is energised; the native pursues pleasures with more initiative than usual. Creative output benefits from added vitality and boldness." },
    mars_Sextile_jupiter:       { q:"b", h:"Energetic and Fortunate",         t:"Drive and ambition are infused with good timing. Initiatives begun now have good prospects; the native possesses both the energy to act and favourable conditions to support the effort." },
    mars_Sextile_saturn:        { q:"x", h:"Controlled Exertion",             t:"Physical energy and endurance are productively combined. A favourable period for demanding but structured physical work — exercise programmes, building projects, and disciplined athletic training." },
    mars_Square_sun:            { q:"m", h:"Authority Challenged",            t:"Mars presses against the vital principle with heat and contention. Conflicts with those in authority, physical injuries through rashness, inflammatory illness, and damage to the native's dignity through impulsive acts are all possible. Avoid confrontation with persons of power." },
    mars_Square_moon:           { q:"m", h:"Body Afflicted",                  t:"Inflammatory conditions affecting the body, emotional irritability, and conflict in domestic life are indicated. The native's temper may be provoked easily; accidents in the home are possible. Exercise extra care with all physical activities." },
    mars_Square_mercury:        { q:"m", h:"Contentious Communications",      t:"Disputes, misunderstandings, and argumentative exchanges in commerce and correspondence are likely. Guard your words carefully — what is said impulsively may cause lasting damage to important relationships and agreements." },
    mars_Square_venus:          { q:"m", h:"Turbulent Desire",                t:"Romantic life is fraught with impatience, jealousy, or rash action. Financial matters involving pleasures and luxuries are subject to impulsive decisions. Artistic endeavours may suffer from a lack of patience and refinement." },
    mars_Square_mars:           { q:"m", h:"Strife and Accident",             t:"Mars in tense aspect to natal Mars indicates a period of heightened accident risk, conflict, and physical challenge. The native's aggression or the aggression of others may create harmful situations. Deliberate caution in all physical and competitive matters is essential." },
    mars_Square_jupiter:        { q:"m", h:"Reckless Ambition",               t:"Bold ambitions encounter friction — the more recklessly they are pursued, the greater the setback. Competitive ventures begun now may overreach; legal matters involving institutions or authority may be troublesome." },
    mars_Square_saturn:         { q:"m", h:"Volatile Obstruction",            t:"Mars's hot impatience meets Saturn's cold obstruction in sharp conflict. Chronic frustrations boil over; dangerous situations arise through the combination of urgency and rigid constraint. Accidents, injuries, and confrontations with authority are heightened possibilities." },
    mars_Opposition_sun:        { q:"m", h:"Open Conflict with Authority",    t:"Mars directs his full heat and combative force against the solar principle — the native's vitality, dignity, and authority face direct challenge from others. Enemies act openly; fever, inflammatory illness, and public conflicts with persons of power are all heightened. Discretion is essential." },
    mars_Opposition_moon:       { q:"m", h:"The Body Under Attack",           t:"The bodily Moon is directly opposed by Mars's destructive heat. Inflammatory illness, fever, accidents involving the body, and open conflict with women of prominence are all signified. 'By opposition, Mars inflicts upon the body the full force of his burning nature.' — Tet. I.XVI" },
    mars_Opposition_mercury:    { q:"m", h:"Open Disputes",                   t:"Conflicts in communication, commerce, and intellectual matters reach a climax. Legal disputes, public arguments, and the deliberate distortion of the native's words by adversaries are all possible. Avoid commitments or contracts during this period." },
    mars_Opposition_venus:      { q:"m", h:"Passion and Conflict",            t:"Romantic and creative life reaches a point of maximum tension. Passionate desires generate open conflict rather than pleasure; jealousy, rivalry, and the rash dissolution of relationships are possible hazards." },
    mars_Opposition_jupiter:    { q:"m", h:"Ambition Meets Open Resistance",  t:"Bold ventures encounter direct and forceful opposition. The native's reach has exceeded its grasp; external forces challenge overextended ambitions. Competitive setbacks and legal challenges to honourable enterprises are possible." },
    mars_Opposition_saturn:     { q:"m", h:"Maximum Malefic Tension",         t:"Mars and Saturn in diametrical opposition represent the most dangerous of all malefic transits. Violence born of frustrated restraint, serious physical injury, and devastating conflict with authority are all greatly elevated possibilities. Retreat is far wiser than confrontation." },
    mars_Opposition_mars:       { q:"m", h:"Martial Crisis",                  t:"The native's natal Mars qualities are placed under direct external siege. Others challenge the native's competitive position, physical territory, or personal autonomy forcefully. Great care in all physical and confrontational matters is essential." },
    venus_Conjunction_sun:      { q:"b", h:"Beauty and Warmth of Spirit",     t:"Venus joins her warm, moist nature to the solar spirit — pleasure, beauty, and creative expression are amplified. The native may be especially attractive and socially adept; artistic endeavours and romantic initiatives are favoured. Honours may arrive through Venusian pursuits." },
    venus_Conjunction_moon:     { q:"b", h:"Joyful Bodily Life",              t:"Two moist, feminine planets united — domestic life, emotional warmth, beauty, and sensual pleasure are all increased. The native enjoys popularity, physical wellbeing, and harmonious relationships with women. A favourable period for beauty, the arts, and the cultivation of pleasure." },
    venus_Conjunction_mercury:  { q:"b", h:"Charming Intellect",              t:"The intellectual faculty of Mercury is graced with Venus's warmth and social appeal. The native communicates with charm and elegance; artistic and social communications are especially fortunate. A favourable period for poetry, music, and the art of persuasion." },
    venus_Trine_sun:            { q:"b", h:"Grace and Favour",                t:"Venus in harmonious triangular aspect to the vital principle bestows an easy, magnetic charm. Social life is joyful; artistic and romantic endeavours flow naturally toward success. Honours through pleasing, creative, and graceful activities are indicated." },
    venus_Trine_moon:           { q:"b", h:"Domestic Harmony",                t:"A warm, pleasant period for domestic life, relationships with women, and all bodily pleasures. The native enjoys a natural social ease and physical attractiveness that opens doors and smooths personal relationships." },
    venus_Sextile_sun:          { q:"b", h:"Social Grace",                    t:"A mild but pleasing influence that lightens the native's social presence and opens small opportunities for pleasure and artistic expression. Goodwill is generated easily; minor social successes come without great effort." },
    venus_Square_sun:           { q:"x", h:"Pleasures and Duty at Odds",      t:"Venus's desire for beauty and pleasure is in tension with the vital principle. Romantic or creative projects encounter friction; indulgence may interfere with the native's dignity or practical obligations. Balance pleasure-seeking with attention to duty." },
    venus_Opposition_sun:       { q:"x", h:"Love and Authority at Odds",      t:"The native's social and romantic impulses are in full dialogue with — and tension against — their authority and dignity. Relationships or pleasures may demand attention at the cost of professional standing." },
    mercury_Conjunction_sun:    { q:"x", h:"Cazimi — Mind and Spirit United", t:"Mercury joined to the Sun's heart within 17 minutes of arc is said to be in cazimi and greatly fortified. The native's intellectual faculties are aligned with their vital purpose; communications, commerce, and intellectual projects receive extraordinary clarity and momentum." },
    mercury_Conjunction_moon:   { q:"x", h:"Quickened Responses",             t:"The mind and the body's fluctuating rhythms are directly linked. The native may experience a rapid, almost intuitive flow of ideas, though the mind may also be susceptible to the Moon's changing moods. Communications about personal and domestic matters are highlighted." },
    mercury_Trine_sun:          { q:"b", h:"Eloquence Serves Authority",      t:"Intellectual gifts flow in natural support of the native's vitality and public position. An excellent period for communications that enhance the native's standing — writing, oratory, negotiations, and all Mercury-ruled pursuits that serve the native's overall purpose." },
    mercury_Square_sun:         { q:"x", h:"Mind and Will at Odds",           t:"The intellectual and communicative faculty is in tension with the native's core purpose and vitality. The mind may work against the body, or communications may inadvertently damage the native's position. Clarity about what is actually being communicated is essential." },
    sun_Conjunction_moon:       { q:"x", h:"New Lunation — Impulse Joined",   t:"The solar and lunar principles are united at the new Moon phase. The vital, authoritative impulse of the Sun is joined to the bodily and fluctuating principle of the Moon — a natural beginning point for any initiative that requires both spirit and material substance." },
    sun_Opposition_moon:        { q:"x", h:"Full Illumination",               t:"The solar and lunar principles are in full diametrical tension — the Full Moon phase. What has been growing since the preceding New Moon reaches its maximum expression and faces its most revealing scrutiny. Emotional life is vivid; events come to public light." },
    sun_Trine_moon:             { q:"b", h:"Vital and Bodily Harmony",        t:"The solar spirit and lunar body are in easy, harmonious accord. The native's inner and outer life flow together naturally; health, emotional wellbeing, and public esteem all benefit from this alignment." },
    sun_Square_moon:            { q:"x", h:"Vital and Bodily Tension",        t:"The solar principle and the bodily-lunar principle are at cross-purposes. The native may feel torn between public duties and personal needs, or between the spirit's aspirations and the body's demands. Health matters deserve attention." },
  };
  const TI_QUAL = { b:"benefic", m:"malefic", x:"mixed" };

  function getTransitInterp(transiter, aspectName, natal) {
    const key = `${transiter}_${aspectName}_${natal}`;
    const e   = TI[key];
    if (e) return { quality: TI_QUAL[e.q], title: e.h, text: e.t };
    const NATURES = {
      saturn:  { q:"malefic",  adj:"cold, dry, and contracting" },
      jupiter: { q:"benefic",  adj:"warm, moist, and expansive" },
      mars:    { q:"malefic",  adj:"hot, dry, and martial" },
      venus:   { q:"benefic",  adj:"warm, moist, and pleasurable" },
      mercury: { q:"mixed",    adj:"swift and intellectual" },
      sun:     { q:"mixed",    adj:"vital and authoritative" },
      moon:    { q:"mixed",    adj:"fluctuating and bodily" },
    };
    const NATAL_SIG = {
      sun:     "vital force, authority, and the spirit",
      moon:    "the body, popular esteem, and fluctuating fortune",
      mercury: "the intellect, commerce, and communications",
      venus:   "pleasure, beauty, and affective bonds",
      mars:    "courage, strife, and physical initiative",
      jupiter: "honour, fortune, and generous activity",
      saturn:  "discipline, endurance, and the obligations of life",
    };
    const ASP_DESC = {
      Conjunction: "directly upon", Trine: "in harmonious triangular aspect to",
      Sextile: "in mild hexagonal accord with", Square: "in sharp quartile conflict with",
      Opposition: "in diametrical opposition to",
    };
    const nat  = NATURES[transiter] || { q:"mixed", adj:"variable" };
    const ns   = NATAL_SIG[natal]   || ("natal " + natal);
    const aa   = ASP_DESC[aspectName] || "aspecting";
    const easy = ["Trine","Sextile"].includes(aspectName);
    const hard = ["Square","Opposition"].includes(aspectName);
    const qual = (nat.q === "benefic" && !hard) ? "benefic"
               : (nat.q === "malefic" && !easy)  ? "malefic" : "mixed";
    const effect = qual === "benefic" ? "brings opportunities and benefits to"
                 : qual === "malefic" ? "places demands and afflictions upon"
                 : "brings a complex mixture of challenge and opportunity to";
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    return {
      quality: qual,
      title:   `${cap(transiter)} ${aspectName} natal ${cap(natal)}`,
      text:    `Transiting ${transiter}, ${nat.adj} in nature, applies ${aa} your natal ${natal}, which governs ${ns}. This transit ${effect} the affairs of ${ns}. "The nature of the star prevailing in the configuration determines the character of the effect." — Tet. I.IV`,
    };
  }

  function renderTransits() {
    const noChartEl  = app.querySelector('#pa-transit-no-chart');
    const contentEl  = app.querySelector('#pa-transit-content');
    const dateLabel  = app.querySelector('#pa-transit-date');
    const listEl     = app.querySelector('#pa-transit-list');
    const canvas     = app.querySelector('#pa-transit-wheel');
    const digestWrap = app.querySelector('#pa-weekly-digest');
    const digestList = app.querySelector('#pa-digest-list');

    initNotifBanner();

    if (!currentChart) {
      noChartEl.style.display = '';
      contentEl.style.display = 'none';
      digestWrap.style.display = 'none';
      ctx2blank(canvas);
      return;
    }
    noChartEl.style.display = 'none';
    contentEl.style.display = '';

    const today  = new Date();
    const lat    = currentChart.lat;
    const lon    = currentChart.lon;
    const source = currentChart.source || 'ibnshatir';
    dateLabel.textContent = today.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });

    // Build 7-day digest
    const digest = buildWeekDigest(lat, lon, source);
    if (digest.length > 0) {
      digestWrap.style.display = '';
      const dayNames = ['Today','Tomorrow','Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      digestList.innerHTML = digest.map(({ d, date, tr, n, aspect }) => {
        const label = d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
        const col   = aspect.harmony === 'easy' ? '#66dd88' : aspect.harmony === 'hard' ? '#ff6644' : '#aaaaaa';
        const exact = aspect.orb < 0.5 ? ' <span style="font-size:9px;background:#c8960a22;color:#f0c030;padding:1px 5px;border-radius:8px;border:1px solid #c8960a44">EXACT</span>' : '';
        return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
          <span style="font-size:10px;color:var(--muted);min-width:70px">${label}</span>
          <span style="color:#88ccee;font-size:13px">${tr.symbol||tr.name}</span>
          <span style="color:${aspect.color};font-size:13px">${aspect.symbol}</span>
          <span style="font-size:11px;color:var(--fg)">natal ${n.symbol||n.name}</span>
          <span style="font-size:10px;color:var(--muted);flex:1">${tr.name} ${aspect.name} ${n.name}</span>
          <span style="font-size:10px;color:${col}">${aspect.orb.toFixed(1)}°</span>${exact}
        </div>`;
      }).join('');
    } else {
      digestWrap.style.display = 'none';
    }

    let transitChart;
    try {
      transitChart = computeFullChart(today, lat, lon, source);
    } catch (err) {
      console.error('Transit chart error:', err);
      return;
    }

    drawChartWheel(canvas, currentChart, {
      outerChart: transitChart,
      outerColor: '#88ccee',
      label: 'Now',
    });

    const natalPlanets     = currentChart.planets.map((p) => ({ name: p.name, lon: p.lon, symbol: p.symbol }));
    const transitingPlanets = transitChart.planets.map((p) => ({ name: p.name, lon: p.lon, symbol: p.symbol }));
    const crossAsp = computeCrossAspects(natalPlanets, transitingPlanets);
    crossAsp.sort((a, b) => a.aspect.orb - b.aspect.orb);
    maybeNotifyTransits(crossAsp, currentChart._name);

    // Compute tomorrow's transiting positions for applying/separating detection
    const orbTomMap = new Map();
    try {
      const tom = new Date(today); tom.setDate(tom.getDate() + 1);
      const tomChart = computeFullChart(tom, lat, lon, source);
      const tomAsp = computeCrossAspects(natalPlanets,
        tomChart.planets.map((p) => ({ name: p.name, lon: p.lon, symbol: p.symbol })));
      for (const { natal: n2, transiting: t2, aspect: a2 } of tomAsp) {
        orbTomMap.set(`${t2.name}_${a2.name}_${n2.name}`, a2.orb);
      }
    } catch (_) {}

    // Lazy transit window cache: key -> { exactDate, startDate, endDate }
    const windowCache = new Map();

    function computeTransitWindow(trName, nLon, aspAngle, maxOrb) {
      const STEP = 2; // days
      const RANGE = 60;
      const hits = [];
      for (let d = -RANGE; d <= RANGE; d += STEP) {
        try {
          const scanDate = new Date(today);
          scanDate.setDate(scanDate.getDate() + d);
          const sc   = computeFullChart(scanDate, lat, lon, source);
          const tp   = sc.planets.find((p) => p.name === trName);
          if (!tp) continue;
          const diff = Math.abs(((tp.lon - nLon + 540) % 360) - 180);
          const orb  = Math.abs(diff - aspAngle);
          if (orb <= maxOrb) hits.push({ d, date: new Date(scanDate), orb });
        } catch (_) {}
      }
      if (!hits.length) return null;
      const exact     = hits.reduce((a, b) => (b.orb < a.orb ? b : a));
      const startDate = hits[0].date;
      const endDate   = hits[hits.length - 1].date;
      return { exactDate: exact.date, startDate, endDate };
    }

    function fmtShort(d) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    if (crossAsp.length === 0) {
      listEl.innerHTML = '<div style="color:var(--muted);font-size:12px">No major transits within orb today.</div>';
      return;
    }

    listEl.innerHTML = crossAsp.map(({ natal: n, transiting: tr, aspect }, idx) => {
      const harmCls  = `pa-transit-${aspect.harmony === 'easy' ? 'easy' : aspect.harmony === 'hard' ? 'hard' : ''}`;
      const interp   = getTransitInterp(tr.name, aspect.name, n.name);
      const qCol     = interp.quality === 'benefic' ? '#66dd88' : interp.quality === 'malefic' ? '#ff6644' : '#aaaaaa';
      const harmCol  = aspect.harmony === 'easy' ? '#66dd88' : aspect.harmony === 'hard' ? '#ff6644' : '#aaaaaa';
      const uid      = `ti-${idx}`;
      const maxOrb   = moietyOrb(tr.name, n.name);
      const fill     = Math.max(0.03, 1 - aspect.orb / maxOrb); // 0–1
      const tomOrb   = orbTomMap.get(`${tr.name}_${aspect.name}_${n.name}`);
      const applying = tomOrb !== undefined ? tomOrb < aspect.orb : null;
      const dirLabel = applying === null ? ''
        : applying
          ? `<span style="font-size:9px;color:#88ccee;letter-spacing:0.5px">▲ applying</span>`
          : `<span style="font-size:9px;color:var(--muted);letter-spacing:0.5px">▽ separating</span>`;

      return `
        <div class="pa-transit-row ${harmCls}" style="flex-direction:column;align-items:stretch;padding:0;overflow:hidden">
          <div class="pa-ti-hdr" data-uid="${uid}" data-tr="${tr.name}" data-nlon="${n.lon.toFixed(4)}" data-ang="${aspect.angle}" data-maxorb="${maxOrb.toFixed(2)}" style="display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;user-select:none">
            <span style="color:#88ccee;font-size:14px">${tr.symbol||'?'}</span>
            <span style="color:var(--muted);font-size:10px">transit</span>
            <span style="color:${aspect.color};font-size:13px">${aspect.symbol}</span>
            <span style="color:var(--fg)">natal ${n.symbol||'?'}</span>
            <span style="color:var(--muted);font-size:11px;flex:1">${tr.name} ${aspect.name} ${n.name}</span>
            ${dirLabel}
            <span style="color:var(--muted);font-size:11px">orb ${aspect.orb.toFixed(1)}\xb0</span>
            <span style="font-size:10px;padding:1px 5px;border-radius:3px;background:rgba(0,0,0,0.3);color:${harmCol}">${aspect.harmony}</span>
            <span class="pa-ti-chev" data-uid="${uid}" style="font-size:10px;color:var(--muted);margin-left:4px;transition:transform 0.2s">▶</span>
          </div>
          <div style="height:3px;background:rgba(255,255,255,0.06)">
            <div style="height:3px;width:${(fill*100).toFixed(1)}%;background:${harmCol};opacity:0.7;transition:width 0.4s"></div>
          </div>
          <div id="${uid}" style="display:none;padding:10px 14px 14px;border-top:1px solid rgba(255,255,255,0.04);background:rgba(0,0,0,0.2)">
            <div id="dur-${uid}" style="font-size:10px;color:var(--muted);margin-bottom:8px;letter-spacing:0.3px">···</div>
            <div style="font-size:12px;font-weight:600;color:${qCol};margin-bottom:6px;font-family:var(--font-greek)">${interp.title}</div>
            <div style="font-size:11px;color:var(--muted);line-height:1.7">${interp.text}</div>
          </div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.pa-ti-hdr').forEach(hdr => {
      hdr.addEventListener('click', () => {
        const uid   = hdr.dataset.uid;
        const panel = listEl.querySelector('#' + uid);
        const chev  = listEl.querySelector('.pa-ti-chev[data-uid="' + uid + '"]');
        const open  = panel.style.display !== 'none';
        panel.style.display = open ? 'none' : '';
        if (chev) chev.style.transform = open ? '' : 'rotate(90deg)';

        // Lazy duration computation on first open
        if (!open) {
          const durEl = listEl.querySelector('#dur-' + uid);
          if (durEl && durEl.textContent === '···') {
            if (windowCache.has(uid)) {
              const w = windowCache.get(uid);
              durEl.innerHTML = w;
            } else {
              const trName  = hdr.dataset.tr;
              const nLon    = parseFloat(hdr.dataset.nlon);
              const aspAng  = parseFloat(hdr.dataset.ang);
              const maxOrbV = parseFloat(hdr.dataset.maxorb);
              setTimeout(() => {
                const win = computeTransitWindow(trName, nLon, aspAng, maxOrbV);
                let html = '';
                if (win) {
                  const exStr  = fmtShort(win.exactDate);
                  const actStr = `${fmtShort(win.startDate)} – ${fmtShort(win.endDate)}`;
                  const isToday = win.exactDate.toDateString() === today.toDateString();
                  const exLabel = isToday ? '<span style="color:#f0c030">exact today</span>' : `exact ${exStr}`;
                  html = `${exLabel} &nbsp;·&nbsp; active <span style="color:var(--fg)">${actStr}</span>`;
                } else {
                  html = 'active now';
                }
                windowCache.set(uid, html);
                if (durEl) durEl.innerHTML = html;
              }, 0);
            }
          }
        }
      });
    });
  }

  app.querySelector('#pa-transit-refresh')?.addEventListener('click', renderTransits);

  // ── Fixed Stars tab ───────────────────────────────────────────────────────
  // FIXED_STARS catalogue is provided by js/core/fixedStars.js (Guide 08).
  // Inline list removed — precession is now applied per chart date via
  // fixedStarsAt(date). Use STAR_CATALOG for the raw J2000 entries.

  function locateFixedStar(starId) {
    const c = model.computed;
    let angles = null;
    for (const list of [c.CelNavStars, c.CataloguedStars, c.BlackHoles, c.Quasars, c.Galaxies, c.CelTheoStars]) {
      if (!list) continue;
      const f = list.find(x => x.id === starId);
      if (f) { angles = f.anglesGlobe || null; break; }
    }
    if (!angles || angles.elevation < 0) {
      alert(`${starId.charAt(0).toUpperCase() + starId.slice(1)} is currently below the horizon.`);
      return;
    }
    hide();
    model.setState({
      InsideVault: true,
      FollowTarget: 'star:' + starId,
      ObserverHeading: ((angles.azimuth % 360) + 360) % 360,
      CameraHeight: Math.max(0, Math.min(89.9, angles.elevation)),
    });
  }

  function renderStars() {
    const el = app.querySelector('#pa-stars-content');
    // Re-render each call: precessed positions depend on currentChart.date.
    delete el.dataset.rendered;

    const hasChart = !!(currentChart?.planets);
    const refDate  = currentChart?.date || new Date();
    const stars    = fixedStarsAt(refDate);   // precessed to chart date (PART 16.1)
    const ORB = 1.5; // conjunction orb in degrees (display)

    function conjunctions(starLon) {
      if (!hasChart) return [];
      return currentChart.planets.filter(p => {
        const diff = Math.abs(((p.lon - starLon + 540) % 360) - 180);
        return diff <= ORB;
      }).map(p => {
        const diff = ((p.lon - starLon + 540) % 360) - 180;
        const dir  = diff >= 0 ? 'applying' : 'separating';
        return { p, orb: Math.abs(diff).toFixed(2), dir };
      });
    }

    // PART 16.1 — direct contact only for stars within ±8° belt
    const tightConj = hasChart ? starPlanetConjunctions(currentChart.planets, refDate, 1) : [];
    const wsAspects = hasChart ? starPlanetWholeSignAspects(currentChart.planets, refDate) : [];

    const quoteBar = `<div class="pa-ptolemy-quote" style="margin-bottom:14px">"The power of each star is found in the nature of the planets whose character it resembles." — Tetrabiblos I.9</div>`;

    const summaryPanel = hasChart
      ? `<div style="margin-bottom:14px;padding:10px 12px;background:rgba(212,184,120,0.06);border:1px solid rgba(212,184,120,0.18);border-radius:4px">
          <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Current conjunctions (≤1°, ±8° belt) · whole-sign aspects (PART 16.3)</div>
          <div style="font-size:11px;color:#bbb">
            ${tightConj.length
              ? tightConj.map(c => `<span style="color:#ffd060">${c.planet} ⚹ ${c.star}</span> <span style="color:var(--muted)">(${c.sepDeg.toFixed(2)}°)</span>`).join(' · ')
              : '<span style="color:var(--muted)">No direct contacts within 1°.</span>'}
          </div>
          <div style="font-size:11px;color:#bbb;margin-top:4px">
            ${wsAspects.length
              ? wsAspects.slice(0, 14).map(a => `<span>${a.planet} · ${a.star} <span style="color:var(--muted)">(${a.signDiff} signs)</span></span>`).join(' · ')
              : ''}
          </div>
        </div>`
      : '';

    const cards = stars.map(star => {
      const conj = conjunctions(star.lon);
      const zod  = lonToZodiac(star.lon);
      const conjHtml = conj.length === 0
        ? (hasChart ? `<div style="font-size:10px;color:var(--muted);margin-top:6px">No natal conjunction within ${ORB}°</div>` : '')
        : conj.map(({ p, orb, dir }) => {
            const col = PLANET_COLORS[p.name] || '#aaa';
            return `<div style="margin-top:6px;padding:6px 10px;background:rgba(200,150,10,0.10);border-left:3px solid #c8960a;border-radius:4px;font-size:11px">
              <span style="color:${col}">${p.symbol||p.name}</span> <b style="color:#f0c030">${p.name}</b> conjunct ${star.name}
              — orb ${orb}° (${dir})
              <div style="margin-top:4px;color:var(--muted);font-size:10px;line-height:1.55">This conjunction amplifies the ${star.nature} nature of ${star.name} through the lens of ${p.name}. Traditional astrology marks this as one of the most significant fixed star contacts in the nativity.</div>
            </div>`;
          }).join('');

      const locateBtn = star.starId
        ? `<button class="pa-btn" data-locate-star="${star.starId}" style="margin-top:10px;font-size:11px;padding:4px 12px;background:rgba(30,90,160,0.25);border:1px solid rgba(80,160,255,0.4);color:#88bbff;border-radius:5px;cursor:pointer">🔭 Locate in Sky</button>`
        : '';
      const natureText = Array.isArray(star.nature) ? star.nature.join(' / ') : (star.nature || '');
      const beltTag = star.inZodiacalBelt
        ? '<span style="font-size:9px;color:#a8d888;margin-left:6px;padding:1px 5px;border:1px solid rgba(168,216,136,0.35);border-radius:3px">±8° belt</span>'
        : '<span style="font-size:9px;color:#888;margin-left:6px;padding:1px 5px;border:1px solid rgba(120,120,120,0.35);border-radius:3px">aspectual only</span>';
      const driftNote = `<span style="font-size:9px;color:#666;margin-left:6px">J2000: ${star.lon2000.toFixed(2)}°</span>`;
      return `<div style="margin-bottom:16px;padding:14px 16px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.08)">
        <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:6px;flex-wrap:wrap">
          <span style="font-size:16px;font-weight:700;color:#f0d060;font-family:var(--font-greek)">${star.name}</span>
          <span style="font-size:11px;color:var(--muted)">${star.nick || ''}</span>
          ${beltTag}
          <span style="margin-left:auto;font-size:10px;color:#888">${zod.sign} ${zod.deg}°${zod.min.toString().padStart(2,'0')}' · mag ${star.mag > 0 ? '+' : ''}${star.mag}${driftNote}</span>
        </div>
        <div style="font-size:10px;color:#c8960a;margin-bottom:6px;letter-spacing:0.4px">Nature: ${natureText}</div>
        <div style="font-size:11px;color:var(--muted);line-height:1.65">${star.lore || star.note || ''}</div>
        ${conjHtml}
        ${locateBtn}
      </div>`;
    }).join('');

    el.innerHTML = quoteBar +
      `<div style="font-size:11px;color:var(--muted);margin-bottom:12px">` +
        (hasChart
          ? `Showing natal conjunctions within ${ORB}° for <b style="color:var(--fg)">${currentChart._name||'your chart'}</b>. Longitudes precessed at 1.396°/century (PART 16.1).`
          : `Draw a natal chart to see your fixed star conjunctions. Longitudes precessed to ${refDate.getUTCFullYear()}.`) +
      `</div>` + summaryPanel + cards;

    el.querySelectorAll('[data-locate-star]').forEach(btn => {
      btn.addEventListener('click', () => locateFixedStar(btn.dataset.locateStar));
    });
  }

  // ── Synastry report copy ──────────────────────────────────────────────────
  app.querySelector('#pa-syn-report').addEventListener('click', () => {
    const scoreEl = app.querySelector('#pa-compat-label');
    const breakEl = app.querySelector('#pa-compat-breakdown');
    const aspList = app.querySelector('#pa-syn-aspect-list');
    const selA    = app.querySelector('#pa-syn-a');
    const selB    = app.querySelector('#pa-syn-b');
    const nameA   = selA.options[selA.selectedIndex]?.text || 'Person A';
    const nameB   = selB.options[selB.selectedIndex]?.text || 'Person B';

    if (!aspList.children.length) {
      alert('Run a comparison first (click Compare).'); return;
    }

    const aspects = [...aspList.querySelectorAll('.pa-transit-row')].map(r => r.textContent.trim().replace(/\s+/g,' ')).join('\n');
    const score   = scoreEl?.textContent || '';
    const breakdown = breakEl?.textContent || '';
    const date    = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});

    const report =
`PTOLEMAIC SYNASTRY REPORT
Generated: ${date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${nameA}  ×  ${nameB}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMPATIBILITY: ${score}
${breakdown}

CROSS-ASPECTS
─────────────────────────────────────────────────
${aspects}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by Ptolemaic Astrology (Tetrabiblos method)
"The configuration of the stars at the moment of birth indicates the nature of the soul." — Tet. III.I
`;

    navigator.clipboard.writeText(report).then(() => {
      const btn = app.querySelector('#pa-syn-report');
      btn.textContent = '✓ Copied!';
      setTimeout(() => { btn.textContent = '📋 Copy Report'; }, 2000);
    }).catch(() => {
      // Fallback: show in textarea
      const ta = document.createElement('textarea');
      ta.value = report; ta.style.cssText = 'position:fixed;top:20%;left:10%;width:80%;height:60%;z-index:9999;background:#1a1408;color:#f2e6b8;padding:12px;border:1px solid #c8960a;border-radius:8px;font-size:11px';
      document.body.appendChild(ta); ta.select();
      const close = document.createElement('button');
      close.textContent='Close'; close.style.cssText='position:fixed;top:18%;left:10%;z-index:10000;background:#c8960a;color:#000;padding:4px 12px;border:none;border-radius:4px;cursor:pointer';
      close.onclick = () => { ta.remove(); close.remove(); };
      document.body.appendChild(close);
    });
  });

  // ── Zodiac wheel SVG builder (used in Modernity tab) ─────────────────────
  // ── Ptolemaic wheel: neon Houses-style, zodiac ring only ────────────────
  function makePtolNeonWheel(chartData) {
    const cx=260,cy=260,DEG=Math.PI/180;
    const RO=244,RS=226,RI=176,RPL=118,RH=108;
    const polar=(a,r)=>[cx+r*Math.cos(a*DEG),cy+r*Math.sin(a*DEG)];
    const sector=(a1,a2,ro,ri)=>{
      const[x1,y1]=polar(a1,ro),[x2,y2]=polar(a2,ro),[x3,y3]=polar(a2,ri),[x4,y4]=polar(a1,ri);
      return `M${x1},${y1} A${ro},${ro} 0 0,1 ${x2},${y2} L${x3},${y3} A${ri},${ri} 0 0,0 ${x4},${y4} Z`;
    };
    const lineR=(a,r1,r2)=>{const[x1,y1]=polar(a,r1),[x2,y2]=polar(a,r2);return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"`;};
    const CUSP=Array.from({length:12},(_,i)=>((180-i*30)+360)%360);
    const HCEN=CUSP.map(c=>{let m=c-15;return m<0?m+360:m;});
    const EN=['#ff6e28','#a8d820','#44b4ff','#22ddb0'];
    const EB=['#1c0d04','#0c1204','#080c1a','#081512'];
    const ES=['#5a2406','#283c0e','#182040','#103022'];
    const EF=['pnf','pne','pna','pnw'];
    let p=[];
    const mkF=(id,col,sd,sx)=>`<filter id="${id}" x="${sx}" y="${sx}" width="${100-2*parseInt(sx)}%" height="${100-2*parseInt(sx)}%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="${sd}" result="b"/><feFlood flood-color="${col}" flood-opacity="0.9" result="c"/><feComposite in="c" in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
    p.push('<defs>'+mkF('pnf','#ff6e28',4,'-60%')+mkF('pne','#a8d820',4,'-60%')+mkF('pna','#44b4ff',4,'-60%')+mkF('pnw','#22ddb0',4,'-60%')+mkF('png','#f0c030',5,'-80%')+mkF('pnc','#c89020',8,'-100%')+'</defs>');
    const DR=[3.2,3.5,2.9,3.8,3.1,3.6,2.8,3.4,3.0,3.7,2.7,3.3];
    const DL=[0,0.4,0.8,1.2,1.6,0.2,0.6,1.0,1.4,1.8,0.3,0.7];
    let css='<style>';
    for(let i=0;i<12;i++){css+=`.pns${i}{animation:pnp${i} ${DR[i]}s ease-in-out ${DL[i]}s infinite;}@keyframes pnp${i}{0%,100%{opacity:0}50%{opacity:0.22}}`;}
    css+='.pnca{animation:pncn 4.2s ease-in-out infinite;}@keyframes pncn{0%,100%{opacity:.42}50%{opacity:.95}}';
    css+='</style>';
    p.push(css);
    p.push(`<circle cx="${cx}" cy="${cy}" r="${RO+6}" fill="#07060a" stroke="#2a2014" stroke-width="2"/>`);
    for(let t=0;t<72;t++){const a=t*5,maj=t%6===0;p.push(`${lineR(a,RO+4,maj?RO-4:RO-2)} stroke="${maj?'#6a480e':'#22200a'}" stroke-width="${maj?1:0.4}"/>`);}
    p.push(`<circle cx="${cx}" cy="${cy}" r="${RO}" fill="none" stroke="#3a2c12" stroke-width="0.8"/>`);
    for(let i=0;i<12;i++){const a1=CUSP[i],a2=((CUSP[i]-30)+360)%360;p.push(`<path d="${sector(a1,a2,RS,RI)}" fill="${EB[i%4]}" stroke="${ES[i%4]}" stroke-width="0.6"/>`);}
    const ZSYM=[
      `<g style="filter:drop-shadow(0 0 3px #ff7830) drop-shadow(0 0 6px #ff5010)"><path d="M 65 30 Q 50 18 36 30 Q 22 42 36 54 Q 50 42 65 30 Z" fill="none" stroke="#ff9040" stroke-width="2.2"/><path d="M 65 30 Q 80 18 94 30 Q 108 42 94 54 Q 80 42 65 30 Z" fill="none" stroke="#ff9040" stroke-width="2.2"/><line x1="65" y1="30" x2="65" y2="70" stroke="#cc6020" stroke-width="1.6"/><circle cx="36" cy="54" r="4.5" fill="#1a0804" stroke="#ff9040" stroke-width="1.4"/><circle cx="94" cy="54" r="4.5" fill="#1a0804" stroke="#ff9040" stroke-width="1.4"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #a0e030) drop-shadow(0 0 6px #70b010)"><circle cx="65" cy="52" r="22" fill="none" stroke="#b0e840" stroke-width="2"/><path d="M 43 36 Q 55 24 65 28 Q 75 24 87 36" fill="none" stroke="#d0ff60" stroke-width="2.2"/><line x1="43" y1="36" x2="38" y2="30" stroke="#80c020" stroke-width="1.5"/><line x1="87" y1="36" x2="92" y2="30" stroke="#80c020" stroke-width="1.5"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #38b0ff) drop-shadow(0 0 6px #1880d0)"><line x1="50" y1="20" x2="50" y2="72" stroke="#40b8ff" stroke-width="2.2"/><line x1="80" y1="20" x2="80" y2="72" stroke="#40b8ff" stroke-width="2.2"/><line x1="50" y1="20" x2="80" y2="20" stroke="#80d8ff" stroke-width="1.5"/><line x1="50" y1="72" x2="80" y2="72" stroke="#80d8ff" stroke-width="1.5"/><circle cx="50" cy="20" r="4" fill="#041018" stroke="#40b8ff" stroke-width="1.4"/><circle cx="80" cy="20" r="4" fill="#041018" stroke="#40b8ff" stroke-width="1.4"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #18d8a8) drop-shadow(0 0 6px #10b888)"><path d="M 30 50 Q 40 35 55 42 Q 65 48 65 38 Q 65 28 75 28 Q 88 28 90 42 Q 92 55 78 58 Q 65 62 55 55 Q 42 48 30 55 Q 22 60 28 70" fill="none" stroke="#20e0b0" stroke-width="2"/><path d="M 100 42 Q 90 57 75 50 Q 65 44 65 54 Q 65 64 55 64 Q 42 64 40 50 Q 38 37 52 34 Q 65 30 75 37 Q 88 44 100 37 Q 108 32 102 22" fill="none" stroke="#10c090" stroke-width="1.6"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #ff7830) drop-shadow(0 0 6px #ff5010)"><circle cx="65" cy="44" r="18" fill="#1a0800" stroke="#ff9040" stroke-width="1.8"/><circle cx="65" cy="44" r="11" fill="#280c00" stroke="#ffb860" stroke-width="1.1"/><circle cx="65" cy="44" r="5" fill="#e09020" opacity="0.9"/><g stroke="#ff9040" stroke-width="1.3" fill="none"><line x1="65" y1="20" x2="65" y2="12"/><line x1="41" y1="44" x2="33" y2="44"/><line x1="89" y1="44" x2="97" y2="44"/></g><path d="M 86 60 Q 93 68 96 74 Q 99 79 95 81" fill="none" stroke="#cc6020" stroke-width="1.8"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #a0e030) drop-shadow(0 0 6px #70b010)"><path d="M 36 62 L 36 30 Q 36 22 44 22 Q 52 22 52 30 L 52 46 Q 52 54 60 54 Q 68 54 68 46 L 68 30 Q 68 22 76 22 Q 84 22 84 30 L 84 50 Q 84 62 74 66 Q 68 68 66 76" fill="none" stroke="#b0e840" stroke-width="2"/><circle cx="36" cy="62" r="3.5" fill="#0a1004" stroke="#d0ff60" stroke-width="1.3"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #38b0ff) drop-shadow(0 0 6px #1880d0)"><line x1="30" y1="52" x2="100" y2="52" stroke="#40b8ff" stroke-width="2.2"/><line x1="65" y1="52" x2="65" y2="36" stroke="#2080d0" stroke-width="1.5"/><line x1="30" y1="52" x2="30" y2="66" stroke="#40b8ff" stroke-width="1.8"/><line x1="100" y1="52" x2="100" y2="34" stroke="#40b8ff" stroke-width="1.8"/><line x1="22" y1="66" x2="38" y2="66" stroke="#80d8ff" stroke-width="1.5"/><line x1="92" y1="34" x2="108" y2="34" stroke="#80d8ff" stroke-width="1.5"/><circle cx="65" cy="34" r="4" fill="#040c18" stroke="#40b8ff" stroke-width="1.3"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #18d8a8) drop-shadow(0 0 6px #10b888)"><path d="M 36 30 L 36 62 Q 36 70 44 70 Q 52 70 52 62 L 52 46 Q 52 38 60 38 Q 68 38 68 46 L 68 62 Q 68 70 76 70 Q 84 70 84 62 L 84 44" fill="none" stroke="#20e0b0" stroke-width="2"/><path d="M 84 44 L 92 36 L 100 44 L 94 50" stroke="#40ffcc" stroke-width="1.8" fill="none"/><circle cx="36" cy="30" r="3.5" fill="#04100c" stroke="#20e0b0" stroke-width="1.3"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #ff7830) drop-shadow(0 0 6px #ff5010)"><line x1="38" y1="70" x2="92" y2="22" stroke="#ff9040" stroke-width="2.2"/><path d="M 78 22 L 92 22 L 92 36" fill="none" stroke="#ffb860" stroke-width="1.8"/><line x1="38" y1="54" x2="52" y2="54" stroke="#cc6020" stroke-width="1.5"/><circle cx="90" cy="24" r="3.5" fill="#180800" stroke="#ffb860" stroke-width="1.3"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #a0e030) drop-shadow(0 0 6px #70b010)"><path d="M 36 28 L 36 56 Q 36 68 50 68 Q 64 68 64 56 L 64 48 Q 64 40 72 36 Q 80 32 86 38 Q 94 46 90 60 Q 86 72 76 74 Q 66 76 60 72" fill="none" stroke="#b0e840" stroke-width="2"/><path d="M 36 28 Q 40 18 50 20 Q 58 22 56 32" fill="none" stroke="#d0ff60" stroke-width="1.6"/><circle cx="36" cy="28" r="3.5" fill="#081004" stroke="#b0e840" stroke-width="1.3"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #38b0ff) drop-shadow(0 0 6px #1880d0)"><path d="M 24 38 Q 35 30 46 38 Q 57 46 68 38 Q 79 30 90 38 Q 101 46 112 38" fill="none" stroke="#40b8ff" stroke-width="2.2"/><path d="M 24 54 Q 35 46 46 54 Q 57 62 68 54 Q 79 46 90 54 Q 101 62 112 54" fill="none" stroke="#2090d0" stroke-width="1.8"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #18d8a8) drop-shadow(0 0 6px #10b888)"><path d="M 50 22 Q 34 36 34 50 Q 34 64 50 76" fill="none" stroke="#20e0b0" stroke-width="2.2"/><path d="M 80 22 Q 96 36 96 50 Q 96 64 80 76" fill="none" stroke="#20e0b0" stroke-width="2.2"/><line x1="50" y1="49" x2="80" y2="49" stroke="#10b880" stroke-width="1.5"/><circle cx="50" cy="22" r="3.5" fill="#04100c" stroke="#20e0b0" stroke-width="1.3"/><circle cx="80" cy="22" r="3.5" fill="#04100c" stroke="#20e0b0" stroke-width="1.3"/></g>`,
    ];
    const GMID=(RS+RI)/2;
    for(let i=0;i<12;i++){const[sx,sy]=polar(HCEN[i],GMID);p.push(`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="16" fill="${EN[i%4]}" opacity="0.09" filter="url(#${EF[i%4]})" class="pns${i}"/>`);}
    for(let i=0;i<12;i++){const[sx,sy]=polar(HCEN[i],GMID);p.push(`<svg x="${(sx-19).toFixed(1)}" y="${(sy-12).toFixed(1)}" width="38" height="24" viewBox="14 12 102 64" overflow="visible">${ZSYM[i]}</svg>`);}
    p.push(`<circle cx="${cx}" cy="${cy}" r="${RI}" fill="none" stroke="#2a2418" stroke-width="1"/>`);
    for(let i=0;i<12;i++) p.push(`${lineR(CUSP[i],RH,RS)} stroke="#2c2818" stroke-width="0.5"/>`);
    p.push(`<circle cx="${cx}" cy="${cy}" r="${RH}" fill="#090806" stroke="#3a2c10" stroke-width="1.5"/>`);
    if(chartData?.planets){
      const asc=chartData.ascLon??0;
      for(const pl of chartData.planets){
        const a=(180-(pl.lon-asc))*DEG,[px,py]=[cx+RPL*Math.cos(a),cy+RPL*Math.sin(a)];
        const col=PLANET_COLORS_GK[pl.name]||PLANET_COLORS[pl.name]||'#aaa';
        p.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="5" fill="${col}" opacity="0.9"/>`);
        const[sx2,sy2]=[cx+(RPL+16)*Math.cos(a),cy+(RPL+16)*Math.sin(a)];
        p.push(`<text x="${sx2.toFixed(1)}" y="${sy2.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="11" fill="${col}">${pl.symbol||'?'}</text>`);
      }
    }
    p.push(`<text x="${cx}" y="${cy+2}" text-anchor="middle" dominant-baseline="central" font-size="30" fill="#c8960a" font-family="serif" filter="url(#pnc)" class="pnca">☉</text>`);
    return `<svg viewBox="0 0 520 520" xmlns="http://www.w3.org/2000/svg" style="width:220px;height:220px;display:block">${p.join('')}</svg>`;
  }

  // ── Modern wheel: illustrated cyan/teal creatures, dark purple ───────────
  function makeModernArtWheel(chartData) {
    const cx=260,cy=260,DEG=Math.PI/180;
    const RO=244,RN=236,RS=220,RI=152,RG=138,RGI=112,RPL=85,RH=62;
    const polar=(a,r)=>[cx+r*Math.cos(a*DEG),cy+r*Math.sin(a*DEG)];
    const sector=(a1,a2,ro,ri)=>{
      const[x1,y1]=polar(a1,ro),[x2,y2]=polar(a2,ro),[x3,y3]=polar(a2,ri),[x4,y4]=polar(a1,ri);
      return `M${x1},${y1} A${ro},${ro} 0 0,1 ${x2},${y2} L${x3},${y3} A${ri},${ri} 0 0,0 ${x4},${y4} Z`;
    };
    const CUSP=Array.from({length:12},(_,i)=>((180-i*30)+360)%360);
    const HCEN=CUSP.map(c=>{let m=c-15;return m<0?m+360:m;});
    const NAMES=['ARIES','TAURUS','GEMINI','CANCER','LEO','VIRGO','LIBRA','SCORPIO','SAGITT.','CAPRIC.','AQUARIUS','PISCES'];
    const GLYPHS=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
    let p=[];
    p.push(`<defs>
      <radialGradient id="md-bg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#100828"/>
        <stop offset="65%" stop-color="#060318"/>
        <stop offset="100%" stop-color="#020108"/>
      </radialGradient>
      <filter id="md-gc" x="-80%" y="-80%" width="260%" height="260%" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="5" result="b"/>
        <feFlood flood-color="#00ccee" flood-opacity="0.85" result="c"/>
        <feComposite in="c" in2="b" operator="in" result="g"/>
        <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="md-gg" x="-80%" y="-80%" width="260%" height="260%" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="5" result="b"/>
        <feFlood flood-color="#d4a820" flood-opacity="0.85" result="c"/>
        <feComposite in="c" in2="b" operator="in" result="g"/>
        <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="md-ghub" x="-100%" y="-100%" width="300%" height="300%" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="8" result="b"/>
        <feFlood flood-color="#00aacc" flood-opacity="0.7" result="c"/>
        <feComposite in="c" in2="b" operator="in" result="g"/>
        <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <style>.mdpa{animation:mdpul 3.2s ease-in-out infinite;}@keyframes mdpul{0%,100%{opacity:.65}50%{opacity:1}}</style>
    </defs>`);
    p.push(`<circle cx="${cx}" cy="${cy}" r="${RO+6}" fill="url(#md-bg)"/>`);
    // Fixed star field
    const ST=[[96,78],[158,38],[202,86],[278,46],[322,72],[374,92],[422,78],[452,128],[82,156],[48,222],[58,292],[88,362],[108,402],[68,452],[138,462],[204,482],[298,488],[382,468],[442,438],[482,378],[492,298],[472,218],[450,148],[384,58],[302,32],[228,28],[182,148],[342,138],[402,198],[422,278],[402,342],[352,422],[258,452],[192,418],[128,358],[98,278],[108,198],[310,200],[180,260],[380,280]];
    for(const[sx,sy] of ST){p.push(`<circle cx="${sx}" cy="${sy}" r="${sx%3===0?1.4:0.7}" fill="#ffffff" opacity="${(((sx*sy)%10+3)/20).toFixed(2)}"/>`);}
    // Segment fills
    for(let i=0;i<12;i++){const a1=CUSP[i],a2=((CUSP[i]-30)+360)%360;p.push(`<path d="${sector(a1,a2,RS,RI)}" fill="${['#0c0022','#080018','#0a001e','#06001a'][i%4]}" stroke="rgba(90,40,160,0.2)" stroke-width="0.5"/>`);}
    // Tick ring + rim
    for(let t=0;t<72;t++){const a=t*5,maj=t%6===0,[x1,y1]=polar(a,RO+4),[x2,y2]=polar(a,maj?RO-3:RO-1);p.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${maj?'#b08010':'#302010'}" stroke-width="${maj?0.8:0.3}"/>`);}
    p.push(`<circle cx="${cx}" cy="${cy}" r="${RO}" fill="none" stroke="#806020" stroke-opacity="0.6" stroke-width="1"/>`);
    p.push(`<circle cx="${cx}" cy="${cy}" r="${RS}" fill="none" stroke="rgba(90,40,160,0.3)" stroke-width="0.5"/>`);
    // Illustrated creatures (cyan/teal, figurative)
    const G='style="filter:drop-shadow(0 0 6px #00aacc) drop-shadow(0 0 12px #004466)"';
    const S='stroke="#00d4ee" fill="none" stroke-linecap="round"';
    const ART=[
      `<g ${S} ${G}><path d="M 50 58 C 38 58 24 48 26 32 C 28 16 42 14 46 27 C 48 34 43 43 35 38" stroke-width="3.2"/><path d="M 50 58 C 62 58 76 48 74 32 C 72 16 58 14 54 27 C 52 34 57 43 65 38" stroke-width="3.2"/><ellipse cx="50" cy="67" rx="11" ry="7" stroke-width="2.5"/></g>`,
      `<g ${S} ${G}><ellipse cx="50" cy="58" rx="22" ry="18" stroke-width="2.8"/><path d="M 30 46 C 24 32 30 16 44 20" stroke-width="3.2"/><path d="M 70 46 C 76 32 70 16 56 20" stroke-width="3.2"/><circle cx="43" cy="64" r="3.5" fill="#001830" stroke-width="1.8"/><circle cx="57" cy="64" r="3.5" fill="#001830" stroke-width="1.8"/></g>`,
      `<g ${S} ${G}><line x1="30" y1="14" x2="30" y2="76" stroke-width="3.2"/><line x1="70" y1="14" x2="70" y2="76" stroke-width="3.2"/><path d="M 30 14 Q 50 8 70 14" stroke-width="2.5"/><path d="M 30 76 Q 50 82 70 76" stroke-width="2.5"/><line x1="30" y1="45" x2="70" y2="45" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.55"/></g>`,
      `<g ${S} ${G}><ellipse cx="50" cy="50" rx="18" ry="12" stroke-width="2.8"/><path d="M 34 42 C 22 36 16 22 26 14 C 32 9 40 13 38 26" stroke-width="3"/><path d="M 66 42 C 78 36 84 22 74 14 C 68 9 60 13 62 26" stroke-width="3"/><line x1="37" y1="58" x2="28" y2="70" stroke-width="2"/><line x1="43" y1="62" x2="36" y2="76" stroke-width="2"/><line x1="63" y1="58" x2="72" y2="70" stroke-width="2"/><line x1="57" y1="62" x2="64" y2="76" stroke-width="2"/></g>`,
      `<g ${S} ${G}><circle cx="50" cy="44" r="22" stroke-width="1.8" stroke-dasharray="5,4"/><circle cx="50" cy="44" r="13" stroke-width="2.8"/><circle cx="43" cy="41" r="3.5" fill="#001830" stroke-width="1.8"/><circle cx="57" cy="41" r="3.5" fill="#001830" stroke-width="1.8"/><path d="M 44 51 Q 50 57 56 51" stroke-width="2.2"/><path d="M 72 60 C 84 66 86 78 74 78 Q 65 78 68 68" stroke-width="2.8"/></g>`,
      `<g ${S} ${G}><circle cx="50" cy="22" r="10" stroke-width="2.5"/><line x1="50" y1="32" x2="50" y2="72" stroke-width="2.8"/><line x1="36" y1="52" x2="64" y2="52" stroke-width="2"/><line x1="50" y1="72" x2="38" y2="84" stroke-width="2.8"/><line x1="50" y1="72" x2="62" y2="84" stroke-width="2.8"/><path d="M 64 24 C 74 14 78 5 70 3" stroke-width="2.2"/><path d="M 64 24 C 72 24 76 18 70 14" stroke-width="2" opacity="0.7"/></g>`,
      `<g ${S} ${G}><line x1="50" y1="22" x2="50" y2="70" stroke-width="2"/><line x1="20" y1="36" x2="80" y2="36" stroke-width="2.8"/><line x1="26" y1="36" x2="26" y2="58" stroke-width="2"/><line x1="74" y1="36" x2="74" y2="58" stroke-width="2"/><path d="M 16 58 Q 26 68 36 58" stroke-width="2.8"/><path d="M 64 58 Q 74 68 84 58" stroke-width="2.8"/><path d="M 32 22 Q 50 16 68 22" stroke-width="2.2"/></g>`,
      `<g ${S} ${G}><ellipse cx="44" cy="50" rx="16" ry="11" stroke-width="2.8"/><path d="M 30 44 C 18 38 12 24 22 16 C 29 11 37 15 35 30" stroke-width="3"/><line x1="60" y1="50" x2="78" y2="44" stroke-width="2.8"/><path d="M 78 44 L 84 52 L 78 58" stroke-width="2.2"/><path d="M 60 58 C 72 68 78 78 74 86 C 70 92 62 88 64 78" stroke-width="2.5"/></g>`,
      `<g ${S} ${G}><line x1="18" y1="78" x2="76" y2="20" stroke-width="3.2"/><path d="M 60 20 L 76 20 L 76 36" stroke-width="2.8"/><path d="M 18 62 L 18 78 L 34 78" stroke-width="2.2"/><path d="M 14 40 Q 24 16 50 12" stroke-width="2" stroke-dasharray="4,4" opacity="0.7"/></g>`,
      `<g ${S} ${G}><ellipse cx="46" cy="32" rx="14" ry="10" stroke-width="2.5"/><path d="M 34 24 C 28 12 34 4 44 8" stroke-width="2.8"/><path d="M 58 24 C 62 12 58 6 50 10 C 44 14 46 22 42 24" stroke-width="2.8"/><path d="M 32 40 C 22 52 26 68 38 72 C 48 76 54 66 48 58 C 42 50 50 44 60 50 C 72 56 74 70 64 74" stroke-width="2.5"/></g>`,
      `<g ${S} ${G}><path d="M 14 38 C 26 26 36 50 48 38 C 60 26 70 50 82 38 C 88 32 92 30 96 38" stroke-width="3.2"/><path d="M 14 58 C 26 46 36 70 48 58 C 60 46 70 70 82 58 C 88 52 92 50 96 58" stroke-width="2.8"/></g>`,
      `<g ${S} ${G}><ellipse cx="36" cy="32" rx="16" ry="10" transform="rotate(-28 36 32)" stroke-width="2.8"/><ellipse cx="64" cy="58" rx="16" ry="10" transform="rotate(-28 64 58)" stroke-width="2.8"/><path d="M 22 20 C 14 12 18 6 24 14" stroke-width="2.5"/><path d="M 78 70 C 86 78 82 84 76 76" stroke-width="2.5"/><line x1="52" y1="20" x2="52" y2="72" stroke-width="1.2" stroke-dasharray="4,3" opacity="0.5"/></g>`,
    ];
    const FIGMID=(RS+RI)/2;
    for(let i=0;i<12;i++){const[x1,y1]=polar(CUSP[i],RI),[x2,y2]=polar(CUSP[i],RS);p.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(100,50,200,0.3)" stroke-width="0.7"/>`);}
    for(let i=0;i<12;i++){const[sx,sy]=polar(HCEN[i],FIGMID);p.push(`<svg x="${(sx-32).toFixed(1)}" y="${(sy-32).toFixed(1)}" width="64" height="64" viewBox="5 5 90 80" overflow="visible">${ART[i]}</svg>`);}
    // Glyph ring
    p.push(`<circle cx="${cx}" cy="${cy}" r="${RG}" fill="none" stroke="#6a4010" stroke-opacity="0.4" stroke-width="0.5"/>`);
    p.push(`<circle cx="${cx}" cy="${cy}" r="${RGI}" fill="none" stroke="#3a2008" stroke-opacity="0.4" stroke-width="0.5"/>`);
    for(let i=0;i<12;i++){const[gx,gy]=polar(HCEN[i],(RG+RGI)/2);p.push(`<text x="${gx.toFixed(1)}" y="${gy.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="14" fill="#d4a020" fill-opacity="0.9" filter="url(#md-gg)">${GLYPHS[i]}</text>`);}
    // Sign name labels (tangential)
    for(let i=0;i<12;i++){const a=HCEN[i],[lx,ly]=polar(a,RN),flip=a>90&&a<270,rot=flip?a-90:a+90;p.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="7" font-family="'Cinzel',serif" fill="#c8a010" fill-opacity="0.9" letter-spacing="0.8" transform="rotate(${rot.toFixed(1)},${lx.toFixed(1)},${ly.toFixed(1)})">${NAMES[i]}</text>`);}
    // Inner hub
    p.push(`<circle cx="${cx}" cy="${cy}" r="${RI}" fill="none" stroke="rgba(90,40,200,0.25)" stroke-width="0.8"/>`);
    p.push(`<circle cx="${cx}" cy="${cy}" r="${RH}" fill="#08050e" stroke="rgba(0,160,200,0.3)" stroke-width="1.5"/>`);
    p.push(`<circle cx="${cx}" cy="${cy}" r="${RH-10}" fill="none" stroke="rgba(0,80,120,0.3)" stroke-width="0.5"/>`);
    // Planet dots
    if(chartData?.planets){
      const asc=chartData.ascLon??0;
      for(const pl of chartData.planets){
        const a=(180-(pl.lon-asc))*DEG,[px,py]=[cx+RPL*Math.cos(a),cy+RPL*Math.sin(a)];
        const col=PLANET_COLORS[pl.name]||'#aaa';
        p.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4.5" fill="${col}" opacity="0.9"/>`);
        const[sx2,sy2]=[cx+(RPL+14)*Math.cos(a),cy+(RPL+14)*Math.sin(a)];
        p.push(`<text x="${sx2.toFixed(1)}" y="${sy2.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="10" fill="${col}">${pl.symbol||'?'}</text>`);
      }
    }
    p.push(`<text x="${cx}" y="${cy+1}" text-anchor="middle" dominant-baseline="central" font-size="26" fill="#00bbcc" fill-opacity="0.55" filter="url(#md-ghub)" class="mdpa">✦</text>`);
    return `<svg viewBox="0 0 520 520" xmlns="http://www.w3.org/2000/svg" style="width:220px;height:220px;display:block">${p.join('')}</svg>`;
  }

  // ── Modernity tab — Zodiac Sign Comparison ────────────────────────────────
  const MODERNITY_SIGNS = [
    { idx:0, sym:'♈', name:'Aries',       greek:'Κριός',      dates:'Mar 21 – Apr 19',
      ptolRuler:'Mars ♂',    modRuler:'Mars ♂',         rulerChanged:false,
      element:'fire', mode:'cardinal', accent:'#ff6644',
      ptolText:"Hot, dry, masculine, cardinal fire. Ptolemy's first sign, coinciding with the vernal equinox — the Ram governs the beginning of the yearly cycle. Rules the head and face; produces a choleric, bold temperament. In geographical astrology, Aries governs Britain and Gaul.",
      modText:"The archetype of autonomous selfhood — the will stripped to its essence. Aries is the psyche's first declaration of 'I am.' Modern astrology reads it as raw initiative, competitive drive, and the courage of beginnings. The Hero before experience has humbled them.",
      constellNow:'Pisces',
      constellNote:'Due to ~26,000-year precession, the tropical sign Aries no longer aligns with the Aries constellation. During "Aries season" today, the sun stands in the constellation Pisces.' },
    { idx:1, sym:'♉', name:'Taurus',      greek:'Ταῦρος',     dates:'Apr 20 – May 20',
      ptolRuler:'Venus ♀',   modRuler:'Venus ♀',        rulerChanged:false,
      element:'earth', mode:'fixed', accent:'#88cc88',
      ptolText:"Cold, dry, feminine, fixed earth. The Bull occupies the spring when heat consolidates into fertility. Rules the neck and throat; produces a productive, pleasure-seeking, sometimes stubborn temperament. Governs Parthia, Media, and the Persian realms.",
      modText:"The archetype of embodied pleasure and self-worth. Taurus governs the senses — touch, taste, beauty, and the deep satisfaction of owning what one values. Modern astrology links it to the equation between material security and psychological esteem.",
      constellNow:'Aries',
      constellNote:'During "Taurus season," the sun is actually in the constellation Aries. The familiar Pleiades star cluster (in Taurus constellation) is not where the sun stands in May.' },
    { idx:2, sym:'♊', name:'Gemini',      greek:'Δίδυμοι',    dates:'May 21 – Jun 20',
      ptolRuler:'Mercury ☿', modRuler:'Mercury ☿',      rulerChanged:false,
      element:'air', mode:'mutable', accent:'#f0d060',
      ptolText:"Hot, moist, masculine, mutable air. The Twins govern the transitional season as spring yields to summer. Rules the arms, shoulders, and lungs; produces a quick, adaptable, witty, and restless temperament. Governs Hyrcania, Armenia, and Lower Egypt.",
      modText:"The archetype of the mind in motion — curiosity, language, and the ability to hold two truths simultaneously. Modern astrology makes Gemini the sign of communication, networking, and the eternal question: 'What else is there?' The trickster intelligence.",
      constellNow:'Taurus',
      constellNote:'The sun occupies the constellation Taurus during Gemini season. The bright star Aldebaran (eye of the Bull) is the backdrop of the solar disc in late May and June.' },
    { idx:3, sym:'♋', name:'Cancer',      greek:'Καρκίνος',   dates:'Jun 21 – Jul 22',
      ptolRuler:'Moon ☽',    modRuler:'Moon ☽',         rulerChanged:false,
      element:'water', mode:'cardinal', accent:'#7799cc',
      ptolText:"Cold, moist, feminine, cardinal water. Cancer marks the summer solstice — the sun's peak and the beginning of its withdrawal. Rules the chest and stomach; produces a nurturing, protective, emotionally receptive, and tenacious temperament. Governs Numidia and Carthage.",
      modText:"The archetype of the nurturing self and emotional memory. Cancer governs the interior world — home, family, childhood conditioning, and the protective shell the psyche builds around its most vulnerable feelings. The Great Mother principle.",
      constellNow:'Gemini',
      constellNote:'The sun stands in Gemini constellation during the Cancer sign. The ancient Greek name for the summer solstice point was the "Gate of Cancer" — it now points into Gemini.' },
    { idx:4, sym:'♌', name:'Leo',         greek:'Λέων',       dates:'Jul 23 – Aug 22',
      ptolRuler:'Sun ☉',     modRuler:'Sun ☉',          rulerChanged:false,
      element:'fire', mode:'fixed', accent:'#ffaa40',
      ptolText:"Hot, dry, masculine, fixed fire. The Lion rules high summer when solar heat is at its most enduring. Rules the heart and spine; produces a proud, magnanimous, ambitious, and commanding temperament. Governs Italy and Cisalpine Gaul.",
      modText:"The archetype of creative self-expression and the sovereign self. Leo is the chart's stage — where the individual says 'look at me' and means it. Modern astrology links Leo to the drama of the ego seeking recognition, and at its best, to generous-hearted leadership.",
      constellNow:'Cancer',
      constellNote:'The sun moves through the faint Cancer constellation during Leo season. The great star Regulus, which Ptolemy placed at the heart of Leo, has drifted to 0° Virgo in tropical terms — now exactly on the Virgo cusp.' },
    { idx:5, sym:'♍', name:'Virgo',       greek:'Παρθένος',   dates:'Aug 23 – Sep 22',
      ptolRuler:'Mercury ☿', modRuler:'Mercury ☿',      rulerChanged:false,
      element:'earth', mode:'mutable', accent:'#a8cc88',
      ptolText:"Cold, dry, feminine, mutable earth. The Maiden governs the harvest season, where summer's abundance is separated into grain and chaff. Rules the bowels; produces a discriminating, analytical, methodical, and modest temperament. Governs Greece and Achaea.",
      modText:"The archetype of craft, health, and discernment. Virgo is the mind applied to matter — analysis, refinement, and the quiet satisfaction of making something work precisely. Modern astrology emphasises the Virgo impulse toward wholeness through service and skill.",
      constellNow:'Leo',
      constellNote:'The sun crosses the large Leo constellation during Virgo season. The famous Spica (brightest star in Virgo constellation) now falls at ~24° tropical Libra, not Virgo.' },
    { idx:6, sym:'♎', name:'Libra',       greek:'Ζυγός',      dates:'Sep 23 – Oct 22',
      ptolRuler:'Venus ♀',   modRuler:'Venus ♀',        rulerChanged:false,
      element:'air', mode:'cardinal', accent:'#f0c0a0',
      ptolText:"Hot, moist, masculine, cardinal air. The Scales mark the autumnal equinox — the moment of perfect balance before the year tips toward darkness. Rules the kidneys and lower back; produces a charming, just, indecisive, and partnership-oriented temperament. Governs Bactria and Caspia.",
      modText:"The archetype of the Other and the search for harmony. Libra is the sign of the Descendant — where the self meets its mirror. Modern astrology emphasises relationship, aesthetic intelligence, and the existential challenge of making decisions in a world of competing goods.",
      constellNow:'Virgo',
      constellNote:'The autumnal equinox point, which Ptolemy called "0° Libra," now stands deep inside the Virgo constellation. The equinox has slid ~24° since Ptolemy named it.' },
    { idx:7, sym:'♏', name:'Scorpius',     greek:'Σκορπίος',   dates:'Oct 23 – Nov 21',
      ptolRuler:'Mars ♂',    modRuler:'Pluto ♇',        rulerChanged:true,
      modRulerNote:'Traditional: Mars ♂',
      element:'water', mode:'fixed', accent:'#cc6655',
      ptolText:"Cold, dry, feminine, fixed water. The Scorpion rules the deepening autumn — the season of death and fermentation. Rules the genitals; produces an intense, secretive, penetrating, and sometimes destructive temperament. Governs Syria, Judea, and Commagene.",
      modText:"The archetype of depth, transformation, and power. Modern astrology assigns Scorpius the domain of death-and-rebirth, occult investigation, shared resources, and the ruthless honesty required to face what lies beneath the surface. Pluto replaced Mars as ruler in the 20th century.",
      constellNow:'Libra',
      constellNote:"The sun spends only about 7 days in the actual Scorpius constellation (≈Nov 22-29). The sun then crosses Ophiuchus — the 'serpent-bearer' constellation completely absent from the traditional zodiac — for 18 days before entering Sagittarius." },
    { idx:8, sym:'♐', name:'Sagittarius', greek:'Τοξότης',    dates:'Nov 22 – Dec 21',
      ptolRuler:'Jupiter ♃', modRuler:'Jupiter ♃',      rulerChanged:false,
      element:'fire', mode:'mutable', accent:'#d4a050',
      ptolText:"Hot, dry, masculine, mutable fire. The Archer rules the season when the sun begins its descent from its lowest arc. Rules the thighs and hips; produces a philosophical, optimistic, expansive, and freedom-loving temperament. Governs Arabia Felix and Crete.",
      modText:"The archetype of the quest for meaning. Sagittarius is the chart's philosopher and wanderer — the sign of higher education, long travel, cross-cultural encounter, and the restless drive to understand existence at the largest possible scale. The arrow always points outward.",
      constellNow:'Ophiuchus / Scorpius',
      constellNote:"The sun passes through Ophiuchus (Nov 29 – Dec 18) during 'Sagittarius season' — the Serpent-Bearer is the 13th sun-sign constellation, entirely absent from the classical zodiac. Ptolemy's zodiac was a geometric system of 12 equal 30° arcs, not a star map." },
    { idx:9, sym:'♑', name:'Capricornus',   greek:'Αἰγόκερως',  dates:'Dec 22 – Jan 19',
      ptolRuler:'Saturn ♄',  modRuler:'Saturn ♄',       rulerChanged:false,
      element:'earth', mode:'cardinal', accent:'#9090a0',
      ptolText:"Cold, dry, feminine, cardinal earth. The Sea-Goat marks the winter solstice — the nadir of the solar year and the beginning of its return. Rules the knees; produces an ambitious, disciplined, cautious, and authority-seeking temperament. Governs India and Ariana.",
      modText:"The archetype of ambition, structure, and the long game. Capricornus is the chart's executive — the sign of worldly achievement earned through patience and discipline. Modern astrology links it to the relationship with the authoritative parent and the internalised judge.",
      constellNow:'Sagittarius',
      constellNote:'The winter solstice point, which Ptolemy called "0° Capricornus," now falls in Sagittarius constellation. The sun is in Sagittarius during the December solstice — the opposite of Ptolemy\'s era.' },
    { idx:10, sym:'♒', name:'Aquarius',   greek:'Ὑδροχόος',   dates:'Jan 20 – Feb 18',
      ptolRuler:'Saturn ♄',  modRuler:'Uranus ⛢',       rulerChanged:true,
      modRulerNote:'Traditional: Saturn ♄',
      element:'air', mode:'fixed', accent:'#88ccff',
      ptolText:"Hot, moist, masculine, fixed air. The Water-Bearer governs the coldest, most austere portion of winter — yet brings moisture and renewal. Rules the ankles and calves; produces an independent, humanitarian, unconventional, and sometimes detached temperament. Governs Sauromatica.",
      modText:"The archetype of collective consciousness and the future. Uranus, discovered in 1781, displaced Saturn as modern ruler — the planet of disruption, invention, and rebellion perfectly suited a sign associated with revolution. Aquarius governs networks, science, and the vision of a better world.",
      constellNow:'Capricornus',
      constellNote:'The sun stands in Capricornus constellation during Aquarius season. Uranus was discovered telescopically in 1781 — Ptolemy never knew it existed. Its assignment to Aquarius is entirely a modern invention based on perceived thematic resonance.' },
    { idx:11, sym:'♓', name:'Pisces',     greek:'Ἰχθύες',     dates:'Feb 19 – Mar 20',
      ptolRuler:'Jupiter ♃', modRuler:'Neptune ♆',      rulerChanged:true,
      modRulerNote:'Traditional: Jupiter ♃',
      element:'water', mode:'mutable', accent:'#9988cc',
      ptolText:"Cold, moist, feminine, mutable water. The Fish close the zodiacal year in a sign Ptolemy described as wholly watery and noxious — a dissolution back into the formless before Aries ignites the cycle again. Rules the feet; produces an empathetic, impressionable, spiritual, and self-sacrificing temperament.",
      modText:"The archetype of mystical dissolution and universal compassion. Neptune, discovered in 1846, replaced Jupiter — the planet of fog, transcendence, and boundlessness suited the most boundary-dissolving sign. Pisces governs the collective unconscious, spiritual seeking, and the longing for oceanic union.",
      constellNow:'Aquarius',
      constellNote:'The sun is in Aquarius constellation during Pisces season, and crosses into Pisces constellation just as the tropical year resets to Aries. Neptune was discovered in 1846 — Ptolemy\'s Pisces was ruled by Jupiter, a ruler still used in traditional and Vedic astrology today.' },
  ];

  // Determine which house a longitude falls in given 12 house cusps
  function whichHouseNum(lon, cusps) {
    const n = ((lon % 360) + 360) % 360;
    for (let i = 0; i < 12; i++) {
      const a  = ((cusps[i]       % 360) + 360) % 360;
      const b  = ((cusps[(i+1)%12] % 360) + 360) % 360;
      const inH = (a <= b) ? (n >= a && n < b)
                           : (n >= a || n < b); // wraps 360
      if (inH) return i + 1; // 1-based
    }
    return 1;
  }

  function renderModernity() {
    const el = app.querySelector('#pa-modernity-content');
    if (el.dataset.rendered === (currentChart ? currentChart._name : 'none')) return;
    el.dataset.rendered = currentChart ? currentChart._name : 'none';

    const hasChart = !!(currentChart?.planets);

    // Map sign index (0=Aries … 11=Pisces) → planets in that sign
    const sPlanets = {};
    if (hasChart) {
      for (const p of currentChart.planets) {
        const si = Math.floor(((p.lon % 360) + 360) % 360 / 30);
        if (!sPlanets[si]) sPlanets[si] = [];
        sPlanets[si].push(p);
      }
    }

    const wheelCD  = hasChart ? currentChart : null;
    const ptWheel  = makePtolNeonWheel(wheelCD);
    const mdWheel  = makeModernArtWheel(wheelCD);

    // ── Layout helpers ─────────────────────────────────────────────────────
    const P = (html) => `<div style="padding:8px 10px;background:rgba(200,150,10,0.05);border-radius:6px;border:1px solid rgba(200,150,10,0.12)"><div style="font-size:9px;color:#c8960a;letter-spacing:0.8px;margin-bottom:6px">PTOLEMY · TETRABIBLOS &amp; ALMAGEST</div><div style="font-size:11px;color:var(--muted);line-height:1.75">${html}</div></div>`;
    const M = (html) => `<div style="padding:8px 10px;background:rgba(0,160,180,0.05);border-radius:6px;border:1px solid rgba(0,160,180,0.12)"><div style="font-size:9px;color:#00bbcc;letter-spacing:0.8px;margin-bottom:6px">MODERN WESTERN · 20th–21st CENTURY</div><div style="font-size:11px;color:var(--muted);line-height:1.75">${html}</div></div>`;
    const cmp = (title, pHtml, mHtml, icon='') => `
      <div style="margin-bottom:14px;padding:14px 16px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.07)">
        <div style="font-size:13px;font-weight:700;color:var(--gold);font-family:var(--font-greek);margin-bottom:10px">${icon ? icon+' ' : ''}${title}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${P(pHtml)}${M(mHtml)}</div>
      </div>`;
    const tbl = (rows, cols) => `<table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:6px">${cols?`<tr>${cols.map(c=>`<th style="text-align:left;padding:3px 6px;color:#c8960a;border-bottom:1px solid rgba(255,255,255,0.1)">${c}</th>`).join('')}</tr>`:''}${rows.map(r=>`<tr>${r.map((c,i)=>`<td style="padding:3px 6px;border-bottom:1px solid rgba(255,255,255,0.05);color:${i===0?'rgba(255,255,255,0.8)':'var(--muted)'}">${c}</td>`).join('')}</tr>`).join('')}</table>`;

    // ── Header banner ──────────────────────────────────────────────────────
    const header = `
      <div style="padding:18px 20px 14px;border-bottom:2px solid rgba(200,150,10,0.18);margin-bottom:18px">
        <div style="font-size:17px;font-weight:700;color:var(--gold);font-family:var(--font-greek);margin-bottom:6px">Old Astrology · New Astrology</div>
        <div style="font-size:11px;color:var(--muted);line-height:1.8;max-width:860px">
          This tab compares the Ptolemaic/Hellenistic tradition — the one this app is built upon — with the modern Western practice most people are familiar with today.
          Every Ptolemaic claim here is drawn directly from the <em>Tetrabiblos</em> and the <em>Almagest</em>.
          The two systems share the same twelve sign names and the same tropical zodiac, but differ in cosmology, meaning, technique, and purpose.
        </div>
      </div>`;

    // ── Core Philosophy ────────────────────────────────────────────────────
    const philosophy = cmp('Core Philosophy', `
      In the <em>Almagest</em>, Ptolemy argues that mathematics is the only branch of theoretical philosophy that yields unshakeable knowledge, and astronomy is its highest expression.
      The <em>Tetrabiblos</em> then extends this: just as the Sun and Moon drive the seasons, tides, and the ripening of crops, so the combined configurations of the seven planets —
      their heating, cooling, moistening, and drying powers — produce <em>physical effects</em> on terrestrial things. This is not superstition. It is physics applied to a geocentric cosmos.
      The Earth sits stationary at the centre; the planetary spheres revolve through the aethereal medium above.<br><br>
      The primary subjects are <strong>universal (mundane) matters</strong>: weather, crop yields, pestilences, the fate of nations. Individual natal interpretation is secondary and
      explicitly tentative — Ptolemy warns directly against overconfidence in personal prediction.`,
    `Modern Western practice is almost entirely <strong>psychological and therapeutic</strong>. The framework shifted around the mid-20th century, when Dane Rudhyar grafted Jungian archetypes onto chart interpretation.
      A planet is no longer a body with heating or moistening power — it becomes a symbol of inner psychological drives.
      The chart is treated as a map of the psyche. "Karmic" language, soul-purpose frameworks, and relationship compatibility analysis (synastry) dominate.
      The seasonal and physical dimensions of the ancient system are effectively invisible in modern practice.`);

    // ── The Seven Planets ──────────────────────────────────────────────────
    const planets = cmp('The Planets', `
      Ptolemy works with <strong>seven visible luminaries</strong> — the only planets observable to the naked eye. Their order from Earth outward, established geometrically in <em>Almagest</em> Book IX:
      Moon, Mercury, Venus, Sun, Mars, Jupiter, Saturn. Each carries a primary physical nature:<br><br>
      ${tbl([
        ['☉ Sun','Hot + moderately Dry','Benefic','Diurnal'],
        ['☽ Moon','Moist + moderately Cold','Benefic','Nocturnal'],
        ['☿ Mercury','Variable by aspect','Neutral','Either'],
        ['♀ Venus','Moist + moderately Warm','Benefic','Nocturnal'],
        ['♂ Mars','Dry + excessively Hot','Malefic','Nocturnal'],
        ['♃ Jupiter','Warm + moderately Moist','Benefic','Diurnal'],
        ['♄ Saturn','Cold + Dry','Malefic','Diurnal'],
      ],['Planet','Nature','Type','Sect'])}
      <br>Mercury is unique: it takes on the character of whatever planet most strongly aspects it (<em>Tetrabiblos</em> I.4).`,
    `Modern practice layers psychological keywords on each planet: Saturn = discipline and karma; Jupiter = optimism; Mars = drive; Venus = love and beauty; Mercury = communication; Sun = ego; Moon = emotion.<br><br>
      Modern astrology then <strong>adds three outer planets</strong> Ptolemy could not have known:<br>
      <strong>♅ Uranus</strong> — revolution and sudden change (disc. 1781)<br>
      <strong>♆ Neptune</strong> — dreams, illusion, spirituality (disc. 1846)<br>
      <strong>♇ Pluto</strong> — transformation, power, death-rebirth (disc. 1930)<br><br>
      Modern practice also incorporates asteroids — Chiron, Ceres, Pallas, Juno, Vesta. In strict Ptolemaic practice these have no place; the seven-planet system is architecturally complete
      because it corresponds to the seven observable spheres revolving around the stationary Earth.`);

    // ── Planetary Dignities ────────────────────────────────────────────────
    const dignities = cmp('Planetary Dignities', `
      The dignity system describes the <em>fitness</em> of a planet's position for expressing its nature — a strictly physical argument from the <em>Tetrabiblos</em> I.17–20.<br><br>
      <strong>Domicile:</strong> The sign whose qualities best match the planet's own. The Sun rules Leo (hottest, driest); the Moon rules Cancer (cold and moist):<br>
      ${tbl([
        ['☉ Sun','♌ Leo','—'],
        ['☽ Moon','♋ Cancer','—'],
        ['☿ Mercury','♊ Gemini','♍ Virgo'],
        ['♀ Venus','♎ Libra','♉ Taurus'],
        ['♂ Mars','♈ Aries','♏ Scorpius'],
        ['♃ Jupiter','♐ Sagittarius','♓ Pisces'],
        ['♄ Saturn','♒ Aquarius','♑ Capricornus'],
      ],['Planet','Day Domicile','Night Domicile'])}
      <br><strong>Exaltation</strong> (second tier): Sun in ♈, Moon in ♉, Mercury in ♍, Venus in ♓, Mars in ♑, Jupiter in ♋, Saturn in ♎.<br>
      <strong>Triplicity, Term (Bound), Face (Decan)</strong> are progressively weaker dignities distributing planetary authority across all 360°. Detriment and Fall are the opposites — positions of weakness.`,
    `The dignity system survives largely intact in modern practice, but three new rulers have been inserted:
      Uranus displaces Saturn from Aquarius, Neptune displaces Jupiter from Pisces, and Pluto displaces Mars from Scorpius.
      Many modern practitioners use both traditional and modern rulers, but the <em>physical rationale</em> for the original assignments — based on elemental quality matching — has been completely abandoned in favour of thematic keyword matching.`);

    // ── Aspects (Schēmata) ─────────────────────────────────────────────────
    const aspects = cmp('Aspects (Schēmata)', `
      Ptolemy calls angular relationships <em>schēmata</em> — "configurations." The doctrine in <em>Tetrabiblos</em> I.13 is directly tied to the harmonic division of the circle, inherited from Pythagorean music theory. There are five recognised configurations:<br><br>
      ${tbl([
        ['☌ Conjunction','0°','1/1','Strongest blending — same sign'],
        ['⚹ Sextile','60°','1/6','Friendly — same sect'],
        ['□ Square','90°','1/4','Hostile — elements in conflict'],
        ['△ Trine','120°','1/3','Most harmonious — same element'],
        ['☍ Opposition','180°','1/2','Hostile but planets see each other'],
      ],['Aspect','Angle','Division','Character'])}
      <br><strong>Aversion (blindness):</strong> Signs 30° or 150° apart cannot see each other and cannot cooperate or interfere. This is a key Ptolemaic concept absent from most modern practice.<br><br>
      Orbs are calculated by the <strong>moiety</strong> system: each planet has a sphere of light, and two planets aspect if the sum of their half-orbs bridges the gap. The Sun's orb is largest (~15°).`,
    `Modern astrology adds several aspects Ptolemy did not use:<br>
      <strong>Quincunx</strong> (150°) — tension and adjustment<br>
      <strong>Semisextile</strong> (30°) — mild, minor<br>
      <strong>Semisquare</strong> (45°) and <strong>Sesquiquadrate</strong> (135°) — friction<br>
      <strong>Quintile</strong> (72°) and <strong>Biquintile</strong> (144°) — creative talent<br><br>
      Orbs have generally been tightened in modern practice. The emphasis is on the psychological tension or harmony the aspect creates in the native's inner life, rather than on the physical qualities the planets blend or conflict through.`);

    // ── Houses / Topoi ─────────────────────────────────────────────────────
    const houses = cmp('Houses — Τόποι (Places)', `
      Houses are called <em>topoi</em> — "places." The <em>Tetrabiblos</em> III describes twelve, each with a distinct domain. The four <strong>kentrai</strong> (cardines — pivots) are most powerful:
      Ascendant (East), Midheaven (South), Descendant (West), and IC (North). A planet near a cardineis is most effective.<br><br>
      ${tbl([
        ['1st','Horoskopos','Body, constitution, general vitality'],
        ['4th','IC / Nadir','Parents, home, land, foundations'],
        ['7th','Descendant','Marriage, partnerships, open enemies'],
        ['10th','Midheaven (MC)','Occupation, reputation, rank, action'],
        ['2nd','—','Livelihood, resources'],
        ['5th','—','Children, pleasures'],
        ['6th','—','Disease, slaves, bodily injury'],
        ['8th','—','Death, the dead'],
        ['9th','—','Travel, religion, philosophy, divination'],
        ['11th','—','Friends, benefactors, hopes'],
        ['12th','—','Enemies, imprisonment, affliction'],
      ],['Place','Angle','Ptolemaic Domain'])}
      <br>Preferred system: <strong>Whole-sign houses</strong> — the rising sign constitutes the entire 1st house, the next sign the 2nd, and so on. The <strong>Lot of Fortune</strong> (☽ + ASC − ☉) signifies bodily fortune.`,
    `The term "houses" has completely replaced <em>topoi</em>. Psychological domains have been heavily elaborated: the 8th becomes shared resources and transformation; the 12th becomes the unconscious and hidden self.<br><br>
      Quadrant house systems dominate modern practice — primarily <strong>Placidus</strong>, followed by Koch, Regiomontanus, and Porphyry.
      Whole-sign houses have seen a significant revival among historically-minded practitioners in the last two decades.<br><br>
      At high latitudes, Placidus and Koch can produce <strong>interceptions</strong> — signs that do not appear on any house cusp — a complication the ancient whole-sign system does not have.`);

    // ── Timing Techniques ─────────────────────────────────────────────────
    const timing = cmp('Timing Techniques', `
      The Hellenistic tradition uses several time-lord systems entirely absent from most modern practice:<br><br>
      <strong>Annual Profections</strong> (<em>Tetrabiblos</em> IV): The Ascendant advances one sign per year. In year 1, the 1st house is activated; year 2, the 2nd; cycling through a 12-year period.
      The planet ruling the activated sign becomes the <em>lord of the year</em> (chronokrator) — particularly sensitive to transits during that 12-month window.<br><br>
      <strong>Zodiacal Releasing (Aphesis):</strong> A sophisticated system worked from the Lot of Fortune and Lot of Spirit, dividing life into major periods ruled by signs in the order of their rising times across four nested levels.<br><br>
      <strong>Primary Directions:</strong> Angular distances along the celestial equator — 1° of right ascension = 1 year of life (the Ptolemaic key). A planet is "directed" to aspect a natal position.<br><br>
      <strong>Transits</strong> function best when the activated lord of the year receives them. A transit from an inactivated planet carries much less weight.`,
    `Modern practice relies almost entirely on <strong>current transits</strong> of all planets — especially the three outer planets. Saturn transits are major life tests; Uranus brings sudden disruption; Neptune brings confusion or spiritual opening; Pluto forces deep transformation.<br><br>
      <strong>Secondary progressions</strong> (1 day after birth = 1 year of life) are widely used alongside transits. The progressed Moon's ~27-year cycle is a key tracking device.<br><br>
      Annual profections have experienced a significant revival among modern practitioners interested in traditional techniques.<br><br>
      Saturn Return (~29.5 years) is the most culturally recognised modern timing marker — the period when Saturn transits its own natal position.`);

    // ── Eclipses ──────────────────────────────────────────────────────────
    const eclipses = cmp('Eclipses', `
      Eclipses receive an entire section of the <em>Tetrabiblos</em> (II.4–6) as the most important mundane events. Ptolemy interprets them by:
      the sign in which they fall and its planetary rulers; the quadrant of the horizon where the eclipse is visible; the <strong>duration of obscuration</strong> (longer = longer-lasting effects);
      and whether the eclipse is solar (affects kings, aristocracy, grain, gold) or lunar (affects common people, women, moisture-dependent crops).
      Specific geographical regions are linked to zodiacal signs via the <em>Tetrabiblos</em> II.3 chorographic table.`,
    `Solar and lunar eclipses are widely tracked as intensified New and Full Moons. A solar eclipse "seeds" a major new beginning in whatever house and sign it falls;
      a lunar eclipse brings culminations and emotional revelations to the opposite axis. The focus is almost entirely on <strong>personal natal impact</strong> — which natal planets does the eclipse degree conjoin or oppose?
      Mundane astrology practitioners maintain the older geopolitical framework, but it is a minority practice.`);

    // ── Retrograde Planets ─────────────────────────────────────────────────
    const retrograde = cmp('Retrograde Planets', `
      Retrograde motion (<em>ephistamenos</em> — "standing still," then going back) is a purely geometric phenomenon fully explained by the epicycle model in <em>Almagest</em> XII.
      A planet retrogrades when its position on its epicycle carries it apparently backward relative to the zodiac as seen from Earth. This is not mysterious — it is predictable and precisely calculable.<br><br>
      In the <em>Tetrabiblos</em>, a retrograde planet is <strong>weakened</strong> in its capacity to act. It cannot deliver its significations with the same force as a direct planet.
      This is especially significant for planets otherwise well-placed by sign dignity.`,
    `Mercury retrograde has become a cultural phenomenon — a period blamed for miscommunications, technological failures, and travel disruptions (~3 weeks, three times per year).
      All planetary retrogrades carry thematic weight: Mars retrograde = frustrated drive; Venus retrograde = relationship reassessment; Saturn retrograde = internalised discipline.
      A natal retrograde planet is interpreted as energy "turned inward" or experienced in a private, non-conformist way — a thoroughly modern framing with no direct precedent in Ptolemy.`);

    // ── Nodal Axis ────────────────────────────────────────────────────────
    const nodes = cmp('The Nodal Axis (Dragon\'s Head &amp; Tail)', `
      The <strong>ascending node</strong> (☊ Anabibazon — Dragon's Head) and <strong>descending node</strong> (☋ Katabibazon — Dragon's Tail) are the two points where the Moon's inclined orbit
      crosses the ecliptic. They are critical for eclipse prediction — precisely determined in <em>Almagest</em> IV–V — and move retrograde around the zodiac with a period of ~18.6 years.<br><br>
      In Hellenistic astrology their interpretive use varies. They are generally treated as sensitive points, not planets: the ascending node associated with increase and addition,
      the descending node with decrease and loss.`,
    `The <strong>North Node</strong> and <strong>South Node</strong> have been extensively reinterpreted in spiritual and karmic frameworks.
      The North Node represents the soul's evolutionary direction in this lifetime — what must be developed; the South Node represents past-life gifts or karmic patterns to be released.
      This framework has no precedent in Ptolemy and is a thoroughly 20th-century overlay, pioneered by figures like Martin Schulman in the 1970s.`);

    // ── Summary table ─────────────────────────────────────────────────────
    const summary = `
      <div style="margin-bottom:14px;padding:14px 16px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.07)">
        <div style="font-size:13px;font-weight:700;color:var(--gold);font-family:var(--font-greek);margin-bottom:10px">⊞ Summary: Key Structural Differences</div>
        <div style="overflow-x:auto">${tbl([
          ['Cosmology','Earth stationary at centre; seven spheres','Heliocentric background; rarely stated'],
          ['Zodiac','Tropical; 30° seasonal sectors anchored to equinoxes','Tropical (mainstream); same sectors, different meanings'],
          ['Planets','Seven (Sun through Saturn)','Ten+ — adds Uranus, Neptune, Pluto'],
          ['Sign meanings','Physical qualities: hot/cold/moist/dry','Psychological archetypes'],
          ['House system','Whole-sign or equal houses preferred','Placidus or Koch quadrant most common'],
          ['Aspects','Five Ptolemaic + aversion concept','Five major + many minor aspects'],
          ['Primary timing','Profections, zodiacal releasing, primary directions','Transits + secondary progressions'],
          ['Eclipse focus','Mundane/collective; seasonal duration matters','Personal natal activation'],
          ['Retrograde','Planet weakened — reduced effectiveness','Thematic inversion or introspection'],
          ['Nodes','Eclipse-geometry points; increase/decrease','Karmic soul-evolution axis'],
          ['Priority branch','Mundane first, natal second, explicitly tentative','Natal overwhelmingly dominant'],
          ['Goal','Predict physical and social outcomes from natural causes','Understand and develop the inner psyche'],
        ],['Feature','Ptolemaic / Hellenistic','Modern Western'])}</div>
        <div style="margin-top:10px;font-size:10px;color:rgba(255,255,255,0.3);font-style:italic">
          Sources: Ptolemy, Almagest (Toomer tr.); Ptolemy, Tetrabiblos (Ashmand tr.)
        </div>
      </div>`;

    // ── Zodiac wheels ──────────────────────────────────────────────────────
    const wheelSection = `
      <div style="display:flex;gap:20px;justify-content:center;align-items:center;flex-wrap:wrap;padding:16px 8px 20px;border-bottom:1px solid rgba(255,255,255,0.07);margin-bottom:16px">
        <div style="text-align:center;flex-shrink:0">
          <div style="font-size:9px;color:#c8960a;letter-spacing:0.9px;margin-bottom:8px;font-family:var(--font-greek)">PTOLEMAIC · TETRABIBLOS</div>
          ${ptWheel}
        </div>
        <div style="flex:1;min-width:160px;max-width:220px;text-align:center;padding:8px 0">
          <div style="font-size:14px;font-weight:700;color:var(--gold);font-family:var(--font-greek);margin-bottom:10px">Same Signs, Two Worlds</div>
          <div style="font-size:10px;color:var(--muted);line-height:1.8">
            Ptolemy named all twelve.<br>Modern astrology kept the names<br>but rewrote the meanings —<br>and gained three new planets.
          </div>
          ${hasChart ? `<div style="margin-top:10px;font-size:9px;color:#c8960a;letter-spacing:0.3px">● ${escHtml(currentChart._name||'Chart')} placements shown</div>` : `<div style="margin-top:10px;font-size:9px;color:var(--muted)">Draw a chart to see your sign placements</div>`}
        </div>
        <div style="text-align:center;flex-shrink:0">
          <div style="font-size:9px;color:#00bbcc;letter-spacing:0.9px;margin-bottom:8px;font-family:var(--font-greek)">MODERN · PSYCHOLOGICAL</div>
          ${mdWheel}
        </div>
      </div>`;

    // ── Sign-by-sign cards ─────────────────────────────────────────────────
    const ELEM_LABEL = { fire:'🔥 Fire', earth:'🌍 Earth', air:'💨 Air', water:'💧 Water' };
    const MODE_LABEL = { cardinal:'Cardinal', fixed:'Fixed', mutable:'Mutable' };

    const cards = MODERNITY_SIGNS.map(s => {
      const planets = sPlanets[s.idx] || [];

      const rulerRow = s.rulerChanged
        ? `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
             <span style="font-size:10px;color:#c8960a">Ptolemy: <b>${s.ptolRuler}</b></span>
             <span style="font-size:10px;color:var(--muted)">→</span>
             <span style="font-size:10px;color:#00cccc">Modern: <b>${s.modRuler}</b></span>
             <span style="font-size:9px;padding:1px 6px;border-radius:8px;background:rgba(0,180,180,0.12);color:#00cccc;border:1px solid rgba(0,180,180,0.3)">RULER CHANGED</span>
             <span style="font-size:9px;color:var(--muted)">${s.modRulerNote}</span>
           </div>`
        : `<div style="font-size:10px;color:var(--muted);margin-bottom:8px">
             Ruler: <b style="color:#c8960a">${s.ptolRuler}</b>
             <span style="color:rgba(255,255,255,0.25);margin:0 6px">|</span>
             Ptolemy &amp; Modern agree
           </div>`;

      const planetChips = planets.length
        ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:10px">
             ${planets.map(p => {
               const col = PLANET_COLORS[p.name] || '#aaa';
               const z   = lonToZodiac(p.lon);
               return `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1)">
                 <span style="color:${col}">${p.symbol||p.name}</span>
                 <span style="color:var(--muted)"> ${z.deg}°${String(z.min).padStart(2,'0')}'</span>
               </span>`;
             }).join('')}
           </div>`
        : '';

      return `
        <div style="margin-bottom:14px;padding:14px 16px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.07);border-left:3px solid ${s.accent}">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap">
            <span style="font-size:22px;line-height:1">${s.sym}</span>
            <span style="font-size:15px;font-weight:700;color:${s.accent};font-family:var(--font-greek)">${s.name}</span>
            <span style="font-size:12px;color:var(--muted);font-family:var(--font-greek)">${s.greek}</span>
            <span style="margin-left:auto;font-size:10px;color:var(--muted)">${s.dates}</span>
            <span style="font-size:9px;padding:1px 6px;border-radius:8px;background:rgba(255,255,255,0.05);color:var(--muted);border:1px solid rgba(255,255,255,0.1)">${ELEM_LABEL[s.element]} · ${MODE_LABEL[s.mode]}</span>
          </div>
          ${rulerRow}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
            <div style="padding:8px 10px;background:rgba(200,150,10,0.05);border-radius:6px;border:1px solid rgba(200,150,10,0.12)">
              <div style="font-size:9px;color:#c8960a;letter-spacing:0.8px;margin-bottom:4px">PTOLEMY · TETRABIBLOS</div>
              <div style="font-size:11px;color:var(--muted);line-height:1.6">${s.ptolText}</div>
            </div>
            <div style="padding:8px 10px;background:rgba(0,160,180,0.05);border-radius:6px;border:1px solid rgba(0,160,180,0.12)">
              <div style="font-size:9px;color:#00bbcc;letter-spacing:0.8px;margin-bottom:4px">MODERN · PSYCHOLOGICAL</div>
              <div style="font-size:11px;color:var(--muted);line-height:1.6">${s.modText}</div>
            </div>
          </div>
          <div style="font-size:10px;color:var(--muted);line-height:1.6;padding:5px 10px;background:rgba(100,100,255,0.04);border-radius:4px;border-left:2px solid rgba(100,100,255,0.2)">
            <span style="color:rgba(100,150,255,0.7);font-size:9px;letter-spacing:0.6px">🌌 ASTRONOMICAL REALITY · </span>${s.constellNote}
          </div>
          ${planetChips}
        </div>`;
    }).join('');

    const signHeader = `
      <div style="padding:14px 20px 10px;border-bottom:1px solid rgba(255,255,255,0.07);margin-bottom:16px">
        <div style="font-size:14px;font-weight:700;color:var(--gold);font-family:var(--font-greek);margin-bottom:6px">Sign by Sign: The Twelve Zodiacal Places</div>
        <div style="font-size:11px;color:var(--muted);line-height:1.75;max-width:820px">
          Ptolemy fixed the twelve signs as 30° arcs of the <em>tropical</em> year, anchored to the equinoxes and solstices — not to star constellations.
          The sign names were borrowed from nearby star patterns of his era, but the signs themselves are geometry. Due to the 26,000-year <em>precession of the equinoxes</em>,
          those star patterns have since drifted ~24° away from the signs that bear their names.
        </div>
      </div>`;

    el.innerHTML = wheelSection
      + header
      + `<div style="padding:0 4px">`
      + philosophy + planets + dignities + aspects + houses + timing + eclipses + retrograde + nodes + summary
      + `</div>`
      + signHeader
      + `<div style="padding:0 4px">${cards}</div>`;
  }

  // ── Houses tab ────────────────────────────────────────────────────────────

  function renderHouses() {
    const el = app.querySelector('#pa-houses-content');
    if (el.dataset.rendered) return;
    el.dataset.rendered = '1';

    /* ── Complete Ptolemaic house data ───────────────────────────────── */
    const HD = [
      { n:1,  r:'I',    name:'Horoscope',          greek:'ὡροσκόπος',
        also:'The Ascendant · The Rising Degree',  str:'angular',
        kw:'Vitality · Body · Soul · The native · Character · Life-force',
        sig:'The most powerful place in the chart — the moment of rising. The planet at or ruling the ascending sign governs the body, constitution, and the general tenor of life. Planets here act "earlier and more promptly" than anywhere else in the chart.',
        quote:'"The eastern angle of the chart, the Horoscope, is considered the principal and most powerful place in the whole nativity." — Tet. III.IV',
        ruler:'Aries · Mars', col:'#c8960a' },
      { n:2,  r:'II',   name:'Gate of Hades',       greek:'Ἀνάφορά',
        also:'Livelihood · Substance',             str:'succedent',
        kw:'Wealth · Possessions · Material support · Resources · Income',
        sig:'The place of material substance and bodily support. What sustains the native and what he accumulates. The second house is a succedent place and thus has moderate but real power over financial and material affairs.',
        quote:'"Succedent houses have less power, but still contribute to the matters signified." — Tet. III',
        ruler:'Taurus · Venus', col:'#7a7878' },
      { n:3,  r:'III',  name:'Goddess',             greek:'Θεά',
        also:'Brethren · Short Journeys',          str:'cadent',
        kw:'Siblings · Neighbours · Short journeys · Early learning · Letters',
        sig:'A cadent place of moderate signification, governing brothers and sisters, near kin, short journeys, and the exchange of letters. The Moon is said to rejoice in this house because of its proximity to the Ascendant angle.',
        quote:'"The Moon rejoices in the third place, on account of its familiarity with the Ascendant by a triangular configuration." — Tet. III',
        ruler:'Gemini · Mercury', col:'#555' },
      { n:4,  r:'IV',   name:'Lower Heaven',        greek:'Ὑπόγειον',
        also:'IC · Parents · Home · Foundations',  str:'angular',
        kw:'Mother · Homeland · Home · Ancestral roots · End of life · Property',
        sig:'The lowest angle — the midnight point opposite the Midheaven. Governs the parents (especially the mother), the homeland, the foundations of life, inherited property, and the circumstances at the end of life. The Sun and Saturn are allotted to the father; the Moon and Venus to the mother.',
        quote:'"In conformity to nature, the Sun and Saturn are allotted to the person of the father; and the Moon and Venus to that of the mother." — Tet. III.V',
        ruler:'Cancer · Moon', col:'#c8960a' },
      { n:5,  r:'V',    name:'Good Fortune',        greek:'Ἀγαθὴ τύχη',
        also:'Children · Pleasures',               str:'succedent',
        kw:'Children · Pleasures · Games · Creative works · Joy · Fertility',
        sig:'A succedent place of good omen, governing offspring and pleasurable activities. Jupiter rejoices here because of its sextile familiarity with the Ascendant. Benefic planets in this place produce many and fortunate children.',
        quote:'"Jupiter rejoices in the fifth place, which is in a hexagonal relationship to the Horoscope." — Tet. III',
        ruler:'Leo · Sun', col:'#7a7878' },
      { n:6,  r:'VI',   name:'Bad Fortune',         greek:'Κακὴ τύχη',
        also:'Illness · Servants',                 str:'cadent',
        kw:'Bodily afflictions · Servants · Daily labour · Enemies within · Health',
        sig:'A cadent place in aversion to the Ascendant — unfavourable, signifying bodily illness, servitude, and toil. Mars is said to rejoice in this place because of the martial correspondence with labour and bodily affliction.',
        quote:'"Mars rejoices in the sixth place, from the aversion existing between it and the Ascendant." — Tet. III',
        ruler:'Virgo · Mercury', col:'#555' },
      { n:7,  r:'VII',  name:'Descendant',          greek:'Δύσις',
        also:'Marriage · Open Enemies',            str:'angular',
        kw:'Marriage · Partnerships · Open enemies · Public contracts · Lawsuits',
        sig:'The western angle — the setting point — directly opposite the Ascendant. Governs all formal unions, legal partnerships, and visible opponents. Venus and Moon well-placed here, especially with Jupiter\'s aspect, give honourable and lasting marriages.',
        quote:'"Venus and Moon in the seventh, with Jupiter as witness, will produce legal marriage, noble spouses, and happy union." — Tet. IV.IV',
        ruler:'Libra · Venus', col:'#c8960a' },
      { n:8,  r:'VIII', name:'Beginning of Death',  greek:'Ἀρχὴ θανάτου',
        also:'Death · Legacy · Crisis',            str:'succedent',
        kw:"Legacies · Others' resources · Death · Crises · Hidden debts",
        sig:'A succedent place in aversion to the Ascendant — inauspicious and hidden. Governs the mode and timing of death, what the native inherits or owes, and crises that arise from hidden causes. Malefics here operate with particular force.',
        quote:'"The anaretic degree and its lord, and the nature of the sign containing it, indicate the manner of death." — Tet. IV.VIII',
        ruler:'Scorpius· Mars', col:'#7a7878' },
      { n:9,  r:'IX',   name:'God',                 greek:'Θεός',
        also:'Long Journeys · Religion · Philosophy', str:'cadent',
        kw:'Long travel · Philosophy · Religion · Foreign lands · Oracles · Learning',
        sig:'A cadent place but one of divine signification — called "God" in the ancient tradition. The Sun rejoices here. Governs long journeys, philosophical inquiry, religious practice, wisdom from foreign sources, and the interpretation of dreams and oracles.',
        quote:'"The Sun has its joy in the ninth place, which is in a trigonal configuration to the Midheaven." — Tet. III',
        ruler:'Sagittarius · Jupiter', col:'#555' },
      { n:10, r:'X',    name:'Midheaven',           greek:'Μεσουράνημα',
        also:'MC · Culmination · Occupation · Honour', str:'angular',
        kw:'Occupation · Rank · Reputation · Public life · Authority · The culminating angle',
        sig:'The culminating angle — the highest point of the chart and the most visible. Second in power only to the Ascendant. Governs the profession, public reputation, and the heights to which the native rises. The rulers of the Midheaven sign jointly govern the occupation.',
        quote:'"The Midheaven, or tenth place, governs the rank and occupation of the native more powerfully than any other position save the Horoscope itself." — Tet. IV.II–III',
        ruler:'Capricornus · Saturn', col:'#c8960a' },
      { n:11, r:'XI',   name:'Good Daemon',         greek:'Ἀγαθὸς δαίμων',
        also:'Friends · Patrons · Hopes',          str:'succedent',
        kw:'Friends · Benefactors · Patrons · Hopes · Gifts · Alliance',
        sig:'Called the "Good Daemon" because it is in a sextile relationship to the Ascendant — a place of good omen. Jupiter here brings many powerful friends, wealthy patrons, and the fulfillment of hopes. The 11th house is the house where the Sun was when it rose this day.',
        quote:'"Jupiter rejoices in the eleventh, which is in hexagonal familiarity with the Ascendant, and confers friends, patrons, and the fulfilment of hopes." — Tet. III',
        ruler:'Aquarius · Saturn', col:'#7a7878' },
      { n:12, r:'XII',  name:'Bad Daemon',          greek:'Κακὸς δαίμων',
        also:'Hidden Enemies · Exile · Affliction', str:'cadent',
        kw:'Secret foes · Exile · Self-undoing · Confinement · Sorrow · Hidden matters',
        sig:'The most inauspicious cadent place, in aversion to the Ascendant. Governs hidden enemies, imprisonment, involuntary exile, chronic afflictions, and all matters that undermine the native from within or without. Saturn afflicts here with particular severity.',
        quote:'"The twelfth place is in aversion to the Ascendant and is called the Bad Daemon; it governs secret enemies and afflictions that are hidden from the native." — Tet. III',
        ruler:'Pisces · Jupiter', col:'#555' },
    ];

    /* ── House wheel SVG — animated, neon glyphs ────────────────────── */
    // SVG angle convention: 0° = right (3 o'clock), increases clockwise (y-down)
    // ASC = 180° (9 o'clock), MC = 270° (12 o'clock), DSC = 0°, IC = 90°
    const cx = 260, cy = 260;
    const R_OUT     = 244;  // outer boundary
    const R_SIGN    = 226;  // zodiac ring outer edge
    const R_SIGN_IN = 190;  // zodiac ring inner edge  (glyph mid ≈ 208)
    const R_HOUSE   = 184;  // house sector outer edge
    const R_NUM     = 146;  // house numeral position
    const R_INNER   = 96;   // inner wheel circle
    const DEG = Math.PI / 180;

    function polar(angle_deg, r) {
      const a = angle_deg * DEG;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    }
    function sector(a1, a2, r_out, r_in) {
      const [x1, y1] = polar(a1, r_out);
      const [x2, y2] = polar(a2, r_out);
      const [x3, y3] = polar(a2, r_in);
      const [x4, y4] = polar(a1, r_in);
      const lg = Math.abs(a2 - a1) > 180 ? 1 : 0;
      return `M${x1},${y1} A${r_out},${r_out} 0 ${lg},1 ${x2},${y2} L${x3},${y3} A${r_in},${r_in} 0 ${lg},0 ${x4},${y4} Z`;
    }
    function line_r(angle_deg, r1, r2) {
      const [x1,y1] = polar(angle_deg, r1);
      const [x2,y2] = polar(angle_deg, r2);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"`;
    }

    const CUSP = Array.from({length:12}, (_,i) => ((180 - i*30) + 360) % 360);
    const HCEN = CUSP.map((c) => { let m = c - 15; return m < 0 ? m + 360 : m; });

    const SIGN_SYMS2 = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
    // Neon element colors: fire / earth / air / water (cycling)
    const ELEM_NEON   = ['#ff6e28','#a8d820','#44b4ff','#22ddb0'];
    const ELEM_BG     = ['#1c0d04','#0c1204','#080c1a','#081512'];
    const ELEM_STROKE = ['#5a2406','#283c0e','#182040','#103022'];
    const ELEM_FILT   = ['hs-gfire','hs-gearth','hs-gair','hs-gwater'];

    let svgParts = [];

    // ── Glow filter defs ─────────────────────────────────────────────
    const mkFilt = (id, col, sd, sx) =>
      `<filter id="${id}" x="${sx}" y="${sx}" width="${100-2*parseInt(sx)}%" height="${100-2*parseInt(sx)}%" color-interpolation-filters="sRGB">` +
      `<feGaussianBlur in="SourceGraphic" stdDeviation="${sd}" result="b"/>` +
      `<feFlood flood-color="${col}" flood-opacity="0.9" result="c"/>` +
      `<feComposite in="c" in2="b" operator="in" result="g"/>` +
      `<feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>` +
      `</filter>`;

    svgParts.push(
      '<defs>' +
      mkFilt('hs-gfire',  '#ff6e28', 4, '-60%') +
      mkFilt('hs-gearth', '#a8d820', 4, '-60%') +
      mkFilt('hs-gair',   '#44b4ff', 4, '-60%') +
      mkFilt('hs-gwater', '#22ddb0', 4, '-60%') +
      mkFilt('hs-ggold',  '#f0c030', 5, '-80%') +
      mkFilt('hs-gctr',   '#c89020', 8, '-100%') +
      '</defs>'
    );

    // ── Keyframe animations (per-glyph with staggered delay) ─────────
    const GDURS = [3.2,3.5,2.9,3.8,3.1,3.6,2.8,3.4,3.0,3.7,2.7,3.3];
    const GDELS = [0,0.4,0.8,1.2,1.6,0.2,0.6,1.0,1.4,1.8,0.3,0.7];
    let css = '<style>';
    for (let i = 0; i < 12; i++) {
      css += `.hsg${i}{animation:hsp${i} ${GDURS[i]}s ease-in-out ${GDELS[i]}s infinite;}`;
      css += `@keyframes hsp${i}{0%,100%{opacity:0}50%{opacity:0.22}}`;
    }
    css += '.hsa{animation:hsgl 2.8s ease-in-out infinite;}';
    css += '.hsc{animation:hscn 4.2s ease-in-out infinite;}';
    css += '.hshi{animation:hshi 2.4s ease-in-out infinite;}';
    css += '@keyframes hsgl{0%,100%{opacity:0.60}50%{opacity:1}}';
    css += '@keyframes hscn{0%,100%{opacity:0.42}50%{opacity:0.95}}';
    css += '@keyframes hshi{0%,100%{opacity:0.22}50%{opacity:0.52}}';
    css += '</style>';
    svgParts.push(css);

    // ── Background disc ───────────────────────────────────────────────
    svgParts.push(`<circle cx="${cx}" cy="${cy}" r="${R_OUT+6}" fill="#07060a" stroke="#2a2014" stroke-width="2"/>`);

    // Outer decorative tick ring (72 ticks every 5°, major at sign cusps)
    for (let t = 0; t < 72; t++) {
      const ang = t * 5;
      const maj = t % 6 === 0;
      const r1 = R_OUT + 4, r2 = maj ? R_OUT - 4 : R_OUT - 2;
      svgParts.push(`${line_r(ang, r1, r2)} stroke="${maj ? '#6a480e' : '#22200a'}" stroke-width="${maj ? 1 : 0.4}"/>`);
    }
    svgParts.push(`<circle cx="${cx}" cy="${cy}" r="${R_OUT}" fill="none" stroke="#3a2c12" stroke-width="0.8"/>`);

    // ── Zodiac sign sectors with neon-glyph glow ─────────────────────
    for (let i = 0; i < 12; i++) {
      const a1 = CUSP[i];
      const a2 = ((CUSP[i] - 30) + 360) % 360;
      svgParts.push(`<path d="${sector(a1, a2, R_SIGN, R_SIGN_IN)}" fill="${ELEM_BG[i%4]}" stroke="${ELEM_STROKE[i%4]}" stroke-width="0.6"/>`);
    }
    // Neon card artwork for each zodiac sign (matches Scrolls card deck)
    const ZSYM = [
      `<g style="filter:drop-shadow(0 0 3px #ff7830) drop-shadow(0 0 6px #ff5010)"><path d="M 65 30 Q 50 18 36 30 Q 22 42 36 54 Q 50 42 65 30 Z" fill="none" stroke="#ff9040" stroke-width="2.2"/><path d="M 65 30 Q 80 18 94 30 Q 108 42 94 54 Q 80 42 65 30 Z" fill="none" stroke="#ff9040" stroke-width="2.2"/><line x1="65" y1="30" x2="65" y2="70" stroke="#cc6020" stroke-width="1.6"/><circle cx="36" cy="54" r="4.5" fill="#1a0804" stroke="#ff9040" stroke-width="1.4"/><circle cx="94" cy="54" r="4.5" fill="#1a0804" stroke="#ff9040" stroke-width="1.4"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #a0e030) drop-shadow(0 0 6px #70b010)"><circle cx="65" cy="52" r="22" fill="none" stroke="#b0e840" stroke-width="2"/><path d="M 43 36 Q 55 24 65 28 Q 75 24 87 36" fill="none" stroke="#d0ff60" stroke-width="2.2"/><line x1="43" y1="36" x2="38" y2="30" stroke="#80c020" stroke-width="1.5"/><line x1="87" y1="36" x2="92" y2="30" stroke="#80c020" stroke-width="1.5"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #38b0ff) drop-shadow(0 0 6px #1880d0)"><line x1="50" y1="20" x2="50" y2="72" stroke="#40b8ff" stroke-width="2.2"/><line x1="80" y1="20" x2="80" y2="72" stroke="#40b8ff" stroke-width="2.2"/><line x1="50" y1="20" x2="80" y2="20" stroke="#80d8ff" stroke-width="1.5"/><line x1="50" y1="72" x2="80" y2="72" stroke="#80d8ff" stroke-width="1.5"/><circle cx="50" cy="20" r="4" fill="#041018" stroke="#40b8ff" stroke-width="1.4"/><circle cx="80" cy="20" r="4" fill="#041018" stroke="#40b8ff" stroke-width="1.4"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #18d8a8) drop-shadow(0 0 6px #10b888)"><path d="M 30 50 Q 40 35 55 42 Q 65 48 65 38 Q 65 28 75 28 Q 88 28 90 42 Q 92 55 78 58 Q 65 62 55 55 Q 42 48 30 55 Q 22 60 28 70" fill="none" stroke="#20e0b0" stroke-width="2"/><path d="M 100 42 Q 90 57 75 50 Q 65 44 65 54 Q 65 64 55 64 Q 42 64 40 50 Q 38 37 52 34 Q 65 30 75 37 Q 88 44 100 37 Q 108 32 102 22" fill="none" stroke="#10c090" stroke-width="1.6"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #ff7830) drop-shadow(0 0 6px #ff5010)"><circle cx="65" cy="44" r="18" fill="#1a0800" stroke="#ff9040" stroke-width="1.8"/><circle cx="65" cy="44" r="11" fill="#280c00" stroke="#ffb860" stroke-width="1.1"/><circle cx="65" cy="44" r="5" fill="#e09020" opacity="0.9"/><g stroke="#ff9040" stroke-width="1.3" fill="none"><line x1="65" y1="20" x2="65" y2="12"/><line x1="41" y1="44" x2="33" y2="44"/><line x1="89" y1="44" x2="97" y2="44"/></g><path d="M 86 60 Q 93 68 96 74 Q 99 79 95 81" fill="none" stroke="#cc6020" stroke-width="1.8"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #a0e030) drop-shadow(0 0 6px #70b010)"><path d="M 36 62 L 36 30 Q 36 22 44 22 Q 52 22 52 30 L 52 46 Q 52 54 60 54 Q 68 54 68 46 L 68 30 Q 68 22 76 22 Q 84 22 84 30 L 84 50 Q 84 62 74 66 Q 68 68 66 76" fill="none" stroke="#b0e840" stroke-width="2"/><circle cx="36" cy="62" r="3.5" fill="#0a1004" stroke="#d0ff60" stroke-width="1.3"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #38b0ff) drop-shadow(0 0 6px #1880d0)"><line x1="30" y1="52" x2="100" y2="52" stroke="#40b8ff" stroke-width="2.2"/><line x1="65" y1="52" x2="65" y2="36" stroke="#2080d0" stroke-width="1.5"/><line x1="30" y1="52" x2="30" y2="66" stroke="#40b8ff" stroke-width="1.8"/><line x1="100" y1="52" x2="100" y2="34" stroke="#40b8ff" stroke-width="1.8"/><line x1="22" y1="66" x2="38" y2="66" stroke="#80d8ff" stroke-width="1.5"/><line x1="92" y1="34" x2="108" y2="34" stroke="#80d8ff" stroke-width="1.5"/><circle cx="65" cy="34" r="4" fill="#040c18" stroke="#40b8ff" stroke-width="1.3"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #18d8a8) drop-shadow(0 0 6px #10b888)"><path d="M 36 30 L 36 62 Q 36 70 44 70 Q 52 70 52 62 L 52 46 Q 52 38 60 38 Q 68 38 68 46 L 68 62 Q 68 70 76 70 Q 84 70 84 62 L 84 44" fill="none" stroke="#20e0b0" stroke-width="2"/><path d="M 84 44 L 92 36 L 100 44 L 94 50" stroke="#40ffcc" stroke-width="1.8" fill="none"/><circle cx="36" cy="30" r="3.5" fill="#04100c" stroke="#20e0b0" stroke-width="1.3"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #ff7830) drop-shadow(0 0 6px #ff5010)"><line x1="38" y1="70" x2="92" y2="22" stroke="#ff9040" stroke-width="2.2"/><path d="M 78 22 L 92 22 L 92 36" fill="none" stroke="#ffb860" stroke-width="1.8"/><line x1="38" y1="54" x2="52" y2="54" stroke="#cc6020" stroke-width="1.5"/><circle cx="90" cy="24" r="3.5" fill="#180800" stroke="#ffb860" stroke-width="1.3"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #a0e030) drop-shadow(0 0 6px #70b010)"><path d="M 36 28 L 36 56 Q 36 68 50 68 Q 64 68 64 56 L 64 48 Q 64 40 72 36 Q 80 32 86 38 Q 94 46 90 60 Q 86 72 76 74 Q 66 76 60 72" fill="none" stroke="#b0e840" stroke-width="2"/><path d="M 36 28 Q 40 18 50 20 Q 58 22 56 32" fill="none" stroke="#d0ff60" stroke-width="1.6"/><circle cx="36" cy="28" r="3.5" fill="#081004" stroke="#b0e840" stroke-width="1.3"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #38b0ff) drop-shadow(0 0 6px #1880d0)"><path d="M 24 38 Q 35 30 46 38 Q 57 46 68 38 Q 79 30 90 38 Q 101 46 112 38" fill="none" stroke="#40b8ff" stroke-width="2.2"/><path d="M 24 54 Q 35 46 46 54 Q 57 62 68 54 Q 79 46 90 54 Q 101 62 112 54" fill="none" stroke="#2090d0" stroke-width="1.8"/></g>`,
      `<g style="filter:drop-shadow(0 0 3px #18d8a8) drop-shadow(0 0 6px #10b888)"><path d="M 50 22 Q 34 36 34 50 Q 34 64 50 76" fill="none" stroke="#20e0b0" stroke-width="2.2"/><path d="M 80 22 Q 96 36 96 50 Q 96 64 80 76" fill="none" stroke="#20e0b0" stroke-width="2.2"/><line x1="50" y1="49" x2="80" y2="49" stroke="#10b880" stroke-width="1.5"/><circle cx="50" cy="22" r="3.5" fill="#04100c" stroke="#20e0b0" stroke-width="1.3"/><circle cx="80" cy="22" r="3.5" fill="#04100c" stroke="#20e0b0" stroke-width="1.3"/></g>`,
    ];

    // Pass 1 — soft ambient halos (pulse animation, behind artwork)
    const GMID = (R_SIGN + R_SIGN_IN) / 2;
    for (let i = 0; i < 12; i++) {
      const [sx, sy] = polar(HCEN[i], GMID);
      const fid = ELEM_FILT[i%4];
      const col = ELEM_NEON[i%4];
      svgParts.push(`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="16" fill="${col}" opacity="0.09" filter="url(#${fid})" class="hsg${i}"/>`);
    }
    // Pass 2 — neon artwork (no animation class — stays crisp at all times)
    for (let i = 0; i < 12; i++) {
      const [sx, sy] = polar(HCEN[i], GMID);
      const W = 38, H = 24;
      svgParts.push(
        `<svg x="${(sx-W/2).toFixed(1)}" y="${(sy-H/2).toFixed(1)}" width="${W}" height="${H}" viewBox="14 12 102 64" overflow="visible">` +
        ZSYM[i] + `</svg>`
      );
    }

    // Ring separator between zodiac and house sectors
    svgParts.push(`<circle cx="${cx}" cy="${cy}" r="${R_SIGN_IN}" fill="none" stroke="#2a2418" stroke-width="1"/>`);
    svgParts.push(`<circle cx="${cx}" cy="${cy}" r="${R_HOUSE}"   fill="none" stroke="#181408" stroke-width="0.5"/>`);

    // ── House sectors ─────────────────────────────────────────────────
    const H_FILL  = { angular:'#1c1604', succedent:'#0c1010', cadent:'#090909' };
    const H_STR   = { angular:'#c8960a', succedent:'#3a5050', cadent:'#222222' };
    for (let i = 0; i < 12; i++) {
      const h = HD[i];
      const a1 = CUSP[i], a2 = ((CUSP[i]-30)+360)%360;
      svgParts.push(`<path d="${sector(a1, a2, R_HOUSE, R_INNER)}" fill="${H_FILL[h.str]}" stroke="${H_STR[h.str]}" stroke-width="0.7"/>`);
    }

    // Angular house glow strips (animated)
    for (let i = 0; i < 12; i++) {
      if (HD[i].str === 'angular') {
        const a1 = CUSP[i], a2 = ((CUSP[i]-30)+360)%360;
        svgParts.push(`<path d="${sector(a1, a2, R_HOUSE, R_HOUSE-8)}" fill="#c8960a" class="hshi"/>`);
      }
    }

    // ── House divider lines ───────────────────────────────────────────
    for (let i = 0; i < 12; i++) {
      const isAng = i === 0 || i === 3 || i === 6 || i === 9;
      if (isAng) {
        // wide soft glow + crisp line, both animated
        svgParts.push(`${line_r(CUSP[i], R_INNER, R_SIGN_IN)} stroke="#c8960a" stroke-width="4" opacity="0.12" filter="url(#hs-ggold)"/>`);
        svgParts.push(`${line_r(CUSP[i], R_INNER, R_SIGN)} stroke="#c8960a" stroke-width="1.4" filter="url(#hs-ggold)" class="hsa"/>`);
      } else {
        svgParts.push(`${line_r(CUSP[i], R_INNER, R_SIGN)} stroke="#2c2818" stroke-width="0.5"/>`);
      }
    }

    // ── Inner circle ──────────────────────────────────────────────────
    svgParts.push(`<circle cx="${cx}" cy="${cy}" r="${R_INNER}" fill="#090806" stroke="#3a2c10" stroke-width="1.5"/>`);
    svgParts.push(`<circle cx="${cx}" cy="${cy}" r="${R_INNER-12}" fill="none" stroke="#1c1608" stroke-width="0.5"/>`);

    // ── House numerals ────────────────────────────────────────────────
    const N_COL = { angular:'#c8b060', succedent:'#587474', cadent:'#444444' };
    for (let i = 0; i < 12; i++) {
      const h = HD[i];
      const [nx, ny] = polar(HCEN[i], R_NUM);
      const isA = h.str === 'angular';
      svgParts.push(
        `<text x="${nx.toFixed(1)}" y="${ny.toFixed(1)}" text-anchor="middle" dominant-baseline="central"` +
        ` font-size="${isA?15:11}" font-family="'Cinzel',serif" fill="${N_COL[h.str]}" font-weight="${isA?700:400}"` +
        `${isA?' filter="url(#hs-ggold)" class="hsa"':''}>${h.r}</text>`
      );
    }

    // ── Axis labels (ASC / MC / DSC / IC) ────────────────────────────
    const AXES = [
      { angle:180, label:'ASC', col:'#f8d838', oy:-10 },
      { angle:270, label:'MC',  col:'#f8d838', oy:  0 },
      { angle:0,   label:'DSC', col:'#d4a824', oy:-10 },
      { angle:90,  label:'IC',  col:'#d4a824', oy:  0 },
    ];
    for (const ax of AXES) {
      const [ax2, ay2] = polar(ax.angle, R_INNER - 22);
      svgParts.push(
        `<text x="${ax2.toFixed(1)}" y="${(ay2+ax.oy).toFixed(1)}" text-anchor="middle"` +
        ` font-size="9.5" font-family="'Cinzel',serif" fill="${ax.col}" font-weight="700"` +
        ` letter-spacing="0.8" filter="url(#hs-ggold)" class="hsa">${ax.label}</text>`
      );
    }

    // ── Central Earth glyph ───────────────────────────────────────────
    svgParts.push(
      `<text x="${cx}" y="${cy+2}" text-anchor="middle" dominant-baseline="central"` +
      ` font-size="26" fill="#c8960a" font-family="serif" filter="url(#hs-gctr)" class="hsc">⊕</text>`
    );
    svgParts.push(
      `<text x="${cx}" y="${cy+30}" text-anchor="middle" font-size="6" fill="#5a4420"` +
      ` font-family="'Cinzel',serif" letter-spacing="2" opacity="0.45">NATIVITY</text>`
    );

    const wheelSVG = `<svg viewBox="0 0 520 520" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:520px;display:block">${svgParts.join('')}</svg>`;

    /* ── Strength badge ──────────────────────────────────────────────── */
    const strBadge = (s) => {
      const col = s === 'angular' ? '#c8960a' : s === 'succedent' ? '#607878' : '#484848';
      const icon = s === 'angular' ? '◆' : s === 'succedent' ? '◇' : '·';
      return `<span class="pa-hs-badge pa-hs-${s}">${icon} ${s}</span>`;
    };

    /* ── House detail cards ──────────────────────────────────────────── */
    const houseCards = HD.map((h) =>
      `<div class="pa-hs-card pa-hs-${h.str}" id="pa-house-${h.n}">
        <div class="pa-hs-card-head">
          <span class="pa-hs-num">${h.r}</span>
          <div>
            <div class="pa-hs-card-name">${h.name}</div>
            <div class="pa-hs-greek">${h.greek} · ${h.also}</div>
          </div>
          ${strBadge(h.str)}
        </div>
        <div class="pa-hs-ruler">⚭ ${h.ruler}</div>
        <div class="pa-hs-kw">${h.kw}</div>
        <div class="pa-hs-sig">${h.sig}</div>
        <div class="pa-hs-quote">${h.quote}</div>
      </div>`
    ).join('');

    /* ── Assemble page ───────────────────────────────────────────────── */
    el.innerHTML =
      `<div class="pa-ptolemy-quote" style="margin-bottom:16px">"The situation of the planets with regard to the four angles of the nativity is of the greatest importance, and merits the most careful attention." — Tetrabiblos III.IV</div>` +

      `<div class="pa-hs-layout">` +
        `<div class="pa-hs-wheel-wrap">` +
          `<div class="pa-hs-wheel-title">The Twelve Places · Natural Wheel</div>` +
          wheelSVG +
          `<div class="pa-hs-legend">` +
            `<span class="pa-hs-badge pa-hs-angular">◆ Angular — most powerful</span>` +
            `<span class="pa-hs-badge pa-hs-succedent">◇ Succedent — moderate</span>` +
            `<span class="pa-hs-badge pa-hs-cadent">· Cadent — least powerful</span>` +
          `</div>` +
          `<div class="pa-hs-angles-note">` +
            `<div style="font-family:var(--font-greek);color:var(--accent);font-size:11px;margin-bottom:6px">The Four Angles (Cardines)</div>` +
            `<div style="font-size:11px;color:var(--muted);line-height:1.7">` +
              `<b style="color:#f0c030">ASC</b> · Horoscope · rising point<br>` +
              `<b style="color:#f0c030">MC</b> · Midheaven · culmination<br>` +
              `<b style="color:#c89020">DSC</b> · Descendant · setting<br>` +
              `<b style="color:#c89020">IC</b> · Lower Heaven · nadir` +
            `</div>` +
            `<div style="font-size:10px;color:var(--muted);margin-top:8px;font-style:italic">` +
              `"Planets in angles act earlier and more promptly; in succedent houses, later and more tardily." — Tet. III.IV` +
            `</div>` +
          `</div>` +
        `</div>` +
        `<div class="pa-hs-cards-col">` +
          houseCards +
        `</div>` +
      `</div>`;
  }

  // ── Scrolls / Cards tab ───────────────────────────────────────────────────

  function renderCards() {
    const el = app.querySelector('#pa-cards-content');
    if (el.dataset.rendered) return;
    el.dataset.rendered = '1';

    /* ── card builders ───────────────────────────────────────────────── */
    const pCard = (cls, corner, title, glyph, sub, kw, num, svg) =>
      `<div class="pa-sc-card ${cls}"><div class="pa-sc-inner"><div class="pa-sc-inset"></div>` +
      `<span class="pa-sc-corner pa-sc-tl">${corner}</span>` +
      `<span class="pa-sc-corner pa-sc-br">${corner}</span>` +
      `<div class="pa-sc-content"><div class="pa-sc-title">${title}</div>` +
      `<div class="pa-sc-glyph">${glyph}</div><div class="pa-sc-sub">${sub}</div>` +
      `<div class="pa-sc-divider"></div><div class="pa-sc-scene">${svg}</div>` +
      `<div class="pa-sc-footer"><div class="pa-sc-kw">${kw}</div>` +
      `<div class="pa-sc-num">${num}</div></div></div></div></div>`;

    const zCard = (cls, corner, title, glyph, sub, kw, num, ruler, svg) =>
      `<div class="pa-sc-card ${cls}"><div class="pa-sc-inner"><div class="pa-sc-inset"></div>` +
      `<span class="pa-sc-corner pa-sc-tl">${corner}</span>` +
      `<span class="pa-sc-corner pa-sc-br">${corner}</span>` +
      `<div class="pa-sc-content"><div class="pa-sc-title">${title}</div>` +
      `<div class="pa-sc-glyph">${glyph}</div><div class="pa-sc-sub">${sub}</div>` +
      `<div class="pa-sc-divider"></div><div class="pa-sc-scene">${svg}</div>` +
      `<div class="pa-sc-footer"><div class="pa-sc-kw">${kw}</div>` +
      `<div class="pa-sc-num">${num}</div></div>` +
      `<div class="pa-sc-ruler">${ruler}</div></div></div></div>`;

    const aCard = (cls, corner, title, angle, glyph, sub, interp, htag, num, svg) =>
      `<div class="pa-sc-card ${cls}"><div class="pa-sc-inner"><div class="pa-sc-inset"></div>` +
      `<span class="pa-sc-corner pa-sc-tl">${corner}</span>` +
      `<span class="pa-sc-corner pa-sc-br">${corner}</span>` +
      `<div class="pa-sc-content"><div class="pa-sc-title">${title}</div>` +
      `<div class="pa-sc-angle">${angle}</div><div class="pa-sc-glyph">${glyph}</div>` +
      `<div class="pa-sc-sub">${sub}</div><div class="pa-sc-divider"></div>` +
      `<div class="pa-sc-scene">${svg}</div>` +
      `<div class="pa-sc-interp">${interp}</div>` +
      `<div class="pa-sc-footer"><div class="pa-sc-htag">${htag}</div>` +
      `<div class="pa-sc-num">${num}</div></div></div></div></div>`;

    const setHdr = (num, title, count) =>
      `<div class="pa-sc-sethdr"><span class="pa-sc-setnum">${num}</span>` +
      `<span class="pa-sc-settitle">${title}</span>` +
      `<span class="pa-sc-setcount">${count}</span></div>`;

    /* ── Planet SVGs ─────────────────────────────────────────────────── */
    const SVG = {};

    SVG.sat = `<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="52" r="26" fill="#201a10" stroke="#5a4a2a" stroke-width="0.8"/>
      <circle cx="70" cy="52" r="18" fill="#2a2015" stroke="#6a5a30" stroke-width="0.5"/>
      <ellipse cx="70" cy="52" rx="44" ry="11" fill="none" stroke="#8a7a3a" stroke-width="0.8"/>
      <rect x="26" y="47" width="88" height="10" fill="#161210" opacity="0.95"/>
      <ellipse cx="70" cy="52" rx="44" ry="11" fill="none" stroke="#5a4a20" stroke-width="0.5" stroke-dasharray="2,3"/>
      <circle cx="70" cy="52" r="4" fill="#c8b070" opacity="0.5"/>
      <line x1="70" y1="20" x2="70" y2="11" stroke="#4a3f28" stroke-width="0.6"/>
      <line x1="63" y1="16" x2="77" y2="16" stroke="#4a3f28" stroke-width="0.6"/>
      <circle cx="40" cy="24" r="1" fill="#c8b070" opacity="0.25"/>
      <circle cx="98" cy="20" r="1" fill="#c8b070" opacity="0.22"/>
      <circle cx="18" cy="38" r="0.8" fill="#c8b070" opacity="0.18"/>
      <circle cx="118" cy="34" r="0.8" fill="#c8b070" opacity="0.18"/>
      <text x="70" y="96" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#6a5a38" letter-spacing="2.5">CAPRICORN · AQUARIUS</text>
    </svg>`;

    SVG.jup = `<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="48" r="26" fill="#0d1f3a" stroke="#2a4a7a" stroke-width="0.8"/>
      <ellipse cx="70" cy="41" rx="22" ry="5" fill="none" stroke="#1a3a6a" stroke-width="1.2" opacity="0.65"/>
      <ellipse cx="70" cy="47" rx="24" ry="4.5" fill="none" stroke="#2a5a8a" stroke-width="0.9" opacity="0.5"/>
      <ellipse cx="70" cy="54" rx="20" ry="4" fill="none" stroke="#1a3a6a" stroke-width="0.8" opacity="0.38"/>
      <circle cx="46" cy="44" r="6" fill="#142a4a" stroke="#3a6aaa" stroke-width="0.8"/>
      <circle cx="46" cy="44" r="2.5" fill="#2a5888" opacity="0.8"/>
      <circle cx="22" cy="28" r="1" fill="#78a8e8" opacity="0.35"/>
      <circle cx="114" cy="24" r="1" fill="#78a8e8" opacity="0.3"/>
      <circle cx="120" cy="60" r="0.8" fill="#78a8e8" opacity="0.25"/>
      <circle cx="16" cy="65" r="0.8" fill="#78a8e8" opacity="0.25"/>
      <path d="M 48 22 Q 70 15 92 22" fill="none" stroke="#2a4a7a" stroke-width="0.5" opacity="0.45"/>
      <text x="70" y="96" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#385888" letter-spacing="2.5">SAGITTARIUS · PISCES</text>
    </svg>`;

    SVG.mar = `<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="52" r="26" fill="#2a0a0a" stroke="#8a2020" stroke-width="0.8"/>
      <circle cx="70" cy="52" r="26" fill="none" stroke="#501010" stroke-width="0.5" stroke-dasharray="1,2.5"/>
      <ellipse cx="63" cy="47" rx="10" ry="8" fill="#3a1010" opacity="0.6"/>
      <ellipse cx="76" cy="56" rx="8" ry="6" fill="#1e0808" opacity="0.55"/>
      <circle cx="55" cy="43" r="3.5" fill="#5a1818" opacity="0.75"/>
      <circle cx="80" cy="58" r="2" fill="#3a1010" opacity="0.6"/>
      <line x1="70" y1="26" x2="70" y2="16" stroke="#d86868" stroke-width="1.2"/>
      <path d="M 62 24 L 70 16 L 78 24" fill="none" stroke="#d86868" stroke-width="1" stroke-linejoin="round"/>
      <circle cx="22" cy="22" r="0.8" fill="#e87878" opacity="0.28"/>
      <circle cx="112" cy="20" r="0.8" fill="#e87878" opacity="0.25"/>
      <text x="70" y="96" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#782828" letter-spacing="2.5">ARIES · SCORPIO</text>
    </svg>`;

    SVG.sol = `<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="48" r="22" fill="#3a2800" stroke="#e0a820" stroke-width="0.8"/>
      <circle cx="70" cy="48" r="15" fill="#5a3e00" stroke="#f0c838" stroke-width="0.5" opacity="0.75"/>
      <circle cx="70" cy="48" r="7" fill="#c89a28" opacity="0.85"/>
      <g stroke="#d89818" stroke-width="0.9" opacity="0.55" fill="none">
        <line x1="70" y1="20" x2="70" y2="13"/><line x1="70" y1="76" x2="70" y2="83"/>
        <line x1="42" y1="48" x2="35" y2="48"/><line x1="98" y1="48" x2="105" y2="48"/>
        <line x1="50" y1="28" x2="45" y2="23"/><line x1="90" y1="28" x2="95" y2="23"/>
        <line x1="50" y1="68" x2="45" y2="73"/><line x1="90" y1="68" x2="95" y2="73"/>
      </g>
      <g stroke="#f0c838" stroke-width="0.5" opacity="0.25" fill="none">
        <line x1="70" y1="11" x2="70" y2="6"/><line x1="70" y1="85" x2="70" y2="90"/>
        <line x1="33" y1="48" x2="28" y2="48"/><line x1="107" y1="48" x2="112" y2="48"/>
      </g>
      <circle cx="22" cy="22" r="0.8" fill="#f0c838" opacity="0.3"/>
      <circle cx="112" cy="20" r="0.8" fill="#f0c838" opacity="0.25"/>
      <text x="70" y="96" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#886800" letter-spacing="2.5">LEO</text>
    </svg>`;

    SVG.ven = `<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="42" r="22" fill="#0e2a0e" stroke="#3a8a3a" stroke-width="0.8"/>
      <circle cx="70" cy="42" r="15" fill="#163a16" stroke="#5aaa5a" stroke-width="0.5" opacity="0.7"/>
      <circle cx="70" cy="42" r="7" fill="#1e5a1e" opacity="0.8"/>
      <line x1="70" y1="64" x2="70" y2="75" stroke="#4a8a4a" stroke-width="1.1" opacity="0.65"/>
      <line x1="60" y1="70" x2="80" y2="70" stroke="#4a8a4a" stroke-width="1.1" opacity="0.65"/>
      <path d="M 46 28 Q 58 18 70 20 Q 82 18 94 28" fill="none" stroke="#2a6a2a" stroke-width="0.6" opacity="0.45"/>
      <path d="M 50 34 Q 60 26 70 28 Q 80 26 90 34" fill="none" stroke="#3a7a3a" stroke-width="0.5" opacity="0.35"/>
      <circle cx="22" cy="24" r="0.8" fill="#88d888" opacity="0.28"/>
      <circle cx="112" cy="22" r="0.8" fill="#88d888" opacity="0.25"/>
      <text x="70" y="96" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#386838" letter-spacing="2.5">TAURUS · LIBRA</text>
    </svg>`;

    SVG.mer = `<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="46" r="17" fill="#0e0e2a" stroke="#4a4aaa" stroke-width="0.8"/>
      <path d="M 55 39 Q 62 30 70 32 Q 78 30 85 39" fill="none" stroke="#6a6acc" stroke-width="1.2" opacity="0.8"/>
      <circle cx="70" cy="46" r="9" fill="#1a1a3a" stroke="#5a5aaa" stroke-width="0.5" opacity="0.7"/>
      <line x1="70" y1="63" x2="70" y2="72" stroke="#5a5aaa" stroke-width="1.1" opacity="0.6"/>
      <line x1="62" y1="68" x2="78" y2="68" stroke="#5a5aaa" stroke-width="1.1" opacity="0.6"/>
      <circle cx="70" cy="36" r="5" fill="none" stroke="#7a7acc" stroke-width="0.8" opacity="0.55"/>
      <circle cx="32" cy="28" r="4.5" fill="#0a0a1a" stroke="#2a2a6a" stroke-width="0.6" opacity="0.65"/>
      <circle cx="104" cy="32" r="3.5" fill="#0a0a1a" stroke="#2a2a6a" stroke-width="0.5" opacity="0.6"/>
      <line x1="53" y1="46" x2="38" y2="40" stroke="#2a2a6a" stroke-width="0.5" stroke-dasharray="1,2.5" opacity="0.5"/>
      <line x1="87" y1="46" x2="100" y2="38" stroke="#2a2a6a" stroke-width="0.5" stroke-dasharray="1,2.5" opacity="0.5"/>
      <circle cx="18" cy="18" r="0.8" fill="#a8a8ee" opacity="0.28"/>
      <circle cx="115" cy="16" r="0.8" fill="#a8a8ee" opacity="0.25"/>
      <text x="70" y="96" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#484888" letter-spacing="2.5">GEMINI · VIRGO</text>
    </svg>`;

    SVG.moo = `<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="72" cy="48" r="24" fill="#0e0e1e" stroke="#383868" stroke-width="0.8"/>
      <circle cx="84" cy="48" r="24" fill="#10101e"/>
      <circle cx="70" cy="48" r="20" fill="#0c0c1c" stroke="#404070" stroke-width="0.3" opacity="0.5"/>
      <circle cx="54" cy="35" r="3" fill="#181830" stroke="#303050" stroke-width="0.5" opacity="0.55"/>
      <circle cx="62" cy="55" r="3.5" fill="#141428" stroke="#303050" stroke-width="0.5" opacity="0.5"/>
      <circle cx="46" cy="52" r="2" fill="#181830" opacity="0.6"/>
      <circle cx="58" cy="42" r="1.5" fill="#141428" opacity="0.45"/>
      <circle cx="22" cy="20" r="1" fill="#d0d0f8" opacity="0.35"/>
      <circle cx="112" cy="18" r="0.8" fill="#d0d0f8" opacity="0.3"/>
      <circle cx="118" cy="65" r="0.7" fill="#d0d0f8" opacity="0.25"/>
      <circle cx="16" cy="68" r="0.8" fill="#d0d0f8" opacity="0.25"/>
      <text x="70" y="96" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#484880" letter-spacing="2.5">CANCER</text>
    </svg>`;

    /* ── Zodiac SVGs ──────────────────────────────────────────────────── */
    SVG.aries = `<svg viewBox="0 0 130 88" xmlns="http://www.w3.org/2000/svg">
      <rect width="130" height="88" fill="#07040a"/>
      <g style="filter:drop-shadow(0 0 4px #ff7830) drop-shadow(0 0 8px #ff5010)">
        <path d="M 65 30 Q 50 18 36 30 Q 22 42 36 54 Q 50 42 65 30 Z" fill="none" stroke="#ff9040" stroke-width="1.6"/>
        <path d="M 65 30 Q 80 18 94 30 Q 108 42 94 54 Q 80 42 65 30 Z" fill="none" stroke="#ff9040" stroke-width="1.6"/>
        <line x1="65" y1="30" x2="65" y2="70" stroke="#cc6020" stroke-width="1.2"/>
        <circle cx="36" cy="54" r="4" fill="#1a0804" stroke="#ff9040" stroke-width="1"/>
        <circle cx="94" cy="54" r="4" fill="#1a0804" stroke="#ff9040" stroke-width="1"/>
        <g stroke="#ffb060" stroke-width="0.7" fill="none">
          <line x1="20" y1="20" x2="24" y2="24"/><line x1="108" y1="18" x2="104" y2="22"/>
          <line x1="16" y1="60" x2="20" y2="56"/><line x1="112" y1="62" x2="108" y2="58"/>
        </g>
      </g>
      <text x="65" y="84" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#aa5018" letter-spacing="1.5">VERNAL EQUINOX</text>
    </svg>`;

    SVG.taurus = `<svg viewBox="0 0 130 88" xmlns="http://www.w3.org/2000/svg">
      <rect width="130" height="88" fill="#07040a"/>
      <g style="filter:drop-shadow(0 0 4px #a0e030) drop-shadow(0 0 8px #70b010)">
        <circle cx="65" cy="52" r="22" fill="none" stroke="#b0e840" stroke-width="1.4"/>
        <path d="M 43 36 Q 55 24 65 28 Q 75 24 87 36" fill="none" stroke="#d0ff60" stroke-width="1.6"/>
        <line x1="43" y1="36" x2="38" y2="30" stroke="#80c020" stroke-width="1"/>
        <line x1="87" y1="36" x2="92" y2="30" stroke="#80c020" stroke-width="1"/>
        <circle cx="65" cy="52" r="6" fill="#0e1804" stroke="#b0e840" stroke-width="0.8"/>
        <path d="M 30 65 Q 48 72 65 70 Q 82 72 100 65" fill="none" stroke="#507010" stroke-width="0.8"/>
      </g>
      <text x="65" y="84" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#5a8018" letter-spacing="1.5">MID-SPRING</text>
    </svg>`;

    SVG.gemini = `<svg viewBox="0 0 130 88" xmlns="http://www.w3.org/2000/svg">
      <rect width="130" height="88" fill="#07040a"/>
      <g style="filter:drop-shadow(0 0 4px #38b0ff) drop-shadow(0 0 8px #1880d0)">
        <line x1="50" y1="20" x2="50" y2="72" stroke="#40b8ff" stroke-width="1.5"/>
        <line x1="80" y1="20" x2="80" y2="72" stroke="#40b8ff" stroke-width="1.5"/>
        <line x1="50" y1="20" x2="80" y2="20" stroke="#80d8ff" stroke-width="1"/>
        <line x1="50" y1="72" x2="80" y2="72" stroke="#80d8ff" stroke-width="1"/>
        <line x1="50" y1="46" x2="80" y2="46" stroke="#2080d0" stroke-width="0.7" stroke-dasharray="2,2"/>
        <circle cx="50" cy="20" r="3" fill="#041018" stroke="#40b8ff" stroke-width="1"/>
        <circle cx="80" cy="20" r="3" fill="#041018" stroke="#40b8ff" stroke-width="1"/>
        <circle cx="50" cy="72" r="2.5" fill="#041018" stroke="#2090d0" stroke-width="0.8"/>
        <circle cx="80" cy="72" r="2.5" fill="#041018" stroke="#2090d0" stroke-width="0.8"/>
      </g>
      <text x="65" y="84" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#2068a0" letter-spacing="1.5">SUMMER CIRCLE</text>
    </svg>`;

    SVG.cancer = `<svg viewBox="0 0 130 88" xmlns="http://www.w3.org/2000/svg">
      <rect width="130" height="88" fill="#07040a"/>
      <g style="filter:drop-shadow(0 0 4px #18d8a8) drop-shadow(0 0 8px #10b888)">
        <path d="M 30 50 Q 40 35 55 42 Q 65 48 65 38 Q 65 28 75 28 Q 88 28 90 42 Q 92 55 78 58 Q 65 62 55 55 Q 42 48 30 55 Q 22 60 28 70" fill="none" stroke="#20e0b0" stroke-width="1.4"/>
        <path d="M 100 42 Q 90 57 75 50 Q 65 44 65 54 Q 65 64 55 64 Q 42 64 40 50 Q 38 37 52 34 Q 65 30 75 37 Q 88 44 100 37 Q 108 32 102 22" fill="none" stroke="#10c090" stroke-width="1.1"/>
      </g>
      <text x="65" y="84" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#188858" letter-spacing="1.5">SUMMER TROPIC</text>
    </svg>`;

    SVG.leo = `<svg viewBox="0 0 130 88" xmlns="http://www.w3.org/2000/svg">
      <rect width="130" height="88" fill="#07040a"/>
      <g style="filter:drop-shadow(0 0 4px #ff7830) drop-shadow(0 0 8px #ff5010)">
        <circle cx="65" cy="44" r="18" fill="#1a0800" stroke="#ff9040" stroke-width="1.2"/>
        <circle cx="65" cy="44" r="11" fill="#280c00" stroke="#ffb860" stroke-width="0.7"/>
        <circle cx="65" cy="44" r="5" fill="#e09020" opacity="0.9"/>
        <g stroke="#ff9040" stroke-width="0.9" fill="none">
          <line x1="65" y1="20" x2="65" y2="14"/><line x1="65" y1="68" x2="65" y2="74"/>
          <line x1="41" y1="44" x2="35" y2="44"/><line x1="89" y1="44" x2="95" y2="44"/>
          <line x1="48" y1="27" x2="44" y2="23"/><line x1="82" y1="27" x2="86" y2="23"/>
          <line x1="48" y1="61" x2="44" y2="65"/><line x1="82" y1="61" x2="86" y2="65"/>
        </g>
        <path d="M 86 60 Q 92 66 96 72 Q 100 78 96 80" fill="none" stroke="#cc6020" stroke-width="1.2"/>
      </g>
      <text x="65" y="84" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#aa5018" letter-spacing="1.5">MIDSUMMER HEAT</text>
    </svg>`;

    SVG.virgo = `<svg viewBox="0 0 130 88" xmlns="http://www.w3.org/2000/svg">
      <rect width="130" height="88" fill="#07040a"/>
      <g style="filter:drop-shadow(0 0 4px #a0e030) drop-shadow(0 0 8px #70b010)">
        <path d="M 36 62 L 36 30 Q 36 22 44 22 Q 52 22 52 30 L 52 46 Q 52 54 60 54 Q 68 54 68 46 L 68 30 Q 68 22 76 22 Q 84 22 84 30 L 84 50 Q 84 62 74 66 Q 68 68 66 76" fill="none" stroke="#b0e840" stroke-width="1.4"/>
        <circle cx="36" cy="62" r="2.5" fill="#0a1004" stroke="#d0ff60" stroke-width="0.9"/>
        <line x1="60" y1="54" x2="56" y2="66" stroke="#80c020" stroke-width="0.9"/>
        <line x1="60" y1="54" x2="64" y2="66" stroke="#80c020" stroke-width="0.9"/>
      </g>
      <text x="65" y="84" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#5a8018" letter-spacing="1.5">AUTUMN DRYNESS</text>
    </svg>`;

    SVG.libra = `<svg viewBox="0 0 130 88" xmlns="http://www.w3.org/2000/svg">
      <rect width="130" height="88" fill="#07040a"/>
      <g style="filter:drop-shadow(0 0 4px #38b0ff) drop-shadow(0 0 8px #1880d0)">
        <line x1="30" y1="52" x2="100" y2="52" stroke="#40b8ff" stroke-width="1.5"/>
        <line x1="65" y1="52" x2="65" y2="38" stroke="#2080d0" stroke-width="1"/>
        <line x1="30" y1="52" x2="30" y2="64" stroke="#40b8ff" stroke-width="1.2"/>
        <line x1="100" y1="52" x2="100" y2="36" stroke="#40b8ff" stroke-width="1.2"/>
        <line x1="22" y1="64" x2="38" y2="64" stroke="#80d8ff" stroke-width="1"/>
        <line x1="92" y1="36" x2="108" y2="36" stroke="#80d8ff" stroke-width="1"/>
        <circle cx="65" cy="36" r="3" fill="#040c18" stroke="#40b8ff" stroke-width="0.9"/>
      </g>
      <text x="65" y="84" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#2068a0" letter-spacing="1.5">AUTUMNAL EQUINOX</text>
    </svg>`;

    SVG.scorpio = `<svg viewBox="0 0 130 88" xmlns="http://www.w3.org/2000/svg">
      <rect width="130" height="88" fill="#07040a"/>
      <g style="filter:drop-shadow(0 0 4px #18d8a8) drop-shadow(0 0 8px #10b888)">
        <path d="M 36 30 L 36 62 Q 36 70 44 70 Q 52 70 52 62 L 52 46 Q 52 38 60 38 Q 68 38 68 46 L 68 62 Q 68 70 76 70 Q 84 70 84 62 L 84 44" fill="none" stroke="#20e0b0" stroke-width="1.4"/>
        <path d="M 84 44 L 92 36" stroke="#40ffcc" stroke-width="1.2" fill="none"/>
        <path d="M 92 36 L 100 44" stroke="#40ffcc" stroke-width="1.2" fill="none"/>
        <path d="M 100 44 L 94 50" stroke="#40ffcc" stroke-width="1.2" fill="none"/>
        <circle cx="36" cy="30" r="2.5" fill="#04100c" stroke="#20e0b0" stroke-width="0.9"/>
      </g>
      <text x="65" y="84" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#188858" letter-spacing="1.5">MID-AUTUMN</text>
    </svg>`;

    SVG.sagittarius = `<svg viewBox="0 0 130 88" xmlns="http://www.w3.org/2000/svg">
      <rect width="130" height="88" fill="#07040a"/>
      <g style="filter:drop-shadow(0 0 4px #ff7830) drop-shadow(0 0 8px #ff5010)">
        <line x1="38" y1="70" x2="92" y2="22" stroke="#ff9040" stroke-width="1.5"/>
        <path d="M 78 22 L 92 22 L 92 36" fill="none" stroke="#ffb860" stroke-width="1.2"/>
        <line x1="38" y1="54" x2="52" y2="54" stroke="#cc6020" stroke-width="1"/>
        <circle cx="90" cy="24" r="2.5" fill="#180800" stroke="#ffb860" stroke-width="0.9"/>
      </g>
      <text x="65" y="84" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#aa5018" letter-spacing="1.5">AUTUMN END</text>
    </svg>`;

    SVG.capricorn = `<svg viewBox="0 0 130 88" xmlns="http://www.w3.org/2000/svg">
      <rect width="130" height="88" fill="#07040a"/>
      <g style="filter:drop-shadow(0 0 4px #a0e030) drop-shadow(0 0 8px #70b010)">
        <path d="M 36 28 L 36 56 Q 36 68 50 68 Q 64 68 64 56 L 64 48 Q 64 40 72 36 Q 80 32 86 38 Q 94 46 90 60 Q 86 72 76 74 Q 66 76 60 72" fill="none" stroke="#b0e840" stroke-width="1.4"/>
        <path d="M 36 28 Q 40 18 50 20 Q 58 22 56 32" fill="none" stroke="#d0ff60" stroke-width="1.1"/>
        <circle cx="36" cy="28" r="2.5" fill="#081004" stroke="#b0e840" stroke-width="0.9"/>
      </g>
      <text x="65" y="84" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#5a8018" letter-spacing="1.5">WINTER TROPIC</text>
    </svg>`;

    SVG.aquarius = `<svg viewBox="0 0 130 88" xmlns="http://www.w3.org/2000/svg">
      <rect width="130" height="88" fill="#07040a"/>
      <g style="filter:drop-shadow(0 0 4px #38b0ff) drop-shadow(0 0 8px #1880d0)">
        <path d="M 24 38 Q 35 30 46 38 Q 57 46 68 38 Q 79 30 90 38 Q 101 46 112 38" fill="none" stroke="#40b8ff" stroke-width="1.5"/>
        <path d="M 24 54 Q 35 46 46 54 Q 57 62 68 54 Q 79 46 90 54 Q 101 62 112 54" fill="none" stroke="#2090d0" stroke-width="1.2"/>
        <path d="M 24 68 Q 35 60 46 68 Q 57 76 68 68 Q 79 60 90 68 Q 101 76 112 68" fill="none" stroke="#1060a0" stroke-width="0.8"/>
      </g>
      <text x="65" y="84" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#2068a0" letter-spacing="1.5">MIDWINTER AIR</text>
    </svg>`;

    SVG.pisces = `<svg viewBox="0 0 130 88" xmlns="http://www.w3.org/2000/svg">
      <rect width="130" height="88" fill="#07040a"/>
      <g style="filter:drop-shadow(0 0 4px #18d8a8) drop-shadow(0 0 8px #10b888)">
        <path d="M 50 22 Q 34 36 34 50 Q 34 64 50 76" fill="none" stroke="#20e0b0" stroke-width="1.5"/>
        <path d="M 80 22 Q 96 36 96 50 Q 96 64 80 76" fill="none" stroke="#20e0b0" stroke-width="1.5"/>
        <line x1="50" y1="49" x2="80" y2="49" stroke="#10b880" stroke-width="1"/>
        <circle cx="50" cy="22" r="2.5" fill="#04100c" stroke="#20e0b0" stroke-width="0.9"/>
        <circle cx="80" cy="22" r="2.5" fill="#04100c" stroke="#20e0b0" stroke-width="0.9"/>
        <circle cx="50" cy="76" r="2" fill="#04100c" stroke="#10c090" stroke-width="0.7"/>
        <circle cx="80" cy="76" r="2" fill="#04100c" stroke="#10c090" stroke-width="0.7"/>
      </g>
      <text x="65" y="84" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#188858" letter-spacing="1.5">EQUINOCTIAL</text>
    </svg>`;

    /* ── Aspect SVGs ──────────────────────────────────────────────────── */
    SVG.conj = `<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="50" r="34" fill="none" stroke="#4a3800" stroke-width="0.7" opacity="0.5"/>
      <circle cx="70" cy="50" r="26" fill="none" stroke="#5a4800" stroke-width="0.5" stroke-dasharray="2,3" opacity="0.4"/>
      <circle cx="52" cy="50" r="9" fill="#2a1e00" stroke="#e8b838" stroke-width="1"/>
      <circle cx="88" cy="50" r="9" fill="#2a1e00" stroke="#e8b838" stroke-width="1"/>
      <circle cx="52" cy="50" r="3" fill="#c89828" opacity="0.65"/>
      <circle cx="88" cy="50" r="3" fill="#c89828" opacity="0.65"/>
      <line x1="61" y1="50" x2="79" y2="50" stroke="#e8b838" stroke-width="0.7" opacity="0.5" stroke-dasharray="1.5,2"/>
      <circle cx="70" cy="50" r="2" fill="#e8b838" opacity="0.4"/>
      <text x="70" y="96" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#7a5800" letter-spacing="1.5">SAME DEGREE · SAME SIGN</text>
    </svg>`;

    SVG.sext = `<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="50" r="34" fill="none" stroke="#1e5838" stroke-width="0.7" opacity="0.45"/>
      <polygon points="70,16 100,50 70,84 40,50" fill="none" stroke="#1e5838" stroke-width="0.5" opacity="0.3"/>
      <circle cx="70" cy="16" r="7" fill="#0a2018" stroke="#68d8a0" stroke-width="0.9"/>
      <circle cx="70" cy="16" r="2.5" fill="#50b888" opacity="0.7"/>
      <circle cx="100" cy="50" r="7" fill="#0a2018" stroke="#68d8a0" stroke-width="0.9"/>
      <circle cx="100" cy="50" r="2.5" fill="#50b888" opacity="0.7"/>
      <line x1="70" y1="16" x2="100" y2="50" stroke="#50b888" stroke-width="1" opacity="0.6"/>
      <line x1="70" y1="16" x2="40" y2="50" stroke="#1e5838" stroke-width="0.5" stroke-dasharray="2,3" opacity="0.35"/>
      <line x1="100" y1="50" x2="40" y2="50" stroke="#1e5838" stroke-width="0.5" stroke-dasharray="2,3" opacity="0.35"/>
      <text x="70" y="96" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#287848" letter-spacing="1.5">COMPATIBLE ELEMENTS</text>
    </svg>`;

    SVG.squa = `<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="50" r="34" fill="none" stroke="#481010" stroke-width="0.7" opacity="0.45"/>
      <rect x="36" y="16" width="68" height="68" fill="none" stroke="#681818" stroke-width="0.6" opacity="0.35"/>
      <circle cx="70" cy="16" r="7" fill="#200808" stroke="#e87878" stroke-width="0.9"/>
      <circle cx="70" cy="16" r="2.5" fill="#c86868" opacity="0.7"/>
      <circle cx="104" cy="50" r="7" fill="#200808" stroke="#e87878" stroke-width="0.9"/>
      <circle cx="104" cy="50" r="2.5" fill="#c86868" opacity="0.7"/>
      <line x1="70" y1="16" x2="104" y2="50" stroke="#e87878" stroke-width="1" opacity="0.6"/>
      <line x1="70" y1="16" x2="36" y2="50" stroke="#681818" stroke-width="0.5" stroke-dasharray="2,3" opacity="0.35"/>
      <line x1="104" y1="50" x2="70" y2="84" stroke="#681818" stroke-width="0.5" stroke-dasharray="2,3" opacity="0.35"/>
      <rect x="96" y="42" width="8" height="8" fill="none" stroke="#e87878" stroke-width="0.5" opacity="0.5"/>
      <text x="70" y="96" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#782828" letter-spacing="1.5">DIFFERENT NATURES</text>
    </svg>`;

    SVG.trin = `<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="50" r="34" fill="none" stroke="#183060" stroke-width="0.7" opacity="0.45"/>
      <polygon points="70,16 104,72 36,72" fill="none" stroke="#204078" stroke-width="0.8" opacity="0.45"/>
      <circle cx="70" cy="16" r="7" fill="#080c1e" stroke="#78a8e8" stroke-width="0.9"/>
      <circle cx="70" cy="16" r="2.5" fill="#6898d8" opacity="0.75"/>
      <circle cx="104" cy="72" r="7" fill="#080c1e" stroke="#78a8e8" stroke-width="0.9"/>
      <circle cx="104" cy="72" r="2.5" fill="#6898d8" opacity="0.75"/>
      <circle cx="36" cy="72" r="7" fill="#080c1e" stroke="#5888c8" stroke-width="0.7" opacity="0.55"/>
      <circle cx="36" cy="72" r="2.5" fill="#4878b8" opacity="0.55"/>
      <line x1="70" y1="16" x2="104" y2="72" stroke="#78a8e8" stroke-width="1" opacity="0.65"/>
      <line x1="70" y1="16" x2="36" y2="72" stroke="#5888c8" stroke-width="0.8" opacity="0.5"/>
      <line x1="104" y1="72" x2="36" y2="72" stroke="#4878a8" stroke-width="0.6" opacity="0.4"/>
      <text x="70" y="96" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#385888" letter-spacing="1.5">SAME ELEMENT</text>
    </svg>`;

    SVG.oppo = `<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="50" r="34" fill="none" stroke="#4a1c08" stroke-width="0.7" opacity="0.5"/>
      <line x1="36" y1="50" x2="104" y2="50" stroke="#c87848" stroke-width="1" opacity="0.65"/>
      <circle cx="36" cy="50" r="9" fill="#220c04" stroke="#e89058" stroke-width="1"/>
      <circle cx="36" cy="50" r="3" fill="#c87848" opacity="0.7"/>
      <circle cx="104" cy="50" r="9" fill="#220c04" stroke="#e89058" stroke-width="1"/>
      <circle cx="104" cy="50" r="3" fill="#c87848" opacity="0.7"/>
      <line x1="36" y1="50" x2="70" y2="16" stroke="#4a1c08" stroke-width="0.5" stroke-dasharray="1.5,3" opacity="0.35"/>
      <line x1="36" y1="50" x2="70" y2="84" stroke="#4a1c08" stroke-width="0.5" stroke-dasharray="1.5,3" opacity="0.35"/>
      <line x1="104" y1="50" x2="70" y2="16" stroke="#4a1c08" stroke-width="0.5" stroke-dasharray="1.5,3" opacity="0.35"/>
      <line x1="104" y1="50" x2="70" y2="84" stroke="#4a1c08" stroke-width="0.5" stroke-dasharray="1.5,3" opacity="0.35"/>
      <circle cx="70" cy="50" r="2" fill="#c87848" opacity="0.3"/>
      <text x="70" y="96" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#7a4020" letter-spacing="1.5">OPPOSITE NATURES</text>
    </svg>`;

    SVG.aver = `<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="50" r="34" fill="none" stroke="#282828" stroke-width="0.7" opacity="0.45"/>
      <circle cx="50" cy="20" r="7" fill="#181818" stroke="#484848" stroke-width="0.8"/>
      <circle cx="50" cy="20" r="2.5" fill="#383838" opacity="0.6"/>
      <circle cx="100" cy="36" r="7" fill="#181818" stroke="#484848" stroke-width="0.8"/>
      <circle cx="100" cy="36" r="2.5" fill="#383838" opacity="0.6"/>
      <path d="M 57 20 Q 80 20 100 36" fill="none" stroke="#282828" stroke-width="0.5" stroke-dasharray="1,4" opacity="0.35"/>
      <line x1="65" y1="44" x2="75" y2="44" stroke="#484848" stroke-width="1.5" opacity="0.5"/>
      <text x="70" y="96" text-anchor="middle" font-family="Cinzel,serif" font-size="5.5" fill="#484848" letter-spacing="1.5">NO FAMILIARITY</text>
    </svg>`;

    /* ── Assemble cards ───────────────────────────────────────────────── */
    const PLANET_CARDS =
      pCard('pa-sc-sat','♄','Saturn','♄','cold · dry · diurnal · malefic','cold · obstruction<br>time · melancholy<br>the aged · lead','I', SVG.sat) +
      pCard('pa-sc-jup','♃','Jupiter','♃','hot · moist · diurnal · benefic','honour · wisdom<br>abundance · law<br>kings · philosophy','II', SVG.jup) +
      pCard('pa-sc-mar','♂','Mars','♂','hot · dry · nocturnal · malefic','war · iron · fire<br>courage · surgery<br>soldiers · fever','III', SVG.mar) +
      pCard('pa-sc-sol','☉','Sol','☉','hot · dry · greater luminary','kings · fathers · gold<br>heart · right eye<br>honour · authority','IV', SVG.sol) +
      pCard('pa-sc-ven','♀','Venus','♀','hot · moist · nocturnal · benefic','beauty · desire<br>music · harmony<br>women · flowers','V', SVG.ven) +
      pCard('pa-sc-mer','☿','Mercury','☿','variable · nearest to both','reason · language<br>skill · commerce<br>youth · writing','VI', SVG.mer) +
      pCard('pa-sc-moo','☽','Luna','☽','cold · moist · lesser luminary','change · mothers<br>tides · body · silver<br>the left eye · growth','VII', SVG.moo);

    const ZODIAC_CARDS =
      zCard('pa-sc-fire','♈','Aries','♈','hot · dry · cardinal · masculine','heat · beginning<br>courage · force','I','♂ Mars · ☉ exalt 19° · ♄ fall', SVG.aries) +
      zCard('pa-sc-earth','♉','Taurus','♉','cold · dry · fixed · feminine','fertility · substance<br>beauty · the voice','II','♀ Venus · ☽ exalt 3°', SVG.taurus) +
      zCard('pa-sc-air','♊','Gemini','♊','warm · moist · mutable · masculine','reason · duality<br>language · skill','III','☿ Mercury · no exaltation', SVG.gemini) +
      zCard('pa-sc-water','♋','Cancer','♋','cold · moist · cardinal · feminine','nurture · home<br>moisture · the mother','IV','☽ Moon · ♃ exalt 15° · ♂ fall', SVG.cancer) +
      zCard('pa-sc-fire','♌','Leo','♌','hot · dry · fixed · masculine','authority · honour<br>heat · the heart','V','☉ Sol · no exaltation · ♄ fall', SVG.leo) +
      zCard('pa-sc-earth','♍','Virgo','♍','cold · dry · mutable · feminine','precision · harvest<br>dryness · craft','VI','☿ Mercury · ☿ exalt 15° · ♀ fall', SVG.virgo) +
      zCard('pa-sc-air','♎','Libra','♎','warm · moist · cardinal · masculine','balance · justice<br>judgement · accord','VII','♀ Venus · ♄ exalt 21° · ☉ fall', SVG.libra) +
      zCard('pa-sc-water','♏','Scorpius','♏','cold · moist · fixed · feminine','depth · fixity<br>compulsion · hidden','VIII','♂ Mars · no exaltation · ☽ fall', SVG.scorpio) +
      zCard('pa-sc-fire','♐','Sagittarius','♐','hot · dry · mutable · masculine','philosophy · law<br>expansion · far travel','IX','♃ Jupiter · no exaltation', SVG.sagittarius) +
      zCard('pa-sc-earth','♑','Capricornus','♑','cold · dry · cardinal · feminine','ambition · restraint<br>coldness · endurance','X','♄ Saturn · ♂ exalt 28° · ♃ fall', SVG.capricorn) +
      zCard('pa-sc-air','♒','Aquarius','♒','cold · moist · fixed · masculine','intellect · principle<br>cold air · detachment','XI','♄ Saturn · no exaltation', SVG.aquarius) +
      zCard('pa-sc-water','♓','Pisces','♓','cold · moist · mutable · feminine','dissolution · vision<br>moisture · yielding','XII','♃ Jupiter · ♀ exalt 27° · ☿ fall', SVG.pisces);

    const ASPECT_CARDS =
      aCard('pa-sc-conj','☌','Conjunction','0°','☌','uniting · neutral by nature',
        'Two planets united in one place. Their natures blend entirely. The quality of a conjunction is determined solely by the planets joined — not by the aspect itself.',
        'NEUTRAL','I', SVG.conj) +
      aCard('pa-sc-sext','⚹','Sextile','60° · two signs','⚹','hexagonal · harmonious',
        'Two-thirds of a right angle. Between signs of different but compatible elements. A gentle, harmonious familiarity — mild in benefit, never strained.',
        'HARMONIOUS','II', SVG.sext) +
      aCard('pa-sc-squa','□','Square','90° · three signs','□','quadrate · discordant',
        'One right angle apart. Between signs of different natures and sexes. Discordant — producing tension, conflict, and the need for resolution between the matters governed.',
        'DISCORDANT','III', SVG.squa) +
      aCard('pa-sc-trin','△','Trine','120° · four signs','△','triangular · most harmonious',
        'One right angle and a third. Between signs of the same element. Harmonious — the most favourable of all configurations. Flowing benefit without effort or strain.',
        'MOST HARMONIOUS','IV', SVG.trin) +
      aCard('pa-sc-oppo','☍','Opposition','180° · six signs','☍','diametrical · most discordant',
        'Two right angles — diametrically opposed. The most openly discordant of all configurations. Signs of opposite nature and sex — conflict, division, excess.',
        'MOST DISCORDANT','V', SVG.oppo) +
      aCard('pa-sc-aver','∅','Aversion','30° or 150° · no aspect','∅','inconjunct · they do not see',
        'Signs separated by one or five signs share no aspect. They are inconjunct — they do not see each other, and cannot influence one another through configuration.',
        'NO ASPECT','—', SVG.aver);

    el.innerHTML =
      `<div class="pa-sc-hero">` +
        `<div class="pa-sc-hero-title">PTOLEMAIC CARD DECK</div>` +
        `<div class="pa-sc-hero-sub">after the Tetrabiblos · Claudius Ptolemy · c. 150 AD · 25 cards</div>` +
      `</div>` +
      setHdr('SET I', 'The Seven Wandering Stars', '7 cards') +
      `<div class="pa-sc-deck">${PLANET_CARDS}</div>` +
      setHdr('SET II', 'The Twelve Signs of the Zodiac', '12 cards') +
      `<div class="pa-sc-deck">${ZODIAC_CARDS}</div>` +
      setHdr('SET III', 'The Five Configurations', '6 cards') +
      `<div class="pa-sc-deck">${ASPECT_CARDS}</div>`;
  }

  // ── Ptolemaic Synastry helpers ────────────────────────────────────────────

  // Ptolemy Book IV Ch. IV — marriage significators by sex of native.
  // "In forming a judgement on marriage, the position and state of Venus, as well
  //  as that of the Moon, are to be chiefly regarded, in nativities of males; and
  //  those of the Sun and Mars in nativities of females."
  const MARRIAGE_SIG = {
    m: ['venus', 'moon'],
    f: ['sun', 'mars'],
  };

  // Ptolemy quotes on partnership & marriage (Books III–IV)
  const SYN_QUOTES = [
    'In forming a judgement on marriage, the position and state of Venus, as well as that of the Moon, are to be chiefly regarded in nativities of males; and those of the Sun and Mars in nativities of females. — Tetrabiblos IV.IV',
    'The mutual exchange of domiciles between Venus and the Moon indicates harmony, sympathy, and affection between the two nativities. — Tetrabiblos IV.IV',
    'Should Jupiter behold Venus with a trine or sextile ray, he will procure for the native a virtuous and legitimate partner of good family, and cause the marriage to be pure and blameless. — Tetrabiblos IV.IV',
    'The stars that command and those that obey, when they exchange their positions in two nativities, produce a union governed by mutual respect and esteem. — Tetrabiblos I.XVII',
    'Signs that behold one another — those in trine or sextile — indicate sympathy and like-mindedness between nativities. Those in aversion signify estrangement. — Tetrabiblos I.XVIII',
    'The luminaries, when they cast their rays upon each other across the charts, bind the two nativities with a bond that is both deep and lasting. — Tetrabiblos IV.IV',
  ];

  // Commanding/Obeying pairs — each pair [northern_commanding_sign_idx, southern_obeying_sign_idx]
  // Equidistant from the equinoctial points (Aries/Libra) — Tetrabiblos I.XVII
  const COMMANDING_PAIRS = [[0, 11],[1, 10],[2, 9],[3, 8],[4, 7],[5, 6]];

  /** Return the "sign relationship" between two sign indices (0–11) */
  function getSignRelationship(sA, sB) {
    if (sA === sB) return { type: 'conjunction',  label: 'Same Sign',        harmony: 'neutral' };
    const d = Math.abs(sA - sB);
    const angle = Math.min(d, 12 - d) * 30;
    if (angle === 30)  return { type: 'aversion',    label: 'Aversion (30°)',   harmony: 'none',    ptolemy: 'Signs adjacent to each other have nothing in common and do not behold each other. — Tet. I.XIX' };
    if (angle === 60)  return { type: 'sextile',     label: 'Sextile',          harmony: 'easy',    ptolemy: 'Signs in hexagonal aspect behold each other with friendship and accord. — Tet. I.XIII' };
    if (angle === 90)  return { type: 'square',      label: 'Square (Quartile)',harmony: 'hard',    ptolemy: 'Signs in quartile aspect are in a difficult but binding relationship. — Tet. I.XIII' };
    if (angle === 120) return { type: 'trine',       label: 'Trine',            harmony: 'easy',    ptolemy: 'Signs in triangular aspect share the same element and behold each other with the greatest harmony. — Tet. I.XIII' };
    if (angle === 150) return { type: 'aversion',    label: 'Aversion (150°)',  harmony: 'none',    ptolemy: 'Signs five signs apart have no aspect and are in aversion to one another. — Tet. I.XIX' };
    if (angle === 180) return { type: 'opposition',  label: 'Opposition',       harmony: 'hard',    ptolemy: 'Signs in diametrical opposition behold each other but with contention. — Tet. I.XIII' };
    // Commanding / obeying
    for (const [cmd, obey] of COMMANDING_PAIRS) {
      if ((sA === cmd && sB === obey) || (sA === obey && sB === cmd)) {
        const isCmd = (sA === cmd);
        return { type: 'commanding', label: isCmd ? 'Commanding / Obeying' : 'Obeying / Commanding', harmony: 'neutral',
          ptolemy: 'These signs are equidistant from the equinoctial points; one commands and the other obeys, producing a relationship of complementary authority. — Tet. I.XVII' };
      }
    }
    return null;
  }

  /** Get planet object by name from a chart's planet array */
  function getPlanet(chart, name) {
    return chart.planets.find((p) => p.name === name);
  }

  /** Sign index for a longitude */
  function signIdx(lon) {
    return Math.floor(((lon % 360) + 360) % 360 / 30);
  }

  // Sign names for display
  const SIGN_NAMES = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpius','Sagittarius','Capricornus','Aquarius','Pisces'];
  const SIGN_SYMS  = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

  /** Check for mutual domicile reception between two charts.
   *  Returns array of {planetA, planetB, description} */
  function checkMutualReception(chartA, chartB) {
    const results = [];
    const PLANETS = ['sun','moon','mercury','venus','mars','jupiter','saturn'];
    for (const pA of PLANETS) {
      const objA = getPlanet(chartA, pA);
      if (!objA) continue;
      const sIdxA = signIdx(objA.lon);
      for (const pB of PLANETS) {
        if (pA === pB) continue;
        const objB = getPlanet(chartB, pB);
        if (!objB) continue;
        const sIdxB = signIdx(objB.lon);
        // pA is in a sign ruled by pB  AND  pB is in a sign ruled by pA
        const pAInPBDomicile = (DOMICILE[pB] || []).includes(sIdxA);
        const pBInPADomicile = (DOMICILE[pA] || []).includes(sIdxB);
        if (pAInPBDomicile && pBInPADomicile) {
          results.push({ planetA: pA, planetB: pB,
            description: `A's ${pA} in ${SIGN_NAMES[sIdxA]} (B's ${pB} sign) ↔ B's ${pB} in ${SIGN_NAMES[sIdxB]} (A's ${pA} sign)` });
        }
      }
    }
    return results;
  }

  /** Build "key connections" — luminary contacts and marriage-sig contacts */
  function findKeyConnections(crossAsp, genderA, genderB, nameA, nameB) {
    const sigA = MARRIAGE_SIG[genderA] || ['venus','moon'];
    const sigB = MARRIAGE_SIG[genderB] || ['venus','moon'];
    const KEY_PAIRS = [
      ['sun',  'moon',   'Sun–Moon bond: deep personal attunement; the two lights unite.'],
      ['moon', 'sun',    'Moon–Sun bond: the inner nature meets the vital principle.'],
      ['venus','mars',   'Venus–Mars contact: physical affinity and romantic magnetism.'],
      ['mars', 'venus',  'Mars–Venus contact: desire and attraction flow between the nativities.'],
      ['moon', 'moon',   'Moon–Moon: shared emotional resonance and like habits.'],
      ['sun',  'sun',    'Sun–Sun: aligned will and sense of identity.'],
      ['venus','venus',  'Venus–Venus: shared pleasures and aesthetic harmony.'],
      ['jupiter','venus','Jupiter on Venus: legal, honourable, and joyous union (Tet. IV.IV).'],
      ['venus','jupiter','Venus on Jupiter: blessings of prosperity and nobility in partnership.'],
    ];
    // Also add marriage-sig cross contacts
    const sigPairs = [];
    for (const sA of sigA) {
      for (const sB of sigB) {
        if (!sigPairs.some((p) => p[0] === sA && p[1] === sB)) {
          sigPairs.push([sA, sB, `Marriage significator contact: ${sA} (A's sig.) meets ${sB} (B's sig.)`]);
        }
      }
    }
    const allKeyPairs = [...KEY_PAIRS, ...sigPairs];
    const found = [];
    for (const asp of crossAsp) {
      const n = asp.natal.name;
      const t = asp.transiting.name;
      for (const [pa, pb, desc] of allKeyPairs) {
        if ((n === pa && t === pb) || (n === pb && t === pa)) {
          found.push({ asp, desc, nameA, nameB });
          break;
        }
      }
    }
    // De-duplicate
    const seen = new Set();
    return found.filter(({ asp }) => {
      const k = `${asp.natal.name}-${asp.transiting.name}-${asp.aspect.name}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  /** Weighted Ptolemaic compatibility score (0–100). */
  function ptolemyCompatScore(crossAsp, chartA, chartB, genderA) {
    // Luminary weight: Sun/Moon contacts matter most, then Venus/Mars, others
    const LWEIGHT = { sun:3, moon:3, venus:2, mars:2, jupiter:1.5, saturn:1, mercury:1 };
    // Aspect score
    const ASCORE  = { trine:2, sextile:1.5, conjunction:0.5, square:-1.5, opposition:-1 };
    // Marriage significator bonus
    const sigA = MARRIAGE_SIG[genderA] || ['venus','moon'];

    let total = 0, maxPossible = 0;
    const breakdown = [];

    for (const { natal: n, transiting: t, aspect } of crossAsp) {
      const wA = LWEIGHT[n.name] || 1;
      const wB = LWEIGHT[t.name] || 1;
      const weight = (wA + wB) / 2;
      const aspScore = ASCORE[aspect.harmony === 'easy' ? (aspect.angle === 60 ? 'sextile' : 'trine') :
                               aspect.harmony === 'hard' ? (aspect.angle === 90 ? 'square' : 'opposition') :
                               'conjunction'] ?? 0;

      // Nature modifier: benefic×benefic → +1, malefic×malefic → −1
      const nA = PLANET_NATURE[n.name]?.nature || 'common';
      const nB = PLANET_NATURE[t.name]?.nature || 'common';
      let natMod = 0;
      if (nA === 'benefic' && nB === 'benefic') natMod = +1;
      else if (nA === 'malefic' && nB === 'malefic') natMod = -1;
      else if (nA === 'malefic' || nB === 'malefic') natMod = -0.3;

      // Saturn/Mars afflicting Venus = marriage harm (Tet. IV.IV)
      let harmNote = '';
      if ((n.name === 'venus' || t.name === 'venus') && aspect.harmony === 'hard') {
        const other = n.name === 'venus' ? t.name : n.name;
        if (other === 'saturn' || other === 'mars') { natMod -= 1; harmNote = ' ⚠ Saturn/Mars afflicts Venus'; }
      }
      // Jupiter beholding Venus = favourable marriage (Tet. IV.IV)
      if ((n.name === 'jupiter' || t.name === 'jupiter') && (n.name === 'venus' || t.name === 'venus') && aspect.harmony === 'easy') {
        natMod += 1; harmNote = ' ✦ Jupiter blesses Venus';
      }
      // Marriage significator bonus
      const isSigContact = sigA.includes(n.name) || sigA.includes(t.name);
      const sigBonus = isSigContact ? 0.5 : 0;

      const contribution = (aspScore + natMod + sigBonus) * weight;
      total += contribution;
      maxPossible += (2 + 1 + 1 + 0.5) * weight; // max possible per aspect

      if (Math.abs(contribution) > 0.5) {
        breakdown.push({ label: `${t.name} ${aspect.symbol} ${n.name}`, val: contribution.toFixed(1), note: harmNote });
      }
    }

    // Mutual reception bonus
    const mutRec = checkMutualReception(chartA, chartB);
    total += mutRec.length * 2;
    maxPossible += mutRec.length * 2;
    if (mutRec.length) breakdown.push({ label: `${mutRec.length} mutual reception(s)`, val: `+${(mutRec.length * 2).toFixed(1)}`, note: '' });

    // Normalise to 0–100
    if (maxPossible === 0) return { score: 50, breakdown: [] };
    const raw = (total / maxPossible + 1) / 2; // map [-1,1] range → [0,1]
    const score = Math.round(Math.max(0, Math.min(100, raw * 100)));
    return { score, breakdown };
  }

  // ── Synastry tab ──────────────────────────────────────────────────────────
  function renderSynastry() {
    const profiles   = loadProfiles();
    const needEl     = app.querySelector('#pa-syn-need-profiles');
    const contentEl  = app.querySelector('#pa-syn-content');
    const selA       = app.querySelector('#pa-syn-a');
    const selB       = app.querySelector('#pa-syn-b');

    if (profiles.length < 2) {
      needEl.style.display = '';
      contentEl.style.display = 'none';
      return;
    }
    needEl.style.display = 'none';
    contentEl.style.display = '';

    const opts = profiles.map((p) => `<option value="${p.id}">${escHtml(p.name)}</option>`).join('');
    selA.innerHTML = opts;
    selB.innerHTML = opts;
    if (profiles.length >= 2) selB.selectedIndex = 1;
  }

  app.querySelector('#pa-syn-draw').addEventListener('click', () => {
    const profiles = loadProfiles();
    const pA = profiles.find((p) => p.id === app.querySelector('#pa-syn-a').value);
    const pB = profiles.find((p) => p.id === app.querySelector('#pa-syn-b').value);
    if (!pA || !pB) return;
    const source  = model.state?.BodySource || 'ibnshatir';
    const genderA = app.querySelector('#pa-syn-gender-a').value;
    const genderB = app.querySelector('#pa-syn-gender-b').value;
    const nameA   = pA.name.split(' ')[0];
    const nameB   = pB.name.split(' ')[0];

    let chartA, chartB;
    try {
      chartA = chartFromProfile(pA, source);
      chartB = chartFromProfile(pB, source);
    } catch (err) {
      console.error('Synastry chart error:', err);
      return;
    }

    // ── Bi-wheel ──────────────────────────────────────────────────────────
    const canvas = app.querySelector('#pa-synastry-wheel');
    drawChartWheel(canvas, chartA, {
      outerChart: chartB,
      outerColor: '#ffd700',
      label: '',
    });

    // ── Cross-aspects ─────────────────────────────────────────────────────
    const crossAsp = computeCrossAspects(
      chartA.planets.map((p) => ({ name: p.name, lon: p.lon, symbol: p.symbol })),
      chartB.planets.map((p) => ({ name: p.name, lon: p.lon, symbol: p.symbol }))
    );
    crossAsp.sort((a, b) => a.aspect.orb - b.aspect.orb);

    // ── Ptolemy marriage quote ─────────────────────────────────────────────
    const quote = SYN_QUOTES[Math.floor(Math.random() * SYN_QUOTES.length)];
    app.querySelector('#pa-syn-quote').textContent = quote;

    // ── Marriage Significators (Book IV, Ch. IV) ───────────────────────────
    const sigA = MARRIAGE_SIG[genderA] || ['venus','moon'];
    const sigB = MARRIAGE_SIG[genderB] || ['venus','moon'];
    const marSigHtml = (() => {
      const renderSig = (chart, sigs, name, gender) => {
        return sigs.map((pl) => {
          const obj = getPlanet(chart, pl);
          if (!obj) return '';
          const sI   = signIdx(obj.lon);
          const dig  = getPlanetDignity(pl, obj.lon, true);
          const nat  = PLANET_NATURE[pl] || {};
          const col  = dignityColor(dig);
          return `<div class="pa-syn-sig-row">
            <span style="color:${nat.color||'#ccc'};font-size:16px">${PLANET_SYMBOLS[pl]||pl}</span>
            <span style="color:var(--fg);font-size:12px;font-weight:600">${pl.charAt(0).toUpperCase()+pl.slice(1)}</span>
            <span style="color:var(--muted);font-size:11px">${SIGN_SYMS[sI]} ${SIGN_NAMES[sI]}</span>
            <span class="pa-dig-tag" style="background:${col}22;color:${col}">${dig.label}</span>
          </div>`;
        }).join('');
      };
      return `
        <div class="pa-syn-marriage-panel">
          <div class="pa-syn-section-title">⚭ Marriage Significators <span style="font-size:10px;font-weight:400;color:var(--muted)">(Tetrabiblos IV.IV)</span></div>
          <div style="display:flex;gap:20px;flex-wrap:wrap">
            <div>
              <div style="font-size:11px;color:var(--accent);margin-bottom:4px">${escHtml(nameA)} (${genderA === 'm' ? 'Venus &amp; Moon' : 'Sun &amp; Mars'})</div>
              ${renderSig(chartA, sigA, nameA, genderA)}
            </div>
            <div>
              <div style="font-size:11px;color:#ffd700;margin-bottom:4px">${escHtml(nameB)} (${genderB === 'm' ? 'Venus &amp; Moon' : 'Sun &amp; Mars'})</div>
              ${renderSig(chartB, sigB, nameB, genderB)}
            </div>
          </div>
          <div style="font-size:10px;color:var(--muted);margin-top:6px;font-style:italic">
            Ptolemy identifies these planets as primary indicators of the quality and nature of one's marriage.
          </div>
        </div>`;
    })();
    app.querySelector('#pa-syn-marriage-sig').innerHTML = marSigHtml;

    // ── Key Connections ────────────────────────────────────────────────────
    const keyConns = findKeyConnections(crossAsp, genderA, genderB, nameA, nameB);
    const keyConnHtml = (() => {
      if (!keyConns.length) return '';
      const rows = keyConns.map(({ asp, desc }) => {
        const { natal: n, transiting: t, aspect } = asp;
        const harmColor = aspect.harmony === 'easy' ? '#66dd88' : aspect.harmony === 'hard' ? '#ff6644' : '#aaaaaa';
        const natCol = PLANET_NATURE[n.name]?.color || '#ccc';
        const trCol  = PLANET_NATURE[t.name]?.color || '#ffd700';
        return `<div class="pa-syn-key-row">
          <span style="color:${trCol};font-size:15px">${t.symbol||'?'}</span>
          <span style="color:${aspect.color};font-size:15px">${aspect.symbol}</span>
          <span style="color:${natCol};font-size:15px">${n.symbol||'?'}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;color:var(--fg)">${t.name} <span style="color:var(--muted)">(${escHtml(nameB)})</span> ${aspect.ptolemyName||aspect.name} ${n.name} <span style="color:var(--muted)">(${escHtml(nameA)})</span></div>
            <div style="font-size:10px;color:var(--muted);margin-top:1px">${desc}</div>
          </div>
          <span style="font-size:10px;padding:2px 5px;border-radius:3px;border:1px solid ${harmColor}22;color:${harmColor}">orb ${asp.aspect.orb.toFixed(1)}°</span>
        </div>`;
      }).join('');
      return `<div class="pa-syn-key-panel">
        <div class="pa-syn-section-title">⭐ Key Connections</div>
        ${rows}
      </div>`;
    })();
    app.querySelector('#pa-syn-key-connections').innerHTML = keyConnHtml;

    // ── All Cross-Aspects list ─────────────────────────────────────────────
    const listEl = app.querySelector('#pa-syn-aspect-list');
    if (crossAsp.length === 0) {
      listEl.innerHTML = '<div style="color:var(--muted);font-size:12px">No major cross-aspects found.</div>';
    } else {
      listEl.innerHTML = crossAsp.map(({ natal: n, transiting: tr, aspect }) => {
        const harmCls = `pa-transit-${aspect.harmony === 'easy' ? 'easy' : aspect.harmony === 'hard' ? 'hard' : ''}`;
        const trCol  = PLANET_NATURE[tr.name]?.color || '#ffd700';
        const natCol = PLANET_NATURE[n.name]?.color  || '#ccc';
        const orbNote = (() => {
          const mo = moietyOrb(n.name, tr.name);
          return `orb ${aspect.orb.toFixed(1)}° / ${mo.toFixed(0)}° max`;
        })();
        return `
          <div class="pa-transit-row ${harmCls}">
            <span style="color:${trCol}">${tr.symbol||'?'}</span>
            <span style="color:var(--muted);font-size:10px">${escHtml(nameB)}</span>
            <span style="color:${aspect.color}">${aspect.symbol}</span>
            <span style="color:${natCol}">${n.symbol||'?'}</span>
            <span style="color:var(--muted);font-size:10px">${escHtml(nameA)}</span>
            <span style="color:var(--muted);font-size:11px;flex:1">${aspect.ptolemyName||aspect.name}</span>
            <span style="color:var(--muted);font-size:10px">${orbNote}</span>
          </div>`;
      }).join('');
    }

    // ── Mutual Reception ──────────────────────────────────────────────────
    const mutRec = checkMutualReception(chartA, chartB);
    const mutRecHtml = (() => {
      if (!mutRec.length) return `<div class="pa-syn-small-panel"><div class="pa-syn-section-title">Mutual Reception</div><div style="font-size:11px;color:var(--muted)">No mutual domicile reception found.</div></div>`;
      return `<div class="pa-syn-small-panel">
        <div class="pa-syn-section-title">⇄ Mutual Reception</div>
        <div style="font-size:10px;color:var(--muted);margin-bottom:6px;font-style:italic">When A's planet occupies B's domicile sign and vice versa — a bond of mutual recognition and natural affinity.</div>
        ${mutRec.map((r) => `<div style="font-size:11px;color:var(--fg);margin-bottom:3px">
          <span style="color:${PLANET_NATURE[r.planetA]?.color||'#ccc'}">${PLANET_SYMBOLS[r.planetA]||r.planetA}</span>
          <span style="color:var(--muted)"> ⇄ </span>
          <span style="color:${PLANET_NATURE[r.planetB]?.color||'#ccc'}">${PLANET_SYMBOLS[r.planetB]||r.planetB}</span>
          <span style="color:var(--muted);font-size:10px;margin-left:5px">${r.description}</span>
        </div>`).join('')}
      </div>`;
    })();
    app.querySelector('#pa-syn-mutual-reception').innerHTML = mutRecHtml;

    // ── Sign Relationships (luminaries + Asc) ────────────────────────────
    const signRelHtml = (() => {
      const CHECK_PAIRS = [
        ['sun','sun', 'Sun–Sun signs'],
        ['moon','moon','Moon–Moon signs'],
        ['sun','moon','Sun–Moon signs (A→B)'],
        ['moon','sun','Moon–Sun signs (A→B)'],
        ['venus','mars','Venus–Mars signs'],
      ];
      const rows = CHECK_PAIRS.map(([pA, pB, label]) => {
        const oA = getPlanet(chartA, pA);
        const oB = getPlanet(chartB, pB);
        if (!oA || !oB) return '';
        const sA = signIdx(oA.lon);
        const sB = signIdx(oB.lon);
        const rel = getSignRelationship(sA, sB);
        if (!rel) return '';
        const harmColor = rel.harmony === 'easy' ? '#66dd88' : rel.harmony === 'hard' ? '#ff6644' : rel.harmony === 'none' ? '#888' : '#aaaaaa';
        return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:11px">
          <span style="color:${PLANET_NATURE[pA]?.color||'#ccc'}">${PLANET_SYMBOLS[pA]||pA}</span>
          <span style="color:var(--muted);font-size:10px">${SIGN_SYMS[sA]}</span>
          <span style="color:var(--muted)">↔</span>
          <span style="color:${PLANET_NATURE[pB]?.color||'#ccc'}">${PLANET_SYMBOLS[pB]||pB}</span>
          <span style="color:var(--muted);font-size:10px">${SIGN_SYMS[sB]}</span>
          <span style="color:var(--fg);flex:1">${label}</span>
          <span style="color:${harmColor};font-size:10px;padding:1px 4px;border-radius:3px;border:1px solid ${harmColor}44">${rel.label}</span>
        </div>`;
      }).filter(Boolean).join('');
      return `<div class="pa-syn-small-panel">
        <div class="pa-syn-section-title">☍ Sign Relationships</div>
        <div style="font-size:10px;color:var(--muted);margin-bottom:6px;font-style:italic">Signs that behold each other (trine, sextile, square, opposition) share a natural affinity. Adjacent or quincunx signs are in aversion — they see nothing of each other. — Tet. I.XVIII–XIX</div>
        ${rows || '<div style="font-size:11px;color:var(--muted)">—</div>'}
      </div>`;
    })();
    app.querySelector('#pa-syn-sign-relations').innerHTML = signRelHtml;

    // ── Weighted Compatibility Score ───────────────────────────────────────
    const { score, breakdown: scoreBreak } = ptolemyCompatScore(crossAsp, chartA, chartB, genderA);
    const barWidth  = score;
    const barColor  = score >= 65 ? '#66dd88' : score >= 40 ? '#ffd060' : '#ff6644';
    const scoreText = score >= 70 ? 'Highly Favourable' : score >= 55 ? 'Favourable' : score >= 40 ? 'Mixed' : score >= 25 ? 'Challenging' : 'Difficult';
    app.querySelector('#pa-compat-label').innerHTML =
      `<span style="color:${barColor};font-weight:700">${scoreText}</span> <span style="color:var(--muted)">(${score}/100)</span>`;
    app.querySelector('#pa-compat-fill').style.cssText =
      `width:${barWidth}%;background:${barColor};transition:width 0.5s`;
    // Score breakdown
    const topFactors = scoreBreak.slice(0, 5);
    app.querySelector('#pa-compat-breakdown').innerHTML = topFactors.length
      ? `<div style="font-size:10px;color:var(--muted);margin-bottom:3px">Top factors:</div>` +
        topFactors.map((f) => {
          const col = parseFloat(f.val) >= 0 ? '#66dd88' : '#ff6644';
          return `<div style="display:flex;gap:4px;font-size:10px">
            <span style="color:${col};min-width:28px">${parseFloat(f.val) >= 0 ? '+'+f.val : f.val}</span>
            <span style="color:var(--fg)">${f.label}</span>
            <span style="color:var(--muted)">${f.note}</span>
          </div>`;
        }).join('')
      : '';

    // Guide 08 — classical compatibility panel (PART 23.4): adds the
    // moon-moon, venus-mars cross, chart-lord aspect, shared rising
    // element below the existing modern-style score.
    try {
      const cls = classicalCompatibility(chartA, chartB);
      const fmt = (label, val) => val
        ? `<div><span style="color:var(--muted)">${label}:</span> <span style="color:#ccc">${val}</span></div>`
        : '';
      const panel = app.querySelector('#pa-compat-breakdown');
      if (panel) {
        panel.insertAdjacentHTML('beforeend', `
          <div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.08);font-size:10px">
            <div style="color:var(--accent);margin-bottom:3px">Classical (whole-sign · PART 23.4):</div>
            ${fmt('Moon ↔ Moon', cls.moon_moon)}
            ${fmt('Venus(A) ↔ Mars(B)', cls.venus_mars_a)}
            ${fmt('Venus(B) ↔ Mars(A)', cls.venus_mars_b)}
            ${fmt('Chart lord aspect', cls.lord_aspect)}
            ${cls.shared_asc_element ? `<div><span style="color:var(--muted)">Rising element:</span> <span style="color:#ccc">shared ${cls.shared_asc_element}</span></div>` : ''}
          </div>
        `);
      }
    } catch (e) { console.warn('[synastry] classical compat:', e); }
  });

  // ── Sect tab ──────────────────────────────────────────────────────────────
  function renderSect() {
    const el = app.querySelector('#pa-sect-content');
    if (!currentChart) {
      el.innerHTML = '<div style="padding:20px;color:var(--muted)">Draw a chart first (Chart tab).</div>';
      return;
    }
    const ch = currentChart;
    const isDiurnal = ch.isDiurnal ?? true;
    const sectLabel = isDiurnal ? 'Diurnal (Day) Chart' : 'Nocturnal (Night) Chart';
    const sectIcon  = isDiurnal ? '☀' : '☽';
    const sectColor = isDiurnal ? '#ffd060' : '#dcdcf0';

    const DIURNAL_PLANETS  = ['sun', 'saturn', 'jupiter'];

    const sunP  = ch.planets.find((p) => p.name === 'sun');
    const moonP = ch.planets.find((p) => p.name === 'moon');
    const mercP = ch.planets.find((p) => p.name === 'mercury');
    let mercIsDiurnal = isDiurnal;
    if (sunP && moonP && mercP) {
      const dSun  = Math.min(Math.abs(mercP.lon - sunP.lon),  360 - Math.abs(mercP.lon - sunP.lon));
      const dMoon = Math.min(Math.abs(mercP.lon - moonP.lon), 360 - Math.abs(mercP.lon - moonP.lon));
      mercIsDiurnal = dSun <= dMoon;
    }

    const rows = ch.planets.map((p) => {
      let pSectDay;
      if (p.name === 'mercury') pSectDay = mercIsDiurnal;
      else pSectDay = DIURNAL_PLANETS.includes(p.name);
      const compatible = pSectDay === isDiurnal;
      const sym = p.symbol || PLANET_SYMBOLS[p.name] || '?';
      const col = PLANET_COLORS[p.name] || '#aaa';
      const stateLabel = compatible ? '✓ In Sect' : '✗ Out of Sect';
      const stateCol   = compatible ? '#66dd88'   : '#ff7055';
      return `<div class="pa-aspect-row">
        <span style="color:${col};font-size:16px">${sym}</span>
        <span style="flex:1;color:#ccc;font-size:12px">${p.name.charAt(0).toUpperCase() + p.name.slice(1)}</span>
        <span style="color:${stateCol};font-size:12px">${stateLabel}</span>
      </div>`;
    }).join('');

    el.innerHTML = `
      <div style="text-align:center;padding:24px 0 16px">
        <div style="font-size:48px;line-height:1">${sectIcon}</div>
        <div style="font-size:18px;color:${sectColor};font-family:${GK_FONT};margin-top:8px">${sectLabel}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:6px;max-width:400px;margin-left:auto;margin-right:auto">
          ${isDiurnal
            ? 'The Sun is above the horizon (houses VII–XII). Diurnal planets (Sun, Saturn, Jupiter) operate in their natural sect.'
            : 'The Sun is below the horizon (houses I–VI). Nocturnal planets (Moon, Venus, Mars) operate in their natural sect.'}
        </div>
      </div>
      <div style="max-width:420px;margin:0 auto">
        <div style="color:var(--accent);font-size:12px;font-family:${GK_FONT};margin-bottom:8px">Planet Sect Conditions</div>
        ${rows}
        <div class="pa-ptolemy-quote" style="margin-top:16px">
          "The sect of day … has in it the Sun, Jupiter and Saturn … the sect of night … the Moon, Venus and Mars … Mercury is common to both." — Tetrabiblos I.VII
        </div>
      </div>`;
  }

  // ── Dignities tab ──────────────────────────────────────────────────────────
  function renderDignities() {
    const el = app.querySelector('#pa-dignities-content');
    if (!currentChart) {
      el.innerHTML = '<div style="padding:20px;color:var(--muted)">Draw a chart first (Chart tab).</div>';
      return;
    }
    const ch = currentChart;
    const isDiurnal = ch.isDiurnal ?? true;
    const PLANETS   = ['sun','moon','mercury','venus','mars','jupiter','saturn'];

    const almScores = {};
    PLANETS.forEach((p) => { almScores[p] = 0; });
    const sensitivePoints = [
      ch.ascLon,
      ch.planets.find((x) => x.name === 'sun')?.lon,
      ch.planets.find((x) => x.name === 'moon')?.lon,
    ].filter((v) => v !== undefined);
    sensitivePoints.forEach((lon) => {
      PLANETS.forEach((p) => {
        almScores[p] += getPlanetDignity(p, lon, isDiurnal).score;
      });
    });
    const almuten = PLANETS.reduce((a, b) => almScores[a] >= almScores[b] ? a : b);
    const almCol = PLANET_COLORS[almuten] || '#aaa';
    const almSym = PLANET_SYMBOLS[almuten] || '?';

    const thSty = 'text-align:left;padding:5px 8px;color:var(--muted);border-bottom:1px solid rgba(255,255,255,0.1);font-size:11px';
    const tdSty = 'padding:5px 8px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:12px';

    const check = (v, neg) => {
      if (neg)  return '<span style="color:#ff7055">✗</span>';
      return v  ? '<span style="color:#66dd88">✓</span>'
                : '<span style="color:#333">—</span>';
    };

    const rows = PLANETS.map((p) => {
      const pData = ch.planets.find((x) => x.name === p);
      if (!pData) return '';
      const dig      = getPlanetDignity(p, pData.lon, isDiurnal);
      const zod      = lonToZodiac(pData.lon);
      const sym      = pData.symbol || PLANET_SYMBOLS[p] || '?';
      const col      = PLANET_COLORS[p] || '#aaa';
      const scoreCol = dig.score > 0 ? '#a8d888' : dig.score < 0 ? '#ff7055' : '#888';
      const acc      = getAccidentalDignity(p, ch);
      const accCol   = acc.score > 0 ? '#a8d888' : acc.score < 0 ? '#ff7055' : '#888';
      const accTip   = (acc.breakdown || []).join(' · ');
      return `<tr>
        <td style="${tdSty};color:${col}">${sym} ${p.charAt(0).toUpperCase() + p.slice(1)}</td>
        <td style="${tdSty};color:#bbb">${zod.sign} ${zod.symbol}</td>
        <td style="${tdSty}">${check(dig.domicile,   dig.detriment)}</td>
        <td style="${tdSty}">${check(dig.exaltation, dig.fall)}</td>
        <td style="${tdSty}">${check(dig.triplicity)}</td>
        <td style="${tdSty}">${check(dig.term)}</td>
        <td style="${tdSty}">${check(dig.face)}</td>
        <td style="${tdSty};color:${scoreCol};font-weight:700">${dig.score > 0 ? '+' : ''}${dig.score}</td>
        <td style="${tdSty};color:${accCol};font-weight:600" title="${accTip}">${acc.score > 0 ? '+' : ''}${acc.score}</td>
      </tr>`;
    }).join('');

    el.innerHTML = `
      <div style="margin-bottom:14px;padding:12px;background:rgba(212,184,120,0.08);border:1px solid rgba(212,184,120,0.2);border-radius:4px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">Almuten Figuris — Chart Ruler</div>
        <div style="font-size:18px;color:${almCol}">${almSym} ${almuten.charAt(0).toUpperCase() + almuten.slice(1)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">Highest cumulative dignity across ASC, Sun &amp; Moon (score: ${almScores[almuten]})</div>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="${thSty}">Planet</th>
            <th style="${thSty}">Sign</th>
            <th style="${thSty}" title="Domicile / Detriment">Dom</th>
            <th style="${thSty}" title="Exaltation / Fall">Exalt</th>
            <th style="${thSty}">Tri</th>
            <th style="${thSty}">Term</th>
            <th style="${thSty}">Face</th>
            <th style="${thSty}">Score</th>
            <th style="${thSty}" title="Accidental dignity — house position, solar phase, retrograde, sect">Acc</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="margin-top:10px;font-size:10px;color:var(--muted)">
        Domicile +5 · Exaltation +4 · Triplicity +3 · Term +2 · Face +1 · Detriment −5 · Fall −4
      </div>
      <div style="margin-top:4px;font-size:10px;color:var(--muted)">
        Accidental: Angular +4 · Succedent +2 · Cadent −2 · Cazimi +5 · Combust −5 · Under rays −2 · Oriental +1 · Retrograde −1 · In sect +1
      </div>
      <div class="pa-ptolemy-quote" style="margin-top:12px">
        "The planets which are in their proper houses or in their exaltations … strengthen their own constitutions." — Tetrabiblos I.XX
      </div>`;
  }

  // ── Profections tab ────────────────────────────────────────────────────────
  function renderProfections() {
    const el = app.querySelector('#pa-profections-content');
    if (!currentChart) {
      el.innerHTML = '<div style="padding:20px;color:var(--muted)">Draw a chart first (Chart tab).</div>';
      return;
    }
    const ch   = currentChart;
    const now  = new Date();
    const age  = Math.floor((now - ch.date) / (365.25 * 24 * 3600 * 1000));
    const profHouse = ((age % 12) + 12) % 12;
    const profLon   = ((ch.ascLon + profHouse * 30) % 360 + 360) % 360;
    const profSign  = lonToZodiac(profLon);
    const profSignIdx = Math.floor(profLon / 30);
    const lordEntry   = Object.entries(DOMICILE).find(([, signs]) => signs.includes(profSignIdx));
    const lordName    = lordEntry ? lordEntry[0] : 'unknown';
    const lordSym     = PLANET_SYMBOLS[lordName] || '?';
    const lordCol     = PLANET_COLORS[lordName] || '#aaa';

    const SIGN_NAMES = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpius','Sagittarius','Capricornus','Aquarius','Pisces'];
    const SIGN_SYMS  = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

    const timelineRows = [];
    for (let a = Math.max(0, age - 5); a <= age + 5; a++) {
      const h   = ((a % 12) + 12) % 12;
      const si  = Math.floor(((ch.ascLon + h * 30) % 360) / 30);
      const lo  = Object.entries(DOMICILE).find(([, signs]) => signs.includes(si));
      const lName = lo ? lo[0] : '?';
      const lSym  = PLANET_SYMBOLS[lName] || '?';
      const lCol  = PLANET_COLORS[lName] || '#aaa';
      const isCurrent = a === age;
      timelineRows.push(`
        <div class="pa-aspect-row" style="${isCurrent ? 'background:rgba(212,184,120,0.12);border-radius:4px' : ''}">
          <span style="color:var(--muted);font-size:11px;min-width:46px">Age ${a}</span>
          <span style="color:#bbb;font-size:12px;min-width:28px">H${h + 1}</span>
          <span style="color:#ccc;font-size:12px;flex:1">${SIGN_NAMES[si]} ${SIGN_SYMS[si]}</span>
          <span style="color:${lCol};font-size:12px">${lSym} ${lName.charAt(0).toUpperCase() + lName.slice(1)}</span>
          ${isCurrent ? '<span style="font-size:10px;color:#ffd060;margin-left:6px">← NOW</span>' : ''}
        </div>`);
    }

    el.innerHTML = `
      <div style="margin-bottom:16px;padding:14px;background:rgba(212,184,120,0.08);border:1px solid rgba(212,184,120,0.2);border-radius:4px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px">Current Annual Profection · Age ${age}</div>
        <div style="display:flex;gap:20px;flex-wrap:wrap">
          <div>
            <div style="font-size:11px;color:var(--muted)">Activated House</div>
            <div style="font-size:22px;color:#ffd060">House ${profHouse + 1}</div>
            <div style="font-size:11px;color:var(--muted)">${HOUSE_MEANINGS[profHouse]?.name || ''}</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted)">Activated Sign</div>
            <div style="font-size:22px;color:#ccc">${profSign.sign} ${profSign.symbol}</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted)">Lord of the Year</div>
            <div style="font-size:22px;color:${lordCol}">${lordSym} ${lordName.charAt(0).toUpperCase() + lordName.slice(1)}</div>
          </div>
        </div>
      </div>
      <div style="color:var(--accent);font-size:12px;font-family:${GK_FONT};margin-bottom:8px">Life Timeline</div>
      ${timelineRows.join('')}
      <div class="pa-ptolemy-quote" style="margin-top:16px">
        "The years of life are divided … each year governed by the succeeding sign from the nativity." — Tetrabiblos IV.X
      </div>`;
  }

  // ── Lots tab ───────────────────────────────────────────────────────────────
  function renderLots() {
    const el = app.querySelector('#pa-lots-content');
    if (!currentChart) {
      el.innerHTML = '<div style="padding:20px;color:var(--muted)">Draw a chart first (Chart tab).</div>';
      return;
    }
    const ch        = currentChart;
    const isDiurnal = ch.isDiurnal ?? true;
    const lots      = computeLots(ch);

    const lotCard = (name, icon, lot, formula) => {
      const lordName = lot.lord || 'unknown';
      const col  = PLANET_COLORS[lordName] || '#aaa';
      const sym  = PLANET_SYMBOLS[lordName] || '?';
      const zod  = lonToZodiac(lot.lon);
      return `
        <div style="padding:14px;background:rgba(212,184,120,0.06);border:1px solid rgba(212,184,120,0.2);border-radius:4px;margin-bottom:12px">
          <div style="font-size:20px;margin-bottom:6px">${icon} Lot of ${name}</div>
          <div style="font-size:15px;color:#bbb;margin-bottom:8px">${zod.sign} ${zod.symbol} · ${lot.lon.toFixed(1)}°</div>
          <div style="font-size:11px;color:var(--muted);margin-bottom:4px">Lord of the Lot</div>
          <div style="font-size:15px;color:${col}">${sym} ${lordName.charAt(0).toUpperCase() + lordName.slice(1)}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:8px">Formula (${isDiurnal ? 'day' : 'night'}): ${formula}</div>
        </div>`;
    };

    const fortuneFmla = isDiurnal ? 'ASC + ☽ − ☀' : 'ASC + ☀ − ☽';
    const spiritFmla  = isDiurnal ? 'ASC + ☀ − ☽' : 'ASC + ☽ − ☀';
    const erosFmla    = isDiurnal ? 'ASC + lord(⊕F) − lord(⊗S)' : 'ASC + lord(⊗S) − lord(⊕F)';

    el.innerHTML = `
      ${lotCard('Fortune', '⊕', lots.fortune, fortuneFmla)}
      ${lotCard('Spirit',  '⊗', lots.spirit,  spiritFmla)}
      ${lotCard('Eros',    '♥', lots.eros,    erosFmla)}
      <div class="pa-ptolemy-quote" style="margin-top:4px">
        "The Lot of Fortune … is taken from the Sun to the Moon … and the space from the Ascendant … the Lot of the Daemon in the opposite way." — Tetrabiblos IV.I
      </div>`;
  }

  // ── Almuten tab ────────────────────────────────────────────────────────────
  function renderAlmuten() {
    const el = app.querySelector('#pa-almuten-content');
    if (!currentChart) {
      el.innerHTML = '<div style="padding:20px;color:var(--muted)">Draw a chart first (Chart tab).</div>';
      return;
    }
    const ch        = currentChart;
    const isDiurnal = ch.isDiurnal ?? true;
    const PLANETS   = ['sun','moon','mercury','venus','mars','jupiter','saturn'];
    const asc       = ch.ascLon ?? 0;
    const sunL      = ch.planets.find((p) => p.name === 'sun')?.lon  ?? 0;
    const monL      = ch.planets.find((p) => p.name === 'moon')?.lon ?? 0;
    const fortuneLon = isDiurnal
      ? ((asc + monL - sunL) % 360 + 360) % 360
      : ((asc + sunL - monL) % 360 + 360) % 360;
    const syzygyLon = ((sunL + monL) / 2 + 360) % 360;

    const sensitivePoints = [
      { name: 'ASC',             lon: asc },
      { name: '☀ Sun',           lon: sunL },
      { name: '☽ Moon',          lon: monL },
      { name: '⊕ Fortune',       lon: fortuneLon },
      { name: 'Prenatal Syzygy', lon: syzygyLon },
    ];

    const scores = {};
    PLANETS.forEach((p) => { scores[p] = 0; });
    sensitivePoints.forEach(({ lon }) => {
      PLANETS.forEach((p) => { scores[p] += getPlanetDignity(p, lon, isDiurnal).score; });
    });

    const sorted  = [...PLANETS].sort((a, b) => scores[b] - scores[a]);
    const almuten = sorted[0];
    const almCol  = PLANET_COLORS[almuten] || '#aaa';
    const almSym  = PLANET_SYMBOLS[almuten] || '?';

    const scoreRows = sorted.map((p, i) => {
      const col      = PLANET_COLORS[p] || '#aaa';
      const sym      = PLANET_SYMBOLS[p] || '?';
      const scoreCol = scores[p] > 0 ? '#a8d888' : scores[p] < 0 ? '#ff7055' : '#888';
      return `<div class="pa-aspect-row">
        <span style="color:var(--muted);font-size:11px;min-width:20px">${i + 1}.</span>
        <span style="color:${col};font-size:16px">${sym}</span>
        <span style="flex:1;color:#ccc;font-size:12px">${p.charAt(0).toUpperCase() + p.slice(1)}</span>
        <span style="color:${scoreCol};font-weight:700">${scores[p] > 0 ? '+' : ''}${scores[p]}</span>
      </div>`;
    }).join('');

    const ptRows = sensitivePoints.map(({ name, lon }) => {
      const z = lonToZodiac(lon);
      return `<div style="font-size:11px;color:var(--muted);display:flex;gap:8px;margin-bottom:3px">
        <span style="min-width:110px">${name}</span>
        <span>${z.sign} ${z.symbol} ${lon.toFixed(1)}°</span>
      </div>`;
    }).join('');

    el.innerHTML = `
      <div style="margin-bottom:16px;padding:14px;background:rgba(212,184,120,0.08);border:1px solid rgba(212,184,120,0.2);border-radius:4px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">Almuten Figuris — Predominating Planet</div>
        <div style="font-size:22px;color:${almCol}">${almSym} ${almuten.charAt(0).toUpperCase() + almuten.slice(1)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">Cumulative dignity score: ${scores[almuten]}</div>
      </div>
      <div style="color:var(--accent);font-size:12px;font-family:${GK_FONT};margin-bottom:8px">Planet Scores (5 Sensitive Points)</div>
      ${scoreRows}
      <div style="margin-top:14px;color:var(--accent);font-size:12px;font-family:${GK_FONT};margin-bottom:6px">Sensitive Points Used</div>
      ${ptRows}
      <div class="pa-ptolemy-quote" style="margin-top:16px">
        "The Almuten … is that planet which has the most dignities in the places of the luminaries, the Ascendant, the Lot of Fortune and the preceding syzygy." — Ptolemy
      </div>`;
  }

  // ── Bonification / Maltreatment tab ───────────────────────────────────────
  function renderBonification() {
    const el = app.querySelector('#pa-bonification-content');
    if (!currentChart) {
      el.innerHTML = '<div style="padding:20px;color:var(--muted)">Draw a chart first (Chart tab).</div>';
      return;
    }
    const ch       = currentChart;
    const planets  = ch.planets;
    const BENEFICS = ['venus', 'jupiter'];
    const MALEFICS = ['saturn', 'mars'];
    const PLANET_ORDER = ['sun','moon','mercury','venus','mars','jupiter','saturn'];

    const angDiff = (a, b) => {
      const d = ((b - a) % 360 + 360) % 360;
      return d <= 180 ? d : d - 360;
    };

    const getAspectType = (diff) => {
      const abs = Math.abs(diff);
      if (abs < 10)                return { name: 'Conjunction', symbol: '☌' };
      if (Math.abs(abs - 60)  < 8) return { name: 'Sextile',    symbol: '⚹' };
      if (Math.abs(abs - 90)  < 8) return { name: 'Square',     symbol: '□' };
      if (Math.abs(abs - 120) < 8) return { name: 'Trine',      symbol: '△' };
      if (Math.abs(abs - 180) < 10) return { name: 'Opposition', symbol: '☍' };
      return null;
    };

    const allRows = PLANET_ORDER.map((pName) => {
      const p = planets.find((x) => x.name === pName);
      if (!p) return '';
      const conditions = [];
      [...BENEFICS, ...MALEFICS].forEach((other) => {
        if (other === pName) return;
        const otherP = planets.find((x) => x.name === other);
        if (!otherP) return;
        const diff   = angDiff(otherP.lon, p.lon);
        const aspect = getAspectType(diff);
        if (!aspect) return;
        const gap       = ((p.lon - otherP.lon) % 360 + 360) % 360;
        const applying  = gap < 180;
        const isBenefic = BENEFICS.includes(other);
        const typeCol   = applying ? '#ffd060' : '#666';
        const otherSym  = PLANET_SYMBOLS[other] || other;
        const otherCol  = PLANET_COLORS[other]  || '#aaa';
        const effectName = isBenefic
          ? (applying ? 'Bonification' : 'Past Beneficence')
          : (applying ? 'Maltreatment' : 'Past Harm');
        const effectCol = isBenefic ? '#66dd88' : '#ff7055';
        conditions.push(`<div style="font-size:11px;display:flex;gap:6px;align-items:center;margin-top:4px">
          <span style="color:${otherCol}">${otherSym}</span>
          <span style="color:#888">${aspect.symbol} ${aspect.name}</span>
          <span style="color:${typeCol};font-size:10px">${applying ? 'Applying' : 'Separating'}</span>
          <span style="color:${effectCol};margin-left:auto;font-size:10px">${effectName}</span>
        </div>`);
      });

      const pSym = p.symbol || PLANET_SYMBOLS[p.name] || '?';
      const pCol = PLANET_COLORS[p.name] || '#aaa';
      const zod  = lonToZodiac(p.lon);
      return `<div class="pa-interp-box" style="margin-bottom:8px">
        <div class="pa-interp-header">
          <strong style="color:${pCol}">${pSym} ${p.name.charAt(0).toUpperCase() + p.name.slice(1)}</strong>
          <span class="pa-interp-in"> in </span>
          <strong>${zod.sign} ${zod.symbol}</strong>
        </div>
        ${conditions.length
          ? conditions.join('')
          : '<div style="font-size:11px;color:var(--muted);margin-top:4px">No Ptolemaic aspects from benefics or malefics within orb.</div>'}
      </div>`;
    }).filter(Boolean).join('');

    el.innerHTML = `
      <div style="margin-bottom:12px;font-size:12px;color:var(--muted)">
        Bonification: aspects from ♀ Venus or ♃ Jupiter · Maltreatment: aspects from ♄ Saturn or ♂ Mars
      </div>
      ${allRows}
      <div class="pa-ptolemy-quote" style="margin-top:16px">
        "Benefited when … the benefic stars cast their rays upon it … injured when the malefic stars regard it." — Tetrabiblos I.XXIV
      </div>`;
  }

  // ── Utility ────────────────────────────────────────────────────────────────
  function ctx2blank(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Auto-draw helper ───────────────────────────────────────────────────────
  function _autoDraw() {
    const dateStr = dateEl.value || toDateInput(new Date());
    const timeStr = timeEl.value || '12:00';
    const lat     = parseFloat(latEl.value)  || 40.7;
    const lon2    = parseFloat(lonEl.value)  || -74.0;
    const source  = model.state?.BodySource  || 'ibnshatir';
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, mi]    = timeStr.split(':').map(Number);
    const date = new Date(Date.UTC(y, mo - 1, d, h, mi, 0));
    try {
      currentChart = computeFullChart(date, lat, lon2, source);
      currentChart._name  = nameEl.value.trim() || 'Current Sky';
      currentChart._place = placeEl.value.trim();
      renderChartOutput(currentChart);
    } catch (err) {
      console.error('[Astrology] auto-draw error:', err);
    }
  }

  // ── Lifespan tab (Guide 06 — Apheta / Anareta / Primary Directions) ────────
  function renderLifespan() {
    const el = app.querySelector('#pa-lifespan-content');
    if (!el) return;
    if (!currentChart) {
      el.innerHTML = '<div style="padding:20px;color:var(--muted)">Draw a chart first (Synastry tab loads profiles).</div>';
      return;
    }
    const ch = currentChart;
    const apheta = selectApheta(ch);
    const anaretae = findAnaretae(ch, apheta).slice(0, 8);
    const now = new Date();
    const age = Math.max(0, Math.floor((now - ch.date) / (365.25 * 24 * 3600 * 1000)));
    const events = primaryDirections(ch, Math.max(0, age - 5), 40);
    const lots   = computeLots(ch);

    const apSym = apheta.name === 'asc' ? '↑' : (PLANET_SYMBOLS[apheta.name] || '?');
    const apCol = PLANET_COLORS[apheta.name] || '#ffd060';
    const apZod = lonToZodiac(apheta.lon);

    const anaretaRows = anaretae.map(t => `
      <div class="pa-aspect-row">
        <span style="font-size:12px;color:#ccc;flex:1">${t.target}</span>
        <span style="font-size:12px;color:#ffd060">${t.arcDeg.toFixed(1)}°</span>
        <span style="font-size:10px;color:var(--muted)">≈ ${Math.round(t.arcDeg)} yr</span>
      </div>`).join('') || '<div style="color:var(--muted);font-size:11px;padding:6px">No anaretic candidates within range.</div>';

    const eventRows = events.map(e => {
      const sym = PLANET_SYMBOLS[e.planet] || '?';
      const col = PLANET_COLORS[e.planet]  || '#aaa';
      const isCurrent = e.atAge === age;
      return `
        <div class="pa-aspect-row" style="${isCurrent ? 'background:rgba(212,184,120,0.12);border-radius:4px' : ''}">
          <span style="color:var(--muted);font-size:11px;min-width:46px">Age ${e.atAge}</span>
          <span style="color:${col};font-size:14px">${sym}</span>
          <span style="color:#ccc;font-size:12px;flex:1">${e.planet} · ${e.aspect}</span>
          ${isCurrent ? '<span style="font-size:10px;color:#ffd060">← NOW</span>' : ''}
        </div>`;
    }).join('') || '<div style="color:var(--muted);font-size:11px;padding:6px">No directions in window.</div>';

    el.innerHTML = `
      <div style="margin-bottom:14px;padding:14px;background:rgba(212,184,120,0.08);border:1px solid rgba(212,184,120,0.2);border-radius:4px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Apheta — Significator of Life</div>
        <div style="font-size:22px;color:${apCol}">${apSym} ${apheta.name.charAt(0).toUpperCase() + apheta.name.slice(1)}</div>
        <div style="font-size:12px;color:#bbb;margin-top:4px">${apZod.sign} ${apZod.symbol} · ${apheta.lon.toFixed(1)}° · House ${apheta.house}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:6px">${apheta.source}</div>
      </div>

      <div style="color:var(--accent);font-size:12px;font-family:${GK_FONT};margin-bottom:6px">Anareta Candidates (closest first)</div>
      <div style="margin-bottom:14px">${anaretaRows}</div>

      <div style="color:var(--accent);font-size:12px;font-family:${GK_FONT};margin-bottom:6px">Primary Directions Timeline · current age ${age}</div>
      <div style="margin-bottom:14px">${eventRows}</div>

      <div style="font-size:10px;color:var(--muted);font-style:italic;margin-bottom:8px">
        Rate: 1° of right ascension = 1 year (PART 14.2). Arcs computed from ecliptic
        longitude — a close approximation for points near the ecliptic.
      </div>

      <div class="pa-ptolemy-quote">
        "The places which are productive of life are five only: that part of the
         zodiac which extends from the fifth degree above the ascendant down to the
         twenty-fifth below it … the midheaven … the eleventh, the seventh, and the
         ninth." — Tetrabiblos III.X
      </div>`;
  }

  // ── Mundane tab (Guide 07 — Eclipses, Conjunctions, Ingresses, Weather) ───
  function renderMundane() {
    const el = app.querySelector('#pa-mundane-content');
    if (!el) return;
    const refDate = currentChart?.date || new Date();
    const refYear = refDate.getUTCFullYear();
    const source  = currentChart?.source || (model.state?.BodySource || 'ibnshatir');

    let eclipses = [];
    try { eclipses = upcomingEclipses(refDate, 6, source); } catch (e) { console.warn('[mundane] eclipses', e); }

    let conjunctions = [];
    try { conjunctions = detectGreatConjunctions(currentChart?.planets || []); } catch (_) {}

    let ingresses = [];
    try { ingresses = cardinalIngresses(refYear, source); } catch (_) {}

    let weather = null;
    try { weather = currentChart ? weatherFromChart(currentChart) : null; } catch (_) {}

    const SIGN_SYMS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

    const eclipseRows = eclipses.map(e => {
      const lordSym = e.eclipseLord ? (PLANET_SYMBOLS[e.eclipseLord] || '?') : '?';
      const lordCol = e.eclipseLord ? (PLANET_COLORS[e.eclipseLord] || '#aaa') : '#aaa';
      const kindLabel = e.kind === 'solar' ? '☉ Solar' : '☽ Lunar';
      return `
        <div class="pa-aspect-row" style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.05)">
          <span style="font-size:11px;color:var(--muted);min-width:90px">${e.dateLabel}</span>
          <span style="font-size:12px;color:#ccc;min-width:84px">${kindLabel} ${e.type || ''}</span>
          <span style="font-size:14px;color:#ffd060;min-width:80px">${e.signSym} ${e.sign}</span>
          <span style="font-size:11px;color:var(--muted);min-width:42px">${e.element} · ${e.direction}</span>
          <span style="font-size:11px;color:#bbb;flex:1">${e.region}</span>
          <span style="font-size:12px;color:${lordCol}" title="Eclipse lord">${lordSym}</span>
        </div>`;
    }).join('') || '<div style="color:var(--muted);font-size:11px;padding:8px">No eclipses in upcoming window.</div>';

    const conjunctionRows = conjunctions.map(c => `
      <div class="pa-aspect-row">
        <span style="font-size:12px;color:#ffd060;flex:1">${c.pair.replace('-', ' & ')}</span>
        <span style="font-size:12px;color:#ccc">${SIGN_SYMS[c.sign]}</span>
        <span style="font-size:11px;color:var(--muted)">${c.element}</span>
        <span style="font-size:11px;color:var(--muted)">${c.elongationDeg.toFixed(1)}° apart</span>
      </div>`).join('') || '<div style="color:var(--muted);font-size:11px;padding:6px">No same-sign superior-planet conjunctions in the current chart.</div>';

    const ingressRows = ingresses.map(ig => `
      <div class="pa-aspect-row">
        <span style="font-size:12px;color:#ccc;flex:1">${ig.sign} ingress</span>
        <span style="font-size:11px;color:var(--muted)">${ig.date.toISOString().replace('T',' ').slice(0,16)} UTC</span>
      </div>`).join('') || '<div style="color:var(--muted);font-size:11px;padding:6px">Could not compute ingresses.</div>';

    const weatherRow = weather
      ? `<div style="font-size:13px;color:#ccc">${weather.label}</div>
         <div style="font-size:10px;color:var(--muted);margin-top:4px">Moon in sign ${weather.moonSign + 1} · ${weather.primary} · ${weather.secondary}</div>`
      : '<div style="color:var(--muted);font-size:11px">Draw a chart to see the weather verdict.</div>';

    el.innerHTML = `
      <div style="margin-bottom:14px;padding:12px;background:rgba(212,184,120,0.08);border:1px solid rgba(212,184,120,0.2);border-radius:4px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">Mundane Astrology — Tetrabiblos Books I–II</div>
        <div style="font-size:11px;color:var(--muted);font-style:italic">"It is the primary form of astrology for Ptolemy; natal astrology is secondary." — PART 15</div>
      </div>

      <div style="color:var(--accent);font-size:12px;font-family:${GK_FONT};margin-bottom:6px">Upcoming Eclipses · region by triplicity</div>
      <div style="margin-bottom:14px">${eclipseRows}</div>

      <div style="color:var(--accent);font-size:12px;font-family:${GK_FONT};margin-bottom:6px">Great Conjunctions (Saturn / Jupiter / Mars · same sign)</div>
      <div style="margin-bottom:14px">${conjunctionRows}</div>

      <div style="color:var(--accent);font-size:12px;font-family:${GK_FONT};margin-bottom:6px">Cardinal Ingresses · ${refYear}</div>
      <div style="margin-bottom:14px">${ingressRows}</div>

      <div style="color:var(--accent);font-size:12px;font-family:${GK_FONT};margin-bottom:6px">Today's Weather Verdict</div>
      <div style="margin-bottom:14px;padding:8px 10px;background:rgba(255,255,255,0.03);border-radius:4px">${weatherRow}</div>

      <div class="pa-ptolemy-quote">
        "The greater and more important events are produced by the conjunctions of
         the heavenly bodies … and the eclipses of the luminaries." — Tetrabiblos II.IV
      </div>`;
  }

  // ── Solar Returns tab (Guide 09) ───────────────────────────────────────────
  function renderReturns() {
    const el = app.querySelector('#pa-returns-content');
    if (!el) return;
    if (!currentChart) {
      el.innerHTML = '<div style="padding:20px;color:var(--muted)">Draw a natal chart first.</div>';
      return;
    }
    const natal = currentChart;
    const natalSun = natal.planets.find(p => p.name === 'sun');
    if (!natalSun) {
      el.innerHTML = '<div style="padding:20px;color:#ff7055">Natal Sun not available.</div>';
      return;
    }
    const natalSunLon = natalSun.lon;
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
    const returns = years.map(y => {
      let retDate, retChart;
      try {
        retDate = solarReturnDate(natalSunLon, natal.date, y, natal.source);
        retChart = computeFullChart(retDate, natal.lat, natal.lon, natal.source);
      } catch (e) { console.warn('[returns] year', y, e); }
      return { year: y, date: retDate, chart: retChart };
    });

    const canvasId = 'pa-returns-wheel';
    const svgWrapId = 'pa-returns-wheel-svg';
    let _wheelMode = 'svg'; // default to SVG per Guide 07
    const SIGN_SYMS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

    const tabBtns = returns.map((r, idx) => `
      <button class="pa-btn" data-return-idx="${idx}" style="padding:4px 10px;font-size:11px;${idx===1?'background:rgba(212,184,120,0.18);border-color:#c8960a;color:#ffd060':''}">${r.year}</button>
    `).join('');

    const renderReturnSummary = (r) => {
      if (!r?.chart) return '<div style="color:#ff7055;padding:10px">Return chart unavailable.</div>';
      const sunZod = lonToZodiac(r.chart.planets.find(p => p.name === 'sun').lon);
      return `<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
        <div><div style="font-size:11px;color:var(--muted)">Solar Return</div>
          <div style="font-size:14px;color:#ffd060">${r.date ? r.date.toISOString().replace('T',' ').slice(0,16) + ' UTC' : '—'}</div></div>
        <div><div style="font-size:11px;color:var(--muted)">Sun</div>
          <div style="font-size:14px;color:#ccc">${sunZod.sign} ${sunZod.symbol} ${sunZod.deg}°${sunZod.min.toString().padStart(2,'0')}'</div></div>
      </div>`;
    };

    el.innerHTML = `
      <div style="margin-bottom:12px;padding:12px;background:rgba(212,184,120,0.08);border:1px solid rgba(212,184,120,0.2);border-radius:4px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Solar Return — Tetrabiblos IV (PART 14.3)</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${tabBtns}</div>
        <div id="pa-returns-summary" style="margin-top:10px">${renderReturnSummary(returns[1])}</div>
      </div>
      <div class="pa-wheel-toggle" style="display:flex;gap:6px;margin-bottom:8px">
        <button class="pa-btn" data-wheel-mode="svg"    style="font-size:11px;padding:3px 8px">Wheel: SVG</button>
        <button class="pa-btn" data-wheel-mode="canvas" style="font-size:11px;padding:3px 8px">Wheel: Canvas (legacy)</button>
      </div>
      <div style="display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap">
        <div>
          <canvas id="${canvasId}" width="520" height="520" hidden></canvas>
          <div id="${svgWrapId}" style="width:520px;height:520px"></div>
        </div>
        <div style="flex:1;min-width:260px">
          <div style="color:var(--accent);font-size:12px;font-family:${GK_FONT};margin-bottom:6px">Return → Natal Aspects</div>
          <div id="pa-returns-aspects" style="font-size:11px"></div>
        </div>
      </div>
      <div class="pa-ptolemy-quote" style="margin-top:14px">
        "Every revolution of the year brings the Sun back to its proper place; from
         this place is to be observed the quality of the time approaching." — Tetrabiblos IV.X
      </div>`;

    const drawReturnAt = (idx) => {
      const r = returns[idx];
      app.querySelector('#pa-returns-summary').innerHTML = renderReturnSummary(r);
      const cnv = app.querySelector('#' + canvasId);
      const svgWrap = app.querySelector('#' + svgWrapId);
      if (_wheelMode === 'svg') {
        if (cnv) cnv.hidden = true;
        if (svgWrap) svgWrap.style.display = '';
        if (r?.chart && svgWrap) {
          try {
            svgWrap.innerHTML = '';
            const wheel = renderChartWheelSvg(natal, {
              size: 520, outerChart: r.chart, outerLabel: `${r.year} return`,
            });
            svgWrap.appendChild(wheel);
          } catch (e) { console.warn('[returns] svg draw', e); }
        }
      } else {
        if (cnv) cnv.hidden = false;
        if (svgWrap) { svgWrap.style.display = 'none'; svgWrap.innerHTML = ''; }
        if (r?.chart && cnv) {
          try {
            drawChartWheel(cnv, natal, { outerChart: r.chart, outerColor: '#ffd060', label: 'Return' });
          } catch (e) { console.warn('[returns] canvas draw', e); }
        }
      }
      const aspList = app.querySelector('#pa-returns-aspects');
      if (r?.chart && aspList) {
        const xa = computeCrossAspects(
          natal.planets.map(p => ({ name: p.name, lon: p.lon, symbol: p.symbol })),
          r.chart.planets.map(p => ({ name: p.name, lon: p.lon, symbol: p.symbol })),
        );
        aspList.innerHTML = xa.slice(0, 30).map(({ natal: n, transiting: t, aspect }) => `
          <div class="pa-aspect-row">
            <span style="color:${PLANET_COLORS[n.name]||'inherit'}">${n.symbol||n.name}</span>
            <span style="color:${aspect.color};font-size:14px">${aspect.symbol}</span>
            <span style="color:${PLANET_COLORS[t.name]||'inherit'}">${t.symbol||t.name}</span>
            <span style="color:var(--muted);font-size:10px;flex:1">natal ${n.name} · ${aspect.name} · return ${t.name}</span>
            <span style="color:var(--muted);font-size:10px">${(aspect.degreeOffExact ?? aspect.orb ?? 0).toFixed(1)}°</span>
          </div>`).join('') || '<div style="color:var(--muted)">No cross-aspects.</div>';
      }
    };
    drawReturnAt(1);

    let _activeIdx = 1;
    el.querySelectorAll('[data-return-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('[data-return-idx]').forEach(b => {
          b.style.background = '';
          b.style.borderColor = '';
          b.style.color = '';
        });
        btn.style.background = 'rgba(212,184,120,0.18)';
        btn.style.borderColor = '#c8960a';
        btn.style.color = '#ffd060';
        _activeIdx = parseInt(btn.dataset.returnIdx, 10);
        drawReturnAt(_activeIdx);
      });
    });

    el.querySelectorAll('[data-wheel-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        _wheelMode = btn.dataset.wheelMode;
        drawReturnAt(_activeIdx);
      });
    });
  }

  // ── Natal Report tab (Guide 10 — Tetrabiblos III–IV ordering) ─────────────
  function renderReport() {
    const el = app.querySelector('#pa-report-content');
    if (!el) return;
    if (!currentChart) {
      el.innerHTML = '<div style="padding:20px;color:var(--muted)">Draw a natal chart first.</div>';
      return;
    }
    const SIGN_SYMS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
    const SIGN_NAMES = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpius','Sagittarius','Capricornus','Aquarius','Pisces'];

    const ch = currentChart;
    const report = buildNatalReport(ch, { gender: 'm' });

    const planetSpan = (name) => {
      if (!name) return '—';
      const col = PLANET_COLORS[name] || '#aaa';
      const sym = PLANET_SYMBOLS[name] || '?';
      return `<span style="color:${col}">${sym} ${name.charAt(0).toUpperCase() + name.slice(1)}</span>`;
    };
    const signSpan = (idx) => idx == null ? '—' : `${SIGN_NAMES[idx]} ${SIGN_SYMS[idx]}`;

    const houseTopicCard = (topic, headerTitle) => {
      if (!topic) return '';
      const lc = topic.lordCondition;
      const occHtml = topic.occupants.length
        ? topic.occupants.map(o => planetSpan(o.name)).join(' · ')
        : '<span style="color:var(--muted)">empty</span>';
      const lordTxt = lc
        ? `lord ${planetSpan(topic.lord)} in H${lc.house}; essential ${lc.dignity.score >= 0 ? '+' : ''}${lc.dignity.score} (${lc.dignity.label}); accidental ${lc.accidental.score >= 0 ? '+' : ''}${lc.accidental.score}`
        : `lord ${planetSpan(topic.lord)} not in chart`;
      return `
        <details ${headerTitle === 'Foundation' ? 'open' : ''}>
          <summary style="font-family:${GK_FONT};color:var(--accent);font-size:13px;cursor:pointer;padding:6px 0">${headerTitle}</summary>
          <div style="padding:6px 0 10px 12px;font-size:12px;color:#ccc;line-height:1.6">
            <div><b>House ${topic.house}</b> · ${topic.name} — ${signSpan(topic.sign)}</div>
            <div style="color:var(--muted);font-size:11px;margin-top:2px">${topic.meaning || ''}</div>
            <div style="margin-top:4px">${lordTxt}</div>
            <div style="margin-top:4px">Occupants: ${occHtml}</div>
          </div>
        </details>`;
    };

    const f = report.foundation;
    const foundationHtml = `
      <details open>
        <summary style="font-family:${GK_FONT};color:var(--accent);font-size:13px;cursor:pointer;padding:6px 0">Foundation</summary>
        <div style="padding:6px 0 10px 12px;font-size:12px;color:#ccc;line-height:1.6">
          <div>Sect: <b>${f.sect}</b>. Sect light: ${planetSpan(f.sectLight)}.</div>
          <div>Ascendant: ${signSpan(f.ascendant.sign)} ruled by ${planetSpan(f.ascendant.ruler)}.</div>
          <div>Chart lord: ${planetSpan(f.chartLord?.name)} <span style="color:var(--muted)">(${f.chartLord?.source || '—'})</span></div>
          <div>Temperament: <b style="color:#ffd060">${f.temperament || '—'}</b>
            <span style="color:var(--muted);font-size:10px">(hot:${f.qualityVotes.hot} cold:${f.qualityVotes.cold} moist:${f.qualityVotes.moist} dry:${f.qualityVotes.dry})</span></div>
        </div>
      </details>`;

    const s = report.soul;
    const soulHtml = `
      <details>
        <summary style="font-family:${GK_FONT};color:var(--accent);font-size:13px;cursor:pointer;padding:6px 0">Soul — Mercury (rational) · Moon (irrational)</summary>
        <div style="padding:6px 0 10px 12px;font-size:12px;color:#ccc;line-height:1.6">
          <div>${planetSpan('mercury')} at ${signSpan(s.mercury.lon != null ? Math.floor(s.mercury.lon/30) : null)} · ${s.mercury.dignity ? s.mercury.dignity.label : '—'}</div>
          <div>${planetSpan('moon')} at ${signSpan(s.moon.lon != null ? Math.floor(s.moon.lon/30) : null)} · ${s.moon.dignity ? s.moon.dignity.label : '—'}</div>
        </div>
      </details>`;

    const ft = report.fortune;
    const fortuneSignIdx = Math.floor(((ft.lot.lon % 360) + 360) % 360 / 30);
    const fortuneHtml = `
      <details>
        <summary style="font-family:${GK_FONT};color:var(--accent);font-size:13px;cursor:pointer;padding:6px 0">Fortune — Material circumstances</summary>
        <div style="padding:6px 0 10px 12px;font-size:12px;color:#ccc;line-height:1.6">
          <div>Lot of Fortune: ${signSpan(fortuneSignIdx)} · ${ft.lot.lon.toFixed(1)}°</div>
          <div>Lord of the Lot: ${planetSpan(ft.lordOfLot)} · ${ft.lordCondition ? ft.lordCondition.label : '—'}</div>
        </div>
      </details>`;

    const dg = report.dignity;
    const dignityHtml = `
      <details>
        <summary style="font-family:${GK_FONT};color:var(--accent);font-size:13px;cursor:pointer;padding:6px 0">Dignity — Rank, authority, career</summary>
        <div style="padding:6px 0 10px 12px;font-size:12px;color:#ccc;line-height:1.6">
          <div>MC sign: ${signSpan(dg.mcSign)} ruled by ${planetSpan(dg.mcRuler)}</div>
          ${houseTopicCard(dg.houseX, 'House X (Occupation · Reputation)')}
        </div>
      </details>`;

    const par = report.parents;
    const parentsHtml = `
      <details>
        <summary style="font-family:${GK_FONT};color:var(--accent);font-size:13px;cursor:pointer;padding:6px 0">Parents</summary>
        <div style="padding:6px 0 10px 12px;font-size:12px;color:#ccc;line-height:1.6">
          <div>Father: significators ${par.father.significators.map(planetSpan).join(' · ')}</div>
          ${houseTopicCard(par.father.house, 'House IV')}
          <div style="margin-top:8px">Mother: significators ${par.mother.significators.map(planetSpan).join(' · ')}</div>
          ${houseTopicCard(par.mother.house, 'House X')}
        </div>
      </details>`;

    const mar = report.marriage;
    const marriageHtml = `
      <details>
        <summary style="font-family:${GK_FONT};color:var(--accent);font-size:13px;cursor:pointer;padding:6px 0">Marriage</summary>
        <div style="padding:6px 0 10px 12px;font-size:12px;color:#ccc;line-height:1.6">
          <div>Significator: ${planetSpan(mar.significator)}</div>
          ${houseTopicCard(mar.house, 'House VII')}
        </div>
      </details>`;

    const lv = report.livelihood;
    const livelihoodHtml = `
      <details>
        <summary style="font-family:${GK_FONT};color:var(--accent);font-size:13px;cursor:pointer;padding:6px 0">Livelihood</summary>
        <div style="padding:6px 0 10px 12px;font-size:12px;color:#ccc;line-height:1.6">
          ${houseTopicCard(lv.house2, 'House II (Substance)')}
          <div>House X lord: ${planetSpan(lv.house10Lord)}</div>
        </div>
      </details>`;

    const dt = report.death;
    const deathHtml = `
      <details>
        <summary style="font-family:${GK_FONT};color:var(--accent);font-size:13px;cursor:pointer;padding:6px 0">Death — Apheta / Anareta</summary>
        <div style="padding:6px 0 10px 12px;font-size:12px;color:#ccc;line-height:1.6">
          <div>Apheta: ${planetSpan(dt.apheta.name === 'asc' ? null : dt.apheta.name) || 'Ascendant'} at ${dt.apheta.lon.toFixed(1)}° (House ${dt.apheta.house}) · ${dt.apheta.source}</div>
          <div style="margin-top:4px">Closest anareta candidates:</div>
          ${dt.anaretae.map(a => `<div style="margin-left:10px;color:#bbb">· ${a.target} — ${a.arcDeg.toFixed(1)}° (≈ ${Math.round(a.arcDeg)} yr)</div>`).join('') || '<div style="color:var(--muted);margin-left:10px">none</div>'}
          ${houseTopicCard(dt.house8, 'House VIII')}
        </div>
      </details>`;

    const pr = report.predictive;
    const dirsHtml = pr.directions.map(d => `<div style="margin-left:10px;color:#bbb">· Age ${d.atAge} — ${d.planet} · ${d.aspect}</div>`).join('') || '<div style="color:var(--muted);margin-left:10px">no directions in window</div>';
    const predictiveHtml = `
      <details>
        <summary style="font-family:${GK_FONT};color:var(--accent);font-size:13px;cursor:pointer;padding:6px 0">Predictive — Profections · Primary Directions</summary>
        <div style="padding:6px 0 10px 12px;font-size:12px;color:#ccc;line-height:1.6">
          <div>Current age: <b>${pr.age}</b></div>
          <div>Annual profection: House ${pr.profection.house} · ${signSpan(pr.profection.sign)}</div>
          <div style="margin-top:6px">Primary directions (next 10 yr):</div>
          ${dirsHtml}
        </div>
      </details>`;

    el.innerHTML = `
      <div style="margin-bottom:14px;padding:14px;background:rgba(212,184,120,0.08);border:1px solid rgba(212,184,120,0.2);border-radius:4px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">Tetrabiblos III–IV · Natal Report</div>
        <div style="font-size:13px;color:#ccc">${ch._name || 'Current chart'}${ch._place ? ' · ' + ch._place : ''}</div>
      </div>
      ${foundationHtml}
      ${soulHtml}
      ${fortuneHtml}
      ${dignityHtml}
      ${parentsHtml}
      ${houseTopicCard(report.siblings, 'Siblings — House III')}
      ${houseTopicCard(report.children, 'Children — House V')}
      ${marriageHtml}
      ${livelihoodHtml}
      ${houseTopicCard(report.travel, 'Travel — House IX')}
      ${deathHtml}
      ${predictiveHtml}
      <div class="pa-ptolemy-quote" style="margin-top:14px">
        "We must now proceed to particulars … and treat first of the disposition of the
         soul … then of the body … and then of the actions, the fortune, the marriage,
         the children, and the manner of death." — Tetrabiblos III.I
      </div>`;
  }

  // ── Show / Hide ────────────────────────────────────────────────────────────
  let _onboardingChecked = false;
  function show() {
    app.hidden = false;
    // Default to the Zodiac Wheel tab (the new default after the
    // 2026-05-20 rework). The previous chart-input filling logic was
    // removed with the Chart tab — dateEl, timeEl, latEl, lonEl are
    // null now since their #pa-* nodes no longer exist in the DOM.
    switchTab('zodiacwheel');

    // Guide 09 — first-launch astrology onboarding. Fires only if no
    // charts are stored yet (chart library is empty). Once dismissed
    // for this session it won't re-prompt.
    if (!_onboardingChecked) {
      _onboardingChecked = true;
      maybeRunAstrologyOnboarding(loadAllCharts).then(rec => {
        if (rec) {
          // New chart saved — refresh profiles cache and load it as current.
          refreshProfilesCache().then(() => {
            if (rec.chart) {
              currentChart = rec.chart;
              currentChart._name  = rec.birth?.name || '';
              currentChart._place = rec.birth?.location_name || '';
            }
          });
        }
      }).catch(e => console.warn('[onboarding] failed:', e));
    }
  }

  function hide() {
    app.hidden = true;
  }

  return { show, hide };
}
