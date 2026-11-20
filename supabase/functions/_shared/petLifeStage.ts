export type LifeStage = "puppy_kitten" | "adult" | "senior";

export function lifeStage(species: "dog" | "cat", ageYears: number): LifeStage {
  if (ageYears < 1) return "puppy_kitten";
  // Cats and small dogs are considered senior a little earlier in practice; we
  // use a simple, conservative cutoff.
  const seniorAt = species === "cat" ? 10 : 8;
  return ageYears >= seniorAt ? "senior" : "adult";
}
