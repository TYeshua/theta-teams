import SwiftUI
import Combine

// MARK: - Home ViewModel
@MainActor
final class HomeViewModel: ObservableObject {

    // MARK: Published State
    @Published var tasks:          [NeuroTask]  = []
    @Published var isLoading:      Bool         = false
    @Published var errorMessage:   String?      = nil
    @Published var selectedFilter: TaskStatus?  = nil   // nil = todos

    // Calibrate sheet
    @Published var taskToCalibrate: NeuroTask?  = nil
    @Published var isShowingCalibrate = false

    // Add task sheet
    @Published var isShowingAddTask   = false

    // Inline feedback
    @Published var toastMessage:    String?     = nil

    private let api = APIService()

    // MARK: - Computed
    var filteredTasks: [NeuroTask] {
        guard let filter = selectedFilter else { return tasks }
        return tasks.filter { $0.status == filter.rawValue }
    }

    var headerStats: (onFire: Int, overdue: Int, uncalibrated: Int) {
        let onFire      = tasks.filter { $0.heatLevel == .inferno || $0.heatLevel == .critical }.count
        let overdue     = tasks.filter { $0.isOverdue }.count
        let uncalibrated = tasks.filter { !$0.isCalibrated }.count
        return (onFire, overdue, uncalibrated)
    }

    // MARK: - Actions

    func fetchTasks() async {
        isLoading    = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            tasks = try await api.fetchTasks()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func calibrate(task: NeuroTask, urgency: Int, effort: Int) async {
        do {
            let updated = try await api.calibrateTask(id: task.id, urgency: urgency, effort: effort)
            if let idx = tasks.firstIndex(where: { $0.id == updated.id }) {
                tasks[idx] = updated
            }
            // Re-sort after calibration
            tasks.sort { $0.priorityScore > $1.priorityScore }
            showToast("✦ '\(updated.title)' calibrada — score \(String(format: "%.2f", updated.priorityScore))")
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteTask(_ task: NeuroTask) async {
        do {
            try await api.deleteTask(id: task.id)
            tasks.removeAll { $0.id == task.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func openCalibrate(_ task: NeuroTask) {
        taskToCalibrate    = task
        isShowingCalibrate = true
    }

    private func showToast(_ message: String) {
        toastMessage = message
        Task {
            try? await Task.sleep(for: .seconds(3))
            toastMessage = nil
        }
    }
}
