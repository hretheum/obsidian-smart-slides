/**
 * Dependency Injection Container.
 *
 * - Supports singleton and transient lifecycles
 * - Detects circular dependencies during resolution
 * - Provides scoped containers that inherit registrations and singletons
 */

/** Unique identifier for a service registration. */
export type ServiceName = string;

/** Service lifetime options. */
export enum ServiceLifetime {
  Singleton = 'singleton',
  Transient = 'transient',
}

/** Factory function that produces a service instance. */
export type ServiceFactory<T> = (container: DependencyContainer) => T;

/** Options for registering a service. */
export interface RegistrationOptions<T> {
  lifetime?: ServiceLifetime;
  factory: ServiceFactory<T>;
}

/** Internal representation of a registration. */
export interface ServiceRegistration<T = unknown> {
  readonly name: ServiceName;
  readonly lifetime: ServiceLifetime;
  readonly factory: ServiceFactory<T>;
}

export class CircularDependencyError extends Error {
  constructor(stack: ServiceName[]) {
    super(`Circular dependency detected: ${stack.join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

export class ServiceNotRegisteredError extends Error {
  constructor(name: ServiceName) {
    super(`Service '${name}' is not registered`);
    this.name = 'ServiceNotRegisteredError';
  }
}

export class DependencyContainer {
  private readonly parent?: DependencyContainer;
  private readonly nameToRegistration = new Map<ServiceName, ServiceRegistration>();
  private readonly singletons = new Map<ServiceName, unknown>();

  /** Tracks current resolution path for circular dependency detection. */
  private readonly resolutionStack: ServiceName[] = [];

  /**
   * Creates a new container.
   *
   * @param parent - Optional parent container for scoped resolution
   */
  constructor(parent?: DependencyContainer) {
    this.parent = parent;
  }

  /** Registers a service factory under a name. */
  register<T>(name: ServiceName, options: RegistrationOptions<T>): void {
    const lifetime = options.lifetime ?? ServiceLifetime.Transient;
    const registration: ServiceRegistration<T> = {
      name,
      lifetime,
      factory: options.factory,
    };
    this.nameToRegistration.set(name, registration);
  }

  /** Registers a concrete singleton instance under the given name. */
  registerInstance<T>(name: ServiceName, instance: T): void {
    this.nameToRegistration.set(name, {
      name,
      lifetime: ServiceLifetime.Singleton,
      factory: () => instance,
    });
    this.singletons.set(name, instance);
  }

  /** Resolves a service instance by name. */
  resolve<T>(name: ServiceName): T {
    const registration = this.getRegistration(name);
    if (!registration) {
      throw new ServiceNotRegisteredError(name);
    }

    if (registration.lifetime === ServiceLifetime.Singleton) {
      if (this.singletons.has(name)) {
        return this.singletons.get(name) as T;
      }
      const instance = this.createWithCycleDetection(name, registration.factory);
      this.singletons.set(name, instance);
      return instance as T;
    }

    return this.createWithCycleDetection(name, registration.factory) as T;
  }

  /** Returns true when a service is registered locally or in parent scopes. */
  isRegistered(name: ServiceName): boolean {
    return this.nameToRegistration.has(name) || (!!this.parent && this.parent.isRegistered(name));
  }

  /** Creates a child container that inherits registrations and singletons by reference. */
  createScope(): DependencyContainer {
    return new DependencyContainer(this);
  }

  /** Clears all local registrations and singleton instances. */
  clear(): void {
    this.nameToRegistration.clear();
    this.singletons.clear();
  }

  private getRegistration(name: ServiceName): ServiceRegistration | undefined {
    const local = this.nameToRegistration.get(name);
    if (local) return local;
    return this.parent?.getRegistration(name);
  }

  private createWithCycleDetection<T>(name: ServiceName, factory: ServiceFactory<T>): T {
    if (this.resolutionStack.includes(name)) {
      const firstIndex = this.resolutionStack.indexOf(name);
      const cyclePath = [...this.resolutionStack.slice(firstIndex), name];
      throw new CircularDependencyError(cyclePath);
    }
    this.resolutionStack.push(name);
    try {
      return factory(this);
    } finally {
      this.resolutionStack.pop();
    }
  }
}
