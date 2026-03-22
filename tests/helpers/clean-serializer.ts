/**
 * Snapshot serializer that strips volatile fields (absolute paths, hashes, bodies)
 * so snapshots are portable across machines.
 */

module.exports = {
  test(val: unknown): boolean {
    return typeof val === 'object' && val !== null && 'contentHash' in (val as any) && 'filePath' in (val as any);
  },

  serialize(val: any): string {
    const cleaned = JSON.parse(JSON.stringify(val));

    // Replace volatile fields
    if (cleaned.filePath) cleaned.filePath = cleaned.filePath.replace(/^.*\/__fixtures__\//, '__fixtures__/');
    if (cleaned.contentHash) cleaned.contentHash = '<HASH>';

    // Clean nested filePaths (e.g. apiEndpoints[].filePath)
    if (cleaned.apiEndpoints) {
      for (const ep of cleaned.apiEndpoints) {
        if (ep.filePath) ep.filePath = ep.filePath.replace(/^.*\/__fixtures__\//, '__fixtures__/');
      }
    }

    // Strip function bodies (huge and noisy in snapshots)
    if (cleaned.functions) {
      for (const fn of cleaned.functions) {
        if (fn.body) fn.body = '<BODY>';
      }
    }

    return JSON.stringify(cleaned, null, 2);
  },
};
