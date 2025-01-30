import 'package:flutter/material.dart';
import 'package:my_app/theme/app_theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

class CustomNavbar extends StatelessWidget {
  final bool isLoggedIn;
  final String? userRole;
  final VoidCallback onLogout;

  const CustomNavbar({
    super.key,
    required this.isLoggedIn,
    this.userRole,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: _getCurrentIndex(ModalRoute.of(context)?.settings.name ?? '/'),
      selectedItemColor: AppTheme.primary,
      unselectedItemColor: Colors.grey,
      type: BottomNavigationBarType.fixed,
      items: _getNavItems(),
      onTap: (index) => _onItemTapped(index, context),
    );
  }

  List<BottomNavigationBarItem> _getNavItems() {
    print('CustomNavbar userRole: $userRole'); // Debug print
    final items = [
      const BottomNavigationBarItem(
        icon: Icon(Icons.home),
        label: 'Home',
      ),
    ];

    if (isLoggedIn) {
      if (userRole == 'restaurant') {
        print('Adding restaurant items to navbar'); // Debug print
        items.addAll([
          const BottomNavigationBarItem(
            icon: Icon(Icons.restaurant_menu),
            label: 'Restaurant',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long),
            label: 'Orders',
          ),
        ]);
      } else {
        print('Adding user items to navbar'); // Debug print
        items.addAll([
          const BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long),
            label: 'Orders',
          ),
        ]);
      }
      items.add(
        const BottomNavigationBarItem(
          icon: Icon(Icons.person),
          label: 'Profile',
        ),
      );
    }

    return items;
  }

  int _getCurrentIndex(String route) {
    switch (route) {
      case '/':
      case '/home':
        return 0;
      case '/restaurant-panel':
        return 1;
      case '/orders':
        return userRole == 'restaurant' ? 2 : 1;
      case '/profile':
        return userRole == 'restaurant' ? 3 : 2;
      default:
        return 0;
    }
  }

  void _onItemTapped(int index, BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    
    if (token == null) {
      Navigator.pushReplacementNamed(context, '/login');
      return;
    }

    switch (index) {
      case 0:
        Navigator.pushReplacementNamed(context, '/home');
        break;
      case 1:
        if (userRole == 'restaurant') {
          Navigator.pushNamed(context, '/restaurant-panel');
        } else {
          Navigator.pushNamed(context, '/orders');
        }
        break;
      case 2:
        if (userRole == 'restaurant') {
          Navigator.pushNamed(context, '/orders');
        } else {
          Navigator.pushNamed(context, '/profile');
        }
        break;
      case 3:
        if (userRole == 'restaurant') {
          Navigator.pushNamed(context, '/profile');
        }
        break;
    }
  }
} 