import 'package:get/get.dart';
import 'package:go_casting/core/database/competition_db.dart';
import 'package:go_casting/features/competition/domain/competition_models.dart';

part 'competition_repository.g.dart';

/// 比赛数据仓库
abstract class CompetitionRepository {
  Future<List<Competition>> getAllCompetitions();
  Future<Competition?> getCompetitionById(int id);
  Future<Competition> createCompetition(Competition competition);
  Future<void> updateCompetition(Competition competition);
  Future<void> deleteCompetition(int id);
  
  // 比赛类别
  Future<List<CompetitionCategory>> getCategoriesByCompetition(int competitionId);
  Future<CompetitionCategory?> getCategoryById(int id);
  Future<CompetitionCategory> createCategory(CompetitionCategory category);
  
  // 参赛记录
  Future<List<CompetitionEntry>> getEntriesByCompetition(int competitionId);
  Future<List<CompetitionEntry>> getEntriesByCategory(int categoryId);
  Future<CompetitionEntry?> getEntryById(int id);
  Future<CompetitionEntry> createEntry(CompetitionEntry entry);
  Future<void> updateEntry(CompetitionEntry entry);
  Future<void> deleteEntry(int id);
  
  // 验证相关
  Future<void> verifyEntry(int entryId, String notes);
  Future<void> challengeEntry(int entryId, String reason);
  Future<void> resolveChallenge(int entryId, bool isValid, String notes);
  
  // 排行榜
  Future<List<LeaderboardEntry>> getLeaderboardByCategory(int categoryId);
  Future<CompetitionStats> getCompetitionStats(int competitionId);
  
  // 奖品管理
  Future<List<CompetitionPrize>> getPrizesByCompetition(int competitionId);
  Future<CompetitionPrize?> getPrizeById(int id);
  Future<CompetitionPrize> createPrize(CompetitionPrize prize);
  Future<void> assignPrize(int prizeId, int entryId, String winnerName);
  
  // 抽奖管理
  Future<void> createWeeklyDraw(int competitionId, String drawName, DateTime drawDate);
  Future<void> drawWinner(int drawId, int entryId, String winnerName);
}

/// 实现类 - 基于Drift数据库
class CompetitionRepositoryImpl extends CompetitionRepository {
  final CompetitionDatabase _db;
  
  CompetitionRepositoryImpl() : _db = CompetitionDatabase();
  
  @override
  Future<List<Competition>> getAllCompetitions() async {
    final competitions = await _db.select(_db.competitions).get();
    return competitions.map((row) {
      final status = _determineCompetitionStatus(
        DateTime.parse(row.startDate),
        DateTime.parse(row.endDate),
      );
      
      return Competition(
        id: row.id,
        name: row.name,
        description: row.description,
        startDate: DateTime.parse(row.startDate),
        endDate: DateTime.parse(row.endDate),
        status: status,
        createdAt: DateTime.parse(row.createdAt),
      );
    }).toList();
  }
  
  @override
  Future<Competition?> getCompetitionById(int id) async {
    final competition = await (_db.select(_db.competitions)..where((tbl) => tbl.id.equals(id))).getSingleOrNull();
    
    if (competition == null) return null;
    
    final status = _determineCompetitionStatus(
      DateTime.parse(competition.startDate),
      DateTime.parse(competition.endDate),
    );
    
    return Competition(
      id: competition.id,
      name: competition.name,
      description: competition.description,
      startDate: DateTime.parse(competition.startDate),
      endDate: DateTime.parse(competition.endDate),
      status: status,
      createdAt: DateTime.parse(competition.createdAt),
    );
  }
  
  @override
  Future<Competition> createCompetition(Competition competition) async {
    final now = DateTime.now().toIso8601String();
    
    final row = CompetitionsCompanion.insert(
      name: competition.name,
      description: competition.description,
      startDate: competition.startDate.toIso8601String(),
      endDate: competition.endDate.toIso8601String(),
      isActive: true,
      createdAt: now,
    );
    
    final id = await _db.into(_db.competitions).insert(row);
    
    return competition.copyWith(id: id);
  }
  
  @override
  Future<void> updateCompetition(Competition competition) async {
    await (_db.update(_db.competitions)..where((tbl) => tbl.id.equals(competition.id))).write(
      CompetitionsCompanion(
        name: Value(competition.name),
        description: Value(competition.description),
        startDate: Value(competition.startDate.toIso8601String()),
        endDate: Value(competition.endDate.toIso8601String()),
      ),
    );
  }
  
  @override
  Future<void> deleteCompetition(int id) async {
    await (_db.delete(_db.competitions)..where((tbl) => tbl.id.equals(id))).go();
  }
  
  @override
  Future<List<CompetitionCategory>> getCategoriesByCompetition(int competitionId) async {
    final categories = await (_db.select(_db.competitionCategories)
      ..where((tbl) => tbl.competitionId.equals(competitionId))
      ..orderBy([(tbl) => OrderingTerm(expression: tbl.categoryName)])
    ).get();
    
    return categories.map((row) {
      return CompetitionCategory(
        id: row.id,
        competitionId: row.competitionId,
        categoryName: row.categoryName,
        fishSpecies: row.fishSpecies,
        minLengthCm: row.minLengthCm,
        minWeightG: row.minWeightG,
        specialRules: row.specialRules,
        createdAt: DateTime.parse(row.createdAt),
      );
    }).toList();
  }
  
  @override
  Future<CompetitionCategory?> getCategoryById(int id) async {
    final category = await (_db.select(_db.competitionCategories)..where((tbl) => tbl.id.equals(id))).getSingleOrNull();
    
    if (category == null) return null;
    
    return CompetitionCategory(
      id: category.id,
      competitionId: category.competitionId,
      categoryName: category.categoryName,
      fishSpecies: category.fishSpecies,
      minLengthCm: category.minLengthCm,
      minWeightG: category.minWeightG,
      specialRules: category.specialRules,
      createdAt: DateTime.parse(category.createdAt),
    );
  }
  
  @override
  Future<CompetitionCategory> createCategory(CompetitionCategory category) async {
    final now = DateTime.now().toIso8601String();
    
    final row = CompetitionCategoriesCompanion.insert(
      competitionId: category.competitionId,
      categoryName: category.categoryName,
      fishSpecies: category.fishSpecies,
      minLengthCm: Value(category.minLengthCm),
      minWeightG: Value(category.minWeightG),
      specialRules: Value(category.specialRules),
      createdAt: now,
    );
    
    final id = await _db.into(_db.competitionCategories).insert(row);
    
    return category.copyWith(id: id);
  }
  
  @override
  Future<List<CompetitionEntry>> getEntriesByCompetition(int competitionId) async {
    final entries = await (_db.select(_db.competitionEntries)
      ..where((tbl) => tbl.competitionId.equals(competitionId))
      ..orderBy([(tbl) => OrderingTerm.desc(tbl.lengthCm)])
    ).get();
    
    return entries.map(_mapToEntryDomain).toList();
  }
  
  @override
  Future<List<CompetitionEntry>> getEntriesByCategory(int categoryId) async {
    final entries = await (_db.select(_db.competitionEntries)
      ..where((tbl) => tbl.categoryId.equals(categoryId))
      ..orderBy([(tbl) => OrderingTerm.desc(tbl.lengthCm)])
    ).get();
    
    return entries.map(_mapToEntryDomain).toList();
  }
  
  @override
  Future<CompetitionEntry?> getEntryById(int id) async {
    final entry = await (_db.select(_db.competitionEntries)..where((tbl) => tbl.id.equals(id))).getSingleOrNull();
    
    if (entry == null) return null;
    
    return _mapToEntryDomain(entry);
  }
  
  @override
  Future<CompetitionEntry> createEntry(CompetitionEntry entry) async {
    final now = DateTime.now().toIso8601String();
    
    // 计算验证状态
    final verificationStatus = entry.verificationStatus;
    final verificationCount = entry.verificationCount;
    final challengeCount = entry.challengeCount;
    
    final row = CompetitionEntriesCompanion.insert(
      competitionId: entry.competitionId,
      categoryId: entry.categoryId,
      participantName: entry.participantName,
      catchLogId: Value(entry.catchLogId),
      lengthCm: entry.lengthCm,
      weightG: Value(entry.weightG),
      location: entry.location,
      fishingMethod: entry.fishingMethod.name,
      county: entry.county,
      fishPhotoPath: Value(entry.fishPhotoPath),
      measurementPhotoPath: Value(entry.measurementPhotoPath),
      environmentVideoPath: Value(entry.environmentVideoPath),
      isVerified: verificationStatus == VerificationStatus.verified,
      verificationCount: verificationCount,
      challengeCount: challengeCount,
      verificationNotes: Value(entry.verificationNotes),
      baitUsed: Value(entry.baitUsed),
      gearUsed: Value(entry.gearUsed),
      weatherCondition: Value(entry.weatherCondition),
      tideCondition: Value(entry.tideCondition),
      catchTime: Value(entry.catchTime),
      catchDate: entry.catchDate.toIso8601String(),
      createdAt: now,
    );
    
    final id = await _db.into(_db.competitionEntries).insert(row);
    
    return entry.copyWith(id: id);
  }
  
  @override
  Future<void> updateEntry(CompetitionEntry entry) async {
    await (_db.update(_db.competitionEntries)..where((tbl) => tbl.id.equals(entry.id))).write(
      CompetitionEntriesCompanion(
        lengthCm: Value(entry.lengthCm),
        weightG: Value(entry.weightG),
        location: Value(entry.location),
        fishingMethod: Value(entry.fishingMethod.name),
        county: Value(entry.county),
        fishPhotoPath: Value(entry.fishPhotoPath),
        measurementPhotoPath: Value(entry.measurementPhotoPath),
        environmentVideoPath: Value(entry.environmentVideoPath),
        isVerified: Value(entry.verificationStatus == VerificationStatus.verified),
        verificationCount: Value(entry.verificationCount),
        challengeCount: Value(entry.challengeCount),
        verificationNotes: Value(entry.verificationNotes),
        baitUsed: Value(entry.baitUsed),
        gearUsed: Value(entry.gearUsed),
        weatherCondition: Value(entry.weatherCondition),
        tideCondition: Value(entry.tideCondition),
        catchTime: Value(entry.catchTime),
      ),
    );
  }
  
  @override
  Future<void> deleteEntry(int id) async {
    await (_db.delete(_db.competitionEntries)..where((tbl) => tbl.id.equals(id))).go();
  }
  
  @override
  Future<void> verifyEntry(int entryId, String notes) async {
    final entry = await getEntryById(entryId);
    if (entry == null) return;
    
    await (_db.update(_db.competitionEntries)..where((tbl) => tbl.id.equals(entryId))).write(
      CompetitionEntriesCompanion(
        isVerified: const Value(true),
        verificationCount: Value(entry.verificationCount + 1),
        verificationNotes: Value(notes),
      ),
    );
  }
  
  @override
  Future<void> challengeEntry(int entryId, String reason) async {
    final entry = await getEntryById(entryId);
    if (entry == null) return;
    
    await (_db.update(_db.competitionEntries)..where((tbl) => tbl.id.equals(entryId))).write(
      CompetitionEntriesCompanion(
        isVerified: const Value(false),
        challengeCount: Value(entry.challengeCount + 1),
        verificationNotes: Value(reason),
      ),
    );
  }
  
  @override
  Future<void> resolveChallenge(int entryId, bool isValid, String notes) async {
    if (isValid) {
      await verifyEntry(entryId, notes);
    } else {
      await deleteEntry(entryId);
    }
  }
  
  @override
  Future<List<LeaderboardEntry>> getLeaderboardByCategory(int categoryId) async {
    final entries = await getEntriesByCategory(categoryId);
    
    // 根据比赛规则排序：长度优先，等长比重量
    entries.sort((a, b) {
      final lengthDiff = b.lengthCm.compareTo(a.lengthCm);
      if (lengthDiff != 0) return lengthDiff;
      
      if (a.weightG != null && b.weightG != null) {
        return b.weightG!.compareTo(a.weightG!);
      }
      
      return 0;
    });
    
    return entries.map((entry) {
      // 计算综合评分：长度 * 100 + 重量（如果存在）
      final score = entry.lengthCm * 100 + (entry.weightG ?? 0);
      
      return LeaderboardEntry(
        participantName: entry.participantName,
        location: entry.location,
        lengthCm: entry.lengthCm,
        weightG: entry.weightG,
        county: entry.county,
        catchDate: entry.catchDate,
        verificationStatus: entry.verificationStatus,
        verificationCount: entry.verificationCount,
        challengeCount: entry.challengeCount,
        score: score,
      );
    }).toList();
  }
  
  @override
  Future<CompetitionStats> getCompetitionStats(int competitionId) async {
    final entries = await getEntriesByCompetition(competitionId);
    
    // 统计参赛者
    final participantNames = entries.map((e) => e.participantName).toSet();
    
    // 按验证状态统计
    final verifiedEntries = entries.where((e) => e.verificationStatus == VerificationStatus.verified).length;
    final challengedEntries = entries.where((e) => e.verificationStatus == VerificationStatus.challenged).length;
    
    // 按区域统计
    final countyMap = <String, int>{};
    for (final entry in entries) {
      countyMap[entry.county] = (countyMap[entry.county] ?? 0) + 1;
    }
    
    // 按钓法统计
    final methodMap = <String, int>{};
    for (final entry in entries) {
      methodMap[entry.fishingMethod.name] = (methodMap[entry.fishingMethod.name] ?? 0) + 1;
    }
    
    // 获取前10名（按类别分组）
    final topEntries = <LeaderboardEntry>[];
    final categories = await getCategoriesByCompetition(competitionId);
    
    for (final category in categories) {
      final leaderboard = await getLeaderboardByCategory(category.id);
      if (leaderboard.isNotEmpty) {
        topEntries.add(leaderboard.first);
      }
    }
    
    return CompetitionStats(
      totalEntries: entries.length,
      totalParticipants: participantNames.length,
      verifiedEntries: verifiedEntries,
      challengedEntries: challengedEntries,
      entriesByCounty: countyMap,
      entriesByMethod: methodMap,
      topEntries: topEntries,
    );
  }
  
  @override
  Future<List<CompetitionPrize>> getPrizesByCompetition(int competitionId) async {
    final prizes = await (_db.select(_db.competitionPrizes)
      ..where((tbl) => tbl.competitionId.equals(competitionId))
      ..orderBy([(tbl) => OrderingTerm(expression: tbl.rank.nullable())])
    ).get();
    
    return prizes.map((row) {
      return CompetitionPrize(
        id: row.id,
        competitionId: row.competitionId,
        categoryId: row.categoryId,
        prizeName: row.prizeName,
        rank: row.rank,
        sponsor: row.sponsor,
        description: row.description,
        createdAt: DateTime.parse(row.createdAt),
      );
    }).toList();
  }
  
  @override
  Future<CompetitionPrize?> getPrizeById(int id) async {
    final prize = await (_db.select(_db.competitionPrizes)..where((tbl) => tbl.id.equals(id))).getSingleOrNull();
    
    if (prize == null) return null;
    
    return CompetitionPrize(
      id: prize.id,
      competitionId: prize.competitionId,
      categoryId: prize.categoryId,
      prizeName: prize.prizeName,
      rank: prize.rank,
      sponsor: prize.sponsor,
      description: prize.description,
      createdAt: DateTime.parse(prize.createdAt),
    );
  }
  
  @override
  Future<CompetitionPrize> createPrize(CompetitionPrize prize) async {
    final now = DateTime.now().toIso8601String();
    
    final row = CompetitionPrizesCompanion.insert(
      competitionId: prize.competitionId,
      categoryId: Value(prize.categoryId),
      prizeName: prize.prizeName,
      rank: Value(prize.rank),
      sponsor: Value(prize.sponsor),
      description: Value(prize.description),
      createdAt: now,
    );
    
    final id = await _db.into(_db.competitionPrizes).insert(row);
    
    return prize.copyWith(id: id);
  }
  
  @override
  Future<void> assignPrize(int prizeId, int entryId, String winnerName) async {
    final now = DateTime.now().toIso8601String();
    
    await _db.into(_db.prizeWinners).insert(
      PrizeWinnersCompanion.insert(
        prizeId: prizeId,
        entryId: Value(entryId),
        winnerName: winnerName,
        isRaffle: false,
        isDistributed: false,
        createdAt: now,
      ),
    );
  }
  
  @override
  Future<void> createWeeklyDraw(int competitionId, String drawName, DateTime drawDate) async {
    final now = DateTime.now().toIso8601String();
    
    await _db.into(_db.weeklyDraws).insert(
      WeeklyDrawsCompanion.insert(
        competitionId: competitionId,
        drawName: drawName,
        drawDate: drawDate.toIso8601String(),
        isDrawn: false,
        createdAt: now,
      ),
    );
  }
  
  @override
  Future<void> drawWinner(int drawId, int entryId, String winnerName) async {
    await (_db.update(_db.weeklyDraws)..where((tbl) => tbl.id.equals(drawId))).write(
      WeeklyDrawsCompanion(
        entryId: Value(entryId),
        winnerName: Value(winnerName),
        isDrawn: const Value(true),
      ),
    );
  }
  
  // ============================================================
  // 辅助方法
  // ============================================================
  
  CompetitionEntry _mapToEntryDomain(CompetitionEntriesRow row) {
    final verificationStatus = row.isVerified 
      ? VerificationStatus.verified
      : row.challengeCount > 0 
        ? VerificationStatus.challenged 
        : VerificationStatus.pending;
    
    FishingMethod fishingMethod;
    try {
      fishingMethod = FishingMethod.values.firstWhere(
        (method) => method.name == row.fishingMethod,
        orElse: () => FishingMethod.shore,
      );
    } catch (_) {
      fishingMethod = FishingMethod.shore;
    }
    
    return CompetitionEntry(
      id: row.id,
      competitionId: row.competitionId,
      categoryId: row.categoryId,
      participantName: row.participantName,
      catchLogId: row.catchLogId,
      lengthCm: row.lengthCm,
      weightG: row.weightG,
      location: row.location,
      fishingMethod: fishingMethod,
      county: row.county,
      fishPhotoPath: row.fishPhotoPath,
      measurementPhotoPath: row.measurementPhotoPath,
      environmentVideoPath: row.environmentVideoPath,
      verificationStatus: verificationStatus,
      verificationCount: row.verificationCount,
      challengeCount: row.challengeCount,
      verificationNotes: row.verificationNotes,
      baitUsed: row.baitUsed,
      gearUsed: row.gearUsed,
      weatherCondition: row.weatherCondition,
      tideCondition: row.tideCondition,
      catchTime: row.catchTime,
      catchDate: DateTime.parse(row.catchDate),
      createdAt: DateTime.parse(row.createdAt),
    );
  }
  
  CompetitionStatus _determineCompetitionStatus(DateTime startDate, DateTime endDate) {
    final now = DateTime.now();
    
    if (now.isBefore(startDate)) {
      return CompetitionStatus.upcoming;
    } else if (now.isAfter(endDate)) {
      return CompetitionStatus.ended;
    } else {
      return CompetitionStatus.active;
    }
  }
}

/// 获取Repository实例
CompetitionRepository get competitionRepository => CompetitionRepositoryImpl();