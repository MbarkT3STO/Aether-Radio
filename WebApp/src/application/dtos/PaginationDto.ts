export interface PaginationDto {
  limit: number
  offset: number
}

export const DEFAULT_PAGINATION: PaginationDto = {
  limit: 30,
  offset: 0
}
