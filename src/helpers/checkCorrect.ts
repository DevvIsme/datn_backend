export const isEqualArrays = (arr1: any[], arr2: any[]): boolean => {
  if (arr1.length !== arr2.length) return false;

  const set1 = new Set(arr1);
  const set2 = new Set(arr2);

  return (
    set1.size === set2.size && [...set1].every((element) => set2.has(element))
  );
};
