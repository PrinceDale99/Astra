export class OracleService {
  private cache: { timestamp: number; data: any } | null = null;
  private readonly CACHE_TTL_MS = 60000; // 60 seconds

  public async getRates() {
    const now = Date.now();
    
    if (this.cache && (now - this.cache.timestamp < this.CACHE_TTL_MS)) {
      return this.cache.data;
    }

    try {
      // Fetch live XLM price from CoinGecko API
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd');
      
      if (!response.ok) {
         throw new Error(`Oracle HTTP error: ${response.status}`);
      }
      
      const json = await response.json();
      const xlmUsd = json.stellar.usd;
      const yldsUsd = 1.00; // YLDS is pegged to a $1 Treasury bill

      const rates = {
        xlm_usd: xlmUsd,
        ylds_usd: yldsUsd,
        implied_ratio_xlm_ylds: yldsUsd / xlmUsd,
        timestamp: now
      };

      this.cache = {
        timestamp: now,
        data: rates
      };

      return rates;
    } catch (error) {
      console.error('Failed to fetch Oracle rates:', error);
      // Fallback to stale cache if available
      if (this.cache) return this.cache.data;
      throw new Error('Oracle service unavailable');
    }
  }
}
