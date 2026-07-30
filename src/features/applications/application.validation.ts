import { VALID_STATUSES, VALID_SOURCES } from "./application.constants"
import type { CreateApplicationDto, UpdateApplicationDto } from "./application.types"

export function validateCreateApplication(data: Partial<CreateApplicationDto>): { isValid: boolean; error?: string } {
  const requiredFields: (keyof CreateApplicationDto)[] = [
    "companyName",
    "jobTitle",
    "applicationDate",
    "status",
    "source",
  ]

  for (const field of requiredFields) {
    if (!data[field]) {
      return { isValid: false, error: `${field} is required` }
    }
  }

  if (data.status && !VALID_STATUSES.includes(data.status as typeof VALID_STATUSES[number])) {
    return {
      isValid: false,
      error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
    }
  }

  if (data.source && !VALID_SOURCES.includes(data.source as typeof VALID_SOURCES[number])) {
    return {
      isValid: false,
      error: `Invalid source. Must be one of: ${VALID_SOURCES.join(", ")}`,
    }
  }

  return { isValid: true }
}

export function validateUpdateApplication(data: UpdateApplicationDto): { isValid: boolean; error?: string } {
  if (data.status && !VALID_STATUSES.includes(data.status as typeof VALID_STATUSES[number])) {
    return {
      isValid: false,
      error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
    }
  }

  if (data.source && !VALID_SOURCES.includes(data.source as typeof VALID_SOURCES[number])) {
    return {
      isValid: false,
      error: `Invalid source. Must be one of: ${VALID_SOURCES.join(", ")}`,
    }
  }

  return { isValid: true }
}
