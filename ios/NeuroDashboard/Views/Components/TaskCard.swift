import SwiftUI

// MARK: - Task Card
// O card principal do app. É o coração visual do THETA.
// Design: glassmorphism escuro com borda colorida pelo calor,
//         sombra glow dinâmica, e indicador de chamas pulsante.

struct TaskCard: View {
    let task: NeuroTask
    let onCalibrate: () -> Void
    let onDelete: () -> Void

    @State private var isPulsing    = false
    @State private var isExpanded   = false
    @State private var showDeleteConfirm = false

    private var heat: HeatLevel { task.heatLevel }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // ── Top Row ──────────────────────────────────────────────
            HStack(alignment: .top, spacing: 12) {
                heatBadge
                VStack(alignment: .leading, spacing: 4) {
                    Text(task.title)
                        .font(.system(.headline, design: .rounded, weight: .semibold))
                        .foregroundStyle(NeuroColor.primaryText)
                        .lineLimit(isExpanded ? nil : 2)
                    categoryChip
                }
                Spacer()
                scoreDisplay
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)

            // ── Deadline Banner (if applicable) ───────────────────────
            if let days = task.daysRemaining {
                deadlineBanner(days: days)
                    .padding(.horizontal, 16)
                    .padding(.top, 10)
            }

            // ── Description (expandable) ──────────────────────────────
            if let desc = task.description, !desc.isEmpty {
                Text(desc)
                    .font(.system(.subheadline, design: .rounded))
                    .foregroundStyle(NeuroColor.secondaryText)
                    .lineLimit(isExpanded ? nil : 2)
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
            }

            // ── Effort / Urgency Meters ────────────────────────────────
            if task.isCalibrated {
                calibrationMeters
                    .padding(.horizontal, 16)
                    .padding(.top, 10)
            }

            Divider()
                .background(Color.white.opacity(0.08))
                .padding(.top, 14)

            // ── Action Bar ────────────────────────────────────────────
            actionBar
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
        }
        .background(cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(borderOverlay)
        .shadow(color: heat.accentColor.opacity(heat.glowOpacity), radius: 18, x: 0, y: 6)
        .onTapGesture { withAnimation(.spring(response: 0.35)) { isExpanded.toggle() } }
        .confirmationDialog("Apagar '\(task.title)'?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
            Button("Apagar", role: .destructive) { onDelete() }
        }
        .onAppear {
            if heat.pulseAnimation { startPulse() }
        }
    }

    // MARK: - Sub-views

    private var heatBadge: some View {
        ZStack {
            Circle()
                .fill(heat.gradient)
                .frame(width: 40, height: 40)
                .scaleEffect(isPulsing ? 1.12 : 1.0)
                .opacity(isPulsing ? 0.85 : 1.0)

            Image(systemName: heat.icon)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(.white)
        }
        .frame(width: 40, height: 40)
    }

    private var categoryChip: some View {
        Text(task.category)
            .font(.system(size: 11, weight: .semibold, design: .monospaced))
            .foregroundStyle(heat.accentColor)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(heat.accentColor.opacity(0.12))
            .clipShape(Capsule())
    }

    private var scoreDisplay: some View {
        VStack(alignment: .trailing, spacing: 2) {
            Text(String(format: "%.2f", task.priorityScore))
                .font(.system(size: 22, weight: .black, design: .rounded))
                .foregroundStyle(
                    task.isCalibrated
                    ? AnyShapeStyle(heat.gradient)
                    : AnyShapeStyle(Color.gray.opacity(0.3))
                )
            Text("SCORE")
                .font(.system(size: 9, weight: .bold, design: .monospaced))
                .foregroundStyle(NeuroColor.tertiaryText)
                .kerning(1.5)
        }
    }

    @ViewBuilder
    private func deadlineBanner(days: Double) -> some View {
        HStack(spacing: 6) {
            Image(systemName: days < 0 ? "alarm.fill" : "clock.fill")
                .font(.system(size: 11, weight: .bold))
            Text(deadlineText(days: days))
                .font(.system(size: 12, weight: .semibold, design: .rounded))
        }
        .foregroundStyle(deadlineColor(days: days))
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(deadlineColor(days: days).opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    private func deadlineText(days: Double) -> String {
        if days < 0 {
            let hours = Int(abs(days) * 24)
            return hours < 24 ? "Atrasada há \(hours)h" : "Atrasada há \(Int(abs(days))) dia(s)"
        } else if days < 1 {
            return "Hoje — \(Int(days * 24))h restantes"
        } else {
            return "\(Int(days)) dia(s) restantes"
        }
    }

    private func deadlineColor(days: Double) -> Color {
        if days < 0   { return Color(red: 1.0, green: 0.2, blue: 0.2) }
        if days < 1   { return Color(red: 1.0, green: 0.5, blue: 0.0) }
        if days < 3   { return Color(red: 1.0, green: 0.85, blue: 0.0) }
        return NeuroColor.secondaryText
    }

    private var calibrationMeters: some View {
        HStack(spacing: 16) {
            meterView(label: "URGÊNCIA", value: task.urgency ?? 0, max: 5, color: heat.accentColor)
            meterView(label: "ESFORÇO",  value: task.effort ?? 0,  max: 8, color: NeuroColor.accent)
        }
    }

    private func meterView(label: String, value: Int, max: Int, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label)
                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                    .foregroundStyle(NeuroColor.tertiaryText)
                    .kerning(1.2)
                Spacer()
                Text("\(value)")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(color)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.white.opacity(0.06))
                        .frame(height: 4)
                    RoundedRectangle(cornerRadius: 3)
                        .fill(color)
                        .frame(width: max > 0 ? geo.size.width * CGFloat(value) / CGFloat(max) : 0,
                               height: 4)
                }
            }
            .frame(height: 4)
        }
        .frame(maxWidth: .infinity)
    }

    private var actionBar: some View {
        HStack(spacing: 8) {
            // Status chip
            Text(TaskStatus(rawValue: task.status)?.displayName ?? task.status)
                .font(.system(size: 11, weight: .semibold, design: .rounded))
                .foregroundStyle(NeuroColor.secondaryText)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(Color.white.opacity(0.06))
                .clipShape(Capsule())

            Spacer()

            // Delete
            Button {
                showDeleteConfirm = true
            } label: {
                Image(systemName: "trash")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Color.white.opacity(0.3))
                    .frame(width: 34, height: 34)
                    .background(Color.white.opacity(0.06))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)

            // Calibrate CTA
            Button(action: onCalibrate) {
                HStack(spacing: 5) {
                    Image(systemName: task.isCalibrated ? "slider.horizontal.3" : "wand.and.stars")
                        .font(.system(size: 13, weight: .semibold))
                    Text(task.isCalibrated ? "Recalibrar" : "Calibrar")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(
                    task.isCalibrated
                    ? AnyShapeStyle(NeuroColor.accent.opacity(0.2))
                    : AnyShapeStyle(heat.gradient)
                )
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .stroke(
                            task.isCalibrated
                            ? AnyShapeStyle(NeuroColor.accent.opacity(0.4))
                            : AnyShapeStyle(Color.clear),
                            lineWidth: 1
                        )
                )
            }
            .buttonStyle(.plain)
        }
    }

    private var cardBackground: some ShapeStyle {
        AnyShapeStyle(
            LinearGradient(
                colors: [
                    NeuroColor.cardBackground,
                    NeuroColor.cardBackground.opacity(0.85)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }

    private var borderOverlay: some View {
        RoundedRectangle(cornerRadius: 20, style: .continuous)
            .stroke(
                LinearGradient(
                    colors: [
                        heat.accentColor.opacity(0.5),
                        heat.accentColor.opacity(0.05)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                lineWidth: 1
            )
    }

    // MARK: - Pulse Animation
    private func startPulse() {
        withAnimation(
            .easeInOut(duration: 1.2)
            .repeatForever(autoreverses: true)
        ) {
            isPulsing = true
        }
    }
}
