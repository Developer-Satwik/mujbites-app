import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

class ApiService {
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:5000/api';  // For web
    } else if (Platform.isAndroid) {
      return 'http://10.0.2.2:5000/api';   // For Android emulator
    } else if (Platform.isIOS) {
      return 'http://localhost:5000/api';   // For iOS simulator
    } else {
      return 'http://localhost:5000/api';   // Default fallback
    }
  }

  Uri getUri(String path) {
    final uri = Uri.parse('$baseUrl$path');
    print('Making request to: $uri');
    return uri;
  }

  Future<Map<String, dynamic>> login(String mobileNumber, String password) async {
    try {
      print('Attempting login for mobile: $mobileNumber');
      
      final response = await http.post(
        getUri('/users/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'mobileNumber': mobileNumber,
          'password': password,
        }),
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () => throw TimeoutException('Connection timed out'),
      );

      print('Login response status: ${response.statusCode}');
      print('Raw login response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('Parsed login data: $data');

        // Match backend response structure exactly
        if (!data.containsKey('success') || 
            !data.containsKey('token') || 
            !data.containsKey('user') || 
            !data.containsKey('message')) {
          throw Exception('Invalid response format');
        }

        final user = data['user'] as Map<String, dynamic>;
        // Match the exact fields from backend
        if (!user.containsKey('_id') || 
            !user.containsKey('username') || 
            !user.containsKey('role') || 
            !user.containsKey('mobileNumber')) {
          throw Exception('Missing required user data');
        }

        // Store credentials exactly as received from backend
        final prefs = await SharedPreferences.getInstance();
        await prefs.clear();

        final userId = user['_id'].toString();
        final token = data['token'].toString();
        final role = user['role'].toString();

        print('Storing credentials from backend:');
        print('userId: "$userId"');
        print('token: "${token.substring(0, 10)}..."'); // First 10 chars for security
        print('role: "$role"');

        // Store in the exact format received
        await Future.wait([
          prefs.setString('userId', userId),
          prefs.setString('token', token),
          prefs.setString('role', role),
          prefs.setBool('isLoggedIn', true),
        ]);

        // Verify storage matches backend data
        final storedUserId = prefs.getString('userId');
        final storedToken = prefs.getString('token');
        final storedRole = prefs.getString('role');

        print('Verifying stored credentials:');
        print('stored userId: "$storedUserId"');
        print('stored token exists: ${storedToken != null}');
        print('stored role: "$storedRole"');

        if (storedUserId != userId || 
            storedToken != token || 
            storedRole != role) {
          throw Exception('Stored credentials do not match backend data');
        }

        return data;
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['message'] ?? 'Login failed');
      }
    } catch (e) {
      print('Login error: $e');
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();
      rethrow;
    }
  }

  Future<void> _storeCredentials(Map<String, dynamic> data) async {
    try {
      final user = data['user'] as Map<String, dynamic>;
      final userId = user['_id'] as String;
      final token = data['token'] as String;
      final role = user['role'] as String;

      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();

      await Future.wait([
        prefs.setString('userId', userId),
        prefs.setString('token', token),
        prefs.setString('role', role),
        prefs.setBool('isLoggedIn', true),
      ]);

      // Verify storage
      final storedUserId = prefs.getString('userId');
      if (storedUserId != userId) {
        throw Exception('Failed to store credentials');
      }
    } catch (e) {
      print('Error storing credentials: $e');
      throw Exception('Failed to store login credentials');
    }
  }

  Future<void> _clearCredentials() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();
      print('Credentials cleared');
    } catch (e) {
      print('Error clearing credentials: $e');
    }
  }

  Future<bool> hasValidCredentials() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      final userId = prefs.getString('userId');
      final token = prefs.getString('token');
      final role = prefs.getString('role');
      final isLoggedIn = prefs.getBool('isLoggedIn') ?? false;

      print('Validating stored credentials:');
      print('userId: "$userId"');
      print('token exists: ${token != null}');
      print('role: "$role"');
      print('isLoggedIn: $isLoggedIn');

      // Match backend validation requirements
      if (!isLoggedIn) {
        print('Not logged in');
        await prefs.clear();
        return false;
      }

      // Validate userId format (MongoDB ObjectId)
      if (userId == null || userId.isEmpty || !RegExp(r'^[0-9a-fA-F]{24}$').hasMatch(userId)) {
        print('Invalid userId format: $userId');
        await prefs.clear();
        return false;
      }

      // Validate JWT token format
      if (token == null || token.isEmpty || !token.contains('.')) {
        print('Invalid token format');
        await prefs.clear();
        return false;
      }

      // Validate role matches backend roles
      if (role == null || !['user', 'restaurant', 'admin'].contains(role)) {
        print('Invalid role: $role');
        await prefs.clear();
        return false;
      }

      print('All credentials valid');
      return true;
    } catch (e) {
      print('Error validating credentials: $e');
      return false;
    }
  }

  Future<void> logout() async {
    await _clearCredentials();
  }

  Future<void> debugCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    final userId = prefs.getString('userId');
    final token = prefs.getString('token');
    final role = prefs.getString('role');
    final isLoggedIn = prefs.getBool('isLoggedIn');

    print('\n=== Stored Credentials Debug ===');
    print('userId: "$userId"');
    print('token exists: ${token != null}');
    print('token length: ${token?.length ?? 0}');
    print('role: "$role"');
    print('isLoggedIn: $isLoggedIn');
    print('==============================\n');
  }

  Future<void> debugStoredCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    
    print('\n=== Stored Credentials Debug ===');
    print('userId: "${prefs.getString('userId')}"');
    print('token exists: ${prefs.getString('token') != null}');
    print('role: "${prefs.getString('role')}"');
    print('isLoggedIn: ${prefs.getBool('isLoggedIn')}');
    print('===============================\n');
  }

  Future<bool> verifyToken() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      
      if (token == null) return false;

      final response = await http.get(
        getUri('/users/verify-token'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Token verification error: $e');
      return false;
    }
  }
} 