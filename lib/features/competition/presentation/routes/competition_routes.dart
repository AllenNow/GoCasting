import 'package:get/get.dart';
import 'package:go_casting/features/competition/presentation/competition_binding.dart';
import 'package:go_casting/features/competition/presentation/screens/competition_list_screen.dart';
import 'package:go_casting/features/competition/presentation/screens/competition_stats_screen.dart';
import 'package:go_casting/features/competition/presentation/screens/entry_submission_screen.dart';
import 'package:go_casting/features/competition/presentation/screens/leaderboard_screen.dart';

class CompetitionRoutes {
  static const String competitionList = '/competition';
  static const String leaderboard = '/competition/leaderboard';
  static const String entrySubmission = '/competition/submit';
  static const String competitionStats = '/competition/stats';

  static List<GetPage> get routes => [
    GetPage(
      name: competitionList,
      page: () => const CompetitionListScreen(),
      binding: CompetitionBinding(),
    ),
    GetPage(
      name: leaderboard,
      page: () => const LeaderboardScreen(),
      binding: CompetitionBinding(),
    ),
    GetPage(
      name: entrySubmission,
      page: () => const EntrySubmissionScreen(),
      binding: CompetitionBinding(),
    ),
    GetPage(
      name: competitionStats,
      page: () => const CompetitionStatsScreen(),
      binding: CompetitionBinding(),
    ),
  ];
}