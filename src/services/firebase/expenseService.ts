import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Expense } from '../../types';
import { handleFirestoreError, OperationType } from './firestoreError';

export const expenseService = {
  subscribeExpenses(
    userId: string, 
    onUpdate: (expenses: Expense[]) => void, 
    onError?: (err: Error) => void
  ) {
    const path = `users/${userId}/expenses`;
    try {
      const colRef = collection(db, 'users', userId, 'expenses');
      const q = query(colRef, orderBy('date', 'desc'));

      return onSnapshot(
        q,
        (snapshot) => {
          const expenses: Expense[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              amount: Number(data.amount) || 0,
              categoryId: data.categoryId || 'khac',
              note: data.note || '',
              date: data.date || new Date().toISOString().split('T')[0],
            };
          });
          onUpdate(expenses);
        },
        (error) => {
          console.error('Error listening to expenses:', error);
          if (onError) onError(error);
          handleFirestoreError(error, OperationType.GET, path);
        }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async addExpense(userId: string, expense: Omit<Expense, 'id'>): Promise<Expense> {
    const colRef = collection(db, 'users', userId, 'expenses');
    const newDocRef = doc(colRef);
    const id = newDocRef.id;
    const newExpense: Expense = { ...expense, id };

    try {
      await setDoc(newDocRef, {
        amount: newExpense.amount,
        categoryId: newExpense.categoryId,
        note: newExpense.note,
        date: newExpense.date,
        createdAt: new Date().toISOString(),
      });
      return newExpense;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${userId}/expenses/${id}`);
    }
  },

  async updateExpense(userId: string, expense: Expense): Promise<void> {
    const docPath = `users/${userId}/expenses/${expense.id}`;
    try {
      const docRef = doc(db, 'users', userId, 'expenses', expense.id);
      await updateDoc(docRef, {
        amount: expense.amount,
        categoryId: expense.categoryId,
        note: expense.note,
        date: expense.date,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  },

  async deleteExpense(userId: string, expenseId: string): Promise<void> {
    const docPath = `users/${userId}/expenses/${expenseId}`;
    try {
      const docRef = doc(db, 'users', userId, 'expenses', expenseId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  }
};
