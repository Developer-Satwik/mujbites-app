import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../widgets/custom_navbar.dart';
import '../widgets/cart_button.dart';
import 'package:provider/provider.dart';
import '../providers/cart_provider.dart';
import '../models/cart.dart';
import '../theme/app_theme.dart';
import 'package:google_fonts/google_fonts.dart';
import '../widgets/cart.dart';
import '../widgets/loading_screen.dart';

class RestaurantScreen extends StatefulWidget {
  final String restaurantId;

  const RestaurantScreen({super.key, required this.restaurantId});

  @override
  State<RestaurantScreen> createState() => _RestaurantScreenState();
}

class _RestaurantScreenState extends State<RestaurantScreen> {
  final ApiService _apiService = ApiService();
  Map<String, dynamic>? _restaurant;
  List<Map<String, dynamic>> _menu = [];
  bool _isLoading = true;
  String _searchQuery = '';
  String _selectedCategory = 'All';
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchRestaurantData();
  }

  Future<void> _fetchRestaurantData() async {
    try {
      setState(() => _isLoading = true);
      
      final response = await _apiService.getRestaurantById(widget.restaurantId);
      print('Raw response: $response'); // Debug print
      
      if (response is Map<String, dynamic>) {
        final menuItems = response['menu'];
        print('Menu items type: ${menuItems.runtimeType}'); // Debug print
        print('Menu items content: $menuItems'); // Debug print
        
        setState(() {
          _restaurant = response;
          if (menuItems is List) {
            _menu = menuItems.map((item) {
              // Convert sizes object to list of maps
              final sizesMap = item['sizes'] as Map<String, dynamic>;
              final sizesList = sizesMap.entries.map((entry) => {
                'name': entry.key,
                'price': entry.value,
              }).toList();
              
              return {
                'id': item['_id'],
                'name': item['itemName'],
                'price': sizesMap.values.first, // Use smallest size price as default
                'sizes': sizesList,
                'category': item['category'] ?? 'Other',
                'imageUrl': item['imageUrl'],
                'isAvailable': item['isAvailable'] ?? true,
              };
            }).toList();
          } else {
            _menu = [];
          }
          _isLoading = false;
          _error = null;
        });
      }
    } catch (e) {
      print('Error fetching restaurant data: $e');
      setState(() {
        _error = 'Failed to load restaurant data';
        _isLoading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _filteredItems {
    return _menu.where((item) {
      final matchesSearch = item['name'].toString().toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesCategory = _selectedCategory == 'All' || item['category'] == _selectedCategory;
      return matchesSearch && matchesCategory;
    }).toList();
  }

  List<String> get _categories {
    final categories = _menu.map((item) => item['category'].toString()).toSet().toList();
    return ['All', ...categories];
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: LoadingScreen());
    }

    if (_error != null) {
      return Scaffold(
        body: Center(
          child: Text(
            _error!,
            style: GoogleFonts.montserrat(
              color: AppTheme.error,
              fontSize: 16,
            ),
          ),
        ),
      );
    }

    return Scaffold(
      floatingActionButton: CartButton(
        onTap: () {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (context) => CartWidget(onClose: () => Navigator.pop(context)),
          );
        },
      ),
      body: CustomScrollView(
        slivers: [
          // Hero Section
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            backgroundColor: AppTheme.primary,
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  Image.network(
                    _restaurant?['imageUrl'] ?? '',
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: Colors.grey.shade200,
                      child: Icon(
                        Icons.restaurant,
                        color: Colors.grey.shade400,
                        size: 60,
                      ),
                    ),
                  ),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          Colors.black.withOpacity(0.7),
                        ],
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 16,
                    left: 16,
                    right: 16,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _restaurant?['name'] ?? '',
                          style: GoogleFonts.playfairDisplay(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _restaurant?['address'] ?? '',
                          style: GoogleFonts.montserrat(
                            fontSize: 16,
                            color: Colors.white.withOpacity(0.9),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Search and Filters
          SliverToBoxAdapter(
            child: Container(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Search Bar
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(30),
                      border: Border.all(
                        color: AppTheme.primary.withOpacity(0.2),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 10,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: TextField(
                      onChanged: (value) => setState(() => _searchQuery = value),
                      decoration: InputDecoration(
                        hintText: 'Search menu items...',
                        prefixIcon: const Icon(Icons.search, color: Colors.grey),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 15,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Category Filters
                  SizedBox(
                    height: 40,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _categories.length,
                      itemBuilder: (context, index) {
                        final category = _categories[index];
                        final isSelected = _selectedCategory == category;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: FilterChip(
                            selected: isSelected,
                            label: Text(category),
                            onSelected: (_) => setState(() => _selectedCategory = category),
                            backgroundColor: Colors.white,
                            selectedColor: AppTheme.primary,
                            labelStyle: GoogleFonts.montserrat(
                              color: isSelected ? Colors.white : AppTheme.textSecondary,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Menu Grid
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                childAspectRatio: 0.75,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) => _buildMenuItem(_filteredItems[index]),
                childCount: _filteredItems.length,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem(Map<String, dynamic> item) {
    final isAvailable = item['isAvailable'] ?? true;
    final sizes = List<Map<String, dynamic>>.from(item['sizes'] ?? []);

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                child: Image.network(
                  item['imageUrl'] ?? '',
                  height: 120,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    height: 120,
                    width: double.infinity,
                    color: Colors.grey.shade200,
                    child: Icon(
                      Icons.restaurant,
                      color: Colors.grey.shade400,
                      size: 40,
                    ),
                  ),
                ),
              ),
              if (!isAvailable)
                Container(
                  height: 120,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.6),
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                  ),
                  child: Center(
                    child: Text(
                      'Currently Unavailable',
                      style: GoogleFonts.montserrat(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        item['name'] ?? '',
                        style: GoogleFonts.playfairDisplay(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      '₹${item['price']?.toString() ?? '0'}',
                      style: GoogleFonts.montserrat(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primary,
                      ),
                    ),
                  ],
                ),
                if (sizes.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 4,
                    runSpacing: 4,
                    children: sizes.map((size) {
                      return Chip(
                        label: Text(
                          '${size['name']} - ₹${size['price']}',
                          style: const TextStyle(fontSize: 12),
                        ),
                        backgroundColor: Colors.grey.shade100,
                        padding: EdgeInsets.zero,
                      );
                    }).toList(),
                  ),
                ],
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: isAvailable ? () => _addToCart(item) : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: Text(
                      isAvailable ? 'Add to Cart' : 'Not Available',
                      style: GoogleFonts.montserrat(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _addToCart(Map<String, dynamic> item) {
    final cartProvider = Provider.of<CartProvider>(context, listen: false);
    try {
      // Safely get values with null checks
      final itemId = item['_id']?.toString() ?? item['id']?.toString();
      final itemName = item['name']?.toString() ?? 'Unknown Item';
      final itemPrice = (item['price'] ?? 0).toDouble();

      if (itemId == null) {
        throw Exception('Invalid item data');
      }

      final selectedSize = item['sizes'] != null && (item['sizes'] as List).isNotEmpty
          ? (item['sizes'] as List).first
          : {'name': 'Regular', 'price': itemPrice};

      cartProvider.addItem(
        CartItem(
          id: itemId,
          name: itemName,
          price: (selectedSize['price'] as num).toDouble(),
          size: selectedSize['name']?.toString() ?? 'Regular',
          restaurantId: widget.restaurantId,
        ),
      );
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Added $itemName to cart',
            style: GoogleFonts.montserrat(),
          ),
          backgroundColor: AppTheme.success,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Failed to add item to cart: ${e.toString()}',
            style: GoogleFonts.montserrat(),
          ),
          backgroundColor: AppTheme.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }
} 