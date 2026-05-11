import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'features/auth/presentation/pages/login_page.dart';
import 'features/home/presentation/pages/home_page.dart';

void main() {
  runApp(
    const ProviderScope(
      child: EduNexusParentApp(),
    ),
  );
}

class EduNexusParentApp extends StatelessWidget {
  const EduNexusParentApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EduNexus Parent',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1A1A1A),
          primary: const Color(0xFF1A1A1A),
        ),
        textTheme: GoogleFonts.plusJakartaSansTextTheme(),
      ),
      home: const LoginPage(), // Simple routing for demo
      debugShowCheckedModeBanner: false,
    );
  }
}
