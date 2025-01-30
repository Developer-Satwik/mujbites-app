import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/material.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _apiService = ApiService();

  Future<Map<String, dynamic>> login(String mobileNumber, String password) async {
    try {
      final response = await _apiService.login(mobileNumber, password);
      
      if (!response['success']) {
        throw Exception(response['message'] ?? 'Login failed');
      }

      final user = response['user'] as Map<String, dynamic>;
      final token = response['token'] as String;

      await _storeCredentials(
        userId: user['_id'],
        token: token,
        role: user['role'],
      );

      return response;
    } catch (e) {
      print('Auth service login error: $e');
      await _clearCredentials();
      rethrow;
    }
  }

  Future<void> _storeCredentials({
    required String userId,
    required String token,
    required String role,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();

    await Future.wait([
      prefs.setString('userId', userId),
      prefs.setString('token', token),
      prefs.setString('role', role),
      prefs.setBool('isLoggedIn', true),
    ]);

    print('Credentials stored:');
    print('userId: $userId');
    print('token exists: ${token.isNotEmpty}');
    print('role: $role');
  }

  Future<void> _clearCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }

  Future<bool> isAuthenticated() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      final userId = prefs.getString('userId');
      
      if (token == null || userId == null) {
        return false;
      }

      // Verify token with backend
      return await _apiService.verifyToken();
    } catch (e) {
      print('Auth check error: $e');
      return false;
    }
  }

  Future<void> logout(BuildContext context) async {
    try {
      await _clearCredentials();
      Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
    } catch (e) {
      print('Logout error: $e');
      rethrow;
    }
  }
} 