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
import { Goal } from '../../types';
import { handleFirestoreError, OperationType } from './firestoreError';

export const goalService = {
  subscribeGoals(
    userId: string, 
    onUpdate: (goals: Goal[]) => void, 
    onError?: (err: Error) => void
  ) {
    const path = `users/${userId}/goals`;
    try {
      const colRef = collection(db, 'users', userId, 'goals');
      const q = query(colRef, orderBy('createdAt', 'desc'));

      return onSnapshot(
        q,
        (snapshot) => {
          const goals: Goal[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              name: data.name || '',
              target: Number(data.target) || 0,
              current: Number(data.current) || 0,
              createdAt: data.createdAt || new Date().toISOString().split('T')[0],
            };
          });
          onUpdate(goals);
        },
        (error) => {
          console.error('Error listening to goals:', error);
          if (onError) onError(error);
          handleFirestoreError(error, OperationType.GET, path);
        }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async addGoal(userId: string, goal: Omit<Goal, 'id'>): Promise<Goal> {
    const colRef = collection(db, 'users', userId, 'goals');
    const newDocRef = doc(colRef);
    const id = newDocRef.id;
    const newGoal: Goal = { ...goal, id };

    try {
      await setDoc(newDocRef, {
        name: newGoal.name,
        target: newGoal.target,
        current: newGoal.current,
        createdAt: newGoal.createdAt,
        updatedAt: new Date().toISOString(),
      });
      return newGoal;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${userId}/goals/${id}`);
    }
  },

  async updateGoal(userId: string, goal: Goal): Promise<void> {
    const docPath = `users/${userId}/goals/${goal.id}`;
    try {
      const docRef = doc(db, 'users', userId, 'goals', goal.id);
      await updateDoc(docRef, {
        name: goal.name,
        target: goal.target,
        current: goal.current,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  },

  async deleteGoal(userId: string, goalId: string): Promise<void> {
    const docPath = `users/${userId}/goals/${goalId}`;
    try {
      const docRef = doc(db, 'users', userId, 'goals', goalId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  }
};
