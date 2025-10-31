const { createClient } = require('@supabase/supabase-js')
const { SUPABASE_CONFIG } = require('../utils/Constants')

/**
 * UserSubscriptionService
 * Manages user subscription data from Supabase
 * - Fetches subscription status from database
 * - Checks if user has active subscription
 * - Returns subscription tier/plan info
 * - Caches subscription data to reduce queries
 */
class UserSubscriptionService {
  constructor() {
    this.supabase = null
    this.subscriptionCache = new Map() // userId -> { subscription, timestamp }
    this.cacheExpiryMs = 5 * 60 * 1000 // 5 minutes
  }

  /**
   * Initialize the service
   */
  initialize() {
    if (!SUPABASE_CONFIG.URL || !SUPABASE_CONFIG.ANON_KEY) {
      throw new Error('Supabase configuration missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env')
    }

    this.supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY)
    console.log('UserSubscriptionService initialized')
  }

  /**
   * Fetch user's subscription from Supabase
   * @param {string} userId - User UUID
   * @returns {Object|null} Subscription object or null
   */
  async fetchSubscription(userId) {
    try {
      if (!userId) {
        console.warn('fetchSubscription: No userId provided')
        return null
      }

      // Check cache first
      const cached = this.subscriptionCache.get(userId)
      if (cached && Date.now() - cached.timestamp < this.cacheExpiryMs) {
        console.log('Returning cached subscription for user:', userId)
        return cached.subscription
      }

      console.log('Fetching subscription for user:', userId)

      // Query subscriptions table
      const { data, error } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - user has no active subscription
          console.log('No active subscription found for user:', userId)
          this.subscriptionCache.set(userId, { subscription: null, timestamp: Date.now() })
          return null
        }
        console.error('Error fetching subscription:', error)
        return null
      }

      console.log('Subscription fetched:', data?.plan_id, data?.status)

      // Cache the result
      this.subscriptionCache.set(userId, { subscription: data, timestamp: Date.now() })

      return data
    } catch (error) {
      console.error('Error in fetchSubscription:', error)
      return null
    }
  }

  /**
   * Check if user has an active subscription
   * @param {string} userId - User UUID
   * @returns {boolean} True if user has active or trialing subscription
   */
  async isSubscribed(userId) {
    const subscription = await this.fetchSubscription(userId)
    return subscription !== null && ['active', 'trialing'].includes(subscription.status)
  }

  /**
   * Get user's subscription tier
   * @param {string} userId - User UUID
   * @returns {string|null} Plan ID (e.g., 'basic', 'pro', 'agent') or null
   */
  async getSubscriptionTier(userId) {
    const subscription = await this.fetchSubscription(userId)
    return subscription?.plan_id || null
  }

  /**
   * Get subscription details including plan info
   * @param {string} userId - User UUID
   * @returns {Object|null} Full subscription details
   */
  async getSubscriptionDetails(userId) {
    const subscription = await this.fetchSubscription(userId)

    if (!subscription) {
      return null
    }

    return {
      id: subscription.id,
      status: subscription.status,
      plan_id: subscription.plan_id,
      stripe_price_id: subscription.stripe_price_id,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      created_at: subscription.created_at,
      trial_end: subscription.trial_end,
    }
  }

  /**
   * Check if user is on a specific plan
   * @param {string} userId - User UUID
   * @param {string} planId - Plan ID to check (e.g., 'pro', 'agent')
   * @returns {boolean} True if user is on the specified plan
   */
  async isPlan(userId, planId) {
    const tier = await this.getSubscriptionTier(userId)
    return tier === planId
  }

  /**
   * Check if user has access to pro features
   * @param {string} userId - User UUID
   * @returns {boolean} True if user has pro or higher plan
   */
  async hasProAccess(userId) {
    const tier = await this.getSubscriptionTier(userId)
    return tier && ['pro', 'agent'].includes(tier)
  }

  /**
   * Check if user has access to agent features
   * @param {string} userId - User UUID
   * @returns {boolean} True if user has agent plan
   */
  async hasAgentAccess(userId) {
    return await this.isPlan(userId, 'agent')
  }

  /**
   * Invalidate cache for a user (force refresh on next fetch)
   * @param {string} userId - User UUID
   */
  invalidateCache(userId) {
    if (userId) {
      this.subscriptionCache.delete(userId)
      console.log('Cache invalidated for user:', userId)
    } else {
      this.subscriptionCache.clear()
      console.log('Cache cleared for all users')
    }
  }

  /**
   * Refresh subscription data (invalidate cache and fetch fresh)
   * @param {string} userId - User UUID
   * @returns {Object|null} Fresh subscription data
   */
  async refreshSubscription(userId) {
    this.invalidateCache(userId)
    return await this.fetchSubscription(userId)
  }

  /**
   * Get cache statistics (for debugging)
   */
  getCacheStats() {
    return {
      size: this.subscriptionCache.size,
      expiryMs: this.cacheExpiryMs,
      entries: Array.from(this.subscriptionCache.keys()),
    }
  }
}

// Create singleton instance
const userSubscriptionService = new UserSubscriptionService()

module.exports = userSubscriptionService
