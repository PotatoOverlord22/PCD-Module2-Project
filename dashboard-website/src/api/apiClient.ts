import { type ZodSchema } from "zod";

export async function fetchValidated<T>(url: string, schema: ZodSchema<T>): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    return schema.parse(data);
}
