import 'package:flutter_test/flutter_test.dart';
import 'package:go_casting/features/planner/domain/tide_predictor.dart';

void main() {
  const predictor = TidePredictor();

  // 大连港的谐波常数 (来自 reference.db)
  final dalianConstants = [
    const HarmonicConstant(name: 'M2', amplitude: 1.45, phase: 52, speed: 28.9841),
    const HarmonicConstant(name: 'S2', amplitude: 0.55, phase: 85, speed: 30.0),
    const HarmonicConstant(name: 'K1', amplitude: 0.35, phase: 105, speed: 15.0411),
    const HarmonicConstant(name: 'O1', amplitude: 0.28, phase: 92, speed: 13.9430),
  ];

  group('TidePredictor', () {
    test('predict returns correct number of data points for 24h', () {
      final start = DateTime.utc(2026, 7, 1, 0, 0);
      final end = DateTime.utc(2026, 7, 1, 23, 50);

      final result = predictor.predict(
        datum: 2.0,
        constants: dalianConstants,
        start: start,
        end: end,
        intervalMinutes: 10,
      );

      // 24h / 10min = 144 points
      expect(result.timestamps.length, 144);
      expect(result.heights.length, 144);
    });

    test('predict produces heights within reasonable range', () {
      final start = DateTime.utc(2026, 7, 1, 0, 0);
      final end = DateTime.utc(2026, 7, 1, 23, 50);

      final result = predictor.predict(
        datum: 2.0,
        constants: dalianConstants,
        start: start,
        end: end,
      );

      // 潮汐高度应在 datum ± sum(amplitudes) 范围内
      // datum=2.0, max amp sum = 1.45+0.55+0.35+0.28 = 2.63
      for (final h in result.heights) {
        expect(h, greaterThan(-1.0)); // 2.0 - 2.63 = -0.63
        expect(h, lessThan(5.0)); // 2.0 + 2.63 = 4.63
      }
    });

    test('predict finds high and low tides', () {
      final start = DateTime.utc(2026, 7, 1, 0, 0);
      final end = DateTime.utc(2026, 7, 2, 0, 0);

      final result = predictor.predict(
        datum: 2.0,
        constants: dalianConstants,
        start: start,
        end: end,
      );

      // 应该有 2-4 个极值点（半日潮：2高2低）
      expect(result.highLowTimes.length, greaterThanOrEqualTo(2));
      expect(result.highLowTimes.length, lessThanOrEqualTo(6));

      // 至少有一个高潮和一个低潮
      final highs = result.highLowTimes.where((e) => e.isHigh);
      final lows = result.highLowTimes.where((e) => !e.isHigh);
      expect(highs, isNotEmpty);
      expect(lows, isNotEmpty);

      // 高潮高于低潮
      if (highs.isNotEmpty && lows.isNotEmpty) {
        expect(highs.first.height, greaterThan(lows.first.height));
      }
    });

    test('predict completes 7-day computation under 500ms', () {
      final start = DateTime.utc(2026, 7, 1, 0, 0);
      final end = DateTime.utc(2026, 7, 8, 0, 0);

      final stopwatch = Stopwatch()..start();
      final result = predictor.predict(
        datum: 2.0,
        constants: dalianConstants,
        start: start,
        end: end,
      );
      stopwatch.stop();

      expect(stopwatch.elapsedMilliseconds, lessThan(500));
      expect(result.timestamps.length, greaterThan(1000)); // 7 * 144 = 1008
    });

    test('getTideState returns correct states', () {
      final heights = [1.0, 1.5, 2.0, 1.8, 1.5];
      expect(predictor.getTideState(heights, 1), 'Rising');
      expect(predictor.getTideState(heights, 3), 'Falling');
    });
  });
}
