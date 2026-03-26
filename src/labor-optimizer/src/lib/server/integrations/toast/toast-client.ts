/**
 * Toast POS API Client
 *
 * Handles authentication and data retrieval from Toast's REST API.
 * Docs: https://doc.toasttab.com/openapi/
 */

interface ToastConfig {
	clientId: string;
	clientSecret: string;
	apiKey: string;
	restaurantGuid: string;
	baseUrl?: string;
}

interface ToastOrder {
	guid: string;
	entityType: string;
	openedDate: string;
	closedDate?: string;
	totalAmount: number;
	numberOfGuests: number;
	server?: { guid: string; firstName: string; lastName: string };
}

interface ToastTimeEntry {
	guid: string;
	employeeGuid: string;
	jobGuid: string;
	inDate: string;
	outDate?: string;
	regularHours: number;
	overtimeHours: number;
	hourlyWage: number;
}

interface ToastLaborSummary {
	date: string;
	totalLaborCost: number;
	totalHours: number;
	overtimeHours: number;
	overtimeCost: number;
}

export interface SalesMixEntry {
	category: string;
	revenue: number;
	itemCount: number;
	pctOfTotal: number;
}

export interface PmixEntry {
	itemName: string;
	itemGuid: string | null;
	category: string;
	quantity: number;
	revenue: number;
	avgPrice: number;
}

export interface HourlySalesEntry {
	hour: number;
	revenue: number;
	covers: number;
	orderCount: number;
}

export interface DaySummary {
	totalRevenue: number;
	totalCovers: number;
	orderCount: number;
	totalDiscounts: number;
	totalComps: number;
	salesMix: SalesMixEntry[];
	pmix: PmixEntry[];
}

export class ToastClient {
	private config: ToastConfig;
	private accessToken: string | null = null;
	private tokenExpiry: number = 0;
	private menuCategoryCache: Map<string, string> | null = null;

	constructor(config: ToastConfig) {
		this.config = {
			...config,
			baseUrl: config.baseUrl || 'https://ws-api.toasttab.com',
		};
	}

	private authResponse: any = null;

	/** Authenticate with Toast API using client credentials */
	private async authenticate(): Promise<string> {
		if (this.accessToken && Date.now() < this.tokenExpiry) {
			return this.accessToken;
		}

		const response = await fetch(
			`${this.config.baseUrl}/authentication/v1/authentication/login`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clientId: this.config.clientId,
					clientSecret: this.config.clientSecret,
					userAccessType: 'TOAST_MACHINE_CLIENT',
				}),
			},
		);

		if (!response.ok) {
			throw new Error(`Toast auth failed: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		this.authResponse = data;
		this.accessToken = data.token?.accessToken || data.accessToken;
		this.tokenExpiry = Date.now() + 3500 * 1000; // ~1 hour
		// Extract restaurant GUID from token if available
		if (!this.config.restaurantGuid && data.token?.restaurantGuid) {
			this.config.restaurantGuid = data.token.restaurantGuid;
		}
		if (!this.config.restaurantGuid && data.restaurantGuid) {
			this.config.restaurantGuid = data.restaurantGuid;
		}
		return this.accessToken!;
	}

	/** Get raw auth response for debugging */
	getAuthResponse(): any {
		return this.authResponse;
	}

	/** Make authenticated request to Toast API */
	private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
		const token = await this.authenticate();

		const response = await fetch(`${this.config.baseUrl}${path}`, {
			...options,
			headers: {
				'Authorization': `Bearer ${token}`,
				'Toast-Restaurant-External-ID': this.config.restaurantGuid,
				'Content-Type': 'application/json',
				...options.headers,
			},
		});

		if (!response.ok) {
			throw new Error(`Toast API error: ${response.status} ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Build a map of menu item GUID -> menu group name from Toast's menus API.
	 * Cached per client instance since menus don't change during a sync.
	 */
	async getMenuItemCategoryMap(): Promise<Map<string, string>> {
		if (this.menuCategoryCache) return this.menuCategoryCache;
		const map = new Map<string, string>();
		try {
			const data = await this.request<any>('/menus/v2/menus');
			const menus = Array.isArray(data) ? data : data?.menus || [];
			for (const menu of menus) {
				for (const group of menu.menuGroups || []) {
					const groupName = group.name || '';
					for (const item of group.menuItems || []) {
						if (item.guid) map.set(item.guid, groupName);
					}
				}
			}
		} catch (err) {
			console.warn('[Toast] Failed to fetch menus for category map, falling back to salesCategory', err);
		}
		this.menuCategoryCache = map;
		return map;
	}

	/** Get revenue summary for a business date (YYYY-MM-DD) — delegates to getDaySummary */
	async getRevenueSummary(businessDate: string): Promise<{
		totalRevenue: number;
		totalCovers: number;
		orderCount: number;
	}> {
		const summary = await this.getDaySummary(businessDate);
		return {
			totalRevenue: summary.totalRevenue,
			totalCovers: summary.totalCovers,
			orderCount: summary.orderCount,
		};
	}

	/**
	 * Get full day summary: revenue, covers, sales mix, and PMIX in a single pass.
	 * Avoids fetching order details twice for revenue + sales mix.
	 */
	async getDaySummary(businessDate: string): Promise<DaySummary> {
		const dateCompact = businessDate.replace(/-/g, '');
		const [orderGuids, menuCategoryMap] = await Promise.all([
			this.request<string[]>(`/orders/v2/orders?businessDate=${dateCompact}`),
			this.getMenuItemCategoryMap(),
		]);
		if (!orderGuids || orderGuids.length === 0) {
			return { totalRevenue: 0, totalCovers: 0, orderCount: 0, totalDiscounts: 0, totalComps: 0, salesMix: [], pmix: [] };
		}

		let totalRevenue = 0;
		let totalCovers = 0;
		let totalDiscounts = 0;
		let totalComps = 0;
		const categoryTotals: Record<string, { revenue: number; itemCount: number }> = {};
		const itemTotals: Record<string, { itemGuid: string | null; category: string; quantity: number; revenue: number }> = {};

		for (let i = 0; i < orderGuids.length; i += 5) {
			if (i > 0) await new Promise(r => setTimeout(r, 500));
			const batch = orderGuids.slice(i, i + 5);
			const orders = await Promise.all(
				batch.map(g => this.request<any>(`/orders/v2/orders/${g}`).catch(() => null))
			);
			for (const o of orders) {
				if (!o) continue;
				totalCovers += o.numberOfGuests || 0;
				if (!o.checks || !Array.isArray(o.checks)) continue;
				for (const check of o.checks) {
					totalRevenue += check.amount || 0;
					// Extract discounts and comps from check-level and selection-level
					for (const disc of (check.appliedDiscounts || [])) {
						const amt = disc.discountAmount || disc.amount || 0;
						const name = (disc.name || disc.discount?.name || '').toLowerCase();
						if (amt > 0) {
							if (/comp|void|manager|guest|house|gratis/i.test(name)) totalComps += amt;
							else totalDiscounts += amt;
						}
					}
					if (!check.selections || !Array.isArray(check.selections)) continue;
					for (const sel of check.selections) {
						const itemName = sel.displayName || sel.item?.name || 'Unknown Item';
						const itemGuid = sel.item?.guid || sel.itemGuid || null;
						// Prefer menu group name from menus API, fall back to salesCategory, then item name
						const menuGroup = itemGuid ? menuCategoryMap.get(itemGuid) : undefined;
						let category = menuGroup
							? normalizeMenuGroupCategory(menuGroup)
							: classifySalesCategory(sel.salesCategory?.name || sel.salesCategory?.guid || '');
						// If still Food (default) but item name suggests wine/liquor, reclassify
						if (category === 'Food') {
							const itemCheck = classifySalesCategory(itemName);
							if (itemCheck !== 'Food') category = itemCheck;
						}
						const qty = sel.quantity || 1;
						const selRevenue = (sel.price || 0) * qty;

						// Aggregate by category
						if (!categoryTotals[category]) categoryTotals[category] = { revenue: 0, itemCount: 0 };
						categoryTotals[category].revenue += selRevenue;
						categoryTotals[category].itemCount += qty;

						// Selection-level discounts
						for (const disc of (sel.appliedDiscounts || [])) {
							const amt = disc.discountAmount || disc.amount || 0;
							const dName = (disc.name || disc.discount?.name || '').toLowerCase();
							if (amt > 0) {
								if (/comp|void|manager|guest|house|gratis/i.test(dName)) totalComps += amt;
								else totalDiscounts += amt;
							}
						}

						// Aggregate by item name
						if (!itemTotals[itemName]) {
							itemTotals[itemName] = { itemGuid, category, quantity: 0, revenue: 0 };
						}
						itemTotals[itemName].quantity += qty;
						itemTotals[itemName].revenue += selRevenue;
					}
				}
			}
		}

		// Build sales mix with pct
		const selectionRevenue = Object.values(categoryTotals).reduce((s, c) => s + c.revenue, 0);
		const salesMix: SalesMixEntry[] = Object.entries(categoryTotals)
			.map(([category, data]) => ({
				category,
				revenue: Math.round(data.revenue * 100) / 100,
				itemCount: data.itemCount,
				pctOfTotal: selectionRevenue > 0
					? Math.round((data.revenue / selectionRevenue) * 10000) / 10000
					: 0,
			}))
			.sort((a, b) => b.revenue - a.revenue);

		// Build PMIX sorted by revenue desc
		const pmix: PmixEntry[] = Object.entries(itemTotals)
			.map(([itemName, data]) => ({
				itemName,
				itemGuid: data.itemGuid,
				category: data.category,
				quantity: data.quantity,
				revenue: Math.round(data.revenue * 100) / 100,
				avgPrice: data.quantity > 0
					? Math.round((data.revenue / data.quantity) * 100) / 100
					: 0,
			}))
			.sort((a, b) => b.revenue - a.revenue);

		return {
			totalRevenue: Math.round(totalRevenue * 100) / 100,
			totalCovers,
			orderCount: orderGuids.length,
			totalDiscounts: Math.round(totalDiscounts * 100) / 100,
			totalComps: Math.round(totalComps * 100) / 100,
			salesMix,
			pmix,
		};
	}

	/**
	 * Get hourly sales breakdown for a business date.
	 * Groups orders by hour of day using closedDate (or openedDate fallback),
	 * summing revenue, covers, and order count per hour.
	 */
	async getHourlySales(businessDate: string): Promise<HourlySalesEntry[]> {
		const dateCompact = businessDate.replace(/-/g, '');
		const orderGuids = await this.request<string[]>(
			`/orders/v2/orders?businessDate=${dateCompact}`,
		);
		if (!orderGuids || orderGuids.length === 0) return [];

		const hourBuckets: Record<number, { revenue: number; covers: number; orderCount: number }> = {};

		for (let i = 0; i < orderGuids.length; i += 5) {
			if (i > 0) await new Promise((r) => setTimeout(r, 500));
			const batch = orderGuids.slice(i, i + 5);
			const orders = await Promise.all(
				batch.map((g) => this.request<any>(`/orders/v2/orders/${g}`).catch(() => null)),
			);
			for (const o of orders) {
				if (!o) continue;
				const dateStr = o.closedDate || o.openedDate;
				if (!dateStr) continue;
				const hour = new Date(dateStr).getHours();
				if (!hourBuckets[hour]) {
					hourBuckets[hour] = { revenue: 0, covers: 0, orderCount: 0 };
				}
				hourBuckets[hour].orderCount += 1;
				hourBuckets[hour].covers += o.numberOfGuests || 0;
				if (o.checks && Array.isArray(o.checks)) {
					for (const check of o.checks) {
						hourBuckets[hour].revenue += check.amount || 0;
					}
				}
			}
		}

		return Object.entries(hourBuckets)
			.map(([hour, data]) => ({
				hour: parseInt(hour, 10),
				revenue: Math.round(data.revenue * 100) / 100,
				covers: data.covers,
				orderCount: data.orderCount,
			}))
			.sort((a, b) => a.hour - b.hour);
	}

	/** Get time entries (labor data) for a business date (YYYY-MM-DD) */
	async getTimeEntries(startDate: string, endDate: string): Promise<ToastTimeEntry[]> {
		const dateCompact = startDate.replace(/-/g, '');
		return this.request<ToastTimeEntry[]>(
			`/labor/v1/timeEntries?businessDate=${dateCompact}`
		);
	}

	/** Get labor summary for a date */
	async getLaborSummary(businessDate: string): Promise<ToastLaborSummary> {
		const entries = await this.getTimeEntries(businessDate, businessDate);

		const totalHours = entries.reduce((sum, e) => sum + e.regularHours + e.overtimeHours, 0);
		const overtimeHours = entries.reduce((sum, e) => sum + e.overtimeHours, 0);
		const totalLaborCost = entries.reduce(
			(sum, e) => sum + e.regularHours * e.hourlyWage + e.overtimeHours * e.hourlyWage * 1.5,
			0
		);
		const overtimeCost = entries.reduce(
			(sum, e) => sum + e.overtimeHours * e.hourlyWage * 1.5,
			0
		);

		return {
			date: businessDate,
			totalLaborCost,
			totalHours,
			overtimeHours,
			overtimeCost,
		};
	}

	/** Fetch all job titles from Toast for mapping setup */
	async getJobs(): Promise<{ guid: string; title: string; defaultWage: number }[]> {
		const jobs = await this.request<any[]>('/labor/v1/jobs');
		return jobs.map((j) => ({
			guid: j.guid || j.externalId,
			title: j.title || j.name,
			defaultWage: j.defaultWage || 0,
		}));
	}

	/** Fetch time entries grouped by job for a date, returning job name + labor $ */
	async getLaborByJob(businessDate: string): Promise<
		{
			jobGuid: string;
			jobTitle: string;
			laborDollars: number;
			regularHours: number;
			overtimeHours: number;
		}[]
	> {
		const entries = await this.getTimeEntries(businessDate, businessDate);
		const jobs = await this.getJobs();
		const jobMap = new Map(jobs.map((j) => [j.guid, { title: j.title, defaultWage: j.defaultWage }]));

		const grouped: Record<
			string,
			{ laborDollars: number; regularHours: number; overtimeHours: number }
		> = {};

		for (const entry of entries as any[]) {
			// Toast uses jobReference.guid, not jobGuid
			const key = entry.jobReference?.guid || entry.jobGuid;
			if (!key) continue;
			if (!grouped[key]) {
				grouped[key] = { laborDollars: 0, regularHours: 0, overtimeHours: 0 };
			}
			const regHours = entry.regularHours || 0;
			const otHours = entry.overtimeHours || 0;
			// Use entry.hourlyWage if set, otherwise fall back to job defaultWage
			const wage = entry.hourlyWage || jobMap.get(key)?.defaultWage || 0;
			grouped[key].regularHours += regHours;
			grouped[key].overtimeHours += otHours;
			grouped[key].laborDollars += regHours * wage + otHours * wage * 1.5;
		}

		return Object.entries(grouped).map(([jobGuid, data]) => ({
			jobGuid,
			jobTitle: jobMap.get(jobGuid)?.title || 'Unknown',
			laborDollars: Math.round(data.laborDollars * 100) / 100,
			regularHours: Math.round(data.regularHours * 100) / 100,
			overtimeHours: Math.round(data.overtimeHours * 100) / 100,
		}));
	}

	/** Discover restaurants accessible with current credentials */
	async getRestaurants(): Promise<{ guid: string; name: string; address?: string }[]> {
		const token = await this.authenticate();
		// Try /config/v1/restaurantInfo first (works with Standard API credentials)
		const endpoints = [
			'/config/v1/restaurantInfo',
			'/restaurants/v1/restaurants',
		];
		for (const endpoint of endpoints) {
			try {
				const response = await fetch(
					`${this.config.baseUrl}${endpoint}`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
							'Toast-Restaurant-External-ID': this.config.restaurantGuid || '',
							'Content-Type': 'application/json',
						},
					},
				);
				if (!response.ok) continue;
				const data = await response.json();
				// /config/v1/restaurantInfo returns a single restaurant object
				if (data && !Array.isArray(data) && (data.guid || data.general)) {
					const name = data.general?.name || data.name || 'Restaurant';
					const guid = data.guid || this.config.restaurantGuid || '';
					const addr = data.general?.address;
					const address = addr ? `${addr.streetAddress || ''}, ${addr.city || ''} ${addr.state || ''}`.trim() : undefined;
					return [{ guid, name, address }];
				}
				// /restaurants/v1/restaurants returns an array
				if (Array.isArray(data)) {
					return data.map((r: any) => ({
						guid: r.guid,
						name: r.general?.name || r.name || r.guid,
						address: r.general?.address ? `${r.general.address.streetAddress || ''}, ${r.general.address.city || ''}` : undefined,
					}));
				}
			} catch {
				continue;
			}
		}
		return [{ guid: this.config.restaurantGuid || '', name: 'Current Restaurant' }];
	}
}

/**
 * Normalize a Toast menu group name into one of our standard categories:
 * Food, Cocktails, Liquor, Wine, Beer, Non-Alcoholic, Other
 */
function normalizeMenuGroupCategory(groupName: string): string {
	const lower = groupName.toLowerCase();
	// Food — broad match for meal items, plates, courses, shareables, snacks, etc.
	if (/food|entree|appetizer|dessert|salad|soup|sandwich|burger|pizza|pasta|brunch|lunch|dinner|side|plate|main|starter|course|tapas|shareable|snack|oyster|seafood|steak|chicken|fish|meat|vegetable|cheese|charcuterie|bread|fries|taco|sushi|ramen|noodle|rice|egg|breakfast|grill|roast|raw bar|bites|small plate|large plate|kids|children/i.test(lower)) return 'Food';
	// Cocktails
	if (/cocktail|martini|margarita|spritz|negroni|old fashioned|manhattan|daiquiri|mojito|mixed drink|highball|sour/i.test(lower)) return 'Cocktails';
	// Liquor / Spirits
	if (/liquor|spirit|whiskey|bourbon|scotch|tequila|mezcal|vodka|gin|rum|brandy|cognac|amaro|cordial|digestif|aperitif|shot/i.test(lower)) return 'Liquor';
	// Wine
	if (/wine|btg|btb|champagne|prosecco|ros[eé]|sparkling|pinot|cabernet|merlot|chardonnay|sauvignon|riesling|malbec|by the glass|by the bottle/i.test(lower)) return 'Wine';
	// Beer
	if (/beer|draft|ale|lager|ipa|cider|stout|pilsner|porter|wheat|seltzer|hard seltzer|brew/i.test(lower)) return 'Beer';
	// Non-Alcoholic
	if (/\bna\b|non.?alc|soft drink|soda|juice|coffee|tea|water|mocktail|espresso|latte|cappuccino|hot choc|lemonade|kombucha|virgin|zero.?proof|still|sparkling water|arnold palmer/i.test(lower)) return 'Non-Alcoholic';
	// Merchandise / Retail (gift cards, merch, etc.) — keep as Other
	if (/merch|retail|gift.?card|swag|merchandise|delivery fee|service charge|gratuity|tip/i.test(lower)) return 'Other';
	// Event/banquet revenue — classify as Food (F&B minimum, prix fixe, event pricing)
	if (/event|prix.?fixe|tasting|banquet|minimum|supplement|package|per.?person/i.test(lower)) return 'Food';
	// Default: assume Food for restaurants (most unrecognized menu groups are food items)
	return 'Food';
}

/** Fallback: classify from salesCategory name when menu lookup misses. */
function classifySalesCategory(raw: string): string {
	const l = (raw || '').toLowerCase();
	if (!l || l === 'undefined') return 'Food';
	if (/food|entree|appetizer|dessert|salad|soup|sandwich|burger|pizza|pasta|brunch|lunch|dinner|side|plate|main|starter|course|tapas|shareable|snack|oyster|seafood|steak|chicken|fish|meat|vegetable|cheese|charcuterie|bread|fries|taco|sushi|ramen|noodle|rice|egg|breakfast|grill|roast|raw bar|bites|small plate|large plate|kids|children|tart|pie|cake|mousse|creme|sorbet|butterscotch|hand pie/.test(l)) return 'Food';
	if (/cocktail|martini|margarita|spritz|negroni|old fashioned|manhattan|daiquiri|mojito|mixed drink|highball|sour/.test(l)) return 'Cocktails';
	if (/liquor|spirit|whiskey|bourbon|scotch|tequila|mezcal|vodka|gin|rum|brandy|cognac|amaro|cordial|digestif|aperitif|shot|titos|woodford|bulleit|hendrick|makers mark|jack daniel|jameson|patron|grey goose|ketel one|tanqueray|bombay/.test(l)) return 'Liquor';
	if (/beer|draft|ale|lager|ipa|cider|stout|pilsner|porter|wheat|seltzer|hard seltzer|brew/.test(l)) return 'Beer';
	if (/wine|champagne|prosecco|ros[eé]|sparkling|pinot|cabernet|merlot|chardonnay|sauvignon|riesling|malbec|by the glass|by the bottle|hermitage|btl|domaine|chateau|reserve|cuvee|brut|blanc|rouge|nero|barolo|chianti|gattinara|cain|lopez|tondonia|roumier|peters|jobard|servin|bereche|cantina|fay/.test(l)) return 'Wine';
	if (/non.?alc|soft drink|soda|juice|coffee|tea|water|n\/a|mocktail|espresso|latte|cappuccino|lemonade|kombucha|virgin|zero.?proof/.test(l)) return 'Non-Alcoholic';
	if (/gift.?card|merch|service charge|gratuity/.test(l)) return 'Other';
	if (/event|prix.?fixe|minimum|supplement|per.?person/.test(l)) return 'Food';
	return 'Food';
}

/** Create Toast client from environment variables */
export function createToastClient(): ToastClient | null {
	const clientId = process.env.TOAST_CLIENT_ID;
	const clientSecret = process.env.TOAST_CLIENT_SECRET;
	const apiKey = process.env.TOAST_API_KEY;
	const restaurantGuid = process.env.TOAST_RESTAURANT_GUID;

	if (!clientId || !clientSecret || !restaurantGuid) {
		console.warn('[Toast] Missing credentials — Toast integration disabled');
		return null;
	}

	return new ToastClient({
		clientId,
		clientSecret,
		apiKey: apiKey || '',
		restaurantGuid,
	});
}

/** Create Toast client from explicit credentials (for per-location configs stored in Supabase) */
export function createToastClientFromCredentials(config: {
	clientId: string;
	clientSecret: string;
	restaurantGuid: string;
}): ToastClient {
	return new ToastClient({
		clientId: config.clientId,
		clientSecret: config.clientSecret,
		apiKey: '',
		restaurantGuid: config.restaurantGuid,
	});
}
