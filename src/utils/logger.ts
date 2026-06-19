import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * Logs a user interaction safely to the Firestore 'interactions' collection
 */
export async function logUserInteraction(
  actionType: string,
  detailsObj: Record<string, any>
): Promise<void> {
  const interactionId = "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
  const path = `interactions/${interactionId}`;

  try {
    const userId = auth.currentUser?.uid || "anonymous";
    const userEmail = auth.currentUser?.email || "anonymous";

    await setDoc(doc(collection(db, "interactions"), interactionId), {
      id: interactionId,
      userId,
      userEmail,
      actionType,
      details: JSON.stringify(detailsObj),
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    // Gracefully catch and run standard custom error logger
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
