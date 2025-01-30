import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

class ApiService {
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:5000/api';
    }
    return Platform.isAndroid 
        ? 'http://10.0.2.2:5000/api'
        : 'http://localhost:5000/api';
  }
  
  static Uri getUri(String path) {
    final uri = Uri.parse('$baseUrl$path');
    print('Making request to: $uri');
    return uri;
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Map<String, String> getHeaders([String? token]) {
    final headers = {
      'Content-Type': 'application/json',
    };

    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }

    return headers;
  }

  Future<Map<String, dynamic>> register(String username, String mobileNumber, String password) async {
    try {
      print('Attempting registration...');
      final response = await http.post(
        getUri('/users/register'),
        headers: getHeaders(),
        body: jsonEncode({
          'username': username,
          'mobileNumber': mobileNumber,
          'password': password,
        }),
      ).timeout(const Duration(seconds: 10));

      print('Registration response status: ${response.statusCode}');
      print('Registration response body: ${response.body}');
      if (response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        throw Exception(response.body);
      }
    } on TimeoutException {
      throw Exception('Registration request timed out');
    } catch (e) {
      print('Registration error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> login(String mobileNumber, String password) async {
    try {
      print('Attempting login...');
      final response = await http.post(
        getUri('/users/login'),
        headers: getHeaders(),
        body: jsonEncode({
          'mobileNumber': mobileNumber,
          'password': password,
        }),
      ).timeout(const Duration(seconds: 10));

      print('Login response status: ${response.statusCode}');
      print('Login response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['token'] != null) {
      final prefs = await SharedPreferences.getInstance();
          await prefs.setString('token', data['token']);
          final userRole = data['user']['role']?.toString() ?? '';
          await prefs.setString('userRole', userRole);
          await prefs.setString('userId', data['user']['_id']?.toString() ?? '');
          
          print('Stored user role: $userRole');
          print('Stored user ID: ${data['user']['_id']}');
    }
        return data;
      } else {
        final errorData = jsonDecode(response.body);
        throw Exception(errorData['message'] ?? 'Login failed');
  }
    } on TimeoutException {
      throw Exception('Login request timed out');
    } catch (e) {
      print('Login error: $e');
      rethrow;
}
  }

  Future<List<Map<String, dynamic>>> getAllRestaurants() async {
    try {
      final response = await http.get(
        getUri('/restaurants'),
        headers: await getHeaders(),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.cast<Map<String, dynamic>>();
      } else {
        throw Exception('Failed to load restaurants: ${response.statusCode}');
      }
    } catch (e) {
      print('Error fetching restaurants: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getRestaurantById(String id) async {
    try {
      final response = await http.get(
        getUri('/restaurants/$id'),
        headers: await getHeaders(),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to load restaurant details');
      }
    } catch (e) {
      print('Error fetching restaurant: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getRestaurantByOwnerId(String userId) async {
    try {
      final token = await getToken();
      if (token == null) throw Exception('No authentication token found');

      final prefs = await SharedPreferences.getInstance();
      final userRole = prefs.getString('userRole');
      
      if (userRole != 'restaurant_owner') {
        throw Exception('User is not authorized as restaurant owner');
    }
      final response = await http.get(
        getUri('/restaurants/owner/$userId'),
        headers: getHeaders(token),
      );

      print('Restaurant by owner response status: ${response.statusCode}');
      print('Restaurant by owner response body: ${response.body}');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data == null || (data is Map && data.isEmpty)) {
          throw Exception('No restaurant found for this owner');
      }
        return data;
      } else if (response.statusCode == 401) {
        throw Exception('Not authorized to access restaurant data');
      } else if (response.statusCode == 404) {
        throw Exception('No restaurant found for this owner');
      } else {
        throw Exception('Failed to fetch restaurant: ${response.statusCode}');
      }
    } catch (e) {
      print('Error fetching restaurant: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getRestaurantMenu(String id) async {
    try {
      final response = await http.get(
        getUri('/restaurants/$id/menu'),
        headers: await getHeaders(),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to load restaurant menu');
}
    } catch (e) {
      print('Error fetching menu: $e');
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> getRestaurantOrders(String restaurantId) async {
    try {
      final token = await getToken();
      if (token == null) throw Exception('No authentication token found');

      final response = await http.get(
        getUri('/restaurants/$restaurantId/orders'),
        headers: getHeaders(token),
      );

      print('Orders response status: ${response.statusCode}');
      print('Orders response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) {
          return data.cast<Map<String, dynamic>>();
        } else if (data is Map && data.containsKey('orders')) {
          return (data['orders'] as List).cast<Map<String, dynamic>>();
        }
        throw Exception('Invalid response format');
      } else {
        throw Exception('Failed to fetch orders: ${response.statusCode}');
      }
    } catch (e) {
      print('Error fetching orders: $e');
      rethrow;
    }
  }

  Future<void> updateOrderStatus(String orderId, String status, [String? reason]) async {
    try {
      final token = await getToken();
      if (token == null) throw Exception('No authentication token found');

      String endpoint;
      switch (status) {
        case 'Accepted':
          endpoint = '/orders/$orderId/confirm';
          break;
        case 'Delivered':
          endpoint = '/orders/$orderId/deliver';
          break;
        case 'Cancelled':
          endpoint = '/orders/$orderId/cancel';
          break;
        default:
          throw Exception('Invalid status: $status');
      }

      final response = await http.patch(
        getUri(endpoint),
        headers: getHeaders(token),
        body: reason != null ? jsonEncode({'reason': reason}) : null,
      );

      print('Update order status response: ${response.statusCode}');
      print('Update order status body: ${response.body}');

      if (response.statusCode != 200) {
        throw Exception('Failed to update order status: ${response.statusCode}');
      }
    } catch (e) {
      print('Error updating order status: $e');
      rethrow;
    }
  }

  Future<void> toggleRestaurantStatus(String restaurantId) async {
    try {
      final token = await getToken();
      if (token == null) throw Exception('No authentication token found');

      final response = await http.put(
        getUri('/restaurants/$restaurantId/toggle-status'),
        headers: getHeaders(token),
      );

      print('Toggle status response: ${response.statusCode}');
      print('Toggle status body: ${response.body}');

      if (response.statusCode != 200) {
        throw Exception('Failed to toggle restaurant status');
      }
    } catch (e) {
      print('Error toggling restaurant status: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getUserProfile() async {
    try {
      final token = await getToken();
      if (token == null) throw Exception('No authentication token found');

      final response = await http.get(
        getUri('/users/profile'),
        headers: getHeaders(token),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to load profile');
      }
    } catch (e) {
      print('Error fetching profile: $e');
      rethrow;
    }
  }

  Future<void> updateProfile({
    String? address,
    String? oldPassword,
    String? newPassword,
  }) async {
    try {
      final token = await getToken();
      if (token == null) throw Exception('No authentication token found');

      final Map<String, dynamic> body = {
        if (address != null) 'address': address,
        if (oldPassword != null) 'oldPassword': oldPassword,
        if (newPassword != null) 'newPassword': newPassword,
      };

      final response = await http.put(
        getUri('/users/profile'),
        headers: getHeaders(token),
        body: jsonEncode(body),
      );

      if (response.statusCode != 200) {
        final error = jsonDecode(response.body);
        throw Exception(error['message'] ?? 'Failed to update profile');
      }
    } catch (e) {
      print('Error updating profile: $e');
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();
    } catch (e) {
      print('Logout error: $e');
      rethrow;
    }
  }

  Future<void> addToCart(String restaurantId, String itemId, int quantity, {String? size}) async {
    try {
      final response = await http.post(
        getUri('/cart/add'),
        headers: await getHeaders(),
        body: jsonEncode({
          'restaurantId': restaurantId,
          'itemId': itemId,
          'quantity': quantity,
          if (size != null) 'size': size,
        }),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to add item to cart');
      }
    } catch (e) {
      print('Error adding to cart: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getCart() async {
    try {
      final response = await http.get(
        getUri('/cart'),
        headers: await getHeaders(),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to load cart');
      }
    } catch (e) {
      print('Error fetching cart: $e');
      rethrow;
    }
  }

  Future<bool> isRestaurantOwner() async {
    final prefs = await SharedPreferences.getInstance();
    final userRole = prefs.getString('userRole');
    return userRole == 'restaurant_owner';
  }

  Future<String?> getUserRole() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('userRole');
  }

  Future<String?> getUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('userId');
  }
}