import SwiftUI

// MARK: - Design System (Tokens)
// Centraliza todas as decisões visuais do app num único lugar.
// Nenhuma view deve hardcodar cores, fontes ou espaçamentos além daqui.

enum NeuroColor {
    // MARK: Backgrounds
    static let appBackground   = Color(red: 0.05, green: 0.05, blue: 0.07)  // #0D0D12
    static let cardBackground  = Color(red: 0.09, green: 0.09, blue: 0.13)  // #171720
    static let surfaceOverlay  = Color.white.opacity(0.05)

    // MARK: Semantic / Heat Gradients
    /// Inferno: violeta profundo → vermelho plasma
    static let infernoGradient = LinearGradient(
        colors: [Color(red: 0.55, green: 0.0, blue: 0.9),
                 Color(red: 0.95, green: 0.1, blue: 0.2)],
        startPoint: .topLeading, endPoint: .bottomTrailing)

    /// Critical: laranja incandescente
    static let criticalGradient = LinearGradient(
        colors: [Color(red: 1.0, green: 0.4, blue: 0.0),
                 Color(red: 1.0, green: 0.7, blue: 0.0)],
        startPoint: .topLeading, endPoint: .bottomTrailing)

    /// High: âmbar dourado
    static let highGradient = LinearGradient(
        colors: [Color(red: 0.95, green: 0.75, blue: 0.1),
                 Color(red: 0.75, green: 0.55, blue: 0.0)],
        startPoint: .topLeading, endPoint: .bottomTrailing)

    /// Medium: azul neon frio
    static let mediumGradient = LinearGradient(
        colors: [Color(red: 0.2, green: 0.5, blue: 1.0),
                 Color(red: 0.1, green: 0.3, blue: 0.8)],
        startPoint: .topLeading, endPoint: .bottomTrailing)

    /// Low: cinza-azulado discreto
    static let lowGradient = LinearGradient(
        colors: [Color(red: 0.3, green: 0.35, blue: 0.45),
                 Color(red: 0.2, green: 0.22, blue: 0.30)],
        startPoint: .topLeading, endPoint: .bottomTrailing)

    // MARK: Accent
    static let accent      = Color(red: 0.4,  green: 0.5,  blue: 1.0)
    static let accentGlow  = Color(red: 0.4,  green: 0.5,  blue: 1.0).opacity(0.3)

    // MARK: Text
    static let primaryText   = Color.white
    static let secondaryText = Color.white.opacity(0.55)
    static let tertiaryText  = Color.white.opacity(0.3)
}

// MARK: - Heat Level Visual Props
extension HeatLevel {
    var gradient: LinearGradient {
        switch self {
        case .inferno:  return NeuroColor.infernoGradient
        case .critical: return NeuroColor.criticalGradient
        case .high:     return NeuroColor.highGradient
        case .medium:   return NeuroColor.mediumGradient
        case .low:      return NeuroColor.lowGradient
        }
    }

    var accentColor: Color {
        switch self {
        case .inferno:  return Color(red: 0.85, green: 0.1, blue: 0.9)
        case .critical: return Color(red: 1.0,  green: 0.4, blue: 0.0)
        case .high:     return Color(red: 0.95, green: 0.75, blue: 0.1)
        case .medium:   return Color(red: 0.2,  green: 0.6,  blue: 1.0)
        case .low:      return Color(red: 0.4,  green: 0.45, blue: 0.6)
        }
    }

    var glowOpacity: Double {
        switch self {
        case .inferno:  return 0.50
        case .critical: return 0.40
        case .high:     return 0.28
        case .medium:   return 0.18
        case .low:      return 0.06
        }
    }

    var icon: String {
        switch self {
        case .inferno:  return "flame.fill"
        case .critical: return "exclamationmark.triangle.fill"
        case .high:     return "bolt.fill"
        case .medium:   return "circle.fill"
        case .low:      return "moon.fill"
        }
    }

    var pulseAnimation: Bool {
        self == .inferno || self == .critical
    }
}
