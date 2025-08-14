export type ServiceFactory<T = any> = () => T;
export type ServiceInstance<T = any> = T;

export interface ServiceDescriptor<T = any> {
    instance?: ServiceInstance<T>;
    factory?: ServiceFactory<T>;
    singleton?: boolean;
}

export class DependencyContainer {
    private services: Map<string, ServiceDescriptor> = new Map();
    private singletonInstances: Map<string, any> = new Map();
    
    /**
     * Register a service instance
     */
    register<T>(name: string, instance: T): void;
    
    /**
     * Register a service factory
     */
    register<T>(name: string, factory: ServiceFactory<T>, singleton?: boolean): void;
    
    register<T>(
        name: string, 
        instanceOrFactory: T | ServiceFactory<T>, 
        singleton: boolean = false
    ): void {
        if (typeof instanceOrFactory === 'function' && !this.isClass(instanceOrFactory)) {
            // It's a factory function
            this.services.set(name, {
                factory: instanceOrFactory as ServiceFactory<T>,
                singleton
            });
        } else {
            // It's a service instance
            this.services.set(name, {
                instance: instanceOrFactory as ServiceInstance<T>
            });
        }
    }
    
    /**
     * Resolve a service by name
     */
    resolve<T>(name: string): T {
        const descriptor = this.services.get(name);
        
        if (!descriptor) {
            throw new Error(`Service '${name}' is not registered`);
        }
        
        // Return existing instance
        if (descriptor.instance) {
            return descriptor.instance as T;
        }
        
        // Handle factory with singleton
        if (descriptor.factory) {
            if (descriptor.singleton) {
                // Check if singleton instance already exists
                const existing = this.singletonInstances.get(name);
                if (existing) {
                    return existing as T;
                }
                
                // Create and store singleton instance
                const instance = descriptor.factory();
                this.singletonInstances.set(name, instance);
                return instance as T;
            } else {
                // Create new instance every time
                return descriptor.factory() as T;
            }
        }
        
        throw new Error(`Service '${name}' has invalid descriptor`);
    }
    
    /**
     * Check if a service is registered
     */
    isRegistered(name: string): boolean {
        return this.services.has(name);
    }
    
    /**
     * Get all registered service names
     */
    getRegisteredServices(): string[] {
        return Array.from(this.services.keys());
    }
    
    /**
     * Remove a service registration
     */
    unregister(name: string): boolean {
        const removed = this.services.delete(name);
        this.singletonInstances.delete(name);
        return removed;
    }
    
    /**
     * Clear all registrations
     */
    clear(): void {
        this.services.clear();
        this.singletonInstances.clear();
    }
    
    /**
     * Create a scoped container (inherits parent registrations)
     */
    createScope(): DependencyContainer {
        const scopedContainer = new DependencyContainer();
        
        // Copy parent registrations
        for (const [name, descriptor] of this.services.entries()) {
            scopedContainer.services.set(name, { ...descriptor });
        }
        
        // Copy singleton instances (they should be shared across scopes)
        for (const [name, instance] of this.singletonInstances.entries()) {
            scopedContainer.singletonInstances.set(name, instance);
        }
        
        return scopedContainer;
    }
    
    /**
     * Get container statistics
     */
    getStats() {
        return {
            totalServices: this.services.size,
            singletonInstances: this.singletonInstances.size,
            services: this.getRegisteredServices()
        };
    }
    
    private isClass(func: any): boolean {
        // Simple heuristic to detect class constructors
        return typeof func === 'function' && 
               func.prototype && 
               func.prototype.constructor === func;
    }
}

// Utility decorator for automatic dependency injection (future enhancement)
export function Injectable(name: string) {
    return function<T extends new(...args: any[]) => {}>(constructor: T) {
        // Store metadata for auto-registration
        (constructor as any).__injectable_name = name;
        return constructor;
    };
}

// Helper function to create a container with common services
export function createDefaultContainer(): DependencyContainer {
    const container = new DependencyContainer();
    
    // Register common utilities
    container.register('logger', () => console, true);
    container.register('crypto', () => crypto, true);
    
    return container;
}