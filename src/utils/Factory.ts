

export class Factory<T> {
    readonly #Providers: Map<string, T> = new Map()

    Register(name: string, provider: T): void {
        this.#Providers.set(name, provider)
    }

    Get(name: string): T | undefined {
        return this.#Providers.get(name)
    }

    Has(name: string) {
        return this.#Providers.has(name)
    }
}