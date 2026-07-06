import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'reference_db.dart';
import 'user_db.dart';

/// 参考数据库全局 Provider（只读）
final referenceDatabaseProvider = Provider<ReferenceDatabase>((ref) {
  final db = ReferenceDatabase();
  ref.onDispose(() => db.close());
  return db;
});

/// 用户数据库全局 Provider（可写）
final userDatabaseProvider = Provider<UserDatabase>((ref) {
  final db = UserDatabase();
  ref.onDispose(() => db.close());
  return db;
});
