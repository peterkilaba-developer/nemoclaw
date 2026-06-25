import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from './firebase';

const CONTENT_COLLECTION = '_publishedPosts';

/**
 * Fetch all published blog posts, ordered by latest.
 */
export async function getPublishedPosts() {
  try {
    const q = query(
      collection(db, CONTENT_COLLECTION),
      orderBy('publishedAt', 'desc')
    );
    const snap = await getDocs(q);
    const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Filter on client side to avoid needing a composite index
    return docs.filter(doc => doc.status === 'published');
  } catch (error) {
    console.error("Error fetching published posts:", error);
    return [];
  }
}

/**
 * Fetch a single post by slug.
 */
export async function getPostBySlug(slug) {
  try {
    const q = query(
      collection(db, CONTENT_COLLECTION),
      where('slug', '==', slug),
      where('status', '==', 'published')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching post by slug:", error);
    return null;
  }
}
