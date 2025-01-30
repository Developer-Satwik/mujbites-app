void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Your App',
      navigatorKey: GlobalKey<NavigatorState>(),
      initialRoute: '/',
      onGenerateRoute: (settings) {
        // Add proper route handling
        switch (settings.name) {
          case '/login':
            return MaterialPageRoute(builder: (_) => LoginScreen());
          case '/restaurant-panel':
            return MaterialPageRoute(builder: (_) => RestaurantPanel());
          // ... other routes
          default:
            return MaterialPageRoute(builder: (_) => LoginScreen());
        }
      },
      builder: (context, child) {
        return child ?? const SizedBox.shrink();
      },
    );
  }
} 