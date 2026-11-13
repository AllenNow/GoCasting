import 'package:get/get.dart';
import 'package:go_casting/features/competition/data/competition_repository.dart';
import 'package:go_casting/features/competition/presentation/competition_controller.dart';

/// 比赛功能依赖注入绑定
class CompetitionBinding extends Bindings {
  @override
  void dependencies() {
    // 注册单例依赖
    Get.lazyPut<CompetitionRepository>(() => competitionRepository);
    Get.lazyPut<CompetitionController>(() => CompetitionController());
  }
}