import { 
  doc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { handleFirestoreError, OperationType } from './firestoreError';

export interface BudgetSettingsData {
  income?: number;
  budgetTemplate?: 'none' | '50_30_20' | '6_jars' | '10_20_70';
  categoryLimits?: Record<string, number>;
  generatedRecurringMonths?: string[];
}

export const budgetService = {
  subscribeBudgetSettings(
    userId: string, 
    onUpdate: (data: BudgetSettingsData) => void, 
    onError?: (err: Error) => void
  ) {
    const path = `users/${userId}/settings/budget`;
    try {
      const docRef = doc(db, 'users', userId, 'settings', 'budget');

      return onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            onUpdate({
              income: typeof data.income === 'number' ? data.income : undefined,
              budgetTemplate: data.budgetTemplate || undefined,
              categoryLimits: data.categoryLimits || undefined,
              generatedRecurringMonths: data.generatedRecurringMonths || undefined,
            });
          } else {
            // Document doesn't exist yet
            onUpdate({});
          }
        },
        (error) => {
          console.error('Error listening to budget settings:', error);
          if (onError) onError(error);
          handleFirestoreError(error, OperationType.GET, path);
        }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async saveBudgetSettings(
    userId: string, 
    settings: BudgetSettingsData
  ): Promise<void> {
    const docPath = `users/${userId}/settings/budget`;
    try {
      const docRef = doc(db, 'users', userId, 'settings', 'budget');
      await setDoc(docRef, {
        ...settings,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  }
};
