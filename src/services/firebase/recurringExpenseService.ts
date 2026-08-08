import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { RecurringExpense } from '../../types';
import { handleFirestoreError, OperationType } from './firestoreError';

export const recurringExpenseService = {
  subscribeRecurringExpenses(
    userId: string, 
    onUpdate: (items: RecurringExpense[]) => void, 
    onError?: (err: Error) => void
  ) {
    const path = `users/${userId}/recurringExpenses`;
    try {
      const colRef = collection(db, 'users', userId, 'recurringExpenses');

      return onSnapshot(
        colRef,
        (snapshot) => {
          const items: RecurringExpense[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              amount: Number(data.amount) || 0,
              categoryId: data.categoryId || 'khac',
              dayOfMonth: Number(data.dayOfMonth) || 1,
              note: data.note || '',
            };
          });
          onUpdate(items);
        },
        (error) => {
          console.error('Error listening to recurringExpenses:', error);
          if (onError) onError(error);
          handleFirestoreError(error, OperationType.GET, path);
        }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async addRecurringExpense(userId: string, item: Omit<RecurringExpense, 'id'>): Promise<RecurringExpense> {
    const colRef = collection(db, 'users', userId, 'recurringExpenses');
    const newDocRef = doc(colRef);
    const id = newDocRef.id;
    const newItem: RecurringExpense = { ...item, id };

    try {
      await setDoc(newDocRef, {
        amount: newItem.amount,
        categoryId: newItem.categoryId,
        dayOfMonth: newItem.dayOfMonth,
        note: newItem.note,
        createdAt: new Date().toISOString(),
      });
      return newItem;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${userId}/recurringExpenses/${id}`);
    }
  },

  async updateRecurringExpense(userId: string, item: RecurringExpense): Promise<void> {
    const docPath = `users/${userId}/recurringExpenses/${item.id}`;
    try {
      const docRef = doc(db, 'users', userId, 'recurringExpenses', item.id);
      await updateDoc(docRef, {
        amount: item.amount,
        categoryId: item.categoryId,
        dayOfMonth: item.dayOfMonth,
        note: item.note,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  },

  async deleteRecurringExpense(userId: string, itemId: string): Promise<void> {
    const docPath = `users/${userId}/recurringExpenses/${itemId}`;
    try {
      const docRef = doc(db, 'users', userId, 'recurringExpenses', itemId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  }
};
