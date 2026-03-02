/**
 * Document Cache Service
 * Provides in-memory caching for documents info to avoid redundant API calls
 */

type DocumentInfo = any; // Use the actual type from your API response

class DocumentCacheService {
  private cache: DocumentInfo[] | null = null;
  private userId: string | null = null;
  private isLoading: boolean = false;
  private loadingPromise: Promise<DocumentInfo[]> | null = null;

  /**
   * Get documents info with caching
   * If cache exists for the user, return cached data
   * Otherwise, fetch from API and cache the result
   */
  async getDocuments(
    userId: string,
    fetchFn: (userId: string) => Promise<DocumentInfo[]>,
    forceRefresh: boolean = false
  ): Promise<DocumentInfo[]> {
    // If we're already loading, return the existing promise
    if (this.isLoading && this.loadingPromise) {
      return this.loadingPromise;
    }

    // Return cached data if available and user hasn't changed and not forcing refresh
    if (!forceRefresh && this.cache && this.userId === userId) {
      return Promise.resolve(this.cache);
    }

    // Fetch new data
    this.isLoading = true;
    this.loadingPromise = fetchFn(userId)
      .then((data) => {
        this.cache = data;
        this.userId = userId;
        this.isLoading = false;
        this.loadingPromise = null;
        return data;
      })
      .catch((error) => {
        this.isLoading = false;
        this.loadingPromise = null;
        throw error;
      });

    return this.loadingPromise;
  }

  /**
   * Invalidate the cache
   * Call this when you know the data has changed
   */
  invalidate() {
    this.cache = null;
    this.userId = null;
  }

  /**
   * Refresh the cache by fetching new data
   */
  async refresh(
    userId: string,
    fetchFn: (userId: string) => Promise<DocumentInfo[]>
  ): Promise<DocumentInfo[]> {
    return this.getDocuments(userId, fetchFn, true);
  }

  /**
   * Check if cache exists for a user
   */
  hasCache(userId: string): boolean {
    return this.cache !== null && this.userId === userId;
  }

  /**
   * Get cached data without fetching (returns null if no cache)
   */
  getCached(): DocumentInfo[] | null {
    return this.cache;
  }
}

// Export a singleton instance
export const documentCache = new DocumentCacheService();
