export type NormalizedMarketPrice = {
  commodity: string;
  variety?: string;
  market: string;
  state: string;
  district: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  unit: string;
  source: string;
  observedAt: string;
  liveFeed: boolean;
};

export interface GovernmentMarketProvider {
  id: string;
  fetchLatest(): Promise<NormalizedMarketPrice[]>;
}

export class AgmarknetProvider implements GovernmentMarketProvider {
  id = "agmarknet-data-gov";
  constructor(private apiKey: string) {}
  async fetchLatest(): Promise<NormalizedMarketPrice[]> {
    const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${this.apiKey}&format=json&limit=50`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const json = (await r.json()) as { records?: Record<string, string>[] };
    const out: NormalizedMarketPrice[] = [];
    for (const rec of json.records || []) {
      const commodity = rec.commodity || rec.Commodity;
      const modal = Number(rec.modal_price || rec.modalPrice || 0);
      if (!commodity || !modal) continue;
      out.push({
        commodity,
        market: rec.market || rec.Market || "Unknown",
        state: rec.state || rec.State || "",
        district: rec.district || rec.District || "",
        minPrice: Number(rec.min_price || modal),
        maxPrice: Number(rec.max_price || modal),
        modalPrice: modal,
        unit: "Quintal",
        source: "data.gov.in Agmarknet",
        observedAt: new Date(rec.arrival_date || Date.now()).toISOString(),
        liveFeed: true,
      });
    }
    return out;
  }
}

export class StateMarketProvider implements GovernmentMarketProvider {
  id = "state-placeholder";
  async fetchLatest(): Promise<NormalizedMarketPrice[]> {
    return [];
  }
}
