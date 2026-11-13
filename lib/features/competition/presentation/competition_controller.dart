import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:go_casting/features/competition/data/competition_repository.dart';
import 'package:go_casting/features/competition/domain/competition_models.dart';

/// 比赛控制器
class CompetitionController extends GetxController {
  final CompetitionRepository _repository = competitionRepository;
  
  // 状态变量
  final competitions = RxList<Competition>([]);
  final currentCompetition = Rx<Competition?>(null);
  final competitionCategories = RxList<CompetitionCategory>([]);
  final competitionEntries = RxList<CompetitionEntry>([]);
  final leaderboardEntries = RxList<LeaderboardEntry>([]);
  final competitionPrizes = RxList<CompetitionPrize>([]);
  final competitionStats = Rx<CompetitionStats?>(null);
  
  final isLoading = RxBool(false);
  final error = RxString('');
  
  // 筛选状态
  final selectedCategoryId = RxInt(-1);
  final selectedCounty = RxString('全部');
  final selectedVerificationStatus = Rx<VerificationStatus?>(null);
  
  // 创建比赛表单
  final competitionName = RxString('');
  final competitionDescription = RxString('');
  final startDate = Rx<DateTime?>(null);
  final endDate = Rx<DateTime?>(null);
  
  // 创建参赛记录表单
  final participantName = RxString('');
  final lengthCm = RxDouble(0.0);
  final weightG = Rx<double?>(null);
  final location = RxString('');
  final selectedFishingMethod = Rx<FishingMethod>(FishingMethod.shore);
  final selectedCountyForm = RxString('厦门');
  final fishPhotoPath = RxString('');
  final measurementPhotoPath = RxString('');
  final environmentVideoPath = RxString('');
  final baitUsed = RxString('');
  final gearUsed = RxString('');
  final weatherCondition = RxString('');
  final tideCondition = RxString('');
  final catchTime = RxString('');
  
  @override
  void onInit() {
    super.onInit();
    // 自动加载当前活跃的比赛
    loadCompetitions();
    
    // 监听比赛变化
    ever(currentCompetition, (_) {
      if (currentCompetition.value != null) {
        loadCompetitionData(currentCompetition.value!.id);
      }
    });
  }
  
  /// 加载所有比赛
  Future<void> loadCompetitions() async {
    try {
      isLoading.value = true;
      error.value = '';
      
      final loadedCompetitions = await _repository.getAllCompetitions();
      competitions.value = loadedCompetitions;
      
      // 设置当前比赛（优先活跃的比赛）
      final activeCompetition = loadedCompetitions.firstWhereOrNull(
        (comp) => comp.status == CompetitionStatus.active,
      );
      
      currentCompetition.value = activeCompetition ?? loadedCompetitions.firstOrNull;
      
    } catch (e) {
      error.value = '加载比赛失败: $e';
      debugPrint('加载比赛失败: $e');
    } finally {
      isLoading.value = false;
    }
  }
  
  /// 加载比赛相关数据
  Future<void> loadCompetitionData(int competitionId) async {
    try {
      isLoading.value = true;
      error.value = '';
      
      await Future.wait([
        loadCategories(competitionId),
        loadEntries(competitionId),
        loadPrizes(competitionId),
        loadStats(competitionId),
      ]);
      
    } catch (e) {
      error.value = '加载比赛数据失败: $e';
      debugPrint('加载比赛数据失败: $e');
    } finally {
      isLoading.value = false;
    }
  }
  
  /// 加载比赛类别
  Future<void> loadCategories(int competitionId) async {
    try {
      final categories = await _repository.getCategoriesByCompetition(competitionId);
      competitionCategories.value = categories;
      
      // 默认选择第一个类别
      if (categories.isNotEmpty) {
        selectedCategoryId.value = categories.first.id;
      }
      
    } catch (e) {
      error.value = '加载比赛类别失败: $e';
      debugPrint('加载比赛类别失败: $e');
    }
  }
  
  /// 加载参赛记录
  Future<void> loadEntries(int competitionId) async {
    try {
      final entries = await _repository.getEntriesByCompetition(competitionId);
      competitionEntries.value = entries;
      
      // 加载当前类别的排行榜
      if (selectedCategoryId.value != -1) {
        await loadLeaderboard(selectedCategoryId.value);
      }
      
    } catch (e) {
      error.value = '加载参赛记录失败: $e';
      debugPrint('加载参赛记录失败: $e');
    }
  }
  
  /// 加载排行榜
  Future<void> loadLeaderboard(int categoryId) async {
    try {
      final leaderboard = await _repository.getLeaderboardByCategory(categoryId);
      leaderboardEntries.value = leaderboard;
    } catch (e) {
      error.value = '加载排行榜失败: $e';
      debugPrint('加载排行榜失败: $e');
    }
  }
  
  /// 加载奖品列表
  Future<void> loadPrizes(int competitionId) async {
    try {
      final prizes = await _repository.getPrizesByCompetition(competitionId);
      competitionPrizes.value = prizes;
    } catch (e) {
      error.value = '加载奖品列表失败: $e';
      debugPrint('加载奖品列表失败: $e');
    }
  }
  
  /// 加载统计信息
  Future<void> loadStats(int competitionId) async {
    try {
      final stats = await _repository.getCompetitionStats(competitionId);
      competitionStats.value = stats;
    } catch (e) {
      error.value = '加载统计信息失败: $e';
      debugPrint('加载统计信息失败: $e');
    }
  }
  
  /// 创建新比赛
  Future<bool> createNewCompetition() async {
    try {
      if (competitionName.value.isEmpty || 
          competitionDescription.value.isEmpty ||
          startDate.value == null || 
          endDate.value == null) {
        error.value = '请填写完整的比赛信息';
        return false;
      }
      
      if (endDate.value!.isBefore(startDate.value!)) {
        error.value = '结束日期不能早于开始日期';
        return false;
      }
      
      isLoading.value = true;
      error.value = '';
      
      final newCompetition = Competition(
        id: 0,
        name: competitionName.value,
        description: competitionDescription.value,
        startDate: startDate.value!,
        endDate: endDate.value!,
        status: CompetitionStatus.upcoming,
        createdAt: DateTime.now(),
      );
      
      final created = await _repository.createCompetition(newCompetition);
      
      // 重置表单
      clearCompetitionForm();
      
      // 重新加载比赛列表
      await loadCompetitions();
      
      // 设置当前比赛为新创建的比赛
      currentCompetition.value = created;
      
      Get.snackbar('成功', '比赛创建成功');
      return true;
      
    } catch (e) {
      error.value = '创建比赛失败: $e';
      debugPrint('创建比赛失败: $e');
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  
  /// 提交参赛记录
  Future<bool> submitCompetitionEntry() async {
    try {
      if (currentCompetition.value == null) {
        error.value = '请先选择比赛';
        return false;
      }
      
      if (selectedCategoryId.value == -1) {
        error.value = '请选择比赛类别';
        return false;
      }
      
      if (participantName.value.isEmpty) {
        error.value = '请输入参赛者昵称';
        return false;
      }
      
      if (lengthCm.value <= 0) {
        error.value = '请输入有效的长度';
        return false;
      }
      
      if (location.value.isEmpty) {
        error.value = '请输入钓点位置';
        return false;
      }
      
      // 获取当前选择的类别
      final category = competitionCategories.firstWhereOrNull(
        (cat) => cat.id == selectedCategoryId.value,
      );
      
      if (category == null) {
        error.value = '比赛类别不存在';
        return false;
      }
      
      // 检查是否符合上榜条件
      if (category.minLengthCm != null && lengthCm.value < category.minLengthCm!) {
        error.value = '长度未达到上榜要求 (${category.minLengthCm}cm)';
        return false;
      }
      
      if (category.minWeightG != null && (weightG.value == null || weightG.value! < category.minWeightG!)) {
        error.value = '重量未达到上榜要求 (${category.minWeightG}g)';
        return false;
      }
      
      // 检查特殊规则（巨物猎手）
      if (category.categoryName == '巨物猎手') {
        // 长度优先：如果长度超过60cm，重量需要超过3斤（约1360g）
        if (lengthCm.value >= 60.0 && (weightG.value == null || weightG.value! < 1360.0)) {
          error.value = '长度超过60cm时，重量需要达到3斤以上';
          return false;
        }
        
        // 如果重量超过3斤，长度需要超过60cm
        if (weightG.value != null && weightG.value! >= 1360.0 && lengthCm.value < 60.0) {
          error.value = '重量达到3斤以上时，长度需要超过60cm';
          return false;
        }
      }
      
      isLoading.value = true;
      error.value = '';
      
      final newEntry = CompetitionEntry(
        id: 0,
        competitionId: currentCompetition.value!.id,
        categoryId: selectedCategoryId.value,
        participantName: participantName.value,
        catchLogId: null,
        lengthCm: lengthCm.value,
        weightG: weightG.value,
        location: location.value,
        fishingMethod: selectedFishingMethod.value,
        county: selectedCountyForm.value,
        fishPhotoPath: fishPhotoPath.value,
        measurementPhotoPath: measurementPhotoPath.value,
        environmentVideoPath: environmentVideoPath.value,
        verificationStatus: VerificationStatus.pending,
        verificationCount: 0,
        challengeCount: 0,
        verificationNotes: null,
        baitUsed: baitUsed.value.isEmpty ? null : baitUsed.value,
        gearUsed: gearUsed.value.isEmpty ? null : gearUsed.value,
        weatherCondition: weatherCondition.value.isEmpty ? null : weatherCondition.value,
        tideCondition: tideCondition.value.isEmpty ? null : tideCondition.value,
        catchTime: catchTime.value.isEmpty ? null : catchTime.value,
        catchDate: DateTime.now(),
        createdAt: DateTime.now(),
      );
      
      final created = await _repository.createEntry(newEntry);
      
      // 重置表单
      clearEntryForm();
      
      // 重新加载数据
      await loadCompetitionData(currentCompetition.value!.id);
      
      Get.snackbar('成功', '参赛记录提交成功');
      return true;
      
    } catch (e) {
      error.value = '提交参赛记录失败: $e';
      debugPrint('提交参赛记录失败: $e');
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  
  /// 验证参赛记录
  Future<bool> verifyEntry(int entryId, String notes) async {
    try {
      isLoading.value = true;
      error.value = '';
      
      await _repository.verifyEntry(entryId, notes);
      
      // 重新加载数据
      if (currentCompetition.value != null) {
        await loadCompetitionData(currentCompetition.value!.id);
      }
      
      Get.snackbar('成功', '验证成功');
      return true;
      
    } catch (e) {
      error.value = '验证失败: $e';
      debugPrint('验证失败: $e');
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  
  /// 质疑参赛记录
  Future<bool> challengeEntry(int entryId, String reason) async {
    try {
      isLoading.value = true;
      error.value = '';
      
      await _repository.challengeEntry(entryId, reason);
      
      // 重新加载数据
      if (currentCompetition.value != null) {
        await loadCompetitionData(currentCompetition.value!.id);
      }
      
      Get.snackbar('已质疑', '已提交质疑，等待处理');
      return true;
      
    } catch (e) {
      error.value = '质疑失败: $e';
      debugPrint('质疑失败: $e');
      return false;
    } finally {
      isLoading.value = false;
    }
  }
  
  /// 切换比赛
  void switchCompetition(Competition competition) {
    currentCompetition.value = competition;
    clearFilters();
  }
  
  /// 切换类别
  void switchCategory(int categoryId) {
    selectedCategoryId.value = categoryId;
    loadLeaderboard(categoryId);
    _filterEntries();
  }
  
  /// 切换区域筛选
  void switchCounty(String county) {
    selectedCounty.value = county;
    _filterEntries();
  }
  
  /// 切换验证状态筛选
  void switchVerificationStatus(VerificationStatus? status) {
    selectedVerificationStatus.value = status;
    _filterEntries();
  }
  
  /// 筛选参赛记录
  void _filterEntries() {
    // 这个方法是私有的，通过公共方法触发
    // 实际筛选逻辑在UI层处理，控制器只提供筛选条件
  }
  
  /// 获取筛选后的参赛记录
  List<CompetitionEntry> getFilteredEntries() {
    return competitionEntries.where((entry) {
      // 按类别筛选
      if (selectedCategoryId.value != -1 && entry.categoryId != selectedCategoryId.value) {
        return false;
      }
      
      // 按区域筛选
      if (selectedCounty.value != '全部' && entry.county != selectedCounty.value) {
        return false;
      }
      
      // 按验证状态筛选
      if (selectedVerificationStatus.value != null && 
          entry.verificationStatus != selectedVerificationStatus.value) {
        return false;
      }
      
      return true;
    }).toList();
  }
  
  /// 获取当前类别的排行榜
  List<LeaderboardEntry> getCurrentLeaderboard() {
    return leaderboardEntries;
  }
  
  /// 获取当前类别的奖品
  List<CompetitionPrize> getCurrentPrizes() {
    if (selectedCategoryId.value == -1) {
      return competitionPrizes.where((prize) => prize.categoryId == null).toList();
    }
    
    return competitionPrizes.where((prize) => 
      prize.categoryId == null || prize.categoryId == selectedCategoryId.value
    ).toList();
  }
  
  /// 重置比赛表单
  void clearCompetitionForm() {
    competitionName.value = '';
    competitionDescription.value = '';
    startDate.value = null;
    endDate.value = null;
  }
  
  /// 重置参赛记录表单
  void clearEntryForm() {
    participantName.value = '';
    lengthCm.value = 0.0;
    weightG.value = null;
    location.value = '';
    selectedFishingMethod.value = FishingMethod.shore;
    selectedCountyForm.value = '厦门';
    fishPhotoPath.value = '';
    measurementPhotoPath.value = '';
    environmentVideoPath.value = '';
    baitUsed.value = '';
    gearUsed.value = '';
    weatherCondition.value = '';
    tideCondition.value = '';
    catchTime.value = '';
  }
  
  /// 清空筛选条件
  void clearFilters() {
    selectedCategoryId.value = -1;
    selectedCounty.value = '全部';
    selectedVerificationStatus.value = null;
  }
  
  /// 获取当前比赛的状态描述
  String getCompetitionStatusDescription(CompetitionStatus status) {
    switch (status) {
      case CompetitionStatus.upcoming:
        return '即将开始';
      case CompetitionStatus.active:
        return '进行中';
      case CompetitionStatus.ended:
        return '已结束';
    }
  }
  
  /// 获取钓法描述
  String getFishingMethodDescription(FishingMethod method) {
    switch (method) {
      case FishingMethod.shore:
        return '岸钓/沙滩';
      case FishingMethod.rock:
        return '登礁';
      case FishingMethod.boat:
        return '船钓';
      case FishingMethod.platform:
        return '鱼排';
    }
  }
  
  /// 获取验证状态描述
  String getVerificationStatusDescription(VerificationStatus status) {
    switch (status) {
      case VerificationStatus.pending:
        return '待验证';
      case VerificationStatus.verified:
        return '已验证';
      case VerificationStatus.challenged:
        return '被质疑';
    }
  }
  
  /// 获取验证状态颜色
  Color getVerificationStatusColor(VerificationStatus status) {
    switch (status) {
      case VerificationStatus.pending:
        return Colors.orange;
      case VerificationStatus.verified:
        return Colors.green;
      case VerificationStatus.challenged:
        return Colors.red;
    }
  }
  
  /// 检查是否符合特殊要求（视频等）
  bool checkSpecialRequirements(CompetitionEntry entry, CompetitionCategory category) {
    if (category.categoryName == '黄鳍鲷') {
      // 黄鳍鲷超过30cm需要视频
      return entry.lengthCm >= 30.0 && entry.environmentVideoPath != null;
    } else if (category.categoryName == '沙尖鱼') {
      // 沙尖鱼超过25cm需要视频
      return entry.lengthCm >= 25.0 && entry.environmentVideoPath != null;
    } else if (category.categoryName == '巨物猎手') {
      // 巨物超过60cm或3斤需要视频
      final needsVideo = (entry.lengthCm >= 60.0) || 
                         (entry.weightG != null && entry.weightG! >= 1360.0);
      return needsVideo && entry.environmentVideoPath != null;
    }
    return true;
  }
  
  /// 获取比赛规则提示
  String getCompetitionRules() {
    if (currentCompetition.value == null) return '';
    
    // 这里是您提供的比赛规则
    return '''
比赛规则:
尺寸优先，长者为胜，等长比重量。
分两条线: 黄鳍鲷 和 沙尖鱼

上榜标准:
黄鳍鲷: 25cm 上榜
沙尖鱼: 18cm 上榜
巨物猎手: 一斤上榜（长度优先）

特殊要求:
黄鳍鲷超过 30cm，沙尖鱼超过 25cm，巨物超过 60cm/3斤
需拍活鱼视频和周围环境，拍测量鱼长重量(去容器重量)

钓点范围:
厦门、漳州海域，岸钓/沙滩。登礁，船，鱼排不算
''';
  }
}