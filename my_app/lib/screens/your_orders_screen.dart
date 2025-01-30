import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'dart:async';

class YourOrdersScreen extends StatefulWidget {
  const YourOrdersScreen({super.key});

  @override
  State<YourOrdersScreen> createState() => _YourOrdersScreenState();
}

class _YourOrdersScreenState extends State<YourOrdersScreen> {
  final ApiService _apiService = ApiService();
  List<Map<String, dynamic>> _orders = [];
  bool _isLoading = true;
  String? _error;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _fetchOrders();
    // Set up auto-refresh every 1 minute
    _refreshTimer = Timer.periodic(const Duration(minutes: 1), (_) {
      _fetchOrders();
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchOrders() async {
    try {
      final orders = await _apiService.getUserOrders();
      if (mounted) {
        setState(() {
          _orders = orders;
          _isLoading = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null) {
      return Scaffold(
        body: Center(
          child: Text(
            'Error: $_error',
            style: const TextStyle(color: Colors.red),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Your Orders'),
        backgroundColor: const Color(0xFFFAC744),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchOrders,
        child: _orders.isEmpty
            ? const Center(child: Text('No orders found.'))
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _orders.length,
                itemBuilder: (context, index) {
                  final order = _orders[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 16),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  'Restaurant: ${order['restaurantName'] ?? 'N/A'}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                              ),
                              _buildStatusChip(order['orderStatus'] ?? 'Unknown'),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Ordered At: ${_formatDate(order['createdAt'])}',
                            style: const TextStyle(color: Colors.grey),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Total Amount: ₹${order['totalAmount']?.toString() ?? '0.00'}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          if (order['orderStatus'] == 'Cancelled' &&
                              order['cancellationReason'] != null) ...[
                            const SizedBox(height: 8),
                            Text(
                              'Cancellation Reason: ${order['cancellationReason']}',
                              style: const TextStyle(color: Colors.red),
                            ),
                          ],
                          const Divider(),
                          const Text(
                            'Items:',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          ..._buildOrderItems(order['items'] ?? []),
                        ],
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    switch (status.toLowerCase()) {
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
      label: Text(
        status,
        style: const TextStyle(color: Colors.white),
      ),
      backgroundColor: color,
    );
  }

  List<Widget> _buildOrderItems(List<dynamic> items) {
    return items.map<Widget>((item) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                '${item['itemName'] ?? 'Unknown Item'} x${item['quantity'] ?? 1}',
              ),
            ),
            if (item['size'] != null)
              Text(
                '(${item['size']})',
                style: const TextStyle(color: Colors.grey),
              ),
          ],
        ),
      );
    }).toList();
  }

  String _formatDate(dynamic date) {
    if (date == null) return 'N/A';
    try {
      final DateTime dateTime = DateTime.parse(date.toString());
      return '${dateTime.day}/${dateTime.month}/${dateTime.year} ${dateTime.hour}:${dateTime.minute}';
    } catch (e) {
      return 'N/A';
    }
  }
} 