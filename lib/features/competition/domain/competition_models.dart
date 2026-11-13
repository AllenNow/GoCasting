import 'package:freezed_annotation/freezed_annotation.dart';

part 'competition_models.freezed.dart';
part 'competition_models.g.dart';

/// 比赛状态
enum CompetitionStatus {
  @JsonValue('upcoming')
  upcoming, // 即将开始
  @JsonValue('active')
  active, // 进行中
  @JsonValue('ended')
  ended, // 已结束
}

/// 钓法类型
enum FishingMethod {
  @JsonValue('shore')
  shore, // 岸钓/沙滩
  @JsonValue('rock')
  rock, // 登礁
  @JsonValue('boat')
  boat, // 船钓
  @JsonValue('platform')
  platform, // 鱼排
}

/// 验证状态
enum VerificationStatus {
  @JsonValue('pending')
  pending, // 待验证
  @JsonValue('verified')
  verified, // 已验证
  @JsonValue('challenged')
  challenged, // 被质疑
}

@freezed
class Competition with _$Competition {
  const factory Competition({
    required int id,
    required String name,
    required String description,
    required DateTime startDate,
    required DateTime endDate,
    required CompetitionStatus status,
    required DateTime createdAt,
  }) = _Competition;

  factory Competition.fromJson(Map<String, dynamic> json) =>
      _$CompetitionFromJson(json);
}

@freezed
class CompetitionCategory with _$CompetitionCategory {
  const factory CompetitionCategory({
    required int id,
    required int competitionId,
    required String categoryName,
    required String fishSpecies,
    double? minLengthCm,
    double? minWeightG,
    String? specialRules,
    required DateTime createdAt,
  }) = _CompetitionCategory;

  factory CompetitionCategory.fromJson(Map<String, dynamic> json) =>
      _$CompetitionCategoryFromJson(json);
}

@freezed
class CompetitionEntry with _$CompetitionEntry {
  const factory CompetitionEntry({
    required int id,
    required int competitionId,
    required int categoryId,
    required String participantName,
    int? catchLogId,
    
    // 测量数据
    required double lengthCm,
    double? weightG,
    required String location,
    required FishingMethod fishingMethod,
    required String county,
    
    // 验证信息
    String? fishPhotoPath,
    String? measurementPhotoPath,
    String? environmentVideoPath,
    required VerificationStatus verificationStatus,
    @Default(0) int verificationCount,
    @Default(0) int challengeCount,
    String? verificationNotes,
    
    // 额外信息
    String? baitUsed,
    String? gearUsed,
    String? weatherCondition,
    String? tideCondition,
    String? catchTime,
    required DateTime catchDate,
    
    required DateTime createdAt,
  }) = _CompetitionEntry;

  factory CompetitionEntry.fromJson(Map<String, dynamic> json) =>
      _$CompetitionEntryFromJson(json);
}

@freezed
class CompetitionPrize with _$CompetitionPrize {
  const factory CompetitionPrize({
    required int id,
    required int competitionId,
    int? categoryId,
    required String prizeName,
    int? rank,
    String? sponsor,
    String? description,
    required DateTime createdAt,
  }) = _CompetitionPrize;

  factory CompetitionPrize.fromJson(Map<String, dynamic> json) =>
      _$CompetitionPrizeFromJson(json);
}

@freezed
class LeaderboardEntry with _$LeaderboardEntry {
  const factory LeaderboardEntry({
    required String participantName,
    required String location,
    required double lengthCm,
    double? weightG,
    required String county,
    required DateTime catchDate,
    required VerificationStatus verificationStatus,
    @Default(0) int verificationCount,
    @Default(0) int challengeCount,
    double? score, // 综合评分（长度优先，等长比重量）
  }) = _LeaderboardEntry;

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) =>
      _$LeaderboardEntryFromJson(json);
}

@freezed
class CompetitionStats with _$CompetitionStats {
  const factory CompetitionStats({
    required int totalEntries,
    required int totalParticipants,
    required int verifiedEntries,
    required int challengedEntries,
    required Map<String, int> entriesByCounty,
    required Map<String, int> entriesByMethod,
    required List<LeaderboardEntry> topEntries,
  }) = _CompetitionStats;

  factory CompetitionStats.fromJson(Map<String, dynamic> json) =>
      _$CompetitionStatsFromJson(json);
}