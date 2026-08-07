import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:flutter/services.dart';

import 'reference_db.dart';

/// 参考数据库种子服务
///
/// 负责在 App 首次启动（或数据库为空时）将 JSON 数据写入 reference.db。
/// 涵盖：渔轮、渔竿、潮汐站、海滩、鱼种。
class ReferenceSeeder {
  final ReferenceDatabase _db;

  ReferenceSeeder(this._db);

  /// 检查并填充数据（幂等，已有数据时跳过）
  Future<void> seedIfEmpty() async {
    final reelCount = await _db.reels.count().getSingle();
    final rodCount = await _db.rods.count().getSingle();
    final beachCount = await _db.beaches.count().getSingle();

    if (reelCount == 0) await _seedReels();
    if (rodCount == 0) await _seedRods();
    if (beachCount == 0) {
      await _seedTideStations();
      await _seedBeaches();
    }

    final speciesCount = await _db.species.count().getSingle();
    if (speciesCount == 0) await _seedSpecies();
  }

  // ============================================================
  // 渔轮种子数据
  // ============================================================
  Future<void> _seedReels() async {
    final jsonStr = await rootBundle.loadString('assets/data/surf_reels_reference.json');
    final jsonData = jsonDecode(jsonStr) as Map<String, dynamic>;
    final reelList = jsonData['reels'] as List<dynamic>;

    final companions = reelList.map((r) {
      final m = r as Map<String, dynamic>;
      return ReelsCompanion.insert(
        brand: m['brand'] as String,
        model: m['model'] as String,
        size: (m['size'] as num).toInt(),
        gearRatio: (m['gear_ratio'] as num).toDouble(),
        maxDragLb: (m['max_drag_lb'] as num).toDouble(),
        lineCapacityYds: (m['line_capacity_yds'] as num? ?? 200).toInt(),
        weightOz: (m['weight_oz'] as num).toDouble(),
        sealType: m['seal_type'] as String? ?? 'shielded',
        priceTier: (m['price_tier'] as num? ?? 2).toInt(),
      );
    }).toList();

    await _db.batch((batch) {
      batch.insertAllOnConflictUpdate(_db.reels, companions);
    });
  }

  // ============================================================
  // 渔竿种子数据
  // ============================================================
  Future<void> _seedRods() async {
    final jsonStr = await rootBundle.loadString('assets/data/surf_rods_reference.json');
    final jsonData = jsonDecode(jsonStr) as Map<String, dynamic>;
    final rodList = jsonData['rods'] as List<dynamic>;

    final companions = rodList.map((r) {
      final m = r as Map<String, dynamic>;
      // JDM 竿有 length_m，西方竿有 length_ft
      double lengthFt;
      if (m['length_ft'] != null) {
        lengthFt = (m['length_ft'] as num).toDouble();
      } else if (m['length_m'] != null) {
        lengthFt = (m['length_m'] as num).toDouble() * 3.28084;
      } else {
        lengthFt = 10.0;
      }

      // cast_weight：西方竿用 oz，JDM 竿用 sinker_load（号数），做简单换算
      double castMinOz = 1.0;
      double castMaxOz = 4.0;
      if (m['cast_weight_min_oz'] != null) {
        castMinOz = (m['cast_weight_min_oz'] as num).toDouble();
      }
      if (m['cast_weight_max_oz'] != null) {
        castMaxOz = (m['cast_weight_max_oz'] as num).toDouble();
      } else if (m['sinker_load'] != null) {
        // JDM 号数 → oz 换算（#25 ≈ 3.3oz，#30 ≈ 4oz）
        final load = m['sinker_load'] as String;
        final parts = load.replaceAll('#', '').split('-');
        if (parts.length == 2) {
          final minNum = double.tryParse(parts[0].trim()) ?? 25;
          final maxNum = double.tryParse(parts[1].trim()) ?? 35;
          castMinOz = minNum * 0.1323; // 号数 × 3.75g ÷ 28.35g/oz
          castMaxOz = maxNum * 0.1323;
        }
      }

      return RodsCompanion.insert(
        brand: m['brand'] as String,
        model: m['model'] as String,
        lengthFt: lengthFt,
        power: m['power'] as String? ?? 'medium-heavy',
        action: m['action'] as String? ?? 'fast',
        material: (m['material'] as String?)?.replaceAll(RegExp(r'_\d+.*'), '') ?? 'graphite',
        castWeightMinOz: castMinOz,
        castWeightMaxOz: castMaxOz,
        lineRating: m['line_rating'] as String? ?? '12-25 lb',
        priceTier: (m['price_tier'] as num? ?? 2).toInt(),
        corrosionRating: (m['corrosion_rating'] as num? ?? 4).toInt(),
      );
    }).toList();

    await _db.batch((batch) {
      batch.insertAllOnConflictUpdate(_db.rods, companions);
    });
  }

  // ============================================================
  // 潮汐站种子数据（中国主要沿海城市）
  // ============================================================
  Future<void> _seedTideStations() async {
    const stations = [
      _TideStationSeed(
        name: '厦门站',
        lat: 24.45,
        lon: 118.07,
        harmonicJson: '{"constituents":[{"name":"M2","amp":2.15,"phase_gmt":215.0,"speed":28.9841042},{"name":"S2","amp":0.78,"phase_gmt":248.0,"speed":30.0},{"name":"N2","amp":0.42,"phase_gmt":198.0,"speed":28.4397295},{"name":"K1","amp":0.62,"phase_gmt":185.0,"speed":15.0410686},{"name":"O1","amp":0.45,"phase_gmt":168.0,"speed":13.9430356}]}',
      ),
      _TideStationSeed(
        name: '青岛站',
        lat: 36.07,
        lon: 120.38,
        harmonicJson: '{"constituents":[{"name":"M2","amp":1.85,"phase_gmt":195.0,"speed":28.9841042},{"name":"S2","amp":0.65,"phase_gmt":228.0,"speed":30.0},{"name":"N2","amp":0.38,"phase_gmt":178.0,"speed":28.4397295},{"name":"K1","amp":0.55,"phase_gmt":165.0,"speed":15.0410686},{"name":"O1","amp":0.40,"phase_gmt":148.0,"speed":13.9430356}]}',
      ),
      _TideStationSeed(
        name: '舟山站',
        lat: 29.99,
        lon: 122.20,
        harmonicJson: '{"constituents":[{"name":"M2","amp":2.45,"phase_gmt":225.0,"speed":28.9841042},{"name":"S2","amp":0.88,"phase_gmt":258.0,"speed":30.0},{"name":"N2","amp":0.50,"phase_gmt":208.0,"speed":28.4397295},{"name":"K1","amp":0.58,"phase_gmt":192.0,"speed":15.0410686},{"name":"O1","amp":0.42,"phase_gmt":175.0,"speed":13.9430356}]}',
      ),
      _TideStationSeed(
        name: '三亚站',
        lat: 18.25,
        lon: 109.51,
        harmonicJson: '{"constituents":[{"name":"M2","amp":0.65,"phase_gmt":168.0,"speed":28.9841042},{"name":"S2","amp":0.35,"phase_gmt":198.0,"speed":30.0},{"name":"N2","amp":0.18,"phase_gmt":152.0,"speed":28.4397295},{"name":"K1","amp":0.58,"phase_gmt":148.0,"speed":15.0410686},{"name":"O1","amp":0.48,"phase_gmt":132.0,"speed":13.9430356}]}',
      ),
      _TideStationSeed(
        name: '大连站',
        lat: 38.91,
        lon: 121.63,
        harmonicJson: '{"constituents":[{"name":"M2","amp":1.65,"phase_gmt":185.0,"speed":28.9841042},{"name":"S2","amp":0.58,"phase_gmt":215.0,"speed":30.0},{"name":"N2","amp":0.35,"phase_gmt":168.0,"speed":28.4397295},{"name":"K1","amp":0.48,"phase_gmt":158.0,"speed":15.0410686},{"name":"O1","amp":0.35,"phase_gmt":142.0,"speed":13.9430356}]}',
      ),
      _TideStationSeed(
        name: '温州站',
        lat: 28.01,
        lon: 120.67,
        harmonicJson: '{"constituents":[{"name":"M2","amp":2.28,"phase_gmt":218.0,"speed":28.9841042},{"name":"S2","amp":0.82,"phase_gmt":250.0,"speed":30.0},{"name":"N2","amp":0.46,"phase_gmt":200.0,"speed":28.4397295},{"name":"K1","amp":0.56,"phase_gmt":188.0,"speed":15.0410686},{"name":"O1","amp":0.41,"phase_gmt":170.0,"speed":13.9430356}]}',
      ),
      _TideStationSeed(
        name: '深圳站',
        lat: 22.54,
        lon: 113.94,
        harmonicJson: '{"constituents":[{"name":"M2","amp":0.78,"phase_gmt":178.0,"speed":28.9841042},{"name":"S2","amp":0.38,"phase_gmt":208.0,"speed":30.0},{"name":"N2","amp":0.20,"phase_gmt":162.0,"speed":28.4397295},{"name":"K1","amp":0.55,"phase_gmt":155.0,"speed":15.0410686},{"name":"O1","amp":0.45,"phase_gmt":138.0,"speed":13.9430356}]}',
      ),
      _TideStationSeed(
        name: '福州站',
        lat: 26.08,
        lon: 119.30,
        harmonicJson: '{"constituents":[{"name":"M2","amp":2.35,"phase_gmt":222.0,"speed":28.9841042},{"name":"S2","amp":0.85,"phase_gmt":255.0,"speed":30.0},{"name":"N2","amp":0.48,"phase_gmt":205.0,"speed":28.4397295},{"name":"K1","amp":0.60,"phase_gmt":190.0,"speed":15.0410686},{"name":"O1","amp":0.43,"phase_gmt":172.0,"speed":13.9430356}]}',
      ),
    ];

    final companions = stations
        .map((s) => TideStationsCompanion.insert(
              name: s.name,
              lat: s.lat,
              lon: s.lon,
              harmonicConstantsJson: s.harmonicJson,
            ))
        .toList();

    await _db.batch((batch) {
      batch.insertAllOnConflictUpdate(_db.tideStations, companions);
    });
  }

  // ============================================================
  // 海滩种子数据
  // ============================================================
  Future<void> _seedBeaches() async {
    // 先获取插入后的潮汐站 ID（按名称查找）
    final stationMap = <String, int>{};
    final stations = await _db.tideStations.all().get();
    for (final s in stations) {
      stationMap[s.name] = s.id;
    }

    int stationId(String name) => stationMap[name] ?? stations.first.id;

    const beaches = [
      // 福建
      _BeachSeed(name: '厦门观音山沙滩', region: '福建', lat: 24.49, lon: 118.18, stationName: '厦门站', type: 'sandy', species: '黑鲷,鲈鱼,鲻鱼'),
      _BeachSeed(name: '厦门黄厝海滩', region: '福建', lat: 24.44, lon: 118.17, stationName: '厦门站', type: 'sandy', species: '黑鲷,鲈鱼'),
      _BeachSeed(name: '福州长乐海滩', region: '福建', lat: 25.97, lon: 119.53, stationName: '福州站', type: 'sandy', species: '黑鲷,鲈鱼,鲻鱼'),
      _BeachSeed(name: '平潭岛海滩', region: '福建', lat: 25.49, lon: 119.79, stationName: '福州站', type: 'sandy', species: '黑鲷,石斑鱼,鲈鱼'),
      // 浙江
      _BeachSeed(name: '舟山朱家尖海滩', region: '浙江', lat: 29.89, lon: 122.39, stationName: '舟山站', type: 'sandy', species: '黑鲷,鲈鱼,海鳗'),
      _BeachSeed(name: '温州洞头海钓场', region: '浙江', lat: 27.84, lon: 121.16, stationName: '温州站', type: 'rocky', species: '黑鲷,石斑鱼,鲈鱼'),
      _BeachSeed(name: '象山石浦渔港', region: '浙江', lat: 29.20, lon: 121.97, stationName: '舟山站', type: 'jetty', species: '黑鲷,鲻鱼,带鱼'),
      // 广东
      _BeachSeed(name: '深圳大梅沙海滩', region: '广东', lat: 22.60, lon: 114.35, stationName: '深圳站', type: 'sandy', species: '黑鲷,鲈鱼,金头鲷'),
      _BeachSeed(name: '深圳小梅沙海滩', region: '广东', lat: 22.61, lon: 114.37, stationName: '深圳站', type: 'sandy', species: '黑鲷,鲈鱼'),
      _BeachSeed(name: '惠州巽寮湾', region: '广东', lat: 22.89, lon: 114.73, stationName: '深圳站', type: 'sandy', species: '黑鲷,石斑鱼,鲈鱼'),
      // 山东
      _BeachSeed(name: '青岛金沙滩', region: '山东', lat: 36.04, lon: 120.24, stationName: '青岛站', type: 'sandy', species: '鲈鱼,黑鲷,鲭鱼'),
      _BeachSeed(name: '青岛石老人海滩', region: '山东', lat: 36.08, lon: 120.49, stationName: '青岛站', type: 'sandy', species: '鲈鱼,黑鲷,鲭鱼'),
      // 辽宁
      _BeachSeed(name: '大连金石滩', region: '辽宁', lat: 39.19, lon: 122.06, stationName: '大连站', type: 'sandy', species: '鲈鱼,黑鲷,鲭鱼'),
      _BeachSeed(name: '大连老虎滩', region: '辽宁', lat: 38.88, lon: 121.68, stationName: '大连站', type: 'rocky', species: '黑鲷,石斑鱼,鲈鱼'),
      // 海南
      _BeachSeed(name: '三亚亚龙湾', region: '海南', lat: 18.21, lon: 109.63, stationName: '三亚站', type: 'sandy', species: '石斑鱼,金枪鱼,鲈鱼'),
      _BeachSeed(name: '三亚天涯海角', region: '海南', lat: 18.24, lon: 109.24, stationName: '三亚站', type: 'rocky', species: '石斑鱼,鲹鱼,笛鲷'),
    ];

    final companions = beaches
        .map((b) => BeachesCompanion.insert(
              name: b.name,
              region: b.region,
              lat: b.lat,
              lon: b.lon,
              nearestStationId: stationId(b.stationName),
              beachType: b.type,
              typicalSpecies: b.species,
            ))
        .toList();

    await _db.batch((batch) {
      batch.insertAllOnConflictUpdate(_db.beaches, companions);
    });
  }

  // ============================================================
  // 鱼种种子数据
  // ============================================================
  Future<void> _seedSpecies() async {
    const speciesList = [
      _SpeciesSeed(name: '黑鲷', category: 'gamefish', rodPower: 'medium', lineWeight: '10-20 lb', rigType: 'hi-lo,bottom', bait: '沙蚕,螃蟹,贻贝'),
      _SpeciesSeed(name: '鲈鱼', category: 'gamefish', rodPower: 'medium-heavy', lineWeight: '15-30 lb', rigType: 'fish-finder,plug', bait: '小活鱼,沙蚕,虾'),
      _SpeciesSeed(name: '石斑鱼', category: 'gamefish', rodPower: 'heavy', lineWeight: '20-40 lb', rigType: 'bottom,hi-lo', bait: '小活鱼,鱿鱼,沙蚕'),
      _SpeciesSeed(name: '鲻鱼', category: 'panfish', rodPower: 'medium', lineWeight: '8-15 lb', rigType: 'hi-lo,float', bait: '面团,沙蚕,藻类'),
      _SpeciesSeed(name: '鲭鱼', category: 'gamefish', rodPower: 'medium', lineWeight: '10-20 lb', rigType: 'sabiki,jig', bait: '小型路亚,虾皮,沙蚕'),
      _SpeciesSeed(name: '带鱼', category: 'gamefish', rodPower: 'medium-heavy', lineWeight: '15-25 lb', rigType: 'bottom,hi-lo', bait: '小活鱼,鱿鱼条'),
      _SpeciesSeed(name: '鲹鱼', category: 'gamefish', rodPower: 'medium', lineWeight: '10-20 lb', rigType: 'jig,sabiki', bait: '小型路亚,沙蚕'),
      _SpeciesSeed(name: '笛鲷', category: 'gamefish', rodPower: 'medium-heavy', lineWeight: '15-30 lb', rigType: 'bottom,hi-lo', bait: '沙蚕,虾,小活鱼'),
      _SpeciesSeed(name: '金头鲷', category: 'gamefish', rodPower: 'medium', lineWeight: '10-20 lb', rigType: 'hi-lo,bottom', bait: '贻贝,螃蟹,沙蚕'),
      _SpeciesSeed(name: '海鳗', category: 'gamefish', rodPower: 'heavy', lineWeight: '20-40 lb', rigType: 'bottom', bait: '沙蚕,小活鱼,鱿鱼'),
    ];

    final companions = speciesList
        .map((s) => SpeciesCompanion.insert(
              name: s.name,
              category: s.category,
              preferredRodPower: s.rodPower,
              preferredLineWeight: s.lineWeight,
              preferredRigType: s.rigType,
              preferredBait: s.bait,
            ))
        .toList();

    await _db.batch((batch) {
      batch.insertAllOnConflictUpdate(_db.species, companions);
    });
  }
}

// ============================================================
// 辅助数据类（仅用于种子数据定义）
// ============================================================

class _TideStationSeed {
  final String name;
  final double lat;
  final double lon;
  final String harmonicJson;
  const _TideStationSeed({required this.name, required this.lat, required this.lon, required this.harmonicJson});
}

class _BeachSeed {
  final String name;
  final String region;
  final double lat;
  final double lon;
  final String stationName;
  final String type;
  final String species;
  const _BeachSeed({required this.name, required this.region, required this.lat, required this.lon, required this.stationName, required this.type, required this.species});
}

class _SpeciesSeed {
  final String name;
  final String category;
  final String rodPower;
  final String lineWeight;
  final String rigType;
  final String bait;
  const _SpeciesSeed({required this.name, required this.category, required this.rodPower, required this.lineWeight, required this.rigType, required this.bait});
}
