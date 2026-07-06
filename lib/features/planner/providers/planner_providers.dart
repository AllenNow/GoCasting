import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/database_providers.dart';
import '../../../core/database/reference_db.dart';
import '../domain/astronomy.dart';
import '../domain/tide_predictor.dart';

/// 选中的海滩 Provider
final selectedBeachProvider = StateProvider<Beache?>((ref) => null);

/// 选中的日期 Provider
final selectedDateProvider = StateProvider<DateTime>((ref) => DateTime.now());

/// 所有海滩列表 Provider
final beachListProvider = FutureProvider<List<Beache>>((ref) async {
  final db = ref.watch(referenceDatabaseProvider);
  return db.select(db.beaches).get();
});

/// 天文数据 Provider
final astronomyProvider = Provider.family<
    ({MoonPhaseInfo moon, SunTimes sun, SolunarPeriods solunar}),
    ({DateTime date, double lat, double lon})>((ref, params) {
  const astro = Astronomy();
  return (
    moon: astro.getMoonPhase(params.date),
    sun: astro.getSunTimes(params.date, params.lat, params.lon),
    solunar: astro.getSolunarPeriods(params.date, params.lat, params.lon),
  );
});

/// 潮汐预测 Provider (需要 tide station 数据)
final tidePredictionProvider = Provider.family<TidePrediction?,
    ({DateTime date, int stationId})>((ref, params) {
  // 潮汐预测需要谐波常数，数据在 Story 1.4 填充后才能工作
  // 这里返回 null 表示暂无数据
  return null;
});
