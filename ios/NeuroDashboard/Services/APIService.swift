import Foundation

// MARK: - API Errors
enum APIError: Error, LocalizedError {
    case invalidURL
    case networkError(Error)
    case decodingError(Error)
    case serverError(Int, String?)
    case noData

    var errorDescription: String? {
        switch self {
        case .invalidURL:            return "URL inválida."
        case .networkError(let e):   return "Erro de rede: \(e.localizedDescription)"
        case .decodingError(let e):  return "Falha ao decodificar resposta: \(e.localizedDescription)"
        case .serverError(let c, let msg): return "Erro \(c): \(msg ?? "sem detalhes")"
        case .noData:                return "Sem dados na resposta."
        }
    }
}

// MARK: - API Service
@MainActor
final class APIService: ObservableObject {

    // MARK: Config
    // Em produção/TestFlight, troque para o IP local do Mac na rede Wi-Fi,
    // pois o iPhone não alcança 127.0.0.1 do backend rodando no Mac.
    // Ex: "http://192.168.1.100:8000"
    static let baseURL = "http://100.64.176.109:8000/tasks/"

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest  = 15
        config.timeoutIntervalForResource = 30
        session = URLSession(configuration: config)

        decoder = JSONDecoder()
        // O backend retorna datas como ISO-8601 com fuso (ex: "2026-04-05T15:00:00")
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let string    = try container.decode(String.self)
            let formatters: [DateFormatter] = [
                .iso8601Full,
                .iso8601WithoutZ,
                .iso8601NoFraction
            ]
            for fmt in formatters {
                if let date = fmt.date(from: string) { return date }
            }
            throw DecodingError.dataCorruptedError(in: container,
                debugDescription: "Formato de data desconhecido: \(string)")
        }

        encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
    }

    // MARK: - GET /tasks/
    func fetchTasks() async throws -> [NeuroTask] {
        let url = try makeURL("/tasks/")
        let (data, response) = try await session.data(from: url)
        try validate(response: response, data: data)
        return try decode([NeuroTask].self, from: data)
    }

    // MARK: - POST /tasks/
    func createTask(_ request: CreateTaskRequest) async throws -> NeuroTask {
        let url  = try makeURL("/tasks/")
        var req  = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody   = try encoder.encode(request)
        let (data, response) = try await session.data(for: req)
        try validate(response: response, data: data)
        return try decode(NeuroTask.self, from: data)
    }

    // MARK: - PUT /tasks/{id}/calibrate
    func calibrateTask(id: Int, urgency: Int, effort: Int) async throws -> NeuroTask {
        let url  = try makeURL("/tasks/\(id)/calibrate")
        var req  = URLRequest(url: url)
        req.httpMethod = "PUT"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody   = try encoder.encode(CalibrateRequest(urgency: urgency, effort: effort))
        let (data, response) = try await session.data(for: req)
        try validate(response: response, data: data)
        return try decode(NeuroTask.self, from: data)
    }

    // MARK: - DELETE /tasks/{id}
    func deleteTask(id: Int) async throws {
        let url  = try makeURL("/tasks/\(id)")
        var req  = URLRequest(url: url)
        req.httpMethod = "DELETE"
        let (_, response) = try await session.data(for: req)
        try validate(response: response, data: nil)
    }

    // MARK: - Helpers

    private func makeURL(_ path: String) throws -> URL {
        guard let url = URL(string: APIService.baseURL + path) else {
            throw APIError.invalidURL
        }
        return url
    }

    private func validate(response: URLResponse, data: Data?) throws {
        guard let http = response as? HTTPURLResponse else { return }
        guard (200...299).contains(http.statusCode) else {
            let msg = data.flatMap { String(data: $0, encoding: .utf8) }
            throw APIError.serverError(http.statusCode, msg)
        }
    }

    private func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        do {
            return try decoder.decode(type, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }
}

// MARK: - DateFormatter Extensions
private extension DateFormatter {
    static let iso8601Full: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
        f.locale     = Locale(identifier: "en_US_POSIX")
        f.timeZone   = TimeZone(secondsFromGMT: 0)
        return f
    }()

    static let iso8601WithoutZ: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        f.locale     = Locale(identifier: "en_US_POSIX")
        f.timeZone   = TimeZone(secondsFromGMT: 0)
        return f
    }()

    static let iso8601NoFraction: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd'T'HH:mm:ssZ"
        f.locale     = Locale(identifier: "en_US_POSIX")
        return f
    }()
}
