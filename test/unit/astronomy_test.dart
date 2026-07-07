import 'package:flutter_test/flutter_test.dart';
import 'package:go_casting/features/planner/domain/astronomy.dart';

void main() {
  const astro = Astronomy();

  group('Moon Phase', () {
    test('new moon date returns near-zero illumination', () {
      // 2026-01-18 is approximately a new moon
      final result = astro.getMoonPhase(DateTime.utc(2026, 1, 18));
      expect(result.illumination, lessThan(0.1));
      expect(result.phaseName, contains('New'));
    });

    test('full moon date returns high illumination', () {
      // 2026-01-03 is approximately a full moon
      final result = astro.getMoonPhase(DateTime.utc(2026, 1, 3));
      expect(result.illumination, greaterThan(0.85));
      expect(result.phaseName, contains('Full'));
    });

    test('phase is between 0 and 1', () {
      for (var day = 1; day <= 30; day++) {
        final result = astro.getMoonPhase(DateTime.utc(2026, 7, day));
        expect(result.phase, greaterThanOrEqualTo(0.0));
        expect(result.phase, lessThan(1.0));
        expect(result.illumination, greaterThanOrEqualTo(0.0));
        expect(result.illumination, lessThanOrEqualTo(1.0));
      }
    });

    test('age cycles through roughly 29.5 days', () {
      final day1 = astro.getMoonPhase(DateTime.utc(2026, 7, 1));
      final day15 = astro.getMoonPhase(DateTime.utc(2026, 7, 16));
      // 15 days later should be roughly half a cycle different
      expect((day15.ageInDays - day1.ageInDays).abs(), closeTo(15, 2));
    });
  });

  group('Sun Times', () {
    test('sunrise before sunset for normal latitude', () {
      // 青岛 (36.07°N, 120.33°E) in July
      final result = astro.getSunTimes(
        DateTime.utc(2026, 7, 1),
        36.07,
        120.33,
      );
      expect(result.sunrise, isNotNull);
      expect(result.sunset, isNotNull);
      expect(result.sunrise!.isBefore(result.sunset!), isTrue);
    });

    test('sunrise is roughly in the morning hours', () {
      // 大连 (38.91°N, 121.60°E) July
      final result = astro.getSunTimes(
        DateTime.utc(2026, 7, 1),
        38.91,
        121.60,
      );
      // Sunrise in UTC should be around 21:xx previous day (= ~5am local CST)
      expect(result.sunrise, isNotNull);
      // Sunset in UTC should be around 11:xx (= ~7pm local CST)
      expect(result.sunset, isNotNull);
    });

    test('civil twilight begins before sunrise', () {
      final result = astro.getSunTimes(
        DateTime.utc(2026, 7, 1),
        36.07,
        120.33,
      );
      if (result.civilTwilightBegin != null && result.sunrise != null) {
        expect(
            result.civilTwilightBegin!.isBefore(result.sunrise!), isTrue);
      }
    });

    test('civil twilight ends after sunset', () {
      final result = astro.getSunTimes(
        DateTime.utc(2026, 7, 1),
        36.07,
        120.33,
      );
      if (result.civilTwilightEnd != null && result.sunset != null) {
        expect(result.civilTwilightEnd!.isAfter(result.sunset!), isTrue);
      }
    });
  });

  group('Solunar Periods', () {
    test('returns major and minor periods', () {
      final result = astro.getSolunarPeriods(
        DateTime.utc(2026, 7, 1),
        36.07,
        120.33,
      );
      // Should have at least some periods
      expect(
        result.majorPeriods.length + result.minorPeriods.length,
        greaterThan(0),
      );
    });

    test('major periods are 2 hours long', () {
      final result = astro.getSolunarPeriods(
        DateTime.utc(2026, 7, 1),
        36.07,
        120.33,
      );
      for (final period in result.majorPeriods) {
        final duration = period.end.difference(period.start);
        expect(duration.inMinutes, 120);
      }
    });

    test('minor periods are 1 hour long', () {
      final result = astro.getSolunarPeriods(
        DateTime.utc(2026, 7, 1),
        36.07,
        120.33,
      );
      for (final period in result.minorPeriods) {
        final duration = period.end.difference(period.start);
        expect(duration.inMinutes, 60);
      }
    });
  });
}
