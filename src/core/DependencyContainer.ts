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
  // Minimal stub; implementation added in subsequent subtasks
  constructor() {}

  register<T>(_name: ServiceName, _options: RegistrationOptions<T>): void {}

  registerInstance<T>(_name: ServiceName, _instance: T): void {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve<T>(_name: ServiceName): T {
    throw new ServiceNotRegisteredError('');
  }

  isRegistered(_name: ServiceName): boolean {
    return false;
  }

  createScope(): DependencyContainer {
    return new DependencyContainer();
  }

  clear(): void {}
}
