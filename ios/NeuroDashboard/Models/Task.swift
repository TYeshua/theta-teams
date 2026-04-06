import Foundation

// MARK: - Task Model
// Maps 1:1 to the backend's TaskResponse Pydantic schema.
struct NeuroTask: Identifiable, Codable, Equatable {
    let id: Int
    let title: String
    let description: String?
    let category: String
    let dueDate: Date?
    let status: String
    let urgency: Int?
    let effort: Int?
    let priorityScore: Double
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, title, description, category, status, urgency, effort
        case dueDate        = "due_date"
        case priorityScore  = "priority_score"
        case createdAt      = "created_at"
        case updatedAt      = "updated_at"
    }

    // MARK: - Derived Priority Helpers

    /// Classifica a tarefa em um nível de "chamas" baseada no priority_score
    var heatLevel: HeatLevel {
        switch priorityScore {
        case _ where priorityScore >= 10.0: return .inferno   // Atrasado + urgência 5
        case _ where priorityScore >= 5.0:  return .critical  // Muito urgente
        case _ where priorityScore >= 2.5:  return .high      // Alta prioridade
        case _ where priorityScore >= 1.0:  return .medium    // Normal
        default:                             return .low       // Backlog / relaxado
        }
    }

    var isCalibrated: Bool {
        urgency != nil && effort != nil
    }

    var daysRemaining: Double? {
        guard let due = dueDate else { return nil }
        return due.timeIntervalSinceNow / 86400
    }

    var isOverdue: Bool {
        guard let days = daysRemaining else { return false }
        return days < 0
    }
}

// MARK: - Heat Level
enum HeatLevel: String, CaseIterable {
    case inferno  = "Inferno"
    case critical = "Crítico"
    case high     = "Alto"
    case medium   = "Médio"
    case low      = "Baixo"
}

// MARK: - Task Status
enum TaskStatus: String, CaseIterable {
    case backlog = "backlog"
    case todo    = "todo"
    case wip     = "wip"
    case done    = "done"

    var displayName: String {
        switch self {
        case .backlog: return "Backlog"
        case .todo:    return "A fazer"
        case .wip:     return "Em progresso"
        case .done:    return "Concluído"
        }
    }
}

// MARK: - Calibrate Request Body
struct CalibrateRequest: Encodable {
    let urgency: Int
    let effort: Int
}

// MARK: - Create Task Request Body
struct CreateTaskRequest: Encodable {
    let title: String
    let description: String?
    let category: String
    let dueDate: Date?
    let status: String

    enum CodingKeys: String, CodingKey {
        case title, description, category, status
        case dueDate = "due_date"
    }
}
