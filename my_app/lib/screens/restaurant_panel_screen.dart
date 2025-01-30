import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/notification_service.dart';
import 'dart:async';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

class RestaurantPanelScreen extends StatefulWidget {
  const RestaurantPanelScreen({super.key});

  @override
  State<RestaurantPanelScreen> createState() => _RestaurantPanelScreenState();
}

class _RestaurantPanelScreenState extends State<RestaurantPanelScreen> {
  final ApiService _apiService = ApiService();
  final NotificationService _notificationService = NotificationService();
  List<Map<String, dynamic>> _orders = [];
  bool _isLoading = true;
  String _error = '';
  String? _restaurantId;
  bool _isOpen = false;
  String _activeTab = 'pending';
  bool _showSettings = false;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _checkLoginAndInitialize();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _notificationService.dispose();
    super.dispose();
  }

  Future<void> _checkLoginAndInitialize() async {
    if (!mounted) return;

    try {
      print('Checking credentials before initialization...');
      
      // Get stored credentials
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('userId');
      print('Current stored userId: "$userId"');
      
      final hasCredentials = await _apiService.hasValidCredentials();
      print('Credentials validation result: $hasCredentials');
      
      if (!hasCredentials) {
        if (mounted) {
          print('Invalid credentials - redirecting to login');
          await prefs.clear();
          await Navigator.pushReplacementNamed(context, '/login');
        }
        return;
      }

      print('Valid credentials found - proceeding with initialization');
      await _initialize();
    } catch (e) {
      print('Error during initialization check: $e');
      if (mounted) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.clear();
        await Navigator.pushReplacementNamed(context, '/login');
      }
    }
  }

  Future<void> _initialize() async {
    try {
      print('Starting restaurant panel initialization');
      
      // Verify credentials again before proceeding
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('userId');
      print('UserId before initialization: "$userId"');
      
      if (userId == null || userId.isEmpty) {
        throw Exception('Missing userId during initialization');
      }
      
      await _checkAccess();
      await _initializeNotifications();
      await _fetchRestaurantData();
      
      // Set up periodic refresh
      _refreshTimer?.cancel();
      _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
        _fetchOrders();
      });
    } catch (e) {
      print('Initialization error: $e');
      if (mounted) {
        setState(() {
          _error = 'Failed to initialize: $e';
          _isLoading = false;
        });
        
        // Redirect to login if credentials are invalid
        if (e.toString().contains('Missing userId')) {
          Navigator.pushReplacementNamed(context, '/login');
        }
      }
    }
  }

  Future<void> _checkAccess() async {
    try {
      final isOwner = await _apiService.isRestaurantOwner();
      print('Is restaurant owner: $isOwner');
      
      if (!isOwner && mounted) {
        // Also verify stored role
        final prefs = await SharedPreferences.getInstance();
        final role = prefs.getString('role');
        print('Stored role: $role');

        Navigator.pushReplacementNamed(context, '/home');
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Not authorized as restaurant owner')),
        );
      }
    } catch (e) {
      print('Access check error: $e');
      if (mounted) {
        setState(() {
          _error = 'Access check failed: $e';
          _isLoading = false;
        });
        
        // Navigate to login if access check fails
        Navigator.pushReplacementNamed(context, '/login');
      }
    }
  }

  Future<void> _initializeNotifications() async {
    await _notificationService.initialize();
    await _notificationService.connectToWebSocket();
    
    _notificationService.onNewOrder = (orderData) {
      // Refresh orders when new order is received
      _fetchOrders();
      
      // Show a snackbar
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('New order received!'),
            action: SnackBarAction(
              label: 'View',
              onPressed: () {
                setState(() {
                  _activeTab = 'pending';
                });
              },
            ),
          ),
        );
      }
    };
  }

  Future<void> _fetchRestaurantData() async {
    try {
      if (!mounted) return;
      
      setState(() {
        _isLoading = true;
        _error = '';
      });

      // Verify credentials before fetching data
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('userId');
      print('Current userId before fetch: "$userId"');

      if (userId == null || userId.isEmpty) {
        throw Exception('User ID not found - please login again');
      }

      final restaurantData = await _apiService.getRestaurantByOwnerId();
      print('Fetched restaurant data: $restaurantData');

      if (!mounted) return;

      if (restaurantData['_id'] == null) {
        throw Exception('Invalid restaurant data: Missing ID');
      }

      setState(() {
        _restaurantId = restaurantData['_id'].toString();
        _isOpen = restaurantData['isActive'] ?? false;
        _error = '';
        _isLoading = false;
      });
      
      // After getting restaurant ID, fetch orders
      await _fetchOrders();
    } catch (e) {
      print('Error fetching restaurant data: $e');
      if (!mounted) return;
      
      setState(() {
        _error = e.toString().contains('User ID not found') 
            ? 'Please login again'
            : 'Failed to load restaurant data';
        _isLoading = false;
      });

      if (e.toString().contains('User ID not found')) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.clear();
        Navigator.pushReplacementNamed(context, '/login');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_error),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
            action: SnackBarAction(
              label: 'Retry',
              onPressed: () => _fetchRestaurantData(),
              textColor: Colors.white,
            ),
          ),
        );
      }
    }
  }

  Future<void> _fetchOrders() async {
    if (_restaurantId == null) return;

    try {
      final orders = await _apiService.getRestaurantOrders(_restaurantId!);
      if (mounted) {
        setState(() {
          _orders = orders;
          _isLoading = false;
          _error = '';
        });
      }
    } catch (e) {
      print('Error fetching orders: $e');
      if (mounted) {
        setState(() {
          _error = 'Failed to load orders: $e';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleOrderStatusUpdate(String orderId, String status, [String? reason]) async {
    try {
      setState(() => _isLoading = true);
      
      await _apiService.updateOrderStatus(orderId, status, reason);
      
      // Refresh orders after status update
      await _fetchOrders();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Order $status successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      print('Error updating order status: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update order: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _toggleRestaurantStatus() async {
    if (_restaurantId == null) return;

    try {
      await _apiService.toggleRestaurantStatus(_restaurantId!);
      setState(() {
        _isOpen = !_isOpen;
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Restaurant is now ${_isOpen ? 'open' : 'closed'}'),
          backgroundColor: _isOpen ? Colors.green : Colors.red,
        ),
      );
    } catch (e) {
      print('Error toggling status: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update status: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  List<Map<String, dynamic>> get _filteredOrders {
    return _orders.where((order) {
      final orderStatus = order['orderStatus']?.toString() ?? 'Placed';
      switch (_activeTab) {
        case 'pending':
          return orderStatus == 'Placed' || orderStatus == 'Accepted';
        case 'completed':
          return orderStatus == 'Delivered';
        case 'cancelled':
          return orderStatus == 'Cancelled';
        default:
          return true;
      }
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _error.isNotEmpty
                ? Center(child: Text(_error))
                : Column(
                    children: [
                      // Modern Header
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 10,
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Restaurant Dashboard',
                              style: GoogleFonts.playfairDisplay(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey[900],
                              ),
                            ),
                            Row(
                              children: [
                                // Notification Bell
                                Stack(
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.notifications_outlined),
                                      onPressed: () {},
                                      color: Colors.grey[700],
                                    ),
                                    Positioned(
                                      right: 8,
                                      top: 8,
                                      child: Container(
                                        padding: const EdgeInsets.all(4),
                                        decoration: BoxDecoration(
                                          color: AppTheme.error,
                                          shape: BoxShape.circle,
                                        ),
                                        child: Text(
                                          '3',
                                          style: GoogleFonts.montserrat(
                                            color: Colors.white,
                                            fontSize: 10,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(width: 16),
                                // Restaurant Status Toggle
                                Row(
                                  children: [
                                    Container(
                                      width: 8,
                                      height: 8,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: _isOpen ? Colors.green : Colors.red,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      _isOpen ? 'Open' : 'Closed',
                                      style: TextStyle(
                                        color: _isOpen ? Colors.green : Colors.red,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Switch(
                                      value: _isOpen,
                                      onChanged: (_) => _toggleRestaurantStatus(),
                                      activeColor: AppTheme.primary,
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // Stats Cards
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            _buildStatsCard(
                              'Pending Orders',
                              _orders.where((o) => o['orderStatus'] == 'Placed').length.toString(),
                              Icons.pending_actions,
                            ),
                            const SizedBox(width: 16),
                            _buildStatsCard(
                              'Today\'s Orders',
                              _orders.where((o) => o['orderStatus'] == 'Delivered').length.toString(),
                              Icons.check_circle_outline,
                            ),
                            const SizedBox(width: 16),
                            _buildStatsCard(
                              'Total Revenue',
                              '₹${_calculateTotalRevenue()}',
                              Icons.payments_outlined,
                            ),
                          ],
                        ),
                      ),

                      // Order Tabs
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border(
                            bottom: BorderSide(color: Colors.grey.shade200),
                          ),
                        ),
                        child: Row(
                          children: [
                            _buildTab('pending', 'Pending'),
                            _buildTab('completed', 'Completed'),
                            _buildTab('cancelled', 'Cancelled'),
                          ],
                        ),
                      ),

                      // Orders List
                      Expanded(
                        child: _filteredOrders.isEmpty
                            ? Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.receipt_long_outlined,
                                      size: 64,
                                      color: Colors.grey[400],
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      'No ${_activeTab} orders',
                                      style: GoogleFonts.montserrat(
                                        color: Colors.grey[600],
                                        fontSize: 16,
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            : ListView.builder(
                                padding: const EdgeInsets.all(16),
                                itemCount: _filteredOrders.length,
                                itemBuilder: (context, index) {
                                  return _buildOrderCard(_filteredOrders[index]);
                                },
                              ),
                      ),
                    ],
                  ),
      ),
    );
  }

  Widget _buildStatsCard(String title, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: AppTheme.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.montserrat(
                      color: Colors.grey[600],
                      fontSize: 12,
                    ),
                  ),
                  Text(
                    value,
                    style: GoogleFonts.montserrat(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTab(String tab, String label) {
    final isActive = _activeTab == tab;
    return GestureDetector(
      onTap: () => setState(() => _activeTab = tab),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isActive ? AppTheme.primary : Colors.transparent,
              width: 2,
            ),
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.montserrat(
            color: isActive ? AppTheme.primary : Colors.grey[600],
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildOrderCard(Map<String, dynamic> order) {
    final status = order['status']?.toString() ?? 'Placed';
    final items = List<Map<String, dynamic>>.from(order['items'] ?? []);
    final customer = order['customer'] as Map<String, dynamic>?;
    final address = order['deliveryAddress'] as String? ?? 'No address provided';

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Order #${order['_id']}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                _buildStatusChip(status),
              ],
            ),
            const Divider(),
            if (customer != null) ...[
              Text('Customer: ${customer['username']}'),
              Text('Phone: ${customer['mobileNumber']}'),
              Text('Address: $address'),
              const Divider(),
            ],
            ...items.map((item) => ListTile(
              title: Text(item['itemName']),
              subtitle: Text('Size: ${item['size']}'),
              trailing: Text('x${item['quantity']}'),
            )),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total:', style: TextStyle(fontWeight: FontWeight.bold)),
                Text(
                  '₹${order['totalAmount']?.toString() ?? '0'}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            if (status == 'Placed') ...[
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  ElevatedButton(
                    onPressed: () => _handleOrderStatusUpdate(order['_id'], 'Accepted'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                    child: const Text('Accept'),
                  ),
                  ElevatedButton(
                    onPressed: () => _showDeclineDialog(order['_id']),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                    child: const Text('Decline'),
                  ),
                ],
              ),
            ],
            if (status == 'Accepted') ...[
              const SizedBox(height: 16),
              Center(
                child: ElevatedButton(
                  onPressed: () => _handleOrderStatusUpdate(order['_id'], 'Delivered'),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
                  child: const Text('Mark as Delivered'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    switch (status.toLowerCase()) {
      case 'pending':
      case 'placed':
        color = Colors.orange;
        break;
      case 'accepted':
        color = Colors.blue;
        break;
      case 'delivered':
        color = Colors.green;
        break;
      case 'cancelled':
        color = Colors.red;
        break;
      default:
        color = Colors.grey;
    }

    return Chip(
      label: Text(status),
      backgroundColor: color,
      labelStyle: const TextStyle(color: Colors.white),
    );
  }

  Future<void> _showDeclineDialog(String orderId) async {
    String? reason;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Decline Order'),
        content: DropdownButtonFormField<String>(
          value: reason,
          items: const [
            DropdownMenuItem(value: 'Items not available', child: Text('Items not available')),
            DropdownMenuItem(value: 'Shop Closed', child: Text('Shop Closed')),
            DropdownMenuItem(value: 'Other', child: Text('Other')),
          ],
          onChanged: (value) {
            reason = value;
          },
          decoration: const InputDecoration(
            labelText: 'Select reason',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              if (reason != null) {
                Navigator.pop(context);
                _handleOrderStatusUpdate(orderId, 'Cancelled', reason);
              }
            },
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
  }

  String _calculateItemTotal(Map<String, dynamic> item) {
    final quantity = item['quantity'] ?? 1;
    final size = item['size'] ?? 'Regular';
    num price = 0;
    
    // Debug print to see the item structure
    print('Item data: $item');
    
    // Check if menuItem exists and has price information
    if (item['menuItem'] != null && item['menuItem'] is Map) {
      final menuItem = item['menuItem'] as Map<String, dynamic>;
      
      // Check for size-specific pricing
      if (menuItem['sizes'] != null && menuItem['sizes'] is Map) {
        price = menuItem['sizes'][size]?.toDouble() ?? menuItem['price']?.toDouble() ?? 0;
      } else {
        price = menuItem['price']?.toDouble() ?? 0;
      }
    }
    
    final total = price * quantity;
    return total.toStringAsFixed(2); // Format to 2 decimal places
  }

  String _calculateTotalRevenue() {
    return _orders
        .where((o) => o['orderStatus'] == 'Delivered')
        .fold(0.0, (sum, order) => sum + (order['totalAmount'] ?? 0))
        .toStringAsFixed(2);
  }
} 