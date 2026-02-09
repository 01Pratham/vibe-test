import fs from 'fs/promises';
import path from 'path';

import type {
    Collection,
    Request as StoreRequest,
    Environment,
    HistoryEntry,
    CreateCollectionInput,
    UpdateCollectionInput,
    CreateRequestInput,
    UpdateRequestInput,
    CreateEnvironmentInput,
    UpdateEnvironmentInput,
    AddToHistoryInput
} from './interfaces';
import type { IStorageProvider } from './types';

interface StorageData {
    collections: Collection[];
    requests: StoreRequest[];
    environments: Environment[];
    history: HistoryEntry[];
}

/**
 * File-based JSON storage provider for vibe-test.
 */
export class JsonStorageProvider implements IStorageProvider {
    private cachePath: string;
    private customPath?: string;

    private cacheData: StorageData = { collections: [], requests: [], environments: [], history: [] };
    private customData: StorageData = { collections: [], requests: [], environments: [], history: [] };
    private initPromise: Promise<void> | null = null;

    constructor(storagePath?: string, customizationPath?: string, private autoCollectionName: string = 'Auto-Captured') {
        const defaultPath = path.join(process.cwd(), 'node_modules', '@vibe-test', 'lib', '.cache', 'api-tester-db.json');
        this.cachePath = storagePath ?? defaultPath;
        this.customPath = customizationPath;
    }

    public setAutoCollectionName(name: string): void {
        this.autoCollectionName = name;
    }

    public async init(): Promise<void> {
        if (this.initPromise !== null) {
            return this.initPromise;
        }

        this.initPromise = (async (): Promise<void> => {
            try {
                await fs.mkdir(path.dirname(this.cachePath), { recursive: true });
                const content = await fs.readFile(this.cachePath, 'utf-8');
                const parsed = JSON.parse(content) as Partial<StorageData>;
                this.cacheData = {
                    collections: parsed.collections ?? [],
                    requests: parsed.requests ?? [],
                    environments: parsed.environments ?? [],
                    history: parsed.history ?? [],
                };
            } catch {
                this.cacheData = { collections: [], requests: [], environments: [], history: [] };
            }

            if (this.customPath !== undefined && this.customPath !== null && this.customPath !== '') {
                try {
                    const content = await fs.readFile(this.customPath, 'utf-8');
                    const parsed = JSON.parse(content) as Partial<StorageData>;
                    this.customData = {
                        collections: parsed.collections ?? [],
                        requests: parsed.requests ?? [],
                        environments: parsed.environments ?? [],
                        history: parsed.history ?? [],
                    };
                } catch {
                    this.customData = { collections: [], requests: [], environments: [], history: [] };
                }
            }
        })();

        return this.initPromise;
    }

    private async waitInitialized(): Promise<void> {
        if (this.initPromise === null) {
            await this.init();
        } else {
            await this.initPromise;
        }
    }

    private async saveCache(): Promise<void> {
        await fs.mkdir(path.dirname(this.cachePath), { recursive: true });
        await fs.writeFile(this.cachePath, JSON.stringify(this.cacheData, null, 2));
    }

    private async saveCustom(): Promise<void> {
        if (this.customPath === undefined || this.customPath === null || this.customPath === '') {
            return;
        }
        await fs.writeFile(this.customPath, JSON.stringify(this.customData, null, 2));
    }

    public async clearCache(): Promise<void> {
        await this.waitInitialized();
        this.cacheData = { collections: [], requests: [], environments: [], history: [] };
        await this.saveCache();
    }

    /**
     * Reload custom data from disk (api-tester.json)
     * This ensures manual edits to the file are picked up
     */
    public async reloadCustomData(): Promise<void> {
        if (this.customPath === undefined || this.customPath === null || this.customPath === '') {
            return;
        }
        try {
            const content = await fs.readFile(this.customPath, 'utf-8');
            const parsed = JSON.parse(content) as Partial<StorageData>;
            this.customData = {
                collections: parsed.collections ?? [],
                requests: parsed.requests ?? [],
                environments: parsed.environments ?? [],
                history: parsed.history ?? [],
            };
        } catch {
            // File doesn't exist or is invalid, keep existing data
        }
    }

    /**
     * Reload custom data before read operations to ensure fresh data
     */
    private async ensureFreshData(): Promise<void> {
        await this.waitInitialized();
        await this.reloadCustomData();
    }

    private getAll<T extends Collection | StoreRequest | Environment | HistoryEntry>(type: keyof StorageData): T[] {
        const cacheItems = (this.cacheData[type] as T[]) ?? [];
        const customItems = (this.customData[type] as T[]) ?? [];

        const map = new Map<string, T>();

        cacheItems.forEach((item: T) => map.set(item.id, item));
        customItems.forEach((item: T) => {
            const existing = map.get(item.id);
            if (existing !== undefined) {
                map.set(item.id, { ...existing, ...item });
            } else {
                map.set(item.id, item);
            }
        });

        return Array.from(map.values());
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    private ensureCustomData(): void {
        this.customData ??= { collections: [], requests: [], environments: [], history: [] };
    }

    public async getCollections(userId: string): Promise<Collection[]> {
        await this.ensureFreshData();
        const allCollections = this.getAll<Collection>('collections');
        const allRequests = this.getAll<StoreRequest>('requests');

        const collections = allCollections.filter((c: Collection) => c.userId === userId && !c.is_deleted);

        return collections.map((c: Collection) => ({
            ...c,
            requests: allRequests.filter((r: StoreRequest) => r.collectionId === c.id && !r.is_deleted)
        }));
    }

    public async createCollection(userId: string, data: CreateCollectionInput): Promise<Collection> {
        await this.waitInitialized();
        const newCollection: Collection = {
            id: this.generateId(),
            userId,
            ...data,
            is_deleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (data.name === this.autoCollectionName) {
            this.cacheData.collections.push(newCollection);
            await this.saveCache();
        } else {
            this.ensureCustomData();
            this.customData.collections.push(newCollection);
            await this.saveCustom();
        }
        return newCollection;
    }

    public async updateCollection(id: string, data: UpdateCollectionInput): Promise<void> {
        await this.waitInitialized();
        this.ensureCustomData();
        const existing = this.customData.collections.find((c: Collection) => c.id === id);
        if (existing !== undefined) {
            Object.assign(existing, { ...data, updatedAt: new Date().toISOString() });
        } else {
            const cacheItem = this.cacheData.collections.find((c: Collection) => c.id === id);
            if (cacheItem !== undefined) {
                this.customData.collections.push({ ...cacheItem, ...data, updatedAt: new Date().toISOString() });
            }
        }
        await this.saveCustom();
    }

    public async deleteCollection(id: string): Promise<void> {
        await this.waitInitialized();
        this.ensureCustomData();
        const existing = this.customData.collections.find((c: Collection) => c.id === id);
        if (existing !== undefined) {
            existing.is_deleted = true;
        } else {
            const cacheItem = this.cacheData.collections.find((c: Collection) => c.id === id);
            if (cacheItem !== undefined) {
                this.customData.collections.push({ ...cacheItem, is_deleted: true });
            }
        }
        await this.saveCustom();
    }

    public async getRequests(collectionId: string): Promise<StoreRequest[]> {
        await this.ensureFreshData();
        const all = this.getAll<StoreRequest>('requests');
        return all.filter((r: StoreRequest) => r.collectionId === collectionId && !r.is_deleted);
    }

    public async getRequest(id: string): Promise<StoreRequest | undefined> {
        await this.ensureFreshData();
        const all = this.getAll<StoreRequest>('requests');
        return all.find((r: StoreRequest) => r.id === id && !r.is_deleted);
    }

    public async createRequest(data: CreateRequestInput): Promise<StoreRequest> {
        await this.waitInitialized();
        const newRequest: StoreRequest = {
            id: this.generateId(),
            ...data,
            is_deleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const allCols = this.getAll<Collection>('collections');
        const col = allCols.find((c: Collection) => c.id === data.collectionId);

        if (col?.name === this.autoCollectionName) {
            this.cacheData.requests.push(newRequest);
            await this.saveCache();
        } else {
            this.ensureCustomData();
            this.customData.requests.push(newRequest);
            await this.saveCustom();
        }
        return newRequest;
    }

    public async updateRequest(id: string, data: UpdateRequestInput): Promise<void> {
        await this.waitInitialized();
        this.ensureCustomData();
        const existing = this.customData.requests.find((r: StoreRequest) => r.id === id);
        if (existing !== undefined) {
            Object.assign(existing, { ...data, updatedAt: new Date().toISOString() });
        } else {
            const cacheItem = this.cacheData.requests.find((r: StoreRequest) => r.id === id);
            if (cacheItem !== undefined) {
                this.customData.requests.push({ ...cacheItem, ...data, updatedAt: new Date().toISOString() });
            }
        }
        await this.saveCustom();
    }

    public async deleteRequest(id: string): Promise<void> {
        await this.waitInitialized();
        this.ensureCustomData();
        const existing = this.customData.requests.find((r: StoreRequest) => r.id === id);
        if (existing !== undefined) {
            existing.is_deleted = true;
        } else {
            const cacheItem = this.cacheData.requests.find((r: StoreRequest) => r.id === id);
            if (cacheItem !== undefined) {
                this.customData.requests.push({ ...cacheItem, is_deleted: true });
            }
        }
        await this.saveCustom();
    }

    public async getEnvironments(): Promise<Environment[]> {
        await this.ensureFreshData();
        return this.getAll<Environment>('environments').filter((e: Environment) => !e.is_deleted);
    }

    public async createEnvironment(data: CreateEnvironmentInput): Promise<Environment> {
        await this.waitInitialized();
        const newEnv: Environment = {
            id: this.generateId(),
            ...data,
            is_deleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.ensureCustomData();
        this.customData.environments.push(newEnv);
        await this.saveCustom();
        return newEnv;
    }

    public async updateEnvironment(id: string, data: UpdateEnvironmentInput): Promise<void> {
        await this.waitInitialized();
        this.ensureCustomData();
        const existing = this.customData.environments.find((e: Environment) => e.id === id);
        if (existing !== undefined) {
            Object.assign(existing, { ...data, updatedAt: new Date().toISOString() });
        } else {
            const cacheItem = this.cacheData.environments.find((e: Environment) => e.id === id);
            if (cacheItem !== undefined) {
                this.customData.environments.push({ ...cacheItem, ...data, updatedAt: new Date().toISOString() });
            }
        }
        await this.saveCustom();
    }

    public async deleteEnvironment(id: string): Promise<void> {
        await this.waitInitialized();
        this.ensureCustomData();
        const existing = this.customData.environments.find((e: Environment) => e.id === id);
        if (existing !== undefined) {
            existing.is_deleted = true;
        } else {
            const cacheItem = this.cacheData.environments.find((e: Environment) => e.id === id);
            if (cacheItem !== undefined) {
                this.customData.environments.push({ ...cacheItem, is_deleted: true });
            }
        }
        await this.saveCustom();
    }

    public async getHistory(userId: string): Promise<HistoryEntry[]> {
        await this.waitInitialized();
        return this.getAll<HistoryEntry>('history')
            .filter((h: HistoryEntry) => h.userId === userId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 50);
    }

    public async addToHistory(userId: string, data: AddToHistoryInput): Promise<HistoryEntry> {
        await this.waitInitialized();
        const newHistory: HistoryEntry = {
            id: this.generateId(),
            userId,
            ...data,
            createdAt: new Date().toISOString()
        };
        this.cacheData.history.push(newHistory);
        await this.saveCache();
        return newHistory;
    }

    public async clearHistory(userId: string): Promise<void> {
        await this.waitInitialized();
        this.cacheData.history = this.cacheData.history.filter((h: HistoryEntry) => h.userId !== userId);
        await this.saveCache();
        if (this.customPath !== undefined && this.customPath !== null && this.customPath !== '') {
            this.customData.history = this.customData.history.filter((h: HistoryEntry) => h.userId !== userId);
            await this.saveCustom();
        }
    }

    public async deleteHistoryItem(id: string): Promise<void> {
        await this.waitInitialized();
        this.cacheData.history = this.cacheData.history.filter((h: HistoryEntry) => h.id !== id);
        await this.saveCache();
        if (this.customPath !== undefined && this.customPath !== null && this.customPath !== '') {
            this.customData.history = this.customData.history.filter((h: HistoryEntry) => h.id !== id);
            await this.saveCustom();
        }
    }
}
