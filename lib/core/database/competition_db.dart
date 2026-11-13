import 'dart:io';

import 'package:drift/drift.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

// 导入用户数据库的CatchLogs表
import 'user_db.dart';

part 'competition_db.g.dart';

// ============================================================
// 钓鱼比赛相关表定义
// ============================================================

/// 比赛定义表
class Competitions extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text()(); // 比赛名称，如 "第一届纯粹的钓鱼大师赛"
  TextColumn get description => text()(); // 比赛描述
  TextColumn get startDate => text()(); // 开始日期，ISO 8601，如 "2026-09-25"
  TextColumn get endDate => text()(); // 结束日期，ISO 8601，如 "2026-12-31"
  BoolColumn get isActive => boolean().withDefault(const Constant(true))(); // 是否进行中
  TextColumn get createdAt => text()();
  
  @override
  List<String> get customConstraints => ['UNIQUE(name, startDate)'];
}

/// 比赛类别表（黄鳍鲷、沙尖鱼、巨物猎手）
class CompetitionCategories extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get competitionId => integer().references(Competitions, #id)();
  TextColumn get categoryName => text()(); // 如 "黄鳍鲷", "沙尖鱼", "巨物猎手"
  TextColumn get fishSpecies => text()(); // 鱼种名称
  RealColumn get minLengthCm => real().nullable()(); // 最小上榜长度（cm），如 25.0
  RealColumn get minWeightG => real().nullable()(); // 最小上榜重量（g），如 500.0
  TextColumn get specialRules => text().nullable()(); // 特殊规则说明
  TextColumn get createdAt => text()();
}

/// 比赛记录表（参赛记录）
class CompetitionEntries extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get competitionId => integer().references(Competitions, #id)();
  IntColumn get categoryId => integer().references(CompetitionCategories, #id)();
  TextColumn get participantName => text()(); // 参赛者昵称，如 "老高-海湾公园"
  IntColumn get catchLogId => integer().nullable()(); // 关联渔获记录ID（不同数据库的引用）
  
  // 比赛专用数据
  RealColumn get lengthCm => real()(); // 测量长度（cm）
  RealColumn get weightG => real().nullable()(); // 测量重量（g，去除容器重量）
  TextColumn get location => text()(); // 钓点，如 "海湾公园"
  TextColumn get fishingMethod => text().withDefault(const Constant('shore'))(); // 钓法：shore（岸钓/沙滩）、rock（登礁）、boat（船）、platform（鱼排）
  TextColumn get county => text()(); // 区域，如 "厦门", "漳州"
  
  // 验证相关字段
  TextColumn get fishPhotoPath => text().nullable()(); // 活鱼照片路径
  TextColumn get measurementPhotoPath => text().nullable()(); // 测量照片路径
  TextColumn get environmentVideoPath => text().nullable()(); // 环境视频路径
  BoolColumn get isVerified => boolean().withDefault(const Constant(false))(); // 是否已验证
  IntColumn get verificationCount => integer().withDefault(const Constant(0))(); // 验证通过次数
  IntColumn get challengeCount => integer().withDefault(const Constant(0))(); // 被质疑次数
  TextColumn get verificationNotes => text().nullable()(); // 验证说明
  
  // 额外信息
  TextColumn get baitUsed => text().nullable()(); // 使用的饵料
  TextColumn get gearUsed => text().nullable()(); // 使用的装备
  TextColumn get weatherCondition => text().nullable()(); // 天气状况
  TextColumn get tideCondition => text().nullable()(); // 潮汐状况
  TextColumn get catchTime => text().nullable()(); // 捕获时间 HH:mm
  TextColumn get catchDate => text()(); // 捕获日期 ISO 8601
  
  TextColumn get createdAt => text()();
  
  @override
  List<String> get customConstraints => ['UNIQUE(competitionId, categoryId, participantName)'];
}

/// 奖品表
class CompetitionPrizes extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get competitionId => integer().references(Competitions, #id)();
  IntColumn get categoryId => integer().references(CompetitionCategories, #id).nullable()(); // null表示全体抽奖
  TextColumn get prizeName => text()(); // 奖品名称，如 "CastingMaster地插"
  IntColumn get rank => integer().nullable()(); // 排名（1,2,3），null表示抽奖奖品
  TextColumn get sponsor => text().nullable()(); // 赞助商，如 "柳大师"
  TextColumn get description => text().nullable()(); // 奖品描述
  TextColumn get createdAt => text()();
}

/// 中奖记录表
class PrizeWinners extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get prizeId => integer().references(CompetitionPrizes, #id)();
  IntColumn get entryId => integer().references(CompetitionEntries, #id).nullable()(); // 参赛记录ID
  TextColumn get winnerName => text().nullable()(); // 中奖者姓名
  BoolColumn get isRaffle => boolean().withDefault(const Constant(false))(); // 是否抽奖奖品
  BoolColumn get isDistributed => boolean().withDefault(const Constant(false))(); // 是否已发放
  TextColumn get distributionNotes => text().nullable()(); // 发放说明
  TextColumn get createdAt => text()();
}

/// 抽奖记录表（每周抽奖）
class WeeklyDraws extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get competitionId => integer().references(Competitions, #id)();
  TextColumn get drawName => text()(); // 抽奖名称，如 "沐屿粉棍试用优先权"
  TextColumn get drawDate => text()(); // 抽奖日期 ISO 8601
  IntColumn get entryId => integer().references(CompetitionEntries, #id).nullable()(); // 中奖参赛记录
  TextColumn get winnerName => text().nullable()(); // 中奖者姓名
  BoolColumn get isDrawn => boolean().withDefault(const Constant(false))(); // 是否已开奖
  TextColumn get notes => text().nullable()(); // 备注
  TextColumn get createdAt => text()();
}

// 注意：这里不能直接引用CatchLogs，因为它在不同的数据库中
// 我们通过引用字段来实现关联，但不把表包含在这里

@DriftDatabase(
  tables: [
    Competitions,
    CompetitionCategories,
    CompetitionEntries,
    CompetitionPrizes,
    PrizeWinners,
    WeeklyDraws,
  ],
)
class CompetitionDatabase extends _$CompetitionDatabase {
  CompetitionDatabase() : super(_openCompetitionDb());

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (Migrator m) async {
        await m.createAll();
      },
    );
  }
}

/// 打开比赛数据库
LazyDatabase _openCompetitionDb() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'competition.db'));

    return NativeDatabase(
      file,
      setup: (db) {
        db.execute('PRAGMA journal_mode=WAL');
      },
    );
  });
}