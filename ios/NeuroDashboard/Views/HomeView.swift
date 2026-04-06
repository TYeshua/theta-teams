import SwiftUI

// MARK: - Home View
// Tela principal do Neuro Dashboard.
// Estética: fundo preto profundo, header com estatísticas vitais,
// filter bar horizontal, lista de TaskCards com namespace
// para matched geometry effects.

struct HomeView: View {
    @StateObject private var vm = HomeViewModel()
    @Namespace private var animation

    // Floating Add Button press state
    @State private var isPressedFAB = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // ── Background ────────────────────────────────────────────
            NeuroColor.appBackground.ignoresSafeArea()

            // ── Ambient Noise / Gradient ──────────────────────────────
            ambientBackground

            // ── Main Scroll Content ───────────────────────────────────
            ScrollView(showsIndicators: false) {
                LazyVStack(spacing: 0) {
                    // Header
                    headerSection
                        .padding(.horizontal, 20)
                        .padding(.top, 16)
                        .padding(.bottom, 12)

                    // Filter Bar
                    filterBar
                        .padding(.bottom, 16)

                    // Task List / Empty / Loading
                    taskContent
                        .padding(.horizontal, 16)

                    // Bottom padding (FAB clearance)
                    Spacer(minLength: 100)
                }
            }
            .refreshable { await vm.fetchTasks() }

            // ── Floating Action Button ────────────────────────────────
            fab

            // ── Toast Notification ────────────────────────────────────
            if let toast = vm.toastMessage {
                toastBanner(toast)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .padding(.bottom, 100)
            }
        }
        .task { await vm.fetchTasks() }
        .sheet(isPresented: $vm.isShowingCalibrate) {
            if let task = vm.taskToCalibrate {
                CalibrateSheet(task: task) { urgency, effort in
                    Task { await vm.calibrate(task: task, urgency: urgency, effort: effort) }
                }
            }
        }
        .sheet(isPresented: $vm.isShowingAddTask) {
            AddTaskSheet { request in
                Task {
                    let api = APIService()
                    if let _ = try? await api.createTask(request) {
                        await vm.fetchTasks()
                    }
                }
            }
        }
        .animation(.spring(response: 0.4), value: vm.toastMessage)
        .preferredColorScheme(.dark)
    }

    // MARK: - Ambient Background
    private var ambientBackground: some View {
        GeometryReader { geo in
            ZStack {
                // Top-left purple aura
                Circle()
                    .fill(Color(red: 0.4, green: 0.1, blue: 0.8).opacity(0.12))
                    .frame(width: geo.size.width * 0.7)
                    .blur(radius: 80)
                    .offset(x: -geo.size.width * 0.2, y: -80)

                // Bottom-right ember aura (if urgent tasks exist)
                if vm.headerStats.onFire > 0 {
                    Circle()
                        .fill(Color(red: 1.0, green: 0.3, blue: 0.0).opacity(0.08))
                        .frame(width: geo.size.width * 0.6)
                        .blur(radius: 100)
                        .offset(x: geo.size.width * 0.3, y: geo.size.height * 0.5)
                }
            }
        }
        .ignoresSafeArea()
    }

    // MARK: - Header
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Θ")
                        .font(.system(size: 32, weight: .black, design: .rounded))
                        .foregroundStyle(Color(red: 1.0, green: 0.14, blue: 0.0)) // Scarlet
                    + Text(" THETA")
                        .font(.system(size: 32, weight: .black, design: .rounded))
                        .foregroundStyle(NeuroColor.primaryText)

                    Text(DateFormatter.localizedString(from: Date(), dateStyle: .full, timeStyle: .none))
                        .font(.system(.caption, design: .rounded))
                        .foregroundStyle(NeuroColor.tertiaryText)
                }
                Spacer()

                // Refresh button
                Button {
                    Task { await vm.fetchTasks() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(NeuroColor.accent)
                        .rotationEffect(.degrees(vm.isLoading ? 360 : 0))
                        .animation(
                            vm.isLoading
                            ? .linear(duration: 0.8).repeatForever(autoreverses: false)
                            : .default,
                            value: vm.isLoading
                        )
                }
                .frame(width: 40, height: 40)
                .background(NeuroColor.accent.opacity(0.12))
                .clipShape(Circle())
            }

            // Stats Row
            HStack(spacing: 10) {
                statChip(value: vm.tasks.count,            label: "Tarefas",       icon: "list.bullet",      color: NeuroColor.accent)
                statChip(value: vm.headerStats.onFire,     label: "Em chamas",     icon: "flame.fill",       color: Color(red: 1.0, green: 0.3, blue: 0.0))
                statChip(value: vm.headerStats.overdue,    label: "Atrasadas",     icon: "alarm.fill",       color: Color(red: 1.0, green: 0.2, blue: 0.2))
            }
        }
    }

    private func statChip(value: Int, label: String, icon: String, color: Color) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(color)
            Text("\(value)")
                .font(.system(size: 16, weight: .black, design: .rounded))
                .foregroundStyle(NeuroColor.primaryText)
            Text(label)
                .font(.system(size: 11, design: .rounded))
                .foregroundStyle(NeuroColor.secondaryText)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(color.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(color.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Filter Bar
    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {

                filterChip(label: "Todos", icon: "square.grid.2x2.fill", filter: nil)

                ForEach(TaskStatus.allCases, id: \.rawValue) { status in
                    filterChip(label: status.displayName,
                               icon: statusIcon(status),
                               filter: status)
                }
            }
            .padding(.horizontal, 16)
        }
    }

    private func filterChip(label: String, icon: String, filter: TaskStatus?) -> some View {
        let isSelected = vm.selectedFilter == filter
        return Button {
            withAnimation(.spring(response: 0.3)) {
                vm.selectedFilter = filter
            }
        } label: {
            HStack(spacing: 5) {
                Image(systemName: icon)
                    .font(.system(size: 11, weight: .semibold))
                Text(label)
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
            }
            .foregroundStyle(isSelected ? .white : NeuroColor.secondaryText)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(isSelected ? AnyShapeStyle(NeuroColor.accent) : AnyShapeStyle(NeuroColor.surfaceOverlay))
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private func statusIcon(_ status: TaskStatus) -> String {
        switch status {
        case .backlog: return "tray.fill"
        case .todo:    return "checkmark.circle"
        case .wip:     return "bolt.fill"
        case .done:    return "checkmark.seal.fill"
        }
    }

    // MARK: - Task Content

    @ViewBuilder
    private var taskContent: some View {
        if vm.isLoading && vm.tasks.isEmpty {
            loadingView
        } else if let error = vm.errorMessage {
            errorView(error)
        } else if vm.filteredTasks.isEmpty {
            emptyView
        } else {
            LazyVStack(spacing: 14) {
                ForEach(vm.filteredTasks) { task in
                    TaskCard(
                        task: task,
                        onCalibrate: { vm.openCalibrate(task) },
                        onDelete: { Task { await vm.deleteTask(task) } }
                    )
                    .matchedGeometryEffect(id: task.id, in: animation)
                    .transition(.asymmetric(
                        insertion: .scale(scale: 0.95).combined(with: .opacity),
                        removal:   .scale(scale: 0.95).combined(with: .opacity)
                    ))
                }
            }
            .animation(.spring(response: 0.4, dampingFraction: 0.8), value: vm.filteredTasks.map(\.id))
        }
    }

    private var loadingView: some View {
        VStack(spacing: 16) {
            ForEach(0..<3, id: \.self) { _ in
                skeletonCard
            }
        }
    }

    private var skeletonCard: some View {
        RoundedRectangle(cornerRadius: 20, style: .continuous)
            .fill(NeuroColor.cardBackground)
            .frame(height: 140)
            .overlay(
                LinearGradient(
                    colors: [Color.clear,
                             Color.white.opacity(0.05),
                             Color.clear],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .shimmer()
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 48, weight: .thin))
                .foregroundStyle(Color(red: 1.0, green: 0.3, blue: 0.3))

            Text("Erro de conexão")
                .font(.system(.headline, design: .rounded, weight: .bold))
                .foregroundStyle(NeuroColor.primaryText)

            Text(message)
                .font(.system(.caption, design: .rounded))
                .foregroundStyle(NeuroColor.secondaryText)
                .multilineTextAlignment(.center)

            // ⚠️ Atenção ao testar no iPhone físico:
            // Troque "127.0.0.1" pelo IP local do Mac na rede Wi-Fi.
            // Ex: http://192.168.1.100:8000
            Text("💡 Dica: No iPhone físico, use o IP local do seu Mac (ex: 192.168.x.x:8000)")
                .font(.system(size: 11, design: .rounded))
                .foregroundStyle(Color(red: 1.0, green: 0.75, blue: 0.0).opacity(0.8))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 8)
                .padding(10)
                .background(Color(red: 1.0, green: 0.75, blue: 0.0).opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 10))

            Button("Tentar novamente") {
                Task { await vm.fetchTasks() }
            }
            .foregroundStyle(NeuroColor.accent)
            .font(.system(.subheadline, design: .rounded, weight: .semibold))
        }
        .padding(32)
    }

    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "brain.fill")
                .font(.system(size: 52, weight: .thin))
                .foregroundStyle(NeuroColor.accent.opacity(0.5))
            Text("Backlog limpo")
                .font(.system(.title3, design: .rounded, weight: .bold))
                .foregroundStyle(NeuroColor.primaryText)
            Text("Sua mente está em paz. Por enquanto.")
                .font(.system(.subheadline, design: .rounded))
                .foregroundStyle(NeuroColor.secondaryText)
        }
        .padding(.top, 60)
    }

    // MARK: - FAB (Floating Action Button)
    private var fab: some View {
        Button {
            vm.isShowingAddTask = true
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "plus")
                    .font(.system(size: 16, weight: .bold))
                Text("Nova Tarefa")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 16)
            .background(NeuroColor.infernoGradient)
            .clipShape(Capsule())
            .shadow(color: Color(red: 0.55, green: 0.0, blue: 0.9).opacity(0.5), radius: 16, y: 8)
            .scaleEffect(isPressedFAB ? 0.95 : 1.0)
        }
        .buttonStyle(.plain)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in withAnimation(.spring()) { isPressedFAB = true }  }
                .onEnded   { _ in withAnimation(.spring()) { isPressedFAB = false } }
        )
        .padding(.bottom, 32)
    }

    // MARK: - Toast
    private func toastBanner(_ message: String) -> some View {
        Text(message)
            .font(.system(.subheadline, design: .rounded, weight: .medium))
            .foregroundStyle(.white)
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(.ultraThinMaterial)
            .clipShape(Capsule())
            .shadow(color: .black.opacity(0.3), radius: 10, y: 4)
            .padding(.horizontal, 24)
    }
}

// MARK: - Shimmer Effect Modifier
private struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = -1.5

    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geo in
                    LinearGradient(
                        colors: [.clear, Color.white.opacity(0.07), .clear],
                        startPoint: .leading, endPoint: .trailing
                    )
                    .frame(width: geo.size.width * 2)
                    .offset(x: geo.size.width * phase)
                }
                .clipped()
            )
            .onAppear {
                withAnimation(.linear(duration: 1.4).repeatForever(autoreverses: false)) {
                    phase = 1.5
                }
            }
    }
}

private extension View {
    func shimmer() -> some View { modifier(ShimmerModifier()) }
}

// MARK: - Placeholder Add Task Sheet
// Minimal sheet for quick-adding a task. Expandir nas próximas iterações.
struct AddTaskSheet: View {
    let onAdd: (CreateTaskRequest) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var title       = ""
    @State private var category    = "Pesquisa"
    @State private var description = ""
    @State private var hasDueDate  = false
    @State private var dueDate     = Date().addingTimeInterval(86400 * 3)

    private let categories = ["Pesquisa", "Graduação 1", "Graduação 2", "Pessoal", "Geral"]

    var body: some View {
        NavigationStack {
            ZStack {
                NeuroColor.appBackground.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        Text("Nova Tarefa")
                            .font(.system(.title2, design: .rounded, weight: .bold))
                            .foregroundStyle(NeuroColor.primaryText)
                            .padding(.top, 8)

                        // Title
                        fieldGroup(label: "TÍTULO") {
                            TextField("Ex: Ler artigo sobre Machine Learning", text: $title)
                                .textFieldStyle(NeuroFieldStyle())
                        }

                        // Category
                        fieldGroup(label: "CATEGORIA") {
                            Picker("Categoria", selection: $category) {
                                ForEach(categories, id: \.self) { Text($0).tag($0) }
                            }
                            .pickerStyle(.segmented)
                        }

                        // Description
                        fieldGroup(label: "DESCRIÇÃO (opcional)") {
                            TextField("Notas adicionais...", text: $description, axis: .vertical)
                                .textFieldStyle(NeuroFieldStyle())
                                .lineLimit(3...6)
                        }

                        // Due Date
                        fieldGroup(label: "PRAZO") {
                            Toggle("Definir prazo", isOn: $hasDueDate)
                                .tint(NeuroColor.accent)
                                .foregroundStyle(NeuroColor.primaryText)

                            if hasDueDate {
                                DatePicker("", selection: $dueDate, displayedComponents: [.date, .hourAndMinute])
                                    .datePickerStyle(.compact)
                                    .colorScheme(.dark)
                                    .accentColor(NeuroColor.accent)
                            }
                        }

                        Button(action: submit) {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                Text("Adicionar ao Backlog")
                                    .fontWeight(.bold)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(NeuroColor.accent)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        }
                        .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                        .opacity(title.trimmingCharacters(in: .whitespaces).isEmpty ? 0.5 : 1)

                        Spacer(minLength: 40)
                    }
                    .padding(.horizontal, 24)
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancelar") { dismiss() }
                        .foregroundStyle(NeuroColor.accent)
                }
            }
        }
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(28)
        .preferredColorScheme(.dark)
    }

    private func fieldGroup<Content: View>(label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundStyle(NeuroColor.tertiaryText)
                .kerning(1.5)
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func submit() {
        let req = CreateTaskRequest(
            title:       title.trimmingCharacters(in: .whitespaces),
            description: description.isEmpty ? nil : description,
            category:    category,
            dueDate:     hasDueDate ? dueDate : nil,
            status:      "backlog"
        )
        onAdd(req)
        dismiss()
    }
}

// MARK: - Custom TextField Style
struct NeuroFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(14)
            .background(NeuroColor.cardBackground)
            .foregroundStyle(NeuroColor.primaryText)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
    }
}

// MARK: - Preview
#Preview {
    HomeView()
}
