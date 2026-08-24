import { ApplicationRepository } from "./application.repository"
import { validateCreateApplication, validateUpdateApplication } from "./application.validation"
import { invalidateCache } from "@/lib/redis"
import type {
  ApplicationQueryFilters,
  CreateApplicationDto,
  UpdateApplicationDto,
} from "./application.types"

export class ApplicationService {
  static async listApplications(userId: string, filters: ApplicationQueryFilters) {
    return ApplicationRepository.findManyByUser(userId, filters)
  }

  static async getApplication(userId: string, id: string) {
    const application = await ApplicationRepository.findById(id)
    if (!application) {
      return { error: "Not found", status: 404 }
    }
    if (application.userId !== userId) {
      return { error: "Unauthorized", status: 403 }
    }
    return { data: application }
  }

  static async createApplication(userId: string, data: Partial<CreateApplicationDto>) {
    const validation = validateCreateApplication(data)
    if (!validation.isValid) {
      return { error: validation.error, status: 400 }
    }

    // Check for duplicate application (same company + job title)
    const existing = await ApplicationRepository.findDuplicate(
      userId,
      (data as CreateApplicationDto).companyName,
      (data as CreateApplicationDto).jobTitle
    )
    if (existing) {
      return {
        error: `You already have an application for "${existing.jobTitle}" at "${existing.companyName}" (status: ${existing.status})`,
        status: 409,
      }
    }

    const application = await ApplicationRepository.create(userId, data as CreateApplicationDto)
    void invalidateCache(`user:stats:${userId}`)
    return { data: application, status: 201 }
  }

  static async updateApplication(userId: string, id: string, data: UpdateApplicationDto) {
    const existing = await ApplicationRepository.findById(id)
    if (!existing) {
      return { error: "Not found", status: 404 }
    }
    if (existing.userId !== userId) {
      return { error: "Unauthorized", status: 403 }
    }

    const validation = validateUpdateApplication(data)
    if (!validation.isValid) {
      return { error: validation.error, status: 400 }
    }

    const updated = await ApplicationRepository.update(id, existing.status, data)
    void invalidateCache(`user:stats:${userId}`)
    return { data: updated, status: 200 }
  }

  static async deleteApplication(userId: string, id: string) {
    const existing = await ApplicationRepository.findById(id)
    if (!existing) {
      return { error: "Not found", status: 404 }
    }
    if (existing.userId !== userId) {
      return { error: "Unauthorized", status: 403 }
    }

    await ApplicationRepository.delete(id)
    void invalidateCache(`user:stats:${userId}`)
    return { success: true, status: 200 }
  }
}
