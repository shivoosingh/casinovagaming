export type PromoPlace = { folder: string; sub?: string; night?: boolean };

export type FolderChild = { id: string; label: string; emoji: string };

export type FolderDef = {
  id: string;
  label: string;
  emoji: string;
  children?: FolderChild[];
};

export const FOLDERS: FolderDef[] = [
  { id: "monday", label: "Monday", emoji: "💼" },
  { id: "tuesday", label: "Tuesday", emoji: "⚡" },
  { id: "wednesday", label: "Wednesday", emoji: "🌤️" },
  { id: "thursday", label: "Thursday", emoji: "🎯" },
  { id: "friday", label: "Friday", emoji: "🔥" },
  { id: "saturday", label: "Saturday", emoji: "🎰" },
  { id: "sunday", label: "Sunday", emoji: "☀️" },
  {
    id: "festivals",
    label: "Festivals",
    emoji: "🛍️",
    children: [
      { id: "black-friday", label: "Black Friday", emoji: "🛍️" },
      { id: "cyber-monday", label: "Cyber Monday", emoji: "💻" },
      { id: "holiday-weekend", label: "Holiday Weekend", emoji: "🎉" },
    ],
  },
  {
    id: "holidays",
    label: "Holidays",
    emoji: "🎊",
    children: [
      { id: "halloween", label: "Halloween", emoji: "🎃" },
      { id: "thanksgiving", label: "Thanksgiving", emoji: "🦃" },
      { id: "christmas", label: "Christmas", emoji: "🎄" },
      { id: "new-year", label: "New Year", emoji: "🎆" },
      { id: "valentines", label: "Valentine's Day", emoji: "❤️" },
      { id: "st-patrick", label: "St. Patrick's Day", emoji: "☘️" },
      { id: "july-4", label: "July 4th", emoji: "🇺🇸" },
    ],
  },
  {
    id: "games",
    label: "Games",
    emoji: "🎮",
    children: [
      { id: "juwa", label: "Juwa", emoji: "🎰" },
      { id: "game-vault", label: "Game Vault", emoji: "🔐" },
      { id: "fire-kirin", label: "Fire Kirin", emoji: "🐟" },
      { id: "cash-machine", label: "Cash Machine", emoji: "💵" },
      { id: "cash-frenzy", label: "Cash Frenzy", emoji: "💚" },
      { id: "gameroom", label: "Gameroom", emoji: "🕹️" },
      { id: "mafia", label: "Mafia", emoji: "🕶️" },
      { id: "mr-all-in-one", label: "MR All In One", emoji: "🧩" },
      { id: "vegas-sweeps", label: "Vegas Sweeps", emoji: "✨" },
    ],
  },
  { id: "weekend", label: "Weekend", emoji: "🎉" },
  { id: "payday", label: "Payday", emoji: "💰" },
  { id: "welcome", label: "Welcome", emoji: "👋" },
  { id: "vip", label: "VIP", emoji: "👑" },
  { id: "special", label: "Special", emoji: "✨" },
];

const DAY_IDS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

export function dayFolderId(now = new Date()): string {
  return DAY_IDS[now.getDay()];
}

export function folderById(id: string): FolderDef | undefined {
  return FOLDERS.find((folder) => folder.id === id);
}

export function displayName(name: string): string {
  return name.replace(/^\[[^\]]+\]\s*/, "").trim() || name;
}

type CampaignBits = { name: string; subject: string; heading: string };

export function placeOf(campaign: CampaignBits): { folder: string; sub?: string } {
  const name = campaign.name.trim();
  const tag = name.match(/^\[([a-z0-9-]+)(?:\/([a-z0-9-]+))?\]/i);
  if (tag) return { folder: tag[1].toLowerCase(), sub: tag[2]?.toLowerCase() };

  const blob = `${name} ${campaign.subject} ${campaign.heading}`.toLowerCase();
  const events: Array<[RegExp, string, string]> = [
    [/black friday/, "festivals", "black-friday"],
    [/cyber monday/, "festivals", "cyber-monday"],
    [/halloween/, "holidays", "halloween"],
    [/thanksgiving/, "holidays", "thanksgiving"],
    [/christmas/, "holidays", "christmas"],
    [/new year/, "holidays", "new-year"],
    [/valentine/, "holidays", "valentines"],
    [/patrick/, "holidays", "st-patrick"],
    [/july 4/, "holidays", "july-4"],
    [/holiday weekend/, "festivals", "holiday-weekend"],
  ];
  for (const [pattern, folder, sub] of events) {
    if (pattern.test(blob)) return { folder, sub };
  }
  if (/^weekend\b/i.test(name)) return { folder: "weekend" };
  if (/^payday\b/i.test(name)) return { folder: "payday" };
  if (/^welcome back\b/i.test(name) || /^new player\b/i.test(name)) return { folder: "welcome" };
  if (/^vip\b/i.test(name)) return { folder: "vip" };
  if (/^second deposit\b/i.test(name) || /^tonight\b/i.test(name)) return { folder: "special" };
  if (/^holiday\b/i.test(name)) return { folder: "holidays" };
  return { folder: "special" };
}

export function matchesPlace(
  campaign: CampaignBits & { body?: string },
  place: PromoPlace
): boolean {
  const found = placeOf(campaign);
  if (found.folder !== place.folder) return false;
  if (place.sub && found.sub !== place.sub) return false;
  if (place.night) {
    const blob = `${campaign.name} ${campaign.subject} ${campaign.heading} ${campaign.body ?? ""}`;
    if (!/night/i.test(blob)) return false;
  }
  return true;
}

export type PromoSuggestion = {
  key: string;
  label: string;
  emoji: string;
  place: PromoPlace;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const cursor = new Date(year, month, 1);
  let seen = 0;
  while (cursor.getMonth() === month) {
    if (cursor.getDay() === weekday) {
      seen += 1;
      if (seen === n) return startOfDay(cursor);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return startOfDay(new Date(year, month, 1));
}

function seasonalEvents(year: number): Array<{ date: Date; key: string; label: string; emoji: string; place: PromoPlace }> {
  const thanksgiving = nthWeekday(year, 10, 4, 4);
  const blackFriday = new Date(thanksgiving);
  blackFriday.setDate(thanksgiving.getDate() + 1);
  const cyberMonday = new Date(thanksgiving);
  cyberMonday.setDate(thanksgiving.getDate() + 4);
  return [
    { date: startOfDay(new Date(year, 0, 1)), key: "new-year", label: "New Year", emoji: "🎆", place: { folder: "holidays", sub: "new-year" } },
    { date: startOfDay(new Date(year, 1, 14)), key: "valentines", label: "Valentine's Day", emoji: "❤️", place: { folder: "holidays", sub: "valentines" } },
    { date: startOfDay(new Date(year, 2, 17)), key: "st-patrick", label: "St. Patrick's Day", emoji: "☘️", place: { folder: "holidays", sub: "st-patrick" } },
    { date: startOfDay(new Date(year, 6, 4)), key: "july-4", label: "July 4th", emoji: "🇺🇸", place: { folder: "holidays", sub: "july-4" } },
    { date: startOfDay(new Date(year, 9, 31)), key: "halloween", label: "Halloween", emoji: "🎃", place: { folder: "holidays", sub: "halloween" } },
    { date: thanksgiving, key: "thanksgiving", label: "Thanksgiving", emoji: "🦃", place: { folder: "holidays", sub: "thanksgiving" } },
    { date: startOfDay(blackFriday), key: "black-friday", label: "Black Friday", emoji: "🛍️", place: { folder: "festivals", sub: "black-friday" } },
    { date: startOfDay(cyberMonday), key: "cyber-monday", label: "Cyber Monday", emoji: "💻", place: { folder: "festivals", sub: "cyber-monday" } },
    { date: startOfDay(new Date(year, 11, 25)), key: "christmas", label: "Christmas", emoji: "🎄", place: { folder: "holidays", sub: "christmas" } },
  ];
}

export function suggestions(now = new Date()): PromoSuggestion[] {
  const today = startOfDay(now);
  const dayId = dayFolderId(now);
  const day = folderById(dayId);
  const items: PromoSuggestion[] = [];
  if (day) items.push({ key: day.id, label: day.label, emoji: day.emoji, place: { folder: day.id } });

  const dow = now.getDay();
  if (dow === 0 || dow === 5 || dow === 6) {
    items.push({ key: "weekend", label: "Weekend", emoji: "🎉", place: { folder: "weekend" } });
  }
  if (dow === 0) {
    items.push({ key: "sunday-night", label: "Sunday night", emoji: "🌙", place: { folder: "sunday", night: true } });
  } else if (dow === 5) {
    items.push({ key: "friday-night", label: "Friday night", emoji: "🌙", place: { folder: "friday", night: true } });
  } else if (dow === 6) {
    items.push({ key: "saturday-night", label: "Saturday night", emoji: "🌙", place: { folder: "saturday", night: true } });
  }
  if (dow === 5) items.push({ key: "payday", label: "Payday", emoji: "💰", place: { folder: "payday" } });

  const upcoming = [...seasonalEvents(today.getFullYear()), ...seasonalEvents(today.getFullYear() + 1)];
  for (const event of upcoming) {
    const days = Math.round((event.date.getTime() - today.getTime()) / 86_400_000);
    if (days >= 0 && days <= 35 && !items.some((item) => item.key === event.key)) {
      items.push({ key: event.key, label: event.label, emoji: event.emoji, place: event.place });
    }
  }

  items.push({ key: "games", label: "Games", emoji: "🎮", place: { folder: "games" } });
  return items;
}

type VariationLine = {
  folder: string;
  sub?: string;
  subject: string;
  heading: string;
  opening: string;
  cta: string;
};

const OFFERS = [
  "First deposit doubles in the game. $5 loads as $10. Second deposit adds 50%, so $5 loads as $7.50. After that, you load what you paid. $4.99 counts as $5. Play responsibly. 18+.",
  "The extra shows up when you load. The first time, the game gets double. The second time, half more. From the third deposit on, it matches what you paid. A $4.99 checkout counts as $5. 18+.",
  "Five dollars on a first deposit becomes ten in the game. The second deposit becomes $7.50. Later deposits load straight across. $4.99 counts as $5. Play responsibly. 18+.",
  "No coupon to type. Deposit, then load it. The first load doubles. The second adds half. Then the game gets what you paid. $4.99 counts as $5. 18+.",
];

const FOLDER_IMAGE: Record<string, string> = {
  monday: "/email/cyber-monday.png",
  tuesday: "/email/midnight.png",
  wednesday: "/email/new-player.png",
  thursday: "/email/payday.png",
  friday: "/email/weekend.png",
  saturday: "/email/weekend.png",
  sunday: "/email/holiday.png",
  weekend: "/email/weekend.png",
  payday: "/email/payday.png",
  welcome: "/email/welcome-back.png",
  vip: "/email/vip.png",
  special: "/email/second-bonus.png",
  festivals: "/email/black-friday.png",
  holidays: "/email/holiday.png",
  games: "/email/midnight.png",
};

function norm(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const VARIATION_LINES: VariationLine[] = [
  { folder: "monday", subject: "💼 Monday, take the small win", heading: "A $5 start is allowed", opening: "You do not owe the week a big deposit. If it is your first one, $5 loads as $10.", cta: "Deposit now" },
  { folder: "monday", subject: "🌤️ Ease into Monday", heading: "The bonus did not take the weekend off", opening: "Open Casinova, deposit, and load it. The first one still doubles.", cta: "I'm ready" },
  { folder: "tuesday", subject: "🎲 Tuesday can be the deposit day", heading: "Nobody is waiting for Friday", opening: "The double is tied to your first deposit, not to a weekday. Tuesday works.", cta: "Load it up" },
  { folder: "tuesday", subject: "💡 Leave Tuesday with a load", heading: "In and out", opening: "Deposit, load a game, and you will see whether the double or the 50% came with it.", cta: "Open my deposit" },
  { folder: "wednesday", subject: "🐪 Wednesday, pick a number", heading: "Then let the load do the rest", opening: "Choose what you want to spend. The rate depends on which deposit this is.", cta: "Add my deposit" },
  { folder: "wednesday", subject: "🎁 Midweek, no new fine print", heading: "Same bonus. Better timing.", opening: "Halfway through the week is a fine time to use a first deposit you have been saving.", cta: "Count me in" },
  { folder: "thursday", subject: "👀 Thursday is the on-ramp", heading: "Friday plays better if the deposit is already in", opening: "Load it tonight. The bonus is added when the money moves into a game.", cta: "I'm ready" },
  { folder: "thursday", subject: "🔥 Thursday, light the fuse", heading: "The weekend can start a day early", opening: "If the first deposit is still open, this load doubles. That is the fuse.", cta: "Let's play" },
  { folder: "friday", subject: "👀 Something extra is waiting for you", heading: "Friday left the door open", opening: "You do not need a new offer. The first deposit still doubles when you load it.", cta: "I'm ready" },
  { folder: "friday", subject: "⚡ Don't let Friday pass you by", heading: "Tonight still counts", opening: "Deposit before the night runs off. The bonus is added on the load, not at midnight.", cta: "Load it up" },
  { folder: "friday", subject: "🤑 Your Friday deposit called", heading: "Meet the double", opening: "If this is deposit number one, the game gets twice what you paid.", cta: "Add my deposit" },
  { folder: "saturday", subject: "😎 Saturday, unhurried", heading: "Deposit when you feel like it", opening: "There is no noon cutoff. A Saturday first deposit still loads at double.", cta: "Deposit now" },
  { folder: "saturday", subject: "🎉 Make Saturday the second deposit", heading: "Half extra, on purpose", opening: "Already used the double? The next deposit loads with 50% more. $5 becomes $7.50.", cta: "Count me in" },
  { folder: "sunday", subject: "☀️ Sunday reset, same account", heading: "You do not need a new login", opening: "Come back to the account you have. The next unused deposit rate is still on it.", cta: "Open my deposit" },
  { folder: "sunday", subject: "🌙 One Sunday night load", heading: "Then leave it", opening: "Deposit, load the game, and let Sunday night be that simple.", cta: "I'm ready" },
  { folder: "weekend", subject: "🎉 Both days, one decision", heading: "Pick Saturday or Sunday", opening: "The weekend folder is the same real bonus. Use the first deposit whenever you are actually playing.", cta: "Let's play" },
  { folder: "weekend", subject: "😎 The weekend is not a coupon code", heading: "Nothing to type", opening: "Deposit and load. Casinova applies the first-deposit double or the second-deposit 50% from your history.", cta: "Deposit now" },
  { folder: "payday", subject: "💰 Keep most of the check", heading: "A slice is enough", opening: "Payday does not mean a huge deposit. $5 on the first one loads as $10.", cta: "Add my deposit" },
  { folder: "payday", subject: "💸 Paid, then precise", heading: "Know which deposit this is", opening: "First doubles. Second adds half. Third matches what you paid. Payday does not add a fourth rate.", cta: "Load it up" },
  { folder: "welcome", subject: "👋 The door is the deposit page", heading: "Welcome back without a speech", opening: "If you have been away, your first unused deposit still doubles in the game.", cta: "I'm ready" },
  { folder: "welcome", subject: "✨ New here, start small", heading: "The first deposit is the promotion", opening: "You do not need a starter pack. $5 loads as $10 the first time.", cta: "Deposit now" },
  { folder: "vip", subject: "👑 The tier likes the deposit. The game likes the load.", heading: "Two different extras", opening: "VIP points come from what you paid. The 100% or 50% shows up when you load that deposit into a game.", cta: "Add my deposit" },
  { folder: "vip", subject: "💎 No secret VIP percent", heading: "The double is for every first deposit", opening: "VIP does not unlock 200%. It is the same 100% first load, plus the points you already earn.", cta: "Count me in" },
  { folder: "special", subject: "🎯 Save the double for a deposit you mean", heading: "It only happens once", opening: "The 100% is the first deposit. The 50% is the second. After that, the load matches what you paid.", cta: "Open my deposit" },
  { folder: "special", subject: "👀 Read the load message", heading: "It tells you if the bonus went in", opening: "When you load, Casinova says whether this one doubled, added half, or went in even.", cta: "Load it up" },
  { folder: "festivals", sub: "black-friday", subject: "🛍️ Black Friday, one tab", heading: "Stay on the deposit page", opening: "You can skip the scrolling deals. The first Casinova deposit still doubles in the game.", cta: "Deposit now" },
  { folder: "festivals", sub: "black-friday", subject: "🔥 A Black Friday night load", heading: "After the shopping", opening: "Come back tonight and load it. The bonus is not a store coupon. It is the deposit rate.", cta: "I'm ready" },
  { folder: "festivals", sub: "cyber-monday", subject: "💻 Cyber Monday, thumbs only", heading: "Deposit from the phone", opening: "One deposit. If it is your first, the game balance is double.", cta: "Add my deposit" },
  { folder: "festivals", sub: "cyber-monday", subject: "⚡ Monday sales, Tuesday bonus? No.", heading: "The offer stays after Cyber Monday", opening: "You can deposit today or later. The first-deposit double is not a 24-hour code.", cta: "Load it up" },
  { folder: "festivals", sub: "holiday-weekend", subject: "🎉 Extra day off, same double", heading: "Use the long weekend on the first deposit", opening: "A holiday weekend gives you time. The 100% is still only the first deposit.", cta: "Let's play" },
  { folder: "holidays", sub: "halloween", subject: "🎃 Halloween, lights low", heading: "A deposit and a fish game", opening: "Pick the game after you deposit. Halloween does not change the 100% or the 50%.", cta: "I'm ready" },
  { folder: "holidays", sub: "halloween", subject: "👻 No jump-scare terms", heading: "Read this in one breath", opening: "First load doubles. Second adds half. Then it is the amount you paid.", cta: "Deposit now" },
  { folder: "holidays", sub: "thanksgiving", subject: "🦃 Pass the deposit", heading: "Thanksgiving, when the house settles", opening: "A quiet hour is enough. $5 on a first deposit loads as $10.", cta: "Add my deposit" },
  { folder: "holidays", sub: "christmas", subject: "🎄 Under the tree: a bigger first load", heading: "Christmas, without a mystery coupon", opening: "The extra is visible when you load. First deposit doubles in the game.", cta: "Count me in" },
  { folder: "holidays", sub: "new-year", subject: "🎆 New year, old account", heading: "Your deposit count did not reset", opening: "January 1 does not give everyone a fresh double. If you have not deposited yet, the first load still does.", cta: "Open my deposit" },
  { folder: "holidays", sub: "valentines", subject: "❤️ Valentine's, keep it short", heading: "A deposit is the note", opening: "No code. First deposit doubles when you load it.", cta: "I'm ready" },
  { folder: "holidays", sub: "st-patrick", subject: "☘️ Green, and honest", heading: "St. Patrick's Day will not promise a win", opening: "What we will do is double the first deposit in the game.", cta: "Deposit now" },
  { folder: "holidays", sub: "july-4", subject: "🇺🇸 July 4th, then back outside", heading: "A fast deposit", opening: "Five dollars in, ten on the first load. Then go watch the fireworks.", cta: "Add my deposit" },
  { folder: "games", sub: "juwa", subject: "🎰 Juwa after the deposit, not before", heading: "Get the balance in first", opening: "Juwa is slots and fish on your phone. The load from Casinova is what fills it, bonus included on the first and second deposit.", cta: "Load it up" },
  { folder: "games", sub: "game-vault", subject: "🔐 Game Vault can wait one minute", heading: "Deposit, then open the cabinet", opening: "Slots, keno, and fish are in Game Vault. None of them change the deposit rate.", cta: "I'm ready" },
  { folder: "games", sub: "fire-kirin", subject: "🐟 Fire Kirin is the fish table", heading: "A different kind of night", opening: "Leave the slots if you want. Deposit here, then load Fire Kirin when you want the fish game.", cta: "Let's play" },
  { folder: "games", sub: "cash-machine", subject: "💵 Cash Machine likes a loaded balance", heading: "Slots, once the deposit lands", opening: "Cash Machine is the slots app. Your first deposit still doubles when that money is loaded in.", cta: "Add my deposit" },
  { folder: "games", sub: "cash-frenzy", subject: "💚 Cash Frenzy, bright on purpose", heading: "A slots room with the lights up", opening: "Deposit on Casinova first. Cash Frenzy gets the load, with the bonus if this deposit earns one.", cta: "Deposit now" },
  { folder: "games", sub: "gameroom", subject: "🕹️ Gameroom is the mixed arcade", heading: "Slots, fish, or keno after you load", opening: "Gameroom keeps those in one login. The promo is still the deposit, then the load.", cta: "Load it up" },
  { folder: "games", sub: "mafia", subject: "🕶️ Mafia wears a different suit", heading: "Mob-themed slots, same deposit rules", opening: "Pick Mafia for the theme. The 100% and the 50% still follow your deposit number.", cta: "Count me in" },
  { folder: "games", sub: "mr-all-in-one", subject: "🧩 MR All In One keeps the menu open", heading: "One login, a few styles", opening: "Slots, fish, and keno sit in MR All In One. Fund it with a Casinova deposit.", cta: "I'm ready" },
  { folder: "games", sub: "vegas-sweeps", subject: "✨ Vegas Sweeps is its own lobby", heading: "Sweepstakes style, after the deposit", opening: "Slots, keno, and fish are in Vegas Sweeps. Load the deposit there when you want that lobby.", cta: "Let's play" },
];

export type VariationDraft = {
  name: string;
  subject: string;
  heading: string;
  body: string;
  cta_label: string;
  cta_href: string;
  segment: "all";
};

function imageFromBody(body: string): string | null {
  const match = body.match(/^\{\{image:([^}]+)\}\}/);
  return match?.[1]?.trim() || null;
}

export function createVariation(
  source: CampaignBits & { body: string },
  existing: CampaignBits[]
): VariationDraft | null {
  const place = placeOf(source);
  const taken = new Set<string>();
  for (const row of existing) {
    taken.add(norm(row.subject));
    taken.add(norm(row.heading));
  }
  taken.add(norm(source.subject));
  taken.add(norm(source.heading));

  const pool = VARIATION_LINES.filter((line) => {
    if (line.folder !== place.folder) return false;
    if (place.sub) return line.sub === place.sub;
    return !line.sub;
  });
  const fresh = pool.find((line) => !taken.has(norm(line.subject)) && !taken.has(norm(line.heading)));
  if (!fresh) return null;

  const image = imageFromBody(source.body) || FOLDER_IMAGE[place.folder] || "/email/weekend.png";
  const offer = OFFERS[taken.size % OFFERS.length];
  const tag = place.sub ? `[${place.folder}/${place.sub}]` : `[${place.folder}]`;
  return {
    name: `${tag} ${fresh.heading}`.slice(0, 160),
    subject: fresh.subject,
    heading: fresh.heading,
    body: `{{image:${image}}}\n${fresh.opening}\n\n${offer}`,
    cta_label: fresh.cta,
    cta_href: "/dashboard/deposit",
    segment: "all",
  };
}
