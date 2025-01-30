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
    await connectToWebSocket();
  }

  Future<void> connectToWebSocket() async {
    if (_isConnecting) return;
    _isConnecting = true;

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      
      if (token == null) {
        print('No token found for WebSocket connection');
        _isConnecting = false;
        return;
      }

      final wsUrl = Uri.parse('ws://10.0.2.2:5000/ws')
          .replace(queryParameters: {'token': token});

      print('Connecting to WebSocket: $wsUrl');

      _channel = WebSocketChannel.connect(wsUrl);
      
      _channel?.stream.listen(
        (message) {
          try {
            final data = jsonDecode(message);
            if (data['type'] == 'new_order' && onNewOrder != null) {
              onNewOrder!(data);
            }
          } catch (e) {
            print('Error processing WebSocket message: $e');
          }
        },
        onError: (error) {
          print('WebSocket error: $error');
          _scheduleReconnect();
        },
        onDone: () {
          print('WebSocket connection closed');
          _scheduleReconnect();
        },
        cancelOnError: true,
      );

      print('WebSocket connected successfully');
    } catch (e) {
      print('Error connecting to WebSocket: $e');
      _scheduleReconnect();
    } finally {
      _isConnecting = false;
    }
  }

  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 5), () {
      print('Attempting to reconnect WebSocket...');
      connectToWebSocket();
    });
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

  void dispose() {
    _disposed = true;
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _channel = null;
    _isConnecting = false;
    _reconnectAttempts = 0;
  }
} 