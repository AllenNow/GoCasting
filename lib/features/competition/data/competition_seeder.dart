import 'package:go_casting/core/database/competition_db.dart';
import 'package:go_casting/features/competition/data/competition_repository.dart';
import 'package:go_casting/features/competition/domain/competition_models.dart';

/// 比赛数据播种器
/// 用于创建示例比赛数据和测试数据
class CompetitionSeeder {
  final CompetitionRepository repository;

  CompetitionSeeder(this.repository);

  /// 创建第一届纯粹的钓鱼大师赛（用户要求的比赛）
  Future<void> seedFirstMasterCompetition() async {
    try {
      // 检查是否已经有这个比赛
      final existingCompetitions = await repository.getAllCompetitions();
      final existingMasterComp = existingCompetitions.firstWhereOrNull(
        (comp) => comp.name.contains('第一届纯粹的钓鱼大师赛'),
      );

      if (existingMasterComp != null) {
        print('比赛已存在，跳过创建: ${existingMasterComp.name}');
        return;
      }

      print('开始创建第一届纯粹的钓鱼大师赛...');

      // 1. 创建比赛
      final competition = Competition(
        id: 0,
        name: '第一届纯粹的钓鱼大师赛',
        description: '纯粹的尺寸优先比赛，分两条线：黄鳍鲷和沙尖鱼，新增巨物猎手类别。',
        startDate: DateTime(2026, 9, 25),
        endDate: DateTime(2026, 12, 31),
        status: CompetitionStatus.active,
        createdAt: DateTime.now(),
      );

      final createdCompetition = await repository.createCompetition(competition);
      print('比赛创建成功: ${createdCompetition.name}');

      // 2. 创建比赛类别
      final categories = [
        CompetitionCategory(
          id: 0,
          competitionId: createdCompetition.id,
          categoryName: '黄鳍鲷',
          fishSpecies: '黄鳍鲷',
          minLengthCm: 25.0, // 25cm上榜
          minWeightG: null,
          specialRules: '超过30cm需要拍摄活鱼视频和周围环境视频',
          createdAt: DateTime.now(),
        ),
        CompetitionCategory(
          id: 0,
          competitionId: createdCompetition.id,
          categoryName: '沙尖鱼',
          fishSpecies: '沙尖鱼',
          minLengthCm: 18.0, // 18cm上榜
          minWeightG: null,
          specialRules: '超过25cm需要拍摄活鱼视频和周围环境视频',
          createdAt: DateTime.now(),
        ),
        CompetitionCategory(
          id: 0,
          competitionId: createdCompetition.id,
          categoryName: '巨物猎手',
          fishSpecies: '综合',
          minLengthCm: null,
          minWeightG: 500.0, // 一斤（500g）上榜
          specialRules: '长度优先，等长比重量。超过60cm或3斤需要视频验证',
          createdAt: DateTime.now(),
        ),
      ];

      final createdCategories = <CompetitionCategory>[];
      for (final category in categories) {
        final created = await repository.createCategory(category);
        createdCategories.add(created);
        print('类别创建成功: ${created.categoryName}');
      }

      // 3. 创建奖品
      final prizes = [
        // 黄鳍鲷类别奖品
        CompetitionPrize(
          id: 0,
          competitionId: createdCompetition.id,
          categoryId: createdCategories[0].id,
          prizeName: '冠军奖品：高级钓鱼竿',
          rank: 1,
          sponsor: '比赛组委会',
          description: '黄鳍鲷类别冠军奖品',
          createdAt: DateTime.now(),
        ),
        CompetitionPrize(
          id: 0,
          competitionId: createdCompetition.id,
          categoryId: createdCategories[0].id,
          prizeName: '亚军奖品：专业渔轮',
          rank: 2,
          sponsor: '比赛组委会',
          description: '黄鳍鲷类别亚军奖品',
          createdAt: DateTime.now(),
        ),
        CompetitionPrize(
          id: 0,
          competitionId: createdCompetition.id,
          categoryId: createdCategories[0].id,
          prizeName: '季军奖品：钓具套装',
          rank: 3,
          sponsor: '比赛组委会',
          description: '黄鳍鲷类别季军奖品',
          createdAt: DateTime.now(),
        ),

        // 沙尖鱼类别奖品
        CompetitionPrize(
          id: 0,
          competitionId: createdCompetition.id,
          categoryId: createdCategories[1].id,
          prizeName: '冠军奖品：高级钓鱼竿',
          rank: 1,
          sponsor: '比赛组委会',
          description: '沙尖鱼类别冠军奖品',
          createdAt: DateTime.now(),
        ),
        CompetitionPrize(
          id: 0,
          competitionId: createdCompetition.id,
          categoryId: createdCategories[1].id,
          prizeName: '亚军奖品：专业渔轮',
          rank: 2,
          sponsor: '比赛组委会',
          description: '沙尖鱼类别亚军奖品',
          createdAt: DateTime.now(),
        ),

        // 巨物猎手类别奖品
        CompetitionPrize(
          id: 0,
          competitionId: createdCompetition.id,
          categoryId: createdCategories[2].id,
          prizeName: '巨物王奖杯',
          rank: 1,
          sponsor: '比赛组委会',
          description: '年度最大鱼获奖者',
          createdAt: DateTime.now(),
        ),

        // 每周抽奖奖品
        CompetitionPrize(
          id: 0,
          competitionId: createdCompetition.id,
          categoryId: null, // null表示全体抽奖
          prizeName: 'CastingMaster地插',
          rank: null,
          sponsor: '柳大师',
          description: '每周抽奖奖品，CastingMaster地插优先试用权',
          createdAt: DateTime.now(),
        ),
        CompetitionPrize(
          id: 0,
          competitionId: createdCompetition.id,
          categoryId: null,
          prizeName: '沐屿粉棍试用优先权',
          rank: null,
          sponsor: '沐屿',
          description: '每周抽奖奖品，沐屿粉棍优先试用权',
          createdAt: DateTime.now(),
        ),
      ];

      for (final prize in prizes) {
        await repository.createPrize(prize);
        print('奖品创建成功: ${prize.prizeName}');
      }

      // 4. 添加一些示例参赛记录（用于测试）
      await _addSampleEntries(createdCompetition, createdCategories);
      
      print('第一届纯粹的钓鱼大师赛数据播种完成！');

    } catch (e) {
      print('创建比赛数据时出错: $e');
      rethrow;
    }
  }

  /// 添加示例参赛记录
  Future<void> _addSampleEntries(Competition competition, List<CompetitionCategory> categories) async {
    final sampleEntries = [
      // 黄鳍鲷示例记录
      CompetitionEntry(
        id: 0,
        competitionId: competition.id,
        categoryId: categories[0].id,
        participantName: '老高-海湾公园',
        catchLogId: null,
        lengthCm: 28.5,
        weightG: 320.0,
        location: '海湾公园',
        fishingMethod: FishingMethod.shore,
        county: '厦门',
        fishPhotoPath: null,
        measurementPhotoPath: null,
        environmentVideoPath: null,
        verificationStatus: VerificationStatus.verified,
        verificationCount: 2,
        challengeCount: 0,
        verificationNotes: '已验证',
        baitUsed: '虾肉',
        gearUsed: '3号竿，3000轮',
        weatherCondition: '晴天',
        tideCondition: '涨潮',
        catchTime: '08:30',
        catchDate: DateTime(2026, 10, 15),
        createdAt: DateTime.now(),
      ),
      CompetitionEntry(
        id: 0,
        competitionId: competition.id,
        categoryId: categories[0].id,
        participantName: '小李-五缘湾',
        catchLogId: null,
        lengthCm: 26.8,
        weightG: 285.0,
        location: '五缘湾',
        fishingMethod: FishingMethod.shore,
        county: '厦门',
        fishPhotoPath: null,
        measurementPhotoPath: null,
        environmentVideoPath: null,
        verificationStatus: VerificationStatus.pending,
        verificationCount: 0,
        challengeCount: 0,
        verificationNotes: null,
        baitUsed: '沙虫',
        gearUsed: '4号竿，4000轮',
        weatherCondition: '多云',
        tideCondition: '退潮',
        catchTime: '14:20',
        catchDate: DateTime(2026, 10, 12),
        createdAt: DateTime.now(),
      ),

      // 沙尖鱼示例记录
      CompetitionEntry(
        id: 0,
        competitionId: competition.id,
        categoryId: categories[1].id,
        participantName: '小王-漳州沙滩',
        catchLogId: null,
        lengthCm: 22.3,
        weightG: 180.0,
        location: '漳州沙滩',
        fishingMethod: FishingMethod.shore,
        county: '漳州',
        fishPhotoPath: null,
        measurementPhotoPath: null,
        environmentVideoPath: null,
        verificationStatus: VerificationStatus.verified,
        verificationCount: 1,
        challengeCount: 0,
        verificationNotes: '照片验证通过',
        baitUsed: '青虫',
        gearUsed: '2号竿，2500轮',
        weatherCondition: '阴天',
        tideCondition: '平潮',
        catchTime: '10:15',
        catchDate: DateTime(2026, 10, 10),
        createdAt: DateTime.now(),
      ),
      CompetitionEntry(
        id: 0,
        competitionId: competition.id,
        categoryId: categories[1].id,
        participantName: '老陈-厦门环岛路',
        catchLogId: null,
        lengthCm: 20.5,
        weightG: 155.0,
        location: '环岛路',
        fishingMethod: FishingMethod.shore,
        county: '厦门',
        fishPhotoPath: null,
        measurementPhotoPath: null,
        environmentVideoPath: null,
        verificationStatus: VerificationStatus.challenged,
        verificationCount: 0,
        challengeCount: 1,
        verificationNotes: '长度测量方式被质疑',
        baitUsed: '虾肉',
        gearUsed: '3号竿，3000轮',
        weatherCondition: '晴天',
        tideCondition: '涨潮',
        catchTime: '09:45',
        catchDate: DateTime(2026, 10, 8),
        createdAt: DateTime.now(),
      ),

      // 巨物猎手示例记录
      CompetitionEntry(
        id: 0,
        competitionId: competition.id,
        categoryId: categories[2].id,
        participantName: '巨物猎人-漳州海岸',
        catchLogId: null,
        lengthCm: 65.0,
        weightG: 1800.0,
        location: '漳州海岸',
        fishingMethod: FishingMethod.shore,
        county: '漳州',
        fishPhotoPath: null,
        measurementPhotoPath: null,
        environmentVideoPath: null,
        verificationStatus: VerificationStatus.verified,
        verificationCount: 3,
        challengeCount: 0,
        verificationNotes: '视频验证通过，符合巨物标准',
        baitUsed: '活虾',
        gearUsed: '6号竿，8000轮',
        weatherCondition: '小雨',
        tideCondition: '大潮',
        catchTime: '16:30',
        catchDate: DateTime(2026, 10, 5),
        createdAt: DateTime.now(),
      ),
      CompetitionEntry(
        id: 0,
        competitionId: competition.id,
        categoryId: categories[2].id,
        participantName: '大鱼王-厦门外海',
        catchLogId: null,
        lengthCm: 58.5,
        weightG: 1550.0,
        location: '厦门外海',
        fishingMethod: FishingMethod.shore,
        county: '厦门',
        fishPhotoPath: null,
        measurementPhotoPath: null,
        environmentVideoPath: null,
        verificationStatus: VerificationStatus.verified,
        verificationCount: 2,
        challengeCount: 0,
        verificationNotes: '照片和视频验证',
        baitUsed: '章鱼',
        gearUsed: '5号竿，6000轮',
        weatherCondition: '晴天',
        tideCondition: '涨潮',
        catchTime: '12:10',
        catchDate: DateTime(2026, 10, 3),
        createdAt: DateTime.now(),
      ),
    ];

    for (final entry in sampleEntries) {
      await repository.createEntry(entry);
      print('示例参赛记录创建成功: ${entry.participantName}');
    }
  }

  /// 清除所有比赛数据（仅用于测试）
  Future<void> clearAllData() async {
    try {
      final db = competitionRepository.database;
      await db.customStatement('DELETE FROM WeeklyDraws');
      await db.customStatement('DELETE FROM PrizeWinners');
      await db.customStatement('DELETE FROM CompetitionPrizes');
      await db.customStatement('DELETE FROM CompetitionEntries');
      await db.customStatement('DELETE FROM CompetitionCategories');
      await db.customStatement('DELETE FROM Competitions');
      print('所有比赛数据已清除');
    } catch (e) {
      print('清除数据时出错: $e');
      rethrow;
    }
  }
}

// 全局播种器实例
final competitionSeeder = CompetitionSeeder(competitionRepository);