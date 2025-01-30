import 'dart:convert';
import 'dart:io';
import 'dart:async';  // Add this import for TimeoutException
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

class ApiService {
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:5000/api';
    }
    return Platform.isAndroid 
        ? 'http://10.0.2.2:5000/api'  // Android emulator uses 10.0.2.2 to access localhost
        : 'http://localhost:5000/api'; // iOS simulator or web
  }
  
  // For debugging
  static Uri getUri(String path) {
    final uri = Uri.parse('$baseUrl$path');
    print('Making request to: $uri');
    return uri;
  }

  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  Future<Map<String, String>> getHeaders([String? token]) async {
    if (token == null) {
      token = await _getToken();
    }
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<dynamic> _authenticatedRequest(String path, {
    String method = 'GET',
    Map<String, dynamic>? body,
  }) async {
    final token = await _getToken();
    if (token == null) {
      throw Exception('No authentication token found');
    }

    final headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };

    final uri = Uri.parse('$baseUrl$path');
    http.Response response;

    try {
      switch (method) {
        case 'GET':
          response = await http.get(uri, headers: headers);
          break;
        case 'POST':
          response = await http.post(
            uri,
            headers: headers,
            body: json.encode(body),
          );
          break;
        case 'PUT':
          response = await http.put(
            uri,
            headers: headers,
            body: json.encode(body),
          );
          break;
        default:
          throw Exception('Unsupported HTTP method');
      }

      if (response.statusCode == 401) {
        // Handle token expiration
        final prefs = await SharedPreferences.getInstance();
        await prefs.clear();
        throw Exception('Authentication failed');
      }

      if (response.statusCode == 403) {
        throw Exception('Not authorized to perform this action');
      }

      return json.decode(response.body);
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  // Authentication Methods
  Future<Map<String, dynamic>> register(String username, String mobileNumber, String password) async {
    try {
      final headers = await getHeaders();
      final body = {
        'username': username,
        'mobileNumber': mobileNumber,
        'password': password,
      };

      print('Making registration request...');
      print('Headers: $headers');
      print('Body: $body');

      final response = await http.post(
        getUri('/users/register'),
        headers: headers,
        body: jsonEncode(body),
      );

      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

      if (response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        throw Exception(response.body);
      }
    } catch (e) {
      print('Registration error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> login(String mobileNumber, String password) async {
    try {
      final response = await http.post(
        getUri('/users/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'mobileNumber': mobileNumber,
          'password': password,
        }),
      );

      print('Login response status: ${response.statusCode}');
      print('Login response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Validate required fields
        if (data['token'] == null) throw Exception('Token not received');
        if (data['user'] == null) throw Exception('User data not received');
        
        final user = data['user'];
        print('User data: $user'); // Debug print
        
        // Store user data
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', data['token']);
        await prefs.setString('userId', user['_id']);
        await prefs.setString('role', user['role'] ?? 'user');  // Store role directly from user data
        await prefs.setBool('isLoggedIn', true);
        
        print('Stored role: ${user['role']}'); // Debug print
        
        return data;
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['message'] ?? 'Login failed');
      }
    } catch (e) {
      print('Login error: $e');
      rethrow;
    }
  }

  // Restaurant Methods
  Future<List<Map<String, dynamic>>> getAllRestaurants() async {
    try {
      print('Fetching restaurants from: $baseUrl/restaurants');
      final response = await http.get(
        getUri('/restaurants'),
        headers: await getHeaders(),
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          throw TimeoutException('Request timed out');
        },
      );

      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.cast<Map<String, dynamic>>();
      } else {
        throw Exception('Failed to load restaurants: ${response.statusCode}');
      }
    } on SocketException catch (e) {
      print('Socket Exception: $e');
      throw Exception('Network error: Please check your internet connection');
    } on TimeoutException catch (e) {
      print('Timeout Exception: $e');
      throw Exception('Request timed out: Please try again');
    } catch (e) {
      print('Error fetching restaurants: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getRestaurantById(String id) async {
    try {
      print('Fetching restaurant details from: $baseUrl/restaurants/$id');
      final response = await http.get(
        getUri('/restaurants/$id'),
        headers: await getHeaders(),
      );

      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

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

  Future<Map<String, dynamic>> getRestaurantMenu(String id) async {
    try {
      print('Fetching menu from: $baseUrl/restaurants/$id/menu');
      final response = await http.get(
        getUri('/restaurants/$id/menu'),
        headers: await getHeaders(),
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          throw TimeoutException('Request timed out');
        },
      );

      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('Parsed menu data: $data');
        return data;
      } else if (response.statusCode == 404) {
        throw Exception('Restaurant not found');
      } else {
        throw Exception('Failed to load restaurant menu: ${response.statusCode}');
      }
    } catch (e) {
      print('Error fetching menu: $e');
      rethrow;
    }
  }

  // Order Methods
  Future<Map<String, dynamic>> createOrder(Map<String, dynamic> orderData) async {
    final response = await http.post(
      Uri.parse('$baseUrl/orders'),
      headers: await getHeaders(),
      body: jsonEncode(orderData),
    );

    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to create order');
    }
  }

  Future<List<Map<String, dynamic>>> getUserOrders() async {
    final response = await _authenticatedRequest('/orders');
    return List<Map<String, dynamic>>.from(response['orders'] ?? []);
  }

  // Profile Methods
  Future<Map<String, dynamic>> getUserProfile() async {
    try {
      final response = await _authenticatedRequest('/users/profile');
      print('Profile Response: $response'); // Debug log
      
      if (response == null) {
        throw Exception('No profile data received');
      }
      
      // The backend returns the user object directly with populated restaurant field
      return response;
    } catch (e) {
      print('Error fetching profile: $e');
      rethrow;
    }
  }

  Future<void> updateProfile({
    required String address,
    String? oldPassword,
    String? newPassword,
  }) async {
    try {
      final Map<String, dynamic> body = {
        if (address.isNotEmpty) 'address': address,
        if (oldPassword != null) 'oldPassword': oldPassword,
        if (newPassword != null) 'newPassword': newPassword,
      };

      await _authenticatedRequest(
        '/users/profile/update',
        method: 'PUT',
        body: body,
      );
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

  // Cart Methods
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

  // Restaurant owner specific methods
  Future<Map<String, dynamic>> getRestaurantByOwnerId() async {
    try {
      final userId = await _getUserId();
      if (userId == null) {
        throw Exception('User ID not found');
      }

      print('Fetching restaurant for user ID: $userId');
      final response = await http.get(
        getUri('/restaurants/owner/$userId'),
        headers: await getHeaders(),
      );

      print('Restaurant response status: ${response.statusCode}');
      print('Restaurant response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data == null) {
          throw Exception('No restaurant data received');
        }
        return data;
      } else {
        throw Exception('Failed to fetch restaurant: ${response.statusCode}');
      }
    } catch (e) {
      print('Error fetching restaurant: $e');
      rethrow;
    }
  }

  Future<String?> _getUserId() async {
    final prefs = await SharedPreferences.getInstance();
    final userId = prefs.getString('userId');
    print('Retrieved user ID: $userId');
    return userId;
  }

  Future<List<Map<String, dynamic>>> getRestaurantOrders(String restaurantId) async {
    try {
      final response = await http.get(
        getUri('/restaurants/$restaurantId/orders'),
        headers: await getHeaders(),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.cast<Map<String, dynamic>>();
      } else {
        throw Exception('Failed to fetch orders: ${response.statusCode}');
      }
    } catch (e) {
      print('Error fetching restaurant orders: $e');
      rethrow;
    }
  }

  Future<void> updateOrderStatus(String orderId, String status, [String? cancellationReason]) async {
    try {
      final response = await http.put(
        getUri('/restaurants/orders/$orderId'),
        headers: await getHeaders(),
        body: jsonEncode({
          'status': status,
          if (cancellationReason != null) 'cancellationReason': cancellationReason,
        }),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to update order status: ${response.statusCode}');
      }
    } catch (e) {
      print('Error updating order status: $e');
      rethrow;
    }
  }

  Future<bool> isRestaurantOwner() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final role = prefs.getString('role');
      return role == 'restaurant';
    } catch (e) {
      print('Error checking restaurant owner status: $e');
      return false;
    }
  }

  Future<void> toggleRestaurantStatus(String restaurantId) async {
    try {
      final response = await http.put(
        getUri('/restaurants/$restaurantId/toggle-status'),
        headers: await getHeaders(),
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to toggle restaurant status: ${response.statusCode}');
      }
    } catch (e) {
      print('Error toggling restaurant status: $e');
      rethrow;
    }
  }
}