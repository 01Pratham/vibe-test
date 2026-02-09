import type { ExpressLayer, ZodSchemaLike } from '../storage/interfaces';
import type { Express } from 'express';

/**
 * Represents a schema object with string keys and SchemaValue values
 */
interface SchemaObject {
    [key: string]: string | number | boolean | string[] | SchemaObject | null;
}

export interface ScannedRoute {
    path: string;
    method: string;
    schema: SchemaObject | null;
    name: string;
}

/**
 * Interface for the handle property of an Express layer
 */
interface ExpressHandle {
    zodSchema?: ZodSchemaLike;
    schema?: ZodSchemaLike & { zodSchema?: ZodSchemaLike };
    params?: { zodSchema?: ZodSchemaLike };
    validator?: { schema?: ZodSchemaLike };
    bodySchema?: ZodSchemaLike;
    isJoi?: boolean;
    type?: string;
    keys?: unknown;
    _ids?: { _byKey?: Map<string, unknown> };
    stack?: ExpressLayer[];
}

/**
 * Service to scan Express routes and extract metadata
 */
export class ExpressScanner {
    /**
     * Scans the Express application for all registered routes
     * @param app The Express application instance
     * @returns Array of scanned routes with metadata
     */
    public scan(app: Express): ScannedRoute[] {
        const routes: ScannedRoute[] = [];
        const appWithRouter = app as unknown as { _router?: { stack?: ExpressLayer[] } };
        const stack = appWithRouter._router?.stack;

        if (stack !== undefined && stack !== null) {
            this.processStack(stack, '', routes);
        }

        return routes;
    }

    private processStack(stack: ExpressLayer[], prefix: string, routes: ScannedRoute[]): void {
        stack.forEach((layer: ExpressLayer) => {
            if (layer.route !== undefined) {
                this.handleRouteLayer(layer, prefix, routes);
            } else if (layer.name === 'router' && layer.handle?.stack !== undefined) {
                this.handleRouterLayer(layer, prefix, routes);
            }
        });
    }

    private handleRouteLayer(layer: ExpressLayer, prefix: string, routes: ScannedRoute[]): void {
        const route = layer.route;
        if (route === undefined) {
            return;
        }

        const path = (prefix + route.path).replace(/\/+/g, '/');
        const methods = Object.keys(route.methods);

        methods.forEach((method: string) => {
            const schema = this.extractSchema(route.stack);
            routes.push({
                path,
                method: method.toUpperCase(),
                schema,
                name: `${path}`
            });
        });
    }

    private handleRouterLayer(layer: ExpressLayer, prefix: string, routes: ScannedRoute[]): void {
        let newPrefix = prefix;
        if (layer.regexp !== undefined) {
            const source = layer.regexp.source;
            // Extract path from regex source: looks for sequence of escaped slashes and valid chars
            // Example: ^\/api\/v1\/?(?=\/|$) -> matches "\/api\/v1"
            const match = source.match(/^\^?((?:\\\/[\w\-.:*]+)+)/);
            if (match !== null && match[0] !== '') {
                // Unescape the matched path (e.g. "\/api\/v1" -> "/api/v1")
                newPrefix += match[1].replace(/\\(.)/g, '$1');
            }
        }
        if (layer.handle?.stack !== undefined) {
            this.processStack(layer.handle.stack, newPrefix, routes);
        }
    }

    private extractSchema(stack: ExpressLayer[]): SchemaObject | null {
        for (const layer of stack) {
            const handle = layer.handle as unknown as ExpressHandle;
            if (handle === undefined) {
                continue;
            }

            const schema = this.findSchemaInHandle(handle);
            if (schema !== null) {
                return schema;
            }
        }
        return null;
    }

    private findSchemaInHandle(handle: ExpressHandle): SchemaObject | null {
        const schemas: (ZodSchemaLike | undefined)[] = [
            handle.zodSchema,
            handle.schema?.zodSchema,
            handle.params?.zodSchema,
            handle.schema as ZodSchemaLike | undefined,
            handle.validator?.schema,
            handle.bodySchema
        ];

        for (const s of schemas) {
            if (s === undefined || s === null || typeof s !== 'object') {
                continue;
            }

            const schemaObject = this.parseAnySchema(s);
            if (schemaObject !== null) {
                return schemaObject;
            }
        }

        if (this.isJoiLike(handle)) {
            return this.parseJoiSchema(handle);
        }

        return null;
    }

    private parseAnySchema(s: unknown): SchemaObject | null {
        if (this.isZodLike(s)) {
            const parsed = this.parseZodSchema(s);
            if (Object.keys(parsed).length > 0) {
                return parsed;
            }
        }

        if (this.isJoiLike(s)) {
            return this.parseJoiSchema(s);
        }

        return null;
    }

    private isZodLike(obj: unknown): obj is ZodSchemaLike {
        return typeof obj === 'object' && obj !== null &&
            ('_def' in obj || 'safeParse' in obj || 'parse' in obj);
    }

    private isJoiLike(s: unknown): boolean {
        return s !== null && typeof s === 'object' && ('isJoi' in s || ('type' in s && s.type === 'object'));
    }

    private parseJoiSchema(s: unknown): SchemaObject | null {
        if (s !== null && typeof s === 'object' && 'keys' in s && s.keys !== undefined && s.keys !== null) {
            return s.keys as unknown as SchemaObject;
        }
        const byKey = (s as { _ids?: { _byKey?: Map<string, unknown> } })?._ids?._byKey;
        if (byKey !== undefined && byKey !== null && typeof byKey.forEach === 'function') {
            const joiObj: Record<string, string> = {};
            byKey.forEach((_v: unknown, k: string) => {
                joiObj[k] = "any";
            });
            return joiObj as unknown as SchemaObject;
        }

        return null;
    }

    private parseZodSchema(schema: ZodSchemaLike): SchemaObject {
        const obj: SchemaObject = {};
        try {
            let current = schema;
            while (current._def !== undefined && (current._def.schema !== undefined || current._def.innerType !== undefined)) {
                current = (current._def.schema ?? current._def.innerType) as ZodSchemaLike;
            }

            const def = current._def;
            const shape = def?.shape ?? current.shape;

            if (shape !== undefined) {
                const actualShape = typeof shape === 'function' ? shape() : shape;
                if (actualShape.body !== undefined) {
                    return this.parseZodSchema(actualShape.body);
                }

                for (const key in actualShape) {
                    if (Object.prototype.hasOwnProperty.call(actualShape, key)) {
                        obj[key] = this.getZodDefaultValue(actualShape[key]);
                    }
                }
            }
        } catch {
            // Silently fail
        }
        return obj;
    }

    private getZodDefaultValue(field: ZodSchemaLike): string | number | boolean | string[] | SchemaObject | null {
        let current = field;
        while (current._def !== undefined && (current._def.schema !== undefined || current._def.innerType !== undefined)) {
            current = (current._def.schema ?? current._def.innerType) as ZodSchemaLike;
        }

        const typeName = current._def?.typeName;
        if (typeName === undefined) {
            return null;
        }

        return this.mapZodTypeToValue(typeName, current);
    }

    private mapZodTypeToValue(typeName: string, current: ZodSchemaLike): string | number | boolean | string[] | SchemaObject | null {
        switch (typeName) {
            case 'ZodString': return "string";
            case 'ZodNumber': return 0;
            case 'ZodBoolean': return true;
            case 'ZodArray': return [];
            case 'ZodObject': return this.parseZodSchema(current);
            case 'ZodEnum': return this.getZodEnumDefault(current);
            case 'ZodDate': return new Date().toISOString();
            default: return null;
        }
    }

    private getZodEnumDefault(current: ZodSchemaLike): string {
        const values = current._def?.values;
        return (values !== undefined && values.length > 0) ? values[0] : "enum";
    }
}

export const expressScanner = new ExpressScanner();
