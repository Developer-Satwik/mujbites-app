Image.network(
  restaurant.imageUrl ?? 'https://example.com/default-restaurant.jpg',
  errorBuilder: (context, error, stackTrace) {
    return Container(
      height: 200,
      color: Colors.grey[300],
      child: const Center(
        child: Icon(Icons.restaurant, size: 50),
      ),
    );
  },
  loadingBuilder: (context, child, loadingProgress) {
    if (loadingProgress == null) return child;
    return Container(
      height: 200,
      color: Colors.grey[300],
      child: const Center(
        child: CircularProgressIndicator(),
      ),
    );
  },
), 