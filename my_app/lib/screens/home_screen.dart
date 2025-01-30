import 'package:flutter/material.dart';
import '../widgets/custom_navbar.dart';
import '../widgets/cart_button.dart';
import '../widgets/cart.dart';
import '../services/api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:google_fonts/google_fonts.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  String? _userRole = 'user';
  String _searchQuery = '';
  List<Map<String, dynamic>> _restaurants = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _checkAuth();
    _fetchUserRole();
    _fetchRestaurants();
    _setupAutoRefresh();
  }

  Future<void> _checkAuth() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token == null) {
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/login');
      }
    }
  }

  Future<void> _fetchUserRole() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userData = await _apiService.getUserProfile();
      final role = userData['role'];
      final hasRestaurant = userData['restaurant'] != null;
      
      print('User role from profile: $role'); // Debug print
      print('Has restaurant: $hasRestaurant'); // Debug print
      
      if (mounted) {
        setState(() {
          _userRole = role;
        });
        // Update stored role
        await prefs.setString('role', role);
      }
    } catch (e) {
      print('Error fetching user role: $e');
    }
  }

  void _setupAutoRefresh() {
    Future.delayed(const Duration(minutes: 5), () {
      if (mounted) {
        _fetchRestaurants();
        _setupAutoRefresh();
      }
    });
  }

  Future<void> _fetchRestaurants() async {
    try {
      final restaurants = await _apiService.getAllRestaurants();
      if (mounted) {
        setState(() {
          _restaurants = restaurants.where((r) => r['isActive'] == true).toList();
          _restaurants.sort((a, b) {
            if (a['name'].toLowerCase() == "chaizza") return -1;
            if (b['name'].toLowerCase() == "chaizza") return 1;
            return 0;
          });
          _isLoading = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Error fetching restaurants. Please try again.';
          _isLoading = false;
        });
      }
    }
  }

  List<Map<String, dynamic>> get _filteredRestaurants {
    if (_searchQuery.isEmpty) return _restaurants;
    return _restaurants.where((restaurant) {
      return restaurant['name']
          .toString()
          .toLowerCase()
          .contains(_searchQuery.toLowerCase());
    }).toList();
  }

  void _handleLogout() async {
    await _apiService.logout();
    if (mounted) {
      Navigator.pushReplacementNamed(context, '/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFA),
      body: SafeArea(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(30),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: TextField(
                        onChanged: (value) => setState(() => _searchQuery = value),
                        decoration: InputDecoration(
                          hintText: 'Search restaurants...',
                          prefixIcon: const Icon(Icons.search, color: Colors.grey),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 15,
                          ),
                          hintStyle: TextStyle(color: Colors.grey.shade500),
                        ),
                      ),
                    ),
                  ),
                  _buildCartButton(),
                ],
              ),
            ),

            Expanded(
              child: _isLoading
                  ? _buildShimmerLoading()
                  : _buildRestaurantGrid(),
            ),
          ],
        ),
      ),
      bottomNavigationBar: CustomNavbar(
        isLoggedIn: true,
        userRole: _userRole,
        onLogout: _handleLogout,
      ),
    );
  }

  Widget _buildCartButton() {
    return Material(
      color: const Color(0xFFFAC744),
      borderRadius: BorderRadius.circular(50),
      child: InkWell(
        borderRadius: BorderRadius.circular(50),
        onTap: () {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (context) => CartWidget(onClose: () => Navigator.pop(context)),
          );
        },
        child: const Padding(
          padding: EdgeInsets.all(12),
          child: Icon(Icons.shopping_cart, color: Colors.black),
        ),
      ),
    );
  }

  Widget _buildRestaurantGrid() {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: MediaQuery.of(context).size.width > 1024 ? 3 : 2,
        childAspectRatio: 0.85,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: _filteredRestaurants.length,
      itemBuilder: (context, index) {
        final restaurant = _filteredRestaurants[index];
        return _buildRestaurantCard(restaurant);
      },
    );
  }

  Widget _buildRestaurantCard(Map<String, dynamic> restaurant) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => Navigator.pushNamed(context, '/restaurant/${restaurant['_id']}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              child: AspectRatio(
                aspectRatio: 1.5,
                child: Image.network(
                  restaurant['imageUrl'] ?? 'placeholder_url',
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Image.asset(
                    'assets/images/placeholder.jpg',
                    fit: BoxFit.cover,
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    restaurant['name'],
                    style: GoogleFonts.playfairDisplay(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    restaurant['address'],
                    style: const TextStyle(
                      color: Colors.grey,
                      fontSize: 14,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShimmerLoading() {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: MediaQuery.of(context).size.width > 1024 ? 3 : 2,
        childAspectRatio: 0.85,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: 6,
      itemBuilder: (_, __) => Card(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Column(
          children: [
            Container(
              height: 150,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    height: 20,
                    width: double.infinity,
                    color: Colors.grey[300],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    height: 16,
                    width: 150,
                    color: Colors.grey[300],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
} 