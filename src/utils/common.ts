export function convertPageToSkipTake(page: number, size: number): { skip: number; take: number } {
  const skip = (page - 1) * size;
  const take = size;
  return { skip, take };
}

export class Pagination {
  itemCount: number;
  totalItems: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;

  constructor(itemCount: number, totalItems: number, itemsPerPage: number, totalPages: number, currentPage: number) {
    this.itemCount = itemCount; // number of items in the current page
    this.totalItems = totalItems; // total number of items
    this.itemsPerPage = itemsPerPage; // number of items per page
    this.totalPages = totalPages; // total number of pages
    this.currentPage = currentPage; // current page number
  }
}

export function generatePageMeta(numberOfItems: number, pageSize: number, currentPage: number): Pagination {
  if (numberOfItems === 0) {
    return new Pagination(0, 0, pageSize, 0, 1);
  }

  const totalPages = Math.ceil(numberOfItems / pageSize);
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const isLastPage = validCurrentPage === totalPages;
  const itemCount = isLastPage ? numberOfItems % pageSize || pageSize : pageSize;

  return new Pagination(itemCount, numberOfItems, pageSize, totalPages, validCurrentPage);
}

export function convertSortStringToObject(sort: string): {
  fieldName: string;
  order: string;
} | null {
  if (!sort) {
    return null;
  }

  if (!new RegExp(/^[a-zA-Z0-9_]+:(asc|desc)$/).test(sort)) {
    throw new Error('Sort field must be in format: field_name:asc or field_name:desc');
  }

  const [field, order] = sort.split(':');
  return {
    fieldName: field,
    order: order,
  };
}

export function isValidNumber(value: any): boolean {
  if (value === undefined || value === null) return false;

  // Handle string conversion
  const num = typeof value === 'string' ? Number(value) : value;

  // Check if it's a valid number
  return typeof num === 'number' && !isNaN(num) && isFinite(num);
}

export function validateNumericField(value: any, fieldName: string): number {
  // Check if value is undefined or null
  if (value === undefined || value === null) {
    throw new Error(`${fieldName} is required`);
  }

  // Convert to number if it's a string
  const numValue = typeof value === 'string' ? Number(value) : value;

  // Check if it's a valid number
  if (isNaN(numValue) || !isFinite(numValue)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  return numValue;
}
