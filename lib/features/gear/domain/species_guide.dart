// 鱼种图鉴数据模型 + 内置远投目标鱼种内容
//
// 包含 15 种远投钓鱼最常见目标鱼的完整信息，
// 含识别特征、习性、装备建议、法规参考。

/// 鱼种信息
class SpeciesInfo {
  const SpeciesInfo({
    required this.id,
    required this.commonName,
    required this.scientificName,
    required this.category,
    required this.description,
    required this.identification,
    required this.habitat,
    required this.behavior,
    required this.gearRecommendation,
    required this.bestBait,
    required this.bestRig,
    required this.seasonalPattern,
    required this.sizeRange,
    this.regulations,
  });

  final String id;
  final String commonName;
  final String scientificName;
  final SpeciesCategory category;
  final String description;
  final List<String> identification; // 识别特征
  final String habitat;
  final String behavior; // 觅食习性
  final GearRecommendation gearRecommendation;
  final List<String> bestBait;
  final String bestRig;
  final String seasonalPattern;
  final SizeRange sizeRange;
  final String? regulations; // 法规参考（通用提示）
}

/// 鱼种类别
enum SpeciesCategory {
  gamefish('Gamefish', '大型运动鱼'),
  panfish('Panfish', '中小型食用鱼'),
  shark('Shark', '鲨鱼');

  const SpeciesCategory(this.label, this.description);
  final String label;
  final String description;
}

/// 装备建议
class GearRecommendation {
  const GearRecommendation({
    required this.rodPower,
    required this.rodLength,
    required this.reelSize,
    required this.mainLine,
    required this.leader,
  });

  final String rodPower;
  final String rodLength;
  final String reelSize;
  final String mainLine;
  final String leader;
}

/// 体型范围
class SizeRange {
  const SizeRange({
    required this.commonLb,
    required this.trophyLb,
    required this.commonLengthIn,
  });

  final String commonLb;
  final String trophyLb;
  final String commonLengthIn;
}

/// 内置鱼种图鉴库
class SpeciesGuideLibrary {
  const SpeciesGuideLibrary();

  List<SpeciesInfo> getAll() => _species;
  List<SpeciesInfo> getByCategory(SpeciesCategory cat) => _species.where((s) => s.category == cat).toList();
  SpeciesInfo? getById(String id) => _species.where((s) => s.id == id).firstOrNull;

  static const _species = [
    SpeciesInfo(
      id: 'striped_bass',
      commonName: 'Striped Bass',
      scientificName: 'Morone saxatilis',
      category: SpeciesCategory.gamefish,
      description: 'The king of surf casting. Powerful fighters that patrol the surf zone feeding on baitfish and crustaceans.',
      identification: [
        'Silver-green body with 7-8 dark horizontal stripes',
        'Two dorsal fins (separated)',
        'Lower jaw slightly protruding',
        'Forked tail',
      ],
      habitat: 'Sandy beaches, rocky points, inlets, jetties. Prefers water 55-68°F (13-20°C).',
      behavior: 'Ambush feeder in wash zone. Most active dawn/dusk and during tide transitions. Follows baitfish schools along the beach.',
      gearRecommendation: GearRecommendation(
        rodPower: 'Medium-Heavy to Heavy',
        rodLength: '10-11 ft',
        reelSize: '5000-6000',
        mainLine: '20-30 lb braid',
        leader: '40-50 lb fluoro, 3-4 ft',
      ),
      bestBait: ['Bunker (menhaden) chunks', 'Clam', 'Sandworms/Bloodworms', 'Live eels', 'Cut mullet'],
      bestRig: 'Fish Finder Rig',
      seasonalPattern: 'Spring migration north (Apr-Jun), Fall migration south (Sep-Nov). Best surf fishing Sep-Nov.',
      sizeRange: SizeRange(commonLb: '5-15 lb', trophyLb: '30-50+ lb', commonLengthIn: '24-36 in'),
      regulations: 'Size/bag limits vary by state. Many areas: 28" minimum, 1 per day (check local regs).',
    ),
    SpeciesInfo(
      id: 'red_drum',
      commonName: 'Red Drum (Redfish)',
      scientificName: 'Sciaenops ocellatus',
      category: SpeciesCategory.gamefish,
      description: 'A powerful bottom feeder prized for its fighting ability. Iconic species of the Gulf and South Atlantic surf.',
      identification: [
        'Copper/bronze body color',
        'One or more black spots near tail base (distinctive)',
        'Downturned (inferior) mouth for bottom feeding',
        'Large scales',
      ],
      habitat: 'Sandy bottoms, oyster bars, grass flats near surf. Tolerates wide salinity range.',
      behavior: 'Roots along bottom for crabs and shrimp. "Tails" in shallow water. Active during falling tides when bait washes off flats.',
      gearRecommendation: GearRecommendation(
        rodPower: 'Medium-Heavy',
        rodLength: '10-12 ft',
        reelSize: '5000-6000',
        mainLine: '20-30 lb braid',
        leader: '30-40 lb fluoro, 2-3 ft',
      ),
      bestBait: ['Fresh cut mullet', 'Blue crab (half or quarter)', 'Shrimp (live or dead)', 'Cut menhaden'],
      bestRig: 'Fish Finder Rig or Carolina Rig',
      seasonalPattern: 'Year-round in Gulf. Best Oct-Dec (bull drum run). Juveniles in spring/summer.',
      sizeRange: SizeRange(commonLb: '5-15 lb', trophyLb: '30-50+ lb (bull drum)', commonLengthIn: '20-40 in'),
      regulations: 'Slot limits common (18-27" in many states). Bull drum often catch-and-release only.',
    ),
    SpeciesInfo(
      id: 'bluefish',
      commonName: 'Bluefish',
      scientificName: 'Pomatomus saltatrix',
      category: SpeciesCategory.gamefish,
      description: 'Aggressive schooling predators nicknamed "choppers" for their razor-sharp teeth. Explosive surface strikes.',
      identification: [
        'Blue-green back fading to silver belly',
        'Prominent sharp teeth (visible when mouth open)',
        'Forked tail',
        'Single dark blotch at pectoral fin base',
      ],
      habitat: 'Open surf, near inlets, anywhere baitfish concentrate. Travel in schools of similar size.',
      behavior: 'Aggressive blitz feeders. Will chase bait to the surface creating visible "blitzes." Feed most actively at dawn/dusk.',
      gearRecommendation: GearRecommendation(
        rodPower: 'Medium to Medium-Heavy',
        rodLength: '9-11 ft',
        reelSize: '4000-5000',
        mainLine: '15-20 lb braid',
        leader: '30-40 lb wire or heavy fluoro (teeth!)',
      ),
      bestBait: ['Cut bunker', 'Mullet strips', 'Metal lures/spoons', 'Fresh cut bait (anything bloody)'],
      bestRig: 'Fish Finder Rig with wire leader',
      seasonalPattern: 'Spring-Fall along East Coast. Peak blitzes Aug-Oct. Follow warm water currents.',
      sizeRange: SizeRange(commonLb: '3-8 lb', trophyLb: '15-20+ lb', commonLengthIn: '18-28 in'),
      regulations: 'Liberal limits in most areas. Check for recent size/bag limit changes.',
    ),
    SpeciesInfo(
      id: 'flounder',
      commonName: 'Flounder (Summer/Winter)',
      scientificName: 'Paralichthys dentatus / Pseudopleuronectes americanus',
      category: SpeciesCategory.panfish,
      description: 'Flat ambush predators that lie camouflaged on the bottom. Prized table fare with delicate white flesh.',
      identification: [
        'Flat, oval body — both eyes on one side',
        'Summer flounder: eyes on left side, brown/olive with spots',
        'Winter flounder: eyes on right side, darker',
        'Lies flat on bottom, nearly invisible',
      ],
      habitat: 'Sandy/muddy bottoms near structure. Inlets, channel edges, drop-offs. Water 55-72°F.',
      behavior: 'Ambush predator — lies still and strikes when prey passes overhead. Slow retrieves trigger strikes.',
      gearRecommendation: GearRecommendation(
        rodPower: 'Medium-Light to Medium',
        rodLength: '9-10 ft',
        reelSize: '3000-4000',
        mainLine: '15-20 lb braid',
        leader: '20-30 lb fluoro, 2-3 ft',
      ),
      bestBait: ['Live minnows/killifish', 'Squid strips', 'Gulp! artificial baits', 'Cut bait + squid combo'],
      bestRig: 'Carolina Rig or Fireball Rig (lifts bait off bottom)',
      seasonalPattern: 'Summer flounder: May-Oct (moves inshore). Winter flounder: Nov-Apr. Best at inlet mouths during tidal flow.',
      sizeRange: SizeRange(commonLb: '2-5 lb', trophyLb: '8-12+ lb (doormat)', commonLengthIn: '16-24 in'),
      regulations: 'Strict size limits (often 19-21" minimum). Season dates vary by state.',
    ),
    SpeciesInfo(
      id: 'pompano',
      commonName: 'Pompano',
      scientificName: 'Trachinotus carolinus',
      category: SpeciesCategory.panfish,
      description: 'The most sought-after surf panfish. Fast, silvery, and one of the best-tasting fish in the sea.',
      identification: [
        'Deep, compressed silver body',
        'Blunt snout, small mouth',
        'Yellow/gold on belly and fins',
        'Deeply forked tail',
      ],
      habitat: 'Sandy beaches in the wash zone. Feeds in very shallow water (ankle-deep to waist-deep).',
      behavior: 'Roams in schools following sand fleas and crustaceans. Feeds heavily on incoming tide as food washes in.',
      gearRecommendation: GearRecommendation(
        rodPower: 'Light to Medium',
        rodLength: '9-10 ft',
        reelSize: '3000-4000',
        mainLine: '10-15 lb braid or mono',
        leader: '15-20 lb fluoro, 18-24 in',
      ),
      bestBait: ['Sand fleas (mole crabs) — #1 bait', 'Shrimp (peeled)', 'Fishbites (sand flea flavor)', 'Clam strips'],
      bestRig: 'Hi-Lo Rig (double drop) or Pompano Rig',
      seasonalPattern: 'Year-round in S. Florida. Spring run north (Mar-May), Fall run south (Sep-Nov). Water >65°F.',
      sizeRange: SizeRange(commonLb: '1-3 lb', trophyLb: '5-8 lb', commonLengthIn: '12-18 in'),
      regulations: 'Minimum size 11-12" (varies by state). Bag limit typically 6/day.',
    ),
    SpeciesInfo(
      id: 'black_drum',
      commonName: 'Black Drum',
      scientificName: 'Pogonias cromis',
      category: SpeciesCategory.gamefish,
      description: 'Massive bottom feeders with crushing pharyngeal teeth. Largest of the drum family — exceeding 100 lb.',
      identification: [
        'Dark gray/black body (adults)',
        'Younger fish have 4-5 vertical dark bars',
        'Barbels (whiskers) under chin',
        'High arched back, downturned mouth',
      ],
      habitat: 'Sandy/muddy bottoms, near oyster beds, jetties, bridges. Inshore waters and surf.',
      behavior: 'Uses barbels to locate food on bottom. Crushes oysters, crabs, and clams. Very strong fighters.',
      gearRecommendation: GearRecommendation(
        rodPower: 'Heavy',
        rodLength: '10-12 ft',
        reelSize: '6000-8000',
        mainLine: '30-50 lb braid',
        leader: '50-80 lb mono, 2-3 ft',
      ),
      bestBait: ['Blue crab (halved)', 'Clam', 'Shrimp', 'Cut mullet', 'Oysters'],
      bestRig: 'Fish Finder Rig (heavy)',
      seasonalPattern: 'Spring spawning run (Mar-May) is peak. Year-round in Gulf. Large adults in winter.',
      sizeRange: SizeRange(commonLb: '10-30 lb', trophyLb: '50-100+ lb', commonLengthIn: '24-48 in'),
      regulations: 'Slot limits in many areas. Over-slot fish often must be released. Check local regs.',
    ),
    SpeciesInfo(
      id: 'spotted_seatrout',
      commonName: 'Spotted Seatrout',
      scientificName: 'Cynoscion nebulosus',
      category: SpeciesCategory.panfish,
      description: 'A staple of coastal surf fishing. Beautiful spotted fish with excellent meat. Aggressive strikers.',
      identification: [
        'Silver-gray with many small black spots on back and dorsal fin',
        'Elongated body, large mouth with prominent canine teeth',
        'Spots extend onto tail fin',
        'No chin barbels (unlike drum)',
      ],
      habitat: 'Grass flats, sandy bottoms near structure, inlet mouths. Prefers 60-75°F water.',
      behavior: 'Ambush predator over grass. Feeds on shrimp and small fish. Active on moving tides, especially outgoing.',
      gearRecommendation: GearRecommendation(
        rodPower: 'Medium-Light to Medium',
        rodLength: '9-10 ft',
        reelSize: '3000-4000',
        mainLine: '10-15 lb braid',
        leader: '20-25 lb fluoro, 2-3 ft',
      ),
      bestBait: ['Live shrimp', 'Soft plastic jigs (white/chartreuse)', 'Cut mullet', 'Live finger mullet'],
      bestRig: 'Carolina Rig or Free-lined shrimp',
      seasonalPattern: 'Spring and fall peaks. Move to deeper channels in winter. Best on outgoing tide.',
      sizeRange: SizeRange(commonLb: '1-4 lb', trophyLb: '7-10+ lb ("gator trout")', commonLengthIn: '14-24 in'),
      regulations: 'Size limit typically 15-17" minimum. Bag limits 5-10/day depending on state.',
    ),
    SpeciesInfo(
      id: 'sharks_general',
      commonName: 'Sharks (Surf Species)',
      scientificName: 'Various (Carcharhinus spp.)',
      category: SpeciesCategory.shark,
      description: 'Blacktip, spinner, bull, and sandbar sharks regularly patrol the surf zone. Ultimate adrenaline from the beach.',
      identification: [
        'Streamlined torpedo body',
        'Blacktip: black-tipped fins, gray body, 4-6 ft',
        'Spinner: similar but leaps/spins when hooked',
        'Bull: stocky, blunt snout, very aggressive',
      ],
      habitat: 'Surf zone, sandbars, inlet mouths. Follow baitfish schools. Bull sharks enter brackish water.',
      behavior: 'Patrol parallel to shore along sandbars. Feed aggressively at dawn/dusk. Attracted by bloody bait and vibrations.',
      gearRecommendation: GearRecommendation(
        rodPower: 'Heavy to Extra-Heavy',
        rodLength: '10-14 ft',
        reelSize: '8000-14000',
        mainLine: '50-80 lb braid',
        leader: '150-300 lb wire or cable, 4-6 ft',
      ),
      bestBait: ['Whole bonito/jack', 'Large mullet (whole or half)', 'Stingray wing', 'Bloody fish heads'],
      bestRig: 'Fish Finder Rig (heavy wire leader)',
      seasonalPattern: 'Summer months (Jun-Sep) when water is warmest. Best at dawn/dusk. Follow baitfish migrations.',
      sizeRange: SizeRange(commonLb: '30-80 lb (blacktip)', trophyLb: '200+ lb (bull shark)', commonLengthIn: '4-8 ft'),
      regulations: 'Many species protected. Some require special permits. Catch-and-release strongly encouraged.',
    ),
    SpeciesInfo(
      id: 'whiting',
      commonName: 'Whiting (Kingfish)',
      scientificName: 'Menticirrhus spp.',
      category: SpeciesCategory.panfish,
      description: 'Reliable, abundant surf fish perfect for beginners. Present year-round in warm waters. Good eating.',
      identification: [
        'Elongated silver body',
        'Single chin barbel',
        'Dark blotches along sides (sometimes)',
        'Inferior (downturned) mouth',
      ],
      habitat: 'Sandy surf zone in very shallow water. Often in the first trough (between sandbars).',
      behavior: 'Bottom feeder using chin barbel to locate food in sand. Schools heavily. Active all tide stages.',
      gearRecommendation: GearRecommendation(
        rodPower: 'Light to Medium-Light',
        rodLength: '8-10 ft',
        reelSize: '2500-3000',
        mainLine: '8-12 lb braid or mono',
        leader: '12-15 lb fluoro, 18 in',
      ),
      bestBait: ['Bloodworms', 'Shrimp (peeled)', 'Sand fleas', 'Fishbites', 'Clam strips'],
      bestRig: 'Hi-Lo Rig (small hooks #4 - #1)',
      seasonalPattern: 'Year-round in southern waters. Spring through fall elsewhere. Active in warm water (>60°F).',
      sizeRange: SizeRange(commonLb: '0.5-2 lb', trophyLb: '3-4 lb', commonLengthIn: '10-16 in'),
      regulations: 'Generally liberal limits. Some states: 12" minimum.',
    ),
    SpeciesInfo(
      id: 'cobia',
      commonName: 'Cobia',
      scientificName: 'Rachycentron canadum',
      category: SpeciesCategory.gamefish,
      description: 'A trophy surf catch. Large, powerful fish that follow rays and turtles. Incredible fighters.',
      identification: [
        'Dark brown/black body with lighter belly',
        'Flat, wide head (resembles a small shark from above)',
        'Single continuous dorsal fin with short spines',
        'Two white/silver horizontal stripes on sides',
      ],
      habitat: 'Near structure — buoys, piers, jetties. Follow rays and sea turtles. Warm waters >68°F.',
      behavior: 'Curious and bold — will approach structure. Feeds on crabs, fish, squid. Often seen following rays in surf zone.',
      gearRecommendation: GearRecommendation(
        rodPower: 'Heavy',
        rodLength: '10-12 ft',
        reelSize: '6000-8000',
        mainLine: '30-50 lb braid',
        leader: '60-80 lb fluoro, 3-4 ft',
      ),
      bestBait: ['Live eel', 'Live blue crab', 'Large live baitfish', 'Cut stingray'],
      bestRig: 'Fish Finder Rig (heavy)',
      seasonalPattern: 'Spring migration north along East Coast (Mar-May). Fall return south. Peak in Gulf: Apr-Jun.',
      sizeRange: SizeRange(commonLb: '15-40 lb', trophyLb: '60-100+ lb', commonLengthIn: '36-60 in'),
      regulations: 'Minimum size typically 33-36". Often 1-2 per person. Federally managed species.',
    ),
    SpeciesInfo(
      id: 'spanish_mackerel',
      commonName: 'Spanish Mackerel',
      scientificName: 'Scomberomorus maculatus',
      category: SpeciesCategory.panfish,
      description: 'Blazing fast schooling fish that chase baitfish through the surf. Shiny lures cast long distance = instant hookup.',
      identification: [
        'Streamlined, elongated silver body',
        'Bronze/gold spots on sides (no stripes)',
        'No scales on pectoral fin area',
        'Deeply forked tail, built for speed',
      ],
      habitat: 'Open surf, near bait schools. Warm clear water. Often within casting range from beach when chasing bait.',
      behavior: 'High-speed pursuit predator. Visible surface splashes when feeding. Follows schools of glass minnows and anchovies.',
      gearRecommendation: GearRecommendation(
        rodPower: 'Medium-Light to Medium',
        rodLength: '9-10 ft',
        reelSize: '3000-4000',
        mainLine: '10-15 lb braid',
        leader: '20-30 lb wire (teeth) or heavy fluoro, 12 in',
      ),
      bestBait: ['Silver spoons (1-2 oz)', 'Gotcha plugs', 'Live shrimp/finger mullet', 'Shiny metal jigs'],
      bestRig: 'Wire leader + snap (for lures) or Fish Finder with short wire',
      seasonalPattern: 'Warm months (May-Oct). Arrive when water hits 68°F. Best near bait schools visible from shore.',
      sizeRange: SizeRange(commonLb: '2-5 lb', trophyLb: '8-12 lb', commonLengthIn: '16-24 in'),
      regulations: 'Minimum 12" in most areas. Bag limit 15/day typically. Check local regs.',
    ),
    SpeciesInfo(
      id: 'snook',
      commonName: 'Snook',
      scientificName: 'Centropomus undecimalis',
      category: SpeciesCategory.gamefish,
      description: 'A prized inshore gamefish that feeds aggressively in the surf zone. Explosive strikes near structure.',
      identification: [
        'Gold-green body with distinct black lateral line',
        'Concave head profile (sloped forehead)',
        'Large protruding lower jaw',
        'Divided dorsal fin',
      ],
      habitat: 'Inlets, jetties, mangrove edges, sandy beaches (especially at night). Warm water only (>60°F).',
      behavior: 'Ambush feeder near structure. Extremely line-shy. Best during outgoing tide when bait flushes from inlets.',
      gearRecommendation: GearRecommendation(
        rodPower: 'Medium to Medium-Heavy',
        rodLength: '9-10 ft',
        reelSize: '4000-5000',
        mainLine: '20-30 lb braid',
        leader: '30-40 lb fluoro (clear!), 3-4 ft',
      ),
      bestBait: ['Live pilchards/whitebait', 'Live shrimp', 'Mullet (live or cut)', 'Soft plastic swimbaits'],
      bestRig: 'Free-lined live bait or Fish Finder (light sinker)',
      seasonalPattern: 'Year-round in S. Florida. Summer beach spawning aggregations (Jun-Sep). Night fishing productive.',
      sizeRange: SizeRange(commonLb: '5-15 lb', trophyLb: '30-40+ lb', commonLengthIn: '24-40 in'),
      regulations: 'Closed season during spawn (Jun-Aug in many areas). Slot limit typically 28-33". 1 per day.',
    ),
    SpeciesInfo(
      id: 'tarpon',
      commonName: 'Tarpon',
      scientificName: 'Megalops atlanticus',
      category: SpeciesCategory.gamefish,
      description: 'The Silver King. Spectacular aerial fighters that can exceed 200 lb. The ultimate surf casting trophy.',
      identification: [
        'Large silver scales (dollar-coin sized)',
        'Upturned mouth with bony lower jaw plate',
        'Single dorsal fin with long trailing filament',
        'Deep compressed body, massive forked tail',
      ],
      habitat: 'Beaches, inlets, passes. Migrates along coast in warm months. Tolerates low oxygen (gulps air).',
      behavior: 'Schools migrate along beaches in summer. Feed on mullet, crabs, and baitfish. Spectacular jumps when hooked.',
      gearRecommendation: GearRecommendation(
        rodPower: 'Heavy to Extra-Heavy',
        rodLength: '10-12 ft',
        reelSize: '8000-10000',
        mainLine: '50-80 lb braid',
        leader: '80-100 lb fluoro, 4-6 ft',
      ),
      bestBait: ['Live mullet', 'Live crab', 'Cut mullet', 'Large swimbaits'],
      bestRig: 'Fish Finder Rig (heavy) or free-lined live bait',
      seasonalPattern: 'May-August migration along Florida/Gulf beaches. Dawn and dusk best. Follow visible schools.',
      sizeRange: SizeRange(commonLb: '40-80 lb', trophyLb: '150-200+ lb', commonLengthIn: '4-7 ft'),
      regulations: 'Catch-and-release only in most areas. Requires special tag to harvest in Florida (\$50).',
    ),
    SpeciesInfo(
      id: 'croaker',
      commonName: 'Atlantic Croaker',
      scientificName: 'Micropogonias undulatus',
      category: SpeciesCategory.panfish,
      description: 'Named for the croaking sound they make. Abundant, easy to catch, and good eating. Perfect beginner fish.',
      identification: [
        'Silver-brass body with faint wavy dark lines',
        '3-5 small barbels on chin',
        'Makes audible croaking sound when caught',
        'Slightly inferior (downturned) mouth',
      ],
      habitat: 'Sandy/muddy bottoms in surf zone and bays. Schools heavily over structure.',
      behavior: 'Active bottom feeder. Readily takes most baits. Schools heavily — catch one, expect more. Very sensitive bite.',
      gearRecommendation: GearRecommendation(
        rodPower: 'Light to Medium-Light',
        rodLength: '8-10 ft',
        reelSize: '2500-3000',
        mainLine: '8-12 lb braid or mono',
        leader: '10-15 lb fluoro, 18 in',
      ),
      bestBait: ['Bloodworms', 'Squid strips', 'Shrimp (peeled)', 'Fishbites', 'Cut bait (anything)'],
      bestRig: 'Hi-Lo Rig (small hooks #6 - #1)',
      seasonalPattern: 'Spring through fall along East Coast. Year-round in Gulf. Peak: Aug-Nov.',
      sizeRange: SizeRange(commonLb: '0.5-2 lb', trophyLb: '3-4 lb', commonLengthIn: '10-16 in'),
      regulations: 'Liberal limits. No minimum size in many areas. Good beginner and kids fish.',
    ),
    SpeciesInfo(
      id: 'mullet',
      commonName: 'Mullet (Striped)',
      scientificName: 'Mugil cephalus',
      category: SpeciesCategory.panfish,
      description: 'Primarily caught as bait, but edible and fun to target. Schools massively in surf. Important forage fish.',
      identification: [
        'Torpedo-shaped silver body',
        'Blue-gray back, silver sides',
        'Small triangular mouth (herbivore/detritivore)',
        'Two widely separated dorsal fins',
      ],
      habitat: 'All coastal waters — surf, bays, estuaries, freshwater. Extremely adaptable.',
      behavior: 'Feeds on algae and organic material in mud/sand. Jumps frequently. Schools in huge numbers during fall run.',
      gearRecommendation: GearRecommendation(
        rodPower: 'Light',
        rodLength: '8-9 ft',
        reelSize: '2500-3000',
        mainLine: '6-10 lb mono',
        leader: '10 lb fluoro, short',
      ),
      bestBait: ['Bread dough balls', 'Oatmeal balls', 'Small hooks with tiny bait', 'Cast net (for catching as bait)'],
      bestRig: 'Small float rig or Hi-Lo with tiny hooks (#8-#12)',
      seasonalPattern: 'Year-round. Massive fall run (Oct-Nov) when schools head offshore to spawn. Best bait source anytime.',
      sizeRange: SizeRange(commonLb: '1-3 lb', trophyLb: '5-8 lb', commonLengthIn: '12-20 in'),
      regulations: 'Generally liberal. Cast net regulations vary (mesh size, diameter). Check local regs for harvest method.',
    ),
    SpeciesInfo(
      id: 'sheepshead',
      commonName: 'Sheepshead',
      scientificName: 'Archosargus probatocephalus',
      category: SpeciesCategory.panfish,
      description: 'The "convict fish" with its distinctive black bars. Has human-like teeth for crushing shells. Excellent eating.',
      identification: [
        '5-7 bold black vertical bars on silver body',
        'Human-like front teeth (incisors) for crushing shells',
        'Deep, compressed body',
        'Spiny dorsal fin (sharp!)',
      ],
      habitat: 'Near structure — pilings, jetties, rock walls, oyster beds. Inshore waters.',
      behavior: 'Uses powerful teeth to crush barnacles, oysters, crabs off structure. Very light, "thief-like" bite — hard to detect.',
      gearRecommendation: GearRecommendation(
        rodPower: 'Medium',
        rodLength: '9-10 ft',
        reelSize: '3000-4000',
        mainLine: '15-20 lb braid',
        leader: '20-30 lb fluoro, 18-24 in',
      ),
      bestBait: ['Fiddler crabs', 'Sand fleas', 'Shrimp (on small hook)', 'Barnacles scraped from pilings', 'Oyster pieces'],
      bestRig: 'Carolina Rig near structure or direct bottom with small hook',
      seasonalPattern: 'Year-round near structure. Peak: Feb-Apr (spawning aggregations near jetties). Best incoming tide.',
      sizeRange: SizeRange(commonLb: '2-5 lb', trophyLb: '8-12 lb', commonLengthIn: '14-22 in'),
      regulations: 'Minimum size typically 12-14". Bag limit 10-15/day in most areas.',
    ),
  ];
}
