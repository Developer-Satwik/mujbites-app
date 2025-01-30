import 'package:flutter/material.dart';
import '../services/auth_service.dart';

class CustomNavbar extends StatelessWidget {
  final String userRole;
  final AuthService _authService = AuthService();

  CustomNavbar({Key? key, required this.userRole}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<bool>(
      future: _authService.isAuthenticated(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError || !(snapshot.data ?? false)) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            Navigator.of(context).pushNamedAndRemoveUntil(
              '/login',
              (route) => false,
            );
          });
          return const SizedBox.shrink();
        }

        return _buildNavbar(context);
      },
    );
  }

  Widget _buildNavbar(BuildContext context) {
    return Container(
      color: Colors.white,
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (userRole == 'restaurant') ...[
              ListTile(
                leading: const Icon(Icons.restaurant_menu),
                title: const Text('Menu Management'),
                onTap: () => Navigator.pushNamed(context, '/menu-management'),
              ),
              ListTile(
                leading: const Icon(Icons.receipt_long),
                title: const Text('Orders'),
                onTap: () => Navigator.pushNamed(context, '/orders'),
              ),
              ListTile(
                leading: const Icon(Icons.logout),
                title: const Text('Logout'),
                onTap: () => _authService.logout(context),
              ),
            ],
          ],
        ),
      ),
    );
  }
} 