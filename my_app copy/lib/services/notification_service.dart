import 'dart:convert';
import 'dart:io' show Platform;
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:async';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  WebSocketChannel? _channel;
  final _flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();
  Function(Map<String, dynamic>)? onNewOrder;
  bool _isConnecting = false;
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 3;
  bool _disposed = false;
  Timer? _reconnectTimer;

  Future<void> initialize() async {
    // Initialize local notifications
    const initializationSettingsAndroid = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initializationSettingsIOS = DarwinInitializationSettings();
    const initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
      iOS: initializationSettingsIOS,
    );

    await _flutterLocalNotificationsPlugin.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (details) {
        // Handle notification tap
      },
    );
  }

  Future<void> connectToWebSocket() async {
    if (_isConnecting || _disposed) return;
    _isConnecting = true;

    try {
      // Close existing connection if any
      await _channel?.sink.close();
      _channel = null;

      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      final userId = prefs.getString('userId');

      if (token == null || userId == null || _disposed) {
        _isConnecting = false;
        return;
      }

      final wsUrl = kIsWeb 
          ? 'wss://your-backend-url.com/ws'  // Update with your secure WebSocket URL
          : Platform.isAndroid
              ? 'ws://10.0.2.2:5000/ws'
              : 'ws://localhost:5000/ws';

      final uri = Uri.parse('$wsUrl?token=$token&userId=$userId');
      print('Connecting to WebSocket: $uri');

      _channel = WebSocketChannel.connect(uri);
      _reconnectAttempts = 0;
      print('WebSocket connected');

      _channel?.stream.listen(
        _handleWebSocketMessage,
        onError: _handleDisconnect,
        onDone: _handleDisconnect,
        cancelOnError: true,
      );
    } catch (e) {
      print('Error connecting to WebSocket: $e');
      _handleDisconnect();
    } finally {
      _isConnecting = false;
    }
  }

  void _handleWebSocketMessage(dynamic message) {
    try {
      final data = jsonDecode(message);
      if (data['type'] == 'NEW_ORDER') {
        _showNotification(
          'New Order',
          'You have received a new order!',
          data,
        );
        onNewOrder?.call(data);
      }
    } catch (e) {
      print('Error handling WebSocket message: $e');
    }
  }

  Future<void> _showNotification(
    String title,
    String body,
    Map<String, dynamic> payload,
  ) async {
    const androidDetails = AndroidNotificationDetails(
      'restaurant_orders',
      'Restaurant Orders',
      channelDescription: 'Notifications for new restaurant orders',
      importance: Importance.max,
      priority: Priority.high,
    );

    const iosDetails = DarwinNotificationDetails();

    const notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _flutterLocalNotificationsPlugin.show(
      0,
      title,
      body,
      notificationDetails,
      payload: jsonEncode(payload),
    );
  }

  void _handleDisconnect() {
    if (_disposed) return;
    
    _reconnectTimer?.cancel();
    if (_reconnectAttempts < _maxReconnectAttempts) {
      _reconnectAttempts++;
      print('Reconnection attempt $_reconnectAttempts of $_maxReconnectAttempts');
      _reconnectTimer = Timer(const Duration(seconds: 5), connectToWebSocket);
    } else {
      print('Max reconnection attempts reached');
    }
  }

  void dispose() {
    _disposed = true;
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _channel = null;
    _isConnecting = false;
    _reconnectAttempts = 0;
  }
} 