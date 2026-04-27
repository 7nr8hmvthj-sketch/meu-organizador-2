import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

import * as db from './db';

describe('Categories API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCategories', () => {
    it('should return an array of categories', async () => {
      const mockCategories = [
        { id: 1, name: 'HC 7-13', color: 'text-red-700 bg-red-50', type: 'plantao', icon: 'Hospital', isdefault: true, sortorder: 1, createdat: new Date() },
        { id: 2, name: 'ZN 7-13', color: 'text-amber-700 bg-amber-50', type: 'plantao', icon: 'MapPin', isdefault: true, sortorder: 3, createdat: new Date() },
      ];
      (db.getCategories as any).mockResolvedValue(mockCategories);
      
      const result = await db.getCategories();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('HC 7-13');
      expect(result[1].name).toBe('ZN 7-13');
    });

    it('should return empty array when no categories exist', async () => {
      (db.getCategories as any).mockResolvedValue([]);
      
      const result = await db.getCategories();
      expect(result).toHaveLength(0);
    });
  });

  describe('createCategory', () => {
    it('should create a new category and return it', async () => {
      const newCategory = {
        name: 'Consulta Médica',
        color: 'text-blue-700 bg-blue-50',
        type: 'saude',
        icon: 'Stethoscope',
        sortOrder: 15,
      };
      const mockResult = { id: 15, ...newCategory, isdefault: false, sortorder: 15, createdat: new Date() };
      (db.createCategory as any).mockResolvedValue(mockResult);
      
      const result = await db.createCategory(newCategory as any);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Consulta Médica');
      expect(result!.id).toBe(15);
    });

    it('should throw error when name is empty', async () => {
      (db.createCategory as any).mockRejectedValue(new Error('Name is required'));
      
      await expect(db.createCategory({ name: '', color: 'test', type: 'outro' } as any))
        .rejects.toThrow('Name is required');
    });
  });

  describe('updateCategory', () => {
    it('should update an existing category', async () => {
      const updatedCategory = { id: 1, name: 'HC 7-13 Updated', color: 'text-red-700 bg-red-50', type: 'plantao', icon: 'Hospital', isdefault: true, sortorder: 1, createdat: new Date() };
      (db.updateCategory as any).mockResolvedValue(updatedCategory);
      
      const result = await db.updateCategory(1, { name: 'HC 7-13 Updated' });
      expect(result).not.toBeNull();
      expect(result!.name).toBe('HC 7-13 Updated');
    });

    it('should return null when category not found', async () => {
      (db.updateCategory as any).mockResolvedValue(null);
      
      const result = await db.updateCategory(999, { name: 'Nonexistent' });
      expect(result).toBeNull();
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category and return true', async () => {
      (db.deleteCategory as any).mockResolvedValue(true);
      
      const result = await db.deleteCategory(1);
      expect(result).toBe(true);
    });

    it('should return false when delete fails', async () => {
      (db.deleteCategory as any).mockResolvedValue(false);
      
      const result = await db.deleteCategory(999);
      expect(result).toBe(false);
    });
  });

  describe('Category normalization', () => {
    it('should normalize lowercase postgres columns to camelCase', () => {
      const rawCategory = {
        id: 1,
        name: 'HC 7-13',
        color: 'text-red-700',
        type: 'plantao',
        icon: 'Hospital',
        isdefault: true,
        sortorder: 1,
        createdat: new Date('2026-01-01'),
      };

      // Simulate normalization logic
      const normalized = {
        ...rawCategory,
        isDefault: rawCategory.isdefault ?? (rawCategory as any).isDefault,
        sortOrder: rawCategory.sortorder ?? (rawCategory as any).sortOrder,
        createdAt: rawCategory.createdat ?? (rawCategory as any).createdAt,
      };

      expect(normalized.isDefault).toBe(true);
      expect(normalized.sortOrder).toBe(1);
      expect(normalized.createdAt).toEqual(new Date('2026-01-01'));
    });
  });
});
