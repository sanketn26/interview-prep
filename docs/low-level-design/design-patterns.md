---
title: Design Patterns
description: Factory, Strategy, Observer, Builder, Adapter, Decorator — the six you'll actually use, with the pressure that earns each one.
prerequisites:
  - SOLID Principles
---

# Design Patterns

**Prerequisites:** [SOLID Principles](solid-principles.md)

[← SOLID Principles](solid-principles.md) | [Next: Concurrency Basics →](concurrency-basics.md)

---

## Why This Exists

There are 23 patterns in the Gang of Four book and roughly six that show up repeatedly in LLD interviews, because they map directly onto the requirement phrases interviewers actually write: "support multiple X," "notify interested parties," "construct a complex object step by step." Naming a pattern the interviewer didn't ask for is the same mistake as naming CQRS on a 100-user system design problem (see [Architecture Patterns](../architecture-patterns/index.md)) — it shows recall, not judgment.

!!! tip "Mental model"
    Read every pattern below as **pressure → pattern**, the same discipline as the architecture-patterns page. If you can't state the pressure in the problem statement, you haven't earned the pattern — you've decorated the design with vocabulary.

---

## Factory — "Create the right subtype without the caller knowing which one"

**Pressure:** object creation logic (which concrete class to instantiate) is scattered across the codebase, or depends on a runtime value the caller shouldn't have to branch on.

```python
class Vehicle(ABC):
    @abstractmethod
    def spot_size_required(self) -> str: ...

class Car(Vehicle):
    def spot_size_required(self) -> str: return "medium"

class Motorcycle(Vehicle):
    def spot_size_required(self) -> str: return "small"

class VehicleFactory:
    @staticmethod
    def create(vehicle_type: str, plate: str) -> Vehicle:
        if vehicle_type == "car":
            return Car(plate)
        elif vehicle_type == "motorcycle":
            return Motorcycle(plate)
        raise ValueError(f"Unknown vehicle type: {vehicle_type}")
```

**What it buys:** one place to change when a new vehicle type is added, instead of every call site that constructs a `Vehicle` needing its own `if/elif`. **What it costs:** an extra layer of indirection — for two subtypes that never grow, a factory is often unnecessary ceremony.

---

## Strategy — "Swap the algorithm without touching the class that uses it"

**Pressure:** a behavior needs multiple interchangeable implementations, selected at runtime — pricing rules, payment methods, sorting comparators.

```python
class PricingStrategy(ABC):
    @abstractmethod
    def calculate(self, duration_hours: float) -> float: ...

class HourlyPricing(PricingStrategy):
    def calculate(self, duration_hours: float) -> float:
        return duration_hours * 2.0

class FlatDayPricing(PricingStrategy):
    def calculate(self, duration_hours: float) -> float:
        return 20.0

class Ticket:
    def __init__(self, pricing: PricingStrategy):
        self.pricing = pricing          # injected — see DIP

    def fee(self, duration_hours: float) -> float:
        return self.pricing.calculate(duration_hours)
```

**What it buys:** `Ticket` never changes when a new pricing scheme launches — a new `PricingStrategy` subclass is the whole diff. **What it costs:** a class per variant; for one-off logic that will only ever have one implementation, this is over-abstraction.

!!! tip "Strategy vs. Factory — the distinction interviewers probe"
    Factory answers "which object do I *create*." Strategy answers "which *behavior* does an already-existing object use." They compose constantly: a `PaymentFactory` might construct the right `PaymentStrategy` based on a request, then hand it to a `Checkout` object that calls `strategy.pay()` without knowing which one it got.

---

## Observer — "Notify interested parties without hard-coding who they are"

**Pressure:** one event needs to trigger reactions in an open-ended, possibly-growing set of other objects, and the source of the event shouldn't need to know about them individually.

```python
class Observer(ABC):
    @abstractmethod
    def update(self, event: str) -> None: ...

class ParkingLot:
    def __init__(self):
        self._observers: list[Observer] = []

    def subscribe(self, observer: Observer) -> None:
        self._observers.append(observer)

    def _notify(self, event: str) -> None:
        for obs in self._observers:
            obs.update(event)

    def park_vehicle(self, vehicle):
        # ... allocate spot ...
        if self._is_full():
            self._notify("LOT_FULL")

class DisplayBoard(Observer):
    def update(self, event: str) -> None:
        if event == "LOT_FULL":
            self.show("Lot Full")

class SmsAlert(Observer):
    def update(self, event: str) -> None:
        if event == "LOT_FULL":
            self.send_sms("Lot is now full")
```

**What it buys:** adding a third subscriber (an analytics logger) is a new class implementing `Observer`, zero edits to `ParkingLot`. This is the same shape as [pub/sub](../architecture-patterns/microservices-communication.md#asynchronous-many-consumers-pubsub) at the distributed-systems layer — in-process objects instead of services, same decoupling trade. **What it costs:** the full reaction chain isn't visible from `ParkingLot` alone — you have to know who's subscribed to trace behavior, the same visibility cost pub/sub pays at scale.

---

## Builder — "Construct a complex object step by step, keep the constructor sane"

**Pressure:** an object has many optional fields, and a constructor with eight positional parameters (several optional, order easy to get wrong) is unreadable and error-prone at the call site.

```python
class Pizza:
    def __init__(self, size: str, toppings: list[str], crust: str, extra_cheese: bool):
        self.size = size
        self.toppings = toppings
        self.crust = crust
        self.extra_cheese = extra_cheese

class PizzaBuilder:
    def __init__(self, size: str):
        self._size = size
        self._toppings: list[str] = []
        self._crust = "regular"
        self._extra_cheese = False

    def add_topping(self, topping: str) -> "PizzaBuilder":
        self._toppings.append(topping)
        return self                          # fluent chaining

    def with_crust(self, crust: str) -> "PizzaBuilder":
        self._crust = crust
        return self

    def with_extra_cheese(self) -> "PizzaBuilder":
        self._extra_cheese = True
        return self

    def build(self) -> Pizza:
        return Pizza(self._size, self._toppings, self._crust, self._extra_cheese)

pizza = (PizzaBuilder("large")
         .add_topping("mushroom")
         .with_extra_cheese()
         .build())
```

**What it buys:** readable, order-independent construction; the object itself stays immutable once built. **What it costs:** boilerplate — for an object with two or three simple fields, a builder is ceremony, not clarity.

---

## Adapter — "Make an incompatible interface fit, without changing either side"

**Pressure:** you need to integrate an existing class (often third-party, can't be modified) whose interface doesn't match what your code expects.

```python
class ModernPaymentGateway(ABC):
    @abstractmethod
    def pay(self, amount_cents: int) -> bool: ...

class LegacyBillingSystem:
    """Third-party, can't be modified — different method name and unit."""
    def make_payment(self, dollars: float) -> str:
        return "SUCCESS"

class LegacyBillingAdapter(ModernPaymentGateway):
    def __init__(self, legacy: LegacyBillingSystem):
        self._legacy = legacy

    def pay(self, amount_cents: int) -> bool:
        result = self._legacy.make_payment(amount_cents / 100)
        return result == "SUCCESS"
```

**What it buys:** your `Checkout` code depends only on `ModernPaymentGateway`; the legacy system's oddities (dollars vs. cents, `make_payment` vs. `pay`, string vs. bool return) are isolated to one class. **What it costs:** an extra class per integration — but the alternative (letting legacy quirks leak into business logic) is worse.

---

## Decorator — "Add behavior to an individual object, without subclassing or touching other instances"

**Pressure:** you need to add responsibilities to an object dynamically and combinably (logging + caching + rate limiting on a service call), and subclassing for every combination explodes combinatorially.

```python
class Coffee(ABC):
    @abstractmethod
    def cost(self) -> float: ...
    @abstractmethod
    def description(self) -> str: ...

class SimpleCoffee(Coffee):
    def cost(self) -> float: return 2.0
    def description(self) -> str: return "Coffee"

class MilkDecorator(Coffee):
    def __init__(self, coffee: Coffee):
        self._coffee = coffee
    def cost(self) -> float:
        return self._coffee.cost() + 0.5
    def description(self) -> str:
        return self._coffee.description() + " + Milk"

class WhipDecorator(Coffee):
    def __init__(self, coffee: Coffee):
        self._coffee = coffee
    def cost(self) -> float:
        return self._coffee.cost() + 0.7
    def description(self) -> str:
        return self._coffee.description() + " + Whip"

order = WhipDecorator(MilkDecorator(SimpleCoffee()))
print(order.description(), order.cost())   # "Coffee + Milk + Whip", 3.2
```

**What it buys:** every combination of add-ons is composition, not a new subclass — `MilkDecorator(WhipDecorator(SimpleCoffee()))` needs no new class for that ordering either. **What it costs:** debugging a deeply nested decorator chain means reading through several wrapper layers to find where a value actually changed — a real readability tax past 3-4 layers.

---

## Pressure → Pattern Quick Reference

| Requirement phrase in the problem statement | Pattern |
|---|---|
| "Create different types of X based on input" | Factory |
| "Support multiple algorithms/strategies for Y, selectable at runtime" | Strategy |
| "Notify all interested parties when Z happens" | Observer |
| "Construct a complex object with many optional parts" | Builder |
| "Integrate with an existing/third-party interface that doesn't match ours" | Adapter |
| "Add optional, combinable features to an object without an explosion of subclasses" | Decorator |

---

## Trade-offs

| Choice | Win | Cost |
|--------|-----|------|
| Factory | Centralized creation logic | Extra indirection for a small, stable set of types |
| Strategy | Runtime-swappable behavior, OCP-compliant | A class per variant, even for simple variants |
| Observer | Loose coupling between event source and reactions | Reaction chain isn't visible from the source alone |
| Builder | Readable, order-independent construction | Boilerplate for objects with few fields |
| Adapter | Isolates third-party quirks to one class | One more class per external integration |
| Decorator | Combinable behavior without subclass explosion | Deep chains are hard to debug |

---

## Interview Questions

=== "Foundation"
    **Q: What's the difference between the Strategy and Decorator patterns? They both wrap behavior.**

    "Strategy swaps out *one* algorithm entirely — a `Ticket` has exactly one active `PricingStrategy` at a time, chosen once. Decorator *adds* behavior in layers on top of an existing object, and the layers stack — a coffee can have milk and whip and caramel all at once, each decorator wrapping the previous result. Strategy is 'pick one of these'; Decorator is 'combine any of these.'"

=== "Senior"
    **Q: When would you avoid using a design pattern even though the code technically fits the shape?**

    "When there's no actual variation point yet — if `PaymentMethod` only has one real implementation and the requirement doesn't mention supporting a second, introducing a `Strategy` interface and a `Factory` for it is speculative complexity. It adds indirection a reader has to trace through for a payoff that may never materialize. I'd write the straightforward implementation and introduce the pattern when a second concrete case actually shows up — the same 'earn the pattern' discipline as picking a saga or CQRS in system design, just at the class level instead of the service level."

=== "Staff"
    **Q: Your codebase has a `NotifierFactory` that constructs `EmailNotifier`, `SmsNotifier`, and now needs a `SlackNotifier` — but each one now also needs optional retry logic and optional rate limiting, independently combinable. What's the pattern for that, and why not just add more factory branches?**

    "That's a Decorator problem, not a Factory problem — retry and rate limiting are cross-cutting, combinable add-ons, not new concrete notifier types. If I tried to solve it with more factory branches, I'd need a concrete class for every combination (`RetryingRateLimitedSlackNotifier`, `RateLimitedEmailNotifier`, ...) — that's combinatorial explosion, which is exactly the pressure Decorator exists for. I'd keep the Factory for choosing the base channel (Email/SMS/Slack — a real, bounded 'which concrete type' decision) and wrap the result in `RetryDecorator` / `RateLimitDecorator` as needed, composed at the call site. That keeps the two decisions — 'which channel' and 'which cross-cutting behavior' — independent instead of coupled into one factory's branching logic."

---

## Key Takeaways

!!! success "Remember"
    1. Every pattern here answers a named pressure — if you can't state the pressure from the problem, you haven't earned the pattern
    2. Factory decides *which object to create*; Strategy decides *which behavior an existing object uses* — they compose, they aren't alternatives
    3. Observer trades visibility (the reaction chain isn't in one place) for decoupling — same trade as pub/sub at the distributed-systems layer
    4. Builder exists for readability at the call site when a constructor has many optional parameters — skip it for simple objects
    5. Adapter isolates a third-party interface's quirks to one class so they don't leak into business logic
    6. Decorator handles *combinable* add-on behavior; reach for it instead of a combinatorial explosion of subclasses

**Previous:** [SOLID Principles](solid-principles.md) | **Next:** [Concurrency Basics](concurrency-basics.md)
