import SwiftUI

// MARK: - THETA App Entry Point
@main
struct ThetaApp: App {
    var body: some Scene {
        WindowGroup {
            HomeView()
                .preferredColorScheme(.dark)
        }
    }
}
