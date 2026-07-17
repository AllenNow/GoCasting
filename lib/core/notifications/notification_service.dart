import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

/// 本地通知服务
///
/// 管理所有本地通知的初始化、调度和取消。
/// 通知类型：维护提醒、保修到期提醒。
class NotificationService {
  NotificationService._();
  static final instance = NotificationService._();

  final _plugin = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  /// 通知通道 ID
  static const _maintenanceChannelId = 'maintenance_reminders';
  static const _warrantyChannelId = 'warranty_reminders';

  /// 通知 ID 前缀（避免冲突）
  static const _warrantyNotifIdBase = 100000;
  static const _maintenanceNotifIdBase = 200000;

  /// 初始化通知系统
  Future<void> initialize() async {
    if (_initialized) return;

    // 初始化时区数据
    tz.initializeTimeZones();

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    const settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _plugin.initialize(settings);
    _initialized = true;
  }

  /// 请求通知权限（iOS 及 Android 13+）
  Future<bool> requestPermission() async {
    final androidImpl = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (androidImpl != null) {
      final granted = await androidImpl.requestNotificationsPermission();
      return granted ?? false;
    }

    final iosImpl = _plugin.resolvePlatformSpecificImplementation<
        IOSFlutterLocalNotificationsPlugin>();
    if (iosImpl != null) {
      final granted = await iosImpl.requestPermissions(
        alert: true,
        badge: true,
        sound: true,
      );
      return granted ?? false;
    }

    return true;
  }

  /// 调度保修到期提醒
  ///
  /// 在到期前 30 天和 7 天各发一次通知
  Future<void> scheduleWarrantyReminders({
    required int gearId,
    required String gearName,
    required DateTime expiryDate,
  }) async {
    if (!_initialized) await initialize();

    // 取消该装备的旧通知
    await cancelWarrantyReminders(gearId);

    final now = DateTime.now();

    // 30 天前提醒
    final thirtyDaysBefore = expiryDate.subtract(const Duration(days: 30));
    if (thirtyDaysBefore.isAfter(now)) {
      await _scheduleNotification(
        id: _warrantyNotifIdBase + gearId * 2,
        channelId: _warrantyChannelId,
        channelName: 'Warranty Reminders',
        title: 'Warranty Expiring Soon',
        body: '$gearName warranty expires in 30 days (${_formatDate(expiryDate)}). Check if service is needed.',
        scheduledDate: thirtyDaysBefore,
      );
    }

    // 7 天前提醒
    final sevenDaysBefore = expiryDate.subtract(const Duration(days: 7));
    if (sevenDaysBefore.isAfter(now)) {
      await _scheduleNotification(
        id: _warrantyNotifIdBase + gearId * 2 + 1,
        channelId: _warrantyChannelId,
        channelName: 'Warranty Reminders',
        title: 'Warranty Expires in 7 Days!',
        body: '$gearName warranty expires on ${_formatDate(expiryDate)}. Submit any claims now.',
        scheduledDate: sevenDaysBefore,
      );
    }
  }

  /// 取消某装备的保修提醒
  Future<void> cancelWarrantyReminders(int gearId) async {
    await _plugin.cancel(_warrantyNotifIdBase + gearId * 2);
    await _plugin.cancel(_warrantyNotifIdBase + gearId * 2 + 1);
  }

  /// 调度维护提醒
  Future<void> scheduleMaintenanceReminder({
    required int gearId,
    required String gearName,
    required String maintenanceType,
    required String message,
    required DateTime scheduledDate,
  }) async {
    if (!_initialized) await initialize();

    final notifId = _maintenanceNotifIdBase + gearId * 10 + maintenanceType.hashCode.abs() % 10;

    await _scheduleNotification(
      id: notifId,
      channelId: _maintenanceChannelId,
      channelName: 'Maintenance Reminders',
      title: 'Maintenance Due: $gearName',
      body: message,
      scheduledDate: scheduledDate,
    );
  }

  /// 取消所有通知
  Future<void> cancelAll() async {
    await _plugin.cancelAll();
  }

  /// 内部方法：调度一个通知
  Future<void> _scheduleNotification({
    required int id,
    required String channelId,
    required String channelName,
    required String title,
    required String body,
    required DateTime scheduledDate,
  }) async {
    final androidDetails = AndroidNotificationDetails(
      channelId,
      channelName,
      importance: Importance.high,
      priority: Priority.defaultPriority,
    );
    const iosDetails = DarwinNotificationDetails();
    final details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    final tzScheduled = tz.TZDateTime.from(scheduledDate, tz.local);

    await _plugin.zonedSchedule(
      id,
      title,
      body,
      tzScheduled,
      details,
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
    );
  }

  String _formatDate(DateTime date) =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
}
