/**
 * Dependency Injection Container - Types and Registration Interfaces (2.2.1)
 */

export type ServiceName = string;

export enum ServiceLifetime {
  Singleton = 'singleton',
  Transient = 'transient',
}

export type ServiceFactory<T> = (container: DependencyContainer) => T;

export interface RegistrationOptions<T> {
  lifetime?: ServiceLifetime;
  factory: ServiceFactory<T>;
}

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

  constructor(parent?: DependencyContainer) {
    this.parent = parent;
  }

  register<T>(name: ServiceName, options: RegistrationOptions<T>): void {
    const lifetime = options.lifetime ?? ServiceLifetime.Transient;
    const registration: ServiceRegistration<T> = {
      name,
      lifetime,
      factory: options.factory,
    };
    this.nameToRegistration.set(name, registration);
  }

  registerInstance<T>(name: ServiceName, instance: T): void {
    this.nameToRegistration.set(name, {
      name,
      lifetime: ServiceLifetime.Singleton,
      factory: () => instance,
    });
    this.singletons.set(name, instance);
  }

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

  isRegistered(name: ServiceName): boolean {
    return this.nameToRegistration.has(name) || (!!this.parent && this.parent.isRegistered(name));
  }

  createScope(): DependencyContainer {
    return new DependencyContainer(this);
  }

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
