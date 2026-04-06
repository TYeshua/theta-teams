import SwiftUI

// MARK: - Calibrate Sheet
// Bottom sheet flutuante com Ultra Thin Material (blur nativo do iOS).
// Permite configurar Urgência (1-5) e Esforço (Fibonacci) e disparar
// o cálculo do priority_score no backend.

struct CalibrateSheet: View {
    let task: NeuroTask
    let onConfirm: (Int, Int) -> Void
    @Environment(\.dismiss) private var dismiss

    // Fibonacci válidos para Esforço (story points)
    private let fibValues = [1, 2, 3, 5, 8, 13]

    @State private var selectedUrgency: Int
    @State private var selectedEffort:  Int
    @State private var isSubmitting = false

    init(task: NeuroTask, onConfirm: @escaping (Int, Int) -> Void) {
        self.task      = task
        self.onConfirm = onConfirm
        _selectedUrgency = State(initialValue: task.urgency ?? 3)
        _selectedEffort  = State(initialValue: task.effort  ?? 3)
    }

    private var projectedScore: Double {
        Double(selectedUrgency) / Double(selectedEffort)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                // Fundo com blur de Ultra Thin Material
                Color.clear
                    .background(.ultraThinMaterial)
                    .ignoresSafeArea()

                VStack(spacing: 28) {
                    // ── Header ─────────────────────────────────────────
                    VStack(spacing: 6) {
                        Text("Calibrar Tarefa")
                            .font(.system(.title2, design: .rounded, weight: .bold))
                            .foregroundStyle(NeuroColor.primaryText)
                        Text(task.title)
                            .font(.system(.subheadline, design: .rounded))
                            .foregroundStyle(NeuroColor.secondaryText)
                            .multilineTextAlignment(.center)
                    }

                    // ── Score Preview ──────────────────────────────────
                    scorePreviewCard

                    // ── Urgência Slider ────────────────────────────────
                    sectionLabel("URGÊNCIA", subtitle: "Qual o impacto se isso não for feito hoje?")
                    urgencyPicker

                    // ── Esforço Picker (Fibonacci) ─────────────────────
                    sectionLabel("ESFORÇO (Fibonacci)", subtitle: "Quanto tempo/energia isso vai consumir?")
                    effortPicker

                    Spacer()

                    // ── CTA ───────────────────────────────────────────
                    Button(action: submit) {
                        HStack(spacing: 8) {
                            if isSubmitting {
                                ProgressView().tint(.white)
                            } else {
                                Image(systemName: "bolt.fill")
                                Text("Calibrar Agora")
                                    .fontWeight(.bold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(NeuroColor.infernoGradient)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .shadow(color: Color(red: 0.55, green: 0.0, blue: 0.9).opacity(0.4),
                                radius: 12, x: 0, y: 6)
                    }
                    .disabled(isSubmitting)
                }
                .padding(.horizontal, 24)
                .padding(.top, 8)
                .padding(.bottom, 20)
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancelar") { dismiss() }
                        .font(.system(.body, design: .rounded))
                        .foregroundStyle(NeuroColor.accent)
                }
            }
        }
        .presentationDetents([.height(620)])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(28)
        .preferredColorScheme(.dark)
    }

    // MARK: - Sub-views

    private var scorePreviewCard: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("SCORE PROJETADO")
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                    .foregroundStyle(NeuroColor.tertiaryText)
                    .kerning(1.5)
                Text(String(format: "%.3f", projectedScore))
                    .font(.system(size: 36, weight: .black, design: .rounded))
                    .foregroundStyle(heatColorForScore(projectedScore))
                    .contentTransition(.numericText())
                    .animation(.spring(response: 0.3), value: projectedScore)
            }
            Spacer()
            Image(systemName: heatIconForScore(projectedScore))
                .font(.system(size: 32, weight: .black))
                .foregroundStyle(heatColorForScore(projectedScore))
                .scaleEffect(1.0)
        }
        .padding(16)
        .background(heatColorForScore(projectedScore).opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(heatColorForScore(projectedScore).opacity(0.25), lineWidth: 1)
        )
    }

    private func sectionLabel(_ title: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundStyle(NeuroColor.tertiaryText)
                .kerning(1.5)
            Text(subtitle)
                .font(.system(.caption, design: .rounded))
                .foregroundStyle(NeuroColor.secondaryText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var urgencyPicker: some View {
        HStack(spacing: 8) {
            ForEach(1...5, id: \.self) { level in
                Button {
                    withAnimation(.spring(response: 0.3)) {
                        selectedUrgency = level
                    }
                } label: {
                    VStack(spacing: 4) {
                        Text(urgencyEmoji(level))
                            .font(.title2)
                        Text("\(level)")
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                            .foregroundStyle(selectedUrgency == level ? .white : NeuroColor.secondaryText)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(
                        selectedUrgency == level
                        ? AnyShapeStyle(urgencyGradient(level))
                        : AnyShapeStyle(NeuroColor.surfaceOverlay)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var effortPicker: some View {
        HStack(spacing: 8) {
            ForEach(fibValues, id: \.self) { fib in
                Button {
                    withAnimation(.spring(response: 0.3)) {
                        selectedEffort = fib
                    }
                } label: {
                    Text("\(fib)")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(selectedEffort == fib ? .white : NeuroColor.secondaryText)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(
                            selectedEffort == fib
                            ? AnyShapeStyle(NeuroColor.accent)
                            : AnyShapeStyle(NeuroColor.surfaceOverlay)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Helpers

    private func urgencyEmoji(_ level: Int) -> String {
        ["🧊", "🫧", "⚡️", "🔥", "💣"][level - 1]
    }

    private func urgencyGradient(_ level: Int) -> LinearGradient {
        switch level {
        case 5: return NeuroColor.infernoGradient
        case 4: return NeuroColor.criticalGradient
        case 3: return NeuroColor.highGradient
        default: return NeuroColor.mediumGradient
        }
    }

    private func heatColorForScore(_ score: Double) -> Color {
        if score >= 5.0 { return Color(red: 0.85, green: 0.1,  blue: 0.9) }
        if score >= 2.5 { return Color(red: 1.0,  green: 0.4,  blue: 0.0) }
        if score >= 1.0 { return Color(red: 0.95, green: 0.75, blue: 0.1) }
        return NeuroColor.accent
    }

    private func heatIconForScore(_ score: Double) -> String {
        if score >= 5.0 { return "flame.fill" }
        if score >= 2.5 { return "bolt.fill" }
        return "circle.fill"
    }

    private func submit() {
        isSubmitting = true
        onConfirm(selectedUrgency, selectedEffort)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
            dismiss()
        }
    }
}
