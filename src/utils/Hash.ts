import * as bcrypt from 'bcrypt';

export class Hash {
  /**
   * Create a hash from a plain text value
   * @param value - The plain text value to hash
   * @returns The hashed value
   */
  static make(value: string): string {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(value, salt);
  }

  /**
   * Check if a plain text value matches a hash
   * @param value - The plain text value to check
   * @param hashedValue - The hash to check against
   * @returns True if the value matches the hash, false otherwise
   */
  static check(value: string, hashedValue: string): boolean {
    return bcrypt.compareSync(value, hashedValue);
  }

  /**
   * Alias for check method
   * @param value - The plain text value to check
   * @param hashedValue - The hash to check against
   * @returns True if the value matches the hash, false otherwise
   */
  static compare(value: string, hashedValue: string): boolean {
    return Hash.check(value, hashedValue);
  }
}
